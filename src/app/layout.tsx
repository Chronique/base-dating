import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { METADATA } from "../lib/utils"; // Import METADATA dari utils

export const metadata: Metadata = {
  // Menggunakan variable dari METADATA
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
    // Kunci agar Farcaster mengenali ini sebagai App
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}