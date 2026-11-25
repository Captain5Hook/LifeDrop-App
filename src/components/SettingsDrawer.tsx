import React from 'react';
import {
  Eye,
  Languages,
  MapPin,
  Moon,
  ShieldOff,
  Sun,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import type {
  AppLanguage,
  PreviewScreenState,
  ThemeMode,
} from '../hooks/useAppSettings';
import type {
  BrowserPermissionState,
  SavedLocation,
} from '../services/interfaces';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  dataSaver: boolean;
  onToggleDataSaver: (val: boolean) => void;
  language: AppLanguage;
  onChangeLanguage: (lang: AppLanguage) => void;
  savedLocation: SavedLocation | null;
  browserPermission: BrowserPermissionState;
  onUpdateLocation: () => void;
  onTurnOffSharing: () => void;
  onDeleteLocation: () => void;
  previewState: PreviewScreenState;
  onChangePreviewState: (state: PreviewScreenState) => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  dataSaver,
  onToggleDataSaver,
  language,
  onChangeLanguage,
  savedLocation,
  browserPermission,
  onUpdateLocation,
  onTurnOffSharing,
  onDeleteLocation,
  previewState,
  onChangePreviewState,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="ld-glass-sheet flex max-h-[90dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[32px] border border-white/20 p-5 text-slate-900 shadow-2xl sm:rounded-[32px] dark:text-white">
        <div className="flex items-center justify-between pb-3">
          <h2 id="settings-title" className="text-[22px] font-light tracking-tight">
            Settings &amp; Location
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1 pb-2">
          {/* Appearance & Performance */}
          <section className="space-y-2.5 rounded-[24px] border border-black/10 bg-white/60 p-4 dark:border-white/15 dark:bg-white/[0.08]">
            <h3 className="text-[13px] font-semibold text-slate-600 dark:text-white/75">
              Appearance &amp; Performance
            </h3>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {theme === 'dark' ? (
                  <Moon className="h-4 w-4 text-[#C4B5FD]" aria-hidden="true" />
                ) : (
                  <Sun className="h-4 w-4 text-[#D97706]" aria-hidden="true" />
                )}
                <div>
                  <p className="text-[14px] font-medium">Theme</p>
                  <p className="text-[12px] text-slate-600 dark:text-white/65">
                    {theme === 'dark' ? 'Dark purple night sky' : 'Light lavender glass'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleTheme}
                className="min-h-[40px] rounded-full bg-[#5B3FE0] px-4 text-[13px] font-medium text-white"
              >
                {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-black/10 pt-2.5 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <Zap className="h-4 w-4 text-[#34D399]" aria-hidden="true" />
                <div>
                  <p className="text-[14px] font-medium">Data Saver mode</p>
                  <p className="text-[12px] text-slate-600 dark:text-white/65">
                    Disables animations &amp; pulses
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={dataSaver}
                onClick={() => onToggleDataSaver(!dataSaver)}
                className={`min-h-[40px] rounded-full px-4 text-[13px] font-medium transition ${
                  dataSaver
                    ? 'bg-[#34D399] text-[#09291E]'
                    : 'bg-black/10 text-slate-900 dark:bg-white/15 dark:text-white'
                }`}
              >
                {dataSaver ? 'On' : 'Off'}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-black/10 pt-2.5 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <Languages className="h-4 w-4 text-[#A78BFA]" aria-hidden="true" />
                <p className="text-[14px] font-medium">First-Aid Language</p>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-black/10 p-1 dark:bg-white/10">
                {(
                  [
                    { code: 'en', label: 'EN' },
                    { code: 'hi', label: 'हिं' },
                    { code: 'kn', label: 'ಕನ್' },
                  ] as const
                ).map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => onChangeLanguage(l.code)}
                    className={`min-h-[32px] rounded-full px-2.5 text-[12px] font-medium ${
                      language === l.code
                        ? 'bg-[#5B3FE0] text-white'
                        : 'text-slate-700 dark:text-white/75'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Location Privacy Settings (Section 4.7) */}
          <section className="space-y-3 rounded-[24px] border border-black/10 bg-white/60 p-4 dark:border-white/15 dark:bg-white/[0.08]">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-slate-600 dark:text-white/75">
                Location &amp; Privacy
              </h3>
              <span className="text-[12px] text-slate-600 dark:text-white/65">
                Browser: {browserPermission}
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#5B3FE0] dark:text-[#C4B5FD]" aria-hidden="true" />
              <div className="text-[14px]">
                <p className="font-medium">
                  {savedLocation
                    ? `${savedLocation.city}, ${savedLocation.stateName}`
                    : 'No location saved'}
                </p>
                <p className="text-[12px] text-slate-600 dark:text-white/65">
                  {savedLocation
                    ? savedLocation.sharingEnabled
                      ? `Approximate location active (${savedLocation.source.toUpperCase()})`
                      : 'Location sharing turned off'
                    : 'Choose your state/city or enable GPS'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onUpdateLocation();
                }}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[#5B3FE0] px-4 text-[13px] font-medium text-white"
              >
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Update location
              </button>

              {savedLocation && savedLocation.sharingEnabled && (
                <button
                  type="button"
                  onClick={onTurnOffSharing}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-black/15 bg-white/70 px-4 text-[13px] font-medium dark:border-white/20 dark:bg-white/10"
                >
                  <ShieldOff className="h-4 w-4" aria-hidden="true" />
                  Turn off location sharing
                </button>
              )}

              {savedLocation && (
                <button
                  type="button"
                  onClick={onDeleteLocation}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-[#F43F5E]/40 bg-[#F43F5E]/15 px-4 text-[13px] font-medium text-[#BE123C] dark:text-[#FDA4AF]"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete my location data
                </button>
              )}
            </div>
          </section>

          {/* Screen State Verifier */}
          <section className="space-y-2 rounded-[24px] border border-black/10 bg-white/60 p-4 dark:border-white/15 dark:bg-white/[0.08]">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-[#A78BFA]" aria-hidden="true" />
              <h3 className="text-[13px] font-semibold text-slate-600 dark:text-white/75">
                Preview Screen States
              </h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['live', 'loading', 'empty', 'error', 'offline'] as const).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => onChangePreviewState(st)}
                    className={`min-h-[36px] rounded-full px-3 text-[12px] font-medium capitalize transition ${
                      previewState === st
                        ? 'bg-[#5B3FE0] text-white'
                        : 'bg-black/10 text-slate-800 dark:bg-white/10 dark:text-white/80'
                    }`}
                  >
                    {st}
                  </button>
                ),
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
