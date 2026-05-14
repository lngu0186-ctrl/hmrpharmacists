import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Save,
  Upload,
  Trash2,
  Plus,
  X,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAdminPharmacist,
  updateAdminPharmacist,
  addPharmacistTag,
  removePharmacistTag,
  addServiceArea,
  removeServiceArea,
  uploadAdminPharmacistPhoto,
} from "@/lib/admin-pharmacists.functions";

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

export const Route = createFileRoute("/_authenticated/admin/pharmacists/$id")({
  component: AdminPharmacistEditor,
  head: () => ({
    meta: [
      { title: "Edit pharmacist — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Tag = { id: string; value: string; meta?: string | null };

function AdminPharmacistEditor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const fetchOne = useServerFn(getAdminPharmacist);
  const update = useServerFn(updateAdminPharmacist);
  const addTag = useServerFn(addPharmacistTag);
  const removeTag = useServerFn(removePharmacistTag);
  const addArea = useServerFn(addServiceArea);
  const removeArea = useServerFn(removeServiceArea);
  const uploadPhoto = useServerFn(uploadAdminPharmacistPhoto);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-pharmacist", id],
    queryFn: () => fetchOne({ data: { id } }),
  });

  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data?.pharmacist) setForm({ ...data.pharmacist });
  }, [data?.pharmacist]);

  if (isLoading || !form || !data) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await update({
        data: {
          id,
          full_name: form.full_name ?? "",
          title: form.title ?? null,
          bio: form.bio ?? null,
          ahpra_number: form.ahpra_number ?? null,
          credentialing_body: form.credentialing_body ?? null,
          years_experience:
            form.years_experience === "" || form.years_experience == null
              ? null
              : Number(form.years_experience),
          suburb: form.suburb ?? null,
          state: form.state ?? null,
          postcode: form.postcode ?? null,
          contact_preference: form.contact_preference ?? null,
          telehealth: !!form.telehealth,
          home_visits: !!form.home_visits,
          accepting_referrals: !!form.accepting_referrals,
          turnaround_days:
            form.turnaround_days === "" || form.turnaround_days == null
              ? null
              : Number(form.turnaround_days),
          verification_status: form.verification_status,
          is_published: !!form.is_published,
        },
      });
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin-pharmacists"] });
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onPhoto = async (file: File) => {
    if (!data.pharmacist.user_id) {
      toast.error("This pharmacist has no linked user account; cannot upload photo.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be under 4 MB.");
      return;
    }
    setPhotoBusy(true);
    try {
      const buf = await file.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const b64 = btoa(bin);
      const res = await uploadPhoto({
        data: {
          pharmacist_id: id,
          owner_user_id: data.pharmacist.user_id,
          filename: file.name,
          content_type: file.type as "image/jpeg" | "image/png" | "image/webp",
          data_base64: b64,
        },
      });
      set("photo_url", res.url);
      toast.success("Photo updated");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    try {
      await update({ data: { id, photo_url: null } });
      set("photo_url", null);
      toast.success("Photo removed");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/admin" })}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to admin
          </Button>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {form.full_name || "Pharmacist"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {data.owner_email ?? "No linked account"} ·{" "}
            <span className="font-mono">{id.slice(0, 8)}</span>
            {form.slug && (
              <>
                {" · "}
                <Link to="/pharmacists/$slug" params={{ slug: form.slug }} className="underline">
                  Public profile
                </Link>
              </>
            )}
          </p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save changes
        </Button>
      </div>

      {/* Photo */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold">Profile photo</h2>
        <div className="mt-4 flex items-center gap-5">
          <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-muted ring-2 ring-primary-soft">
            {form.photo_url ? (
              <img src={form.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-muted-foreground">
                <UserIcon className="h-8 w-8" />
              </div>
            )}
            {photoBusy && (
              <div className="absolute inset-0 grid place-items-center bg-background/70">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPhoto(f);
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={photoBusy}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {form.photo_url ? "Replace" : "Upload"} photo
              </Button>
              {form.photo_url && (
                <Button size="sm" variant="ghost" disabled={photoBusy} onClick={removePhoto}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">JPG/PNG/WebP · max 4 MB.</p>
          </div>
        </div>
      </Card>

      {/* Identity */}
      <Card className="grid gap-4 p-6 sm:grid-cols-2">
        <Field label="Full name *">
          <Input value={form.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} />
        </Field>
        <Field label="Title">
          <Input
            value={form.title ?? ""}
            placeholder="Accredited Consultant Pharmacist"
            onChange={(e) => set("title", e.target.value)}
          />
        </Field>
        <Field label="AHPRA number">
          <Input
            value={form.ahpra_number ?? ""}
            onChange={(e) => set("ahpra_number", e.target.value)}
          />
        </Field>
        <Field label="Credentialing body">
          <Input
            value={form.credentialing_body ?? ""}
            placeholder="AACP / SHPA"
            onChange={(e) => set("credentialing_body", e.target.value)}
          />
        </Field>
        <Field label="Years of experience">
          <Input
            type="number"
            min={0}
            max={80}
            value={form.years_experience ?? ""}
            onChange={(e) => set("years_experience", e.target.value)}
          />
        </Field>
        <Field label="Contact preference">
          <Select
            value={form.contact_preference ?? "email"}
            onValueChange={(v) => set("contact_preference", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="either">Either</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Bio" className="sm:col-span-2">
          <Textarea
            rows={6}
            maxLength={4000}
            value={form.bio ?? ""}
            onChange={(e) => set("bio", e.target.value)}
          />
        </Field>
      </Card>

      {/* Location & availability */}
      <Card className="grid gap-4 p-6 sm:grid-cols-3">
        <Field label="Suburb">
          <Input value={form.suburb ?? ""} onChange={(e) => set("suburb", e.target.value)} />
        </Field>
        <Field label="State">
          <Select value={form.state ?? "NSW"} onValueChange={(v) => set("state", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Postcode">
          <Input
            maxLength={4}
            value={form.postcode ?? ""}
            onChange={(e) => set("postcode", e.target.value)}
          />
        </Field>
        <Field label="Turnaround (days)">
          <Input
            type="number"
            min={0}
            value={form.turnaround_days ?? ""}
            onChange={(e) => set("turnaround_days", e.target.value)}
          />
        </Field>
        <ToggleField
          label="Telehealth"
          checked={!!form.telehealth}
          onChange={(v) => set("telehealth", v)}
        />
        <ToggleField
          label="Home visits"
          checked={!!form.home_visits}
          onChange={(v) => set("home_visits", v)}
        />
        <ToggleField
          label="Accepting referrals"
          checked={!!form.accepting_referrals}
          onChange={(v) => set("accepting_referrals", v)}
        />
      </Card>

      {/* Verification & visibility */}
      <Card className="grid gap-4 p-6 sm:grid-cols-2">
        <Field label="Verification status">
          <Select
            value={form.verification_status}
            onValueChange={(v) => set("verification_status", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <ToggleField
          label="Published"
          checked={!!form.is_published}
          onChange={(v) => set("is_published", v)}
          help={
            form.verification_status === "verified"
              ? "Visible in public directory."
              : "Must be verified before publishing."
          }
        />
        {form.verification_status === "verified" && (
          <Badge variant="secondary" className="w-fit">
            <ShieldCheck className="mr-1 h-3 w-3" /> Verified
          </Badge>
        )}
      </Card>

      {/* Tags */}
      <TagSection
        title="Languages"
        items={data.languages.map((l: any) => ({ id: l.id, value: l.language }))}
        onAdd={async (value) => {
          await addTag({ data: { pharmacist_id: id, kind: "language", value } });
          refetch();
        }}
        onRemove={async (tid) => {
          await removeTag({
            data: { id: tid, kind: "language", pharmacist_id: id },
          });
          refetch();
        }}
      />
      <TagSection
        title="Specialties"
        items={data.specialties.map((s: any) => ({ id: s.id, value: s.specialty }))}
        onAdd={async (value) => {
          await addTag({ data: { pharmacist_id: id, kind: "specialty", value } });
          refetch();
        }}
        onRemove={async (tid) => {
          await removeTag({
            data: { id: tid, kind: "specialty", pharmacist_id: id },
          });
          refetch();
        }}
      />
      <TagSection
        title="Affiliations"
        items={data.affiliations.map((a: any) => ({
          id: a.id,
          value: a.organisation,
          meta: a.role,
        }))}
        withMeta
        metaLabel="Role (optional)"
        onAdd={async (value, meta) => {
          await addTag({
            data: { pharmacist_id: id, kind: "affiliation", value, meta: meta ?? null },
          });
          refetch();
        }}
        onRemove={async (tid) => {
          await removeTag({
            data: { id: tid, kind: "affiliation", pharmacist_id: id },
          });
          refetch();
        }}
      />

      {/* Service areas */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold">Service areas</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Suburbs the pharmacist will travel to for HMRs.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {data.service_areas.length === 0 && (
            <span className="text-xs text-muted-foreground">None added.</span>
          )}
          {data.service_areas.map((a: any) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary"
            >
              {a.suburb}
              {a.state ? `, ${a.state}` : ""}
              {a.postcode ? ` ${a.postcode}` : ""}
              {a.radius_km ? ` · ${a.radius_km}km` : ""}
              <button
                type="button"
                aria-label="Remove"
                onClick={async () => {
                  await removeArea({ data: { id: a.id, pharmacist_id: id } });
                  refetch();
                }}
                className="rounded-full p-0.5 text-primary/70 hover:bg-primary/10 hover:text-primary"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <ServiceAreaForm
          onAdd={async (a) => {
            await addArea({ data: { pharmacist_id: id, ...a } });
            refetch();
          }}
        />
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
  help,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  help?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {help && <p className="text-[11px] text-muted-foreground">{help}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function TagSection({
  title,
  items,
  onAdd,
  onRemove,
  withMeta,
  metaLabel,
}: {
  title: string;
  items: Tag[];
  onAdd: (value: string, meta?: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  withMeta?: boolean;
  metaLabel?: string;
}) {
  const [draft, setDraft] = useState("");
  const [meta, setMeta] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {items.length === 0 && <span className="text-xs text-muted-foreground">None added.</span>}
        {items.map((i) => (
          <span
            key={i.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary"
          >
            {i.value}
            {i.meta && <span className="text-primary/70">— {i.meta}</span>}
            <button
              type="button"
              aria-label="Remove"
              onClick={async () => {
                setBusy(true);
                try {
                  await onRemove(i.id);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not remove");
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded-full p-0.5 text-primary/70 hover:bg-primary/10 hover:text-primary"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Add ${title.toLowerCase()}…`}
          maxLength={120}
          className="h-9 max-w-xs"
        />
        {withMeta && (
          <Input
            value={meta}
            onChange={(e) => setMeta(e.target.value)}
            placeholder={metaLabel ?? "Meta"}
            maxLength={120}
            className="h-9 max-w-xs"
          />
        )}
        <Button
          size="sm"
          variant="secondary"
          disabled={busy || !draft.trim()}
          onClick={async () => {
            setBusy(true);
            try {
              await onAdd(draft.trim(), meta.trim() || undefined);
              setDraft("");
              setMeta("");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not add");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </Card>
  );
}

function ServiceAreaForm({
  onAdd,
}: {
  onAdd: (a: {
    suburb: string;
    state?: string | null;
    postcode?: string | null;
    radius_km?: number | null;
  }) => Promise<void>;
}) {
  const [suburb, setSuburb] = useState("");
  const [st, setSt] = useState<string>("NSW");
  const [postcode, setPostcode] = useState("");
  const [radius, setRadius] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_120px_120px_120px_auto]">
      <Input
        placeholder="Suburb"
        value={suburb}
        onChange={(e) => setSuburb(e.target.value)}
        className="h-9"
      />
      <Select value={st} onValueChange={setSt}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder="Postcode"
        maxLength={4}
        value={postcode}
        onChange={(e) => setPostcode(e.target.value)}
        className="h-9"
      />
      <Input
        placeholder="Radius km"
        type="number"
        min={0}
        value={radius}
        onChange={(e) => setRadius(e.target.value)}
        className="h-9"
      />
      <Button
        size="sm"
        variant="secondary"
        disabled={busy || !suburb.trim()}
        onClick={async () => {
          setBusy(true);
          try {
            await onAdd({
              suburb: suburb.trim(),
              state: st || null,
              postcode: postcode.trim() || null,
              radius_km: radius ? Number(radius) : null,
            });
            setSuburb("");
            setPostcode("");
            setRadius("");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not add");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Plus className="mr-1 h-3.5 w-3.5" /> Add area
      </Button>
    </div>
  );
}
