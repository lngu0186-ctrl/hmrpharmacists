import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

export const setPharmacistStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        pharmacist_id: z.string().uuid(),
        status: z.enum(["verified", "rejected", "pending"]),
        publish: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) {
      throw new Response("Forbidden", { status: 403 });
    }
    const update: {
      verification_status: "verified" | "rejected" | "pending";
      is_published?: boolean;
    } = {
      verification_status: data.status,
    };
    if (data.publish !== undefined) update.is_published = data.publish;
    const { error } = await supabaseAdmin
      .from("pharmacists")
      .update(update)
      .eq("id", data.pharmacist_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const togglePharmacistPublish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        pharmacist_id: z.string().uuid(),
        is_published: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) {
      throw new Response("Forbidden", { status: 403 });
    }
    const { error } = await supabaseAdmin
      .from("pharmacists")
      .update({ is_published: data.is_published })
      .eq("id", data.pharmacist_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
