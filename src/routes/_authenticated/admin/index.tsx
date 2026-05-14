import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Users,
  ShieldCheck,
  Inbox,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { sendVerificationEmail } from "@/lib/email.functions";
import { setPharmacistStatus, togglePharmacistPublish } from "@/lib/admin.functions";
import { listUsers, setUserRole, deleteUser } from "@/lib/admin-users.functions";
import { Input } from "@/components/ui/input";
import { Trash2, ShieldPlus, ShieldMinus } from "lucide-react";
import { AdminCharts } from "./AdminCharts";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminPage,
  head: () => ({
    meta: [{ title: "Admin — HMR Pharmacist Exchange" }, { name: "robots", content: "noindex" }],
  }),
});

function AdminPage() {
  const qc = useQueryClient();
  const sendVerification = useServerFn(sendVerificationEmail);
  const setStatusFn = useServerFn(setPharmacistStatus);
  const togglePublishFn = useServerFn(togglePharmacistPublish);
  const listUsersFn = useServerFn(listUsers);
  const setUserRoleFn = useServerFn(setUserRole);
  const deleteUserFn = useServerFn(deleteUser);
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);

  const { data: usersData } = useQuery({
    queryKey: ["admin-users", userSearch, userPage],
    queryFn: () => listUsersFn({ data: { search: userSearch, page: userPage, perPage: 50 } }),
    placeholderData: (prev) => prev,
  });
  const users = usersData?.users ?? [];

  const toggleRole = async (userId: string, hasAdmin: boolean) => {
    try {
      await setUserRoleFn({ data: { user_id: userId, role: "admin", grant: !hasAdmin } });
      toast.success(hasAdmin ? "Admin revoked" : "Admin granted");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const removeUser = async (userId: string, email: string | null) => {
    if (!confirm(`Delete user ${email ?? userId}? This cannot be undone.`)) return;
    try {
      await deleteUserFn({ data: { user_id: userId } });
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const { data: pharmacists = [] } = useQuery({
    queryKey: ["admin-pharmacists"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pharmacists")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: enquiries = [] } = useQuery({
    queryKey: ["admin-enquiries"],
    queryFn: async () => {
      const { data } = await supabase
        .from("enquiries")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const PAGE_SIZE = 25;
  const [emailPage, setEmailPage] = useState(0);
  const [emailStatusFilter, setEmailStatusFilter] = useState<"all" | "sent" | "failed">("all");

  const { data: emailLogPage } = useQuery({
    queryKey: ["admin-email-log", emailPage, emailStatusFilter],
    queryFn: async () => {
      let q = supabase
        .from("email_send_log")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(emailPage * PAGE_SIZE, emailPage * PAGE_SIZE + PAGE_SIZE - 1);
      if (emailStatusFilter !== "all") q = q.eq("status", emailStatusFilter);
      const { data, count } = await q;
      return { rows: data ?? [], count: count ?? 0 };
    },
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });
  const emailLog = emailLogPage?.rows ?? [];
  const emailLogTotal = emailLogPage?.count ?? 0;
  const emailLogPages = Math.max(1, Math.ceil(emailLogTotal / PAGE_SIZE));

  const stats = useMemo(() => {
    const total = pharmacists.length;
    const verified = pharmacists.filter((p: any) => p.verification_status === "verified").length;
    const pending = pharmacists.filter((p: any) => p.verification_status === "pending").length;
    const states = pharmacists.reduce((acc: Record<string, number>, p: any) => {
      const s = p.state ?? "—";
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, {});
    const stateData = Object.entries(states).map(([state, count]) => ({ state, count }));
    const statusData = [
      { name: "Verified", value: verified },
      { name: "Pending", value: pending },
      {
        name: "Rejected",
        value: pharmacists.filter((p: any) => p.verification_status === "rejected").length,
      },
    ];
    return { total, verified, pending, stateData, statusData, enquiriesTotal: enquiries.length };
  }, [pharmacists, enquiries]);

  const setStatus = async (
    id: string,
    status: "verified" | "rejected" | "pending",
    publish?: boolean,
  ) => {
    try {
      await setStatusFn({ data: { pharmacist_id: id, status, publish } });
      toast.success("Updated");
      sendVerification({ data: { pharmacist_id: id, status } })
        .then((r) => {
          if (r?.ok) toast.success("Notification email sent");
        })
        .catch((e) => console.error("verification email failed", e));
      qc.invalidateQueries({ queryKey: ["admin-pharmacists"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const togglePublish = async (id: string, current: boolean) => {
    try {
      await togglePublishFn({ data: { pharmacist_id: id, is_published: !current } });
      qc.invalidateQueries({ queryKey: ["admin-pharmacists"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin console</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verify pharmacists, monitor activity, and govern the directory.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <KPI
          label="Pharmacists"
          value={stats.total}
          icon={<Users className="h-4 w-4 text-primary" />}
        />
        <KPI
          label="Verified"
          value={stats.verified}
          icon={<ShieldCheck className="h-4 w-4 text-success" />}
        />
        <KPI
          label="Pending review"
          value={stats.pending}
          icon={<ShieldCheck className="h-4 w-4 text-amber-500" />}
        />
        <KPI
          label="Enquiries"
          value={stats.enquiriesTotal}
          icon={<Inbox className="h-4 w-4 text-primary" />}
        />
      </div>

      <AdminCharts statusData={stats.statusData} stateData={stats.stateData} />

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">Verification queue ({stats.pending})</TabsTrigger>
          <TabsTrigger value="all">All pharmacists ({stats.total})</TabsTrigger>
          <TabsTrigger value="enquiries">Enquiries ({stats.enquiriesTotal})</TabsTrigger>
          <TabsTrigger value="emails">Email log ({emailLogTotal})</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <Card className="divide-y divide-border">
            {pharmacists.filter((p: any) => p.verification_status === "pending").length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No pending submissions.
              </p>
            )}
            {pharmacists
              .filter((p: any) => p.verification_status === "pending")
              .map((p: any) => (
                <PharmacistRow
                  key={p.id}
                  p={p}
                  onApprove={() => setStatus(p.id, "verified", true)}
                  onReject={() => setStatus(p.id, "rejected", false)}
                  onTogglePublish={() => togglePublish(p.id, p.is_published)}
                />
              ))}
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card className="divide-y divide-border">
            {pharmacists.map((p: any) => (
              <PharmacistRow
                key={p.id}
                p={p}
                onApprove={() => setStatus(p.id, "verified", true)}
                onReject={() => setStatus(p.id, "rejected", false)}
                onTogglePublish={() => togglePublish(p.id, p.is_published)}
              />
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="enquiries">
          <Card className="divide-y divide-border">
            {enquiries.length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">No enquiries yet.</p>
            )}
            {enquiries.map((e: any) => (
              <div key={e.id} className="grid gap-1 p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{e.sender_name}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {e.sender_type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    → pharmacist {e.pharmacist_id.slice(0, 8)}
                  </span>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {new Date(e.created_at).toLocaleString("en-AU")}
                  </span>
                </div>
                <p className="line-clamp-2 text-muted-foreground">{e.message}</p>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="emails">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {(["all", "sent", "failed"] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={emailStatusFilter === s ? "default" : "outline"}
                  onClick={() => {
                    setEmailStatusFilter(s);
                    setEmailPage(0);
                  }}
                  className="capitalize h-7 px-3 text-xs"
                >
                  {s}
                </Button>
              ))}
            </div>
            <span className="ml-auto text-xs text-muted-foreground">
              {emailLogTotal === 0
                ? "0 results"
                : `${emailPage * PAGE_SIZE + 1}–${Math.min((emailPage + 1) * PAGE_SIZE, emailLogTotal)} of ${emailLogTotal}`}
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={emailPage === 0}
                onClick={() => setEmailPage((p) => Math.max(0, p - 1))}
                className="h-7 px-3 text-xs"
              >
                Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={emailPage >= emailLogPages - 1}
                onClick={() => setEmailPage((p) => p + 1)}
                className="h-7 px-3 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
          <Card className="divide-y divide-border">
            {emailLog.length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">No emails to show.</p>
            )}
            {emailLog.map((row: any) => (
              <div key={row.id} className="grid gap-1 p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] capitalize ${row.status === "sent" ? "border-success/40 text-success" : "border-destructive/40 text-destructive"}`}
                  >
                    {row.status}
                  </Badge>
                  <span className="font-medium">{row.template_name}</span>
                  <span className="text-xs text-muted-foreground">→ {row.recipient_email}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {new Date(row.created_at).toLocaleString("en-AU")}
                  </span>
                </div>
                {row.subject && <p className="text-xs text-muted-foreground">{row.subject}</p>}
                {row.error_message && (
                  <p className="text-xs text-destructive font-mono break-all">
                    {row.error_message}
                  </p>
                )}
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPI({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </Card>
  );
}

function PharmacistRow({
  p,
  onApprove,
  onReject,
  onTogglePublish,
}: {
  p: any;
  onApprove: () => void;
  onReject: () => void;
  onTogglePublish: () => void;
}) {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{p.full_name}</span>
          <StatusBadge status={p.verification_status} />
          {p.is_published ? (
            <Badge variant="secondary" className="text-[10px]">
              Published
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">
              Hidden
            </Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {p.suburb && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {p.suburb}, {p.state} {p.postcode}
            </span>
          )}
          <span>AHPRA: {p.ahpra_number ?? "—"}</span>
          <span>Submitted {new Date(p.created_at).toLocaleDateString("en-AU")}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onTogglePublish}>
          {p.is_published ? (
            <>
              <EyeOff className="mr-1 h-3.5 w-3.5" />
              Hide
            </>
          ) : (
            <>
              <Eye className="mr-1 h-3.5 w-3.5" />
              Publish
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onReject}
          className="text-destructive hover:text-destructive"
        >
          <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
        </Button>
        <Button size="sm" onClick={onApprove}>
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve
        </Button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    verified: "bg-success/10 text-success",
    pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    rejected: "bg-destructive/10 text-destructive",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${map[status] ?? "bg-muted"}`}
    >
      {status}
    </span>
  );
}
