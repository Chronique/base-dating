import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

const appUrl = "https://base-dating.vercel.app"; 

export const metadata: Metadata = {
  title: "Base Dating App",
  // Updated English description
  description: "Find your on-chain match and connect with like-minded individuals on Base.", 
  openGraph: {
    // Updated English og:title
    title: "Base Dating - Find Your On-Chain Match", 
    // Updated English og:description
    description: "The first dating app on Base. Connect your wallet, swipe, and build web3 connections.",
    url: appUrl,
    siteName: "Base Dating",
  },
  other: {
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: `${appUrl}/opener-image.png`,
      button: {
        title: "Start Matching",
        action: {
          type: "launch_frame",
          name: "Base Dating",
          url: appUrl,
          splashImageUrl: `${appUrl}/icon.png`,
          splashBackgroundColor: "#ffffff",
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
    // Note: suppressHydrationWarning is added here
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}