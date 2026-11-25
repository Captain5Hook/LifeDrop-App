import React from 'react';

export const HomeSkeleton: React.FC = () => {
  return (
    <div className="flex flex-1 flex-col justify-between px-4 pt-4 pb-4 animate-pulse" aria-busy="true" aria-label="Loading LifeDrop data">
      <div className="flex flex-col items-center space-y-3 pt-2">
        <div className="h-7 w-44 rounded-full bg-white/15" />
        <div className="h-20 w-52 rounded-3xl bg-white/15" />
        <div className="h-4 w-40 rounded-full bg-white/15" />
        <div className="h-4 w-56 rounded-full bg-white/12" />
      </div>

      <div className="mx-auto my-4 h-32 w-56 rounded-3xl bg-white/10" />

      <div className="mx-auto mb-4 h-12 w-full rounded-full bg-rose-500/30" />

      <div className="rounded-t-[32px] border border-white/15 bg-white/10 p-4 space-y-4">
        <div className="mx-auto h-1 w-10 rounded-full bg-white/25" />
        <div className="flex justify-between gap-2">
          <div className="h-9 flex-1 rounded-full bg-white/15" />
          <div className="h-9 flex-1 rounded-full bg-white/10" />
          <div className="h-9 flex-1 rounded-full bg-white/10" />
        </div>
        <div className="flex gap-2.5 overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[136px] w-[72px] shrink-0 rounded-full bg-white/15" />
          ))}
        </div>
      </div>
    </div>
  );
};
