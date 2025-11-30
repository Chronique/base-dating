"use client";

import React from 'react';
// @ts-ignore
import TinderCard from 'react-tinder-card';
import { useName } from "@coinbase/onchainkit/identity"; 
import { base } from "wagmi/chains";

export type Profile = {
  fid: number;
  username: string;
  display_name?: string;
  bio: string;
  pfp_url: string; // <--- UBAH DARI pfpUrl JADI pfp_url
  custody_address: string;
  gender?: 'male' | 'female';
  type?: 'farcaster' | 'base';
};

export function SwipeCard({ profile, onSwipe, onCardLeftScreen }: { 
    profile: Profile, 
    onSwipe: (dir: string) => void,
    onCardLeftScreen: (identifier: string) => void 
}) {

  const { data: basename } = useName({ 
    address: profile.custody_address as `0x${string}`,
    chain: base, 
  });

  const displayName = basename || profile.display_name || profile.username;

  return (
    <div className="absolute top-0 w-72 h-96">
        <TinderCard
            className="swipe absolute w-full h-full"
            key={profile.custody_address}
            onSwipe={onSwipe}
            onCardLeftScreen={() => onCardLeftScreen(profile.custody_address)}
            preventSwipe={['up', 'down']}
        >
            <div className="w-full h-full bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 select-none cursor-grab active:cursor-grabbing">
                <div className="w-full h-3/4 bg-gray-100 relative pointer-events-none">
                    <img 
                        src={profile.pfp_url} // <--- UBAH DISINI JUGA
                        alt={displayName} 
                        className="w-full h-full object-cover"
                        draggable={false}
                    />

                    {/* BADGE TIPE USER */}
                    <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] text-white font-bold flex items-center gap-1 shadow-sm z-20">
                        {profile.type === 'base' ? '🔵 BASE' : '🟣 CAST'}
                    </div>
                </div>

                <div className="w-full h-1/4 p-4 bg-white flex flex-col justify-center relative z-20 pointer-events-none">
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
            </div>
        </TinderCard>
    </div>
  );
}