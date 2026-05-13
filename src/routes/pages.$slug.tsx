import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell } from "@/components/site/SiteShell";
import { supabase } from "@/integrations/supabase/client";
import { renderMarkdown } from "@/lib/markdown";

export const Route = createFileRoute("/pages/$slug")({
  component: PublicContentPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — HMR Pharmacist Exchange` },
      { property: "og:url", content: `/pages/${params.slug}` },
    ],
    links: [{ rel: "canonical", href: `/pages/${params.slug}` }],
  }),
});

function PublicContentPage() {
  const { slug } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_pages")
        .select("title,body,is_published,updated_at")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-muted-foreground">Page not available.</p>}
        {data && (
          <>
            <header>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{data.title}</h1>
              <p className="mt-2 text-xs text-muted-foreground">Updated {new Date(data.updated_at).toLocaleDateString("en-AU")}</p>
            </header>
            <div
              className="prose-content mt-6"
              dangerouslySetInnerHTML={{ __html: renderMarkdown((data.body as any)?.markdown ?? "") }}
            />
          </>
        )}
      </article>
    </SiteShell>
  );
}
