import React from 'react';
import { Calendar, Check, MapPin } from 'lucide-react';
import type { DonationDrive } from '../data/seedStats';

interface DrivesTabContentProps {
  drives: DonationDrive[];
  attendedDriveIds: string[];
  onToggleAttend: (driveId: string) => void;
}

export const DrivesTabContent: React.FC<DrivesTabContentProps> = ({
  drives,
  attendedDriveIds,
  onToggleAttend,
}) => {
  if (drives.length === 0) {
    return (
      <div className="rounded-[24px] border border-black/10 bg-white/50 p-5 text-center dark:border-white/15 dark:bg-white/[0.06]">
        <p className="text-[14px] font-medium text-slate-900 dark:text-white">
          No upcoming drives listed for this area yet
        </p>
        <p className="mt-1 text-[13px] text-slate-700 dark:text-white/75">
          Switch to All India to view active student and hospital donation camps across the country.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {drives.map((drive) => {
        const attending = attendedDriveIds.includes(drive.id);
        const totalAttendees = drive.attendeesCount + (attending ? 1 : 0);

        return (
          <div
            key={drive.id}
            className="flex items-center justify-between gap-3 rounded-[24px] border border-black/10 bg-white/55 px-3.5 py-3 dark:border-white/15 dark:bg-white/[0.08]"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-slate-900 dark:text-white">
                {drive.title}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-slate-700 dark:text-white/75">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {drive.dateLabel}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 truncate">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {drive.place}, {drive.city}, {drive.stateName}
                </span>
              </div>
              <p className="mt-0.5 text-[12px] text-slate-600 tabular-nums dark:text-white/65">
                {totalAttendees.toLocaleString('en-IN')} donors attending
              </p>
            </div>

            <button
              type="button"
              onClick={() => onToggleAttend(drive.id)}
              aria-pressed={attending}
              className={`min-h-[44px] shrink-0 rounded-full px-4 py-2 text-[13px] font-medium whitespace-nowrap transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                attending
                  ? 'bg-[#34D399] text-[#09291E]'
                  : 'bg-[#5B3FE0] text-white hover:bg-[#6A4FF0]'
              }`}
            >
              {attending ? (
                <span className="inline-flex items-center gap-1">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Attending
                </span>
              ) : (
                "I'll attend"
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
};
