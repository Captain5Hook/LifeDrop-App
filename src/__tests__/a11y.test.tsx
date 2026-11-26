import { render } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { AboutModal } from '../components/AboutModal';
import { BleedingEmergencyModal } from '../components/BleedingEmergencyModal';
import { LocationModals } from '../components/LocationModals';
import { SettingsDrawer } from '../components/SettingsDrawer';
import {
  SEED_DRIVES,
  SEED_GLOBAL_STATS,
  SEED_GOALS,
  SEED_STATE_STATS,
} from '../data/seedStats';
import { HomeScreen } from '../screens/HomeScreen';

async function expectNoSeriousA11yViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      // jsdom does not compute visual CSS contrast reliably across backdrop-blur layers
      'color-contrast': { enabled: false },
    },
  });
  const criticalOrSerious = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  expect(
    criticalOrSerious,
    criticalOrSerious.map((v) => `${v.id}: ${v.help}`).join('\n'),
  ).toHaveLength(0);
}

describe('Accessibility (axe-core) on Home & Milestone 1 Modals', () => {
  it('HomeScreen has zero serious or critical axe violations', async () => {
    const { container } = render(
      <HomeScreen
        savedLocation={{
          stateCode: 'KA',
          stateName: 'Karnataka',
          city: 'Bengaluru',
          source: 'manual',
          sharingEnabled: true,
          updatedAt: new Date().toISOString(),
        }}
        activeScopeCode="KA"
        onToggleAllIndia={vi.fn()}
        onOpenLocationPicker={vi.fn()}
        onOpenManualPicker={vi.fn()}
        onOpenBleedingEmergency={vi.fn()}
        onOpenSettings={vi.fn()}
        onFindGroupOnMap={vi.fn()}
        onOpenCompatibilityChecker={vi.fn()}
        globalStats={SEED_GLOBAL_STATS}
        stateStats={SEED_STATE_STATS['KA']}
        goals={SEED_GOALS}
        drives={SEED_DRIVES}
        attendedDriveIds={[]}
        onToggleAttendDrive={vi.fn()}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        isOnline={true}
        dataSaver={false}
        previewState="live"
      />,
    );
    await expectNoSeriousA11yViolations(container);
  });

  it('BleedingEmergencyModal has zero serious or critical axe violations and shows card disclaimer', async () => {
    const { container, getByText } = render(
      <BleedingEmergencyModal
        isOpen={true}
        language="en"
        onChangeLanguage={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      getByText('This is first-aid guidance, not a substitute for a doctor.'),
    ).toBeInTheDocument();
    expect(
      getByText(
        'Content follows standard first-aid guidance. Reviewed by [reviewer name, credential]. Status: Pending review.',
      ),
    ).toBeInTheDocument();
    await expectNoSeriousA11yViolations(container);
  });

  it('LocationModals (explainer & manual) have zero serious or critical axe violations', async () => {
    const { container, rerender } = render(
      <LocationModals
        flowStep="explainer"
        browserPermission="prompt"
        savedLocation={null}
        isLocating={false}
        outcome={null}
        onAllowLocation={vi.fn()}
        onOpenManual={vi.fn()}
        onOpenExplainer={vi.fn()}
        onSelectManual={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await expectNoSeriousA11yViolations(container);

    rerender(
      <LocationModals
        flowStep="manual"
        browserPermission="prompt"
        savedLocation={null}
        isLocating={false}
        outcome={null}
        onAllowLocation={vi.fn()}
        onOpenManual={vi.fn()}
        onOpenExplainer={vi.fn()}
        onSelectManual={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await expectNoSeriousA11yViolations(container);
  });

  it('SettingsDrawer and AboutModal have zero serious or critical axe violations', async () => {
    const settingsRender = render(
      <SettingsDrawer
        isOpen={true}
        onClose={vi.fn()}
        theme="dark"
        onToggleTheme={vi.fn()}
        dataSaver={false}
        onToggleDataSaver={vi.fn()}
        language="en"
        onChangeLanguage={vi.fn()}
        savedLocation={{
          stateCode: 'KA',
          stateName: 'Karnataka',
          city: 'Bengaluru',
          source: 'manual',
          sharingEnabled: true,
          updatedAt: new Date().toISOString(),
        }}
        browserPermission="granted"
        onUpdateLocation={vi.fn()}
        onTurnOffSharing={vi.fn()}
        onDeleteLocation={vi.fn()}
        previewState="live"
        onChangePreviewState={vi.fn()}
        isInstallable={false}
        isInstalled={false}
        isIOS={false}
        onInstallApp={vi.fn().mockResolvedValue(false)}
        onOpenAbout={vi.fn()}
      />,
    );
    await expectNoSeriousA11yViolations(settingsRender.container);

    const aboutRender = render(<AboutModal isOpen={true} onClose={vi.fn()} />);
    expect(
      aboutRender.getByText(
        'Content follows standard first-aid guidance. Reviewed by [reviewer name, credential]. Status: Pending review.',
      ),
    ).toBeInTheDocument();
    await expectNoSeriousA11yViolations(aboutRender.container);
  });
});
