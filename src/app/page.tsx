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
  // State Data (Kosongkan dulu, nanti diisi API)
  const [profiles, setProfiles] = useState<FarcasterUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Gunakan 'any' untuk context agar tidak rewel
  const [context, setContext] = useState<any>();

  // GENDER CHOICE STATE
  const [myGender, setMyGender] = useState<'male' | 'female' | null>(null);

  // QUEUE STATE
  const [queueAddr, setQueueAddr] = useState<string[]>([]);
  const [queueLikes, setQueueLikes] = useState<boolean[]>([]);

  const { isConnected, address } = useAccount();
  const { connectors, connect } = useConnect();
  
  // Filter wallets
  const filteredConnectors = connectors.filter((c) => 
    c.id === 'coinbaseWalletSDK' || c.name.toLowerCase().includes('metamask') || c.id === 'injected'
  );

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  // 1. FETCH REAL USERS (NEYNAR API)
  // Ini adalah pengganti bagian Dummy Data yang lama
  useEffect(() => {
    const fetchRealUsers = async () => {
      setIsLoadingUsers(true);
      try {
        // Ambil 50 user acak dari range FID 1 - 50000 (User aktif)
        // Kita acak start-nya biar profil yang muncul beda-beda tiap refresh
        const randomStart = Math.floor(Math.random() * 10000) + 1;
        const randomFids = Array.from({ length: 50 }, (_, i) => randomStart + i).join(',');

        // Panggil API Neynar
        const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${randomFids}`, {
            headers: {
                accept: 'application/json',
                // Pastikan Key ini ada di Vercel Environment Variables
                api_key: process.env.NEXT_PUBLIC_NEYNAR_API_KEY || 'NEYNAR_API_DOCS'
            }
        });

        const data = await response.json();
        
        if (data.users) {
            const realUsers: FarcasterUser[] = data.users.map((u: any, index: number) => {
                // Prioritaskan verified address (wallet yang dikonek), kalau gak ada pake custody (wallet pendaftar)
                const wallet = u.verified_addresses.eth_addresses[0] || u.custody_address;
                
                return {
                    fid: u.fid,
                    username: u.username,
                    display_name: u.display_name,
                    pfp_url: u.pfp_url,
                    custody_address: wallet,
                    // Simulasi Gender (Selang-seling karena API tidak punya data gender)
                    gender: index % 2 === 0 ? 'female' : 'male' 
                };
            });

            // Filter user yang datanya tidak lengkap atau walletnya null
            const cleanUsers = realUsers.filter(u => u.pfp_url && u.custody_address && u.custody_address !== '0x0000000000000000000000000000000000000000');
            
            setProfiles(cleanUsers);
        }
      } catch (e) {
        console.error("Gagal fetch Neynar:", e);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    const load = async () => {
      setMounted(true);
      
      // Fetch user hanya jika profil masih kosong
      if (profiles.length === 0) fetchRealUsers(); 

      try {
        const ctx = await sdk.context;
        setContext(ctx);
        sdk.actions.ready(); 
      } catch (err) {
        console.log("Browser Mode");
      }
    };
    if (sdk && !mounted) load();
  }, [mounted]); // Dependency mounted agar jalan sekali di awal

// 2. AUTO CONNECT (Optimized)
  useEffect(() => {
    // Cek syarat utama dulu
    if (!mounted || !context || isConnected) return;

    // Beri jeda 500ms agar wallet extension punya waktu untuk inject ke browser
    const timer = setTimeout(() => {
        const farcasterWallet = connectors.find(c => c.id === 'injected');
        
        if (farcasterWallet) {
            console.log("Auto-connecting to Farcaster Wallet...");
            connect({ connector: farcasterWallet });
        }
    }, 500); // Delay 0.5 detik

    return () => clearTimeout(timer); // Bersihkan timer jika komponen unmount
  }, [context, isConnected, connectors, connect, mounted]);

  // 3. FILTER PROFILES (Opposite Gender)
  const filteredProfiles = profiles.filter(p => p.gender !== myGender);

  // 4. WATCH FOR MATCHES (Event Listener)
  useWatchContractEvent({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: DATING_ABI,
    eventName: 'NewMatch',
    onLogs(logs) {
        const myAddr = address?.toLowerCase();
        logs.forEach((log: any) => {
            const { user1, user2 } = log.args;
            if (user1.toLowerCase() === myAddr || user2.toLowerCase() === myAddr) {
                alert("💖 IT'S A MATCH! 💖\nYou matched on-chain!");
            }
        });
    },
  });

  // --- ACTIONS ---
  const handleSwipe = (liked: boolean) => {
    // Ambil profile dari list yang sudah difilter gender
    if (filteredProfiles.length === 0) return;
    const currentProfile = filteredProfiles[0];
    
    // Simpan ADDRESS, bukan FID
    const newAddr = [...queueAddr, currentProfile.custody_address];
    const newLikes = [...queueLikes, liked];
    
    setQueueAddr(newAddr);
    setQueueLikes(newLikes);

    // Auto-save at 5 swipes (Batch kecil untuk testing)
    if (newAddr.length >= 5) {
        commitSwipes(newAddr, newLikes);
    }
    
    // Remove from UI (Hapus berdasarkan FID dari list utama)
    setProfiles((prev) => prev.filter(p => p.fid !== currentProfile.fid));
  };

  const commitSwipes = (addrs: string[], likes: boolean[]) => {
    console.log("🚀 Submitting batch...");
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: DATING_ABI,
      functionName: 'batchSwipe',
      // 👇 Pakai 'as any' agar TypeScript tidak error validasi string vs address
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
            {context ? (
                <div className="animate-pulse">
                    <p className="text-gray-500 font-bold">Connecting to Farcaster...</p>
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

  // 2. GENDER SELECTION
  if (!myGender) {
      return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-white p-4 text-center animate-in fade-in zoom-in duration-500">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">I am a...</h2>
            <div className="flex flex-col gap-4 w-full max-w-xs">
                <button onClick={() => setMyGender('male')} className="bg-blue-100 border-2 border-blue-500 text-blue-700 p-6 rounded-2xl text-xl font-bold hover:bg-blue-200 transition flex items-center justify-center gap-2">👨 Man</button>
                <button onClick={() => setMyGender('female')} className="bg-pink-100 border-2 border-pink-500 text-pink-700 p-6 rounded-2xl text-xl font-bold hover:bg-pink-200 transition flex items-center justify-center gap-2">👩 Woman</button>
            </div>
        </main>
      );
  }

  // 3. MAIN SWIPE INTERFACE
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-4 w-full px-4 flex justify-between items-center z-20">
         <h1 className="text-xl font-bold text-blue-600">Base Dating</h1>
         <div className="bg-white px-3 py-1 rounded-full shadow text-sm font-mono border">
            {isPending ? <span className="text-orange-500 animate-pulse">⏳ Saving...</span> : <span>💾 Pending: {queueAddr.length}/5</span>}
         </div>
      </div>

      <div className="relative w-72 h-96 mt-8">
        {/* Loading Spinner saat fetch API */}
        {isLoadingUsers && filteredProfiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500">Finding Real Users...</p>
            </div>
        ) : filteredProfiles.length > 0 ? (
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
             {/* Tombol Refresh User */}
             <button onClick={() => window.location.reload()} className="block mx-auto bg-blue-500 text-white px-6 py-2 rounded-full shadow mb-4">Refresh Users</button>
             
             {queueAddr.length > 0 && (
                 <button onClick={() => commitSwipes(queueAddr, queueLikes)} className="block mx-auto bg-green-600 text-white px-6 py-2 rounded-full shadow">Save Pending</button>
             )}
          </div>
        )}
      </div>
    </main>
  );
}