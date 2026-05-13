import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Plus, ExternalLink, Trash2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/content")({
  component: ContentPage,
  head: () => ({ meta: [{ title: "Content — Admin" }, { name: "robots", content: "noindex" }] }),
});

type Page = {
  id: string;
  slug: string;
  title: string;
  body: any;
  is_published: boolean;
  updated_at: string;
};

function ContentPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Page> | null>(null);

  const { data: pages = [] } = useQuery({
    queryKey: ["cms-pages"],
    queryFn: async () => {
      const { data } = await supabase.from("content_pages").select("*").order("updated_at", { ascending: false });
      return (data ?? []) as Page[];
    },
  });

  const save = useMutation({
    mutationFn: async (p: Partial<Page>) => {
      const payload = {
        slug: (p.slug ?? "").trim(),
        title: (p.title ?? "").trim(),
        body: { markdown: typeof p.body === "string" ? p.body : p.body?.markdown ?? "" },
        is_published: !!p.is_published,
      };
      if (!payload.slug || !payload.title) throw new Error("Slug and title are required");
      if (p.id) {
        const { error } = await supabase.from("content_pages").update(payload).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("content_pages").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["cms-pages"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = async (id: string) => {
    if (!confirm("Delete this page?")) return;
    const { error } = await supabase.from("content_pages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["cms-pages"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Content pages</h1>
          <p className="mt-1 text-sm text-muted-foreground">Author and publish marketing & guidance pages.</p>
        </div>
        <Button onClick={() => setEditing({ is_published: true })}>
          <Plus className="mr-1.5 h-4 w-4" /> New page
        </Button>
      </div>

      <Card className="divide-y divide-border">
        {pages.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No pages yet.</p>}
        {pages.map((p) => (
          <div key={p.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{p.title}</span>
                <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">/pages/{p.slug}</code>
                {p.is_published ? <Badge variant="secondary" className="text-[10px]">Published</Badge> : <Badge variant="outline" className="text-[10px]">Draft</Badge>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Updated {new Date(p.updated_at).toLocaleString("en-AU")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {p.is_published && (
                <Button asChild variant="outline" size="sm">
                  <Link to="/pages/$slug" params={{ slug: p.slug }}><ExternalLink className="mr-1 h-3.5 w-3.5" />View</Link>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setEditing({ ...p, body: p.body?.markdown ?? "" })}>Edit</Button>
              <Button variant="ghost" size="sm" onClick={() => remove(p.id)} className="text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit page" : "New page"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input className="mt-1.5" value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Slug (URL)</Label>
                  <Input className="mt-1.5" value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value.replace(/[^a-z0-9-]/g, "-").toLowerCase() })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Body (Markdown)</Label>
                <Textarea
                  rows={14}
                  className="mt-1.5 font-mono text-sm"
                  value={typeof editing.body === "string" ? editing.body : editing.body?.markdown ?? ""}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  placeholder="# Heading&#10;&#10;Write content with **markdown**…"
                />
              </div>
              <label className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="text-sm">Published</span>
                <Switch checked={!!editing.is_published} onCheckedChange={(v) => setEditing({ ...editing, is_published: v })} />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>
              <Save className="mr-1.5 h-4 w-4" /> {save.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
