"use client";

import React from "react";
import TinderCard from "react-tinder-card"; 
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

  const { data: basename } = useName({ 
    address: profile.custody_address as `0x${string}`,
    chain: base, 
  });

  const displayName = basename || profile.display_name || profile.username;

  const onCardLeftScreen = (direction: string) => {
    onSwipe(direction);
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-10">
      <TinderCard
        className="swipe"
        preventSwipe={['up', 'down']}
        onCardLeftScreen={onCardLeftScreen}
        swipeRequirementType="position"
        swipeThreshold={100} 
      >
        {/* KARTU VISUAL */}
        <div 
            // 👇 UPDATE: Kita tambahkan 'bg-cover bg-center bg-no-repeat' di sini
            className="relative w-72 h-96 bg-card rounded-3xl shadow-xl overflow-hidden border border-border select-none cursor-grab active:cursor-grabbing bg-cover bg-center bg-no-repeat"
            style={{ 
                // 👇 Hanya URL gambar yang tersisa di sini karena sifatnya dinamis
                backgroundImage: `url(${profile.pfp_url})`
            }}
        >
            {/* GRADIENT OVERLAY */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/10" />

            {/* BADGE TIPE USER */}
            <div className="absolute top-4 left-4 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-[10px] text-white font-bold flex items-center gap-1 border border-white/20">
                {profile.type === 'base' ? '🔵 BASE' : '🟣 CAST'}
            </div>

            {/* INFO USER */}
            <div className="absolute bottom-0 left-0 w-full p-5 text-white">
                <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-bold truncate max-w-[200px] drop-shadow-md">
                        {displayName}
                    </h2>
                    {basename && (
                        <span className="text-[10px] bg-blue-500/80 text-white px-2 py-0.5 rounded-full font-bold">
                            .base.eth
                        </span>
                    )}
                </div>
                <p className="text-sm text-gray-200 line-clamp-2 leading-relaxed opacity-90">
                    {profile.bio}
                </p>
            </div>
        </div>
      </TinderCard>
    </div>
  );
}