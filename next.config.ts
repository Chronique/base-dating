import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.imgur.com', // Mengizinkan Imgur (sumber gambar logo/banner)
      },
      {
        protocol: 'https',
        hostname: '**', // Mengizinkan semua domain lain (untuk foto profil user)
      },
    ],
  },
};

export default nextConfig;