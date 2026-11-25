import React, { useState } from 'react';
import { MotionConfig } from 'motion/react';
import {
  MapPin,
  MessageCircle,
  Plus,
  Settings,
  ShieldAlert,
  User,
} from 'lucide-react';
import { BleedingEmergencyModal } from './components/BleedingEmergencyModal';
import { BottomNav, type NavTab } from './components/BottomNav';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LocationModals } from './components/LocationModals';
import { SettingsDrawer } from './components/SettingsDrawer';
import { ALL_INDIA_CODE } from './data/indiaLocations';
import { useAppSettings } from './hooks/useAppSettings';
import { useHomeStats } from './hooks/useHomeStats';
import { useLocationFlow } from './hooks/useLocationFlow';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { HomeScreen } from './screens/HomeScreen';

function LifeDropApp() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [allIndiaView, setAllIndiaView] = useState(false);
  const [isBleedingOpen, setIsBleedingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isOnline = useOnlineStatus();
  const {
    theme,
    dataSaver,
    language,
    previewState,
    toggleTheme,
    setDataSaver,
    setLanguage,
    setPreviewState,
  } = useAppSettings();

  const locationFlow = useLocationFlow();
  const activeScopeCode = allIndiaView
    ? ALL_INDIA_CODE
    : (locationFlow.savedLocation?.stateCode ?? 'KA');

  const homeStats = useHomeStats(activeScopeCode);

  const renderMilestonePreview = (
    title: string,
    milestone: string,
    description: string,
    icon: React.ReactNode,
  ) => (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="ld-glass w-full rounded-[28px] p-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5B3FE0]/25 text-[#5B3FE0] dark:text-white">
          {icon}
        </div>
        <p className="mt-3 text-[12px] font-semibold uppercase tracking-wider text-[#5B3FE0] dark:text-[#C4B5FD]">
          {milestone}
        </p>
        <h2 className="mt-1 text-[22px] font-light text-slate-900 dark:text-white">
          {title}
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-slate-700 dark:text-white/78">
          {description}
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="min-h-[44px] w-full rounded-full bg-[#5B3FE0] px-5 text-[14px] font-medium text-white"
          >
            Back to Home
          </button>
          <button
            type="button"
            onClick={() => setIsBleedingOpen(true)}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[#F43F5E] px-5 text-[14px] font-semibold text-white"
          >
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            Bleeding Emergency First Aid
          </button>
          {activeTab === 'profile' && (
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-black/15 bg-white/70 px-5 text-[14px] font-medium text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              Open Theme, Data Saver &amp; Location Settings
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <MotionConfig reducedMotion={dataSaver ? 'always' : 'user'}>
      {/* Outer responsive canvas: full edge-to-edge on mobile, centered phone frame on large screens */}
      <div className="ld-bg-sky ld-stars flex min-h-[100dvh] w-full items-center justify-center sm:p-4 md:p-6">
        <div className="ld-bg-sky ld-stars relative flex h-[100dvh] w-full flex-col overflow-hidden sm:h-[min(90dvh,880px)] sm:max-w-[430px] sm:rounded-[40px] sm:border sm:border-white/20 sm:shadow-[0_28px_80px_rgba(10,6,34,0.65)]">
          {activeTab === 'home' && (
            <HomeScreen
              savedLocation={locationFlow.savedLocation}
              activeScopeCode={activeScopeCode}
              onToggleAllIndia={() => setAllIndiaView((v) => !v)}
              onOpenLocationPicker={() => {
                setAllIndiaView(false);
                locationFlow.openExplainer();
              }}
              onOpenBleedingEmergency={() => setIsBleedingOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
              globalStats={homeStats.globalStats}
              stateStats={homeStats.stateStats}
              goals={homeStats.goals}
              drives={homeStats.drives}
              attendedDriveIds={homeStats.attendedDriveIds}
              onToggleAttendDrive={homeStats.toggleAttendDrive}
              isLoading={homeStats.isLoading}
              error={homeStats.error}
              onRetry={homeStats.retry}
              isOnline={isOnline}
              dataSaver={dataSaver}
              previewState={previewState}
            />
          )}

          {activeTab === 'map' &&
            renderMilestonePreview(
              'India Blood Bank Map',
              'Up next in Milestone 2',
              'Interactive Leaflet + OpenStreetMap view locked to India, state-wise clusters across all 36 states & UTs, stock filters, and approximate donor distance.',
              <MapPin className="h-7 w-7" />,
            )}

          {activeTab === 'sos' &&
            renderMilestonePreview(
              'Emergency SOS Request',
              'Scheduled for Milestone 4',
              '3-tap blood request with ABO/Rh compatibility, client-side radius escalation (5 km → 15 km → district), and live status tracking.',
              <Plus className="h-7 w-7" />,
            )}

          {activeTab === 'chat' &&
            renderMilestonePreview(
              'LifeDrop Assistant',
              'Scheduled for Milestone 5',
              'Offline Knowledge Base in English, Hindi & Kannada, bleeding emergency detection, Compatibility Checker, and Gemini Flash via Cloudflare Worker.',
              <MessageCircle className="h-7 w-7" />,
            )}

          {activeTab === 'profile' &&
            renderMilestonePreview(
              'Donor Profile & Settings',
              'Full Auth in Milestone 3',
              'Manage Theme (Dark/Light), Data Saver mode, First-Aid language, and Location privacy controls right now via Settings below.',
              <User className="h-7 w-7" />,
            )}

          <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />

          <LocationModals
            flowStep={locationFlow.flowStep}
            browserPermission={locationFlow.browserPermission}
            savedLocation={locationFlow.savedLocation}
            isLocating={locationFlow.isLocating}
            outcome={locationFlow.outcome}
            onAllowLocation={locationFlow.requestGpsLocation}
            onOpenManual={locationFlow.openManualPicker}
            onOpenExplainer={locationFlow.openExplainer}
            onSelectManual={(code, city) => {
              setAllIndiaView(code === ALL_INDIA_CODE);
              locationFlow.selectManualLocation(code, city);
            }}
            onClose={locationFlow.closeFlow}
          />

          <BleedingEmergencyModal
            isOpen={isBleedingOpen}
            language={language}
            onChangeLanguage={setLanguage}
            onClose={() => setIsBleedingOpen(false)}
          />

          <SettingsDrawer
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            theme={theme}
            onToggleTheme={toggleTheme}
            dataSaver={dataSaver}
            onToggleDataSaver={setDataSaver}
            language={language}
            onChangeLanguage={setLanguage}
            savedLocation={locationFlow.savedLocation}
            browserPermission={locationFlow.browserPermission}
            onUpdateLocation={() => {
              setAllIndiaView(false);
              locationFlow.openExplainer();
            }}
            onTurnOffSharing={locationFlow.turnOffSharing}
            onDeleteLocation={locationFlow.deleteLocationData}
            previewState={previewState}
            onChangePreviewState={setPreviewState}
          />
        </div>
      </div>
    </MotionConfig>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LifeDropApp />
    </ErrorBoundary>
  );
}
