import type { MetadataRoute } from "next";

// Supaya Kubantara bisa dipasang ke layar depan tablet/ponsel dan dibuka
// layar penuh tanpa bilah peramban — anak tak sengaja menekan tombol kembali.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kubantara — dunia kubus untuk anak",
    short_name: "Kubantara",
    description:
      "Pulau balok warna-warni yang bisa dijelajahi anak langsung dari peramban. Tanpa musuh, tanpa iklan.",
    start_url: "/",
    display: "standalone",
    orientation: "landscape",
    background_color: "#7dd3fc",
    theme_color: "#7dd3fc",
    lang: "id",
    categories: ["games", "education", "kids"],
    icons: [{ src: "/ikon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
