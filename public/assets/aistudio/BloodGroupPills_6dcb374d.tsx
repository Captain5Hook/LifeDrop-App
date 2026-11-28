import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Droplet,
  Droplets,
  MapPin,
} from 'lucide-react';
import type { BloodGroup, BloodGroupStat } from '../data/seedStats';

interface BloodGroupPillsProps {
  bloodGroups: BloodGroupStat[];
  selectedGroup: BloodGroup;
  onSelectGroup: (group: BloodGroup) => void;
  onFindOnMap?: (group: BloodGroup) => void;
  onOpenCompatibilityChecker?: (group: BloodGroup) => void;
  isDemo?: boolean;
  stateName: string;
}

function formatCompactUsers(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toLocaleString('en-IN');
}

export const BloodGroupPills: React.FC<BloodGroupPillsProps> = ({
  bloodGroups,
  selectedGroup,
  onSelectGroup,
  onFindOnMap,
  onOpenCompatibilityChecker,
  isDemo = false,
  stateName,
}) => {
  const activeStat =
    bloodGroups.find((g) => g.group === selectedGroup) ?? bloodGroups[0];

  return (
    <div className="space-y-3">
      <div
        className="no-scrollbar flex items-stretch gap-2.5 overflow-x-auto px-0.5 pt-1 pb-1.5"
        role="listbox"
        aria-label={`Blood group availability in ${stateName}`}
      >
        {bloodGroups.map((item) => {
          const isSelected = item.group === selectedGroup;
          const statusColor =
            item.status === 'critical'
              ? 'text-[#E11D48] dark:text-[#FDA4AF]'
              : item.status === 'low'
                ? 'text-[#B45309] dark:text-[#FCD34D]'
                : 'text-[#047857] dark:text-[#6EE7B7]';

          const healthCardTheme =
            item.status === 'critical'
              ? 'border-[#F43F5E]/45 bg-gradient-to-b from-[#F43F5E]/15 to-white/60 dark:from-[#F43F5E]/20 dark:to-[#2A215C]/65 ld-critical-glow'
              : item.status === 'low'
                ? 'border-[#FBBF24]/45 bg-gradient-to-b from-[#FBBF24]/15 to-white/60 dark:from-[#FBBF24]/18 dark:to-[#2A215C]/65 shadow-[0_4px_16px_rgba(251,191,36,0.2)]'
                : 'border-[#34D399]/40 bg-gradient-to-b from-[#34D399]/14 to-white/60 dark:from-[#34D399]/16 dark:to-[#2A215C]/65 shadow-[0_4px_16px_rgba(52,211,153,0.2)]';

          return (
            <button
              key={item.group}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelectGroup(item.group)}
              className={`group relative flex min-h-[122px] w-[80px] shrink-0 flex-col items-center justify-between overflow-hidden rounded-[24px] border px-2.5 py-2.5 text-center backdrop-blur-md transition-all duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                isSelected
                  ? 'ld-pill-active text-white ring-1 ring-white/40'
                  : `${healthCardTheme} text-slate-900 hover:brightness-105 dark:text-white`
              }`}
            >
              {/* Top-left metric badge + icon */}
              <div className="flex w-full items-center justify-between gap-1">
                <span
                  className={`truncate text-[10px] font-semibold tracking-tight ${
                    isSelected ? 'text-white/90' : statusColor
                  }`}
                >
                  {item.isMostCommon ? 'Top' : `${item.sharePercent}%`}
                </span>
                <Droplet
                  className={`h-3.5 w-3.5 shrink-0 ${
                    isSelected ? 'text-white' : statusColor
                  }`}
                  fill="currentColor"
                  fillOpacity={0.3}
                  aria-hidden="true"
                />
              </div>

              {/* Center bold blood group */}
              <div className="my-0.5 flex flex-col items-center">
                <span className="text-[20px] font-bold leading-none tracking-tight tabular-nums">
                  {item.group}
                </span>
                <span
                  className={`mt-1 text-[10px] font-medium capitalize ${
                    isSelected
                      ? 'text-white/85'
                      : 'text-slate-600 dark:text-white/70'
                  }`}
                >
                  {item.status}
                </span>
              </div>

              {/* Bottom units & compact donor count */}
              <div className="flex w-full flex-col items-center leading-tight">
                <span className="text-[12px] font-semibold tabular-nums">
                  {item.unitsInStock} u
                </span>
                <span
                  className={`text-[10px] tabular-nums ${
                    isSelected
                      ? 'text-white/80'
                      : 'text-slate-600 dark:text-white/65'
                  }`}
                >
                  {formatCompactUsers(item.users)} donors
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {activeStat && (
        <div className="ld-glass flex flex-col gap-2.5 rounded-[24px] px-4 py-3 text-[13px]">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 font-medium text-slate-900 dark:text-white">
                <span>
                  {activeStat.group} in {stateName}
                </span>
                {activeStat.isMostCommon && (
                  <span className="text-[12px] font-normal text-[#5B3FE0] dark:text-[#C4B5FD]">
                    · Most common
                  </span>
                )}
                {isDemo && (
                  <span className="text-[11px] font-normal text-slate-600 dark:text-white/70">
                    · Demo data
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[12px] text-slate-700 tabular-nums dark:text-white/78">
                {activeStat.users.toLocaleString('en-IN')} registered donors (
                {activeStat.sharePercent}%) · {activeStat.unitsInStock} units in
                stock
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1 font-medium">
              {activeStat.status === 'critical' ? (
                <span className="inline-flex items-center gap-1 text-[#E11D48] dark:text-[#FB7185]">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  Critical
                </span>
              ) : activeStat.status === 'low' ? (
                <span className="inline-flex items-center gap-1 text-[#D97706] dark:text-[#FBBF24]">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  Low
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[#059669] dark:text-[#34D399]">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Stable
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {onFindOnMap && (
              <button
                type="button"
                onClick={() => onFindOnMap(activeStat.group)}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full bg-[#5B3FE0] px-4 text-[13px] font-medium text-white transition active:scale-[0.98] hover:bg-[#6A4FF0]"
              >
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Find {activeStat.group} on Map</span>
              </button>
            )}
            {onOpenCompatibilityChecker && (
              <button
                type="button"
                onClick={() => onOpenCompatibilityChecker(activeStat.group)}
                className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-black/15 bg-white/75 px-4 text-[12px] font-semibold text-slate-900 transition active:scale-[0.98] hover:bg-white dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                <Droplets className="h-3.5 w-3.5 text-[#F43F5E]" aria-hidden="true" />
                <span>Compatibility</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
