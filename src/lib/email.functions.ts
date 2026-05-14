import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM = "HMR Pharmacist Exchange <onboarding@resend.dev>";
const SITE_URL = "https://hmrpharmacists.com.au";
const REPLY_TO = "noreply@hmrpharmacists.com.au";

function shell(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.06);">
        <tr><td style="padding:24px 28px;border-bottom:1px solid #eef0f3;">
          <div style="font-weight:600;font-size:15px;color:#0f172a;">HMR Pharmacist Exchange</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">Australia's directory of credentialed HMR pharmacists</div>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:#0f172a;">${title}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #eef0f3;font-size:11px;color:#94a3b8;line-height:1.6;">
          You received this email from HMR Pharmacist Exchange. This is a transactional message related to your activity on the platform.<br/>
          <a href="${SITE_URL}" style="color:#64748b;">${SITE_URL.replace("https://", "")}</a>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

function btn(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:10px;">${label}</a>`;
}
function p(text: string) {
  return `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">${text}</p>`;
}
function esc(s: string) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

async function logEmail(entry: {
  template_name: string;
  recipient_email: string;
  subject: string;
  status: "sent" | "failed";
  error_message?: string | null;
  metadata?: Record<string, unknown>;
  message_id?: string | null;
}) {
  try {
    await supabaseAdmin.from("email_send_log").insert({
      template_name: entry.template_name,
      recipient_email: entry.recipient_email,
      subject: entry.subject,
      status: entry.status,
      error_message: entry.error_message ?? null,
      metadata: (entry.metadata ?? null) as never,
      message_id: entry.message_id ?? null,
    });
  } catch (e) {
    console.error("[email_send_log] insert failed", e);
  }
}

async function resendSend(
  to: string,
  subject: string,
  html: string,
  replyTo?: string,
  logCtx?: { template_name: string; metadata?: Record<string, unknown> },
) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

  let res: Response;
  let body = "";
  try {
    res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html, reply_to: replyTo ?? REPLY_TO }),
    });
    body = await res.text();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (logCtx) {
      await logEmail({
        template_name: logCtx.template_name,
        recipient_email: to,
        subject,
        status: "failed",
        error_message: `Network error: ${msg}`,
        metadata: logCtx.metadata,
      });
    }
    throw e;
  }

  if (!res.ok) {
    console.error(`[resend] send failed [${res.status}]: ${body}`);
    if (logCtx) {
      await logEmail({
        template_name: logCtx.template_name,
        recipient_email: to,
        subject,
        status: "failed",
        error_message: `HTTP ${res.status}: ${body.slice(0, 500)}`,
        metadata: logCtx.metadata,
      });
    }
    throw new Error(`Email send failed (${res.status})`);
  }

  let messageId: string | null = null;
  try {
    messageId = JSON.parse(body)?.id ?? null;
  } catch {
    // ignore
  }
  if (logCtx) {
    await logEmail({
      template_name: logCtx.template_name,
      recipient_email: to,
      subject,
      status: "sent",
      metadata: logCtx.metadata,
      message_id: messageId,
    });
  }
  return { ok: true };
}

async function getPharmacistEmail(pharmacistId: string) {
  const { data: ph, error } = await supabaseAdmin
    .from("pharmacists")
    .select("id, full_name, user_id, slug")
    .eq("id", pharmacistId)
    .maybeSingle();
  if (error || !ph?.user_id) return null;
  const { data: u } = await supabaseAdmin.auth.admin.getUserById(ph.user_id);
  if (!u?.user?.email) return null;
  return { email: u.user.email, full_name: ph.full_name, slug: ph.slug };
}

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

/* ========== Enquiry notifications ==========
 * Public (anonymous) callable but idempotent per enquiry_id and rate-bound to
 * recently-created enquiries. This makes replay attacks ineffective. */

