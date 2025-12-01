"use client";

import React, { useState } from "react";
import { useSpring, animated, to as interpolate } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
import { useName } from "@coinbase/onchainkit/identity"; 
import { base } from "wagmi/chains";

type Profile = {
  fid: number;
  username: string;
  display_name?: string;
  bio: string;
  pfp_url: string;
  custody_address: string;
  gender?: 'male' | 'female';
  type?: 'farcaster' | 'base';
};

export function SwipeCard({ profile, onSwipe }: { 
    profile: Profile, 
    onSwipe: (dir: string) => void 
}) {
  const [gone, setGone] = useState(false); // Status apakah kartu sudah dibuang

  const { data: basename } = useName({ 
    address: profile.custody_address as `0x${string}`,
    chain: base, 
  });

  // Konfigurasi Spring (Fisika)
  const [{ x, rot, scale }, api] = useSpring(() => ({
    x: 0,
    rot: 0,
    scale: 1,
    from: { x: 0, rot: 0, scale: 1.5 }, // Efek muncul (pop-in)
    config: { friction: 50, tension: 200 } // Rasa pegasnya
  }));

  // Logic Drag Gesture
  const bind = useDrag(({ active, movement: [mx], direction: [xDir], velocity: [vx] }) => {
    const trigger = vx > 0.2; // Kecepatan lemparan minimal
    const dir = xDir < 0 ? -1 : 1; // Arah lemparan (-1 kiri, 1 kanan)
    
    if (!active && trigger) {
      // Jika dilepas dan cukup cepat -> Lempar keluar
      setGone(true);
      const isRight = dir === 1;
      
      // Animasi lempar jauh ke luar layar
      api.start({
        x: (200 + window.innerWidth) * dir,
        rot: mx / 100 + dir * 10 * vx,
        scale: 1,
        config: { friction: 50, tension: 200 },
        onRest: () => {
            // Panggil fungsi onSwipe SETELAH animasi selesai (Anti-Glitch)
            onSwipe(isRight ? 'right' : 'left');
        }
      });
    } else {
      // Jika sedang ditarik atau dilepas pelan -> Ikuti jari atau Balik ke tengah
      api.start({
        x: active ? mx : 0,
        rot: mx / 15,
        scale: active ? 1.05 : 1, // Efek zoom dikit pas dipegang
        config: { friction: 50, tension: active ? 800 : 500 }
      });
    }
  });

  const displayName = basename || profile.display_name || profile.username;

  // Interpolasi Opacity untuk Stempel LIKE/NOPE
  // x < -20 -> Nope muncul
  // x > 20 -> Like muncul
  const nopeOpacity = x.to(x => (x < -20 ? Math.min(Math.abs(x) / 100, 1) : 0));
  const likeOpacity = x.to(x => (x > 20 ? Math.min(x / 100, 1) : 0));

  if (gone) return null; // Jangan render kalau sudah dianggap pergi (visual only)

  return (
    <div className="absolute top-0 w-72 h-96 flex items-center justify-center">
      <animated.div
        {...bind()}
        style={{
          x,
          rotate: rot,
          scale,
          touchAction: "none"
        }}
        className="relative w-full h-full bg-white rounded-3xl shadow-xl cursor-grab active:cursor-grabbing overflow-hidden border border-gray-200 select-none will-change-transform"
      >
        {/* FOTO */}
        <div className="w-full h-3/4 bg-gray-100 relative pointer-events-none">
            <img 
                src={profile.pfp_url} 
                alt={displayName} 
                className="w-full h-full object-cover pointer-events-none"
                draggable={false}
            />
            
            {/* BADGE TIPE USER */}
            <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] text-white font-bold flex items-center gap-1 shadow-sm z-20">
                {profile.type === 'base' ? '🔵 BASE' : '🟣 CAST'}
            </div>

            {/* STEMPEL LIKE (Hijau) */}
            <animated.div 
                style={{ opacity: likeOpacity }}
                className="absolute top-8 left-6 border-4 border-green-500 text-green-500 font-bold px-4 py-1 rounded-lg -rotate-12 z-50 text-3xl tracking-widest bg-white/80 shadow-lg"
            >
                LIKE
            </animated.div>

            {/* STEMPEL NOPE (Merah) */}
            <animated.div 
                style={{ opacity: nopeOpacity }}
                className="absolute top-8 right-6 border-4 border-red-500 text-red-500 font-bold px-4 py-1 rounded-lg rotate-12 z-50 text-3xl tracking-widest bg-white/80 shadow-lg"
            >
                NOPE
            </animated.div>
        </div>

        {/* INFO */}
        <div className="w-full h-1/4 p-4 bg-white flex flex-col justify-center relative z-10 pointer-events-none">
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
      </animated.div>
    </div>
  );
}