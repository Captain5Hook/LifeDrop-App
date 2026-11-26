import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocationModals } from '../components/LocationModals';
import { MEDICAL_REVIEW_CONFIG } from '../config/medicalReview';
import bleedingData from '../data/knowledge/bleedingFirstAid.json';
import { useAppSettings } from '../hooks/useAppSettings';
import { useLocationFlow } from '../hooks/useLocationFlow';
import { locationService } from '../services/locationService';
import type { LocationOutcomeStatus } from '../services/interfaces';

const LANGS = ['en', 'hi', 'kn'] as const;

describe('Bleeding First-Aid Content Integrity & Safety Attribution', () => {
  it('has equal non-empty steps and special cases across English, Hindi, and Kannada', () => {
    expect(bleedingData.steps.length).toBe(8);
    expect(bleedingData.specialCases.length).toBe(6);

    for (const lang of LANGS) {
      expect(bleedingData.openingLine[lang].trim().length).toBeGreaterThan(10);
      expect(bleedingData.medicalDisclaimer[lang].trim().length).toBeGreaterThan(10);
      expect(bleedingData.reviewNotice[lang].trim().length).toBeGreaterThan(10);

      for (const step of bleedingData.steps) {
        expect(step.title[lang].trim().length).toBeGreaterThan(0);
        expect(step.body[lang].trim().length).toBeGreaterThan(0);
      }

      for (const sc of bleedingData.specialCases) {
        expect(sc.title[lang].trim().length).toBeGreaterThan(0);
        expect(sc.body[lang].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('prominently includes emergency numbers 108 and 112 in opening instructions across all languages and quick-dial list', () => {
    const numbers = bleedingData.emergencyNumbers.map((n) => n.number);
    expect(numbers).toEqual(expect.arrayContaining(['108', '112', '104']));

    for (const lang of LANGS) {
      expect(bleedingData.openingLine[lang]).toContain('108');
      expect(bleedingData.openingLine[lang]).toContain('112');
    }
  });

  it('exposes the exact pending medical review line and version from a single config', () => {
    expect(MEDICAL_REVIEW_CONFIG.getReviewLine()).toBe(
      'Content follows standard first-aid guidance. Reviewed by [reviewer name, credential]. Status: Pending review.',
    );
    expect(MEDICAL_REVIEW_CONFIG.getVersionAndReviewLine()).toContain('v1.0.0');
    expect(MEDICAL_REVIEW_CONFIG.getVersionAndReviewLine()).toContain('Pending review');
  });
});

describe('Location Permission Outcomes, Manual Picker, and Deletion', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('handles all 5 geolocation outcomes (granted, dismissed, denied, timeout, unavailable) + outside-india while keeping manual picker usable', async () => {
    const outcomes: Array<{
      code?: number;
      coords?: { latitude: number; longitude: number };
      expectedStatus: LocationOutcomeStatus;
    }> = [
      { coords: { latitude: 12.9716, longitude: 77.5946 }, expectedStatus: 'granted' },
      { code: 1, expectedStatus: 'dismissed' },
      { code: 1, expectedStatus: 'denied' },
      { code: 3, expectedStatus: 'timeout' },
      { code: 2, expectedStatus: 'unavailable' },
      { coords: { latitude: 51.5072, longitude: -0.1276 }, expectedStatus: 'outside-india' },
    ];

    for (const scenario of outcomes) {
      const permState = scenario.expectedStatus === 'denied' ? 'denied' : 'prompt';
      Object.defineProperty(navigator, 'permissions', {
        configurable: true,
        value: {
          query: vi.fn().mockResolvedValue({
            state: permState,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          }),
        },
      });

      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition: (
            success: PositionCallback,
            error: PositionErrorCallback,
          ) => {
            if (scenario.coords) {
              success({
                coords: {
                  ...scenario.coords,
                  accuracy: 50,
                  altitude: null,
                  altitudeAccuracy: null,
                  heading: null,
                  speed: null,
                  toJSON: () => ({}),
                },
                timestamp: Date.now(),
                toJSON: () => ({}),
              });
            } else {
              error({
                code: scenario.code ?? 2,
                message: 'Test geo error',
                PERMISSION_DENIED: 1,
                POSITION_UNAVAILABLE: 2,
                TIMEOUT: 3,
              });
            }
          },
        },
      });

      const res = await locationService.requestCurrentLocation(1000);
      expect(res.status).toBe(scenario.expectedStatus);

      if (scenario.expectedStatus === 'granted') {
        expect(res.location?.stateCode).toBe('KA');
        expect(res.location?.coarseLat).toBe(12.98);
        expect(res.location?.coarseLng).toBe(77.6);
      } else {
        // Render LocationModals with the failure outcome and confirm manual picker button stays active
        const onOpenManual = vi.fn();
        const { unmount } = render(
          <LocationModals
            flowStep="explainer"
            browserPermission={permState === 'denied' ? 'denied' : 'prompt'}
            savedLocation={null}
            isLocating={false}
            outcome={{ status: res.status, message: res.message }}
            onAllowLocation={vi.fn()}
            onOpenManual={onOpenManual}
            onOpenExplainer={vi.fn()}
            onSelectManual={vi.fn()}
            onClose={vi.fn()}
          />,
        );
        const manualBtn = screen.getByRole('button', { name: /choose manually/i });
        expect(manualBtn).toBeEnabled();
        fireEvent.click(manualBtn);
        expect(onOpenManual).toHaveBeenCalledTimes(1);
        unmount();
      }
    }
  });

  it('clears saved location from localStorage when Delete my location data is triggered', () => {
    const { result } = renderHook(() => useLocationFlow());

    act(() => {
      result.current.selectManualLocation('KA', 'Bengaluru');
    });

    expect(localStorage.getItem('lifedrop_location_v1')).not.toBeNull();
    expect(result.current.savedLocation?.city).toBe('Bengaluru');

    act(() => {
      result.current.deleteLocationData();
    });

    expect(localStorage.getItem('lifedrop_location_v1')).toBeNull();
    expect(result.current.savedLocation).toBeNull();
  });
});

describe('App Settings Hook (Theme, Data Saver, Language, Theme-Color)', () => {
  it('persists theme, dataSaver, and language and updates DOM classes + meta theme-color', () => {
    const { result } = renderHook(() => useAppSettings());

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(
      document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
    ).toBe('#1B1740');

    act(() => {
      result.current.toggleTheme();
      result.current.setDataSaver(true);
      result.current.setLanguage('kn');
    });

    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('data-saver')).toBe(true);
    expect(
      document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
    ).toBe('#ECE9FC');

    const stored = JSON.parse(localStorage.getItem('lifedrop_settings_v1') || '{}');
    expect(stored).toEqual({
      theme: 'light',
      dataSaver: true,
      language: 'kn',
    });
  });
});
