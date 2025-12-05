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
import { Wallet, MessageCircle } from "lucide-react"; 
import SwipeCard, { Profile as SwipeProfile } from "../components/SwipeCard";
import { CONTRACT_ADDRESS, DATING_ABI } from "../constants";

type FarcasterUser = SwipeProfile & {
  fid: number;
  display_name?: string | null;
  bio?: string | null;
  gender: "male" | "female";
  type: "farcaster" | "base";
  location?: string | null;
};

// Helper: Get "Country/Region" from location string
const getBroadLocation = (loc?: string | null) => {
  if (!loc) return "";
  const parts = loc.split(",");
  return parts[parts.length - 1].trim().toLowerCase();
};

// Helper: Check if the user is opening in Warpcast
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isWarpcastClient = (context: any) => {
  return context?.client?.clientFid === 9152;
};

// MATCH MODAL COMPONENT
function MatchModal({ 
  partner, 
  isWarpcast, 
  onClose 
}: { 
  partner: FarcasterUser; 
  isWarpcast: boolean; 
  onClose: () => void 
}) {
  const chatLink = isWarpcast 
    ? `https://warpcast.com/~/inbox/create/${partner.fid}`
    : `https://xmttp.chat/dm/${partner.custody_address}`;

  const buttonText = isWarpcast ? "Chat on Warpcast" : "Chat on XMTP";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in zoom-in p-4 touch-auto">
      <div className="bg-white dark:bg-neutral-900 border-2 border-primary/20 p-6 rounded-3xl text-center max-w-sm w-full shadow-2xl relative overflow-hidden">
        
        {/* Glow Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-pink-500/20 blur-3xl rounded-full pointer-events-none"></div>

        <div className="text-6xl mb-4 animate-bounce relative z-10">💖</div>
        
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600 mb-2 relative z-10">
          IT'S A MATCH!
        </h2>
        
        <p className="text-muted-foreground mb-6 text-sm relative z-10">
          You matched with <span className="font-bold text-foreground">{partner.display_name || partner.username}</span>!
        </p>
        
        <div className="flex flex-col gap-3 relative z-10">
          <a 
            href={chatLink} 
            target="_blank" 
            rel="noreferrer" 
            className="bg-primary text-primary-foreground hover:bg-primary/90 py-3 px-6 rounded-xl font-bold shadow-lg transition-colors transform active:scale-95 flex items-center justify-center gap-2"
          >
            <MessageCircle size={20} /> {buttonText}
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
  const [myLocation, setMyLocation] = useState<string | null>(null);

  const [myGender, setMyGender] = useState<"male" | "female" | null>(null);
  const [introStep, setIntroStep] = useState<1 | 2>(1);

  const [queueAddr, setQueueAddr] = useState<string[]>([]);
  const [queueLikes, setQueueLikes] = useState<boolean[]>([]);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [matchPartner, setMatchPartner] = useState<FarcasterUser | null>(null);

  const { isConnected, address } = useAccount();
  const { connectors, connect } = useConnect();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isWrongNetwork = isConnected && chainId !== base.id;
  const hasAttemptedAutoConnect = useRef(false);

  const { data: hash, writeContract, isPending, error: txError } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  // 1. INIT & GET MY LOCATION
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

        if (ctx?.user?.fid) {
           try {
             const myResp = await fetch(
               `https://api.neynar.com/v2/farcaster/user/bulk?fids=${ctx.user.fid}`, 
               { headers: { accept: "application/json", api_key: process.env.NEXT_PUBLIC_NEYNAR_API_KEY || "NEYNAR_API_DOCS" } }
             );
             const myData = await myResp.json();
             const myLoc = myData?.users?.[0]?.profile?.location?.description;
             if (myLoc) setMyLocation(myLoc);
           } catch (err) { console.error(err); }
        }
      } catch (err) { console.log("Browser Mode"); }
    };
    initFast();
  }, []);

  // 2. FETCH USERS + LOCATION SORTING
  useEffect(() => {
    const fetchUsersBg = async () => {
      if (!mounted) return;
      setIsLoadingUsers(true);
      try {
        const randomStart = Math.floor(Math.random() * 50000) + 1;
        const randomFids = Array.from({ length: 50 }, (_, i) => randomStart + i).join(",");
        
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
                location: u.profile?.location?.description || null,
              } as FarcasterUser;
            })
            .filter((u: FarcasterUser) => !!u.pfp_url && !!u.custody_address && u.custody_address?.startsWith("0x"));
            
            combinedUsers = [...fcUsers];
        }

        // 👇 LOCATION SORTING LOGIC (Same Country Priority)
        if (myLocation) {
            const myCountry = getBroadLocation(myLocation);
            combinedUsers.sort((a, b) => {
              const countryA = getBroadLocation(a.location);
              const countryB = getBroadLocation(b.location);
              const matchA = countryA && myCountry && (countryA.includes(myCountry) || myCountry.includes(countryA));
              const matchB = countryB && myCountry && (countryB.includes(myCountry) || myCountry.includes(countryB));
              
              if (matchA && !matchB) return 1; 
              if (!matchA && matchB) return -1;
              return 0;
            });
        } else {
            // Regular Shuffle
            for (let i = combinedUsers.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [combinedUsers[i], combinedUsers[j]] = [combinedUsers[j], combinedUsers[i]];
            }
        }

        setProfiles(combinedUsers);
      } catch (e) { console.error(e); } finally { setIsLoadingUsers(false); }
    };
    if (mounted) fetchUsersBg();
  }, [mounted, myLocation]);

  // Auto Save & Connect Logic
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

  // Real Match Listener
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
          const partnerAddr = user1.toLowerCase() === myAddr ? user2 : user1;
          const foundProfile = profiles.find(p => p.custody_address?.toLowerCase() === partnerAddr.toLowerCase());
          
          if (foundProfile) {
            setMatchPartner(foundProfile);
          } else {
            setMatchPartner({
               fid: 0, 
               username: "Unknown", 
               display_name: "Match!", 
               custody_address: partnerAddr, 
               gender: "male",
               type: "base"
            });
          }
        }
      });
    },
  });

  const handleSwipe = useCallback((dir: string, profile: FarcasterUser) => {
    const liked = dir === "right";
    
    // 👇 SMART MATCH LOGIC + DELAY
    if (liked) {
       // Check if location MATCH (Same Country/Region)
       const myCountry = getBroadLocation(myLocation);
       const userCountry = getBroadLocation(profile.location);
       
       const isLocationMatch = myCountry && userCountry && (myCountry.includes(userCountry) || userCountry.includes(myCountry));
       
       // New Rules:
       // 1. SAME Location = 60% chance of Match (Makes sense, but not always a match)
       // 2. DIFFERENT Location = 5% chance of Match (Very rare)
       const matchChance = isLocationMatch ? 0.6 : 0.05;
       
       if (Math.random() < matchChance) {
          setTimeout(() => {
             setMatchPartner(profile);
          }, 2000); // 2 Second Delay
       }
    }

    setQueueAddr((prev) => [...prev, profile.custody_address ?? ""]);
    setQueueLikes((prev) => [...prev, liked]);
    setProfiles((current) => current.filter((p) => p.custody_address !== profile.custody_address));
  }, [myLocation]); // myLocation dependency is required for the logic to work

  const handleSaveAction = () => {
    if (!isConnected) {
      // Find injected connector (e.g., Metamask, WalletConnect)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const injectedConnector = connectors.find((c) => (c as any)?.type === "injected") ?? connectors.find((c) => /(injected|meta|wallet|injected)/i.test((c as any)?.id ?? ""));
      if (injectedConnector) connect({ connector: injectedConnector });
      else alert("No wallet found!");
      return;
    }
    if (queueAddr.length === 0) { alert("Swipe first!"); return; }
    
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
             <div className="flex gap-3"><span className="text-xl">📍</span><p className="text-sm text-muted-foreground">Smart Matching by Location</p></div>
             <div className="flex gap-3"><span className="text-xl">💬</span><p className="text-sm text-muted-foreground">Chat via Warpcast / XMTP</p></div>
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
      {/* Pass isWarpcast to Modal */}
      {matchPartner && (
        <MatchModal 
          partner={matchPartner} 
          isWarpcast={isWarpcastClient(context)}
          onClose={() => setMatchPartner(null)} 
        />
      )}
      
      <div className="absolute top-4 left-4 z-50"><div className="bg-card/80 backdrop-blur-md border border-border text-xs px-3 py-1 rounded-full shadow-md">{isConnected ? `💰 ${balance ? Number(balance.formatted).toFixed(4) : "..."} ETH` : "Connecting..."}</div></div>
      <div className="absolute top-4 right-4 z-50"><div className={`px-3 py-1 rounded-full shadow text-sm font-mono border ${isPending ? "bg-orange-100 border-orange-300 text-orange-600" : "bg-card/80 border-border"}`}>{isPending ? "⏳ Processing..." : `💾 ${queueAddr.length}/50`}</div></div>

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
        <button onClick={handleSaveAction} disabled={isPending || (isConnected && queueAddr.length === 0)} className={`w-full max-w-xs py-4 rounded-full font-bold shadow-2xl transition hover:scale-105 active:scale-95 flex justify-center items-center gap-2 ${queueAddr.length >= 50 ? "bg-destructive text-destructive-foreground animate-bounce" : (isConnected && queueAddr.length === 0 ? "bg-muted text-muted-foreground cursor-default" : "bg-primary text-primary-foreground")}`}>{isPending ? "⏳ Processing..." : (!isConnected ? <span className="flex items-center gap-2"><Wallet className="w-5 h-5" /> Connect Wallet</span> : (queueAddr.length === 0 ? "Swipe to Start" : `Save Progress (${queueAddr.length})`))}</button>
      </div>
    </main>
  );
}