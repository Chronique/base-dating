"use client";

import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion";

// Perhatikan: Tidak ada kata 'default', tapi pakai 'export function'
export function SwipeCard({ profile, onSwipe }: { profile: any, onSwipe: (liked: boolean) => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const bg = useTransform(x, [-150, 0, 150], ["rgba(255, 0, 0, 0.5)", "rgba(255,255,255,1)", "rgba(0, 255, 0, 0.5)"]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (info.offset.x > 100) {
      onSwipe(true);
    } else if (info.offset.x < -100) {
      onSwipe(false);
    }
  };

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
            alt={profile.username} 
            className="w-full h-full object-cover pointer-events-none" 
        />
      </div>

      <div className="w-full h-1/4 p-4 bg-white">
        <h2 className="text-xl font-bold text-gray-800">@{profile.username}</h2>
        <p className="text-sm text-gray-500 line-clamp-2">{profile.bio}</p>
      </div>
    </motion.div>
  );
}