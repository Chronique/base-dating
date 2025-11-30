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

// --- TIPE DATA ---
type FarcasterUser = {
  fid: number;
  username: string;
  pfp_url: string;
  custody_address: string;
  display_name: string;
  gender: 'male' | 'female';
  type: 'farcaster' | 'base';
};

// --- KOMPONEN MODAL MATCH ---
function MatchModal({ partner, onClose }: { partner: string, onClose: () => void }) {
    // Link untuk membuka chat XMTP (Converse / Coinbase Wallet)
    const chatLink = `https://xmttp.chat/dm/${partner}`; 
    
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in zoom-in">
            <div className="bg-white p-6 rounded-3xl text-center max-w-xs mx-4">
                <div className="text-6xl mb-4">💖</div>
                <h2 className="text-2xl font-bold text-pink-600 mb-2">It's a Match!</h2>
                <p className="text-gray-500 mb-6">You and {partner.slice(0,6)}... liked each other!</p>
                
                <div className="flex flex-col gap-3">
                    <a 
                        href={chatLink}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-blue-600 text-white py-3 px-6 rounded-xl font-bold hover:bg-blue-700 transition"
                    >
                        💬 Chat on XMTP
                    </a>
                    <button 
                        onClick={onClose}
                        className="bg-gray-200 text-gray-700 py-3 px-6 rounded-xl font-bold"
                    >
                        Keep Swiping
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Home() {
  const [profiles, setProfiles] = useState<FarcasterUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [context, setContext] = useState<any>();

  // STATE PREFERENSI & ANTRIAN
  const [myGender, setMyGender] = useState<'male' | 'female' | null>(null);
  const [queueAddr, setQueueAddr] = useState<string[]>([]);
  const [queueLikes, setQueueLikes] = useState<boolean[]>([]);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  
  // STATE MATCH (Untuk menampilkan modal)
  const [matchPartner, setMatchPartner] = useState<string | null>(null);

  // WAGMI HOOKS
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

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  const generateBaseUsers = (count: number): FarcasterUser[] => {
    return Array.from({ length: count }).map((_, i) => {
        const randomAddr = '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');
        const isMale = Math.random() > 0.5;
        return {
            fid: 900000 + i,
            username: `${randomAddr.slice(0, 6)}...${randomAddr.slice(-4)}`,
            display_name: `Base User ${Math.floor(Math.random() * 1000)}`,
            pfp_url: `https://api.dicebear.com/9.x/identicon/svg?seed=${randomAddr}`,
            custody_address: randomAddr,
            gender: isMale ? 'male' : 'female',
            type: 'base'
        };
    });
  };

  // 1. INIT APLIKASI
  useEffect(() => {
    const initApp = async () => {
      setMounted(true);

      if (typeof window !== 'undefined') {
          const savedQueue = localStorage.getItem('baseDatingQueue');
          const savedGender = localStorage.getItem('baseDatingGender');
          if (savedQueue) {
              try {
                  const parsed = JSON.parse(savedQueue);
                  if (parsed.addrs && Array.isArray(parsed.addrs)) {
                      setQueueAddr(parsed.addrs);
                      setQueueLikes(parsed.likes);
                  }
              } catch (e) {}
          }
          if (savedGender) setMyGender(savedGender as 'male' | 'female');
      }
      setIsStorageLoaded(true);

      setIsLoadingUsers(true);
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
        const cleanUsers = combinedUsers.filter(u => 
            u.pfp_url && u.custody_address && u.custody_address.startsWith('0x')
        );
        
        setProfiles(cleanUsers);

      } catch (e) {
        setProfiles(generateBaseUsers(50));
      } finally {
        setIsLoadingUsers(false);
      }

      try {
        const ctx = await sdk.context;
        setContext(ctx);
        sdk.actions.ready(); 
      } catch (err) {}
    };

    if (sdk && !mounted) initApp();
  }, [mounted]);

  // 2. AUTO SAVE
  useEffect(() => {
    if (isStorageLoaded && typeof window !== 'undefined') {
        const data = { addrs: queueAddr, likes: queueLikes };
        localStorage.setItem('baseDatingQueue', JSON.stringify(data));
        if (myGender) localStorage.setItem('baseDatingGender', myGender);
    }
  }, [queueAddr, queueLikes, myGender, isStorageLoaded]);

  // 3. AUTO CONNECT
  useEffect(() => {
    if (mounted && context && !isConnected && !hasAttemptedAutoConnect.current) {
        hasAttemptedAutoConnect.current = true;
        const timer = setTimeout(() => {
            const farcasterWallet = connectors.find(c => c.id === 'injected');
            if (farcasterWallet) connect({ connector: farcasterWallet });
        }, 700);
        return () => clearTimeout(timer);
    }
  }, [mounted, context, isConnected, connectors, connect]);

  const filteredProfiles = profiles.filter(p => p.gender !== myGender)
    .filter(p => !queueAddr.includes(p.custody_address));

  // 🔥 4. MATCH WATCHER & NOTIFICATION 🔥
  useWatchContractEvent({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: DATING_ABI,
    eventName: 'NewMatch',
    onLogs(logs) {
        const myAddr = address?.toLowerCase();
        logs.forEach((log: any) => {
            const { user1, user2 } = log.args;
            
            // Cek apakah ini match saya
            if (user1.toLowerCase() === myAddr || user2.toLowerCase() === myAddr) {
                // Tentukan siapa partnernya
                const partnerAddr = user1.toLowerCase() === myAddr ? user2 : user1;
                
                // 1. Tampilkan Modal Chat
                setMatchPartner(partnerAddr);

                // 2. Kirim Notifikasi (Simulasi Log dulu, perlu server utk real push)
                if (sdk && context) {
                    // Jika di farcaster, kita bisa panggil API notifikasi
                    console.log(`🔔 Sending notification: Match with ${partnerAddr}`);
                }
            }
        });
    },
  });

  const handleSwipe = (liked: boolean) => {
    if (filteredProfiles.length === 0) return;
    const currentProfile = filteredProfiles[0];
    
    const newAddr = [...queueAddr, currentProfile.custody_address];
    const newLikes = [...queueLikes, liked];
    
    setQueueAddr(newAddr);
    setQueueLikes(newLikes);

    if (newAddr.length >= 50) {
        commitSwipes(newAddr, newLikes);
    }
    
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

  useEffect(() => {
    if (isSuccess) {
      setQueueAddr([]);
      setQueueLikes([]);
      localStorage.removeItem('baseDatingQueue');
      alert("✅ 50 Swipes Successfully Saved On-Chain!");
    }
  }, [isSuccess]);

  if (!mounted) return null;

  // --- RENDER ---

  if (!isConnected) {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
            {context && !connectError ? (
                <div className="animate-pulse flex flex-col items-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mb-4 animate-spin"></div>
                    <p className="text-gray-500 font-bold">Connecting to @{context.user.username}...</p>
                </div>
            ) : (
                <>
                    <h1 className="text-4xl font-bold text-blue-600 mb-2">Base Dating 🔵</h1>
                    <p className="text-gray-500 mb-8">Connect wallet to find your soulmate</p>
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
  }

  if (isWrongNetwork) {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4 text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-2">Wrong Network ⚠️</h2>
            <p className="text-gray-600 mb-6">Please switch to Base Mainnet</p>
            <button onClick={() => switchChain({ chainId: base.id })} className="bg-red-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-red-700">
                🔀 Switch Network
            </button>
        </main>
    );
  }

  if (!myGender) {
      return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-white p-4 text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">I am a...</h2>
            <div className="flex flex-col gap-4 w-full max-w-xs">
                <button onClick={() => setMyGender('male')} className="bg-blue-100 border-2 border-blue-500 text-blue-700 p-6 rounded-2xl text-xl font-bold">👨 Man</button>
                <button onClick={() => setMyGender('female')} className="bg-pink-100 border-2 border-pink-500 text-pink-700 p-6 rounded-2xl text-xl font-bold">👩 Woman</button>
            </div>
        </main>
      );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 relative">
      
      {/* 1. MODAL MATCH (Muncul jika ada match) */}
      {matchPartner && (
          <MatchModal 
            partner={matchPartner} 
            onClose={() => setMatchPartner(null)} 
          />
      )}

      {/* 2. BALANCE & STATUS */}
      <div className="absolute top-4 left-4 z-20">
         <div className="bg-black/80 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm shadow-md">
            💰 {balance ? `${Number(balance.formatted).toFixed(4)} ETH` : '...'}
         </div>
      </div>
      <div className="absolute top-4 right-4 z-20">
         <div className="bg-white px-3 py-1 rounded-full shadow text-sm font-mono border flex items-center gap-2">
            {isPending ? (
                <>
                    <span className="w-2 h-2 bg-orange-500 rounded-full animate-ping"></span>
                    <span className="text-orange-500 font-bold">Saving...</span>
                </>
            ) : (
                <span>💾 {queueAddr.length}/50</span>
            )}
         </div>
      </div>

      <div className="relative w-72 h-96 mt-8">
        {isLoadingUsers && filteredProfiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500">Finding Real Users...</p>
            </div>
        ) : filteredProfiles.length > 0 ? (
          filteredProfiles.map((profile, index) => {
            return (
              <div key={profile.custody_address} className={`absolute top-0 left-0 w-full h-full transition-all duration-300 ${index === 0 ? "z-10" : "z-0 scale-95 opacity-50 translate-y-4"}`}>
                <div className="relative w-full h-full">
                    {/* 👇 Update SwipeCard untuk support Basename */}
                    <SwipeCard 
                        profile={{ 
                            fid: profile.fid, 
                            username: profile.display_name, 
                            bio: `${profile.type === 'base' ? '🔵 Base User' : '🟣 Farcaster'} | ${profile.gender === 'male' ? '👨' : '👩'}`, 
                            pfpUrl: profile.pfp_url,
                            custody_address: profile.custody_address, // Kirim address untuk Basename lookup
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
             <button onClick={() => window.location.reload()} className="bg-blue-500 text-white px-6 py-2 rounded-full mb-4 shadow hover:bg-blue-600 transition">Refresh Users</button>
             {queueAddr.length > 0 && (
                 <button onClick={() => commitSwipes(queueAddr, queueLikes)} className="block mx-auto bg-green-600 text-white px-6 py-2 rounded-full shadow hover:bg-green-700 transition animate-bounce">
                    Save Pending ({queueAddr.length})
                 </button>
             )}
          </div>
        )}
      </div>
    </main>
  );
}