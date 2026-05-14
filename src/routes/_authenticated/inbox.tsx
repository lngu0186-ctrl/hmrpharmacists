import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Inbox as InboxIcon, Clock, ChevronRight, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/inbox")({
  component: InboxPage,
  head: () => ({
    meta: [
      { title: "My referral inbox — HMR Pharmacist Exchange" },
      {
        name: "description",
        content:
          "Track the status of referral enquiries you've sent to credentialed pharmacists.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

type EnquiryRow = {
  id: string;
  reference_code: string | null;
  status: "new" | "in_progress" | "responded" | "closed" | "accepted" | "declined";
  decline_reason: string | null;
  message: string;
  organisation: string | null;
  patient_suburb: string | null;
  created_at: string;
  status_updated_at: string | null;
  pharmacist_id: string;
  pharmacists: { full_name: string; slug: string } | null;
};

const STATUS_LABEL: Record<EnquiryRow["status"], string> = {
  new: "Sent",
  in_progress: "In progress",
  responded: "Responded",
  accepted: "Accepted",
  declined: "Declined",
  closed: "Closed",
};

const STATUS_VARIANT: Record<EnquiryRow["status"], "default" | "secondary" | "outline" | "destructive"> = {
  new: "secondary",
  in_progress: "default",
  responded: "default",
  accepted: "default",
  declined: "destructive",
  closed: "outline",
};

const OPEN_STATUSES: EnquiryRow["status"][] = ["new", "in_progress", "responded", "accepted"];
const CLOSED_STATUSES: EnquiryRow["status"][] = ["declined", "closed"];

function useMyEnquiries() {
  return useQuery({
    queryKey: ["my-enquiries"],
    queryFn: async (): Promise<EnquiryRow[]> => {
      const { data, error } = await supabase
        .from("enquiries")
        .select(
          "id, reference_code, status, decline_reason, message, organisation, patient_suburb, created_at, status_updated_at, pharmacist_id, pharmacists(full_name, slug)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EnquiryRow[];
    },
  });
}

function useEnquiryTimeline(enquiryId: string | null) {
  return useQuery({
    enabled: !!enquiryId,
    queryKey: ["enquiry-timeline", enquiryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enquiry_audit_events")
        .select("id, event_type, metadata, created_at")
        .eq("enquiry_id", enquiryId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function InboxPage() {
  const { data: enquiries, isLoading } = useMyEnquiries();
  const [selected, setSelected] = useState<EnquiryRow | null>(null);
  const [tab, setTab] = useState("open");

  const open = (enquiries ?? []).filter((e) => OPEN_STATUSES.includes(e.status));
  const closed = (enquiries ?? []).filter((e) => CLOSED_STATUSES.includes(e.status));
  const list = tab === "open" ? open : tab === "closed" ? closed : enquiries ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <InboxIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">My referral inbox</h1>
          <p className="text-sm text-muted-foreground">
            Track enquiries you've sent to credentialed pharmacists.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({closed.length})</TabsTrigger>
          <TabsTrigger value="all">All ({enquiries?.length ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="space-y-2">
              {list.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(e)}
                    className="group flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium">
                          {e.pharmacists?.full_name ?? "Pharmacist"}
                        </span>
                        <Badge variant={STATUS_VARIANT[e.status]} className="capitalize">
                          {STATUS_LABEL[e.status]}
                        </Badge>
                        {e.reference_code && (
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {e.reference_code}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                        {e.message}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Sent {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                        {e.status_updated_at && (
                          <>
                            <span>·</span>
                            <span>
                              Updated{" "}
                              {formatDistanceToNow(new Date(e.status_updated_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <EnquirySheet
        enquiry={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
      <Mail className="mx-auto h-10 w-10 text-muted-foreground" />
      <h2 className="mt-3 text-base font-medium">No enquiries yet</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Enquiries you send from a pharmacist's profile while signed in will appear here.
      </p>
      <Button asChild className="mt-4" size="sm">
        <a href="/find">Find a pharmacist</a>
      </Button>
    </div>
  );
}

function EnquirySheet({
  enquiry,
  onOpenChange,
}: {
  enquiry: EnquiryRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: events, isLoading } = useEnquiryTimeline(enquiry?.id ?? null);
  return (
    <Sheet open={!!enquiry} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {enquiry && (
          <>
            <SheetHeader>
              <SheetTitle className="flex flex-wrap items-center gap-2">
                {enquiry.pharmacists?.full_name ?? "Pharmacist"}
                <Badge variant={STATUS_VARIANT[enquiry.status]}>
                  {STATUS_LABEL[enquiry.status]}
                </Badge>
              </SheetTitle>
              <SheetDescription>
                {enquiry.reference_code && (
                  <span className="font-mono text-xs">{enquiry.reference_code} · </span>
                )}
                Sent {formatDistanceToNow(new Date(enquiry.created_at), { addSuffix: true })}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Your message
                </h3>
                <p className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-sm">
                  {enquiry.message}
                </p>
                {(enquiry.organisation || enquiry.patient_suburb) && (
                  <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    {enquiry.organisation && (
                      <div>
                        <dt className="font-medium text-foreground">Organisation</dt>
                        <dd>{enquiry.organisation}</dd>
                      </div>
                    )}
                    {enquiry.patient_suburb && (
                      <div>
                        <dt className="font-medium text-foreground">Patient suburb</dt>
                        <dd>{enquiry.patient_suburb}</dd>
                      </div>
                    )}
                  </dl>
                )}
              </section>

              {enquiry.status === "declined" && enquiry.decline_reason && (
                <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-destructive">
                    Decline reason
                  </h3>
                  <p className="mt-1 text-sm">{enquiry.decline_reason}</p>
                </section>
              )}

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Activity
                </h3>
                {isLoading ? (
                  <div className="mt-3 h-24 animate-pulse rounded-lg bg-muted" />
                ) : (
                  <ol className="mt-3 space-y-3 border-l-2 border-border pl-4">
                    {(events ?? []).map((ev) => (
                      <li key={ev.id} className="relative">
                        <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                        <p className="text-sm font-medium">{describeEvent(ev)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true })}
                        </p>
                      </li>
                    ))}
                    {(events ?? []).length === 0 && (
                      <li className="text-sm text-muted-foreground">No activity recorded yet.</li>
                    )}
                  </ol>
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function describeEvent(ev: {
  event_type: string;
  metadata: { from?: string; to?: string; decline_reason?: string | null } | null;
}) {
  if (ev.event_type === "created") return "Enquiry submitted";
  if (ev.event_type === "status_changed") {
    const to = ev.metadata?.to ? STATUS_LABEL[ev.metadata.to as EnquiryRow["status"]] ?? ev.metadata.to : "updated";
    return `Status changed to ${to}`;
  }
  return ev.event_type;
}
