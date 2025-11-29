"use client";

import { OnchainKitProvider } from "@coinbase/onchainkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// 👇 Import BASE (Mainnet) juga
import { base, baseSepolia } from "wagmi/chains"; 
import { type ReactNode, useState } from "react";
import { type State, WagmiProvider, createConfig, http } from "wagmi";
import { coinbaseWallet, injected, metaMask } from "wagmi/connectors"; 

const getConfig = () => {
  return createConfig({
    // 👇 Tambahkan 'base' disini supaya tidak stuck saat konek wallet Mainnet
    chains: [baseSepolia, base], 
    transports: {
      [baseSepolia.id]: http(),
      [base.id]: http(),
    },
    connectors: [
      injected(), 
      coinbaseWallet({
        appName: "Base Dating",
        preference: "all", 
      }),
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
          // Default chain tetap Sepolia untuk komponen OnchainKit
          chain={baseSepolia}
        >
          {props.children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}