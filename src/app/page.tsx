"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import sdk from "@farcaster/frame-sdk";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useConnect,
  useWatchContractEvent,
  useChainId,
  useSwitchChain,
  useBalance,
} from "wagmi";
import { base } from "wagmi/chains";
import SwipeCard, { Profile as SwipeProfile } from "../components/SwipeCard";
import { CONTRACT_ADDRESS, DATING_ABI } from "../constants";

// Update Tipe Data (Wajib sama dengan SwipeCard)
type FarcasterUser = SwipeProfile & {
  fid: number;
  display_name?: string | null;
  bio?: string | null;
  gender: "male" | "female";
  type: "farcaster" | "base";
  location?: string | null; // ✅ Support Location
};

// DATA MANUAL (Sekarang pakai Lokasi)
const BASE_USERS: FarcasterUser[] = [
  {
    fid: -1,
    username: "jesse.base.eth",
    display_name: "Jesse Pollak",
    pfp_url: "https://img.notionusercontent.com/s/prod-files-secure%2F504c88ba-448e-4792-b30c-64f45265d547%2F608c6e67-5f7a-4276-b8f3-9cc9f0e4b15e%2Fjesse.jpg?id=081f9518-3585-4b24-862a-4438135d3f28&table=block&spaceId=504c88ba-448e-4792-b30c-64f45265d547&width=1420&userId=58d91315-9a2f-4225-83b0-c0dfc0281736&cache=v2", 
    custody_address: "0x8C4E43d88A42407705874B11d8B3eeF88651C8C8",
    bio: "Creator of Base. Let's build onchain.",
    gender: "male",
    type: "base",
    location: "San Francisco, US 🇺🇸"
  },
  {
    fid: -2,
    username: "vitalik.eth",
    display_name: "Vitalik Buterin",
    pfp_url: "https://github.com/vbuterin.png",
    custody_address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    bio: "Ethereum Co-founder.",
    gender: "male",
    type: "base",
    location: "Global 🌍"
  },
  {
    fid: -3,
    username: "linda.base.eth",
    display_name: "Linda",
    pfp_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    custody_address: "0x1234567890123456789012345678901234567890",
    bio: "Loves crypto and coffee ☕️",
    gender: "female",
    type: "base",
    location: "New York, US 🇺🇸"
  },
];

