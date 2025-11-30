"use client";

import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { useName } from "@coinbase/onchainkit/identity"; 
import { base } from "wagmi/chains";

// 👇 Update Tipe Data agar sesuai dengan page.tsx
type Profile = {
  fid: number;
  username: string;
  display_name?: string; // Tambahkan ini (opsional agar aman)
  bio: string;
  pfpUrl: string;
  custody_address: string;
  gender?: 'male' | 'female';
  type?: 'farcaster' | 'base';
};

export function SwipeCard({ profile, onSwipe }: { profile: Profile, onSwipe: (liked: boolean) => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const bg = useTransform(x, [-150, 0, 150], ["rgba(255, 0, 0, 0.5)", "rgba(255,255,255,1)", "rgba(0, 255, 0, 0.5)"]);

  // Fetch Basename (jika ada)
  const { data: basename } = useName({ 
    address: profile.custody_address as `0x${string}`,
    chain: base, 
  });

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (info.offset.x > 100) {
      onSwipe(true);
    } else if (info.offset.x < -100) {
      onSwipe(false);
    }
  };

  // Tentukan nama yang akan ditampilkan (Prioritas: Basename -> Display Name -> Username)
  const displayName = basename || profile.display_name || profile.username;

  return (
    <motion.div
      style={{ x, rotate, background: bg }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute top-0 w-72 h-96 bg-white rounded-3xl shadow-2xl flex flex-col items-center overflow-hidden border border-gray-200 cursor-grab active:cursor-grabbing"
    >
      <div className="w-full h-3/4 bg-gray-200 relative">
        <img 
            src={profile.pfpUrl} 
            alt={displayName} 
            className="w-full h-full object-cover pointer-events-none" 
        />
        
        {/* Indikator Like/Pass */}
        <motion.div style={{ opacity: useTransform(x, [50, 150], [0, 1]) }} className="absolute top-4 left-4 border-4 border-green-500 text-green-500 font-bold px-2 rounded transform -rotate-12 bg-white/80">
            LIKE
        </motion.div>
        <motion.div style={{ opacity: useTransform(x, [-150, -50], [1, 0]) }} className="absolute top-4 right-4 border-4 border-red-500 text-red-500 font-bold px-2 rounded transform rotate-12 bg-white/80">
            PASS
        </motion.div>
      </div>

      <div className="w-full h-1/4 p-4 bg-white">
        <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-800 truncate max-w-[200px]">
                    {displayName}
                </h2>
                {/* Badge Basename jika ada */}
                {basename && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">Base</span>}
            </div>
            
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {profile.bio}
            </p>
        </div>
      </div>
    </motion.div>
  );
}