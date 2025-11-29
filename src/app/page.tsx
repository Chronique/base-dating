"use client";

import { useState, useEffect } from "react";
import sdk from "@farcaster/frame-sdk";
import { 
  useWriteContract, 
  useWaitForTransactionReceipt, 
  useAccount, 
  useConnect, 
  useWatchContractEvent,
  useChainId,
  useSwitchChain
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
};

export default function Home() {
  // State Data
  const [profiles, setProfiles] = useState<FarcasterUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [context, setContext] = useState<any>();

  // User Preference
  const [myGender, setMyGender] = useState<'male' | 'female' | null>(null);

  // Queue Transaction
  const [queueAddr, setQueueAddr] = useState<string[]>([]);
  const [queueLikes, setQueueLikes] = useState<boolean[]>([]);

  // Wagmi Hooks
  const { isConnected, address } = useAccount();
  const { connectors, connect } = useConnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
  // Logic Cek Network
  const isWrongNetwork = isConnected && chainId !== base.id;

  const filteredConnectors = connectors.filter((c) => 
    c.id === 'coinbaseWalletSDK' || 
    c.name.toLowerCase().includes('metamask') || 
    c.id === 'injected' 
  );

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  // 1. INIT SDK
  useEffect(() => {
    const load = async () => {
      setMounted(true);
      try {
        const ctx = await sdk.context;
        setContext(ctx);
        sdk.actions.ready();
      } catch (err) {
        console.log("Browser mode");
      }
    };
    if (sdk && !mounted) load();
  }, [mounted]);

  // 2. AUTO CONNECT (Farcaster)
  useEffect(() => {
    if (context && !isConnected && mounted) {
        const farcasterWallet = connectors.find(c => c.id === 'injected');
        if (farcasterWallet) {
            connect({ connector: farcasterWallet });
        }
    }
  }, [context, isConnected, connectors, connect, mounted]);

  // 3. FETCH REAL USERS (Neynar API)
  useEffect(() => {
    const fetchRealUsers = async () => {
        setIsLoadingUsers(true);
        try {
            // Ambil 50 user acak dari range FID 1 - 20000
            const randomFids = Array.from({ length: 50 }, () => Math.floor(Math.random() * 20000) + 1).join(',');

            const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${randomFids}`, {
                headers: {
                    accept: 'application/json',
                    api_key: process.env.NEXT_PUBLIC_NEYNAR_API_KEY || 'NEYNAR_API_DOCS'
                }
            });

            const data = await response.json();
            
            if (data.users) {
                const realUsers: FarcasterUser[] = data.users.map((u: any, index: number) => {
                    const wallet = u.verified_addresses.eth_addresses[0] || u.custody_address;
                    return {
                        fid: u.fid,
                        username: u.username,
                        display_name: u.display_name,
                        pfp_url: u.pfp_url,
                        custody_address: wallet,
                        gender: index % 2 === 0 ? 'female' : 'male' // Simulasi Gender
                    };
                });

                // Hapus user yang datanya tidak lengkap
                const cleanUsers = realUsers.filter(u => u.pfp_url && u.custody_address && u.custody_address !== '0x0000000000000000000000000000000000000000');
                setProfiles(cleanUsers);
            }
        } catch (error) {
            console.error("Gagal fetch Neynar:", error);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    if (mounted && profiles.length === 0) fetchRealUsers();
  }, [mounted]);

  // 4. FILTER GENDER
  const filteredProfiles = profiles.filter(p => p.gender !== myGender);

  // 5. SWIPE LOGIC
  const handleSwipe = (liked: boolean) => {
    const currentProfile = filteredProfiles[0];
    const newAddr = [...queueAddr, currentProfile.custody_address];
    const newLikes = [...queueLikes, liked];
    setQueueAddr(newAddr);
    setQueueLikes(newLikes);

    if (newAddr.length >= 5) {
        commitSwipes(newAddr, newLikes);
    }
    setProfiles((prev) => prev.filter(p => p.fid !== currentProfile.fid));
  };

  const commitSwipes = (addrs: string[], likes: boolean[]) => {
    console.log("🚀 Submitting batch...");
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
      alert("✅ Data Saved On-Chain!");
    }
  }, [isSuccess]);

  if (!mounted) return null;

  // --- RENDER ---

  // A. LOGIN SCREEN
  if (!isConnected) {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
            {context ? (
                <div className="animate-pulse">
                    <p className="text-gray-500 font-bold">Connecting to Farcaster...</p>
                </div>
            ) : (
                <>
                    <h1 className="text-4xl font-bold text-blue-600 mb-2">Base Dating 🔵</h1>
                    <p className="text-gray-500 mb-8">Connect wallet to start</p>
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

  // B. WRONG NETWORK SCREEN (Perbaikan Stuck)
  if (isWrongNetwork) {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4 text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-2">Wrong Network ⚠️</h2>
            <p className="text-gray-600 mb-6">Please switch to Base Sepolia</p>
            <button onClick={() => switchChain({ chainId: base.id })} className="bg-red-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-red-700">
                🔀 Switch Network
            </button>
        </main>
    );
  }

  // C. GENDER SELECTION
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

  // D. SWIPE DECK (MAIN)
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-4 w-full px-4 flex justify-between items-center z-20">
         <h1 className="text-xl font-bold text-blue-600">Base Dating</h1>
         <div className="bg-white px-3 py-1 rounded-full shadow text-sm font-mono border">
            {isPending ? <span className="text-orange-500 animate-pulse">⏳ Saving...</span> : <span>💾 Pending: {queueAddr.length}/5</span>}
         </div>
      </div>

      <div className="relative w-72 h-96 mt-8">
        {isLoadingUsers && filteredProfiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500">Finding Real Users...</p>
            </div>
        ) : filteredProfiles.length > 0 ? (
          filteredProfiles.map((profile, index) => (
              <div key={profile.fid} className={`absolute top-0 left-0 w-full h-full transition-all duration-300 ${index === 0 ? "z-10" : "z-0 scale-95 opacity-50 translate-y-4"}`}>
                <div className="relative w-full h-full">
                    <SwipeCard 
                        profile={{ 
                            fid: profile.fid, 
                            username: profile.display_name, 
                            bio: `${profile.gender === 'male' ? '👨' : '👩'} @${profile.username}`, 
                            pfpUrl: profile.pfp_url 
                        }} 
                        onSwipe={handleSwipe} 
                    />
                </div>
              </div>
          ))
        ) : (
          <div className="text-center">
             <p className="text-gray-600 text-lg mb-2">No more profiles!</p>
             <button onClick={() => window.location.reload()} className="bg-blue-500 text-white px-6 py-2 rounded-full">Refresh Users</button>
             {queueAddr.length > 0 && (
                 <button onClick={() => commitSwipes(queueAddr, queueLikes)} className="block mx-auto mt-4 bg-green-600 text-white px-6 py-2 rounded-full shadow">Save Pending</button>
             )}
          </div>
        )}
      </div>
    </main>
  );
}