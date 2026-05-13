import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
  head: () => ({ meta: [{ title: "Pharmacist onboarding — HMR Pharmacist Exchange" }, { name: "robots", content: "noindex" }] }),
});

const SPECIALTIES = ["Aged care", "Polypharmacy", "Mental health", "Diabetes", "Palliative care", "Indigenous health", "CALD communities", "Paediatrics", "Oncology", "Renal"];
const STATES = ["VIC", "NSW", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

const schema = z.object({
  full_name: z.string().min(2).max(120),
  title: z.string().max(80).optional(),
  ahpra_number: z.string().min(6).max(20),
  credentialing_body: z.string().max(80).optional(),
  years_experience: z.number().int().min(0).max(60).optional(),
  bio: z.string().max(2000).optional(),
  suburb: z.string().min(2).max(80),
  state: z.string().min(2).max(8),
  postcode: z.string().min(3).max(8),
  telehealth: z.boolean(),
  home_visits: z.boolean(),
  accepting_referrals: z.boolean(),
  turnaround_days: z.number().int().min(1).max(60).optional(),
  contact_preference: z.string().max(40).optional(),
});

type FormState = z.infer<typeof schema> & { specialties: string[] };

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) + "-" + Math.random().toString(36).slice(2, 6);

function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["onboarding-pharmacist", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: ph } = await supabase.from("pharmacists").select("*").eq("user_id", user!.id).maybeSingle();
      if (!ph) return null;
      const { data: specs } = await supabase.from("pharmacist_specialties").select("specialty").eq("pharmacist_id", ph.id);
      return { ...ph, specialties: (specs ?? []).map((s) => s.specialty) };
    },
  });

  const [form, setForm] = useState<FormState>({
    full_name: "",
    title: "Credentialed pharmacist",
    ahpra_number: "",
    credentialing_body: "AACP",
    years_experience: 5,
    bio: "",
    suburb: "",
    state: "VIC",
    postcode: "",
    telehealth: true,
    home_visits: true,
    accepting_referrals: true,
    turnaround_days: 7,
    contact_preference: "Email",
    specialties: [],
  });

  useEffect(() => {
    if (existing) {
      setForm((f) => ({
        ...f,
        ...Object.fromEntries(Object.entries(existing).filter(([, v]) => v !== null && v !== undefined)),
      } as FormState));
    }
  }, [existing]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggleSpec = (s: string) => update("specialties", form.specialties.includes(s) ? form.specialties.filter((x) => x !== s) : [...form.specialties, s]);

  const steps = ["About you", "Service area", "Specialties", "Practice details", "Review & submit"];

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error("Please complete required fields: " + parsed.error.issues.map((i) => i.path.join(".")).join(", "));
      return;
    }
    setSaving(true);
    try {
      const payload: any = { ...parsed.data, user_id: user!.id };
      let pharmacistId = existing?.id as string | undefined;
      if (pharmacistId) {
        const { error } = await supabase.from("pharmacists").update(payload).eq("id", pharmacistId);
        if (error) throw error;
      } else {
        payload.slug = slugify(parsed.data.full_name);
        payload.verification_status = "pending";
        payload.is_published = false;
        const { data, error } = await supabase.from("pharmacists").insert(payload).select("id").single();
        if (error) throw error;
        pharmacistId = data.id;
      }

      // Sync specialties (delete + insert)
      await supabase.from("pharmacist_specialties").delete().eq("pharmacist_id", pharmacistId!);
      if (form.specialties.length) {
        await supabase.from("pharmacist_specialties").insert(
          form.specialties.map((s) => ({ pharmacist_id: pharmacistId!, specialty: s })),
        );
      }
      // Service area
      await supabase.from("pharmacist_service_areas").delete().eq("pharmacist_id", pharmacistId!);
      await supabase.from("pharmacist_service_areas").insert({
        pharmacist_id: pharmacistId!,
        suburb: form.suburb,
        state: form.state,
        postcode: form.postcode,
        radius_km: 25,
      });

      toast.success(existing ? "Profile updated" : "Profile submitted for verification");
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e.message ?? "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{existing ? "Edit your profile" : "Pharmacist onboarding"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Step {step + 1} of {steps.length}: {steps[step]}</p>
        <Progress value={((step + 1) / steps.length) * 100} className="mt-3 h-1.5" />
      </div>

      <Card className="p-6 sm:p-8">
        {step === 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name *"><Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} /></Field>
            <Field label="Title"><Input value={form.title ?? ""} onChange={(e) => update("title", e.target.value)} /></Field>
            <Field label="AHPRA number *"><Input value={form.ahpra_number} onChange={(e) => update("ahpra_number", e.target.value)} placeholder="PHA0000000000" /></Field>
            <Field label="Credentialing body"><Input value={form.credentialing_body ?? ""} onChange={(e) => update("credentialing_body", e.target.value)} placeholder="AACP / SHPA" /></Field>
            <Field label="Years of experience"><Input type="number" value={form.years_experience ?? 0} onChange={(e) => update("years_experience", Number(e.target.value))} /></Field>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Primary suburb *"><Input value={form.suburb} onChange={(e) => update("suburb", e.target.value)} /></Field>
            <Field label="State *">
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.state} onChange={(e) => update("state", e.target.value)}>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Postcode *"><Input value={form.postcode} onChange={(e) => update("postcode", e.target.value)} /></Field>
            <div className="sm:col-span-3 grid gap-3 sm:grid-cols-3">
              <Toggle label="Home visits" value={form.home_visits} onChange={(v) => update("home_visits", v)} />
              <Toggle label="Telehealth available" value={form.telehealth} onChange={(v) => update("telehealth", v)} />
              <Toggle label="Currently accepting referrals" value={form.accepting_referrals} onChange={(v) => update("accepting_referrals", v)} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="mb-4 text-sm text-muted-foreground">Select all areas of clinical focus that apply.</p>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((s) => {
                const active = form.specialties.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSpec(s)}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
                  >
                    {active && <Check className="mr-1 inline h-3.5 w-3.5" />}
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-5">
            <Field label="Typical turnaround (days)"><Input type="number" value={form.turnaround_days ?? 7} onChange={(e) => update("turnaround_days", Number(e.target.value))} /></Field>
            <Field label="Preferred contact method"><Input value={form.contact_preference ?? ""} onChange={(e) => update("contact_preference", e.target.value)} placeholder="Email / Secure messaging" /></Field>
            <Field label="Bio (visible on your public profile)">
              <Textarea rows={6} value={form.bio ?? ""} onChange={(e) => update("bio", e.target.value)} placeholder="Briefly describe your practice, approach, and the patients you typically support…" />
              <p className="mt-1 text-[11px] text-muted-foreground">{(form.bio ?? "").length} / 2000 characters. Avoid clinical claims you cannot substantiate.</p>
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Review</h3>
            <div className="grid gap-3 rounded-xl border border-border bg-muted/30 p-5 text-sm sm:grid-cols-2">
              <Row k="Name" v={form.full_name} />
              <Row k="AHPRA" v={form.ahpra_number} />
              <Row k="Location" v={`${form.suburb}, ${form.state} ${form.postcode}`} />
              <Row k="Telehealth" v={form.telehealth ? "Yes" : "No"} />
              <Row k="Home visits" v={form.home_visits ? "Yes" : "No"} />
              <Row k="Turnaround" v={`${form.turnaround_days} days`} />
              <div className="sm:col-span-2">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Specialties</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {form.specialties.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                  {form.specialties.length === 0 && <span className="text-xs text-muted-foreground">None selected</span>}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Submitting sends your profile for admin verification. We confirm AHPRA registration and credentialing before publishing publicly. You can edit any time.
            </p>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>Continue <ChevronRight className="ml-1 h-4 w-4" /></Button>
          ) : (
            <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : existing ? "Save changes" : "Submit for verification"}</Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs">{label}</Label><div className="mt-1.5">{children}</div></div>;
}
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
      <span className="text-sm">{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </label>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div><div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</div><div className="mt-0.5 font-medium">{v}</div></div>;
}
