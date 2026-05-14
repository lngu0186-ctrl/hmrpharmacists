import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Eye, EyeOff, Users, ShieldCheck, Inbox, MapPin } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, Legend } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { sendVerificationEmail } from "@/lib/email.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — HMR Pharmacist Exchange" }, { name: "robots", content: "noindex" }] }),
});

const COLORS = ["var(--primary)", "var(--accent)", "var(--destructive)", "var(--success)"];

function AdminPage() {
  const qc = useQueryClient();
  const sendVerification = useServerFn(sendVerificationEmail);

  const { data: pharmacists = [] } = useQuery({
    queryKey: ["admin-pharmacists"],
    queryFn: async () => {
      const { data } = await supabase.from("pharmacists").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: enquiries = [] } = useQuery({
    queryKey: ["admin-enquiries"],
    queryFn: async () => {
      const { data } = await supabase.from("enquiries").select("*").order("created_at", { ascending: false });
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
      const s = p.state ?? "—"; acc[s] = (acc[s] ?? 0) + 1; return acc;
    }, {});
    const stateData = Object.entries(states).map(([state, count]) => ({ state, count }));
    const statusData = [
      { name: "Verified", value: verified },
      { name: "Pending", value: pending },
      { name: "Rejected", value: pharmacists.filter((p: any) => p.verification_status === "rejected").length },
    ];
    return { total, verified, pending, stateData, statusData, enquiriesTotal: enquiries.length };
  }, [pharmacists, enquiries]);

  const setStatus = async (id: string, status: "verified" | "rejected" | "pending", publish?: boolean) => {
    const update: any = { verification_status: status };
    if (publish !== undefined) update.is_published = publish;
    const { error } = await supabase.from("pharmacists").update(update).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    sendVerification({ data: { pharmacist_id: id, status } })
      .then((r: any) => { if (r?.ok) toast.success("Notification email sent"); })
      .catch((e) => console.error("verification email failed", e));
    qc.invalidateQueries({ queryKey: ["admin-pharmacists"] });
  };

  const togglePublish = async (id: string, current: boolean) => {
    const { error } = await supabase.from("pharmacists").update({ is_published: !current }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-pharmacists"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin console</h1>
        <p className="mt-1 text-sm text-muted-foreground">Verify pharmacists, monitor activity, and govern the directory.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <KPI label="Pharmacists" value={stats.total} icon={<Users className="h-4 w-4 text-primary" />} />
        <KPI label="Verified" value={stats.verified} icon={<ShieldCheck className="h-4 w-4 text-success" />} />
        <KPI label="Pending review" value={stats.pending} icon={<ShieldCheck className="h-4 w-4 text-amber-500" />} />
        <KPI label="Enquiries" value={stats.enquiriesTotal} icon={<Inbox className="h-4 w-4 text-primary" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-medium">Verification status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats.statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                {stats.statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-medium">Coverage by state</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.stateData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="state" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">Verification queue ({stats.pending})</TabsTrigger>
          <TabsTrigger value="all">All pharmacists ({stats.total})</TabsTrigger>
          <TabsTrigger value="enquiries">Enquiries ({stats.enquiriesTotal})</TabsTrigger>
          <TabsTrigger value="emails">Email log ({emailLogTotal})</TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <Card className="divide-y divide-border">
            {pharmacists.filter((p: any) => p.verification_status === "pending").length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">No pending submissions.</p>
            )}
            {pharmacists.filter((p: any) => p.verification_status === "pending").map((p: any) => (
              <PharmacistRow key={p.id} p={p} onApprove={() => setStatus(p.id, "verified", true)} onReject={() => setStatus(p.id, "rejected", false)} onTogglePublish={() => togglePublish(p.id, p.is_published)} />
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card className="divide-y divide-border">
            {pharmacists.map((p: any) => (
              <PharmacistRow key={p.id} p={p} onApprove={() => setStatus(p.id, "verified", true)} onReject={() => setStatus(p.id, "rejected", false)} onTogglePublish={() => togglePublish(p.id, p.is_published)} />
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="enquiries">
          <Card className="divide-y divide-border">
            {enquiries.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No enquiries yet.</p>}
            {enquiries.map((e: any) => (
              <div key={e.id} className="grid gap-1 p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{e.sender_name}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{e.sender_type}</Badge>
                  <span className="text-xs text-muted-foreground">→ pharmacist {e.pharmacist_id.slice(0, 8)}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground">{new Date(e.created_at).toLocaleString("en-AU")}</span>
                </div>
                <p className="line-clamp-2 text-muted-foreground">{e.message}</p>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="emails">
          <Card className="divide-y divide-border">
            {emailLog.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No emails sent yet.</p>}
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
                  <span className="ml-auto text-[11px] text-muted-foreground">{new Date(row.created_at).toLocaleString("en-AU")}</span>
                </div>
                {row.subject && <p className="text-xs text-muted-foreground">{row.subject}</p>}
                {row.error_message && (
                  <p className="text-xs text-destructive font-mono break-all">{row.error_message}</p>
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

function PharmacistRow({ p, onApprove, onReject, onTogglePublish }: { p: any; onApprove: () => void; onReject: () => void; onTogglePublish: () => void }) {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{p.full_name}</span>
          <StatusBadge status={p.verification_status} />
          {p.is_published ? <Badge variant="secondary" className="text-[10px]">Published</Badge> : <Badge variant="outline" className="text-[10px]">Hidden</Badge>}
        </div>
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {p.suburb && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{p.suburb}, {p.state} {p.postcode}</span>}
          <span>AHPRA: {p.ahpra_number ?? "—"}</span>
          <span>Submitted {new Date(p.created_at).toLocaleDateString("en-AU")}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onTogglePublish}>
          {p.is_published ? <><EyeOff className="mr-1 h-3.5 w-3.5" />Hide</> : <><Eye className="mr-1 h-3.5 w-3.5" />Publish</>}
        </Button>
        <Button size="sm" variant="outline" onClick={onReject} className="text-destructive hover:text-destructive">
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
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${map[status] ?? "bg-muted"}`}>{status}</span>;
}
