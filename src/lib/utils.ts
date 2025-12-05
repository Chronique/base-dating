import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const METADATA = {
  // UPDATED: Use the new app name
  name: "Base Dating App",
  // UPDATED: Use the new English description
  description: "Find your on-chain match and connect with like-minded individuals on Base.",
  bannerImageUrl: 'https://i.imgur.com/2bsV8mV.png',
  iconImageUrl: 'https://i.imgur.com/brcnijg.png',
  // UPDATED: Ensure the fallback URL is correct
  homeUrl: process.env.NEXT_PUBLIC_URL ?? "https://base-dating.vercel.app",
  splashBackgroundColor: "#FFFFFF"
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}