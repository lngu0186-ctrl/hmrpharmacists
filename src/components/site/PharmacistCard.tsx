import { Link } from "@tanstack/react-router";
import { MapPin, Clock, Video, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "./VerifiedBadge";

export interface PharmacistCardData {
  id: string;
  slug: string;
  full_name: string;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  suburb: string | null;
  state: string | null;
  telehealth: boolean;
  home_visits: boolean;
  accepting_referrals: boolean;
  turnaround_days: number | null;
  specialties?: string[];
}

export function PharmacistCard({ p }: { p: PharmacistCardData }) {
  return (
    <article className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated">
      <div className="flex items-start gap-4">
        <img
          src={p.photo_url ?? "/placeholder.svg"}
          alt={`${p.full_name}, credentialed pharmacist`}
          className="h-16 w-16 rounded-full object-cover ring-2 ring-primary-soft"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-foreground">{p.full_name}</h3>
            <VerifiedBadge />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{p.title ?? "Credentialed Pharmacist"}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {p.suburb}, {p.state}
          </p>
        </div>
      </div>

      {p.specialties && p.specialties.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {p.specialties.slice(0, 3).map((s) => (
            <span key={s} className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">{s}</span>
          ))}
        </div>
      )}

      {p.bio && <p className="line-clamp-2 text-sm text-muted-foreground">{p.bio}</p>}

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {p.telehealth && <span className="inline-flex items-center gap-1"><Video className="h-3.5 w-3.5" /> Telehealth</span>}
        {p.home_visits && <span className="inline-flex items-center gap-1"><Home className="h-3.5 w-3.5" /> Home visits</span>}
        {p.turnaround_days && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> ~{p.turnaround_days} day turnaround</span>}
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${p.accepting_referrals ? "text-success" : "text-muted-foreground"}`}>
          <span className={`h-2 w-2 rounded-full ${p.accepting_referrals ? "bg-success" : "bg-muted-foreground"}`} />
          {p.accepting_referrals ? "Accepting new referrals" : "Limited availability"}
        </span>
        <Button asChild size="sm" variant="outline">
          <Link to="/pharmacists/$slug" params={{ slug: p.slug }}>View profile</Link>
        </Button>
      </div>
    </article>
  );
}
