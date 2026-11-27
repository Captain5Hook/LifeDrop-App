import React, { useState } from 'react';
import type { StockHealth } from '../data/seedStats';

interface HeroSceneProps {
  health: StockHealth;
  dataSaver: boolean;
}

export const HeroScene: React.FC<HeroSceneProps> = ({ health, dataSaver }) => {
  const [touchOffset, setTouchOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isPressed, setIsPressed] = useState(false);

  const glowColor =
    health === 'critical'
      ? '#F43F5E'
      : health === 'low'
        ? '#FBBF24'
        : '#34D399';

  const glowBgClass =
    health === 'critical'
      ? 'bg-[#F43F5E]/30'
      : health === 'low'
        ? 'bg-[#FBBF24]/30'
        : 'bg-[#34D399]/30';

  const statusText =
    health === 'critical'
      ? 'Critical blood shortage alert'
      : health === 'low'
        ? 'Low reserves in select groups'
        : 'Blood supply stable';

  const shouldPulse = health === 'critical' && !dataSaver;

  const updateOffsetFromClientPoint = (
    clientX: number,
    clientY: number,
    rect: DOMRect,
  ) => {
    if (dataSaver || rect.width === 0 || rect.height === 0) return;
    const normX = ((clientX - rect.left) / rect.width - 0.5) * 2;
    const normY = ((clientY - rect.top) / rect.height - 0.5) * 2;
    setTouchOffset({
      x: Math.max(-7, Math.min(7, Number((normX * 6).toFixed(2)))),
      y: Math.max(-5, Math.min(5, Number((normY * 4.5).toFixed(2)))),
    });
  };

  const resetInteraction = () => {
    setIsPressed(false);
    setTouchOffset({ x: 0, y: 0 });
  };

  return (
    <div
      role="img"
      onPointerDown={(e) => {
        setIsPressed(true);
        updateOffsetFromClientPoint(
          e.clientX,
          e.clientY,
          e.currentTarget.getBoundingClientRect(),
        );
      }}
      onPointerMove={(e) => {
        updateOffsetFromClientPoint(
          e.clientX,
          e.clientY,
          e.currentTarget.getBoundingClientRect(),
        );
      }}
      onPointerUp={resetInteraction}
      onPointerLeave={resetInteraction}
      onTouchStart={(e) => {
        setIsPressed(true);
        const touch = e.touches[0];
        if (touch) {
          updateOffsetFromClientPoint(
            touch.clientX,
            touch.clientY,
            e.currentTarget.getBoundingClientRect(),
          );
        }
      }}
      onTouchMove={(e) => {
        const touch = e.touches[0];
        if (touch) {
          updateOffsetFromClientPoint(
            touch.clientX,
            touch.clientY,
            e.currentTarget.getBoundingClientRect(),
          );
        }
      }}
      onTouchEnd={resetInteraction}
      className="relative mx-auto flex max-h-[140px] w-full max-w-[230px] touch-pan-y flex-col items-center justify-center select-none [@media(max-height:720px)]:max-h-[112px]"
      aria-label={statusText}
    >
      <div
        className={`pointer-events-none absolute top-1/2 left-1/2 h-28 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-all duration-300 ${glowBgClass} ${
          shouldPulse ? 'animate-pulse' : ''
        } ${isPressed ? 'scale-110 opacity-95' : 'opacity-80'}`}
      />

      <svg
        viewBox="0 0 260 154"
        className="relative z-10 h-[clamp(76px,14vh,134px)] max-h-[140px] w-full drop-shadow-[0_14px_26px_rgba(14,10,40,0.45)] transition-transform duration-200 [@media(max-height:720px)]:max-h-[112px]"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ldDropGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={health === 'critical' ? '#FB7185' : health === 'low' ? '#FCD34D' : '#6EE7B7'} />
            <stop offset="55%" stopColor={glowColor} />
            <stop offset="100%" stopColor={health === 'critical' ? '#BE123C' : health === 'low' ? '#D97706' : '#059669'} />
          </linearGradient>
          <linearGradient id="ldRoofGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E9D5FF" />
            <stop offset="100%" stopColor="#9D84E8" />
          </linearGradient>
          <linearGradient id="ldWallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#382B73" />
            <stop offset="100%" stopColor="#231B52" />
          </linearGradient>
          <linearGradient id="ldHillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4F3D9E" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#2A205C" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Ambient floating particles reacting gently to touch/pointer */}
        <g
          transform={`translate(${(-touchOffset.x * 0.7).toFixed(2)}, ${(-touchOffset.y * 0.7).toFixed(2)})`}
        >
          <circle cx="44" cy="36" r="2.2" fill={glowColor} opacity="0.55" />
          <circle cx="84" cy="20" r="1.5" fill="#E9D5FF" opacity="0.7" />
          <circle cx="176" cy="24" r="1.8" fill={glowColor} opacity="0.5" />
          <circle cx="222" cy="58" r="2" fill="#C4B5FD" opacity="0.5" />
          <circle cx="30" cy="76" r="1.6" fill="#A78BFA" opacity="0.55" />
        </g>

        <path
          d="M 10 144 Q 130 118 250 144 L 250 154 L 10 154 Z"
          fill="url(#ldHillGrad)"
        />

        <circle cx="212" cy="28" r="10" fill="#FDE68A" opacity="0.22" />
        <path
          d="M 215 20 A 8 8 0 1 0 221 33 A 6.5 6.5 0 1 1 215 20 Z"
          fill="#FEF3C7"
          opacity="0.85"
        />

        <g
          transform={`translate(${(130 + touchOffset.x).toFixed(2)}, ${(34 + touchOffset.y).toFixed(2)})`}
        >
          <circle cx="0" cy="4" r={isPressed ? 25 : 22} fill={glowColor} opacity={isPressed ? 0.34 : 0.22} />
          <path
            d="M 0 -22 C 0 -22 -16 -2 -16 9 C -16 18 -8.8 25 0 25 C 8.8 25 16 18 16 9 C 16 -2 0 -22 0 -22 Z"
            fill="url(#ldDropGrad)"
            stroke="rgba(255,255,255,0.65)"
            strokeWidth="1.2"
          />
          <rect x="-2" y="3" width="4" height="12" rx="1.5" fill="#FFFFFF" opacity="0.95" />
          <rect x="-6" y="7" width="12" height="4" rx="1.5" fill="#FFFFFF" opacity="0.95" />
        </g>

        <g
          transform={`translate(${(52 + touchOffset.x * 0.35).toFixed(2)}, ${(66 + touchOffset.y * 0.35).toFixed(2)})`}
        >
          <rect x="22" y="26" width="112" height="48" rx="4" fill="url(#ldWallGrad)" />
          <rect x="10" y="38" width="22" height="36" rx="3" fill="#2A205C" />
          <rect x="124" y="38" width="22" height="36" rx="3" fill="#2A205C" />

          <path d="M 12 28 L 78 2 L 144 28 L 138 33 L 18 33 Z" fill="url(#ldRoofGrad)" />
          <path d="M 78 2 L 144 28 L 138 33 L 78 8 Z" fill="#C4B5FD" opacity="0.55" />

          <circle cx="26" cy="34" r="1.5" fill="#FDE68A" />
          <circle cx="42" cy="34" r="1.5" fill="#FCA5A5" />
          <circle cx="58" cy="34" r="1.5" fill="#6EE7B7" />
          <circle cx="74" cy="34" r="1.5" fill="#FDE68A" />
          <circle cx="90" cy="34" r="1.5" fill="#FCA5A5" />
          <circle cx="106" cy="34" r="1.5" fill="#6EE7B7" />
          <circle cx="122" cy="34" r="1.5" fill="#FDE68A" />

          <rect x="34" y="42" width="18" height="22" rx="2.5" fill="#FDE68A" opacity="0.92" />
          <line x1="43" y1="42" x2="43" y2="64" stroke="#382B73" strokeWidth="1.5" />
          <line x1="34" y1="53" x2="52" y2="53" stroke="#382B73" strokeWidth="1.5" />

          <rect x="104" y="42" width="18" height="22" rx="2.5" fill="#FDE68A" opacity="0.92" />
          <line x1="113" y1="42" x2="113" y2="64" stroke="#382B73" strokeWidth="1.5" />
          <line x1="104" y1="53" x2="122" y2="53" stroke="#382B73" strokeWidth="1.5" />

          <rect x="66" y="42" width="24" height="32" rx="12" fill="#4C3A96" stroke="#A78BFA" strokeWidth="1.2" />
          <circle cx="78" cy="54" r="7" fill={glowColor} opacity="0.9" />
          <rect x="76.8" y="50" width="2.4" height="8" rx="1" fill="#FFFFFF" />
          <rect x="74" y="52.8" width="8" height="2.4" rx="1" fill="#FFFFFF" />
        </g>

        <polygon points="34,138 42,114 50,138" fill="#312468" />
        <polygon points="210,138 218,112 226,138" fill="#312468" />
      </svg>
    </div>
  );
};
