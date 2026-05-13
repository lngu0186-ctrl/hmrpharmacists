import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, MapPin, Clock, Video, Home, Languages, Award, ShieldCheck, Send } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { SiteShell } from "@/components/site/SiteShell";
import { VerifiedBadge } from "@/components/site/VerifiedBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pharmacists/$slug")({
  component: ProfilePage,
  head: ({ params }) => ({
    meta: [
      { title: `Credentialed pharmacist profile — HMR Pharmacist Exchange` },
      { name: "description", content: "Verified credentialed pharmacist profile for Home Medicines Reviews." },
      { property: "og:url", content: `/pharmacists/${params.slug}` },
      { property: "og:type", content: "profile" },
    ],
    links: [{ rel: "canonical", href: `/pharmacists/${params.slug}` }],
  }),
});

function usePharmacist(slug: string) {
  return useQuery({
    queryKey: ["pharmacist", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacists")
        .select("*, pharmacist_specialties(specialty), pharmacist_languages(language), pharmacist_service_areas(suburb,state,postcode,radius_km), pharmacist_affiliations(organisation,role)")
        .eq("slug", slug)
        .eq("is_published", true)
        .eq("verification_status", "verified")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function ProfilePage() {
  const { slug } = Route.useParams();
  const { data: p, isLoading } = usePharmacist(slug);

  if (isLoading) return <SiteShell><div className="mx-auto max-w-5xl px-4 py-20"><div className="h-96 animate-pulse rounded-2xl bg-muted" /></div></SiteShell>;
  if (!p) throw notFound();

  const specialties = p.pharmacist_specialties?.map((s) => s.specialty) ?? [];
  const languages = p.pharmacist_languages?.map((l) => l.language) ?? [];
  const areas = p.pharmacist_service_areas ?? [];
  const affiliations = p.pharmacist_affiliations ?? [];

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Link to="/find" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-1 h-4 w-4" /> Back to directory</Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <img src={p.photo_url ?? "/placeholder.svg"} alt={p.full_name} className="h-24 w-24 rounded-2xl object-cover ring-2 ring-primary-soft" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-semibold sm:text-3xl">{p.full_name}</h1>
                    <VerifiedBadge />
                  </div>
                  <p className="mt-1 text-muted-foreground">{p.title ?? "Credentialed Pharmacist"}</p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {p.suburb}, {p.state} {p.postcode}</span>
                    {p.years_experience && <span className="inline-flex items-center gap-1"><Award className="h-3.5 w-3.5" /> {p.years_experience} years experience</span>}
                    {p.turnaround_days && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> ~{p.turnaround_days} day turnaround</span>}
                  </div>
                </div>
              </div>

              {p.bio && (
                <div className="mt-6 border-t border-border pt-6">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">About</h2>
                  <p className="mt-2 leading-relaxed text-foreground">{p.bio}</p>
                </div>
              )}

              <div className="mt-6 grid gap-5 border-t border-border pt-6 sm:grid-cols-2">
                <Section title="Specialties" items={specialties} />
                <Section title="Languages" items={languages} icon={<Languages className="h-3.5 w-3.5" />} />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Capability label="Telehealth" enabled={p.telehealth} icon={<Video className="h-4 w-4" />} />
                <Capability label="Home visits" enabled={p.home_visits} icon={<Home className="h-4 w-4" />} />
                <Capability label="Accepting referrals" enabled={p.accepting_referrals} icon={<ShieldCheck className="h-4 w-4" />} />
              </div>

              {areas.length > 0 && (
                <div className="mt-6 border-t border-border pt-6">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Service areas</h2>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {areas.map((a, i) => (
                      <li key={i} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                        {a.suburb}, {a.state} {a.postcode}{a.radius_km ? ` · ${a.radius_km} km radius` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {affiliations.length > 0 && (
                <div className="mt-6 border-t border-border pt-6">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Affiliations</h2>
                  <ul className="mt-3 space-y-2">
                    {affiliations.map((a, i) => (
                      <li key={i} className="text-sm text-foreground">{a.organisation}{a.role ? ` — ${a.role}` : ""}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
                <strong className="text-foreground">Verification:</strong> AHPRA registration and credentialing evidence reviewed manually by our team. Listing on this platform does not guarantee referral acceptance.
              </div>
            </div>
          </div>

          <aside>
            <div className="sticky top-20 rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="text-lg font-semibold">Send an enquiry</h2>
              <p className="mt-1 text-sm text-muted-foreground">Privacy-safe. Your contact details go to {p.full_name.split(" ")[0]} via the platform.</p>
              <EnquiryForm pharmacistId={p.id} />
            </div>
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}

function Section({ title, items, icon }: { title: string; items: string[]; icon?: React.ReactNode }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((s) => (
          <span key={s} className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
            {icon}{s}
          </span>
        ))}
      </div>
    </div>
  );
}

function Capability({ label, enabled, icon }: { label: string; enabled: boolean; icon: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${enabled ? "border-success/30 bg-success/5 text-success" : "border-border bg-muted/40 text-muted-foreground"}`}>
      {icon}<span className="text-sm font-medium">{label}</span>
    </div>
  );
}

const enquirySchema = z.object({
  sender_type: z.enum(["patient","gp","clinic","pharmacy"]),
  sender_name: z.string().trim().min(2).max(120),
  sender_email: z.string().trim().email().max(255),
  sender_phone: z.string().trim().max(40).optional().or(z.literal("")),
  organisation: z.string().trim().max(160).optional().or(z.literal("")),
  patient_suburb: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().min(10).max(1500),
  consent_given: z.literal(true),
});

function EnquiryForm({ pharmacistId }: { pharmacistId: string }) {
  const [form, setForm] = useState({
    sender_type: "gp" as const,
    sender_name: "",
    sender_email: "",
    sender_phone: "",
    organisation: "",
    patient_suburb: "",
    message: "",
    consent_given: false,
  });

  const mutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const parsed = enquirySchema.safeParse(values);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
      const { error } = await supabase.from("enquiries").insert({
        pharmacist_id: pharmacistId,
        sender_type: parsed.data.sender_type,
        sender_name: parsed.data.sender_name,
        sender_email: parsed.data.sender_email,
        sender_phone: parsed.data.sender_phone || null,
        organisation: parsed.data.organisation || null,
        patient_suburb: parsed.data.patient_suburb || null,
        message: parsed.data.message,
        consent_given: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Enquiry sent. The pharmacist will respond via the platform.");
      setForm({ sender_type: "gp", sender_name: "", sender_email: "", sender_phone: "", organisation: "", patient_suburb: "", message: "", consent_given: false });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }}>
      <div>
        <Label className="text-xs">I am a…</Label>
        <Select value={form.sender_type} onValueChange={(v) => setForm({ ...form, sender_type: v as typeof form.sender_type })}>
          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="gp">GP</SelectItem>
            <SelectItem value="clinic">Clinic</SelectItem>
            <SelectItem value="pharmacy">Community pharmacy</SelectItem>
            <SelectItem value="patient">Patient or carer</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Your name" value={form.sender_name} onChange={(v) => setForm({ ...form, sender_name: v })} required />
        <Field label="Email" type="email" value={form.sender_email} onChange={(v) => setForm({ ...form, sender_email: v })} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Phone (optional)" value={form.sender_phone} onChange={(v) => setForm({ ...form, sender_phone: v })} />
        <Field label="Organisation (optional)" value={form.organisation} onChange={(v) => setForm({ ...form, organisation: v })} />
      </div>
      <Field label="Patient suburb (optional)" value={form.patient_suburb} onChange={(v) => setForm({ ...form, patient_suburb: v })} />
      <div>
        <Label className="text-xs">Message</Label>
        <Textarea className="mt-1.5 min-h-28" value={form.message} placeholder="Briefly describe what you need — please do not include sensitive clinical detail or full medication lists."
          onChange={(e) => setForm({ ...form, message: e.target.value })} required maxLength={1500} />
        <p className="mt-1 text-[11px] text-muted-foreground">Do not include diagnoses, medication lists or other sensitive health data.</p>
      </div>
      <label className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Checkbox checked={form.consent_given} onCheckedChange={(v) => setForm({ ...form, consent_given: !!v })} className="mt-0.5" />
        <span>I consent to my contact details being shared with the listed pharmacist via this platform for the purpose of this enquiry. I understand this is not medical advice or emergency care.</span>
      </label>
      <Button type="submit" className="w-full" disabled={mutation.isPending || !form.consent_given}>
        <Send className="mr-2 h-4 w-4" /> {mutation.isPending ? "Sending…" : "Send enquiry"}
      </Button>
    </form>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input className="mt-1.5" type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}
