"use client";

import React, { useMemo } from "react";
import TinderCard from "react-tinder-card";
import Image from "next/image";
import { useName } from "@coinbase/onchainkit/identity";
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
  // useName only when we have an address-like string
  const address = profile.custody_address
    ? (profile.custody_address as `0x${string}`)
    : undefined;

  const { data: basename } = useName({
    address,
    chain: base,
    // useName should be tolerant if address is undefined (some libs accept undefined)
  });

  const displayName = useMemo(
    () => basename || profile.display_name || profile.username || "Unknown",
    [basename, profile.display_name, profile.username]
  );

  const onCardLeftScreen = (direction: string) => {
    // pass direction up to parent
    onSwipe(direction);
  };

  const pfp = profile.pfp_url ?? "";

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
          {/* IMAGE (Next.js Image Optimization) */}
          <div className="absolute inset-0 z-0">
            {pfp ? (
              <Image
                src={pfp}
                alt={displayName || "User"}
                fill
                className="object-cover pointer-events-none"
                sizes="(max-width: 768px) 100vw, 300px"
                priority={true}
                // unoptimized only if url endsWith .gif (safe check)
                unoptimized={typeof pfp === "string" && pfp.endsWith(".gif")}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white">
                <span className="font-bold">No Image</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/10" />
          </div>

          {/* BADGE */}
          <div className="absolute top-4 left-4 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-[10px] text-white font-bold flex items-center gap-1 border border-white/20 z-10">
            {profile.type === "base" ? "🔵 BASE" : "🟣 CAST"}
          </div>

          {/* INFO USER */}
          <div className="absolute bottom-0 left-0 w-full p-5 text-white z-10">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold truncate max-w-[180px] drop-shadow-md">
                {displayName}
              </h2>
              {basename && (
                <span className="text-[10px] bg-blue-500/80 text-white px-2 py-0.5 rounded-full font-bold">
                  .base.eth
                </span>
              )}
            </div>
            <p className="text-xs text-gray-200 line-clamp-2 leading-relaxed opacity-90">
              {profile.bio ?? `Farcaster @${profile.username ?? "unknown"}`}
            </p>
          </div>
        </div>
      </TinderCard>
    </div>
  );
}

export default SwipeCard;
