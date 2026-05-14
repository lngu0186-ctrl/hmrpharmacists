import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/terms")({
  component: Terms,
  head: () => ({
    meta: [
      { title: "Terms of use — HMR Pharmacist Exchange" },
      { name: "description", content: "Terms of use for HMR Pharmacist Exchange." },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
});

function Terms() {
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-semibold">Terms of use</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated {new Date().toLocaleDateString("en-AU")}
        </p>

        <Section title="What this platform is">
          HMR Pharmacist Exchange is an Australian discovery and referral-support platform. We help
          patients, GPs, clinics, community pharmacies and credentialed pharmacists connect for the
          purpose of Home Medicines Reviews.
        </Section>
        <Section title="What this platform is not">
          We are not a medical service, an emergency service, a government service, or a booking
          platform. We don't provide medical advice. Final HMR eligibility is determined by
          referring clinicians and program rules.
        </Section>
        <Section title="Pharmacist listings">
          Pharmacist listings are reviewed manually before publication. Listing on the platform does
          not guarantee acceptance of any referral. Pharmacists are responsible for the accuracy of
          their own profile information.
        </Section>
        <Section title="Acceptable use">
          Don't misuse the platform — including, but not limited to: misrepresenting your identity,
          scraping listings, sending unsolicited marketing, or submitting sensitive clinical detail
          through the enquiry form.
        </Section>
        <Section title="Liability">
          The platform is provided on an "as is" basis. We make no warranties about clinical
          outcomes. Use of any pharmacist's services is governed by the engagement between the
          pharmacist and the patient or referrer.
        </Section>
        <Section title="Contact">
          For questions about these terms, please contact us via the contact page.
        </Section>
      </article>
    </SiteShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </section>
  );
}
