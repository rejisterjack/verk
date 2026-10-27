import React from "react";

interface VerkLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

export function VerkIcon({
  size = 28,
  className = "",
  glow = true,
}: {
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {glow && (
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-lg bg-accent/30 blur-md pointer-events-none transition-opacity duration-300"
        />
      )}
      <svg
        className="relative z-10 block"
        fill="none"
        height={size}
        viewBox="0 0 32 32"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Squircle gradient background */}
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id="vk-squircle-bg"
            x1="0"
            x2="32"
            y1="0"
            y2="32"
          >
            <stop offset="0%" stopColor="#1C212B" />
            <stop offset="100%" stopColor="#0B0E14" />
          </linearGradient>

          {/* Electric Teal / Emerald gradient for right wing */}
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id="vk-teal-glow"
            x1="14"
            x2="26"
            y1="25"
            y2="7"
          >
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#14B8A6" />
            <stop offset="100%" stopColor="#2DD4BF" />
          </linearGradient>

          {/* Titanium / Silver gradient for left wing */}
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id="vk-titanium"
            x1="6"
            x2="15"
            y1="7"
            y2="25"
          >
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>

          {/* Precision inner border highlight */}
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id="vk-border-stroke"
            x1="0"
            x2="0"
            y1="0"
            y2="32"
          >
            <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
          </linearGradient>
        </defs>

        {/* Outer Apple-style squircle container */}
        <rect
          fill="url(#vk-squircle-bg)"
          height="30"
          rx="7.5"
          stroke="url(#vk-border-stroke)"
          strokeWidth="1"
          width="30"
          x="1"
          y="1"
        />

        {/* Left Wing of the "V" - Titanium Precision Column */}
        <path
          d="M7 8.5H11.2L15 20.8L12.6 24.5L7 8.5Z"
          fill="url(#vk-titanium)"
        />

        {/* Right Wing of the "V" - Electric Luminescent Ascent Blade */}
        <path
          d="M13.8 24.5L16.2 20.8L21 8.5H25.2L16.6 24.5H13.8Z"
          fill="url(#vk-teal-glow)"
        />

        {/* Apex precision tick */}
        <circle cx="15" cy="24.5" fill="#2DD4BF" r="1.2" />
      </svg>
    </div>
  );
}

export function VerkLogo({
  size = 28,
  className = "",
  showText = true,
  textClassName = "",
}: VerkLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <VerkIcon size={size} />
      {showText && (
        <span
          className={`font-display text-[1.3rem] font-bold tracking-tight text-foreground leading-none ${textClassName}`}
        >
          Verk
        </span>
      )}
    </div>
  );
}
