import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import {
  Mail,
  MapPin,
  Sparkles,
  Inbox,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
  Phone,
  Building2,
  History,
  Hash,
  X as XIcon,
  Check,
  Reply,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { updateEnquiryStatus } from "@/lib/enquiry.functions";

type EnquiryStatus =
  | "new"
  | "acknowledged"
  | "accepted"
  | "responded"
  | "declined"
  | "closed";

interface Enquiry {
  id: string;
  reference_code: string | null;
  status: EnquiryStatus;
  sender_type: string;
  sender_name: string;
  sender_email: string;
  sender_phone: string | null;
  organisation: string | null;
  patient_suburb: string | null;
  patient_postcode: string | null;
  message: string;
  decline_reason: string | null;
  created_at: string;
  status_updated_at: string | null;
}

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
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"open" | "all" | "closed">("open");
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [declining, setDeclining] = useState<Enquiry | null>(null);

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
        .select(
          "id, reference_code, status, sender_type, sender_name, sender_email, sender_phone, organisation, patient_suburb, patient_postcode, message, decline_reason, created_at, status_updated_at",
        )
        .eq("pharmacist_id", pharmacist!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as Enquiry[];
    },
  });

  const counts = useMemo(() => {
    const c = { open: 0, closed: 0, all: enquiries.length };
    for (const e of enquiries) {
      if (["closed", "declined"].includes(e.status)) c.closed++;
      else c.open++;
    }
    return c;
  }, [enquiries]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return enquiries;
    if (activeTab === "closed")
      return enquiries.filter((e) => ["closed", "declined"].includes(e.status));
    return enquiries.filter((e) => !["closed", "declined"].includes(e.status));
  }, [enquiries, activeTab]);

  const update = useServerFn(updateEnquiryStatus);
  const mutation = useMutation({
    mutationFn: (vars: { id: string; status: EnquiryStatus; decline_reason?: string }) =>
      update({
        data: {
          enquiry_id: vars.id,
          status: vars.status,
          decline_reason: vars.decline_reason,
        },
      }),
    onSuccess: (_d, vars) => {
      toast.success(`Enquiry ${vars.status}.`);
      qc.invalidateQueries({ queryKey: ["my-enquiries", pharmacist?.id] });
      qc.invalidateQueries({ queryKey: ["enquiry-audit"] });
      setDeclining(null);
      // Refresh selected if still open
      if (selected?.id === vars.id) {
        setSelected((s) => (s ? { ...s, status: vars.status } : s));
      }
    },
    onError: (e: Error) => toast.error(e.message),
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

  const newCount = enquiries.filter((e) => e.status === "new").length;

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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Referral enquiries</h2>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            className="w-auto"
          >
            <TabsList>
              <TabsTrigger value="open">Open ({counts.open})</TabsTrigger>
              <TabsTrigger value="closed">Closed ({counts.closed})</TabsTrigger>
              <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {activeTab === "open"
              ? "No open enquiries. New referrals will appear here."
              : "Nothing here yet."}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((e) => (
              <div key={e.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto]">
                <button
                  type="button"
                  onClick={() => setSelected(e)}
                  className="text-left transition-colors hover:opacity-90"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{e.sender_name}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {e.sender_type}
                    </Badge>
                    {e.organisation && (
                      <span className="text-xs text-muted-foreground">· {e.organisation}</span>
                    )}
                    {e.reference_code && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                        <Hash className="h-2.5 w-2.5" />
                        {e.reference_code}
                      </span>
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
                </button>
                <div className="flex flex-col items-end gap-2">
                  <StatusPill status={e.status} />
                  <ActionButtons
                    enquiry={e}
                    busy={mutation.isPending}
                    onAccept={() => mutation.mutate({ id: e.id, status: "accepted" })}
                    onResponded={() => mutation.mutate({ id: e.id, status: "responded" })}
                    onClose={() => mutation.mutate({ id: e.id, status: "closed" })}
                    onDecline={() => setDeclining(e)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <EnquiryDetailSheet
        enquiry={selected}
        onClose={() => setSelected(null)}
        onAccept={() =>
          selected && mutation.mutate({ id: selected.id, status: "accepted" })
        }
        onResponded={() =>
          selected && mutation.mutate({ id: selected.id, status: "responded" })
        }
        onClosed={() =>
          selected && mutation.mutate({ id: selected.id, status: "closed" })
        }
        onDecline={() => selected && setDeclining(selected)}
        busy={mutation.isPending}
      />

      <DeclineDialog
        enquiry={declining}
        onClose={() => setDeclining(null)}
        onConfirm={(reason) =>
          declining &&
          mutation.mutate({ id: declining.id, status: "declined", decline_reason: reason })
        }
        busy={mutation.isPending}
      />
    </div>
  );
}

function ActionButtons({
  enquiry,
  busy,
  onAccept,
  onResponded,
  onClose,
  onDecline,
}: {
  enquiry: Enquiry;
  busy: boolean;
  onAccept: () => void;
  onResponded: () => void;
  onClose: () => void;
  onDecline: () => void;
}) {
  const s = enquiry.status;
  if (s === "closed" || s === "declined") {
    return (
      <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
        <a href={`mailto:${enquiry.sender_email}?subject=Re: HMR enquiry ${enquiry.reference_code ?? ""}`}>
          <Reply className="mr-1 h-3 w-3" /> Email
        </a>
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {(s === "new" || s === "acknowledged") && (
        <>
          <Button size="sm" disabled={busy} onClick={onAccept} className="h-7 px-2.5 text-xs">
            <Check className="mr-1 h-3 w-3" /> Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={onDecline}
            className="h-7 px-2.5 text-xs"
          >
            <XIcon className="mr-1 h-3 w-3" /> Decline
          </Button>
        </>
      )}
      {s === "accepted" && (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={onResponded}
          className="h-7 px-2.5 text-xs"
        >
          <Reply className="mr-1 h-3 w-3" /> Mark replied
        </Button>
      )}
      {(s === "accepted" || s === "responded") && (
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={onClose}
          className="h-7 px-2 text-xs"
        >
          <Archive className="mr-1 h-3 w-3" /> Close
        </Button>
      )}
    </div>
  );
}

function EnquiryDetailSheet({
  enquiry,
  onClose,
  onAccept,
  onResponded,
  onClosed,
  onDecline,
  busy,
}: {
  enquiry: Enquiry | null;
  onClose: () => void;
  onAccept: () => void;
  onResponded: () => void;
  onClosed: () => void;
  onDecline: () => void;
  busy: boolean;
}) {
  const { data: events = [] } = useQuery({
    queryKey: ["enquiry-audit", enquiry?.id],
    enabled: !!enquiry?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("enquiry_audit_events")
        .select("*")
        .eq("enquiry_id", enquiry!.id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  return (
    <Sheet open={!!enquiry} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {enquiry && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                Enquiry from {enquiry.sender_name}
              </SheetTitle>
              <SheetDescription>
                {enquiry.reference_code && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                    <Hash className="h-3 w-3" />
                    {enquiry.reference_code}
                  </span>
                )}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-5">
              <div className="flex items-center justify-between">
                <StatusPill status={enquiry.status} />
                <span className="text-xs text-muted-foreground">
                  Received {new Date(enquiry.created_at).toLocaleString("en-AU")}
                </span>
              </div>

              <div className="grid gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <DetailRow icon={<Mail className="h-3.5 w-3.5" />} label="Email">
                  <a className="text-primary hover:underline" href={`mailto:${enquiry.sender_email}`}>
                    {enquiry.sender_email}
                  </a>
                </DetailRow>
                {enquiry.sender_phone && (
                  <DetailRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone">
                    {enquiry.sender_phone}
                  </DetailRow>
                )}
                {enquiry.organisation && (
                  <DetailRow icon={<Building2 className="h-3.5 w-3.5" />} label="Organisation">
                    {enquiry.organisation}
                  </DetailRow>
                )}
                {enquiry.patient_suburb && (
                  <DetailRow icon={<MapPin className="h-3.5 w-3.5" />} label="Patient">
                    {enquiry.patient_suburb} {enquiry.patient_postcode}
                  </DetailRow>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Message
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {enquiry.message}
                </p>
              </div>

              {enquiry.decline_reason && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-destructive">
                    Decline reason
                  </p>
                  <p className="mt-1">{enquiry.decline_reason}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button asChild variant="outline" size="sm">
                  <a
                    href={`mailto:${enquiry.sender_email}?subject=Re: HMR enquiry ${enquiry.reference_code ?? ""}`}
                  >
                    <Reply className="mr-1.5 h-3.5 w-3.5" /> Reply by email
                  </a>
                </Button>
                <ActionButtons
                  enquiry={enquiry}
                  busy={busy}
                  onAccept={onAccept}
                  onResponded={onResponded}
                  onClose={onClosed}
                  onDecline={onDecline}
                />
              </div>

              <div>
                <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <History className="h-3 w-3" /> Activity
                </p>
                <ol className="space-y-3 border-l border-border pl-4">
                  {events.map((ev) => (
                    <li key={ev.id} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                      <p className="text-sm font-medium capitalize">
                        {formatEvent(ev.event_type, ev.metadata)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(ev.created_at).toLocaleString("en-AU")}
                      </p>
                    </li>
                  ))}
                  {events.length === 0 && (
                    <li className="text-xs text-muted-foreground">No activity yet.</li>
                  )}
                </ol>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function formatEvent(type: string, meta: unknown): string {
  const m = (meta ?? {}) as { from?: string; to?: string; status?: string };
  if (type === "created") return `Enquiry submitted${m.status ? ` (${m.status})` : ""}`;
  if (type === "status_changed") return `Status changed: ${m.from ?? "?"} → ${m.to ?? "?"}`;
  return type;
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[88px_1fr] items-start gap-2 text-sm">
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon} {label}
      </span>
      <span>{children}</span>
    </div>
  );
}

function DeclineDialog({
  enquiry,
  onClose,
  onConfirm,
  busy,
}: {
  enquiry: Enquiry | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  busy: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <Dialog
      open={!!enquiry}
      onOpenChange={(o) => {
        if (!o) {
          setReason("");
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decline this enquiry?</DialogTitle>
          <DialogDescription>
            We'll let {enquiry?.sender_name.split(" ")[0]} know you can't take this referral and
            include your short reason. They can then find another credentialed pharmacist.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="decline-reason" className="text-xs">
            Reason (required, kept brief)
          </Label>
          <Textarea
            id="decline-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Outside my service area / fully booked for the next 3 weeks."
            maxLength={500}
            className="min-h-24"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy || reason.trim().length < 5}
            onClick={() => onConfirm(reason.trim())}
          >
            Decline enquiry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    acknowledged: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    accepted: "bg-success/10 text-success",
    responded: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    declined: "bg-destructive/10 text-destructive",
    closed: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-medium capitalize ${map[status] ?? "bg-muted"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
