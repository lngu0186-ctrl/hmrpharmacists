import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { verifyInvitationToken, acceptInvitation } from "@/lib/invitations.functions";

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

export const Route = createFileRoute("/register/invite")({
  validateSearch: (s) => z.object({ token: z.string().optional() }).parse(s),
  component: InviteRegisterPage,
  head: () => ({
    meta: [
      { title: "Accept your invitation — HMR Pharmacists Exchange" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function InviteRegisterPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const verify = useServerFn(verifyInvitationToken);
  const accept = useServerFn(acceptInvitation);

  const v = useQuery({
    queryKey: ["invite-token", token],
    queryFn: () => verify({ data: { token: token ?? "" } }),
    enabled: !!token,
    retry: false,
  });

  const [form, setForm] = useState({
    full_name: "",
    title: "",
    password: "",
    mobile: "",
    ahpra_number: "",
    accreditation_number: "",
    state: "NSW" as (typeof STATES)[number],
    suburb: "",
    postcode: "",
    bio: "",
    telehealth: false,
    home_visits: true,
    consent_terms: false,
    confirm_accredited: false,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (v.data?.ok) {
      const i = v.data.invitation;
      setForm((f) => ({
        ...f,
        full_name:
          `${i.invited_first_name ?? ""} ${i.invited_last_name ?? ""}`.trim() || f.full_name,
        mobile: i.invited_mobile ?? "",
        ahpra_number: i.invited_ahpra_number ?? "",
        accreditation_number: i.invited_accreditation_number ?? "",
        state: (i.invited_state as (typeof STATES)[number]) ?? "NSW",
        suburb: i.invited_suburb ?? "",
        postcode: i.invited_postcode ?? "",
      }));
    }
  }, [v.data]);

  if (!token) {
    return <ErrorState title="Missing invitation link" />;
  }
  if (v.isLoading) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-md p-12 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
          Checking your invitation…
        </div>
      </SiteShell>
    );
  }
  if (!v.data || !v.data.ok) {
    const reason = v.data?.ok === false ? v.data.reason : "invalid";
    const titles: Record<string, string> = {
      invalid: "This invitation link is invalid",
      expired: "This invitation has expired",
      accepted: "This invitation has already been used",
      revoked: "This invitation has been revoked",
    };
    return <ErrorState title={titles[reason] ?? "Invitation problem"} />;
  }

  const inv = v.data.invitation;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.consent_terms || !form.confirm_accredited) {
      toast.error("Please confirm both checkboxes to continue.");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await accept({
        data: {
          token: token!,
          password: form.password,
          full_name: form.full_name,
          title: form.title,
          mobile: form.mobile,
          ahpra_number: form.ahpra_number,
          accreditation_number: form.accreditation_number,
          state: form.state,
          suburb: form.suburb,
          postcode: form.postcode,
          bio: form.bio,
          telehealth: form.telehealth,
          home_visits: form.home_visits,
          consent_terms: true as const,
          confirm_accredited: true as const,
        },
      });
      // Sign the user in so they land in the dashboard with a real session.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: inv.invited_email,
        password: form.password,
      });
      if (signInErr) {
        toast.success("Account created. Please sign in.");
        navigate({ to: "/auth" });
        return;
      }
      toast.success(
        res.fast_track
          ? "Welcome! Your profile is queued for fast-track admin review."
          : "Welcome! Your profile is now pending verification.",
      );
      navigate({ to: "/onboarding" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not complete registration.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteShell>
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="p-8">
          <div className="mb-6 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold">Accept your invitation</h1>
              <p className="text-sm text-muted-foreground">
                {inv.inviter_name} invited you to join HMR Pharmacists Exchange.
              </p>
            </div>
          </div>

          {inv.personal_note && (
            <div className="mb-6 rounded-lg border border-border bg-muted/40 p-3 text-sm italic text-muted-foreground">
              "{inv.personal_note}" — {inv.inviter_name}
            </div>
          )}

          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <F label="Email">
              <Input value={inv.invited_email} disabled readOnly />
            </F>
            <F label="Full name *">
              <Input
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </F>
            <F label="Password *">
              <Input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </F>
            <F label="Title (e.g. Mr, Ms, Dr)">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </F>
            <F label="Mobile">
              <Input
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              />
            </F>
            <F label="State *">
              <Select
                value={form.state}
                onValueChange={(v) =>
                  setForm({ ...form, state: v as (typeof STATES)[number] })
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
            </F>
            <F label="Suburb">
              <Input
                value={form.suburb}
                onChange={(e) => setForm({ ...form, suburb: e.target.value })}
              />
            </F>
            <F label="Postcode">
              <Input
                maxLength={4}
                value={form.postcode}
                onChange={(e) => setForm({ ...form, postcode: e.target.value })}
              />
            </F>
            <F label="AHPRA number">
              <Input
                value={form.ahpra_number}
                onChange={(e) => setForm({ ...form, ahpra_number: e.target.value })}
              />
            </F>
            <F label="AACP / HMR accreditation #">
              <Input
                value={form.accreditation_number}
                onChange={(e) =>
                  setForm({ ...form, accreditation_number: e.target.value })
                }
              />
            </F>
            <F label="Short bio" className="sm:col-span-2">
              <Textarea
                rows={4}
                maxLength={2000}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </F>

            <label className="flex items-center gap-3 text-sm">
              <Checkbox
                checked={form.home_visits}
                onCheckedChange={(v) => setForm({ ...form, home_visits: v === true })}
              />
              I offer in-person / home visits
            </label>
            <label className="flex items-center gap-3 text-sm">
              <Checkbox
                checked={form.telehealth}
                onCheckedChange={(v) => setForm({ ...form, telehealth: v === true })}
              />
              I offer telehealth consults
            </label>

            <label className="sm:col-span-2 flex items-start gap-3 text-sm">
              <Checkbox
                checked={form.confirm_accredited}
                onCheckedChange={(v) =>
                  setForm({ ...form, confirm_accredited: v === true })
                }
              />
              I confirm I am AHPRA-registered and AACP/HMR-accredited.
            </label>
            <label className="sm:col-span-2 flex items-start gap-3 text-sm">
              <Checkbox
                checked={form.consent_terms}
                onCheckedChange={(v) =>
                  setForm({ ...form, consent_terms: v === true })
                }
              />
              <span>
                I agree to the{" "}
                <Link to="/terms" className="underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create my profile
              </Button>
            </div>
          </form>
        </Card>
      </section>
    </SiteShell>
  );
}

function F({
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

function ErrorState({ title }: { title: string }) {
  return (
    <SiteShell>
      <section className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <Card className="p-8">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please ask the person who invited you to send a fresh invitation, or contact
            support if you believe this is a mistake.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild variant="outline">
              <Link to="/">Back to home</Link>
            </Button>
            <Button asChild>
              <Link to="/contact">Request a new invite</Link>
            </Button>
          </div>
        </Card>
      </section>
    </SiteShell>
  );
}
