import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "";

const STATIC_PATHS = ["/", "/find", "/about-hmr", "/for-patients", "/for-gps", "/for-pharmacies", "/for-pharmacists", "/contact", "/privacy", "/terms"];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries = STATIC_PATHS.map((p) => ({ path: p, changefreq: "weekly", priority: p === "/" ? "1.0" : "0.8" }));

        try {
          const url = process.env.SUPABASE_URL;
          const key = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (url && key) {
            const res = await fetch(`${url}/rest/v1/pharmacists?select=slug&is_published=eq.true&verification_status=eq.verified`, {
              headers: { apikey: key, Authorization: `Bearer ${key}` },
            });
            if (res.ok) {
              const rows: { slug: string }[] = await res.json();
              for (const r of rows) entries.push({ path: `/pharmacists/${r.slug}`, changefreq: "weekly", priority: "0.7" });
            }
          }
        } catch {}

        const urls = entries.map((e) => `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`);
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
        return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
