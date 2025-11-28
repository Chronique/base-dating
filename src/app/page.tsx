"use client";

import { useState } from "react";
// Tambahkan useAccount dan useConnect
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { SwipeCard } from "../components/SwipeCard"; 
import { CONTRACT_ADDRESS, DATING_ABI } from "../constants";

const MOCK_PROFILES = [
  { fid: 1, username: "vitalik.eth", bio: "Ethereum Founder" },
  { fid: 2, username: "dwr.eth", bio: "Farcaster Founder" },
  { fid: 3, username: "base_god", bio: "Based Creator" },
  { fid: 88, username: "jesse.xyz", bio: "Coinbase" },
];

export default function Home() {
  const [profiles, setProfiles] = useState(MOCK_PROFILES);
  
  // 1. Hook untuk cek status wallet
  const { isConnected } = useAccount();
  const { connect } = useConnect();

  const { data: hash, writeContract, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ 
    hash 
  });

  const handleSwipe = (liked: boolean) => {
    const currentProfile = profiles[0];
    
    console.log(`Swiping ${liked ? "LIKE" : "PASS"} on FID: ${currentProfile.fid}`);
    
    // Kirim transaksi ke Blockchain
    try {
      writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: DATING_ABI,
        functionName: 'swipe',
        args: [BigInt(currentProfile.fid), liked], 
      });
    } catch (err) {
      console.error("Gagal kirim transaksi:", err);
    }

    setProfiles((prev) => prev.slice(1));
  };

  // --- LOGIKA TAMPILAN ---

  // 2. Jika BELUM Connect Wallet, tampilkan tombol Connect
  if (!isConnected) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">Base Dating 🔵</h1>
        <p className="text-gray-500 mb-8">Cari jodoh on-chain di Base network.</p>
        
        <button
          onClick={() => connect({ connector: injected() })}
          className="bg-black text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl hover:scale-105 transition transform"
        >
          🔌 Connect Wallet
        </button>
      </main>
    );
  }

  // 3. Jika SUDAH Connect, tampilkan Aplikasi Dating
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-blue-600 mb-4">Base Dating 🔵</h1>
      
      {/* STATUS TRANSAKSI */}
      <div className="h-8 mb-4 text-sm font-mono text-center">
        {isPending && <span className="text-orange-500 animate-pulse">⏳ Confirming in Wallet...</span>}
        {isConfirming && <span className="text-blue-500 animate-bounce">⛓️ Processing on Base...</span>}
        {isSuccess && <span className="text-green-600 font-bold">✅ Transaction Success!</span>}
        {error && <span className="text-red-500 text-xs">❌ {error.message.split('.')[0]}</span>}
      </div>

      <div className="relative w-72 h-96">
        {profiles.length > 0 ? (
          profiles.map((profile, index) => {
            const dynamicImage = `https://robohash.org/${profile.fid}?set=set4&bgset=bg2`;

            return (
              <div 
                key={profile.fid} 
                className={`absolute top-0 left-0 w-full h-full transition-all duration-300 ${index === 0 ? "z-10" : "z-0 scale-95 opacity-50 translate-y-4"}`}
              >
                {index === 0 ? (
                   <SwipeCard 
                      profile={{ ...profile, pfpUrl: dynamicImage }} 
                      onSwipe={handleSwipe} 
                   />
                ) : (
                   <div className="w-full h-full bg-white rounded-3xl shadow-lg border border-gray-200 p-4 flex items-center justify-center">
                      <div className="text-center opacity-50">
                        <img 
                            src={`https://robohash.org/${profile.fid}?set=set4`} 
                            alt={profile.username}
                            className="w-16 h-16 mx-auto mb-2 rounded-full"
                        />
                        <p>Next: @{profile.username}</p>
                      </div>
                   </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center text-gray-500">
             <div className="text-6xl mb-4">🏁</div>
             <p>No more profiles!</p>
             <button onClick={() => setProfiles(MOCK_PROFILES)} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded shadow">Reset</button>
          </div>
        )}
      </div>
    </main>
  );
}