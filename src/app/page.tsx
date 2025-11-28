"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useConnect } from "wagmi";
import { SwipeCard } from "../components/SwipeCard"; 
import { CONTRACT_ADDRESS, DATING_ABI } from "../constants";

// Data Dummy (Nanti diganti API Farcaster asli)
const MOCK_PROFILES = Array.from({ length: 60 }).map((_, i) => ({
  fid: i + 1,
  username: `user_farcaster_${i + 1}`,
  bio: "Crypto enthusiast"
}));

export default function Home() {
  const [profiles, setProfiles] = useState(MOCK_PROFILES);
  const [mounted, setMounted] = useState(false);
  
  // STATE UNTUK MENAMPUNG SWIPE SEMENTARA
  const [queueFids, setQueueFids] = useState<bigint[]>([]);
  const [queueLikes, setQueueLikes] = useState<boolean[]>([]);

  const { isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => { setMounted(true); }, []);

  // --- LOGIKA UTAMA ---
  const handleSwipe = (liked: boolean) => {
    const currentProfile = profiles[0];
    
    // 1. Masukkan ke antrian (JANGAN KIRIM KE BLOCKCHAIN DULU)
    const newFids = [...queueFids, BigInt(currentProfile.fid)];
    const newLikes = [...queueLikes, liked];
    
    setQueueFids(newFids);
    setQueueLikes(newLikes);

    console.log(`Antrian: ${newFids.length}/50`);

    // 2. Cek apakah sudah 50?
    if (newFids.length >= 50) {
        commitSwipes(newFids, newLikes); // Kirim otomatis
    }

    // 3. Ganti kartu (Instan)
    setProfiles((prev) => prev.slice(1));
  };

  const commitSwipes = (fids: bigint[], likes: boolean[]) => {
    console.log("🚀 Mengirim 50 Data ke Blockchain...");
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: DATING_ABI,
      functionName: 'batchSwipe',
      args: [fids, likes], 
    });
  };

  // Bersihkan antrian jika sukses
  useEffect(() => {
    if (isSuccess) {
      setQueueFids([]);
      setQueueLikes([]);
      alert("✅ 50 Swipe berhasil disimpan ke Blockchain!");
    }
  }, [isSuccess]);

  if (!mounted) return null;

  // Tampilan Login
  if (!isConnected) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <h1 className="text-3xl font-bold text-blue-600 mb-6">Base Dating 🔵</h1>
        <div className="flex flex-col gap-3">
          {connectors.map((connector) => (
            <button key={connector.uid} onClick={() => connect({ connector })} className="bg-white border border-blue-600 text-blue-600 px-6 py-3 rounded-xl font-bold">
              Connect {connector.name}
            </button>
          ))}
        </div>
      </main>
    );
  }

  // Tampilan Utama
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 relative">
      
      {/* HEADER STATUS */}
      <div className="absolute top-4 w-full px-4 flex justify-between items-center z-20">
         <h1 className="text-xl font-bold text-blue-600">Base Dating</h1>
         <div className="bg-white px-3 py-1 rounded-full shadow text-sm font-mono border">
            {/* Indikator Antrian */}
            {isPending || isConfirming ? (
                <span className="text-orange-500 animate-pulse">⏳ Saving...</span>
            ) : (
                <span className={queueFids.length > 40 ? "text-red-500 font-bold" : "text-gray-600"}>
                    💾 Pending: {queueFids.length}/50
                </span>
            )}
         </div>
      </div>

      <div className="relative w-72 h-96 mt-8">
        {profiles.length > 0 ? (
          profiles.map((profile, index) => {
            const dynamicImage = `https://robohash.org/${profile.fid}?set=set4&bgset=bg2`;
            return (
              <div key={profile.fid} className={`absolute top-0 left-0 w-full h-full transition-all duration-300 ${index === 0 ? "z-10" : "z-0 scale-95 opacity-50 translate-y-4"}`}>
                {index === 0 ? (
                   <SwipeCard profile={{ ...profile, pfpUrl: dynamicImage }} onSwipe={handleSwipe} />
                ) : (
                   <div className="w-full h-full bg-white rounded-3xl shadow-lg border border-gray-200 p-4 flex items-center justify-center">Loading...</div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center">
             <p className="text-2xl mb-4">Kartu Habis!</p>
             {queueFids.length > 0 && (
                <button 
                    onClick={() => commitSwipes(queueFids, queueLikes)} 
                    className="bg-green-600 text-white px-6 py-3 rounded-full font-bold shadow-lg animate-bounce"
                >
                    Simpan {queueFids.length} Data Terakhir 🚀
                </button>
             )}
          </div>
        )}
      </div>

      {/* Tombol Simpan Manual (Floating Button) */}
      {queueFids.length > 0 && queueFids.length < 50 && (
          <button 
            onClick={() => commitSwipes(queueFids, queueLikes)}
            className="fixed bottom-6 right-6 bg-black text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl z-50 hover:scale-105 transition"
          >
            Simpan Sekarang ({queueFids.length})
          </button>
      )}

    </main>
  );
}