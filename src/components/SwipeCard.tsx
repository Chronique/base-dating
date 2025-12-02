"use client";

import React, { useMemo } from "react";
import TinderCard from "react-tinder-card";
import Image from "next/image";
import { useName, useAvatar } from "@coinbase/onchainkit/identity";
import { base } from "wagmi/chains";

export type Profile = {
  fid: number;
  username: string;
  display_name?: string | null;
  bio?: string | null;
  pfp_url?: string | null;
  custody_address?: string | null;
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
  const address = profile.custody_address
    ? (profile.custody_address as `0x${string}`)
    : undefined;

  // 1. Ambil Basename (Hanya satu kali deklarasi)
  const { data: basename } = useName({
    address,
    chain: base,
  });

  // 2. Ambil Avatar Onchain menggunakan basename yang didapat di atas
  const { data: onchainAvatar } = useAvatar({
    ensName: basename ?? "", // Gunakan basename sebagai input, fallback string kosong
    chain: base,
  });

  // Logika Nama: Pakai Basename kalau ada, kalau nggak pakai display name Farcaster
  const displayName = useMemo(
    () => basename || profile.display_name || profile.username || "Unknown",
    [basename, profile.display_name, profile.username]
  );

  // Logika Gambar: Prioritaskan Onchain Avatar, fallback ke Farcaster PFP
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
          {/* IMAGE */}
          <div className="absolute inset-0 z-0 bg-secondary">
            {displayImage ? (
              <Image
                src={displayImage}
                alt={displayName}
                fill
                className="object-cover pointer-events-none"
                sizes="(max-width: 768px) 100vw, 300px"
                priority={true}
                // Handle GIF atau URL eksternal dengan aman
                unoptimized={true}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white">
                <span className="text-4xl">👤</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/10" />
          </div>

          {/* BADGE TIPE USER */}
          <div className="absolute top-4 left-4 flex gap-2 z-10">
            {/* Kalau punya Basename, kasih badge Biru */}
            {basename && (
              <div className="px-3 py-1 bg-blue-600/90 backdrop-blur-md rounded-full text-[10px] text-white font-bold border border-blue-400/30 shadow-lg animate-pulse">
                🔵 BASENAME
              </div>
            )}
          </div>

          {/* INFO USER */}
          <div className="absolute bottom-0 left-0 w-full p-5 text-white z-10">
            <div className="flex flex-col gap-1 mb-1">
              <h2 className="text-2xl font-black truncate max-w-[220px] drop-shadow-md tracking-tight">
                {displayName}
              </h2>
              {/* Tampilkan address pendek kalau belum punya Basename */}
              {!basename && address && (
                <span className="text-[10px] font-mono opacity-60 bg-black/20 w-fit px-1 rounded">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              )}
            </div>

            <p className="text-sm text-gray-200 line-clamp-2 leading-relaxed opacity-90 font-medium">
              {profile.bio || "No bio available ✨"}
            </p>
          </div>
        </div>
      </TinderCard>
    </div>
  );
}

export default SwipeCard;