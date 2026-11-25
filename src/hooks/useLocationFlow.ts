import { useCallback, useEffect, useState } from 'react';
import {
  type BrowserPermissionState,
  type GeolocationAttemptResult,
  type LocationOutcomeStatus,
  type SavedLocation,
} from '../services/interfaces';
import { locationService } from '../services/locationService';

export type LocationFlowStep = 'closed' | 'explainer' | 'manual';

export function useLocationFlow() {
  const [savedLocation, setSavedLocation] = useState<SavedLocation | null>(() =>
    locationService.getSavedLocation(),
  );
  const [browserPermission, setBrowserPermission] =
    useState<BrowserPermissionState>('prompt');
  const [flowStep, setFlowStep] = useState<LocationFlowStep>(() =>
    locationService.getSavedLocation() ? 'closed' : 'explainer',
  );
  const [isLocating, setIsLocating] = useState(false);
  const [outcome, setOutcome] = useState<{
    status: LocationOutcomeStatus;
    message: string;
  } | null>(null);

  useEffect(() => {
    return locationService.watchBrowserPermission((state) => {
      setBrowserPermission(state);
    });
  }, []);

  const openExplainer = useCallback(() => {
    setOutcome(null);
    setFlowStep('explainer');
  }, []);

  const openManualPicker = useCallback(() => {
    setFlowStep('manual');
  }, []);

  const closeFlow = useCallback(() => {
    setFlowStep('closed');
  }, []);

  const requestGpsLocation = useCallback(async () => {
    setIsLocating(true);
    setOutcome(null);
    const res: GeolocationAttemptResult =
      await locationService.requestCurrentLocation(10000);
    setIsLocating(false);

    if (res.status === 'granted' && res.location) {
      setSavedLocation(res.location);
      setOutcome({ status: 'granted', message: res.message });
      setFlowStep('closed');
      return;
    }

    setOutcome({ status: res.status, message: res.message });
    if (res.status === 'outside-india') {
      setFlowStep('manual');
    }
  }, []);

  const selectManualLocation = useCallback((stateCode: string, city: string) => {
    const loc = locationService.setManualLocation(stateCode, city);
    setSavedLocation(loc);
    setOutcome(null);
    setFlowStep('closed');
  }, []);

  const turnOffSharing = useCallback(() => {
    const updated = locationService.turnOffSharing();
    setSavedLocation(updated);
  }, []);

  const deleteLocationData = useCallback(() => {
    locationService.deleteLocationData();
    setSavedLocation(null);
    setOutcome(null);
  }, []);

  return {
    savedLocation,
    browserPermission,
    flowStep,
    isLocating,
    outcome,
    openExplainer,
    openManualPicker,
    closeFlow,
    requestGpsLocation,
    selectManualLocation,
    turnOffSharing,
    deleteLocationData,
  };
}
