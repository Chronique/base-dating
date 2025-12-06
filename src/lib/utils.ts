import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const METADATA = {
  // Nama Aplikasi
  name: "Base Dating App",
  // Deskripsi Bahasa Inggris
  description: "Find your on-chain match and connect with like-minded individuals on Base.",
  // Menggunakan URL aplikasi Anda untuk gambar (lebih stabil daripada Imgur)
  bannerImageUrl: "https://base-dating.vercel.app/opener-image.png",
  iconImageUrl: "https://base-dating.vercel.app/icon.png",
  // URL Home
  homeUrl: process.env.NEXT_PUBLIC_URL ?? "https://base-dating.vercel.app",
  splashBackgroundColor: "#FFFFFF"
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}