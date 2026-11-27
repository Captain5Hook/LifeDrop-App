import React, { Suspense, useState } from 'react';
import { MotionConfig } from 'motion/react';
import {
  Download,
  RefreshCw,
  X,
} from 'lucide-react';
import { BottomNav, type NavTab } from './components/BottomNav';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HomeSkeleton } from './components/HomeSkeleton';
import type { LegalTab } from './components/LegalPrivacyModals';
import { ALL_INDIA_CODE } from './data/indiaLocations';
import type { BloodGroup } from './data/seedStats';
import { useAppSettings } from './hooks/useAppSettings';
import { useAuthProfile } from './hooks/useAuthProfile';
import { useHomeStats } from './hooks/useHomeStats';
import { useLocationFlow } from './hooks/useLocationFlow';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { usePWA } from './hooks/usePWA';
import { HomeScreen } from './screens/HomeScreen';

const LazyMapScreen = React.lazy(() => import('./screens/MapScreen'));
const LazySosScreen = React.lazy(() => import('./screens/SosScreen'));
const LazyChatScreen = React.lazy(() => import('./screens/ChatScreen'));
const LazyProfileScreen = React.lazy(() => import('./screens/ProfileScreen'));
const LazyBleedingEmergencyModal = React.lazy(() =>
  import('./components/BleedingEmergencyModal').then((m) => ({
    default: m.BleedingEmergencyModal,
  })),
);
const LazyLocationModals = React.lazy(() =>
  import('./components/LocationModals').then((m) => ({
    default: m.LocationModals,
  })),
);
const LazySettingsDrawer = React.lazy(() =>
  import('./components/SettingsDrawer').then((m) => ({
    default: m.SettingsDrawer,
  })),
);
const LazyAboutModal = React.lazy(() =>
  import('./components/AboutModal').then((m) => ({
    default: m.AboutModal,
  })),
);
const LazyAuthOnboardingModal = React.lazy(() =>
  import('./components/AuthOnboardingModal').then((m) => ({
    default: m.AuthOnboardingModal,
  })),
);
const LazyEligibilityChecker = React.lazy(() =>
  import('./components/EligibilityChecker').then((m) => ({
    default: m.EligibilityChecker,
  })),
);
const LazyLegalPrivacyModals = React.lazy(() =>
  import('./components/LegalPrivacyModals').then((m) => ({
    default: m.LegalPrivacyModals,
  })),
);
const LazyBloodBankDashboardModal = React.lazy(() =>
  import('./components/BloodBankDashboardModal').then((m) => ({
    default: m.BloodBankDashboardModal,
  })),
);
const LazyAdminPortalModal = React.lazy(() =>
  import('./components/AdminPortalModal').then((m) => ({
    default: m.AdminPortalModal,
  })),
);
const LazyCompatibilityCheckerModal = React.lazy(() =>
  import('./components/CompatibilityCheckerModal').then((m) => ({
    default: m.CompatibilityCheckerModal,
  })),
);

