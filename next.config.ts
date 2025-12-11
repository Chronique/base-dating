import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.imgur.com', 
      },
      {
        protocol: 'https',
        hostname: '**', // Mengizinkan semua domain lain (untuk foto profil user)
      },
    ],
  },
  // 👇 TAMBAHKAN BAGIAN WEBPACK INI
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      // Mengabaikan import React Native Async Storage di lingkungan web
      '@react-native-async-storage/async-storage': false,
    };
    return config;
  },
};

export default nextConfig;