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

// Tipe data user yang diperluas dari komponen SwipeCard
type FarcasterUser = SwipeProfile & {
  fid: number;
  display_name?: string | null;
  bio?: string | null;
  gender: "male" | "female";
  type: "farcaster" | "base";
};

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

  // 1. INIT
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
          } catch (e) {
            console.warn("Failed to parse saved queue", e);
          }
        }
        if (savedGender === "male" || savedGender === "female") {
          setMyGender(savedGender);
        }
      }

      setIsStorageLoaded(true);

      try {
        const ctx = await sdk.context;
        setContext(ctx);
        sdk.actions.ready();
      } catch (err) {
        console.log("Browser Mode / No Context", err);
      }
    };

    initFast();
  }, []);

  // 2. FETCH USERS
  useEffect(() => {
    const fetchUsersBg = async () => {
      if (!mounted) return;
      setIsLoadingUsers(true);
      try {
        const randomStart = Math.floor(Math.random() * 10000) + 1;
        const randomFids = Array.from({ length: 25 }, (_, i) => randomStart + i).join(",");
        const resp = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk?fids=${randomFids}`,
          {
            headers: {
              accept: "application/json",
              api_key: process.env.NEXT_PUBLIC_NEYNAR_API_KEY || "NEYNAR_API_DOCS",
            },
          }
        );
        const data = await resp.json();
        if (data?.users && Array.isArray(data.users)) {
          const fcUsers: FarcasterUser[] = data.users
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((u: any) => {
              const ethAddr =
                u?.verified_addresses?.eth_addresses?.[0] ??
                u?.custody_address ??
                (u?.verified_addresses && Array.isArray(u.verified_addresses) ? u.verified_addresses[0] : undefined);

              const p: FarcasterUser = {
                fid: u.fid,
                username: u.username,
                display_name: u.display_name ?? null,
                pfp_url: u.pfp_url ?? null,
                bio: u.profile?.bio?.text ?? `Farcaster OG @${u.username}`,
                custody_address: typeof ethAddr === "string" ? ethAddr : "",
                gender: Math.random() < 0.5 ? "female" : "male",
                type: "farcaster",
              };
              return p;
            })
            .filter((u: FarcasterUser) => !!u.pfp_url && !!u.custody_address && u.custody_address.startsWith("0x") && u.custody_address !== "0x0000000000000000000000000000000000000000");

          // shuffle
          for (let i = fcUsers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [fcUsers[i], fcUsers[j]] = [fcUsers[j], fcUsers[i]];
          }

          setProfiles(fcUsers);
        }
      } catch (e) {
        console.error("Failed fetching users", e);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    if (mounted) fetchUsersBg();
  }, [mounted]);

  // 3. AUTO SAVE
  useEffect(() => {
    if (isStorageLoaded && typeof window !== "undefined") {
      const data = { addrs: queueAddr, likes: queueLikes };
      try {
        localStorage.setItem("baseDatingQueue", JSON.stringify(data));
        if (myGender) localStorage.setItem("baseDatingGender", myGender);
      } catch (e) {
        console.warn("Failed to persist queue", e);
      }
    }
  }, [queueAddr, queueLikes, myGender, isStorageLoaded]);

  // 4. AUTO CONNECT
  useEffect(() => {
    if (mounted && context && !isConnected && !hasAttemptedAutoConnect.current) {
      hasAttemptedAutoConnect.current = true;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const injectedConnector = connectors.find((c) => (c as any)?.type === "injected") ?? connectors.find((c) => /(injected|meta|wallet|injected)/i.test((c as any)?.id ?? ""));

      if (injectedConnector) {
        try {
          connect({ connector: injectedConnector });
        } catch (e) {
          console.warn("Auto-connect failed", e);
        }
      }
    }
  }, [mounted, context, isConnected, connectors, connect]);

  const filteredProfiles = profiles
    .filter((p) => p.gender !== myGender)
    .filter((p) => !queueAddr.includes(p.custody_address ?? ""));

  useWatchContractEvent({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: DATING_ABI,
    eventName: "NewMatch",
    onLogs(logs) {
      if (!address) return;
      const myAddr = address.toLowerCase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logs.forEach((log: any) => {
        try {
          const { user1, user2 } = log.args ?? {};
          if (!user1 || !user2) return;
          if (user1.toLowerCase() === myAddr || user2.toLowerCase() === myAddr) {
            const partner = user1.toLowerCase() === myAddr ? user2 : user1;
            setMatchPartner((prev) => prev ?? partner);
          }
        } catch (e) {
          console.error("Malformed match event", e);
        }
      });
    },
  });

  const handleSwipe = useCallback((dir: string, profile: FarcasterUser) => {
    const liked = dir === "right";
    setQueueAddr((prev) => {
      if (prev.includes(profile.custody_address ?? "")) return prev;
      if (prev.length >= 50) return prev;
      return [...prev, profile.custody_address ?? ""];
    });
    setQueueLikes((prev) => {
      if (prev.length >= 50) return prev;
      return [...prev, liked];
    });
    setProfiles((current) => current.filter((p) => p.custody_address !== profile.custody_address));
  }, []);

  const commitSwipes = useCallback(
    (addrs: string[], likes: boolean[]) => {
      if (!isConnected) {
        alert("Please connect your wallet before saving swipes.");
        return;
      }
      if (!addrs || addrs.length === 0) {
        alert("No swipes to commit.");
        return;
      }

      try {
        writeContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: DATING_ABI,
          functionName: "batchSwipe",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args: [addrs as any, likes],
        });
      } catch (e) {
        console.error("Failed to write contract", e);
      }
    },
    [isConnected, writeContract]
  );

  const handleSaveAction = () => {
    if (!isConnected) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const injectedConnector = connectors.find((c) => (c as any)?.type === "injected") ?? connectors.find((c) => /(injected|meta|wallet|injected)/i.test((c as any)?.id ?? ""));
      if (injectedConnector) {
        connect({ connector: injectedConnector });
        return;
      } else {
        alert("No wallet found!");
        return;
      }
    }
    if (queueAddr.length === 0) {
      alert("No swipes collected yet — swipe some profiles first!");
      return;
    }
    commitSwipes(queueAddr, queueLikes);
  };

  useEffect(() => {
    if (isSuccess) {
      setQueueAddr([]);
      setQueueLikes([]);
      try {
        localStorage.removeItem("baseDatingQueue");
      } catch (e) {}
      alert("✅ Swipes Saved! Gas Payment Successful.");
    }
  }, [isSuccess]);

  if (!mounted) return null;

  if (isWrongNetwork)
    return (
      <main className="fixed inset-0 h-[100dvh] w-full flex flex-col items-center justify-center bg-background p-4 text-center overflow-hidden touch-none">
        <h2 className="text-2xl font-bold text-destructive mb-2">Wrong Network ⚠️</h2>
        <button onClick={() => switchChain?.({ chainId: base.id })} className="bg-destructive text-destructive-foreground px-8 py-3 rounded-full font-bold shadow-lg hover:bg-destructive/90">
          🔀 Switch Network
        </button>
      </main>
    );

  // ONBOARDING
  if (!myGender)
    return (
      <main className="fixed inset-0 h-[100dvh] w-full flex flex-col items-center justify-center bg-background p-6 text-center overflow-y-auto touch-auto">
        {introStep === 1 && (
          <div className="flex flex-col items-center max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-6xl mb-6 animate-bounce">🔵</div>
            <h1 className="text-3xl font-black text-primary mb-6">Welcome to<br />Base Dating</h1>

            <div className="bg-card border border-border rounded-2xl p-6 w-full shadow-sm mb-8 text-left space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">🔥</span>
                <p className="text-sm text-muted-foreground">Swipe Farcaster user profiles<br /><span className="text-xs opacity-70">(Left = ❌, Right = 💚)</span></p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">⛽</span>
                <p className="text-sm text-muted-foreground">Collect up to 50 swipes, then pay gas fee in one batch</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">💬</span>
                <p className="text-sm text-muted-foreground">If matched (mutual like), you can chat via XMTP</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">⛓️</span>
                <p className="text-sm text-muted-foreground">Everything is securely stored on the Base blockchain</p>
              </div>
            </div>

            <button onClick={() => setIntroStep(2)} className="w-full bg-primary text-primary-foreground p-4 rounded-xl font-bold text-lg shadow-lg hover:bg-primary/90 transition-all">Next</button>
          </div>
        )}

        {introStep === 2 && (
          <div className="flex flex-col items-center max-w-md w-full animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-2xl font-bold text-foreground mb-6">How it works</h2>
            <div className="w-full space-y-3 mb-8">
              {["Select your gender", "Get random Farcaster profiles", "Swipe like/dislike (stored locally)", "Pay gas after 50 swipes to save on-chain", "Mutual likes = Match = Chat! 🚀"].map((text, i) => (
                <div key={i} className="flex items-center gap-3 bg-secondary/50 p-3 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                  <p className="text-sm text-left font-medium text-foreground">{text}</p>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground mb-4 font-medium">Select your gender to start:</p>
            <div className="w-full space-y-3">
              <button onClick={() => setMyGender("male")} className="w-full bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 text-blue-700 dark:text-blue-300 p-4 rounded-xl font-bold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all">👨 I am a Man</button>
              <button onClick={() => setMyGender("female")} className="w-full bg-pink-100 dark:bg-pink-900/30 border-2 border-pink-500 text-pink-700 dark:text-pink-300 p-4 rounded-xl font-bold hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-all">👩 I am a Woman</button>
            </div>
            <button onClick={() => setIntroStep(1)} className="mt-6 text-xs text-muted-foreground underline">Back to Intro</button>
          </div>
        )}
      </main>
    );

  return (
    <main className="fixed inset-0 h-[100dvh] w-full bg-background flex flex-col items-center justify-center overflow-hidden touch-none text-foreground">
      {matchPartner && <MatchModal partner={matchPartner} onClose={() => setMatchPartner(null)} />}

      {/* HEADER */}
      <div className="absolute top-4 left-4 z-50 pointer-events-auto">
        <div className="bg-card/80 backdrop-blur-md text-card-foreground border border-border text-xs px-3 py-1 rounded-full shadow-md flex items-center gap-2">
          {isConnected ? (
            <>💰 {balance ? `${Number(balance.formatted).toFixed(4)} ETH` : "..."}</>
          ) : (
            <span className="opacity-70 flex items-center gap-1"><span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span> Connecting...</span>
          )}
        </div>
      </div>

      {/* SWIPE COUNTER */}
      <div className="absolute top-4 right-4 z-50 pointer-events-auto">
        <div className={`px-3 py-1 rounded-full shadow text-sm font-mono border flex items-center gap-2 backdrop-blur-md ${isPending ? "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700" : "bg-card/80 border-border text-card-foreground"}`}>
          {isPending ? (
            <span className="text-orange-600 dark:text-orange-400 font-bold">Confirming...</span>
          ) : (
            txError ? <span className="text-destructive font-bold cursor-pointer" onClick={() => commitSwipes(queueAddr, queueLikes)}>❌ Retry?</span> : <span>💾 {queueAddr.length}/50</span>
          )}
        </div>
      </div>

      {/* CARD STACK */}
      <div className="relative w-full h-full flex items-center justify-center pointer-events-none z-10">
        <div className="relative w-64 h-80 pointer-events-auto">
          {isLoadingUsers && filteredProfiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
              <p className="mt-4 text-muted-foreground animate-pulse">Finding people...</p>
            </div>
          ) : filteredProfiles.length > 0 ? (
            filteredProfiles.map((profile) => (
              <SwipeCard
                key={profile.custody_address ?? profile.fid}
                profile={profile}
                onSwipe={(dir) => handleSwipe(dir, profile)}
              />
            ))
          ) : (
            <div className="text-center pointer-events-auto">
              <p className="text-muted-foreground text-lg mb-2">No more profiles! 💔</p>
              <button onClick={() => window.location.reload()} className="bg-primary text-primary-foreground px-6 py-2 rounded-full mb-4 shadow hover:bg-primary/90 transition-colors">Refresh Users</button>
            </div>
          )}
        </div>
      </div>

      {/* VISUAL HINTS (Static) */}
      <div className="absolute top-1/2 w-full flex justify-between px-4 pointer-events-none z-0 transform -translate-y-1/2">
        <div className="flex flex-col items-center opacity-20 dark:opacity-30">
          <span className="text-5xl">❌</span>
          <span className="font-black text-destructive tracking-widest mt-2 text-xl">NOPE</span>
        </div>
        <div className="flex flex-col items-center opacity-20 dark:opacity-30">
          <span className="text-5xl">💚</span>
          <span className="font-black text-green-500 tracking-widest mt-2 text-xl">LIKE</span>
        </div>
      </div>

      {/* FLOATING SAVE BUTTON - PERBAIKAN WARNA TEKS */}
      <div className="absolute bottom-8 w-full flex justify-center z-50 px-4 pointer-events-auto">
        <button
          onClick={handleSaveAction}
          disabled={isPending || (isConnected && queueAddr.length === 0)}
          // 👇 PERUBAHAN DISINI:
          // 1. Hapus 'text-white' dari string utama.
          // 2. Tambahkan warna teks eksplisit di setiap kondisi (text-destructive-foreground, text-muted-foreground, text-primary-foreground)
          className={`w-full max-w-xs py-4 rounded-full font-bold shadow-2xl transform transition hover:scale-105 active:scale-95 flex justify-center items-center gap-2 ${
            queueAddr.length >= 50
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 animate-bounce"
              : (isConnected && queueAddr.length === 0
                  ? "bg-muted text-muted-foreground cursor-default shadow-none"
                  : "bg-primary text-primary-foreground hover:bg-primary/90")
          } ${isPending ? "opacity-70 cursor-not-allowed animate-none" : ""}`}
        >
          {isPending ? "⏳ Processing..." : (!isConnected ? "🔌 Connect Wallet" : (queueAddr.length === 0 ? "Swipe to Start" : (queueAddr.length >= 50 ? "⛽ Pay Gas Now" : `Save Progress (${queueAddr.length})`)))}
        </button>
      </div>
    </main>
  );
}