function LifeDropApp() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [allIndiaView, setAllIndiaView] = useState(false);
  const [mapBloodGroup, setMapBloodGroup] = useState<BloodGroup | null>(null);
  const [isBleedingOpen, setIsBleedingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isEligibilityOpen, setIsEligibilityOpen] = useState(false);
  const [isBankDashboardOpen, setIsBankDashboardOpen] = useState(false);
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(false);
  const [isCompatOpen, setIsCompatOpen] = useState(false);
  const [compatInitialGroup, setCompatInitialGroup] =
    useState<BloodGroup>('O+');
  const [legalTab, setLegalTab] = useState<LegalTab | null>(null);

  const openCompatibilityChecker = (group?: BloodGroup) => {
    if (group) setCompatInitialGroup(group);
    setIsCompatOpen(true);
  };

  const isOnline = useOnlineStatus();
  const pwa = usePWA();
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

  const authProfile = useAuthProfile();
  const locationFlow = useLocationFlow();
  const activeScopeCode = allIndiaView
    ? ALL_INDIA_CODE
    : (locationFlow.savedLocation?.stateCode ?? 'KA');

  const homeStats = useHomeStats(activeScopeCode);

  return (
    <MotionConfig reducedMotion={dataSaver ? 'always' : 'user'}>
      {/* Outer canvas: full edge-to-edge on <=480px phones, centered phone frame on >480px */}
      <div className="ld-bg-sky ld-stars ld-viewport-h flex w-full items-center justify-center overflow-hidden">
        <div className="ld-bg-sky ld-stars ld-viewport-h relative flex w-full flex-col overflow-hidden min-[481px]:h-[min(100dvh,932px)] min-[481px]:max-w-[430px] min-[481px]:rounded-[36px] min-[481px]:border min-[481px]:border-white/20 min-[481px]:shadow-[0_28px_80px_rgba(10,6,34,0.65)]">
          {/* PWA Update Banner (A2) */}
          {pwa.needRefresh && (
            <div
              role="status"
              className="z-40 flex shrink-0 items-center justify-between gap-2 bg-[#5B3FE0] px-4 py-2 text-[12px] text-white"
            >
              <span className="font-medium">New version available, refresh</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void pwa.applyUpdate()}
                  className="inline-flex min-h-[34px] items-center gap-1 rounded-full bg-white px-3 font-semibold text-[#1B1740]"
                >
                  <RefreshCw className="h-3 w-3" aria-hidden="true" />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={pwa.dismissUpdate}
                  aria-label="Dismiss update notice"
                  className="flex min-h-[34px] min-w-[34px] items-center justify-center rounded-full hover:bg-white/15"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Non-intrusive Add to Home Screen banner (A2) */}
          {!pwa.needRefresh &&
            !pwa.isInstalled &&
            !pwa.dismissedInstallBanner &&
            pwa.isInstallable && (
              <div className="z-40 flex shrink-0 items-center justify-between gap-2 border-b border-white/15 bg-black/25 px-4 py-1.5 text-[12px] text-white">
                <span className="truncate">Install LifeDrop for instant offline first aid</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => void pwa.installApp()}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#34D399] px-3.5 font-semibold text-[#09291E]"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    Install
                  </button>
                  <button
                    type="button"
                    onClick={pwa.dismissInstallBanner}
                    aria-label="Dismiss install prompt"
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full hover:bg-white/15"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

          {activeTab === 'home' && (
            <HomeScreen
              savedLocation={locationFlow.savedLocation}
              activeScopeCode={activeScopeCode}
              onToggleAllIndia={() => setAllIndiaView((v) => !v)}
              onOpenLocationPicker={() => {
                setAllIndiaView(false);
                locationFlow.openExplainer();
              }}
              onOpenManualPicker={() => {
                setAllIndiaView(false);
                locationFlow.openManualPicker();
              }}
              onOpenBleedingEmergency={() => setIsBleedingOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onFindGroupOnMap={(group) => {
                setMapBloodGroup(group);
                setActiveTab('map');
              }}
              onOpenCompatibilityChecker={openCompatibilityChecker}
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

          {activeTab === 'map' && (
            <Suspense fallback={<HomeSkeleton />}>
              <LazyMapScreen
                initialBloodGroup={mapBloodGroup}
                savedLocation={locationFlow.savedLocation}
                browserPermission={locationFlow.browserPermission}
                onRequestNearMe={locationFlow.requestGpsLocation}
                onOpenManualLocation={locationFlow.openManualPicker}
                theme={theme}
                dataSaver={dataSaver}
                isOnline={isOnline}
                previewState={previewState}
              />
            </Suspense>
          )}

          {activeTab === 'sos' && (
            <Suspense fallback={<HomeSkeleton />}>
              <LazySosScreen
                user={authProfile.user}
                profile={authProfile.profile}
                activeScopeCode={activeScopeCode}
                savedLocation={locationFlow.savedLocation}
                isOnline={isOnline}
                dataSaver={dataSaver}
                onOpenAuthOnboarding={() => setIsAuthOpen(true)}
                onOpenBleedingEmergency={() => setIsBleedingOpen(true)}
                onOpenMapWithGroup={(group) => {
                  setMapBloodGroup(group);
                  setActiveTab('map');
                }}
              />
            </Suspense>
          )}

          {activeTab === 'chat' && (
            <Suspense fallback={<HomeSkeleton />}>
              <LazyChatScreen
                language={language}
                onChangeLanguage={setLanguage}
                isOnline={isOnline}
                onOpenBleedingEmergency={() => setIsBleedingOpen(true)}
                onFindGroupOnMap={(group) => {
                  setMapBloodGroup(group);
                  setActiveTab('map');
                }}
                onOpenCompatibilityChecker={openCompatibilityChecker}
              />
            </Suspense>
          )}

          {activeTab === 'profile' && (
            <Suspense fallback={<HomeSkeleton />}>
              <LazyProfileScreen
                user={authProfile.user}
                authLoading={authProfile.authLoading}
                profileLoading={authProfile.profileLoading}
                profile={authProfile.profile}
                consent={authProfile.consent}
                effectiveRole={authProfile.effectiveRole}
                devRoleOverride={authProfile.devRoleOverride}
                savedLocation={locationFlow.savedLocation}
                onSetDevRoleOverride={authProfile.setDevRoleOverride}
                onOpenAuthOnboarding={() => setIsAuthOpen(true)}
                onOpenEligibility={() => setIsEligibilityOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenAbout={() => setIsAboutOpen(true)}
                onOpenLegal={(tab) => setLegalTab(tab)}
                onOpenBleedingEmergency={() => setIsBleedingOpen(true)}
                onOpenCompatibilityChecker={() =>
                  openCompatibilityChecker(authProfile.profile?.bloodGroup ?? 'O+')
                }
                onOpenBankDashboard={() => setIsBankDashboardOpen(true)}
                onOpenAdminPortal={() => setIsAdminPortalOpen(true)}
                onToggleCanDonate={authProfile.toggleCanDonate}
                onLogSelfDonation={authProfile.logSelfDonation}
                onWithdrawConsent={authProfile.withdrawConsent}
                onRefreshUserAndProfile={authProfile.refreshUserAndProfile}
                onSignOut={authProfile.signOut}
                onDeleteAccount={authProfile.deleteAccount}
              />
            </Suspense>
          )}

          <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />

          <Suspense
            fallback={
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
                <div className="ld-bg-sky w-full max-w-[430px] rounded-[32px] border border-white/15">
                  <HomeSkeleton />
                </div>
              </div>
            }
          >
            {locationFlow.flowStep !== 'closed' && (
              <LazyLocationModals
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
            )}

            {isBleedingOpen && (
              <LazyBleedingEmergencyModal
                isOpen={isBleedingOpen}
                language={language}
                onChangeLanguage={setLanguage}
                onClose={() => setIsBleedingOpen(false)}
              />
            )}

            {isSettingsOpen && (
              <LazySettingsDrawer
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
                isInstallable={pwa.isInstallable}
                isInstalled={pwa.isInstalled}
                isIOS={pwa.isIOS}
                onInstallApp={pwa.installApp}
                onOpenAbout={() => setIsAboutOpen(true)}
              />
            )}

            {isAboutOpen && (
              <LazyAboutModal
                isOpen={isAboutOpen}
                onClose={() => setIsAboutOpen(false)}
              />
            )}

            {isAuthOpen && (
              <LazyAuthOnboardingModal
                isOpen={isAuthOpen}
                user={authProfile.user}
                savedLocation={locationFlow.savedLocation}
                existingProfile={authProfile.profile}
                onClose={() => setIsAuthOpen(false)}
                onCompleted={(savedProfile, shouldPromptLocation) => {
                  authProfile.setProfile(savedProfile);
                  setIsAuthOpen(false);
                  void authProfile.refreshUserAndProfile();
                  if (shouldPromptLocation) {
                    locationFlow.openExplainer();
                  }
                }}
                onOpenLegal={(tab) => setLegalTab(tab)}
              />
            )}

            {isEligibilityOpen && (
              <LazyEligibilityChecker
                isOpen={isEligibilityOpen}
                onClose={() => setIsEligibilityOpen(false)}
                defaultAge={
                  authProfile.privateContact?.dobYear
                    ? new Date().getFullYear() -
                      authProfile.privateContact.dobYear
                    : 24
                }
                defaultSex={authProfile.profile?.sex ?? 'male'}
                lastConfirmedDonationDate={
                  authProfile.profile?.lastConfirmedDonation ?? null
                }
              />
            )}

            {legalTab && (
              <LazyLegalPrivacyModals
                isOpen={Boolean(legalTab)}
                initialTab={legalTab}
                onClose={() => setLegalTab(null)}
              />
            )}

            {isBankDashboardOpen && (
              <LazyBloodBankDashboardModal
                isOpen={isBankDashboardOpen}
                onClose={() => setIsBankDashboardOpen(false)}
                userUid={authProfile.user?.uid ?? 'preview_bank_user'}
                userDisplayName={
                  authProfile.profile?.displayName ??
                  authProfile.user?.displayName ??
                  'LifeDrop Partner'
                }
                effectiveRole={authProfile.effectiveRole}
                isDevPreviewBank={authProfile.devRoleOverride === 'bank'}
                defaultStateCode={locationFlow.savedLocation?.stateCode ?? 'KA'}
                defaultCity={locationFlow.savedLocation?.city ?? 'Bengaluru'}
                isOnline={isOnline}
              />
            )}

            {isAdminPortalOpen && (
              <LazyAdminPortalModal
                isOpen={isAdminPortalOpen}
                onClose={() => setIsAdminPortalOpen(false)}
                userUid={authProfile.user?.uid ?? 'preview_admin_user'}
                userEmail={authProfile.user?.email ?? null}
                isRealAdmin={authProfile.isRealAdmin}
                isOnline={isOnline}
              />
            )}

            {isCompatOpen && (
              <LazyCompatibilityCheckerModal
                isOpen={isCompatOpen}
                initialGroup={compatInitialGroup}
                onClose={() => setIsCompatOpen(false)}
                onFindOnMap={(group) => {
                  setMapBloodGroup(group);
                  setActiveTab('map');
                }}
              />
            )}
          </Suspense>
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
