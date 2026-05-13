import { createFileRoute } from "@tanstack/react-router";
import { SegmentLayout, type SegmentSpec } from "@/components/site/SegmentLayout";

export const Route = createFileRoute("/for-pharmacies")({
  component: () => <SegmentLayout spec={spec} />,
  head: () => ({
    meta: [
      { title: "For community pharmacies — HMR Pharmacist Exchange" },
      { name: "description", content: "Connect community pharmacies with consultant credentialed pharmacists for HMR coordination, especially in rural and underserviced areas." },
      { property: "og:url", content: "/for-pharmacies" },
    ],
    links: [{ rel: "canonical", href: "/for-pharmacies" }],
  }),
});

const spec: SegmentSpec = {
  eyebrow: "For community pharmacies",
  title: "Find a consultant pharmacist when your team needs one.",
  intro: "Whether you're filling a coverage gap, looking for someone with a specific clinical interest, or supporting a regional patient, we help you connect with credentialed pharmacists across Australia.",
  bullets: [
    { title: "Consultant pharmacist access", desc: "Reach credentialed pharmacists outside your immediate network — including rural and regional cover." },
    { title: "Coordinated referrals", desc: "Coordinate HMRs alongside the patient's usual community pharmacy workflow." },
    { title: "Coverage gaps", desc: "Search by suburb to find pharmacists servicing patient catchments your team can't easily cover." },
    { title: "Rural & regional support", desc: "Filter for pharmacists who travel for HMRs or offer telehealth-supported services." },
  ],
  faqs: [
    { q: "Are listed pharmacists independent of community pharmacies?", a: "Many credentialed pharmacists work independently or are affiliated with one or more community pharmacies. Their profile lists their preferences and affiliations." },
    { q: "How do referrals work?", a: "HMR referrals come from GPs or eligible specialists. We help you discover and contact credentialed pharmacists; the clinical pathway is unchanged." },
  ],
  primaryCta: { label: "Browse the directory", to: "/find" },
  secondaryCta: { label: "Contact us", to: "/contact" },
};
