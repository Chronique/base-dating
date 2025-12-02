import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

const appUrl = "https://base-dating.vercel.app"; 

export const metadata: Metadata = {
  title: "Base Dating App",
  description: "Find your on-chain match",
  openGraph: {
    title: "Base Dating App",
    description: "Find your on-chain match",
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
    // 👇 PERUBAHAN: Tambahkan suppressHydrationWarning di sini
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}