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

async function logAudit(
  adminId: string,
  action: string,
  targetId: string | null,
  metadata: Record<string, unknown>,
) {
  await supabaseAdmin.from("admin_audit_logs").insert({
    admin_id: adminId,
    action,
    target_table: "user_roles",
    target_id: targetId,
    metadata: metadata as never,
  });
}

type AppRole = "admin" | "pharmacist" | "user";

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        search: z.string().max(200).optional(),
        page: z.number().int().min(1).max(1000).default(1),
        perPage: z.number().int().min(1).max(100).default(50),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
      page: data.page,
      perPage: data.perPage,
    });
    if (error) throw new Error(error.message);

    let users = list.users;
    if (data.search) {
      const q = data.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.email?.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q) ||
          (u.user_metadata?.display_name as string | undefined)?.toLowerCase().includes(q),
      );
    }

    const ids = users.map((u) => u.id);
    const { data: roleRows } = ids.length
      ? await supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids)
      : { data: [] as { user_id: string; role: string }[] };

    const rolesByUser = new Map<string, string[]>();
    for (const r of roleRows ?? []) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    }

    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        display_name: (u.user_metadata?.display_name as string | undefined) ?? null,
        roles: rolesByUser.get(u.id) ?? [],
      })),
    };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        role: z.enum(["admin", "pharmacist", "user"]),
        grant: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    if (
      !data.grant &&
      data.role === "admin" &&
      data.user_id === context.userId
    ) {
      throw new Response("You cannot revoke your own admin role.", { status: 400 });
    }

    if (data.grant) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.user_id, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }

    await logAudit(context.userId, data.grant ? "role.grant" : "role.revoke", data.user_id, {
      role: data.role,
    });

    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.user_id === context.userId) {
      throw new Response("You cannot delete your own account.", { status: 400 });
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "user.delete", data.user_id, {});
    return { ok: true };
  });
