import { useRef, useState } from "react";
import { Upload, Trash2, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 4 * 1024 * 1024;

export function PhotoUploader({
  userId,
  pharmacistId,
  photoUrl,
  onChange,
}: {
  userId: string;
  pharmacistId: string;
  photoUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    if (!ACCEPT.split(",").includes(file.type)) {
      toast.error("Please upload a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be under 4 MB.");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${userId}/profile-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("pharmacist-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("pharmacist-photos").getPublicUrl(path);
      const url = pub.publicUrl;

      const { error: updErr } = await supabase
        .from("pharmacists")
        .update({ photo_url: url })
        .eq("id", pharmacistId);
      if (updErr) throw updErr;

      // Best-effort cleanup of old file if it lived in our bucket
      if (photoUrl) {
        const marker = "/pharmacist-photos/";
        const idx = photoUrl.indexOf(marker);
        if (idx >= 0) {
          const oldPath = photoUrl.slice(idx + marker.length);
          supabase.storage
            .from("pharmacist-photos")
            .remove([oldPath])
            .catch(() => {});
        }
      }

      onChange(url);
      toast.success("Photo updated");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async () => {
    if (!photoUrl) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("pharmacists")
        .update({ photo_url: null })
        .eq("id", pharmacistId);
      if (error) throw error;
      const marker = "/pharmacist-photos/";
      const idx = photoUrl.indexOf(marker);
      if (idx >= 0) {
        const oldPath = photoUrl.slice(idx + marker.length);
        supabase.storage
          .from("pharmacist-photos")
          .remove([oldPath])
          .catch(() => {});
      }
      onChange(null);
      toast.success("Photo removed");
    } catch (e: any) {
      toast.error(e.message ?? "Could not remove photo");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-muted ring-2 ring-primary-soft">
        {photoUrl ? (
          <img src={photoUrl} alt="Profile photo" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <User className="h-8 w-8" />
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-background/70">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" /> {photoUrl ? "Replace" : "Upload"} photo
          </Button>
          {photoUrl && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={remove}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          JPG, PNG or WebP · max 4 MB · square works best.
        </p>
      </div>
    </div>
  );
}
