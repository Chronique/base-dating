"use client";

import { useState, useEffect, useRef } from "react";
import sdk from "@farcaster/frame-sdk";
import { 
  useWriteContract, 
  useWaitForTransactionReceipt, 
  useAccount, 
  useConnect, 
  useWatchContractEvent, 
  useChainId, 
  useSwitchChain,
  useBalance 
} from "wagmi";
import { base } from "wagmi/chains"; 
import { SwipeCard } from "../components/SwipeCard"; 
import { CONTRACT_ADDRESS, DATING_ABI } from "../constants";

type FarcasterUser = {
  fid: number;
  username: string;
  pfp_url: string; // <--- PASTIKAN INI pfp_url
  custody_address: string;
  display_name: string;
  bio: string; 
  gender: 'male' | 'female';
  type: 'farcaster' | 'base';
};

function MatchModal({ partner, onClose }: { partner: string, onClose: () => void }) {
    const chatLink = `https://xmttp.chat/dm/${partner}`; 
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in zoom-in p-4">
            <div className="bg-white p-6 rounded-3xl text-center max-w-sm w-full shadow-2xl relative overflow-hidden">
                <div className="text-6xl mb-4 animate-bounce">💖</div>
                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-2">IT'S A MATCH!</h2>
                <p className="text-gray-500 mb-6 text-sm">You matched with <span className="font-mono bg-gray-100 px-1 rounded">{partner.slice(0,6)}...</span></p>
                <div className="flex flex-col gap-3">
                    <a href={chatLink} target="_blank" rel="noreferrer" className="bg-blue-600 text-white py-3 px-6 rounded-xl font-bold shadow-lg">💬 Chat on XMTP</a>
                    <button onClick={onClose} className="bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-bold">Keep Swiping</button>
                </div>
            </div>
        </div>
    );
}

