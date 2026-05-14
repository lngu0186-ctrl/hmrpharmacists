import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import logo from "@/assets/logo.jpg";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-soft">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link
              to="/"
              className="inline-flex items-center"
              aria-label="HMR Pharmacists Exchange — home"
            >
              <img src={logo} alt="HMR Pharmacists Exchange" className="h-14 w-auto" />
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              The trusted referral and discovery platform for credentialed pharmacists providing
              Home Medicines Reviews in Australia.
            </p>
          </div>
          <FooterCol
            title="Discover"
            links={[
              { to: "/find", label: "Find a pharmacist" },
              { to: "/about-hmr", label: "About HMRs" },
              { to: "/for-patients", label: "For patients & carers" },
            ]}
          />
          <FooterCol
            title="For professionals"
            links={[
              { to: "/for-gps", label: "GPs & clinics" },
              { to: "/for-pharmacies", label: "Community pharmacies" },
              { to: "/for-pharmacists", label: "Credentialed pharmacists" },
            ]}
          />
          <FooterCol
            title="Platform"
            links={[
              { to: "/contact", label: "Contact" },
              { to: "/privacy", label: "Privacy policy" },
              { to: "/terms", label: "Terms of use" },
            ]}
          />
        </div>

        <div className="mt-10 rounded-xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-trust" />
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                <strong className="text-foreground">General information only.</strong> This platform
                provides discovery and privacy-safe enquiry support — it is not medical advice and
                not emergency care.
              </p>
              <p>
                HMR eligibility is determined by healthcare professionals and program rules. Listing
                on this platform does not guarantee referral acceptance. HMR Pharmacist Exchange is
                not a government service.
              </p>
              <p>
                If you need emergency help, call <strong>000</strong>. For 24/7 health advice in
                Australia, call <strong>healthdirect 1800 022 222</strong>.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          © {new Date().getFullYear()} HMR Pharmacist Exchange. Australian spelling. Made for
          Australian healthcare.
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
