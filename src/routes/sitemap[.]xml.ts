import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://hmrpharmacists.com.au";

const STATIC_PATHS: { path: string; changefreq: string; priority: string }[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/find", changefreq: "daily", priority: "0.9" },
  { path: "/about-hmr", changefreq: "monthly", priority: "0.7" },
  { path: "/for-patients", changefreq: "monthly", priority: "0.7" },
  { path: "/for-gps", changefreq: "monthly", priority: "0.7" },
  { path: "/for-pharmacies", changefreq: "monthly", priority: "0.7" },
  { path: "/for-pharmacists", changefreq: "monthly", priority: "0.7" },
  { path: "/contact", changefreq: "yearly", priority: "0.5" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: { path: string; changefreq: string; priority: string; lastmod?: string }[] =
          [...STATIC_PATHS];

        try {
          const url = process.env.SUPABASE_URL;
          const key = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (url && key) {
            const res = await fetch(
              `${url}/rest/v1/pharmacists?select=slug,updated_at&is_published=eq.true&verification_status=eq.verified`,
              { headers: { apikey: key, Authorization: `Bearer ${key}` } },
            );
            if (res.ok) {
              const rows: { slug: string; updated_at: string }[] = await res.json();
              for (const r of rows) {
                entries.push({
                  path: `/pharmacists/${r.slug}`,
                  changefreq: "weekly",
                  priority: "0.8",
                  lastmod: r.updated_at?.slice(0, 10),
                });
              }
            }
          }
        } catch (e) {
          console.error("[sitemap] failed to fetch pharmacists", e);
        }

        const urls = entries.map((e) =>
          [
            "  <url>",
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            `    <changefreq>${e.changefreq}</changefreq>`,
            `    <priority>${e.priority}</priority>`,
            "  </url>",
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls,
          "</urlset>",
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});
