import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Mail,
  MapPin,
  Sparkles,
  Inbox,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard — HMR Pharmacist Exchange" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function DashboardPage() {
  const { user } = useAuth();

  const { data: pharmacist, isLoading } = useQuery({
    queryKey: ["my-pharmacist", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("pharmacists")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: enquiries = [] } = useQuery({
    queryKey: ["my-enquiries", pharmacist?.id],
    enabled: !!pharmacist?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("enquiries")
        .select("*")
        .eq("pharmacist_id", pharmacist!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!pharmacist) {
    return (
      <Card className="p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You haven't created your pharmacist profile yet. Complete the onboarding wizard to get
          listed in the directory.
        </p>
        <Button asChild className="mt-6">
          <Link to="/onboarding">Start onboarding</Link>
        </Button>
      </Card>
    );
  }

  const newCount = enquiries.filter((e: any) => e.status === "new").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {pharmacist.full_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your profile and incoming referral enquiries.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/pharmacists/$slug" params={{ slug: pharmacist.slug }}>
              View public profile <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/onboarding">Edit profile</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Verification"
          value={pharmacist.verification_status}
          icon={ShieldIcon(pharmacist.verification_status)}
        />
        <StatCard
          label="Listed"
          value={pharmacist.is_published ? "Public" : "Hidden"}
          icon={
            pharmacist.is_published ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            )
          }
        />
        <StatCard
          label="New enquiries"
          value={String(newCount)}
          icon={<Inbox className="h-4 w-4 text-primary" />}
        />
      </div>

      {pharmacist.verification_status !== "verified" && (
        <Card className="border-amber-500/30 bg-amber-50/50 p-5 dark:bg-amber-950/20">
          <div className="flex gap-3">
            <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div className="text-sm">
              <p className="font-medium">Your profile is awaiting admin verification.</p>
              <p className="mt-1 text-muted-foreground">
                Once verified, your profile will appear in public search results. We typically
                review submissions within 2 business days.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Referral enquiries</h2>
          <Badge variant="secondary">{enquiries.length} total</Badge>
        </div>
        {enquiries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No enquiries yet. Once GPs and pharmacies discover your profile, their messages will
            appear here.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {enquiries.map((e: any) => (
              <div key={e.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{e.sender_name}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {e.sender_type}
                    </Badge>
                    {e.organisation && (
                      <span className="text-xs text-muted-foreground">· {e.organisation}</span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{e.message}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {e.sender_email}
                    </span>
                    {e.patient_suburb && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {e.patient_suburb} {e.patient_postcode}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(e.created_at).toLocaleDateString("en-AU")}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <StatusPill status={e.status} />
                  <Button asChild size="sm" variant="outline">
                    <a href={`mailto:${e.sender_email}?subject=Re: HMR enquiry`}>Reply</a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-semibold capitalize">{value}</div>
    </Card>
  );
}

function ShieldIcon(status: string) {
  if (status === "verified") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (status === "rejected") return <AlertCircle className="h-4 w-4 text-destructive" />;
  return <Clock className="h-4 w-4 text-amber-500" />;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: "bg-primary/10 text-primary",
    in_progress: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    completed: "bg-success/10 text-success",
    declined: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-medium capitalize ${map[status] ?? "bg-muted"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
