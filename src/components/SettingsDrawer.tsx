import React, { useState } from 'react';
import {
  Database,
  Download,
  Eye,
  Info,
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
import { useVisualViewportHeight } from '../hooks/useVisualViewport';
import { bankService } from '../services/bankService';
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
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  onInstallApp: () => Promise<boolean>;
  onOpenAbout: () => void;
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
  isInstallable,
  isInstalled,
  isIOS,
  onInstallApp,
  onOpenAbout,
}) => {
  const vvHeight = useVisualViewportHeight();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  if (!isOpen) return null;

  const handleSeedDemo = async () => {
    setSeeding(true);
    setSeedStatus(null);
    try {
      const res = await bankService.seedDemoBanksAsAdmin();
      setSeedStatus(
        `Seeded ${res.banksWritten} banks & ${res.statsWritten} stats docs to Firestore.`,
      );
    } catch (err) {
      setSeedStatus(
        err instanceof Error ? err.message : 'Admin seed failed.',
      );
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div
        style={vvHeight ? { maxHeight: `${vvHeight}px` } : undefined}
        className="ld-glass-sheet flex max-h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[32px] border border-white/20 text-slate-900 shadow-2xl sm:max-h-[90dvh] sm:rounded-[32px] dark:text-white"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-5 pt-4 pb-3 dark:border-white/15">
          <h2 id="settings-title" className="text-[20px] font-light tracking-tight">
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

        <div className="ld-scroll-area flex-1 min-h-0 space-y-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {/* PWA Install (A2) */}
          {!isInstalled && (isInstallable || isIOS) && (
            <section className="space-y-2 rounded-[24px] border border-[#5B3FE0]/35 bg-[#5B3FE0]/15 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold">Install LifeDrop App</p>
                  <p className="text-[12px] text-slate-700 dark:text-white/75">
                    Works offline for bleeding first aid &amp; 108/112 calls
                  </p>
                </div>
                {isInstallable ? (
                  <button
                    type="button"
                    onClick={() => void onInstallApp()}
                    className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-[#5B3FE0] px-4 text-[13px] font-medium text-white"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Add to Home
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowIOSGuide((v) => !v)}
                    className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-[#5B3FE0] px-4 text-[13px] font-medium text-white"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Install on iOS
                  </button>
                )}
              </div>
              {showIOSGuide && (
                <p className="text-[12px] leading-relaxed text-slate-800 dark:text-white/85">
                  In Safari, tap the <strong>Share</strong> icon and choose <strong>Add to Home Screen</strong>.
                </p>
              )}
            </section>
          )}

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
                className="min-h-[44px] rounded-full bg-[#5B3FE0] px-4 text-[13px] font-medium text-white whitespace-nowrap"
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
                    Disables animations &amp; tile prefetch
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={dataSaver}
                onClick={() => onToggleDataSaver(!dataSaver)}
                className={`min-h-[44px] min-w-[64px] rounded-full px-4 text-[13px] font-medium transition ${
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
                    className={`min-h-[36px] rounded-full px-3 text-[12px] font-medium ${
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

          {/* Location Privacy Settings */}
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

          {/* About & Medical Review */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAbout();
            }}
            className="flex min-h-[48px] w-full items-center justify-between rounded-[24px] border border-black/10 bg-white/60 px-4 py-3 text-left text-[14px] font-medium dark:border-white/15 dark:bg-white/[0.08]"
          >
            <span className="inline-flex items-center gap-2.5">
              <Info className="h-4 w-4 text-[#C4B5FD]" aria-hidden="true" />
              About LifeDrop &amp; Medical Review Notice
            </span>
            <span className="text-[12px] text-slate-600 dark:text-white/65">View</span>
          </button>

          {/* Admin Seed Demo Banks (B5) */}
          <section className="space-y-2 rounded-[24px] border border-black/10 bg-white/60 p-4 dark:border-white/15 dark:bg-white/[0.08]">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-[#34D399]" aria-hidden="true" />
              <h3 className="text-[13px] font-semibold text-slate-600 dark:text-white/75">
                Admin Firestore Seed (B5)
              </h3>
            </div>
            <p className="text-[12px] text-slate-600 dark:text-white/70">
              Writes 135 demo banks (at least 3 per state/UT) and aggregated state stats using batched writes.
            </p>
            <button
              type="button"
              disabled={seeding}
              onClick={() => void handleSeedDemo()}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-black/15 bg-white/75 px-4 text-[13px] font-medium text-slate-900 disabled:opacity-60 dark:border-white/20 dark:bg-white/10 dark:text-white"
            >
              {seeding ? 'Seeding Firestore...' : 'Seed demo banks (Admin only)'}
            </button>
            {seedStatus && (
              <p className="text-[12px] text-slate-700 dark:text-white/85">{seedStatus}</p>
            )}
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
                    className={`min-h-[38px] rounded-full px-3 text-[12px] font-medium capitalize transition ${
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
