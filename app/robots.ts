import type { MetadataRoute } from "next";

// Halaman permainan dan area pribadi tak perlu masuk mesin pencari.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/play", "/profil", "/ortu", "/bukti"] },
    sitemap: "https://kubantara.vercel.app/sitemap.xml",
  };
}
