"use client";

import React, { useMemo, useState } from "react";
import TinderCard from "react-tinder-card";
import Image from "next/image";
import { useName, useAvatar } from "@coinbase/onchainkit/identity";
import { base } from "wagmi/chains";

// 👇 UPDATE: Menggunakan Material UI Icons
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';

export type Profile = {
  fid: number;
  username: string;
  display_name?: string | null;
  bio?: string | null;
  pfp_url?: string | null;
  custody_address?: string | null;
  location?: string | null;
  gender?: "male" | "female";
  type?: "farcaster" | "base";
};

export function SwipeCard({
  profile,
  onSwipe,
}: {
  profile: Profile;
  onSwipe: (dir: string) => void;
}) {
  const [imgError, setImgError] = useState(false);

  const address = profile.custody_address
    ? (profile.custody_address as `0x${string}`)
    : undefined;

  // 1. Cek apakah punya Basename (.base.eth)
  const { data: basename } = useName({
    address,
    chain: base,
  });

  // 2. Cek apakah punya Avatar Onchain
  const { data: onchainAvatar } = useAvatar({
    ensName: basename ?? "",
    chain: base,
  });

  // Prioritas Nama: Basename -> Display Name -> Username
  const displayName = useMemo(
    () => basename || profile.display_name || profile.username || "Unknown",
    [basename, profile.display_name, profile.username]
  );

  // Prioritas Gambar: Avatar Onchain -> PFP Farcaster -> Kosong
  const displayImage = onchainAvatar || profile.pfp_url || "";

  const onCardLeftScreen = (direction: string) => {
    onSwipe(direction);
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-auto">
      <TinderCard
        className="swipe"
        preventSwipe={["up", "down"]}
        onCardLeftScreen={onCardLeftScreen}
        swipeRequirementType="position"
        swipeThreshold={100}
      >
        <div className="relative w-64 h-80 bg-card rounded-3xl shadow-xl overflow-hidden border border-border select-none cursor-grab active:cursor-grabbing">
          
          {/* IMAGE AREA */}
          <div className="absolute inset-0 z-0 bg-muted flex items-center justify-center">
            {!imgError && displayImage ? (
              <Image
                src={displayImage}
                alt={displayName}
                fill
                className="object-cover pointer-events-none"
                sizes="(max-width: 768px) 100vw, 300px"
                priority={true}
                onError={() => setImgError(true)}
                unoptimized={true}
              />
            ) : (
              // 👇 UPDATE: Fallback Icon menggunakan Material Design
              <div className="flex flex-col items-center text-muted-foreground opacity-50">
                <PersonRoundedIcon sx={{ fontSize: 80 }} />
              </div>
            )}
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          </div>

          {/* BADGE BASENAME (Glow Effect) */}
          <div className="absolute top-4 left-4 flex gap-2 z-10">
            {basename ? (
              <div className="px-3 py-1 bg-blue-600/90 backdrop-blur-md rounded-full text-[10px] text-white font-bold border border-blue-400/30 shadow-lg animate-pulse">
                🔵 BASENAME
              </div>
            ) : (
              <div className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-[10px] text-white font-bold border border-white/20">
                {profile.type === "base" ? "🛡️ BASE" : "🟣 CAST"}
              </div>
            )}
          </div>

          {/* INFO USER */}
          <div className="absolute bottom-0 left-0 w-full p-5 text-white z-10">
            <div className="flex flex-col gap-1 mb-2">
              {/* Nama */}
              <h2 className="text-2xl font-black truncate max-w-[220px] drop-shadow-md tracking-tight">
                {displayName}
              </h2>
              
              {/* Lokasi / Address */}
              <div className="flex items-center gap-1 opacity-90">
                {profile.location ? (
                   // 👇 UPDATE: Icon Lokasi Material Design
                   <span className="flex items-center gap-1 text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium backdrop-blur-sm">
                     <LocationOnRoundedIcon sx={{ fontSize: 12 }} /> 
                     {profile.location}
                   </span>
                ) : (
                  address && (
                    <span className="text-[10px] font-mono opacity-70 bg-black/30 px-1.5 py-0.5 rounded">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                  )
                )}
              </div>
            </div>
            
            {/* Bio */}
            <p className="text-xs text-gray-200 line-clamp-2 leading-relaxed opacity-90 font-medium">
              {profile.bio || "No bio available ✨"}
            </p>
          </div>

        </div>
      </TinderCard>
    </div>
  );
}

export default SwipeCard;