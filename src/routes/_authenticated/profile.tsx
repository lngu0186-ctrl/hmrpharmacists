import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, ExternalLink, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PhotoUploader } from "@/components/site/PhotoUploader";
import { TagManager } from "@/components/site/TagManager";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "My profile — HMR Pharmacist Exchange" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const LANGUAGE_SUGGESTIONS = [
  "English",
  "Mandarin",
  "Cantonese",
  "Vietnamese",
  "Arabic",
  "Greek",
  "Italian",
  "Hindi",
  "Punjabi",
  "Tagalog",
  "Spanish",
  "Korean",
  "Auslan",
];

const AFFILIATION_SUGGESTIONS = [
  "AACP",
  "PSA",
  "SHPA",
  "Pharmacy Guild of Australia",
  "Consultant Pharmacists Australia",
];

type LangItem = { id: string; value: string };
type AffilItem = { id: string; value: string; meta?: string };

function ProfilePage() {
  const { user } = useAuth();

  const {
    data: pharmacist,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["profile-pharmacist", user?.id],
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

  const { data: rawLanguages = [], refetch: refetchLanguages } = useQuery({
    queryKey: ["profile-languages", pharmacist?.id],
    enabled: !!pharmacist?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("pharmacist_languages")
        .select("id, language")
        .eq("pharmacist_id", pharmacist!.id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: rawAffiliations = [], refetch: refetchAffiliations } = useQuery({
    queryKey: ["profile-affiliations", pharmacist?.id],
    enabled: !!pharmacist?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("pharmacist_affiliations")
        .select("id, organisation, role")
        .eq("pharmacist_id", pharmacist!.id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const [languages, setLanguages] = useState<LangItem[]>([]);
  const [affiliations, setAffiliations] = useState<AffilItem[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [togglingPublish, setTogglingPublish] = useState(false);

  useEffect(() => {
    setLanguages(rawLanguages.map((r: any) => ({ id: r.id, value: r.language })));
  }, [rawLanguages]);

  useEffect(() => {
    setAffiliations(
      rawAffiliations.map((r: any) => ({
        id: r.id,
        value: r.organisation,
        meta: r.role ?? undefined,
      })),
    );
  }, [rawAffiliations]);

  useEffect(() => {
    if (pharmacist) {
      setPhotoUrl(pharmacist.photo_url ?? null);
      setIsPublished(!!pharmacist.is_published);
    }
  }, [pharmacist]);

  if (isLoading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pharmacist) {
    return (
      <Card className="p-8">
        <h1 className="text-2xl font-semibold tracking-tight">No profile yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You haven't created your pharmacist profile. Complete onboarding first to access profile
          management.
        </p>
        <Button asChild className="mt-6">
          <Link to="/onboarding">Start onboarding</Link>
        </Button>
      </Card>
    );
  }

  const requiredFields: Array<[string, unknown]> = [
    ["Full name", pharmacist.full_name],
    ["AHPRA number", pharmacist.ahpra_number],
    ["Suburb", pharmacist.suburb],
    ["State", pharmacist.state],
    ["Postcode", pharmacist.postcode],
    ["Bio", pharmacist.bio],
    ["Profile photo", photoUrl],
    ["At least one language", languages.length > 0 ? "x" : null],
  ];
  const completedCount = requiredFields.filter(([, v]) => !!v).length;
  const completion = Math.round((completedCount / requiredFields.length) * 100);
  const verified = pharmacist.verification_status === "verified";

  const togglePublish = async (next: boolean) => {
    if (next && completion < 100) {
      toast.error("Complete all required fields before publishing.");
      return;
    }
    if (next && !verified) {
      toast.error("Profile must be verified before it can be published.");
      return;
    }
    setTogglingPublish(true);
    try {
      const { error } = await supabase
        .from("pharmacists")
        .update({ is_published: next })
        .eq("id", pharmacist.id);
      if (error) throw error;
      setIsPublished(next);
      toast.success(next ? "Profile is now public" : "Profile hidden from search");
      refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Could not change visibility");
    } finally {
      setTogglingPublish(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage how you appear in the directory.
          </p>
        </div>
        {verified && pharmacist.slug && (
          <Button asChild variant="outline" size="sm">
            <Link to="/pharmacists/$slug" params={{ slug: pharmacist.slug }}>
              View public profile <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>

      {/* Completion */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Profile completion</h2>
            <p className="text-xs text-muted-foreground">
              {completedCount} of {requiredFields.length} required items complete.
            </p>
          </div>
          <div className="text-2xl font-semibold tabular-nums">{completion}%</div>
        </div>
        <Progress value={completion} className="mt-3 h-1.5" />
        {completion < 100 && (
          <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
            {requiredFields
              .filter(([, v]) => !v)
              .map(([label]) => (
                <li key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> {label}
                </li>
              ))}
          </ul>
        )}
      </Card>

      {/* Visibility */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            {isPublished ? (
              <Eye className="mt-0.5 h-5 w-5 text-success" />
            ) : (
              <EyeOff className="mt-0.5 h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <h2 className="text-sm font-semibold">Public visibility</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {verified
                  ? isPublished
                    ? "Your profile appears in public search results."
                    : "Your profile is hidden from search results."
                  : "Profile must be verified by our team before it can be published."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={verified ? "secondary" : "outline"} className="capitalize">
              {verified ? (
                <CheckCircle2 className="mr-1 h-3 w-3" />
              ) : (
                <AlertCircle className="mr-1 h-3 w-3" />
              )}
              {pharmacist.verification_status}
            </Badge>
            <Switch
              checked={isPublished}
              onCheckedChange={togglePublish}
              disabled={togglingPublish || !verified}
              aria-label="Public visibility"
            />
          </div>
        </div>
      </Card>

      {/* Photo */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold">Profile photo</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          A clear headshot helps GPs and pharmacies recognise you.
        </p>
        <Separator className="my-4" />
        <PhotoUploader
          userId={user!.id}
          pharmacistId={pharmacist.id}
          photoUrl={photoUrl}
          onChange={setPhotoUrl}
        />
      </Card>

      {/* Languages */}
      <Card className="p-6">
        <TagManager
          title="Languages spoken"
          description="Helps CALD patients and carers find you."
          table="pharmacist_languages"
          pharmacistId={pharmacist.id}
          valueColumn="language"
          suggestions={LANGUAGE_SUGGESTIONS}
          items={languages}
          onChange={(next) => {
            setLanguages(next);
            refetchLanguages();
          }}
        />
      </Card>

      {/* Affiliations */}
      <Card className="p-6">
        <TagManager
          title="Professional affiliations"
          description="Memberships and credentialing bodies."
          table="pharmacist_affiliations"
          pharmacistId={pharmacist.id}
          valueColumn="organisation"
          metaColumn="role"
          metaLabel="Role (optional)"
          suggestions={AFFILIATION_SUGGESTIONS}
          items={affiliations}
          onChange={(next) => {
            setAffiliations(next);
            refetchAffiliations();
          }}
        />
      </Card>

      {/* Wizard fields shortcut */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-sm font-semibold">Bio, services & service area</h2>
          <p className="text-xs text-muted-foreground">
            Edit your written profile, specialties, location and availability.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/onboarding">Edit details</Link>
        </Button>
      </Card>
    </div>
  );
}
