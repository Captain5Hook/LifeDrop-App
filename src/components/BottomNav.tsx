import React from 'react';
import { Home, MapPin, MessageCircle, Plus, User } from 'lucide-react';

export type NavTab = 'home' | 'map' | 'sos' | 'chat' | 'profile';

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const navItemClass = (tab: NavTab) =>
    `pointer-events-auto flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:focus-visible:outline-white ${
      activeTab === tab
        ? 'text-slate-950 dark:text-white'
        : 'text-slate-700/80 hover:text-slate-950 dark:text-white/70 dark:hover:text-white'
    }`;

  return (
    <nav
      aria-label="Primary navigation"
      className="pointer-events-none absolute right-0 bottom-0 left-0 z-30 select-none"
    >
      <div className="relative flex h-[calc(70px+env(safe-area-inset-bottom,12px))] items-end justify-between px-3 pt-2 pb-[max(0.625rem,env(safe-area-inset-bottom,12px))]">
        <svg
          viewBox="0 0 400 74"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <path
            d="M 0 12 L 122 12 C 148 12 158 46 200 46 C 242 46 252 12 278 12 L 400 12 L 400 74 L 0 74 Z"
            className="fill-transparent"
          />
          <path
            d="M 0 12 L 122 12 C 148 12 158 46 200 46 C 242 46 252 12 278 12 L 400 12"
            fill="none"
            className="stroke-black/15 dark:stroke-white/25"
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
        <div className="relative z-20 -translate-y-2.5 flex flex-col items-center">
          <button
            type="button"
            onClick={() => onSelectTab('sos')}
            aria-label="Emergency SOS blood request"
            aria-current={activeTab === 'sos' ? 'page' : undefined}
            className={`pointer-events-auto flex h-[52px] w-[52px] items-center justify-center rounded-full shadow-[0_8px_26px_rgba(244,63,94,0.55)] transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              activeTab === 'sos'
                ? 'bg-[#F43F5E] text-white ring-4 ring-white/30'
                : 'bg-gradient-to-br from-[#F43F5E] to-[#E11D48] text-white ring-2 ring-white/25 hover:brightness-110'
            }`}
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </button>
          <span className="mt-0.5 text-[10px] leading-[13px] font-semibold tracking-wide text-slate-900 whitespace-nowrap dark:text-white/95">
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
