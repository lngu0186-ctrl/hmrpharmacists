import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, Stethoscope, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { NotificationBell } from "./NotificationBell";

const nav = [
  { to: "/find", label: "Find a pharmacist" },
  { to: "/about-hmr", label: "About HMRs" },
  { to: "/for-gps", label: "GPs & clinics" },
  { to: "/for-pharmacies", label: "Pharmacies" },
  { to: "/for-pharmacists", label: "Pharmacists" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-trust text-trust-foreground shadow-soft">
            <Stethoscope className="h-5 w-5" />
          </span>
          <span className="text-base sm:text-lg">HMR Pharmacist Exchange</span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: "rounded-md px-3 py-2 text-sm text-foreground bg-muted" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <NotificationBell />
              <Button asChild size="sm" variant="outline"><Link to="/dashboard"><LayoutDashboard className="mr-1.5 h-4 w-4" />Dashboard</Link></Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
              <Button asChild size="sm"><Link to="/auth">Join as pharmacist</Link></Button>
            </>
          )}
        </div>
        <button className="lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 p-4">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} className="rounded-md px-3 py-2 text-sm hover:bg-muted" onClick={() => setOpen(false)}>
                {n.label}
              </Link>
            ))}
            <Link to="/auth" className="rounded-md px-3 py-2 text-sm hover:bg-muted">Sign in</Link>
            <Link to="/for-pharmacists" className="rounded-md bg-primary px-3 py-2 text-center text-sm text-primary-foreground">Join as pharmacist</Link>
          </div>
        </div>
      )}
    </header>
  );
}
