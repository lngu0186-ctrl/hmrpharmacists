import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  generateToken,
  hashToken,
  sendInvitationEmail,
  inviteUrl,
  INVITE_TTL_DAYS,
} from "./invitations.server";

const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

async function isAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

async function isVerifiedPharmacist(userId: string) {
  const { data } = await supabaseAdmin
    .from("pharmacists")
    .select("id, full_name, verification_status")
    .eq("user_id", userId)
    .maybeSingle();
  return !!(data && data.verification_status === "verified");
}

async function getInviterDisplayName(userId: string): Promise<string> {
  const { data: ph } = await supabaseAdmin
    .from("pharmacists")
    .select("full_name")
    .eq("user_id", userId)
    .maybeSingle();
  if (ph?.full_name) return ph.full_name;
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.display_name) return profile.display_name;
  const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
  return u?.user?.email ?? "A colleague";
}

const invitationInput = z.object({
  invited_email: z.string().trim().email().max(255).toLowerCase(),
  invited_first_name: z.string().trim().min(1).max(100),
  invited_last_name: z.string().trim().min(1).max(100),
  invited_mobile: z.string().trim().max(40).optional().or(z.literal("")),
  invited_ahpra_number: z.string().trim().max(40).optional().or(z.literal("")),
  invited_accreditation_number: z.string().trim().max(40).optional().or(z.literal("")),
  invited_state: z.enum(AU_STATES),
  invited_suburb: z.string().trim().max(120).optional().or(z.literal("")),
  invited_postcode: z.string().trim().regex(/^\d{4}$/).optional().or(z.literal("")),
  personal_note: z.string().trim().max(500).optional().or(z.literal("")),
  fast_track_verification: z.boolean().default(false),
  confirm_known_pharmacist: z.literal(true),
});

export const createInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => invitationInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const admin = await isAdmin(userId);
    const verified = admin || (await isVerifiedPharmacist(userId));
    if (!verified) {
      throw new Response(
        "Only admins and verified HMR pharmacists can send invitations.",
        { status: 403 },
      );
    }
    const role = admin ? "admin" : "verified_pharmacist";
    const fastTrack = admin && data.fast_track_verification === true;

    // If a registered user already has this email, block the invite.
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    const already = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === data.invited_email,
    );
    if (already) {
      throw new Response(
        "An account already exists with this email address.",
        { status: 409 },
      );
    }

    // Revoke any prior pending invitations for the same email so only one is active.
    await supabaseAdmin
      .from("pharmacist_invitations")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("invited_email", data.invited_email)
      .eq("status", "pending");

    const { raw, hash } = generateToken();
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    const insertPayload = {
      invited_email: data.invited_email,
      invited_first_name: data.invited_first_name,
      invited_last_name: data.invited_last_name,
      invited_mobile: data.invited_mobile || null,
      invited_ahpra_number: data.invited_ahpra_number || null,
      invited_accreditation_number: data.invited_accreditation_number || null,
      invited_state: data.invited_state,
      invited_suburb: data.invited_suburb || null,
      invited_postcode: data.invited_postcode || null,
      personal_note: data.personal_note || null,
      invited_by: userId,
      invited_by_role: role,
      fast_track_verification: fastTrack,
      token_hash: hash,
      expires_at: expiresAt.toISOString(),
    };

    const { data: row, error } = await supabaseAdmin
      .from("pharmacist_invitations")
      .insert(insertPayload)
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Could not create invitation");

    const inviterName = await getInviterDisplayName(userId);
    const inviteeName = `${data.invited_first_name} ${data.invited_last_name}`.trim();
    const send = await sendInvitationEmail({
      to: data.invited_email,
      inviteeName,
      inviterName,
      personalNote: data.personal_note || null,
      rawToken: raw,
      expiresAt,
      invitationId: row.id,
    });

    return {
      id: row.id,
      invite_url: inviteUrl(raw),
      email_sent: send.sent,
      email_error: send.error ?? null,
    };
  });

