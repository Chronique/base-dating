"use client";

import { OnchainKitProvider } from "@coinbase/onchainkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { baseSepolia } from "wagmi/chains"; 
import { type ReactNode, useState } from "react";
import { type State, WagmiProvider, createConfig, http } from "wagmi";
import { coinbaseWallet, injected, metaMask } from "wagmi/connectors"; 

const getConfig = () => {
  return createConfig({
    chains: [baseSepolia], 
    transports: {
      [baseSepolia.id]: http(),
    },
    connectors: [
      // 1. WAJIB PERTAMA: Injected (Untuk Warpcast / Browser Wallet)
      injected(), 
      
      // 2. Coinbase Wallet (Untuk Base App / Chrome)
      coinbaseWallet({
        appName: "Base Dating",
        preference: "all", 
      }),
      
      // 3. MetaMask (Opsional)
      metaMask(),
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