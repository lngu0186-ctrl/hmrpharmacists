// Server-only helpers for the invitation flow. Never import from client code.
import crypto from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM = "HMR Pharmacists Exchange <onboarding@resend.dev>";
const REPLY_TO = "noreply@hmrpharmacists.com.au";
export const SITE_URL = "https://hmrpharmacists.com.au";
export const INVITE_TTL_DAYS = 14;

export function generateToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("base64url");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function inviteUrl(rawToken: string): string {
  return `${SITE_URL}/register/invite?token=${encodeURIComponent(rawToken)}`;
}

function esc(s: string): string {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

function inviteEmailHtml(opts: {
  inviteeName: string;
  inviterName: string;
  personalNote: string | null;
  url: string;
  expiresAt: Date;
}): string {
  const note = opts.personalNote
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:0 0 20px;">
         <tr><td style="padding:14px 16px;font-size:13px;color:#475569;line-height:1.6;font-style:italic;">
           "${esc(opts.personalNote)}"<br/>
           <span style="font-style:normal;color:#94a3b8;font-size:12px;">— ${esc(opts.inviterName)}</span>
         </td></tr>
       </table>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.06);">
        <tr><td style="padding:24px 28px;border-bottom:1px solid #eef0f3;">
          <div style="font-weight:600;font-size:15px;color:#0f172a;">HMR Pharmacists Exchange</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">Australia's directory of credentialed HMR pharmacists</div>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:#0f172a;">You've been invited to join HMR Pharmacists Exchange</h1>
          <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">Hi ${esc(opts.inviteeName)},</p>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#334155;">
            <strong>${esc(opts.inviterName)}</strong> has invited you to join HMR Pharmacists Exchange — a directory connecting credentialed HMR pharmacists with GPs, clinics, pharmacies and patients across Australia.
          </p>
          ${note}
          <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#334155;">
            Your registration link below pre-fills the details ${esc(opts.inviterName)} provided, so onboarding takes only a few minutes.
          </p>
          <p style="margin:0 0 22px;">
            <a href="${opts.url}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px;">Accept invitation</a>
          </p>
          <p style="margin:0 0 6px;font-size:12px;color:#64748b;line-height:1.5;">
            This invitation expires on <strong>${opts.expiresAt.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</strong>.
          </p>
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;word-break:break-all;">
            If the button doesn't work, copy and paste this link into your browser:<br/>${esc(opts.url)}
          </p>
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #eef0f3;font-size:11px;color:#94a3b8;line-height:1.6;">
          You received this email because a colleague invited you to HMR Pharmacists Exchange. If you weren't expecting this, you can safely ignore it.
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
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

export async function sendInvitationEmail(opts: {
  to: string;
  inviteeName: string;
  inviterName: string;
  personalNote: string | null;
  rawToken: string;
  expiresAt: Date;
  invitationId: string;
}): Promise<{ sent: boolean; error?: string }> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    return { sent: false, error: "Email service is not configured." };
  }

  const url = inviteUrl(opts.rawToken);
  const subject = "You've been invited to join HMR Pharmacists Exchange";
  const html = inviteEmailHtml({
    inviteeName: opts.inviteeName,
    inviterName: opts.inviterName,
    personalNote: opts.personalNote,
    url,
    expiresAt: opts.expiresAt,
  });

  try {
    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({ from: FROM, to: [opts.to], subject, html, reply_to: REPLY_TO }),
    });
    const body = await res.text();
    if (!res.ok) {
      await logEmail({
        template_name: "pharmacist_invitation",
        recipient_email: opts.to,
        subject,
        status: "failed",
        error_message: `HTTP ${res.status}: ${body.slice(0, 500)}`,
        metadata: { invitation_id: opts.invitationId },
      });
      return { sent: false, error: `Email send failed (${res.status})` };
    }
    let messageId: string | null = null;
    try {
      messageId = JSON.parse(body)?.id ?? null;
    } catch {
      // ignore
    }
    await logEmail({
      template_name: "pharmacist_invitation",
      recipient_email: opts.to,
      subject,
      status: "sent",
      metadata: { invitation_id: opts.invitationId },
      message_id: messageId,
    });
    return { sent: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logEmail({
      template_name: "pharmacist_invitation",
      recipient_email: opts.to,
      subject,
      status: "failed",
      error_message: `Network error: ${msg}`,
      metadata: { invitation_id: opts.invitationId },
    });
    return { sent: false, error: msg };
  }
}
