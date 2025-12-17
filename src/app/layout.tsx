import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import FrameProvider from "../components/providers/FrameProvider"; // 👇 Perbaikan Import
import { METADATA } from "../lib/utils"; 

export const metadata: Metadata = {
  title: METADATA.name,
  description: METADATA.description,
  openGraph: {
    title: "Base Dating - Find Your On-Chain Match",
    description: METADATA.description,
    url: METADATA.homeUrl,
    siteName: METADATA.name,
    images: [
      {
        url: METADATA.bannerImageUrl,
        width: 1200,
        height: 630,
        alt: METADATA.name,
      },
    ],
  },
  other: {
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: METADATA.bannerImageUrl,
      button: {
        title: "Start Matching",
        action: {
          type: "launch_frame",
          name: METADATA.name,
          url: METADATA.homeUrl,
          splashImageUrl: METADATA.iconImageUrl,
          splashBackgroundColor: METADATA.splashBackgroundColor,
        },
      },
    }),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {/* 👇 Bungkus children dengan FrameProvider */}
          <FrameProvider>
            {children}
          </FrameProvider>
        </Providers>
      </body>
    </html>
  );
}