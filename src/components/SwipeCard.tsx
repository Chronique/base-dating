"use client";

import { motion, PanInfo, useMotionValue, useTransform, useAnimation } from "framer-motion";
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
  const controls = useAnimation();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);

  // Opacity Stamp (Muncul perlahan saat digeser)
  const likeOpacity = useTransform(x, [20, 150], [0, 1]);
  const passOpacity = useTransform(x, [-150, -20], [1, 0]);

  const { data: basename } = useName({ 
    address: profile.custody_address as `0x${string}`,
    chain: base, 
  });

  const handleDragEnd = async (event: any, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset > 100 || velocity > 500) {
      await controls.start({ x: 500, opacity: 0, transition: { duration: 0.2 } });
      onSwipe(true);
    } else if (offset < -100 || velocity < -500) {
      await controls.start({ x: -500, opacity: 0, transition: { duration: 0.2 } });
      onSwipe(false);
    } else {
      controls.start({ x: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 20 } });
    }
  };

  const displayName = basename || profile.display_name || profile.username;

  return (
    <motion.div
      drag="x"
      animate={controls}
      style={{ x, rotate }}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute top-0 w-72 h-96 bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 cursor-grab active:cursor-grabbing will-change-transform"
    >
      {/* 🔥 PERUBAHAN: STEMPEL DIPINDAHKAN KE LUAR KONTAINER GAMBAR 🔥 */}
      {/* Stempel sekarang berada di root kartu, bukan di dalam div gambar */}
      
      {/* INDIKATOR LIKE (Hijau) */}
      <motion.div 
          style={{ opacity: likeOpacity }} 
          className="absolute top-8 left-8 border-4 border-green-500 text-green-500 font-bold px-4 py-1 rounded-lg transform -rotate-12 bg-white/80 z-50 text-2xl tracking-widest pointer-events-none shadow-sm"
      >
          LIKE
      </motion.div>

      {/* INDIKATOR NOPE (Merah) */}
      <motion.div 
          style={{ opacity: passOpacity }} 
          className="absolute top-8 right-8 border-4 border-red-500 text-red-500 font-bold px-4 py-1 rounded-lg transform rotate-12 bg-white/80 z-50 text-2xl tracking-widest pointer-events-none shadow-sm"
      >
          NOPE
      </motion.div>

      <div className="w-full h-3/4 bg-gray-100 relative">
        <img 
            src={profile.pfpUrl} 
            alt={displayName} 
            className="w-full h-full object-cover pointer-events-none"
            loading="eager"
        />

        {/* BADGE TIPE USER */}
        <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] text-white font-bold flex items-center gap-1 shadow-sm z-20">
            {profile.type === 'base' ? '🔵 BASE' : '🟣 CAST'}
        </div>
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