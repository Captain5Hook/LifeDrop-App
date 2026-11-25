import React from 'react';
import { AlertTriangle, CheckCircle2, Droplet, MapPin } from 'lucide-react';
import type { BloodGroup, BloodGroupStat } from '../data/seedStats';

interface BloodGroupPillsProps {
  bloodGroups: BloodGroupStat[];
  selectedGroup: BloodGroup;
  onSelectGroup: (group: BloodGroup) => void;
  onFindOnMap?: (group: BloodGroup) => void;
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
  stateName,
}) => {
  const activeStat =
    bloodGroups.find((g) => g.group === selectedGroup) ?? bloodGroups[0];

  return (
    <div className="space-y-2.5">
      <div
        className="no-scrollbar flex items-stretch gap-2.5 overflow-x-auto pb-1 pt-0.5"
        role="listbox"
        aria-label={`Blood group availability in ${stateName}`}
      >
        {bloodGroups.map((item) => {
          const isSelected = item.group === selectedGroup;
          const statusColor =
            item.status === 'critical'
              ? 'text-[#FB7185] dark:text-[#F43F5E]'
              : item.status === 'low'
                ? 'text-[#D97706] dark:text-[#FBBF24]'
                : 'text-[#059669] dark:text-[#34D399]';

          return (
            <button
              key={item.group}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelectGroup(item.group)}
              className={`group flex min-h-[126px] w-[70px] shrink-0 flex-col items-center justify-between rounded-[999px] border px-2 py-2.5 text-center transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                isSelected
                  ? 'ld-pill-active text-white'
                  : 'border-black/10 bg-white/60 text-slate-900 hover:bg-white/80 dark:border-white/15 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.14]'
              }`}
            >
              <div className="flex flex-col items-center">
                <span className="text-[15px] font-semibold tracking-tight tabular-nums">
                  {item.group}
                </span>
                <span
                  className={`mt-0.5 text-[10px] leading-tight whitespace-nowrap ${
                    isSelected
                      ? 'text-white/85'
                      : 'text-slate-600 dark:text-white/65'
                  }`}
                >
                  {item.isMostCommon ? 'Common' : `${item.sharePercent}%`}
                </span>
              </div>

              <div className="flex flex-col items-center gap-0.5">
                <Droplet
                  className={`h-4 w-4 ${isSelected ? 'text-white' : statusColor}`}
                  fill="currentColor"
                  fillOpacity={0.25}
                />
                <span
                  className={`text-[11px] font-medium tabular-nums ${
                    isSelected ? 'text-white/90' : statusColor
                  }`}
                >
                  {item.sharePercent}%
                </span>
              </div>

              <div className="flex flex-col items-center leading-tight">
                <span className="text-[13px] font-semibold tabular-nums">
                  {formatCompactUsers(item.users)}
                </span>
                <span
                  className={`text-[10px] tabular-nums ${
                    isSelected
                      ? 'text-white/80'
                      : 'text-slate-600 dark:text-white/65'
                  }`}
                >
                  {item.unitsInStock} u
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {activeStat && (
        <div className="flex flex-col gap-2 rounded-2xl border border-black/10 bg-white/55 px-3.5 py-2.5 text-[13px] dark:border-white/15 dark:bg-white/[0.07]">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 font-medium text-slate-900 dark:text-white">
                <span>{activeStat.group} in {stateName}</span>
                {activeStat.isMostCommon && (
                  <span className="text-[12px] font-normal text-[#5B3FE0] dark:text-[#C4B5FD]">
                    · Most common
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[12px] text-slate-700 tabular-nums dark:text-white/78">
                {activeStat.users.toLocaleString('en-IN')} registered donors ({activeStat.sharePercent}%) ·{' '}
                {activeStat.unitsInStock} units in stock
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

          {onFindOnMap && (
            <button
              type="button"
              onClick={() => onFindOnMap(activeStat.group)}
              className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full bg-[#5B3FE0] px-4 text-[13px] font-medium text-white transition hover:bg-[#6A4FF0]"
            >
              <MapPin className="h-4 w-4" aria-hidden="true" />
              Find {activeStat.group} blood banks on Map
            </button>
          )}
        </div>
      )}
    </div>
  );
};
