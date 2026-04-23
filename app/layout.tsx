import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

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
    statusBarStyle: "black-translucent",
  },
  themeColor: "#4338ca",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <body className={`${geist.className} h-full bg-gray-50`}>{children}</body>
    </html>
  );
}
