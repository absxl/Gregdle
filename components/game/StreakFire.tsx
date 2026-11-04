/**
 * Streak badge (D24): animated Minecraft-style fire with the streak count
 * rendered on top in a blocky pixel face (Silkscreen). Zero streak renders
 * nothing (no fire to show).
 */

export function StreakFire({ n, size = 48 }: { n: number; size?: number }) {
  if (n <= 0) return null;
  return (
    <span
      className="relative inline-flex items-end justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${n} day streak`}
      title={`${n} day streak`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/fire.gif"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-contain"
        style={{
          imageRendering: "pixelated",
          filter: "drop-shadow(0 0 6px rgba(245,166,35,0.55))",
        }}
      />
      <span
        className="streak-number relative z-10 font-bold leading-none"
        style={{ fontSize: Math.max(13, Math.round(size * 0.34)) }}
      >
        {n}
      </span>
    </span>
  );
}
