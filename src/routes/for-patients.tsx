import { createFileRoute } from "@tanstack/react-router";
import { SegmentLayout, type SegmentSpec } from "@/components/site/SegmentLayout";

export const Route = createFileRoute("/for-patients")({
  component: () => <SegmentLayout spec={spec} />,
  head: () => ({
    meta: [
      { title: "For patients & carers — HMR Pharmacist Exchange" },
      {
        name: "description",
        content:
          "Plain-English information about Home Medicines Reviews for patients and carers in Australia.",
      },
      { property: "og:url", content: "/for-patients" },
    ],
    links: [{ rel: "canonical", href: "/for-patients" }],
  }),
});

const spec: SegmentSpec = {
  eyebrow: "For patients & carers",
  title: "Understand Home Medicines Reviews — in plain English.",
  intro:
    "If you take several medicines, or your medicines have changed recently, a Home Medicines Review (HMR) might help. A credentialed pharmacist comes to your home, talks through your medicines with you, and writes a report for your GP.",
  bullets: [
    {
      title: "When an HMR can help",
      desc: "If you take multiple medicines, have had recent changes, are unsure about side effects, or feel confused about your medicines.",
    },
    {
      title: "How it starts",
      desc: "Speak with your GP. They decide if an HMR is appropriate and arrange the referral.",
    },
    {
      title: "What we don't do",
      desc: "We don't provide medical advice, eligibility decisions, or emergency care. We help you discover credentialed pharmacists.",
    },
    {
      title: "Privacy first",
      desc: "Our enquiry form is deliberately limited — please don't share clinical detail with us.",
    },
  ],
  faqs: [
    {
      q: "Can I book an HMR directly?",
      a: "No — an HMR needs a referral from your GP or eligible specialist. You can use this platform to learn more and to mention a pharmacist to your GP.",
    },
    {
      q: "Does the HMR cost me anything?",
      a: "Eligibility and funding rules are set by the program. Speak with your GP — they can explain how it works for your situation.",
    },
    {
      q: "What happens to the report?",
      a: "The credentialed pharmacist sends a report to your referrer (and other clinicians you nominate), and may upload it to your My Health Record if you have one.",
    },
  ],
  primaryCta: { label: "Find a credentialed pharmacist", to: "/find" },
  secondaryCta: { label: "Read about HMRs", to: "/about-hmr" },
  notice:
    "If you need urgent help, call 000. For 24/7 health advice in Australia, call healthdirect on 1800 022 222.",
};
