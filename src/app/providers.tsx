"use client";

import { OnchainKitProvider } from "@coinbase/onchainkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { baseSepolia } from "wagmi/chains"; // Pastikan pakai baseSepolia (Testnet)
import { type ReactNode, useState } from "react";
import { type State, WagmiProvider, createConfig, http } from "wagmi";
import { coinbaseWallet, injected, metaMask } from "wagmi/connectors"; // <--- Ini kuncinya

// Konfigurasi Wagmi agar mendeteksi Base Wallet & MetaMask
const getConfig = () => {
  return createConfig({
    chains: [baseSepolia], // Menggunakan Base Sepolia
    transports: {
      [baseSepolia.id]: http(),
    },
    connectors: [
      // 1. Prioritaskan Coinbase Wallet (Base Wallet)
      coinbaseWallet({
        appName: "Base Dating App",
        preference: "all", // Opsional: paksa mode Smart Wallet
      }),
      // 2. Tambahkan MetaMask
      metaMask(),
      // 3. Fallback ke Injected (Browser Extension lain)
      injected(),
    ],
    ssr: true,
  });
};

export function Providers(props: {
  children: ReactNode;
  initialState?: State;
}) {
  const [config] = useState(() => getConfig());
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config} initialState={props.initialState}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={baseSepolia}
        >
          {props.children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}