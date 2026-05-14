import { createFileRoute } from "@tanstack/react-router";
import { SegmentLayout, type SegmentSpec } from "@/components/site/SegmentLayout";

export const Route = createFileRoute("/for-pharmacists")({
  component: () => <SegmentLayout spec={spec} />,
  head: () => ({
    meta: [
      { title: "For credentialed pharmacists — HMR Pharmacist Exchange" },
      {
        name: "description",
        content:
          "Create a verified profile and receive appropriate HMR referrals from GPs, clinics and community pharmacies.",
      },
      { property: "og:url", content: "/for-pharmacists" },
    ],
    links: [{ rel: "canonical", href: "/for-pharmacists" }],
  }),
});

const spec: SegmentSpec = {
  eyebrow: "For credentialed pharmacists",
  title: "Get found by the right referrers.",
  intro:
    "Create a verified profile, control your service areas and availability, and receive privacy-safe enquiries from GPs, clinics, community pharmacies, and patients via their referrer.",
  bullets: [
    {
      title: "Verified professional presence",
      desc: "AHPRA-registered, AACP-credentialed badge after manual review by our team.",
    },
    {
      title: "Receive appropriate referrals",
      desc: "Indicate your specialties, languages, service model and capacity so enquiries match your scope.",
    },
    {
      title: "Service-area control",
      desc: "Set the suburbs, postcodes and radius you cover — including telehealth and home visits.",
    },
    {
      title: "Profile control",
      desc: "Toggle 'accepting referrals' off when you're at capacity. Update your bio at any time.",
    },
  ],
  faqs: [
    {
      q: "How does verification work?",
      a: "Our team reviews your AHPRA registration and credentialing details before publishing your profile. Verification status appears on your dashboard.",
    },
    {
      q: "Are there reviews or star ratings?",
      a: "No. We deliberately don't run public ratings or testimonials — they aren't appropriate for clinical practice.",
    },
    {
      q: "What does it cost?",
      a: "Profile creation is free during the pilot. We will be transparent about any future pricing changes.",
    },
  ],
  primaryCta: { label: "Create your account", to: "/auth" },
  secondaryCta: { label: "Browse the directory", to: "/find" },
};
