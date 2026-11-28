import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { MapScreen } from '../screens/MapScreen';
import App from '../App';

const { mockFitBounds, mockSetView, mockFlyTo, mockZoomControl } = vi.hoisted(() => ({
  mockFitBounds: vi.fn(),
  mockSetView: vi.fn(),
  mockFlyTo: vi.fn(),
  mockZoomControl: vi.fn(() => ({ addTo: vi.fn() })),
}));

vi.mock('leaflet', () => {
  const latLng = (lat: number, lng: number) => ({ lat, lng });
  const latLngBounds = (a: unknown, b?: unknown) => ({ a, b, extend: vi.fn() });
  const point = (x: number, y: number) => ({ x, y });
  const mapObj = {
    fitBounds: (...args: unknown[]) => mockFitBounds(...args),
    setView: (...args: unknown[]) => mockSetView(...args),
    flyTo: (...args: unknown[]) => mockFlyTo(...args),
    invalidateSize: vi.fn(),
    getSize: () => ({ x: 360, y: 468 }),
    getMinZoom: () => 3,
    getMaxZoom: () => 16,
    project: (ll: { lat?: number; lng?: number } | [number, number]) => {
      const lat = Array.isArray(ll) ? ll[0] : (ll.lat ?? 20);
      const lng = Array.isArray(ll) ? ll[1] : (ll.lng ?? 78);
      return { x: lng * 10, y: lat * 10 };
    },
    unproject: (pt: { x: number; y: number }) => ({ lat: pt.y / 10, lng: pt.x / 10 }),
    remove: vi.fn(),
  };
  const layerGroup = () => ({
    addTo: vi.fn().mockReturnThis(),
    clearLayers: vi.fn(),
  });
  const marker = () => ({
    on: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    bindTooltip: vi.fn().mockReturnThis(),
  });
  return {
    default: {
      map: vi.fn(() => mapObj),
      control: { zoom: mockZoomControl },
      tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
      layerGroup: vi.fn(layerGroup),
      divIcon: vi.fn((opts: unknown) => opts),
      marker: vi.fn(marker),
      circle: vi.fn(() => ({ addTo: vi.fn() })),
      latLng,
      latLngBounds,
      point,
    },
    latLng,
    latLngBounds,
    point,
  };
});

vi.mock('../hooks/usePWA', () => ({
  usePWA: () => ({
    isInstallable: false,
    isInstalled: false,
    isIOS: false,
    dismissedInstallBanner: false,
    dismissInstallBanner: vi.fn(),
    installApp: vi.fn().mockResolvedValue(false),
    needRefresh: false,
    offlineReady: false,
    dismissUpdate: vi.fn(),
    dismissOfflineReady: vi.fn(),
    applyUpdate: vi.fn(),
  }),
}));

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
});

describe('MapScreen GUI & Viewport Layout Fixes', () => {
  it('defaults sheet snap to peek in All-India view, switches to half when selecting a state, and resets to peek on All India', async () => {
    render(
      <MapScreen
        initialBloodGroup={null}
        savedLocation={null}
        browserPermission="prompt"
        onRequestNearMe={vi.fn().mockResolvedValue(undefined)}
        onOpenManualLocation={vi.fn()}
        theme="dark"
        dataSaver={false}
        isOnline={true}
        previewState="live"
      />,
    );

    const sheet = screen.getByLabelText('Blood bank list and filters');
    const handleBtn = screen.getByRole('button', {
      name: /Cycle sheet height \(currently peek\)/i,
    });
    expect(sheet).toHaveClass('h-[112px]', 'overscroll-contain', 'touch-pan-y');
    expect(handleBtn).toHaveClass('overscroll-contain', 'touch-pan-y');

    // Zoom control placed at bottomleft above sheet peek zone
    expect(mockZoomControl).toHaveBeenCalledWith({ position: 'bottomleft' });

    // All-India fitBounds uses asymmetric bottom padding for sheet clearance
    await waitFor(() => {
      expect(mockFitBounds).toHaveBeenCalled();
    });
    const lastFitCall = mockFitBounds.mock.calls.at(-1);
    expect(lastFitCall?.[1]).toEqual(
      expect.objectContaining({
        paddingBottomRight: expect.arrayContaining([14, expect.any(Number)]),
      }),
    );

    // Select a state via the state selector modal
    fireEvent.click(
      screen.getByRole('button', { name: 'Select Indian state or union territory' }),
    );
    fireEvent.click(screen.getByRole('button', { name: /Karnataka/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: /Cycle sheet height \(currently half\)/i,
        }),
      ).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Blood bank list and filters')).toHaveClass('h-[45%]');

    // Return to All India -> snaps back to peek
    fireEvent.click(screen.getByRole('button', { name: /^India$/i }));
    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: /Cycle sheet height \(currently peek\)/i,
        }),
      ).toBeInTheDocument();
    });
  });

  it('keeps all 5 tab screens inside tab-viewport-stage above BottomNav and raised SOS', async () => {
    render(<App />);

    const stage = screen.getByTestId('tab-viewport-stage');
    expect(stage).toHaveClass(
      'overflow-hidden',
      'pb-[calc(92px+env(safe-area-inset-bottom,12px))]',
    );

    const nav = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(stage.contains(nav)).toBe(false);

    // Home tab renders inside stage
    expect(screen.getByText(/Lifesavers on LifeDrop/i)).toBeInTheDocument();
    expect(stage.contains(screen.getByLabelText('LifeDrop national impact summary'))).toBe(true);

    // Map tab renders inside stage
    fireEvent.click(screen.getByRole('button', { name: 'India Blood Bank Map' }));
    const mapHeaderTrigger = await screen.findByRole('button', {
      name: 'Select Indian state or union territory',
    });
    expect(stage.contains(mapHeaderTrigger)).toBe(true);

    // SOS tab renders inside stage
    fireEvent.click(screen.getByRole('button', { name: 'Emergency SOS blood request' }));
    const sosHeading = await screen.findByRole('heading', { name: 'Emergency SOS' });
    expect(stage.contains(sosHeading)).toBe(true);

    // Chatbot tab renders inside stage
    fireEvent.click(screen.getByRole('button', { name: 'LifeDrop Assistant' }));
    const chatInput = await screen.findByLabelText('Ask LifeDrop Assistant');
    expect(stage.contains(chatInput)).toBe(true);

    // Profile tab renders inside stage
    fireEvent.click(screen.getByRole('button', { name: 'Profile and Settings' }));
    const profileHeading = await screen.findByRole('heading', {
      name: /Profile & Eligibility/i,
    });
    expect(stage.contains(profileHeading)).toBe(true);
  });
});