function MatchModal({ partner, onClose }: { partner: string; onClose: () => void }) {
  const chatLink = `https://xmttp.chat/dm/${partner}`;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in zoom-in p-4 touch-auto">
      <div className="bg-card border border-border p-6 rounded-3xl text-center max-w-sm w-full shadow-2xl relative overflow-hidden">
        <div className="text-6xl mb-4 animate-bounce">💖</div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-2">IT'S A MATCH!</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          You matched with <span className="font-mono bg-secondary px-1 rounded text-foreground">{partner.slice(0, 6)}...</span>
        </p>
        <div className="flex flex-col gap-3">
          <a href={chatLink} target="_blank" rel="noreferrer" className="bg-primary text-primary-foreground hover:bg-primary/90 py-3 px-6 rounded-xl font-bold shadow-lg transition-colors">
            💬 Chat on XMTP
          </a>
          <button onClick={onClose} className="bg-secondary text-secondary-foreground hover:bg-secondary/80 py-3 px-6 rounded-xl font-bold transition-colors">
            Keep Swiping
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [profiles, setProfiles] = useState<FarcasterUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [context, setContext] = useState<any>(undefined);

  const [myGender, setMyGender] = useState<"male" | "female" | null>(null);
  const [introStep, setIntroStep] = useState<1 | 2>(1);

  const [queueAddr, setQueueAddr] = useState<string[]>([]);
  const [queueLikes, setQueueLikes] = useState<boolean[]>([]);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [matchPartner, setMatchPartner] = useState<string | null>(null);

  const { isConnected, address } = useAccount();
  const { connectors, connect } = useConnect();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isWrongNetwork = isConnected && chainId !== base.id;
  const hasAttemptedAutoConnect = useRef(false);

  const { data: hash, writeContract, isPending, error: txError } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    const initFast = async () => {
      setMounted(true);
      if (typeof window !== "undefined") {
        const savedQueue = localStorage.getItem("baseDatingQueue");
        const savedGender = localStorage.getItem("baseDatingGender");
        if (savedQueue) {
          try {
            const parsed = JSON.parse(savedQueue);
            if (parsed?.addrs && Array.isArray(parsed.addrs)) {
              setQueueAddr(parsed.addrs);
              setQueueLikes(Array.isArray(parsed.likes) ? parsed.likes : []);
            }
          } catch (e) { console.warn(e); }
        }
        if (savedGender === "male" || savedGender === "female") setMyGender(savedGender);
      }
      setIsStorageLoaded(true);
      try {
        const ctx = await sdk.context;
        setContext(ctx);
        sdk.actions.ready();
      } catch (err) { console.log("Browser Mode"); }
    };
    initFast();
  }, []);

  useEffect(() => {
    const fetchUsersBg = async () => {
      if (!mounted) return;
      setIsLoadingUsers(true);
      try {
        const randomStart = Math.floor(Math.random() * 10000) + 1;
        const randomFids = Array.from({ length: 25 }, (_, i) => randomStart + i).join(",");
        
        const resp = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk?fids=${randomFids}`,
          { headers: { accept: "application/json", api_key: process.env.NEXT_PUBLIC_NEYNAR_API_KEY || "NEYNAR_API_DOCS" } }
        );
        const data = await resp.json();
        let combinedUsers: FarcasterUser[] = [];

        if (data?.users && Array.isArray(data.users)) {
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fcUsers: FarcasterUser[] = data.users.map((u: any) => {
              const ethAddr = u?.verified_addresses?.eth_addresses?.[0] ?? u?.custody_address;
              return {
                fid: u.fid,
                username: u.username,
                display_name: u.display_name ?? null,
                pfp_url: u.pfp_url ?? null,
                bio: u.profile?.bio?.text ?? `Farcaster OG @${u.username}`,
                custody_address: typeof ethAddr === "string" ? ethAddr : "",
                gender: Math.random() < 0.5 ? "female" : "male",
                type: "farcaster",
                location: u.profile?.location?.description || null, // ✅ Ambil Lokasi dari Farcaster
              } as FarcasterUser;
            })
            .filter((u: FarcasterUser) => !!u.pfp_url && !!u.custody_address && u.custody_address?.startsWith("0x"));
            
            combinedUsers = [...fcUsers];
        }

        // Gabungkan dengan User Base Manual
        combinedUsers = [...combinedUsers, ...BASE_USERS];

        // Acak
        for (let i = combinedUsers.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [combinedUsers[i], combinedUsers[j]] = [combinedUsers[j], combinedUsers[i]];
        }

        setProfiles(combinedUsers);
      } catch (e) { console.error(e); } finally { setIsLoadingUsers(false); }
    };
    if (mounted) fetchUsersBg();
  }, [mounted]);

  useEffect(() => {
    if (isStorageLoaded && typeof window !== "undefined") {
      const data = { addrs: queueAddr, likes: queueLikes };
      localStorage.setItem("baseDatingQueue", JSON.stringify(data));
      if (myGender) localStorage.setItem("baseDatingGender", myGender);
    }
  }, [queueAddr, queueLikes, myGender, isStorageLoaded]);

  useEffect(() => {
    if (mounted && context && !isConnected && !hasAttemptedAutoConnect.current) {
      hasAttemptedAutoConnect.current = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const injectedConnector = connectors.find((c) => (c as any)?.type === "injected") ?? connectors.find((c) => /(injected|meta|wallet|injected)/i.test((c as any)?.id ?? ""));
      if (injectedConnector) connect({ connector: injectedConnector });
    }
  }, [mounted, context, isConnected, connectors, connect]);

  const filteredProfiles = profiles
    .filter((p) => p.gender !== myGender)
    .filter((p) => !queueAddr.includes(p.custody_address ?? ""));

  useWatchContractEvent({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: DATING_ABI,
    eventName: "NewMatch",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onLogs(logs: any[]) {
      if (!address) return;
      const myAddr = address.toLowerCase();
      logs.forEach((log) => {
        const { user1, user2 } = log.args ?? {};
        if (!user1 || !user2) return;
        if (user1.toLowerCase() === myAddr || user2.toLowerCase() === myAddr) {
          setMatchPartner(user1.toLowerCase() === myAddr ? user2 : user1);
        }
      });
    },
  });

  const handleSwipe = (dir: string, profile: FarcasterUser) => {
    const liked = dir === "right";
    setQueueAddr((prev) => [...prev, profile.custody_address ?? ""]);
    setQueueLikes((prev) => [...prev, liked]);
    setProfiles((current) => current.filter((p) => p.custody_address !== profile.custody_address));
  };

  const handleSaveAction = () => {
    if (!isConnected) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const injectedConnector = connectors.find((c) => (c as any)?.type === "injected") ?? connectors.find((c) => /(injected|meta|wallet|injected)/i.test((c as any)?.id ?? ""));
      if (injectedConnector) connect({ connector: injectedConnector });
      else alert("No wallet found!");
      return;
    }
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: DATING_ABI,
      functionName: "batchSwipe",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      args: [queueAddr as any, queueLikes],
    });
  };

  useEffect(() => {
    if (isSuccess) {
      setQueueAddr([]);
      setQueueLikes([]);
      localStorage.removeItem("baseDatingQueue");
      alert("✅ Swipes Saved!");
    }
  }, [isSuccess]);

  if (!mounted) return null;

  if (isWrongNetwork) return (
    <main className="fixed inset-0 h-[100dvh] w-full flex flex-col items-center justify-center bg-background p-4 text-center">
      <h2 className="text-2xl font-bold text-destructive mb-2">Wrong Network ⚠️</h2>
      <button onClick={() => switchChain?.({ chainId: base.id })} className="bg-destructive text-destructive-foreground px-8 py-3 rounded-full font-bold">Switch Network</button>
    </main>
  );

  if (!myGender) return (
    <main className="fixed inset-0 h-[100dvh] w-full flex flex-col items-center justify-center bg-background p-6 text-center overflow-y-auto">
      {introStep === 1 ? (
        <div className="flex flex-col items-center max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-6xl mb-6 animate-bounce">🔵</div>
          <h1 className="text-3xl font-black text-primary mb-6">Welcome to<br />Base Dating</h1>
          <div className="bg-card border border-border rounded-2xl p-6 w-full shadow-sm mb-8 text-left space-y-4">
             <div className="flex gap-3"><span className="text-xl">🔥</span><p className="text-sm text-muted-foreground">Swipe Profiles (Left=❌, Right=💚)</p></div>
             <div className="flex gap-3"><span className="text-xl">⛽</span><p className="text-sm text-muted-foreground">Save gas by batching swipes</p></div>
             <div className="flex gap-3"><span className="text-xl">💬</span><p className="text-sm text-muted-foreground">Chat via XMTP if matched</p></div>
          </div>
          <button onClick={() => setIntroStep(2)} className="w-full bg-primary text-primary-foreground p-4 rounded-xl font-bold text-lg shadow-lg">Next</button>
        </div>
      ) : (
        <div className="flex flex-col items-center max-w-md w-full animate-in fade-in slide-in-from-right-4 duration-500">
          <h2 className="text-2xl font-bold text-foreground mb-6">Select Gender</h2>
          <div className="w-full space-y-3">
            <button onClick={() => setMyGender("male")} className="w-full bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 text-blue-700 dark:text-blue-300 p-4 rounded-xl font-bold">👨 I am a Man</button>
            <button onClick={() => setMyGender("female")} className="w-full bg-pink-100 dark:bg-pink-900/30 border-2 border-pink-500 text-pink-700 dark:text-pink-300 p-4 rounded-xl font-bold">👩 I am a Woman</button>
          </div>
          <button onClick={() => setIntroStep(1)} className="mt-6 text-xs text-muted-foreground underline">Back</button>
        </div>
      )}
    </main>
  );

  return (
    <main className="fixed inset-0 h-[100dvh] w-full bg-background flex flex-col items-center justify-center overflow-hidden touch-none text-foreground">
      {matchPartner && <MatchModal partner={matchPartner} onClose={() => setMatchPartner(null)} />}
      
      <div className="absolute top-4 left-4 z-50"><div className="bg-card/80 backdrop-blur-md border border-border text-xs px-3 py-1 rounded-full shadow-md">{isConnected ? `💰 ${balance ? Number(balance.formatted).toFixed(4) : "..."} ETH` : "Connecting..."}</div></div>
      <div className="absolute top-4 right-4 z-50"><div className={`px-3 py-1 rounded-full shadow text-sm font-mono border ${isPending ? "bg-orange-100 border-orange-300 text-orange-600" : "bg-card/80 border-border"}`}>{isPending ? "Confirming..." : `💾 ${queueAddr.length}/50`}</div></div>

      <div className="relative w-full h-full flex items-center justify-center z-10 pointer-events-none">
        <div className="relative w-64 h-80 pointer-events-auto">
          {isLoadingUsers && filteredProfiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full"><div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin"></div><p className="mt-4 text-muted-foreground animate-pulse">Finding people...</p></div>
          ) : filteredProfiles.length > 0 ? (
            filteredProfiles.map((profile) => <SwipeCard key={profile.custody_address ?? profile.fid} profile={profile} onSwipe={(dir) => handleSwipe(dir, profile)} />)
          ) : (
            <div className="text-center pointer-events-auto"><p className="text-muted-foreground mb-2">No more profiles! 💔</p><button onClick={() => window.location.reload()} className="bg-primary text-primary-foreground px-6 py-2 rounded-full shadow">Refresh</button></div>
          )}
        </div>
      </div>

      <div className="absolute top-1/2 w-full flex justify-between px-4 pointer-events-none transform -translate-y-1/2 opacity-20 dark:opacity-30">
         <div className="flex flex-col items-center"><span className="text-5xl">❌</span><span className="font-black text-destructive mt-2 text-xl">NOPE</span></div>
         <div className="flex flex-col items-center"><span className="text-5xl">💚</span><span className="font-black text-green-500 mt-2 text-xl">LIKE</span></div>
      </div>

      <div className="absolute bottom-8 w-full flex justify-center z-50 px-4 pointer-events-auto">
        <button onClick={handleSaveAction} disabled={isPending || (isConnected && queueAddr.length === 0)} className={`w-full max-w-xs py-4 rounded-full font-bold shadow-2xl transition hover:scale-105 active:scale-95 flex justify-center items-center gap-2 ${queueAddr.length >= 50 ? "bg-destructive text-destructive-foreground animate-bounce" : (isConnected && queueAddr.length === 0 ? "bg-muted text-muted-foreground cursor-default" : "bg-primary text-primary-foreground")}`}>{isPending ? "⏳ Processing..." : (!isConnected ? "🔌 Connect Wallet" : (queueAddr.length === 0 ? "Swipe to Start" : `Save Progress (${queueAddr.length})`))}</button>
      </div>
    </main>
  );
}