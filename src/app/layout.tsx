import type { Metadata } from "next";
import "./globals.css"; // Sesuaikan path jika pakai ~
import { Providers } from "./providers";

// 👇 GANTI INI DENGAN LINK VERCEL KAMU YANG ASLI!
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
  // 👇 INI YANG KURANG TADI (KTP AGAR JADI MINI APP)
  other: {
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: `${appUrl}/opener-image.png`, // Pastikan ada gambar default (opsional)
      button: {
        title: "Start Matching",
        action: {
          type: "launch_frame",
          name: "Base Dating",
          url: appUrl,
          splashImageUrl: `${appUrl}/icon.png`, // Icon saat loading
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
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}