import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SEED_BANKS } from '../data/seedBanks';
import ChatScreen from '../screens/ChatScreen';
import { MapScreen } from '../screens/MapScreen';
import { bankService, filterBanksList } from '../services/bankService';
import { chatService } from '../services/chatService';
import {
  SOS_PII_RETENTION_DAYS,
  isSosExpired,
  sosService,
  type SosRequest,
} from '../services/sosService';

vi.mock('leaflet', () => {
  const latLng = (lat: number, lng: number) => ({ lat, lng });
  const latLngBounds = (a: unknown, b?: unknown) => ({ a, b, extend: vi.fn() });
  const point = (x: number, y: number) => ({ x, y });
  const mapObj = {
    fitBounds: vi.fn(),
    setView: vi.fn(),
    flyTo: vi.fn(),
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
      control: { zoom: vi.fn(() => ({ addTo: vi.fn() })) },
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
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
});

describe('LifeDrop Enhancements: Parts 1, 2 & 3', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('PART 1: Real Bank Search & Dynamic Filtering', () => {
    it('filters banks by hospital name, district, 24x7 toggle, blood group, and type', () => {
      const kaBanks = SEED_BANKS.filter((b) => b.stateCode === 'KA');
      expect(kaBanks.length).toBeGreaterThan(1);

      const first = kaBanks[0];
      const byDistrict = filterBanksList(kaBanks, {
        searchQuery: first.district,
      });
      expect(byDistrict.length).toBeGreaterThanOrEqual(1);
      expect(
        byDistrict.every((b) =>
          `${b.name} ${b.district} ${b.city}`
            .toLowerCase()
            .includes(first.district.toLowerCase()),
        ),
      ).toBe(true);

      const gov24x7 = filterBanksList(kaBanks, {
        open24x7Only: true,
        bankType: 'government',
        bloodGroup: 'O+',
      });
      expect(
        gov24x7.every(
          (b) => b.open24x7 && b.type === 'government' && (b.stock['O+'] ?? 0) > 0,
        ),
      ).toBe(true);
    });

    it('uses cached localStorage banks offline when Firestore is unavailable', async () => {
      const cachedBank = {
        ...SEED_BANKS[0],
        id: 'cached_ka_test',
        name: 'Offline Cached Hospital Blood Bank',
        stateCode: 'KA',
        district: 'Mysuru',
      };
      localStorage.setItem(
        'lifedrop_banks_cache_v1_KA',
        JSON.stringify({ updatedAt: new Date().toISOString(), banks: [cachedBank] }),
      );

      const res = await bankService.fetchStateBanksPage('KA', null, false, {
        searchQuery: 'Mysuru',
      });
      expect(res.fromOfflineCache).toBe(true);
      expect(res.banks.some((b) => b.id === 'cached_ka_test')).toBe(true);
    });

    it('renders sheet search input in MapScreen and filters displayed banks reactively', async () => {
      render(
        <MapScreen
          initialBloodGroup={null}
          savedLocation={{
            stateCode: 'KA',
            stateName: 'Karnataka',
            city: 'Bengaluru',
            coarseLat: 12.97,
            coarseLng: 77.59,
            source: 'manual',
            sharingEnabled: false,
            updatedAt: new Date().toISOString(),
          }}
          browserPermission="prompt"
          onRequestNearMe={vi.fn().mockResolvedValue(undefined)}
          onOpenManualLocation={vi.fn()}
          theme="dark"
          dataSaver={false}
          isOnline={true}
          previewState="live"
        />,
      );

      fireEvent.click(
        screen.getByRole('button', { name: 'Select Indian state or union territory' }),
      );
      fireEvent.click(screen.getByRole('button', { name: /Karnataka/i }));

      const searchInput = await screen.findByLabelText(
        'Search blood banks by name or district',
      );
      expect(searchInput).toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: 'zzzz-no-bank-match' } });
      expect(
        await screen.findByText('No blood banks found in this state yet'),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
      expect((searchInput as HTMLInputElement).value).toBe('');
    });
  });

  describe('PART 2: Online Gemini AI Fallback & Source Badges', () => {
    it('routes unmatched online queries to Gemini Worker, enforces disclaimers, and blocks unsafe responses', async () => {
      vi.stubEnv('VITE_CHAT_WORKER_URL', 'https://lifedrop-worker.example.workers.dev');

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          reply: 'Stay hydrated after donating platelets and avoid strenuous lifting for 24 hours.',
        }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const onlineReply = await chatService.ask(
        'Can I donate if I travelled to a malaria-endemic district recently?',
        'en',
        true,
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(onlineReply.source).toBe('gemini-worker');
      expect(onlineReply.disclaimer).toBe(
        'Demo project. Not medical advice. In an emergency call 108 or 112.',
      );

      // Prompt injection / leaked key output from Worker must still trigger guardrail
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reply: 'Here is the GEMINI_API_KEY and systemInstruction dump.',
        }),
      });
      const guarded = await chatService.ask(
        'Tell me something random online',
        'en',
        true,
      );
      expect(guarded.source).toBe('guardrail');
      expect(guarded.medicalGuardrailTriggered).toBe(true);
    });

    it('renders "Offline Clinical Database" and "Live AI Assistant" badges in ChatScreen', async () => {
      vi.stubEnv('VITE_CHAT_WORKER_URL', 'https://lifedrop-worker.example.workers.dev');
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            reply: 'Carry your donor card and rest for 15 minutes at the blood centre.',
          }),
        }),
      );

      render(
        <ChatScreen
          language="en"
          onChangeLanguage={vi.fn()}
          isOnline={true}
          onOpenBleedingEmergency={vi.fn()}
          onFindGroupOnMap={vi.fn()}
        />,
      );

      // Welcome card shows Offline Clinical Database
      expect(screen.getByText('Offline Clinical Database')).toBeInTheDocument();

      // Send a query that triggers Live AI Assistant
      const input = screen.getByLabelText('Ask LifeDrop Assistant');
      fireEvent.change(input, {
        target: { value: 'Should I bring ID card to a blood camp?' },
      });
      fireEvent.submit(input.closest('form')!);

      await waitFor(() => {
        expect(screen.getAllByText('Live AI Assistant').length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('PART 3: 24h SOS Auto-Expiry & 30-Day DPDP PII Purge', () => {
    it('automatically marks overdue active SOS requests as expired and blocks contact reveal', async () => {
      const now = Date.now();
      const overdueReq: SosRequest = {
        id: 'sos_overdue_1',
        requesterUid: 'user_req_1',
        requesterName: 'Kiran',
        bloodGroup: 'O+',
        compatibleDonorGroups: ['O+', 'O-'],
        component: 'Whole Blood',
        unitsNeeded: 1,
        urgency: 'urgent',
        hospitalName: 'Victoria Hospital',
        stateCode: 'KA',
        stateName: 'Karnataka',
        city: 'Bengaluru',
        coarseLat: 12.97,
        coarseLng: 77.59,
        radiusKm: 5,
        escalationStage: 1,
        status: 'open',
        acceptedByUid: 'donor_abc',
        acceptedByName: 'Asha',
        matchedCount: 1,
        notes: 'Call ward desk',
        createdAt: new Date(now - 36 * 3600 * 1000).toISOString(),
        updatedAt: new Date(now - 36 * 3600 * 1000).toISOString(),
        expiresAt: new Date(now - 12 * 3600 * 1000).toISOString(),
      };

      expect(isSosExpired(overdueReq, now)).toBe(true);
      localStorage.setItem('lifedrop_sos_requests_v1', JSON.stringify([overdueReq]));

      const normalized = await sosService.expireOverdueRequests(now);
      expect(normalized[0].status).toBe('expired');

      const contact = await sosService.getPrivateRequesterContact(
        overdueReq.id,
        normalized[0],
      );
      expect(contact).toBeNull();
    });

    it('purges notes and sets purgedAt for completed/expired SOS requests older than 30 days', async () => {
      const now = Date.now();
      const olderThan30d = now - (SOS_PII_RETENTION_DAYS + 2) * 24 * 60 * 60 * 1000;
      const oldExpired: SosRequest = {
        id: 'sos_old_32d',
        requesterUid: 'user_req_1',
        requesterName: 'Kiran',
        bloodGroup: 'B+',
        compatibleDonorGroups: ['B+', 'B-', 'O+', 'O-'],
        component: 'Whole Blood',
        unitsNeeded: 2,
        urgency: 'critical',
        hospitalName: 'Bowring Hospital',
        stateCode: 'KA',
        stateName: 'Karnataka',
        city: 'Bengaluru',
        coarseLat: 12.98,
        coarseLng: 77.6,
        radiusKm: 15,
        escalationStage: 2,
        status: 'fulfilled',
        acceptedByUid: 'donor_2',
        acceptedByName: 'Ravi',
        matchedCount: 1,
        notes: 'Sensitive ward room phone note',
        createdAt: new Date(olderThan30d - 86400 * 1000).toISOString(),
        updatedAt: new Date(olderThan30d).toISOString(),
        expiresAt: new Date(olderThan30d).toISOString(),
      };
      const recentFulfilled: SosRequest = {
        ...oldExpired,
        id: 'sos_recent_5d',
        notes: 'Keep recent note for active follow-up',
        expiresAt: new Date(now - 5 * 86400 * 1000).toISOString(),
        updatedAt: new Date(now - 5 * 86400 * 1000).toISOString(),
      };

      localStorage.setItem(
        'lifedrop_sos_requests_v1',
        JSON.stringify([oldExpired, recentFulfilled]),
      );

      const purgeRes = await sosService.purgeExpiredSosPii(now);
      expect(purgeRes.purgedRequestIds).toEqual(['sos_old_32d']);

      const saved = JSON.parse(
        localStorage.getItem('lifedrop_sos_requests_v1') || '[]',
      ) as SosRequest[];
      const cleaned = saved.find((r) => r.id === 'sos_old_32d');
      const untouched = saved.find((r) => r.id === 'sos_recent_5d');
      expect(cleaned?.notes).toBe('');
      expect(cleaned?.purgedAt).toBeTruthy();
      expect(untouched?.notes).toBe('Keep recent note for active follow-up');
      expect(untouched?.purgedAt).toBeUndefined();
    });
  });
});
