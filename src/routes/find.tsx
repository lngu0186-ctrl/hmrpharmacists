import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Search, MapPin, Filter, X, Navigation, Loader2 } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { PharmacistCard, type PharmacistCardData } from "@/components/site/PharmacistCard";
import { supabase } from "@/integrations/supabase/client";
import { geocodeAU } from "@/lib/geocode.functions";
import { haversineKm } from "@/lib/geo";

export const Route = createFileRoute("/find")({
  component: FindPage,
  head: () => ({
    meta: [
      { title: "Find an HMR pharmacist in Australia — HMR Pharmacist Exchange" },
      { name: "description", content: "Search verified credentialed pharmacists for Home Medicines Reviews. Filter by suburb, specialty, telehealth, home visits, languages and availability." },
      { property: "og:title", content: "Find an HMR pharmacist" },
      { property: "og:description", content: "Search verified credentialed pharmacists across Australia." },
      { property: "og:url", content: "/find" },
    ],
    links: [{ rel: "canonical", href: "/find" }],
  }),
});

const SPECIALTIES = ["Aged care","Mental health","Diabetes","COPD","Cardiology","Polypharmacy","Anticoagulation","Opioid stewardship","Transitions of care","Palliative care","Deprescribing","Renal","Pain management","Asthma","CALD communities","Rural"] as const;

function FindPage() {
  const [q, setQ] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [telehealth, setTelehealth] = useState(false);
  const [homeVisits, setHomeVisits] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["pharmacists-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacists")
        .select("id,slug,full_name,title,bio,photo_url,suburb,state,postcode,telehealth,home_visits,accepting_referrals,turnaround_days,pharmacist_specialties(specialty),pharmacist_languages(language)")
        .eq("is_published", true)
        .eq("verification_status", "verified")
        .order("full_name");
      if (error) throw error;
      return data?.map((p) => ({
        ...p,
        specialties: p.pharmacist_specialties?.map((s: { specialty: string }) => s.specialty) ?? [],
        languages: p.pharmacist_languages?.map((l: { language: string }) => l.language) ?? [],
      })) ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.filter((p) => {
      if (accepting && !p.accepting_referrals) return false;
      if (telehealth && !p.telehealth) return false;
      if (homeVisits && !p.home_visits) return false;
      if (specialties.length && !specialties.some((s) => p.specialties.includes(s))) return false;
      if (needle) {
        const hay = `${p.full_name} ${p.suburb ?? ""} ${p.postcode ?? ""} ${p.state ?? ""} ${p.specialties.join(" ")} ${p.bio ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [data, q, accepting, telehealth, homeVisits, specialties]);

  const toggleSpecialty = (s: string) => setSpecialties((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]);
  const clearAll = () => { setQ(""); setAccepting(false); setTelehealth(false); setHomeVisits(false); setSpecialties([]); };
  const activeCount = (accepting?1:0)+(telehealth?1:0)+(homeVisits?1:0)+specialties.length;

  return (
    <SiteShell>
      <section className="border-b border-border bg-soft">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-semibold sm:text-4xl">Find a credentialed pharmacist</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Search verified pharmacists for Home Medicines Reviews across Australia.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search suburb, postcode, name or specialty…" className="h-12 pl-10" />
            </div>
            <Button variant="outline" size="lg" onClick={() => setShowFilters((v) => !v)} className="lg:hidden">
              <Filter className="mr-2 h-4 w-4" /> Filters {activeCount > 0 && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{activeCount}</span>}
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className={`${showFilters ? "block" : "hidden"} lg:block`}>
            <div className="sticky top-20 space-y-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Filters</h2>
                {activeCount > 0 && <button onClick={clearAll} className="text-xs text-primary hover:underline">Clear all</button>}
              </div>

              <div className="space-y-3">
                <ToggleRow label="Accepting new referrals" checked={accepting} onChange={setAccepting} />
                <ToggleRow label="Telehealth available" checked={telehealth} onChange={setTelehealth} />
                <ToggleRow label="Home visits available" checked={homeVisits} onChange={setHomeVisits} />
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Specialties</h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {SPECIALTIES.map((s) => {
                    const active = specialties.includes(s);
                    return (
                      <button key={s} onClick={() => toggleSpecialty(s)}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          <div>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{isLoading ? "Loading…" : `${filtered.length} pharmacist${filtered.length === 1 ? "" : "s"} found`}</p>
            </div>

            {isLoading ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl border border-border bg-muted" />)}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState onClear={clearAll} />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {filtered.map((p) => <PharmacistCard key={p.id} p={p as PharmacistCardData} />)}
              </div>
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-soft">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground"><MapPin className="h-5 w-5" /></span>
      <h3 className="mt-4 text-base font-semibold">No pharmacists match your filters</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">Try a broader suburb, fewer specialty filters, or clear all to see everyone.</p>
      <Button variant="outline" className="mt-5" onClick={onClear}><X className="mr-2 h-4 w-4" />Clear filters</Button>
    </div>
  );
}
