"use client";

import { OnchainKitProvider } from "@coinbase/onchainkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { baseSepolia } from "wagmi/chains"; 
import { type ReactNode, useState } from "react";
import { type State, WagmiProvider, createConfig, http } from "wagmi";
import { coinbaseWallet, injected } from "wagmi/connectors"; 
// Import connector khusus Farcaster (jika ada di library frame-sdk, 
// tapi karena kita pakai wagmi standar, kita gunakan 'injected' sebagai prioritas di mobile)

const getConfig = () => {
  return createConfig({
    chains: [baseSepolia], 
    transports: {
      [baseSepolia.id]: http(),
    },
    connectors: [
      // Urutan PENTING! Taruh 'injected' (Browser Wallet/Warpcast Provider) di atas.
      // Di dalam Warpcast, 'injected' akan otomatis mendeteksi dompet internal Warpcast.
      injected(), 
      
      coinbaseWallet({
        appName: "Base Dating",
      }),
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