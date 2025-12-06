import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const METADATA = {
  name: "Base Dating App",
  description: "Find your on-chain match and connect with like-minded individuals on Base.",
  bannerImageUrl: "https://base-dating.vercel.app/opener-image.png",
  iconImageUrl: "https://base-dating.vercel.app/icon.png",
  homeUrl: process.env.NEXT_PUBLIC_URL ?? "https://base-dating.vercel.app",
  // 👇 UPDATE: Saya ganti ke Hitam (#000000) agar lebih nyaman di Dark Mode
  // Jika ingin biru Base, gunakan "#0052FF"
  splashBackgroundColor: "#000000" 
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}