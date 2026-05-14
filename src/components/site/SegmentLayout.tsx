import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";

export interface SegmentSpec {
  eyebrow: string;
  title: string;
  intro: string;
  bullets: { title: string; desc: string }[];
  faqs: { q: string; a: string }[];
  primaryCta: { label: string; to: string };
  secondaryCta?: { label: string; to: string };
  notice?: string;
}

export function SegmentLayout({ spec, children }: { spec: SegmentSpec; children?: ReactNode }) {
  return (
    <SiteShell>
      <section className="bg-hero">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-trust" /> {spec.eyebrow}
          </span>
          <h1 className="mt-5 text-balance text-4xl font-semibold leading-tight sm:text-5xl">
            {spec.title}
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-muted-foreground">{spec.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to={spec.primaryCta.to}>
                {spec.primaryCta.label}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {spec.secondaryCta && (
              <Button asChild size="lg" variant="outline">
                <Link to={spec.secondaryCta.to}>{spec.secondaryCta.label}</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {spec.bullets.map((b) => (
            <div key={b.title} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h3 className="text-base font-semibold">{b.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {children}

      {spec.notice && (
        <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-muted/40 p-5 text-sm text-muted-foreground">
            {spec.notice}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold sm:text-3xl">FAQs</h2>
        <div className="mt-6 space-y-3">
          {spec.faqs.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-border bg-card p-5 shadow-soft"
            >
              <summary className="cursor-pointer text-base font-medium">{f.q}</summary>
              <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
