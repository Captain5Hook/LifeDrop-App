import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { MapScreen } from '../screens/MapScreen';

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

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
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
});
