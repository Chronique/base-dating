"use client";

import { createConfig, http, fallback, WagmiProvider } from "wagmi";
import { base, optimism } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { METADATA } from "../lib/utils";
import { ThemeProvider } from "next-themes";

export const config = createConfig({
  chains: [base, optimism],
  transports: {
    // 👇 KONFIGURASI 3 RPC (Fallback Mechanism)
    // Aplikasi akan mencoba urutan: Alchemy -> Ankr -> QuickNode
    [base.id]: fallback([
      http(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL),
      http(process.env.NEXT_PUBLIC_ANKR_RPC_URL),
      http(process.env.NEXT_PUBLIC_QUICKNODE_RPC_URL),
    ]),
    [optimism.id]: http(),
  },
  connectors: [
    // 1. Farcaster (Prioritas Utama di dalam Warpcast)
    farcasterMiniApp(),
    
    // 2. Coinbase Smart Wallet (Wajib untuk Builder Code / Attribution)
    coinbaseWallet({
      appName: METADATA.name,
      appLogoUrl: METADATA.iconImageUrl,
      preference: "smartWalletOnly", // 👈 Memaksa mode Smart Wallet (Passkey)
      version: "4",
    })
  ],
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {/* Theme Provider untuk Dark/Light Mode */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}