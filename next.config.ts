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
  // 👇 Tambahkan konfigurasi ini untuk mengabaikan module React Native
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    };
    return config;
  },
};

export default nextConfig;