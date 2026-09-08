import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const JUDUL = "Kubantara — dunia kubus terbuka untuk anak";
const RINGKAS =
  "Pulau balok warna-warni yang bisa dijelajahi anak langsung dari peramban. Tanpa musuh, tanpa iklan, tanpa pemasangan.";

export const metadata: Metadata = {
  metadataBase: new URL("https://kubantara.vercel.app"),
  title: { default: JUDUL, template: "%s · Kubantara" },
  description: RINGKAS,
  applicationName: "Kubantara",
  keywords: ["game anak", "voxel", "aman untuk anak", "tanpa iklan", "peramban"],
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Kubantara",
    title: JUDUL,
    description: RINGKAS,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: JUDUL, description: RINGKAS },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#7dd3fc",
  width: "device-width",
  initialScale: 1,
  // anak sering menekan layar dua kali; jangan sampai dunia ikut ter-zoom
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
