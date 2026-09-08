import type { MetadataRoute } from "next";

const BASE = "https://kubantara.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/masuk`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${BASE}/daftar`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${BASE}/ketentuan`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/privasi`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
