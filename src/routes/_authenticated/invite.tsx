import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Send, RotateCw, Ban, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  createInvitation,
  listInvitations,
  resendInvitation,
  revokeInvitation,
} from "@/lib/invitations.functions";

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

export const Route = createFileRoute("/_authenticated/invite")({
  beforeLoad: async () => {
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user.id;
    if (!userId) throw redirect({ to: "/auth" });
    const [{ data: admin }, { data: ph }] = await Promise.all([
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle(),
      supabase
        .from("pharmacists")
        .select("verification_status")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    if (!admin && ph?.verification_status !== "verified") {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: InvitePage,
  head: () => ({
    meta: [
      { title: "Invite a pharmacist — HMR Pharmacists Exchange" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function InvitePage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const create = useServerFn(createInvitation);
  const list = useServerFn(listInvitations);
  const resend = useServerFn(resendInvitation);
  const revoke = useServerFn(revokeInvitation);

  const [form, setForm] = useState({
    invited_first_name: "",
    invited_last_name: "",
    invited_email: "",
    invited_mobile: "",
    invited_ahpra_number: "",
    invited_accreditation_number: "",
    invited_state: "NSW" as (typeof STATES)[number],
    invited_suburb: "",
    invited_postcode: "",
    personal_note: "",
    fast_track_verification: false,
    confirm_known_pharmacist: false,
  });

  const invitations = useQuery({
    queryKey: ["invitations"],
    queryFn: () => list({ data: { status: "all" } }),
  });

  const createMut = useMutation({
    mutationFn: () =>
      create({
        data: {
          ...form,
          confirm_known_pharmacist: true as const,
        },
      }),
    onSuccess: (res) => {
      if (res.email_sent) {
        toast.success(
          "Invitation sent. They'll receive a secure registration link that pre-fills their profile details and helps them complete onboarding faster.",
        );
      } else {
        toast.warning(
          `Invitation created, but the email could not be sent (${res.email_error ?? "unknown error"}). Copy the link below to share manually.`,
        );
      }
      navigator.clipboard?.writeText(res.invite_url).catch(() => {});
      setForm({
        invited_first_name: "",
        invited_last_name: "",
        invited_email: "",
        invited_mobile: "",
        invited_ahpra_number: "",
        invited_accreditation_number: "",
        invited_state: "NSW",
        invited_suburb: "",
        invited_postcode: "",
        personal_note: "",
        fast_track_verification: false,
        confirm_known_pharmacist: false,
      });
      qc.invalidateQueries({ queryKey: ["invitations"] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Could not send invitation.";
      toast.error(msg);
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.confirm_known_pharmacist) {
      toast.error("Please confirm you know this pharmacist professionally.");
      return;
    }
    if (!form.invited_first_name || !form.invited_last_name || !form.invited_email) {
      toast.error("Name and email are required.");
      return;
    }
    createMut.mutate();
  };

  const onResend = async (id: string) => {
    try {
      const res = await resend({ data: { id } });
      navigator.clipboard?.writeText(res.invite_url).catch(() => {});
      toast.success(
        res.email_sent
          ? "Invitation resent. Link copied to clipboard."
          : "New link generated and copied to clipboard (email send failed).",
      );
      qc.invalidateQueries({ queryKey: ["invitations"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not resend.");
    }
  };

  const onRevoke = async (id: string) => {
    if (!confirm("Revoke this invitation? The link will stop working.")) return;
    try {
      await revoke({ data: { id } });
      toast.success("Invitation revoked.");
      qc.invalidateQueries({ queryKey: ["invitations"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not revoke.");
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3">
        <UserPlus className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Invite a HMR pharmacist</h1>
          <p className="text-sm text-muted-foreground">
            Send a secure invitation that pre-fills the recipient's registration form.
          </p>
        </div>
      </header>

      <Card className="p-6">
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="First name *">
            <Input
              required
              value={form.invited_first_name}
              onChange={(e) => setForm({ ...form, invited_first_name: e.target.value })}
            />
          </Field>
          <Field label="Last name *">
            <Input
              required
              value={form.invited_last_name}
              onChange={(e) => setForm({ ...form, invited_last_name: e.target.value })}
            />
          </Field>
          <Field label="Email *" className="sm:col-span-2">
            <Input
              type="email"
              required
              value={form.invited_email}
              onChange={(e) => setForm({ ...form, invited_email: e.target.value })}
            />
          </Field>
          <Field label="Mobile (optional)">
            <Input
              value={form.invited_mobile}
              onChange={(e) => setForm({ ...form, invited_mobile: e.target.value })}
            />
          </Field>
          <Field label="State *">
            <Select
              value={form.invited_state}
              onValueChange={(v) =>
                setForm({ ...form, invited_state: v as (typeof STATES)[number] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="AHPRA number (optional)">
            <Input
              value={form.invited_ahpra_number}
              onChange={(e) => setForm({ ...form, invited_ahpra_number: e.target.value })}
            />
          </Field>
          <Field label="AACP / HMR accreditation # (optional)">
            <Input
              value={form.invited_accreditation_number}
              onChange={(e) =>
                setForm({ ...form, invited_accreditation_number: e.target.value })
              }
            />
          </Field>
          <Field label="Primary suburb (optional)">
            <Input
              value={form.invited_suburb}
              onChange={(e) => setForm({ ...form, invited_suburb: e.target.value })}
            />
          </Field>
          <Field label="Postcode (optional)">
            <Input
              value={form.invited_postcode}
              maxLength={4}
              onChange={(e) => setForm({ ...form, invited_postcode: e.target.value })}
            />
          </Field>
          <Field label="Personal note (optional)" className="sm:col-span-2">
            <Textarea
              rows={3}
              maxLength={500}
              placeholder="A short personal message to include in the invitation email."
              value={form.personal_note}
              onChange={(e) => setForm({ ...form, personal_note: e.target.value })}
            />
          </Field>

          {isAdmin && (
            <label className="sm:col-span-2 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <Checkbox
                checked={form.fast_track_verification}
                onCheckedChange={(v) =>
                  setForm({ ...form, fast_track_verification: v === true })
                }
              />
              <span>
                <span className="font-medium">Fast-track verification</span>
                <span className="block text-xs text-muted-foreground">
                  Flag this invitee for priority admin review after they register.
                </span>
              </span>
            </label>
          )}

          <label className="sm:col-span-2 flex items-start gap-3 text-sm">
            <Checkbox
              checked={form.confirm_known_pharmacist}
              onCheckedChange={(v) =>
                setForm({ ...form, confirm_known_pharmacist: v === true })
              }
            />
            <span>
              I confirm this person is a pharmacist I know or have professionally interacted
              with.
            </span>
          </label>

          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send invitation
            </Button>
          </div>
        </form>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Invitations sent</h2>
        {invitations.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !invitations.data?.invitations.length ? (
          <Card className="p-6 text-sm text-muted-foreground">
            You haven't sent any invitations yet.
          </Card>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Invitee</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Sent</th>
                  <th className="px-3 py-2">Expires</th>
                  {invitations.data?.isAdmin && <th className="px-3 py-2">Invited by</th>}
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.data!.invitations.map((inv) => (
                  <tr key={inv.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="font-medium">
                        {inv.invited_first_name} {inv.invited_last_name}
                      </div>
                      <div className="text-xs text-muted-foreground">{inv.invited_email}</div>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {new Date(inv.created_at).toLocaleDateString("en-AU")}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {new Date(inv.expires_at).toLocaleDateString("en-AU")}
                    </td>
                    {invitations.data?.isAdmin && (
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {inv.inviter_name ?? "—"}
                      </td>
                    )}
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        {inv.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onResend(inv.id)}
                            >
                              <RotateCw className="mr-1 h-3.5 w-3.5" /> Resend
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRevoke(inv.id)}
                            >
                              <Ban className="mr-1 h-3.5 w-3.5" /> Revoke
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Need to manage roles instead?{" "}
        {isAdmin && (
          <Link to="/admin" className="underline">
            Open admin
          </Link>
        )}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-amber-100 text-amber-800" },
    accepted: { label: "Accepted", cls: "bg-emerald-100 text-emerald-800" },
    expired: { label: "Expired", cls: "bg-muted text-muted-foreground" },
    revoked: { label: "Revoked", cls: "bg-rose-100 text-rose-800" },
  };
  const m = map[status] ?? { label: status, cls: "" };
  return (
    <Badge variant="secondary" className={m.cls}>
      {m.label}
    </Badge>
  );
}

// Suppress unused import warning when no copy action present
void Copy;
