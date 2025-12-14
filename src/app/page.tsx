"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import sdk from "@farcaster/frame-sdk";
import {
  useAccount,
  useConnect,
  useWatchContractEvent,
  useChainId,
  useSwitchChain,
  useBalance,
  useSendCalls,
  useWriteContract, // 👇 Import hook standard
} from "wagmi";
import { encodeFunctionData } from "viem";
import { Attribution } from "ox/erc8021";
import { base } from "wagmi/chains";

import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import ChatBubbleRoundedIcon from '@mui/icons-material/ChatBubbleRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import ManRoundedIcon from '@mui/icons-material/ManRounded';
import WomanRoundedIcon from '@mui/icons-material/WomanRounded';

import SwipeCard, { Profile as SwipeProfile } from "../components/SwipeCard";
import { CONTRACT_ADDRESS, DATING_ABI } from "../constants";
import { METADATA } from "../lib/utils";

type FarcasterUser = SwipeProfile & {
  fid: number;
  display_name?: string | null;
  bio?: string | null;
  gender: "male" | "female";
  type: "farcaster" | "base";
  location?: string | null;
};

const getBroadLocation = (loc?: string | null) => {
  if (!loc) return "";
  const parts = loc.split(",");
  return parts[parts.length - 1].trim().toLowerCase();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isWarpcastClient = (context: any) => {
  return context?.client?.clientFid === 9152;
};

// MATCH MODAL
function MatchModal({ partner, isWarpcast, onClose }: { partner: FarcasterUser; isWarpcast: boolean; onClose: () => void }) {
  let chatLink = "";
  let buttonText = "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ButtonIcon: any = ChatBubbleRoundedIcon;

  if (isWarpcast) {
    chatLink = `https://warpcast.com/~/inbox/create/${partner.fid}`;
    buttonText = "Chat on Warpcast";
    ButtonIcon = ChatBubbleRoundedIcon;
  } else {
    if (partner.username && partner.username !== "Unknown") {
      chatLink = `https://warpcast.com/${partner.username}`;
    } else {
      chatLink = `https://basescan.org/address/${partner.custody_address}`;
    }
    buttonText = "View Profile";
    ButtonIcon = PersonRoundedIcon;
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in zoom-in p-4 touch-auto">
      <div className="bg-white dark:bg-neutral-900 border-2 border-primary/20 p-6 rounded-3xl text-center max-w-sm w-full shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-pink-500/20 blur-3xl rounded-full pointer-events-none"></div>
        <div className="text-6xl mb-4 animate-bounce relative z-10">💖</div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600 mb-2 relative z-10">IT'S A MATCH!</h2>
        <p className="text-muted-foreground mb-6 text-sm relative z-10">You matched with <span className="font-bold text-foreground">{partner.display_name || partner.username}</span>!</p>
        <div className="flex flex-col gap-3 relative z-10">
          <a href={chatLink} target="_blank" rel="noreferrer" className="bg-primary text-primary-foreground hover:bg-primary/90 py-3 px-6 rounded-xl font-bold shadow-lg transition-colors transform active:scale-95 flex items-center justify-center gap-2"><ButtonIcon /> {buttonText}</a>
          <button onClick={onClose} className="bg-secondary text-secondary-foreground hover:bg-secondary/80 py-3 px-6 rounded-xl font-bold transition-colors">Keep Swiping</button>
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
  const [saveCount, setSaveCount] = useState<number>(0); 
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

  // 👇 Hooks Transaksi
  const { sendCallsAsync, isPending: isSmartPending } = useSendCalls();
  const { writeContractAsync, isPending: isStandardPending } = useWriteContract();
  
  const isPending = isSmartPending || isStandardPending;

  // INIT
  useEffect(() => {
    const initFast = async () => {
      setMounted(true);
      if (typeof window !== "undefined") {
        const savedQueue = localStorage.getItem("baseDatingQueue");
        const savedGender = localStorage.getItem("baseDatingGender");
        const savedCount = localStorage.getItem("baseDatingSaveCount");

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
        if (savedCount) setSaveCount(parseInt(savedCount) || 0);
      }
      setIsStorageLoaded(true);

      try {
        const ctx = await sdk.context;
        setContext(ctx);
        sdk.actions.ready();

        let locationFound = false;
        if (ctx?.user?.fid) {
           try {
             const myResp = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${ctx.user.fid}`, { headers: { accept: "application/json", api_key: process.env.NEXT_PUBLIC_NEYNAR_API_KEY || "NEYNAR_API_DOCS" } });
             const myData = await myResp.json();
             const myLoc = myData?.users?.[0]?.profile?.location?.description;
             if (myLoc) { setMyLocation(myLoc); locationFound = true; }
           } catch (err) { console.error("Neynar error:", err); }
        }

        if (!locationFound) {
            try {
                const ipResp = await fetch('https://ipapi.co/json/');
                const ipData = await ipResp.json();
                if (ipData && ipData.country_name) setMyLocation(ipData.country_name); 
            } catch (ipErr) { console.error("IP Location error:", ipErr); }
        }
      } catch (err) { console.log("Browser Mode"); }
    };
    initFast();
  }, []);

  // FETCH USERS
  useEffect(() => {
    const fetchUsersBg = async () => {
      if (!mounted) return;
      setIsLoadingUsers(true);
      try {
        const randomStart = Math.floor(Math.random() * 50000) + 1;
        const randomFids = Array.from({ length: 50 }, (_, i) => randomStart + i).join(",");
        const resp = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${randomFids}`, { headers: { accept: "application/json", api_key: process.env.NEXT_PUBLIC_NEYNAR_API_KEY || "NEYNAR_API_DOCS" } });
        const data = await resp.json();
        let combinedUsers: FarcasterUser[] = [];

        if (data?.users && Array.isArray(data.users)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fcUsers: FarcasterUser[] = data.users.map((u: any) => {
              const ethAddr = u?.verified_addresses?.eth_addresses?.[0] ?? u?.custody_address;
              return {
                fid: u.fid, username: u.username, display_name: u.display_name ?? null, pfp_url: u.pfp_url ?? null,
                bio: u.profile?.bio?.text ?? `Farcaster OG @${u.username}`, custody_address: typeof ethAddr === "string" ? ethAddr : "",
                gender: Math.random() < 0.5 ? "female" : "male", type: "farcaster", location: u.profile?.location?.description || null,
              } as FarcasterUser;
            }).filter((u: FarcasterUser) => !!u.pfp_url && !!u.custody_address && u.custody_address?.startsWith("0x"));
            combinedUsers = [...fcUsers];
        }

        if (myLocation) {
            const myCountry = getBroadLocation(myLocation);
            combinedUsers.sort((a, b) => {
              const countryA = getBroadLocation(a.location); const countryB = getBroadLocation(b.location);
              const matchA = countryA && myCountry && (countryA.includes(myCountry) || myCountry.includes(countryA));
              const matchB = countryB && myCountry && (countryB.includes(myCountry) || myCountry.includes(countryB));
              if (matchA && !matchB) return 1; if (!matchA && matchB) return -1; return 0;
            });
        } else {
            for (let i = combinedUsers.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1)); [combinedUsers[i], combinedUsers[j]] = [combinedUsers[j], combinedUsers[i]];
            }
        }
        setProfiles(combinedUsers);
      } catch (e) { console.error(e); } finally { setIsLoadingUsers(false); }
    };
    if (mounted) fetchUsersBg();
  }, [mounted, myLocation]);

  // STORAGE & CONNECT
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
      const farcasterConnector = connectors.find((c) => c.name === "Farcaster Mini App");
      if (farcasterConnector) connect({ connector: farcasterConnector });
      else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const injectedConnector = connectors.find((c) => (c as any)?.type === "injected") ?? connectors.find((c) => /(injected|meta|wallet|injected)/i.test((c as any)?.id ?? ""));
          if (injectedConnector) connect({ connector: injectedConnector });
      }
    }
  }, [mounted, context, isConnected, connectors, connect]); 

  const filteredProfiles = profiles.filter((p) => p.gender !== myGender).filter((p) => !queueAddr.includes(p.custody_address ?? ""));

  useWatchContractEvent({
    address: CONTRACT_ADDRESS as `0x${string}`, abi: DATING_ABI, eventName: "NewMatch",
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
          if (foundProfile) setMatchPartner(foundProfile);
          else setMatchPartner({ fid: 0, username: "Unknown", display_name: "Match!", custody_address: partnerAddr, gender: "male", type: "base", pfp_url: null });
        }
      });
    },
  });

  const handleSwipe = useCallback((dir: string, profile: FarcasterUser) => {
    const liked = dir === "right";
    if (liked) {
       const myCountry = getBroadLocation(myLocation); const userCountry = getBroadLocation(profile.location);
       const isLocationMatch = myCountry && userCountry && (myCountry.includes(userCountry) || userCountry.includes(myCountry));
       let matchChance = isLocationMatch ? 0.6 : 0.05;
       if (saveCount >= 5) { matchChance += 0.2; if (matchChance > 0.9) matchChance = 0.9; }
       if (Math.random() < matchChance) setTimeout(() => { setMatchPartner(profile); }, 1500); 
    }
    setQueueAddr((prev) => [...prev, profile.custody_address ?? ""]);
    setQueueLikes((prev) => [...prev, liked]);
    setProfiles((current) => current.filter((p) => p.custody_address !== profile.custody_address));
  }, [myLocation, saveCount]);

  // 👇 DUAL MODE HANDLER: Smart Wallet First -> Fallback Standard
  const handleSaveAction = async () => {
    if (!isConnected) {
      const farcasterConnector = connectors.find((c) => c.name === "Farcaster Mini App");
      if (farcasterConnector) connect({ connector: farcasterConnector });
      else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const injectedConnector = connectors.find((c) => (c as any)?.type === "injected") ?? connectors.find((c) => /(injected|meta|wallet|injected)/i.test((c as any)?.id ?? ""));
          if (injectedConnector) connect({ connector: injectedConnector });
          else alert("No wallet found!");
      }
      return;
    }
    if (queueAddr.length === 0) { alert("Swipe first!"); return; }
    
    try {
      // 1. Try Smart Wallet (For Attribution)
      try {
        console.log("Attempting Smart Wallet save...");
        const calldata = encodeFunctionData({
          abi: DATING_ABI,
          functionName: "batchSwipe",
          args: [queueAddr as `0x${string}`[], queueLikes],
        });

        const result = await sendCallsAsync({
          calls: [{
            to: CONTRACT_ADDRESS as `0x${string}`,
            data: calldata,
          }],
          capabilities: {
             dataSuffix: Attribution.toDataSuffix({ codes: ["bc_9x9dywpq"] }),
          }
        });
        
        const txId = result; 
        console.log("Smart Wallet Success:", txId);
        
        const newCount = saveCount + 1;
        setSaveCount(newCount);
        localStorage.setItem("baseDatingSaveCount", newCount.toString());
        setQueueAddr([]); setQueueLikes([]); localStorage.removeItem("baseDatingQueue");
        
        const displayId = typeof txId === 'string' ? txId : JSON.stringify(txId);
        alert(`✅ Saved (Smart Wallet)! ID: ${displayId.slice(0,8)}...`);
        return;

      } catch (smartError) {
         console.warn("Smart wallet failed, fallback to standard...", smartError);
         // Continue to standard write
      }

      // 2. Fallback: Standard Write Contract
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: DATING_ABI,
        functionName: "batchSwipe",
        args: [queueAddr as `0x${string}`[], queueLikes],
      });

      console.log("Standard Transaction Hash:", hash);
      const newCount = saveCount + 1;
      setSaveCount(newCount);
      localStorage.setItem("baseDatingSaveCount", newCount.toString());
      setQueueAddr([]); setQueueLikes([]); localStorage.removeItem("baseDatingQueue");
      
      alert(`✅ Saved (Standard Wallet)! Hash: ${hash.slice(0,8)}...`);

    } catch (err) {
      console.error("All transaction methods failed:", err);
      // alert("Transaction failed.");
    }
  };

  const handleShare = useCallback(() => {
    try { sdk.actions.composeCast({ text: "I'm finding my on-chain match on Base Dating! 💙\n\nCheck it out:", embeds: [METADATA.homeUrl] }); } 
    catch (e) { console.error("Share failed", e); if (typeof window !== "undefined") window.open(`https://warpcast.com/~/compose?text=Find+your+on-chain+match!&embeds[]=${METADATA.homeUrl}`, "_blank"); }
  }, []);

  const handleAddApp = useCallback(() => {
    try { sdk.actions.addFrame(); } 
    catch (e) { console.error("Add app failed", e); alert("Please open this in Warpcast or Base App to add it!"); }
  }, []);

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
             <div className="flex gap-3 items-center"><LocalFireDepartmentRoundedIcon className="text-orange-500" /><p className="text-sm text-muted-foreground">Swipe Profiles (Left=<CloseRoundedIcon fontSize="small" className="text-red-500 align-middle"/>, Right=<FavoriteRoundedIcon fontSize="small" className="text-green-500 align-middle"/>)</p></div>
             <div className="flex gap-3 items-center"><LocationOnRoundedIcon className="text-blue-500" /><p className="text-sm text-muted-foreground">Smart Matching by Location</p></div>
             <div className="flex gap-3 items-center"><ChatBubbleRoundedIcon className="text-purple-500" /><p className="text-sm text-muted-foreground">Chat via Farcaster</p></div>
          </div>
          <button onClick={() => setIntroStep(2)} className="w-full bg-primary text-primary-foreground p-4 rounded-xl font-bold text-lg shadow-lg">Next</button>
        </div>
      ) : (
        <div className="flex flex-col items-center max-w-md w-full animate-in fade-in slide-in-from-right-4 duration-500">
          <h2 className="text-2xl font-bold text-foreground mb-6">Select Gender</h2>
          <div className="w-full space-y-3">
            <button onClick={() => setMyGender("male")} className="w-full bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 text-blue-700 dark:text-blue-300 p-4 rounded-xl font-bold flex items-center justify-center gap-2"><ManRoundedIcon /> I am a Man</button>
            <button onClick={() => setMyGender("female")} className="w-full bg-pink-100 dark:bg-pink-900/30 border-2 border-pink-500 text-pink-700 dark:text-pink-300 p-4 rounded-xl font-bold flex items-center justify-center gap-2"><WomanRoundedIcon /> I am a Woman</button>
          </div>
          <button onClick={() => setIntroStep(1)} className="mt-6 text-xs text-muted-foreground underline">Back</button>
        </div>
      )}
    </main>
  );

  return (
    <main className="fixed inset-0 h-[100dvh] w-full bg-background flex flex-col items-center justify-center overflow-hidden touch-none text-foreground">
      {matchPartner && <MatchModal partner={matchPartner} isWarpcast={isWarpcastClient(context)} onClose={() => setMatchPartner(null)} />}
      
      <div className="absolute top-4 left-4 z-50"><div className="bg-card/80 backdrop-blur-md border border-border text-xs px-3 py-1 rounded-full shadow-md">{isConnected ? `💰 ${balance ? Number(balance.formatted).toFixed(4) : "..."} ETH` : "Connecting..."}</div></div>
      
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <button onClick={handleAddApp} className="bg-card/80 backdrop-blur-md border border-border p-2 rounded-full shadow-md text-foreground hover:bg-primary/10 transition-colors" title="Add Mini App"><AddRoundedIcon /></button>
        <button onClick={handleShare} className="bg-card/80 backdrop-blur-md border border-border p-2 rounded-full shadow-md text-foreground hover:bg-primary/10 transition-colors" title="Share App"><ShareRoundedIcon /></button>
        <div className={`px-3 py-1.5 rounded-full shadow text-sm font-mono border ${isPending ? "bg-orange-100 border-orange-300 text-orange-600" : "bg-card/80 border-border"}`}>{isPending ? "⏳" : `💾 ${queueAddr.length}/50`}</div>
      </div>

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
         <div className="flex flex-col items-center"><CloseRoundedIcon sx={{ fontSize: 60 }} className="text-destructive" /><span className="font-black text-destructive mt-2 text-xl">NOPE</span></div>
         <div className="flex flex-col items-center"><FavoriteRoundedIcon sx={{ fontSize: 60 }} className="text-green-500" /><span className="font-black text-green-500 mt-2 text-xl">LIKE</span></div>
      </div>

      <div className="absolute bottom-8 w-full flex justify-center z-50 px-4 pointer-events-auto">
        <button onClick={handleSaveAction} disabled={isPending || (isConnected && queueAddr.length === 0)} className={`w-full max-w-xs py-4 rounded-full font-bold shadow-2xl transition hover:scale-105 active:scale-95 flex justify-center items-center gap-2 ${queueAddr.length >= 50 ? "bg-destructive text-destructive-foreground animate-bounce" : (isConnected && queueAddr.length === 0 ? "bg-muted text-muted-foreground cursor-default" : "bg-primary text-primary-foreground")}`}>
          {isPending ? "⏳ Processing..." : (!isConnected ? <span className="flex items-center gap-2"><AccountBalanceWalletRoundedIcon /> Connect Wallet</span> : (queueAddr.length === 0 ? "Swipe to Start" : `Save Progress (${queueAddr.length})`))}
        </button>
      </div>
    </main>
  );
}