export const sendEnquiryEmails = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        enquiry_id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { data: enq, error } = await supabaseAdmin
      .from("enquiries")
      .select("*")
      .eq("id", data.enquiry_id)
      .maybeSingle();
    if (error || !enq) {
      // Don't leak existence — return ok regardless.
      return { ok: true };
    }

    // Reject replays: only send for enquiries created in the last 10 minutes.
    const ageMs = Date.now() - new Date(enq.created_at).getTime();
    if (ageMs > 10 * 60 * 1000) return { ok: true };

    // Idempotency: don't re-send if we've already logged a successful send for this enquiry.
    const { data: existing } = await supabaseAdmin
      .from("email_send_log")
      .select("id")
      .eq("status", "sent")
      .like("template_name", "enquiry.%")
      .filter("metadata->>enquiry_id", "eq", enq.id)
      .limit(1)
      .maybeSingle();
    if (existing) return { ok: true, deduplicated: true };

    const ph = await getPharmacistEmail(enq.pharmacist_id);

    if (ph?.email) {
      const dashUrl = `${SITE_URL}/dashboard`;
      const html = shell(
        `New referral enquiry from ${esc(enq.sender_name)}`,
        `${p(`Hi ${esc(ph.full_name.split(" ")[0])},`)}
         ${p(`You've received a new enquiry via your HMR Pharmacist Exchange profile.`)}
         <table role="presentation" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin:0 0 18px;font-size:13px;color:#334155;">
           <tr><td><strong style="color:#0f172a;">From:</strong> ${esc(enq.sender_name)} <span style="color:#64748b;">(${esc(enq.sender_type)})</span></td></tr>
           ${enq.organisation ? `<tr><td><strong style="color:#0f172a;">Organisation:</strong> ${esc(enq.organisation)}</td></tr>` : ""}
           ${enq.patient_suburb ? `<tr><td><strong style="color:#0f172a;">Patient suburb:</strong> ${esc(enq.patient_suburb)}</td></tr>` : ""}
           <tr><td style="padding-top:8px;"><strong style="color:#0f172a;">Message:</strong><br/><span style="white-space:pre-wrap;">${esc(enq.message)}</span></td></tr>
         </table>
         ${p(`Reply directly via the platform — your contact details remain private.`)}
         <p style="margin:18px 0 6px;">${btn(dashUrl, "Open dashboard")}</p>
         ${p(`<span style="color:#64748b;font-size:12px;">Or reply to this email to contact the sender at ${esc(enq.sender_email)}.</span>`)}
        `,
      );
      try {
        await resendSend(
          ph.email,
          `New HMR enquiry from ${enq.sender_name}`,
          html,
          enq.sender_email,
          {
            template_name: "enquiry.pharmacist_notification",
            metadata: { enquiry_id: enq.id, pharmacist_id: enq.pharmacist_id },
          },
        );
      } catch (e) {
        console.error("[email] pharmacist notify failed", e);
      }
    }

    const senderHtml = shell(
      `We've passed your enquiry on`,
      `${p(`Hi ${esc(enq.sender_name.split(" ")[0])},`)}
       ${p(`Thanks for using HMR Pharmacist Exchange. Your enquiry has been delivered to the pharmacist privately. You can expect a reply directly from them.`)}
       <table role="presentation" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin:0 0 18px;font-size:13px;color:#334155;">
         <tr><td><strong style="color:#0f172a;">Your message:</strong><br/><span style="white-space:pre-wrap;">${esc(enq.message)}</span></td></tr>
       </table>
       ${p(`If you don't hear back within a few business days, you can browse other credentialed pharmacists on our directory.`)}
       <p style="margin:18px 0 6px;">${btn(`${SITE_URL}/find`, "Browse the directory")}</p>
       ${p(`<span style="color:#64748b;font-size:12px;">This is not medical advice or emergency care. For urgent matters, contact your GP or call 000.</span>`)}
      `,
    );
    try {
      await resendSend(enq.sender_email, "Your HMR enquiry has been sent", senderHtml, undefined, {
        template_name: "enquiry.sender_confirmation",
        metadata: { enquiry_id: enq.id },
      });
    } catch (e) {
      console.error("[email] sender confirm failed", e);
    }

    return { ok: true };
  });

/* ========== Verification status emails — admin only ========== */

export const sendVerificationEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        pharmacist_id: z.string().uuid(),
        status: z.enum(["verified", "rejected", "pending"]),
        notes: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) {
      throw new Response("Forbidden", { status: 403 });
    }

    const ph = await getPharmacistEmail(data.pharmacist_id);
    if (!ph?.email) return { ok: false, reason: "no_email" };

    const dashUrl = `${SITE_URL}/dashboard`;
    const profileUrl = `${SITE_URL}/pharmacists/${ph.slug}`;

    let subject = "";
    let html = "";

    if (data.status === "verified") {
      subject = "You're verified on HMR Pharmacist Exchange";
      html = shell(
        `You're verified ✓`,
        `${p(`Hi ${esc(ph.full_name.split(" ")[0])},`)}
         ${p(`Great news — your credentials have been reviewed and your profile is now verified. GPs, clinics, pharmacies, and patients can now find you in our public directory.`)}
         <p style="margin:18px 0 6px;">${btn(profileUrl, "View your public profile")}</p>
         ${p(`Manage availability, service areas, and enquiries from your dashboard.`)}
         <p style="margin:8px 0 0;"><a href="${dashUrl}" style="color:#0f172a;font-size:13px;">Go to dashboard →</a></p>`,
      );
    } else if (data.status === "rejected") {
      subject = "Update on your HMR Pharmacist Exchange application";
      html = shell(
        `Your application needs attention`,
        `${p(`Hi ${esc(ph.full_name.split(" ")[0])},`)}
         ${p(`Thank you for applying to HMR Pharmacist Exchange. After review, we're unable to approve your listing at this time.`)}
         ${data.notes ? `<table role="presentation" width="100%" style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;margin:0 0 18px;font-size:13px;color:#7f1d1d;"><tr><td><strong>Reviewer notes:</strong><br/>${esc(data.notes)}</td></tr></table>` : ""}
         ${p(`You can update your details and request another review at any time.`)}
         <p style="margin:18px 0 6px;">${btn(dashUrl, "Update your profile")}</p>`,
      );
    } else {
      subject = "Your HMR Pharmacist Exchange profile is under review";
      html = shell(
        `Under review`,
        `${p(`Hi ${esc(ph.full_name.split(" ")[0])},`)}
         ${p(`Your profile has been moved back into the verification queue. We'll email you as soon as the review is complete.`)}
         <p style="margin:18px 0 6px;">${btn(dashUrl, "Open dashboard")}</p>`,
      );
    }

    try {
      await resendSend(ph.email, subject, html, undefined, {
        template_name: `verification.${data.status}`,
        metadata: {
          pharmacist_id: data.pharmacist_id,
          status: data.status,
          notes: data.notes ?? null,
        },
      });
    } catch (e) {
      console.error("[email] verification email failed", e);
      return { ok: false };
    }
    return { ok: true };
  });
