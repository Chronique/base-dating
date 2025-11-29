"use client";

import { useState, useEffect } from "react";
import sdk from "@farcaster/frame-sdk";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useConnect, useWatchContractEvent } from "wagmi";
import { SwipeCard } from "../components/SwipeCard"; 
import { CONTRACT_ADDRESS, DATING_ABI } from "../constants";

// Data Types
type FarcasterUser = {
  fid: number;
  username: string;
  pfp_url: string;
  custody_address: string;
  display_name: string;
  gender: 'male' | 'female';
};

export default function Home() {
  const [profiles, setProfiles] = useState<FarcasterUser[]>([]);
  const [mounted, setMounted] = useState(false);
  
  // Gunakan 'any' untuk context agar tidak rewel soal tipe data FrameContext
  const [context, setContext] = useState<any>();

  // GENDER CHOICE STATE
  const [myGender, setMyGender] = useState<'male' | 'female' | null>(null);

  // QUEUE STATE
  const [queueAddr, setQueueAddr] = useState<string[]>([]);
  const [queueLikes, setQueueLikes] = useState<boolean[]>([]);

  const { isConnected, address } = useAccount();
  const { connectors, connect } = useConnect();
  
  // Filter wallets: Hanya tampilkan Coinbase, MetaMask, dan Injected (Farcaster)
  const filteredConnectors = connectors.filter((c) => 
    c.id === 'coinbaseWalletSDK' || c.name.toLowerCase().includes('metamask') || c.id === 'injected'
  );

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  // 1. FETCH & SIMULATE USERS
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Dummy data with Gender & Wallet Address
        // Pastikan address diawali 0x agar valid di blockchain
        const dummyData = [
            { fid: 101, username: "alice", display_name: "Alice Wonderland", gender: "female", pfp_url: "https://robohash.org/alice?set=set4", custody_address: "0x1234567890123456789012345678901234567890" },
            { fid: 102, username: "bob", display_name: "Bob Builder", gender: "male", pfp_url: "https://robohash.org/bob?set=set4", custody_address: "0x2345678901234567890123456789012345678901" },
            { fid: 103, username: "chara", display_name: "Chara", gender: "female", pfp_url: "https://robohash.org/chara?set=set4", custody_address: "0x3456789012345678901234567890123456789012" },
            { fid: 104, username: "david", display_name: "David", gender: "male", pfp_url: "https://robohash.org/david?set=set4", custody_address: "0x4567890123456789012345678901234567890123" },
            { fid: 105, username: "eva", display_name: "Eva", gender: "female", pfp_url: "https://robohash.org/eva?set=set4", custody_address: "0x5678901234567890123456789012345678901234" },
        ];
        
        const formatted: FarcasterUser[] = dummyData.map((u: any) => ({
            ...u,
            gender: u.gender as 'male' | 'female'
        }));
        setProfiles(formatted);
      } catch (e) {
        console.error("Error fetching", e);
      }
    };

    const load = async () => {
      setMounted(true);
      fetchUsers();
      try {
        const ctx = await sdk.context;
        setContext(ctx);
        sdk.actions.ready(); 
      } catch (err) {
        console.log("Browser Mode");
      }
    };
    if (sdk && !mounted) load();
  }, [mounted]);

  // 2. FILTER PROFILES (Opposite Gender)
  const filteredProfiles = profiles.filter(p => p.gender !== myGender);

  // 3. WATCH FOR MATCHES (Event Listener)
  useWatchContractEvent({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: DATING_ABI,
    eventName: 'NewMatch',
    onLogs(logs) {
        const myAddr = address?.toLowerCase();
        logs.forEach((log: any) => {
            const { user1, user2 } = log.args;
            // Cek apakah salah satu address yang match adalah milik user saat ini
            if (user1.toLowerCase() === myAddr || user2.toLowerCase() === myAddr) {
                alert("💖 IT'S A MATCH! 💖\nYou matched on-chain!");
            }
        });
    },
  });

  // --- ACTIONS ---
  const handleSwipe = (liked: boolean) => {
    const currentProfile = filteredProfiles[0];
    
    const newAddr = [...queueAddr, currentProfile.custody_address];
    const newLikes = [...queueLikes, liked];
    
    setQueueAddr(newAddr);
    setQueueLikes(newLikes);

    // Auto-save at 5 swipes (Batch kecil untuk testing, bisa diubah jadi 50)
    if (newAddr.length >= 5) {
        commitSwipes(newAddr, newLikes);
    }
    
    // Remove from UI agar kartu berikutnya muncul
    setProfiles((prev) => prev.filter(p => p.fid !== currentProfile.fid));
  };

  const commitSwipes = (addrs: string[], likes: boolean[]) => {
    console.log("🚀 Submitting batch...");
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: DATING_ABI,
      functionName: 'batchSwipe',
      // 👇 PERBAIKAN UTAMA: Gunakan 'as any' agar TypeScript tidak error soal tipe string[]
      args: [addrs as any, likes], 
    });
  };

  // Bersihkan antrian setelah sukses
  useEffect(() => {
    if (isSuccess) {
      setQueueAddr([]);
      setQueueLikes([]);
    }
  }, [isSuccess]);

  if (!mounted) return null;

  // --- RENDER ---

  // 1. LOGIN SCREEN
  if (!isConnected) {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
            <h1 className="text-4xl font-bold text-blue-600 mb-2">Base Dating 🔵</h1>
            <p className="text-gray-500 mb-8">Connect wallet to find your soulmate</p>
            
            <div className="flex flex-col gap-3 w-full max-w-xs">
                {filteredConnectors.map((connector) => (
                    <button key={connector.uid} onClick={() => connect({ connector })} className="bg-white border-2 border-blue-600 text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition">
                    Connect {connector.id === 'injected' ? 'Farcaster Wallet' : connector.name}
                    </button>
                ))}
            </div>
            
            {/* Fallback jika tidak ada wallet terdeteksi */}
            {filteredConnectors.length === 0 && (
                <button onClick={() => connect({ connector: connectors[0] })} className="bg-black text-white px-6 py-3 rounded-xl font-bold w-full max-w-xs mb-2 mt-2">
                Connect Wallet
                </button>
            )}
        </main>
    );
  }

  // 2. GENDER SELECTION
  if (!myGender) {
      return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-white p-4 text-center animate-in fade-in zoom-in duration-500">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">I am a...</h2>
            
            <div className="flex flex-col gap-4 w-full max-w-xs">
                <button 
                    onClick={() => setMyGender('male')}
                    className="bg-blue-100 border-2 border-blue-500 text-blue-700 p-6 rounded-2xl text-xl font-bold hover:bg-blue-200 transition flex items-center justify-center gap-2"
                >
                    👨 Man
                </button>
                <button 
                    onClick={() => setMyGender('female')}
                    className="bg-pink-100 border-2 border-pink-500 text-pink-700 p-6 rounded-2xl text-xl font-bold hover:bg-pink-200 transition flex items-center justify-center gap-2"
                >
                    👩 Woman
                </button>
            </div>
            <p className="mt-6 text-sm text-gray-400">We will show you the opposite gender.</p>
        </main>
      );
  }

  // 3. MAIN SWIPE INTERFACE
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 relative">
      {/* Header Status */}
      <div className="absolute top-4 w-full px-4 flex justify-between items-center z-20">
         <h1 className="text-xl font-bold text-blue-600">Base Dating</h1>
         <div className="bg-white px-3 py-1 rounded-full shadow text-sm font-mono border">
            {isPending ? (
                <span className="text-orange-500 animate-pulse">⏳ Saving...</span>
            ) : (
                <span>💾 Pending: {queueAddr.length}/5</span>
            )}
         </div>
      </div>

      <div className="relative w-72 h-96 mt-8">
        {filteredProfiles.length > 0 ? (
          filteredProfiles.map((profile, index) => {
            return (
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
            );
          })
        ) : (
          <div className="text-center">
             <p className="text-gray-600 text-lg mb-2">No more profiles! 💔</p>
             <button onClick={() => setMyGender(null)} className="bg-gray-200 px-4 py-2 rounded-full text-sm mb-4">Change My Gender</button>
             
             {queueAddr.length > 0 && (
                 <button onClick={() => commitSwipes(queueAddr, queueLikes)} className="block mx-auto bg-blue-600 text-white px-6 py-2 rounded-full shadow">
                    Save Pending
                 </button>
             )}
          </div>
        )}
      </div>
    </main>
  );
}