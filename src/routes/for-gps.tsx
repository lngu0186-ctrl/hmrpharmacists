import { createFileRoute } from "@tanstack/react-router";
import { SegmentLayout, type SegmentSpec } from "@/components/site/SegmentLayout";

export const Route = createFileRoute("/for-gps")({
  component: () => <SegmentLayout spec={spec} />,
  head: () => ({
    meta: [
      { title: "For GPs & clinics — HMR Pharmacist Exchange" },
      { name: "description", content: "Find credentialed pharmacists for HMR referrals quickly. Filter by suburb, specialty and availability. Privacy-safe enquiry workflow." },
      { property: "og:url", content: "/for-gps" },
    ],
    links: [{ rel: "canonical", href: "/for-gps" }],
  }),
});

const spec: SegmentSpec = {
  eyebrow: "For GPs & clinics",
  title: "Find a credentialed pharmacist for an HMR — in under a minute.",
  intro: "Search verified credentialed pharmacists by suburb, specialty and availability. Send a privacy-safe enquiry through the platform — no inboxes, no chasing.",
  bullets: [
    { title: "Fast pharmacist discovery", desc: "Search by suburb, postcode, specialty (aged care, mental health, anticoagulation and more), telehealth, languages and turnaround estimate." },
    { title: "See real availability", desc: "Pharmacists indicate whether they're accepting new referrals, so you don't waste time chasing." },
    { title: "Privacy-safe workflow", desc: "Enquiries route through the platform with audit trails. No exposed personal email addresses." },
    { title: "Reduced admin burden", desc: "One central exchange instead of dozens of phone calls and word-of-mouth lists." },
  ],
  faqs: [
    { q: "Does this replace my usual referral process?", a: "No. We help you find the right credentialed pharmacist. The HMR referral itself remains a clinical decision and follows current program rules." },
    { q: "Can I see who has capacity?", a: "Yes — pharmacists set an 'accepting referrals' flag on their profile, so you can filter to those with current capacity." },
    { q: "Is there a cost?", a: "Use of the discovery and enquiry platform is free for GPs and clinics." },
  ],
  primaryCta: { label: "Search the directory", to: "/find" },
  secondaryCta: { label: "Contact us", to: "/contact" },
};
