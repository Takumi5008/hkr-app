import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: "インフラ管理",
  description: "HKR・シフト管理システム",
  openGraph: {
    title: "インフラ管理",
    description: "HKR・シフト管理システム",
    siteName: "インフラ管理",
  },
  appleWebApp: {
    capable: true,
    title: "インフラ管理",
    statusBarStyle: "default",
  },
  themeColor: "#4338ca",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <body className={`${geist.className} h-full bg-gray-50`}>{children}</body>
    </html>
  );
}
