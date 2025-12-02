"use client";

import { OnchainKitProvider } from "@coinbase/onchainkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { base } from "wagmi/chains"; 
import { type ReactNode, useState } from "react";
import { type State, WagmiProvider, createConfig, http } from "wagmi";
import { coinbaseWallet, injected, metaMask } from "wagmi/connectors";
// 👇 Import ThemeProvider
import { ThemeProvider } from "next-themes"; 

const getConfig = () => {
  return createConfig({
    chains: [base],
    transports: {
      [base.id]: http(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL), 
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
          chain={base}
        >
          {/* 👇 Tambahkan ThemeProvider di sini */}
          <ThemeProvider
            attribute="class"
            defaultTheme="system" // 🔥 Ini kuncinya: mengikuti sistem HP/Farcaster
            enableSystem
            disableTransitionOnChange
          >
            {props.children}
          </ThemeProvider>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}