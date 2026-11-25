import React from 'react';
import type { MissionGoal } from '../data/seedStats';

interface GoalsTabContentProps {
  goals: MissionGoal[];
}

export const GoalsTabContent: React.FC<GoalsTabContentProps> = ({ goals }) => {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {goals.map((goal) => {
        const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
        const radius = 20;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (pct / 100) * circumference;

        return (
          <div
            key={goal.id}
            className="flex items-center gap-3 rounded-[24px] border border-black/10 bg-white/55 p-3 dark:border-white/15 dark:bg-white/[0.08]"
          >
            {/* Animated progress ring */}
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
              <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
                <circle
                  cx="24"
                  cy="24"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-black/10 dark:text-white/15"
                />
                <circle
                  cx="24"
                  cy="24"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="text-[#5B3FE0] transition-all duration-500 dark:text-[#34D399]"
                />
              </svg>
              <span className="absolute text-[11px] font-semibold tabular-nums text-slate-900 dark:text-white">
                {pct}%
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium leading-snug text-slate-900 dark:text-white">
                {goal.title}
              </p>
              <p className="mt-1 text-[12px] text-slate-700 tabular-nums dark:text-white/75">
                {goal.current.toLocaleString('en-IN')} / {goal.target.toLocaleString('en-IN')}{' '}
                {goal.unit}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
