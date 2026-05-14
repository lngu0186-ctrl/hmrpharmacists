import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/about-hmr")({
  component: AboutHmr,
  head: () => ({
    meta: [
      { title: "About Home Medicines Reviews (HMRs) in Australia" },
      {
        name: "description",
        content:
          "What an HMR is, who can refer, and how a credentialed pharmacist conducts the medication review at home.",
      },
      { property: "og:url", content: "/about-hmr" },
    ],
    links: [{ rel: "canonical", href: "/about-hmr" }],
  }),
});

function AboutHmr() {
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-semibold sm:text-5xl">About Home Medicines Reviews</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A Home Medicines Review (HMR) is a service designed to help people living in the community
          get more out of their medicines and reduce the risk of medicine-related harm.
        </p>

        <Section title="What is an HMR?">
          A credentialed pharmacist meets with the person — usually at home — to talk through every
          medicine they take, including over-the-counter and complementary medicines. The pharmacist
          then writes a report and discusses findings with the referring clinician.
        </Section>

        <Section title="Who can refer?">
          Under current program rules, a GP, Specialist in Pain Medicine, Specialist Physician,
          Specialist Psychiatrist, or Specialist in Palliative Medicine may initiate an HMR
          referral. Eligibility is determined clinically.
        </Section>

        <Section title="What happens during an HMR?">
          The pharmacist gathers a complete medicine history, reviews how medicines are stored and
          taken, asks about side effects and concerns, and identifies any opportunities to improve
          safety or effectiveness. A written report goes back to the referrer.
        </Section>

        <Section title="What this platform does — and doesn't do">
          We help patients, GPs, clinics and pharmacies discover credentialed pharmacists and
          connect through privacy-safe enquiries. We do not determine eligibility, replace clinical
          decision-making, or provide medical advice.
        </Section>

        <div className="mt-10 rounded-2xl border border-border bg-muted/40 p-5 text-sm text-muted-foreground">
          For authoritative information about HMRs in Australia, refer to the Department of Health,
          Pharmacy Programs Administrator, and Healthdirect.
        </div>
      </article>
    </SiteShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-3 leading-relaxed text-foreground/90">{children}</p>
    </section>
  );
}
