import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Globe,
  MapPin,
  RefreshCw,
  Settings,
  ShieldAlert,
  WifiOff,
} from 'lucide-react';
import { ALL_INDIA_CODE } from '../data/indiaLocations';
import type {
  BloodGroup,
  DonationDrive,
  GlobalStats,
  MissionGoal,
  StateStats,
  StockHealth,
} from '../data/seedStats';
import type { PreviewScreenState } from '../hooks/useAppSettings';
import type { SavedLocation } from '../services/interfaces';
import { BloodGroupPills } from '../components/BloodGroupPills';
import { DrivesTabContent } from '../components/DrivesTabContent';
import { GoalsTabContent } from '../components/GoalsTabContent';
import { HeroScene } from '../components/HeroScene';
import { HomeSkeleton } from '../components/HomeSkeleton';

type SheetTab = 'groups' | 'goals' | 'drives';

interface HomeScreenProps {
  savedLocation: SavedLocation | null;
  activeScopeCode: string;
  onToggleAllIndia: () => void;
  onOpenLocationPicker: () => void;
  onOpenBleedingEmergency: () => void;
  onOpenSettings: () => void;
  globalStats: GlobalStats;
  stateStats: StateStats;
  goals: MissionGoal[];
  drives: DonationDrive[];
  attendedDriveIds: string[];
  onToggleAttendDrive: (driveId: string) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  isOnline: boolean;
  dataSaver: boolean;
  previewState: PreviewScreenState;
}

function formatUpdatedAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(diffMs / 60000));
  if (mins < 60) return `Updated ${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return `Updated ${hrs}h ago`;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  savedLocation,
  activeScopeCode,
  onToggleAllIndia,
  onOpenLocationPicker,
  onOpenBleedingEmergency,
  onOpenSettings,
  globalStats,
  stateStats,
  goals,
  drives,
  attendedDriveIds,
  onToggleAttendDrive,
  isLoading,
  error,
  onRetry,
  isOnline,
  dataSaver,
  previewState,
}) => {
  const [sheetTab, setSheetTab] = useState<SheetTab>('groups');
  const [selectedGroup, setSelectedGroup] = useState<BloodGroup>('O+');

  const isAllIndia = activeScopeCode === ALL_INDIA_CODE;
  const effectiveOffline = !isOnline || previewState === 'offline';
  const effectiveLoading = (isLoading && previewState === 'live') || previewState === 'loading';
  const effectiveError = previewState === 'error' ? 'Unable to sync live Firestore counters right now.' : error;
  const effectiveEmpty = previewState === 'empty';

  const heroHealth: StockHealth = useMemo(() => {
    if (stateStats.criticalGroups.length > 0) return 'critical';
    const hasLow = stateStats.bloodGroups.some((bg) => bg.status === 'low');
    return hasLow ? 'low' : 'stable';
  }, [stateStats]);

  const displayUsers = isAllIndia ? globalStats.totalUsers : stateStats.totalUsers;
  const displayJoinedToday = isAllIndia
    ? globalStats.joinedToday
    : stateStats.joinedToday;

  const locationTitle = isAllIndia
    ? 'All India'
    : savedLocation
      ? `${savedLocation.city}, ${savedLocation.stateName}`
      : 'Bengaluru, Karnataka';

  return (
    <div className="flex flex-1 flex-col overflow-y-auto no-scrollbar">
      {/* Offline banner (always keeps Emergency & cached data available) */}
      {effectiveOffline && (
        <div
          role="status"
          className="mx-4 mt-2 flex items-center justify-between gap-2 rounded-2xl border border-[#FBBF24]/40 bg-[#FBBF24]/15 px-3.5 py-2 text-[13px] text-slate-900 dark:text-white"
        >
          <span className="inline-flex items-center gap-2 font-medium">
            <WifiOff className="h-4 w-4 shrink-0 text-[#D97706] dark:text-[#FBBF24]" aria-hidden="true" />
            Offline mode · First aid &amp; cached stats ready
          </span>
        </div>
      )}

      {/* Top row: centered location selector + settings trigger */}
      <header className="relative flex items-center justify-between px-4 pt-3 pb-1">
        <button
          type="button"
          onClick={onToggleAllIndia}
          aria-pressed={isAllIndia}
          aria-label={isAllIndia ? 'Switch back to local state' : 'Switch to All India view'}
          className={`inline-flex min-h-[44px] items-center gap-1 rounded-full px-3 text-[12px] font-medium whitespace-nowrap transition ${
            isAllIndia
              ? 'bg-[#5B3FE0] text-white shadow-[0_4px_14px_rgba(91,63,224,0.45)]'
              : 'border border-black/10 bg-white/55 text-slate-800 hover:bg-white/80 dark:border-white/15 dark:bg-white/10 dark:text-white/90 dark:hover:bg-white/15'
          }`}
        >
          <Globe className="h-3.5 w-3.5" aria-hidden="true" />
          All India
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open Settings and Location privacy"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-black/10 bg-white/55 text-slate-800 hover:bg-white/80 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
        >
          <Settings className="h-5 w-5" />
        </button>
      </header>

      {effectiveLoading ? (
        <HomeSkeleton />
      ) : effectiveError ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
          <div className="ld-glass w-full rounded-[28px] p-6">
            <AlertTriangle className="mx-auto h-10 w-10 text-[#FBBF24]" aria-hidden="true" />
            <h2 className="mt-3 text-[20px] font-medium">Connection issue</h2>
            <p className="mt-1.5 text-[14px] text-slate-700 dark:text-white/78">
              {effectiveError}
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#5B3FE0] px-5 text-[14px] font-medium text-white"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Try again
              </button>
              <button
                type="button"
                onClick={onOpenBleedingEmergency}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#F43F5E] px-5 text-[14px] font-semibold text-white"
              >
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                Bleeding Emergency First Aid
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Center Top Location + Hero Display Number (Pixel-faithful to reference screenshot) */}
          <section className="flex flex-col items-center px-4 pt-1 text-center">
            <button
              type="button"
              onClick={onOpenLocationPicker}
              className="inline-flex min-h-[44px] max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-[28px] font-light leading-tight tracking-tight text-slate-900 hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
              aria-label={`Current location: ${locationTitle}. Tap to change state or city`}
            >
              <MapPin className="h-5 w-5 shrink-0 text-[#5B3FE0] dark:text-[#C4B5FD]" aria-hidden="true" />
              <span className="truncate">{locationTitle}</span>
              <ChevronDown className="h-5 w-5 shrink-0 opacity-75" aria-hidden="true" />
            </button>

            {/* Huge thin 96px display number */}
            <div className="mt-0.5 flex flex-col items-center">
              <div
                className="text-[clamp(3.75rem,16vw,6rem)] font-extralight leading-none tracking-tight tabular-nums text-slate-900 dark:text-white"
                aria-label={`${displayUsers.toLocaleString('en-IN')} Lifesavers on LifeDrop`}
              >
                {effectiveEmpty ? '0' : displayUsers.toLocaleString('en-IN')}
              </div>

              <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2 text-[16px] font-normal text-slate-700 dark:text-white/85">
                <span>Lifesavers on LifeDrop</span>
                {globalStats.isDemo && (
                  <span className="rounded-full border border-black/15 bg-white/70 px-2.5 py-0.5 text-[12px] font-medium text-slate-700 dark:border-white/25 dark:bg-white/15 dark:text-white/90">
                    Demo data
                  </span>
                )}
              </div>

              <p className="mt-1 text-[13px] text-slate-600 tabular-nums dark:text-white/75">
                +{displayJoinedToday} joined today · {formatUpdatedAgo(stateStats.updatedAt)}
              </p>

              {/* Critical / Stable subtitle matching reference H:24° L:18° row */}
              <p className="mt-1.5 text-[14px] font-medium text-slate-900 dark:text-white">
                <span className="text-[#E11D48] dark:text-[#FB7185]">
                  Critical: {stateStats.criticalGroups.join(', ') || 'None'}
                </span>
                <span className="mx-2 text-slate-400 dark:text-white/40" aria-hidden="true">
                  |
                </span>
                <span className="text-[#059669] dark:text-[#34D399]">
                  Stable: {stateStats.stableGroups.slice(0, 2).join(', ') || 'O+, A+'}
                </span>
              </p>
            </div>
          </section>

          {/* Hero night-sky sanctuary illustration */}
          <div className="mt-2 px-4">
            <HeroScene health={heroHealth} dataSaver={dataSaver} />
          </div>

          {/* Big red Bleeding Emergency shortcut button (offline-ready) */}
          <div className="px-4 pb-3">
            <button
              type="button"
              onClick={onOpenBleedingEmergency}
              className="flex min-h-[50px] w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-[#E11D48] to-[#F43F5E] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_10px_28px_rgba(244,63,94,0.42)] transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>Bleeding Emergency · First Aid &amp; 108</span>
            </button>
          </div>

          {/* Glass Bottom Sheet matching reference screenshot */}
          <section
            aria-label="Blood groups, goals, and donation drives"
            className="ld-glass-sheet flex-1 rounded-t-[32px] px-4 pt-2.5 pb-6"
          >
            {/* Drag handle */}
            <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-black/15 dark:bg-white/25" />

            {/* Sheet Tabs */}
            <div
              role="tablist"
              aria-label="Home insights"
              className="flex items-center justify-between border-b border-black/10 pb-2 dark:border-white/15"
            >
              {(
                [
                  { id: 'groups', label: 'Blood Groups' },
                  { id: 'goals', label: 'Our Goals' },
                  { id: 'drives', label: 'Donation Drives' },
                ] as const
              ).map((tab) => {
                const isActive = sheetTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setSheetTab(tab.id)}
                    className={`relative min-h-[44px] flex-1 px-2 text-[14px] font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-white ${
                      isActive
                        ? 'text-slate-950 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-white/65 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                    {isActive && (
                      <span className="absolute right-3 -bottom-2 left-3 h-[2.5px] rounded-full bg-[#5B3FE0] dark:bg-white" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Panels */}
            <div className="mt-3.5">
              {effectiveEmpty ? (
                <div className="rounded-[24px] border border-black/10 bg-white/50 p-6 text-center dark:border-white/15 dark:bg-white/[0.06]">
                  <p className="text-[15px] font-medium">No regional data available yet</p>
                  <p className="mt-1 text-[13px] text-slate-600 dark:text-white/75">
                    Try switching to All India or selecting another state.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenLocationPicker}
                    className="mt-3 min-h-[44px] rounded-full bg-[#5B3FE0] px-5 text-[13px] font-medium text-white"
                  >
                    Choose location
                  </button>
                </div>
              ) : sheetTab === 'groups' ? (
                <BloodGroupPills
                  bloodGroups={stateStats.bloodGroups}
                  selectedGroup={selectedGroup}
                  onSelectGroup={setSelectedGroup}
                  stateName={stateStats.stateName}
                />
              ) : sheetTab === 'goals' ? (
                <GoalsTabContent goals={goals} />
              ) : (
                <DrivesTabContent
                  drives={drives}
                  attendedDriveIds={attendedDriveIds}
                  onToggleAttend={onToggleAttendDrive}
                />
              )}
            </div>

            {/* App stats strip */}
            <div
              aria-label="LifeDrop national impact summary"
              className="mt-4 grid grid-cols-4 gap-2 rounded-[24px] border border-black/10 bg-white/50 px-2.5 py-3 text-center dark:border-white/15 dark:bg-white/[0.07]"
            >
              <div>
                <p className="text-[15px] font-semibold tabular-nums text-slate-900 dark:text-white">
                  {globalStats.totalUsers.toLocaleString('en-IN')}
                </p>
                <p className="mt-0.5 text-[11px] leading-tight text-slate-600 dark:text-white/70">
                  Users
                </p>
              </div>
              <div>
                <p className="text-[15px] font-semibold tabular-nums text-slate-900 dark:text-white">
                  {globalStats.activeDonorsMonth.toLocaleString('en-IN')}
                </p>
                <p className="mt-0.5 text-[11px] leading-tight text-slate-600 dark:text-white/70">
                  Active/mo
                </p>
              </div>
              <div>
                <p className="text-[15px] font-semibold tabular-nums text-slate-900 dark:text-white">
                  {globalStats.requestsFulfilled.toLocaleString('en-IN')}
                </p>
                <p className="mt-0.5 text-[11px] leading-tight text-slate-600 dark:text-white/70">
                  Fulfilled
                </p>
              </div>
              <div>
                <p className="text-[15px] font-semibold tabular-nums text-slate-900 dark:text-white">
                  {globalStats.banksOnboarded.toLocaleString('en-IN')}
                </p>
                <p className="mt-0.5 text-[11px] leading-tight text-slate-600 dark:text-white/70">
                  Banks
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
