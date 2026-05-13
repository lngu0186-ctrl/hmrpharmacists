import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type Item = { id: string; value: string; meta?: string };

export function TagManager({
  title,
  description,
  table,
  pharmacistId,
  valueColumn,
  metaColumn,
  metaLabel,
  suggestions = [],
  items,
  onChange,
}: {
  title: string;
  description?: string;
  table: "pharmacist_languages" | "pharmacist_affiliations";
  pharmacistId: string;
  valueColumn: "language" | "organisation";
  metaColumn?: "role";
  metaLabel?: string;
  suggestions?: string[];
  items: Item[];
  onChange: (items: Item[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [draftMeta, setDraftMeta] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async (rawValue?: string) => {
    const value = (rawValue ?? draft).trim();
    if (!value) return;
    if (items.some((i) => i.value.toLowerCase() === value.toLowerCase())) {
      toast.info(`${value} is already added.`);
      setDraft("");
      return;
    }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = { pharmacist_id: pharmacistId, [valueColumn]: value };
      if (metaColumn && draftMeta.trim()) payload[metaColumn] = draftMeta.trim();
      const { data, error } = await supabase.from(table).insert(payload as never).select("*").single();
      if (error) throw error;
      const newItem: Item = {
        id: (data as any).id,
        value: (data as any)[valueColumn],
        meta: metaColumn ? (data as any)[metaColumn] ?? undefined : undefined,
      };
      onChange([...items, newItem]);
      setDraft("");
      setDraftMeta("");
    } catch (e: any) {
      toast.error(e.message ?? "Could not add");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      onChange(items.filter((i) => i.id !== id));
    } catch (e: any) {
      toast.error(e.message ?? "Could not remove");
    } finally {
      setBusy(false);
    }
  };

  const remaining = suggestions.filter((s) => !items.some((i) => i.value.toLowerCase() === s.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {items.length === 0 && <span className="text-xs text-muted-foreground">None added yet.</span>}
        {items.map((i) => (
          <span key={i.id} className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
            {i.value}
            {i.meta && <span className="text-primary/70">— {i.meta}</span>}
            <button
              type="button"
              onClick={() => remove(i.id)}
              className="rounded-full p-0.5 text-primary/70 transition-colors hover:bg-primary/10 hover:text-primary"
              aria-label={`Remove ${i.value}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      {remaining.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {remaining.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              disabled={busy}
              className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={`Add ${title.toLowerCase()}…`}
          className="h-9 max-w-xs"
          maxLength={120}
        />
        {metaColumn && (
          <Input
            value={draftMeta}
            onChange={(e) => setDraftMeta(e.target.value)}
            placeholder={metaLabel ?? "Role (optional)"}
            className="h-9 max-w-xs"
            maxLength={120}
          />
        )}
        <Button size="sm" variant="secondary" onClick={() => add()} disabled={busy || !draft.trim()}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}