export default function Home() {
  const [profiles, setProfiles] = useState<FarcasterUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [context, setContext] = useState<any>();

  const [myGender, setMyGender] = useState<'male' | 'female' | null>(null);
  const [queueAddr, setQueueAddr] = useState<string[]>([]);
  const [queueLikes, setQueueLikes] = useState<boolean[]>([]);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [matchPartner, setMatchPartner] = useState<string | null>(null);

  const { isConnected, address } = useAccount();
  const { connectors, connect, error: connectError } = useConnect();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isWrongNetwork = isConnected && chainId !== base.id;
  const hasAttemptedAutoConnect = useRef(false);

  const filteredConnectors = connectors.filter((c) => 
    c.id === 'coinbaseWalletSDK' || c.name.toLowerCase().includes('metamask') || c.id === 'injected'
  );

  const { data: hash, writeContract, isPending, error: txError } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  // 1. INIT
  useEffect(() => {
    const initFast = async () => {
      setMounted(true);
      if (typeof window !== 'undefined') {
          const savedQueue = localStorage.getItem('baseDatingQueue');
          const savedGender = localStorage.getItem('baseDatingGender');
          if (savedQueue) {
              try {
                  const parsed = JSON.parse(savedQueue);
                  if (parsed.addrs) { setQueueAddr(parsed.addrs); setQueueLikes(parsed.likes); }
              } catch (e) {}
          }
          if (savedGender) setMyGender(savedGender as 'male' | 'female');
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

  // 2. FETCH USERS
  useEffect(() => {
    const fetchUsersBg = async () => {
      if (!mounted) return;
      setIsLoadingUsers(true);
      try {
        const randomStart = Math.floor(Math.random() * 10000) + 1;
        const randomFids = Array.from({ length: 70 }, (_, i) => randomStart + i).join(',');
        const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${randomFids}`, {
            headers: { accept: 'application/json', api_key: process.env.NEXT_PUBLIC_NEYNAR_API_KEY || 'NEYNAR_API_DOCS' }
        });
        const data = await response.json();
        if (data.users) {
            const fcUsers: FarcasterUser[] = data.users.map((u: any, index: number) => ({
                fid: u.fid, username: u.username, display_name: u.display_name, 
                pfp_url: u.pfp_url, // Gunakan pfp_url
                bio: u.profile?.bio?.text || `Farcaster OG @${u.username}`, 
                custody_address: u.verified_addresses.eth_addresses[0] || u.custody_address,
                gender: index % 2 === 0 ? 'female' : 'male', type: 'farcaster' as const
            }));
            const cleanUsers = fcUsers.filter(u => u.pfp_url && u.custody_address && u.custody_address.startsWith('0x') && u.custody_address !== '0x0000000000000000000000000000000000000000');
            cleanUsers.sort(() => Math.random() - 0.5);
            setProfiles(cleanUsers);
        }
      } catch (e) { console.error(e); } finally { setIsLoadingUsers(false); }
    };
    if (mounted) fetchUsersBg();
  }, [mounted]);

  // 3. AUTO SAVE
  useEffect(() => {
    if (isStorageLoaded && typeof window !== 'undefined') {
        const data = { addrs: queueAddr, likes: queueLikes };
        localStorage.setItem('baseDatingQueue', JSON.stringify(data));
        if (myGender) localStorage.setItem('baseDatingGender', myGender);
    }
  }, [queueAddr, queueLikes, myGender, isStorageLoaded]);

  // 4. AUTO CONNECT
  useEffect(() => {
    if (mounted && context && !isConnected && !hasAttemptedAutoConnect.current) {
        hasAttemptedAutoConnect.current = true;
        setTimeout(() => {
            const farcasterWallet = connectors.find(c => c.id === 'injected');
            if (farcasterWallet) connect({ connector: farcasterWallet });
        }, 500);
    }
  }, [mounted, context, isConnected, connectors, connect]);

  const filteredProfiles = profiles.filter(p => p.gender !== myGender)
    .filter(p => queueAddr.length < 50 ? !queueAddr.includes(p.custody_address) : true);

  useWatchContractEvent({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: DATING_ABI,
    eventName: 'NewMatch',
    onLogs(logs) {
        const myAddr = address?.toLowerCase();
        logs.forEach((log: any) => {
            const { user1, user2 } = log.args;
            if (user1.toLowerCase() === myAddr || user2.toLowerCase() === myAddr) {
                const partner = user1.toLowerCase() === myAddr ? user2 : user1;
                setMatchPartner(partner);
            }
        });
    },
  });

  // LOGIKA SWIPE
  const handleSwipe = (dir: string, profile: FarcasterUser) => {
    const liked = dir === 'right';
    console.log("Swiped:", dir, "Liked:", liked);

    if (queueAddr.length >= 50) return; 

    const newAddr = [...queueAddr, profile.custody_address];
    const newLikes = [...queueLikes, liked];
    
    setQueueAddr(newAddr);
    setQueueLikes(newLikes);

    if (newAddr.length >= 50) {
        commitSwipes(newAddr, newLikes);
    }
  };

  const handleCardLeftScreen = (identifier: string) => {
    setProfiles((prev) => prev.filter(p => p.custody_address !== identifier));
  };

  const commitSwipes = (addrs: string[], likes: boolean[]) => {
    console.log("🚀 Submitting 50 swipes...");
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: DATING_ABI,
      functionName: 'batchSwipe',
      args: [addrs as any, likes], 
    });
  };

  useEffect(() => {
    if (isSuccess) {
      setQueueAddr([]);
      setQueueLikes([]);
      localStorage.removeItem('baseDatingQueue');
      setProfiles((prev) => prev.length > 0 ? prev.slice(1) : prev);
      alert("✅ Swipes Saved! Gas Payment Successful.");
    }
  }, [isSuccess]);

  if (!mounted) return null;

  if (!isConnected) return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
            {context && !connectError ? (
                <div className="animate-pulse flex flex-col items-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mb-4 animate-spin"></div>
                    <p className="text-gray-500 font-bold">Connecting...</p>
                </div>
            ) : (
                <>
                    <h1 className="text-4xl font-bold text-blue-600 mb-2">Base Dating 🔵</h1>
                    <div className="flex flex-col gap-3 w-full max-w-xs">
                        {filteredConnectors.map((connector) => (
                            <button key={connector.uid} onClick={() => connect({ connector })} className="bg-white border-2 border-blue-600 text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition">
                            Connect {connector.id === 'injected' ? 'Farcaster Wallet' : connector.name}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </main>
    );

  if (isWrongNetwork) return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4 text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-2">Wrong Network ⚠️</h2>
            <button onClick={() => switchChain({ chainId: base.id })} className="bg-red-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-red-700">🔀 Switch Network</button>
        </main>
    );

  if (!myGender) return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-white p-4 text-center">
            <div className="flex flex-col gap-4 w-full max-w-xs">
                <button onClick={() => setMyGender('male')} className="bg-blue-100 border-2 border-blue-500 text-blue-700 p-6 rounded-2xl text-xl font-bold">👨 Man</button>
                <button onClick={() => setMyGender('female')} className="bg-pink-100 border-2 border-pink-500 text-pink-700 p-6 rounded-2xl text-xl font-bold">👩 Woman</button>
            </div>
        </main>
      );

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 pb-32 relative overflow-hidden">
      {matchPartner && <MatchModal partner={matchPartner} onClose={() => setMatchPartner(null)} />}

      <div className="absolute top-4 left-4 z-20">
         <div className="bg-black/80 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm shadow-md">
            💰 {balance ? `${Number(balance.formatted).toFixed(4)} ETH` : '...'}
         </div>
      </div>
      <div className="absolute top-4 right-4 z-20">
         <div className={`px-3 py-1 rounded-full shadow text-sm font-mono border flex items-center gap-2 ${isPending ? 'bg-orange-100 border-orange-300' : 'bg-white'}`}>
            {isPending ? (
                <span className="text-orange-600 font-bold">Confirming...</span>
            ) : (
                txError ? <span className="text-red-500 font-bold cursor-pointer" onClick={() => commitSwipes(queueAddr, queueLikes)}>❌ Retry?</span> : <span>💾 {queueAddr.length}/50</span>
            )}
         </div>
      </div>

      <div className="relative w-72 h-96 mt-8">
        {isLoadingUsers && filteredProfiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500 animate-pulse">Finding people...</p>
            </div>
        ) : filteredProfiles.length > 0 ? (
          filteredProfiles.map((profile) => (
             <SwipeCard 
                key={profile.custody_address}
                profile={profile} 
                onSwipe={(dir) => handleSwipe(dir, profile)} 
                onCardLeftScreen={handleCardLeftScreen}
             />
          ))
        ) : (
          <div className="text-center">
             <p className="text-gray-600 text-lg mb-2">No more profiles! 💔</p>
             <button onClick={() => window.location.reload()} className="bg-blue-500 text-white px-6 py-2 rounded-full mb-4 shadow">Refresh Users</button>
          </div>
        )}
      </div>

      {queueAddr.length > 0 && (
          <div className="fixed bottom-8 w-full flex justify-center z-50 px-4">
            <button 
                onClick={() => commitSwipes(queueAddr, queueLikes)} 
                disabled={isPending}
                className={`w-full max-w-xs py-4 rounded-full font-bold text-white shadow-2xl transform transition hover:scale-105 active:scale-95 flex justify-center items-center gap-2 ${
                    queueAddr.length >= 50 
                        ? "bg-red-600 animate-bounce" 
                        : "bg-black hover:bg-gray-800"
                } ${isPending ? "opacity-70 cursor-not-allowed animate-none" : ""}`}
            >
                {isPending ? "⏳ Processing..." : (queueAddr.length >= 50 ? "⛽ Pay Gas to Continue Swiping" : `Save Progress (${queueAddr.length})`)}
            </button>
          </div>
      )}
    </main>
  );
}