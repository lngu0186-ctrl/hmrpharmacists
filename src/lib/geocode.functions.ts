import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  query: z.string().trim().min(2).max(120),
});

export const geocodeAU = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", `${data.query}, Australia`);
    url.searchParams.set("countrycodes", "au");
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "HMRPharmacistExchange/1.0 (contact@hmrpharmacists.com.au)",
        "Accept-Language": "en-AU",
      },
    });
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!arr.length) return null;
    return {
      lat: parseFloat(arr[0].lat),
      lng: parseFloat(arr[0].lon),
      label: arr[0].display_name,
    };
  });
