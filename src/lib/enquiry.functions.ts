import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEnquiryStatusEmail } from "@/lib/email.functions";

const STATUSES = [
  "new",
  "acknowledged",
  "accepted",
  "responded",
  "declined",
  "closed",
] as const;

export const updateEnquiryStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        enquiry_id: z.string().uuid(),
        status: z.enum(STATUSES),
        decline_reason: z.string().trim().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Ownership check via admin client (bypass RLS for explicit verification)
    const { data: enq, error: fetchErr } = await supabaseAdmin
      .from("enquiries")
      .select("id, pharmacist_id, status, sender_email, sender_name, reference_code")
      .eq("id", data.enquiry_id)
      .maybeSingle();
    if (fetchErr || !enq) throw new Response("Not found", { status: 404 });

    const { data: ph } = await supabaseAdmin
      .from("pharmacists")
      .select("user_id, full_name")
      .eq("id", enq.pharmacist_id)
      .maybeSingle();
    if (!ph || ph.user_id !== userId) {
      throw new Response("Forbidden", { status: 403 });
    }

    if (data.status === "declined" && !data.decline_reason) {
      throw new Error("A short reason is required when declining.");
    }

    const update: {
      status: (typeof STATUSES)[number];
      decline_reason?: string | null;
    } = { status: data.status };
    if (data.status === "declined") update.decline_reason = data.decline_reason ?? null;

    const { error: updErr } = await supabaseAdmin
      .from("enquiries")
      .update(update)
      .eq("id", data.enquiry_id);
    if (updErr) throw new Error(updErr.message);

    // Fire-and-forget sender notification on meaningful transitions
    if (
      enq.status !== data.status &&
      ["accepted", "declined", "responded", "closed"].includes(data.status)
    ) {
      sendEnquiryStatusEmail({
        data: {
          enquiry_id: enq.id,
          status: data.status,
          decline_reason: data.decline_reason,
        },
      }).catch((e) => console.error("[enquiry] status email failed", e));
    }

    return { ok: true };
  });
