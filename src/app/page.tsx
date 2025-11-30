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
  pfp_url: string;
  custody_address: string;
  display_name: string;
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

  const generateBaseUsers = (count: number): FarcasterUser[] => {
    return Array.from({ length: count }).map((_, i) => {
        const randomAddr = '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');
        return {
            fid: 900000 + i,
            username: `${randomAddr.slice(0, 6)}...`,
            display_name: `Base User ${Math.floor(Math.random() * 1000)}`,
            pfp_url: `https://api.dicebear.com/9.x/identicon/svg?seed=${randomAddr}`,
            custody_address: randomAddr,
            gender: Math.random() > 0.5 ? 'male' : 'female',
            type: 'base'
        };
    });
  };

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
      } catch (err) {
        console.log("Browser Mode");
      }
    };
    initFast();
  }, []);

  // 2. FETCH USERS
  useEffect(() => {
    const fetchUsersBg = async () => {
      if (!mounted) return;
      try {
        const randomStart = Math.floor(Math.random() * 10000) + 1;
        const randomFids = Array.from({ length: 30 }, (_, i) => randomStart + i).join(',');

        const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${randomFids}`, {
            headers: {
                accept: 'application/json',
                api_key: process.env.NEXT_PUBLIC_NEYNAR_API_KEY || 'NEYNAR_API_DOCS'
            }
        });

        const data = await response.json();
        let combinedUsers: FarcasterUser[] = [];

        if (data.users) {
            const fcUsers = data.users.map((u: any, index: number) => ({
                fid: u.fid,
                username: u.username,
                display_name: u.display_name,
                pfp_url: u.pfp_url,
                custody_address: u.verified_addresses.eth_addresses[0] || u.custody_address,
                gender: index % 2 === 0 ? 'female' : 'male',
                type: 'farcaster' as const
            }));
            combinedUsers = [...fcUsers];
        }

        const baseUsers = generateBaseUsers(30);
        combinedUsers = [...combinedUsers, ...baseUsers];
        combinedUsers.sort(() => Math.random() - 0.5);
        const cleanUsers = combinedUsers.filter(u => u.pfp_url && u.custody_address && u.custody_address.startsWith('0x'));
        
        setProfiles(cleanUsers);
      } catch (e) {
        setProfiles(generateBaseUsers(50));
      } finally {
        setIsLoadingUsers(false);
      }
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
    // Filter: Jangan tampilkan user yg sudah ada di antrian, KECUALI jika antrian penuh (50)
    // Ini supaya kartu ke-50 tetap muncul kalau belum sukses dikirim
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

  // 🔥 LOGIKA SWIPE YANG DIPERBAIKI 🔥
  const handleSwipe = (liked: boolean) => {
    // 1. Cek apakah antrian sudah penuh (Misal user swipe lagi pas error)
    if (queueAddr.length >= 50) {
        // Jangan tambah antrian, langsung coba kirim ulang (Retry)
        commitSwipes(queueAddr, queueLikes);
        return; 
    }

    if (filteredProfiles.length === 0) return;
    const currentProfile = filteredProfiles[0];
    
    const newAddr = [...queueAddr, currentProfile.custody_address];
    const newLikes = [...queueLikes, liked];
    
    setQueueAddr(newAddr);
    setQueueLikes(newLikes);

    // 2. Cek Limit 50
    if (newAddr.length >= 50) {
        // Trigger Transaksi
        commitSwipes(newAddr, newLikes);
        // 🛑 JANGAN HAPUS KARTU DARI LAYAR (Return di sini)
        // Kartu ke-50 akan tetap terlihat oleh user sampai transaksi sukses
        return;
    }
    
    // 3. Jika belum 50, hapus kartu seperti biasa
    setProfiles((prev) => prev.filter(p => p.custody_address !== currentProfile.custody_address));
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

  // 🔥 HAPUS KARTU HANYA JIKA SUKSES 🔥
  useEffect(() => {
    if (isSuccess) {
      // Reset Antrian
      setQueueAddr([]);
      setQueueLikes([]);
      localStorage.removeItem('baseDatingQueue');
      
      // Hapus kartu ke-50 dari layar (agar user bisa lanjut)
      setProfiles((prev) => {
          if (prev.length > 0) return prev.slice(1); 
          return prev;
      });
      
      alert("Your payments have been recorded successfully!");
    }
  }, [isSuccess]);

  if (!mounted) return null;

  // --- RENDER ---
  if (!isConnected) {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
            <h1 className="text-4xl font-bold text-blue-600 mb-2">Base Dating 🔵</h1>
            <div className="flex flex-col gap-3 w-full max-w-xs">
                {filteredConnectors.map((connector) => (
                    <button key={connector.uid} onClick={() => connect({ connector })} className="bg-white border-2 border-blue-600 text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition">
                    Connect {connector.id === 'injected' ? 'Farcaster Wallet' : connector.name}
                    </button>
                ))}
            </div>
        </main>
    );
  }

  if (isWrongNetwork) {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4 text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-2">Wrong Network ⚠️</h2>
            <button onClick={() => switchChain({ chainId: base.id })} className="bg-red-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-red-700">🔀 Switch Network</button>
        </main>
    );
  }

  if (!myGender) {
      return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-white p-4 text-center">
            <div className="flex flex-col gap-4 w-full max-w-xs">
                <button onClick={() => setMyGender('male')} className="bg-blue-100 border-2 border-blue-500 text-blue-700 p-6 rounded-2xl text-xl font-bold">👨 Man</button>
                <button onClick={() => setMyGender('female')} className="bg-pink-100 border-2 border-pink-500 text-pink-700 p-6 rounded-2xl text-xl font-bold">👩 Woman</button>
            </div>
        </main>
      );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {matchPartner && <MatchModal partner={matchPartner} onClose={() => setMatchPartner(null)} />}

      <div className="absolute top-4 left-4 z-20">
         <div className="bg-black/80 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm shadow-md">
            💰 {balance ? `${Number(balance.formatted).toFixed(4)} ETH` : '...'}
         </div>
      </div>
      <div className="absolute top-4 right-4 z-20">
         <div className={`px-3 py-1 rounded-full shadow text-sm font-mono border flex items-center gap-2 ${isPending ? 'bg-orange-100 border-orange-300' : 'bg-white'}`}>
            {isPending ? (
                <>
                    <span className="w-2 h-2 bg-orange-500 rounded-full animate-ping"></span>
                    <span className="text-orange-600 font-bold">Confirming...</span>
                </>
            ) : (
                // Tampilkan Error jika gagal (User cancel)
                txError ? (
                    <span className="text-red-500 font-bold cursor-pointer" onClick={() => commitSwipes(queueAddr, queueLikes)}>❌ Retry?</span>
                ) : (
                    <span>💾 {queueAddr.length}/50</span>
                )
            )}
         </div>
      </div>

      <div className="relative w-72 h-96 mt-8">
        {isLoadingUsers && filteredProfiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500 animate-pulse">Finding people near blocks...</p>
            </div>
        ) : filteredProfiles.length > 0 ? (
          filteredProfiles.map((profile, index) => {
            return (
              <div key={profile.custody_address} className={`absolute top-0 left-0 w-full h-full transition-all duration-300 ${index === 0 ? "z-10" : "z-0 scale-95 opacity-50 translate-y-4"}`}>
                <div className="relative w-full h-full">
                    <SwipeCard 
                        profile={{ 
                            fid: profile.fid, 
                            username: profile.display_name, 
                            bio: `${profile.type === 'base' ? '🔵 Base' : '🟣 Farcaster'} | ${profile.gender === 'male' ? '👨' : '👩'}`, 
                            pfpUrl: profile.pfp_url,
                            custody_address: profile.custody_address,
                            gender: profile.gender,
                            type: profile.type
                        }} 
                        onSwipe={handleSwipe} 
                    />
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center">
             <p className="text-gray-600 text-lg mb-2">No more profiles! 💔</p>
             <button onClick={() => window.location.reload()} className="bg-blue-500 text-white px-6 py-2 rounded-full mb-4 shadow">Refresh Users</button>
             {queueAddr.length > 0 && (
                 <button onClick={() => commitSwipes(queueAddr, queueLikes)} className="block mx-auto bg-green-600 text-white px-6 py-2 rounded-full shadow hover:bg-green-700 transition animate-bounce">
                    Save Pending ({queueAddr.length})
                 </button>
             )}
          </div>
        )}
      </div>

  {/* 🔥 TOMBOL MANUAL SUBMIT (MUNCUL JIKA ADA ANTRIAN) 🔥 */}
      {queueAddr.length > 0 && (
          <div className="fixed bottom-8 w-full flex justify-center z-50 px-4">
            <button 
                onClick={() => commitSwipes(queueAddr, queueLikes)} 
                disabled={isPending} // Disable saat loading
                className={`w-full max-w-xs py-4 rounded-full font-bold text-white shadow-2xl transform transition hover:scale-105 active:scale-95 flex justify-center items-center gap-2 ${
                    queueAddr.length >= 50 
                        ? "bg-red-600 animate-bounce" // Merah & Mental kalau penuh
                        : "bg-black hover:bg-gray-800" // Hitam biasa kalau belum penuh
                } ${isPending ? "opacity-70 cursor-not-allowed animate-none" : ""}`}
            >
                {isPending ? (
                    <>⏳ Processing...</>
                ) : (
                    queueAddr.length >= 50 ? "⚠️ LIMIT REACHED: SUBMIT NOW" : `Save Progress (${queueAddr.length})`
                )}
            </button>
          </div>
      )}
    </main>
  );
}