import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/privacy")({
  component: Privacy,
  head: () => ({
    meta: [
      { title: "Privacy policy — HMR Pharmacist Exchange" },
      {
        name: "description",
        content:
          "How HMR Pharmacist Exchange handles your information, in line with the Australian Privacy Principles.",
      },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
});

function Privacy() {
  return (
    <SiteShell>
      <article className="prose prose-slate mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-semibold">Privacy policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated {new Date().toLocaleDateString("en-AU")}
        </p>

        <p className="mt-6 text-muted-foreground">
          HMR Pharmacist Exchange respects your privacy. This summary explains how we collect, use
          and protect personal information. The full policy will be reviewed by an Australian
          privacy practitioner before launch.
        </p>

        <Block title="Information we collect">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Account and contact information you provide (e.g. name, email).</li>
            <li>
              Pharmacist professional information (e.g. AHPRA registration, credentialing details,
              service preferences).
            </li>
            <li>
              Enquiry details you submit through the platform — deliberately minimal, no clinical
              detail.
            </li>
          </ul>
        </Block>

        <Block title="How we use information">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>To run and improve the discovery and enquiry platform.</li>
            <li>To verify pharmacist credentials before publishing profiles.</li>
            <li>To maintain audit logs for safety and accountability.</li>
          </ul>
        </Block>

        <Block title="What we don't do">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>We don't sell personal information.</li>
            <li>We don't collect clinical medication or diagnosis details in the enquiry form.</li>
            <li>We don't run public reviews or ratings of clinicians.</li>
          </ul>
        </Block>

        <Block title="Your rights">
          You can request access to or correction of your personal information by contacting us.
          Pharmacists can edit their own profile data via their dashboard.
        </Block>

        <Block title="Disclaimer">
          The platform is general information only — it is not medical advice and not emergency
          care. HMR eligibility is determined by healthcare professionals and program rules.
        </Block>
      </article>
    </SiteShell>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-3 text-sm">{children}</div>
    </section>
  );
}
