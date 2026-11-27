import React from 'react';
import { Home, MapPin, MessageCircle, Plus, User } from 'lucide-react';

export type NavTab = 'home' | 'map' | 'sos' | 'chat' | 'profile';

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const navItemClass = (tab: NavTab) =>
    `pointer-events-auto flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
      activeTab === tab
        ? 'text-white'
        : 'text-white/65 hover:text-white/95'
    }`;

  return (
    <nav
      aria-label="Primary navigation"
      className="pointer-events-auto absolute right-0 bottom-0 left-0 z-30 select-none"
    >
      <div className="relative flex h-[calc(72px+env(safe-area-inset-bottom,0px))] items-end justify-between px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
        <svg
          viewBox="0 0 400 74"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <path
            d="M 0 12 L 122 12 C 148 12 158 46 200 46 C 242 46 252 12 278 12 L 400 12 L 400 74 L 0 74 Z"
            className="fill-[#251E54]/95"
          />
          <path
            d="M 0 12 L 122 12 C 148 12 158 46 200 46 C 242 46 252 12 278 12 L 400 12"
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="1"
          />
        </svg>

        <div className="relative z-10 flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => onSelectTab('home')}
            aria-current={activeTab === 'home' ? 'page' : undefined}
            aria-label="Home"
            className={navItemClass('home')}
          >
            <Home className="h-5 w-5" strokeWidth={activeTab === 'home' ? 2.2 : 1.75} />
            <span className="text-[11px] font-medium whitespace-nowrap">Home</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('map')}
            aria-current={activeTab === 'map' ? 'page' : undefined}
            aria-label="India Blood Bank Map"
            className={navItemClass('map')}
          >
            <MapPin className="h-5 w-5" strokeWidth={activeTab === 'map' ? 2.2 : 1.75} />
            <span className="text-[11px] font-medium whitespace-nowrap">Map</span>
          </button>
        </div>

        {/* Center raised circular + SOS button */}
        <div className="relative z-20 -translate-y-4 flex flex-col items-center">
          <button
            type="button"
            onClick={() => onSelectTab('sos')}
            aria-label="Emergency SOS blood request"
            aria-current={activeTab === 'sos' ? 'page' : undefined}
            className={`pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full shadow-[0_8px_24px_rgba(18,12,52,0.55)] transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              activeTab === 'sos'
                ? 'bg-[#F43F5E] text-white ring-4 ring-white/30'
                : 'bg-white text-[#34267D] hover:bg-slate-100'
            }`}
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </button>
          <span className="mt-0.5 text-[10px] font-semibold tracking-wide text-white/90 whitespace-nowrap">
            SOS
          </span>
        </div>

        <div className="relative z-10 flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => onSelectTab('chat')}
            aria-current={activeTab === 'chat' ? 'page' : undefined}
            aria-label="LifeDrop Assistant"
            className={navItemClass('chat')}
          >
            <MessageCircle className="h-5 w-5" strokeWidth={activeTab === 'chat' ? 2.2 : 1.75} />
            <span className="text-[11px] font-medium whitespace-nowrap">Chatbot</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('profile')}
            aria-current={activeTab === 'profile' ? 'page' : undefined}
            aria-label="Profile and Settings"
            className={navItemClass('profile')}
          >
            <User className="h-5 w-5" strokeWidth={activeTab === 'profile' ? 2.2 : 1.75} />
            <span className="text-[11px] font-medium whitespace-nowrap">Profile</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
