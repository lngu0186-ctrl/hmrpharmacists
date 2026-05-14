import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Response("Forbidden", { status: 403 });
}

async function audit(
  adminId: string,
  action: string,
  pharmacistId: string,
  metadata: Record<string, unknown>,
) {
  await supabaseAdmin.from("admin_audit_logs").insert({
    admin_id: adminId,
    action,
    target_table: "pharmacists",
    target_id: pharmacistId,
    metadata: metadata as never,
  });
}

export const getAdminPharmacist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const [{ data: p }, { data: languages }, { data: affiliations }, { data: specialties }, { data: areas }] =
      await Promise.all([
        supabaseAdmin.from("pharmacists").select("*").eq("id", data.id).maybeSingle(),
        supabaseAdmin
          .from("pharmacist_languages")
          .select("id, language")
          .eq("pharmacist_id", data.id)
          .order("created_at"),
        supabaseAdmin
          .from("pharmacist_affiliations")
          .select("id, organisation, role")
          .eq("pharmacist_id", data.id)
          .order("created_at"),
        supabaseAdmin
          .from("pharmacist_specialties")
          .select("id, specialty")
          .eq("pharmacist_id", data.id)
          .order("created_at"),
        supabaseAdmin
          .from("pharmacist_service_areas")
          .select("id, suburb, state, postcode, radius_km")
          .eq("pharmacist_id", data.id)
          .order("created_at"),
      ]);
    if (!p) throw new Response("Not found", { status: 404 });

    let owner_email: string | null = null;
    if (p.user_id) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(p.user_id);
      owner_email = u.user?.email ?? null;
    }

    return {
      pharmacist: p,
      owner_email,
      languages: languages ?? [],
      affiliations: affiliations ?? [],
      specialties: specialties ?? [],
      service_areas: areas ?? [],
    };
  });

const updatableSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().min(1).max(200).optional(),
  title: z.string().max(120).nullable().optional(),
  bio: z.string().max(4000).nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
  ahpra_number: z.string().max(50).nullable().optional(),
  credentialing_body: z.string().max(120).nullable().optional(),
  years_experience: z.number().int().min(0).max(80).nullable().optional(),
  suburb: z.string().max(120).nullable().optional(),
  state: z.string().max(10).nullable().optional(),
  postcode: z.string().max(10).nullable().optional(),
  contact_preference: z.string().max(40).nullable().optional(),
  telehealth: z.boolean().optional(),
  home_visits: z.boolean().optional(),
  accepting_referrals: z.boolean().optional(),
  turnaround_days: z.number().int().min(0).max(365).nullable().optional(),
  verification_status: z.enum(["verified", "pending", "rejected"]).optional(),
  is_published: z.boolean().optional(),
});

export const updateAdminPharmacist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updatableSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { id, ...patch } = data;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin.from("pharmacists").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    await audit(context.userId, "pharmacist.update", id, { fields: Object.keys(patch) });
    return { ok: true };
  });

export const addPharmacistTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        pharmacist_id: z.string().uuid(),
        kind: z.enum(["language", "affiliation", "specialty"]),
        value: z.string().min(1).max(120),
        meta: z.string().max(120).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.kind === "language") {
      const { data: row, error } = await supabaseAdmin
        .from("pharmacist_languages")
        .insert({ pharmacist_id: data.pharmacist_id, language: data.value })
        .select("id, language")
        .single();
      if (error) throw new Error(error.message);
      await audit(context.userId, "pharmacist.tag.add", data.pharmacist_id, data);
      return row;
    }
    if (data.kind === "affiliation") {
      const { data: row, error } = await supabaseAdmin
        .from("pharmacist_affiliations")
        .insert({
          pharmacist_id: data.pharmacist_id,
          organisation: data.value,
          role: data.meta ?? null,
        })
        .select("id, organisation, role")
        .single();
      if (error) throw new Error(error.message);
      await audit(context.userId, "pharmacist.tag.add", data.pharmacist_id, data);
      return row;
    }
    const { data: row, error } = await supabaseAdmin
      .from("pharmacist_specialties")
      .insert({ pharmacist_id: data.pharmacist_id, specialty: data.value })
      .select("id, specialty")
      .single();
    if (error) throw new Error(error.message);
    await audit(context.userId, "pharmacist.tag.add", data.pharmacist_id, data);
    return row;
  });

export const removePharmacistTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        kind: z.enum(["language", "affiliation", "specialty"]),
        pharmacist_id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const table =
      data.kind === "language"
        ? "pharmacist_languages"
        : data.kind === "affiliation"
          ? "pharmacist_affiliations"
          : "pharmacist_specialties";
    const { error } = await supabaseAdmin.from(table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context.userId, "pharmacist.tag.remove", data.pharmacist_id, {
      kind: data.kind,
      id: data.id,
    });
    return { ok: true };
  });

export const addServiceArea = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        pharmacist_id: z.string().uuid(),
        suburb: z.string().min(1).max(120),
        state: z.string().max(10).nullable().optional(),
        postcode: z.string().max(10).nullable().optional(),
        radius_km: z.number().int().min(0).max(500).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("pharmacist_service_areas")
      .insert({
        pharmacist_id: data.pharmacist_id,
        suburb: data.suburb,
        state: data.state ?? null,
        postcode: data.postcode ?? null,
        radius_km: data.radius_km ?? null,
      })
      .select("id, suburb, state, postcode, radius_km")
      .single();
    if (error) throw new Error(error.message);
    await audit(context.userId, "pharmacist.area.add", data.pharmacist_id, data);
    return row;
  });

export const removeServiceArea = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), pharmacist_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("pharmacist_service_areas")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context.userId, "pharmacist.area.remove", data.pharmacist_id, { id: data.id });
    return { ok: true };
  });

export const uploadAdminPharmacistPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        pharmacist_id: z.string().uuid(),
        owner_user_id: z.string().uuid(),
        filename: z.string().min(1).max(200),
        content_type: z.string().regex(/^image\/(jpeg|png|webp)$/),
        // base64-encoded file bytes
        data_base64: z.string().min(1).max(8 * 1024 * 1024),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const ext = data.filename.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${data.owner_user_id}/admin-${Date.now()}.${ext}`;
    const bytes = Buffer.from(data.data_base64, "base64");
    if (bytes.length > 4 * 1024 * 1024) {
      throw new Response("Image too large (max 4MB)", { status: 400 });
    }
    const { error: upErr } = await supabaseAdmin.storage
      .from("pharmacist-photos")
      .upload(path, bytes, { contentType: data.content_type, upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: pub } = supabaseAdmin.storage.from("pharmacist-photos").getPublicUrl(path);
    const url = pub.publicUrl;
    const { error: updErr } = await supabaseAdmin
      .from("pharmacists")
      .update({ photo_url: url })
      .eq("id", data.pharmacist_id);
    if (updErr) throw new Error(updErr.message);
    await audit(context.userId, "pharmacist.photo.update", data.pharmacist_id, { path });
    return { url };
  });
