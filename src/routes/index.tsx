import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search, Users, Building2, Stethoscope, Pill, ShieldCheck, FileText, MessageSquare, ClipboardCheck, ChevronDown } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { PharmacistCard } from "@/components/site/PharmacistCard";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "HMR Pharmacist Exchange — Find a credentialed pharmacist in Australia" },
      { name: "description", content: "The trusted referral and discovery platform for credentialed pharmacists providing Home Medicines Reviews across Australia. For patients, GPs, clinics and pharmacies." },
      { property: "og:title", content: "HMR Pharmacist Exchange" },
      { property: "og:description", content: "Find a credentialed pharmacist for Home Medicines Reviews." },
      { property: "og:url", content: "/" },
    ],
  }),
});

function Landing() {
  return (
    <SiteShell>
      <Hero />
      <HmrExplainer />
      <AudienceCards />
      <TrustSection />
      <HowItWorks />
      <FeaturedPharmacists />
      <Faq />
      <CtaBanner />
    </SiteShell>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
        <div className="flex flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
            <ShieldCheck className="h-3.5 w-3.5 text-trust" /> Verified credentialed pharmacists · Australia-wide
          </span>
          <h1 className="mt-5 text-balance text-4xl font-semibold leading-tight text-foreground sm:text-5xl lg:text-6xl">
            Find a credentialed pharmacist for Home Medicines Reviews.
          </h1>
          <p className="mt-5 max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
            Helping patients, GPs, clinics and community pharmacies connect with credentialed pharmacists across Australia — through one trusted, privacy-safe platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/find"><Search className="mr-2 h-4 w-4" />Find an HMR pharmacist</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/for-pharmacists">Join as a pharmacist</Link></Button>
          </div>
          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-border pt-6 text-sm">
            <Stat label="Verified profiles" value="Manual review" />
            <Stat label="Privacy-safe" value="No PHI in MVP" />
            <Stat label="Coverage" value="Metro & regional" />
          </dl>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 -z-10 rounded-3xl bg-trust/10 blur-2xl" />
          <img
            src={heroImg}
            alt="Credentialed pharmacist conducting a Home Medicines Review with a patient"
            width={1200}
            height={900}
            fetchPriority="high"
            decoding="async"
            className="aspect-[4/3] w-full rounded-2xl object-cover shadow-elevated"
          />
          <div className="absolute -bottom-5 -left-5 hidden rounded-xl border border-border bg-card p-4 shadow-elevated sm:block">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-success/10 text-success"><ShieldCheck className="h-5 w-5" /></span>
              <div>
                <p className="text-xs text-muted-foreground">Verified by HMR Exchange</p>
                <p className="text-sm font-semibold">AHPRA-registered, AACP-credentialed</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function HmrExplainer() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 className="text-3xl font-semibold sm:text-4xl">What is a Home Medicines Review?</h2>
          <p className="mt-4 text-muted-foreground">
            A Home Medicines Review (HMR) is a medication review for someone living in the community. A credentialed pharmacist meets with the person — usually at home — to talk through their medicines, then prepares a report for the referring clinician.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Eligibility is determined by healthcare professionals and program rules. This platform supports discovery and privacy-safe enquiries — it does not provide medical advice.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
          {[
            { t: "Who it can help", d: "People taking multiple medicines, with recent changes, side-effects, or complex regimens." },
            { t: "Who refers", d: "GPs and eligible specialists initiate HMR referrals based on clinical need." },
            { t: "What happens", d: "A credentialed pharmacist reviews medications, usually at home, and writes a report back to the referrer." },
            { t: "What this platform does", d: "Helps the right people find credentialed pharmacists and connect through a privacy-safe enquiry." },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h3 className="text-base font-semibold">{c.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AudienceCards() {
  const cards = [
    { to: "/for-patients", icon: Users, title: "Patients & carers", desc: "Understand HMRs in plain English and learn how to ask your GP." , tone: "bg-primary-soft text-primary"},
    { to: "/for-gps", icon: Stethoscope, title: "GPs & clinics", desc: "Find a credentialed pharmacist quickly. Send a privacy-safe enquiry.", tone: "bg-trust/10 text-trust" },
    { to: "/for-pharmacies", icon: Building2, title: "Community pharmacies", desc: "Connect with consultant pharmacists for HMR coordination.", tone: "bg-accent text-accent-foreground" },
    { to: "/for-pharmacists", icon: Pill, title: "Credentialed pharmacists", desc: "Create a verified profile and receive appropriate referrals.", tone: "bg-success/10 text-success" },
  ] as const;
  return (
    <section className="bg-soft">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold sm:text-4xl">One platform. Four pathways.</h2>
          <p className="mt-3 text-muted-foreground">A central, trusted exchange for everyone involved in Home Medicines Reviews.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Link key={c.to} to={c.to} className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated">
              <span className={`grid h-11 w-11 place-items-center rounded-xl ${c.tone}`}><c.icon className="h-5 w-5" /></span>
              <h3 className="mt-5 text-lg font-semibold">{c.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{c.desc}</p>
              <span className="mt-5 inline-flex items-center text-sm font-medium text-primary">Learn more <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  const items = [
    { icon: ShieldCheck, t: "Verified pharmacist profiles", d: "Profiles are manually reviewed before they go live. AHPRA registration and credentialing details are checked." },
    { icon: MessageSquare, t: "Privacy-safe enquiries", d: "Enquiries are routed through the platform with audit trails. We don't expose pharmacist email addresses." },
    { icon: FileText, t: "Australian-focused", d: "Built for Australian terminology, program rules and clinical workflows. Australian spelling throughout." },
    { icon: ClipboardCheck, t: "Manual moderation", d: "All listings are reviewed by our team before becoming searchable." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold sm:text-4xl">A platform clinicians can trust.</h2>
          <p className="mt-4 text-muted-foreground">We treat trust as infrastructure. Verification, privacy, and moderation are built in — not bolted on.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((it) => (
            <div key={it.t} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-trust/10 text-trust"><it.icon className="h-5 w-5" /></span>
              <h3 className="mt-4 text-base font-semibold">{it.t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{it.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: 1, t: "Search", d: "Filter by suburb, specialty, telehealth, languages and availability." },
    { n: 2, t: "Connect", d: "Open a verified pharmacist profile to review their experience and service model." },
    { n: 3, t: "Enquire", d: "Send a privacy-safe enquiry. The pharmacist responds via the platform." },
    { n: 4, t: "HMR proceeds", d: "Once eligibility is confirmed by the referrer, the pharmacist conducts the review and reports back." },
  ];
  return (
    <section className="bg-soft">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold sm:text-4xl">How it works</h2>
          <p className="mt-3 text-muted-foreground">A clear path from discovery to the medication review itself.</p>
        </div>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{s.n}</span>
              <h3 className="mt-4 text-base font-semibold">{s.t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function FeaturedPharmacists() {
  const { data } = useQuery({
    queryKey: ["featured-pharmacists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacists")
        .select("id,slug,full_name,title,bio,photo_url,suburb,state,telehealth,home_visits,accepting_referrals,turnaround_days,pharmacist_specialties(specialty)")
        .eq("is_published", true)
        .eq("verification_status", "verified")
        .limit(6);
      if (error) throw error;
      return data?.map((p) => ({ ...p, specialties: p.pharmacist_specialties?.map((s: { specialty: string }) => s.specialty) ?? [] }));
    },
  });

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-semibold sm:text-4xl">Featured pharmacists</h2>
          <p className="mt-3 text-muted-foreground">A sample of credentialed pharmacists currently listed.</p>
        </div>
        <Button asChild variant="outline" className="hidden sm:inline-flex"><Link to="/find">Browse directory <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data?.slice(0, 6).map((p) => <PharmacistCard key={p.id} p={p} />) ?? Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl border border-border bg-muted" />
        ))}
      </div>
    </section>
  );
}

const FAQS = [
  { q: "Is this platform a government service?", a: "No. HMR Pharmacist Exchange is an independent platform that helps patients, GPs, clinics, pharmacies and credentialed pharmacists connect. HMR program rules and eligibility are set by Australian government bodies and clinicians." },
  { q: "Does listing on this platform guarantee a referral?", a: "No. Pharmacists choose which referrals to accept based on their capacity, location and clinical scope. Eligibility is determined by referring clinicians and program rules." },
  { q: "Can patients book directly?", a: "No. HMRs require a referral from a GP or eligible specialist. Patients can use the platform to learn more and to share information with their GP." },
  { q: "How are pharmacists verified?", a: "Our team manually reviews each profile before it becomes searchable, including AHPRA registration and credentialing evidence." },
  { q: "How is patient privacy protected?", a: "Enquiries are routed through the platform with audit trails. We deliberately collect minimal information and do not collect clinical detail in the enquiry form." },
];

function Faq() {
  return (
    <section className="bg-soft">
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-semibold sm:text-4xl">Frequently asked questions</h2>
        <div className="mt-10 space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-border bg-card p-5 shadow-soft [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-medium">
                {f.q}
                <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBanner() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-3xl bg-trust px-8 py-14 text-trust-foreground shadow-elevated sm:px-12">
        <div className="grid items-center gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold sm:text-4xl">Ready to connect with a credentialed pharmacist?</h2>
            <p className="mt-3 text-trust-foreground/85">Search Australia-wide. Filter by suburb, specialty and availability. Send a privacy-safe enquiry in minutes.</p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Button asChild size="lg" variant="secondary"><Link to="/find">Find a pharmacist</Link></Button>
            <Button asChild size="lg" variant="outline" className="border-trust-foreground/40 bg-transparent text-trust-foreground hover:bg-trust-foreground/10 hover:text-trust-foreground"><Link to="/about-hmr">Learn about HMRs</Link></Button>
          </div>
        </div>
      </div>
    </section>
  );
}