export const listInvitations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        status: z.enum(["all", "pending", "accepted", "expired", "revoked"]).default("all"),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const admin = await isAdmin(userId);

    let query = supabaseAdmin
      .from("pharmacist_invitations")
      .select(
        "id, invited_email, invited_first_name, invited_last_name, invited_state, invited_suburb, status, expires_at, accepted_at, created_at, last_sent_at, send_count, invited_by, invited_by_role, fast_track_verification",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (!admin) query = query.eq("invited_by", userId);
    if (data.status !== "all") query = query.eq("status", data.status);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    // Auto-mark expired invites that are past their expiry date.
    const nowIso = new Date().toISOString();
    const stale = (rows ?? []).filter(
      (r) => r.status === "pending" && r.expires_at < nowIso,
    );
    if (stale.length) {
      await supabaseAdmin
        .from("pharmacist_invitations")
        .update({ status: "expired" })
        .in(
          "id",
          stale.map((s) => s.id),
        );
      for (const s of stale) s.status = "expired";
    }

    // Resolve inviter display names
    const inviterIds = Array.from(new Set((rows ?? []).map((r) => r.invited_by)));
    const inviterMap = new Map<string, string>();
    if (inviterIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name")
        .in("id", inviterIds);
      for (const p of profs ?? []) {
        if (p.display_name) inviterMap.set(p.id, p.display_name);
      }
      const { data: phs } = await supabaseAdmin
        .from("pharmacists")
        .select("user_id, full_name")
        .in("user_id", inviterIds);
      for (const ph of phs ?? []) {
        if (ph.full_name && ph.user_id) inviterMap.set(ph.user_id, ph.full_name);
      }
    }

    return {
      isAdmin: admin,
      invitations: (rows ?? []).map((r) => ({
        ...r,
        inviter_name: inviterMap.get(r.invited_by) ?? null,
      })),
    };
  });

export const resendInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const admin = await isAdmin(userId);

    const { data: inv, error } = await supabaseAdmin
      .from("pharmacist_invitations")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !inv) throw new Response("Invitation not found", { status: 404 });
    if (!admin && inv.invited_by !== userId) {
      throw new Response("Forbidden", { status: 403 });
    }
    if (inv.status !== "pending") {
      throw new Error("Only pending invitations can be resent.");
    }

    // Issue a fresh token and extend the expiry.
    const { raw, hash } = generateToken();
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
    const { error: updErr } = await supabaseAdmin
      .from("pharmacist_invitations")
      .update({
        token_hash: hash,
        expires_at: expiresAt.toISOString(),
        last_sent_at: new Date().toISOString(),
        send_count: (inv.send_count ?? 1) + 1,
      })
      .eq("id", inv.id);
    if (updErr) throw new Error(updErr.message);

    const inviterName = await getInviterDisplayName(inv.invited_by);
    const inviteeName =
      `${inv.invited_first_name ?? ""} ${inv.invited_last_name ?? ""}`.trim() ||
      inv.invited_email;
    const send = await sendInvitationEmail({
      to: inv.invited_email,
      inviteeName,
      inviterName,
      personalNote: inv.personal_note,
      rawToken: raw,
      expiresAt,
      invitationId: inv.id,
    });

    return {
      invite_url: inviteUrl(raw),
      email_sent: send.sent,
      email_error: send.error ?? null,
    };
  });

export const revokeInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const admin = await isAdmin(userId);

    const { data: inv } = await supabaseAdmin
      .from("pharmacist_invitations")
      .select("id, status, invited_by")
      .eq("id", data.id)
      .maybeSingle();
    if (!inv) throw new Response("Invitation not found", { status: 404 });
    if (!admin && inv.invited_by !== userId) {
      throw new Response("Forbidden", { status: 403 });
    }
    if (inv.status !== "pending") {
      throw new Error("Only pending invitations can be revoked.");
    }
    const { error } = await supabaseAdmin
      .from("pharmacist_invitations")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Public — no auth required. Validates a raw token and returns prefill data.
