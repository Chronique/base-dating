"use client";

import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { useName } from "@coinbase/onchainkit/identity"; 
import { base } from "wagmi/chains";

type Profile = {
  fid: number;
  username: string;
  display_name?: string;
  bio: string;
  pfpUrl: string;
  custody_address: string;
  gender?: 'male' | 'female';
  type?: 'farcaster' | 'base';
};

export function SwipeCard({ profile, onSwipe }: { profile: Profile, onSwipe: (liked: boolean) => void }) {
  const x = useMotionValue(0);
  // Rotasi dikurangi sedikit biar tidak terlalu liar
  const rotate = useTransform(x, [-200, 200], [-15, 15]);

  // Opacity Stamp (Muncul lebih smooth)
  const likeOpacity = useTransform(x, [40, 150], [0, 1]);
  const passOpacity = useTransform(x, [-150, -40], [1, 0]);

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

  const displayName = basename || profile.display_name || profile.username;

  return (
    <motion.div
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6} // Sedikit pantulan biar natural
      onDragEnd={handleDragEnd}
      // 🔥 FIX GLITCH: Tambahkan 'will-change-transform' dan 'backface-hidden'
      // Ini memaksa browser pakai GPU, menghilangkan kedipan merah/hijau
      className="absolute top-0 w-72 h-96 bg-white rounded-3xl shadow-2xl flex flex-col items-center overflow-hidden border border-gray-200 cursor-grab active:cursor-grabbing will-change-transform transform-gpu"
    >
      <div className="w-full h-3/4 bg-gray-100 relative isolate">
        <img 
            src={profile.pfpUrl} 
            alt={displayName} 
            className="w-full h-full object-cover pointer-events-none" 
            loading="eager" // Paksa load gambar duluan
        />
        
        {/* BADGE TIPE USER */}
        <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] text-white font-bold flex items-center gap-1 shadow-sm z-20">
            {profile.type === 'base' ? '🔵 BASE' : '🟣 CAST'}
        </div>

        {/* INDIKATOR LIKE */}
        <motion.div 
            style={{ opacity: likeOpacity }} 
            className="absolute top-8 left-8 border-4 border-green-500 text-green-500 font-bold px-4 py-1 rounded-lg transform -rotate-12 bg-white/90 z-30 tracking-widest text-2xl shadow-lg"
        >
            LIKE
        </motion.div>

        {/* INDIKATOR PASS */}
        <motion.div 
            style={{ opacity: passOpacity }} 
            className="absolute top-8 right-8 border-4 border-red-500 text-red-500 font-bold px-4 py-1 rounded-lg transform rotate-12 bg-white/90 z-30 tracking-widest text-2xl shadow-lg"
        >
            NOPE
        </motion.div>
      </div>

      <div className="w-full h-1/4 p-4 bg-white flex flex-col justify-center relative z-20">
        <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-gray-800 truncate max-w-[180px]">
                {displayName}
            </h2>
            {basename && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-200">
                    .base.eth
                </span>
            )}
        </div>
        
        <p className="text-sm text-gray-500 line-clamp-2 leading-snug">
            {profile.bio}
        </p>
      </div>
    </motion.div>
  );
}