export const verifyInvitationToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ token: z.string().min(10).max(500) }).parse(d),
  )
  .handler(async ({ data }) => {
    const hash = hashToken(data.token);
    const { data: inv } = await supabaseAdmin
      .from("pharmacist_invitations")
      .select(
        "id, invited_email, invited_first_name, invited_last_name, invited_mobile, invited_ahpra_number, invited_accreditation_number, invited_state, invited_suburb, invited_postcode, personal_note, status, expires_at, fast_track_verification, invited_by, invited_by_role",
      )
      .eq("token_hash", hash)
      .maybeSingle();
    if (!inv) return { ok: false as const, reason: "invalid" as const };
    if (inv.status === "revoked") return { ok: false as const, reason: "revoked" as const };
    if (inv.status === "accepted") return { ok: false as const, reason: "accepted" as const };
    if (new Date(inv.expires_at) < new Date()) {
      await supabaseAdmin
        .from("pharmacist_invitations")
        .update({ status: "expired" })
        .eq("id", inv.id);
      return { ok: false as const, reason: "expired" as const };
    }
    const inviterName = await getInviterDisplayName(inv.invited_by);
    return {
      ok: true as const,
      invitation: {
        id: inv.id,
        invited_email: inv.invited_email,
        invited_first_name: inv.invited_first_name,
        invited_last_name: inv.invited_last_name,
        invited_mobile: inv.invited_mobile,
        invited_ahpra_number: inv.invited_ahpra_number,
        invited_accreditation_number: inv.invited_accreditation_number,
        invited_state: inv.invited_state,
        invited_suburb: inv.invited_suburb,
        invited_postcode: inv.invited_postcode,
        personal_note: inv.personal_note,
        expires_at: inv.expires_at,
        fast_track_verification: inv.fast_track_verification,
        inviter_name: inviterName,
      },
    };
  });

// Public — accepts an invitation by creating an auth user, profile, and pharmacist row.
export const acceptInvitation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        token: z.string().min(10).max(500),
        password: z.string().min(8).max(200),
        full_name: z.string().trim().min(1).max(200),
        title: z.string().trim().max(40).optional().or(z.literal("")),
        mobile: z.string().trim().max(40).optional().or(z.literal("")),
        ahpra_number: z.string().trim().max(40).optional().or(z.literal("")),
        accreditation_number: z.string().trim().max(40).optional().or(z.literal("")),
        state: z.enum(AU_STATES),
        suburb: z.string().trim().max(120).optional().or(z.literal("")),
        postcode: z.string().trim().regex(/^\d{4}$/).optional().or(z.literal("")),
        bio: z.string().trim().max(2000).optional().or(z.literal("")),
        telehealth: z.boolean().default(false),
        home_visits: z.boolean().default(true),
        consent_terms: z.literal(true),
        confirm_accredited: z.literal(true),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const hash = hashToken(data.token);
    const { data: inv } = await supabaseAdmin
      .from("pharmacist_invitations")
      .select("*")
      .eq("token_hash", hash)
      .maybeSingle();
    if (!inv) throw new Response("Invalid invitation.", { status: 404 });
    if (inv.status !== "pending") {
      throw new Response("This invitation is no longer valid.", { status: 409 });
    }
    if (new Date(inv.expires_at) < new Date()) {
      await supabaseAdmin
        .from("pharmacist_invitations")
        .update({ status: "expired" })
        .eq("id", inv.id);
      throw new Response("This invitation has expired.", { status: 410 });
    }

    // Create auth user with email pre-confirmed (token already proved control of email).
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: inv.invited_email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: data.full_name },
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message ?? "Could not create account.");
    }
    const userId = created.user.id;

    // The handle_new_user trigger creates the profiles + user_roles rows. Update display name.
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, display_name: data.full_name }, { onConflict: "id" });

    // Build a unique slug.
    const baseSlug =
      data.full_name
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "pharmacist";
    let slug = baseSlug;
    for (let i = 0; i < 8; i++) {
      const { data: clash } = await supabaseAdmin
        .from("pharmacists")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!clash) break;
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    // Fast-track invitations from admins land in pending verification but get is_published=false.
    // Standard invitations also start pending verification — admins must review.
    const { error: phErr } = await supabaseAdmin.from("pharmacists").insert({
      user_id: userId,
      slug,
      full_name: data.full_name,
      title: data.title || null,
      bio: data.bio || null,
      ahpra_number: data.ahpra_number || inv.invited_ahpra_number || null,
      credentialing_body: data.accreditation_number || inv.invited_accreditation_number || null,
      state: data.state,
      suburb: data.suburb || inv.invited_suburb || null,
      postcode: data.postcode || inv.invited_postcode || null,
      telehealth: data.telehealth,
      home_visits: data.home_visits,
      verification_status: "pending",
      is_published: false,
      accepting_referrals: true,
    });
    if (phErr) {
      // Roll back the user we just created so the invite can be retried.
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(phErr.message);
    }

    // Mark invitation accepted.
    await supabaseAdmin
      .from("pharmacist_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_user_id: userId,
      })
      .eq("id", inv.id);

    return { ok: true, slug, fast_track: inv.fast_track_verification };
  });
