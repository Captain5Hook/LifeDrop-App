import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Filter,
  Globe,
  List,
  Map as MapIcon,
  MapPin,
  Navigation,
  PhoneCall,
  RefreshCw,
  Search,
  Table as TableIcon,
  WifiOff,
  X,
} from 'lucide-react';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import {
  ALL_INDIA_CODE,
  INDIA_STATES_AND_UTS,
  STATE_MAP,
} from '../data/indiaLocations';
import { haversineKm } from '../data/indiaStatesGeo';
import type { BloodBank } from '../data/seedBanks';
import {
  ORDERED_BLOOD_GROUPS,
  type BloodGroup,
  type StockHealth,
} from '../data/seedStats';
import type { PreviewScreenState, ThemeMode } from '../hooks/useAppSettings';
import {
  bankService,
  isBankStale,
  type StateSummaryRow,
} from '../services/bankService';
import type {
  BrowserPermissionState,
  SavedLocation,
} from '../services/interfaces';

interface MapScreenProps {
  initialBloodGroup: BloodGroup | null;
  savedLocation: SavedLocation | null;
  browserPermission: BrowserPermissionState;
  onRequestNearMe: () => Promise<void>;
  onOpenManualLocation: () => void;
  theme: ThemeMode;
  dataSaver: boolean;
  isOnline: boolean;
  previewState: PreviewScreenState;
}

type ViewMode = 'map' | 'table';
type SheetSnap = 'peek' | 'half' | 'full';
type BankTypeFilter = 'all' | 'government' | 'private';
type SortField = 'stateName' | 'banksCount' | 'totalUsers';

const INDIA_BOUNDS = L.latLngBounds(
  L.latLng(6.0, 68.0),
  L.latLng(37.5, 98.0),
);

// Generous pan boundary so asymmetric bottom-sheet padding can lift southern states above the sheet
const INDIA_MAX_PAN_BOUNDS = L.latLngBounds(
  L.latLng(-10.0, 56.0),
  L.latLng(44.0, 108.0),
);

function getSheetHeightPx(containerHeight: number, snap: SheetSnap): number {
  if (snap === 'full') return Math.round(containerHeight * 0.72);
  if (snap === 'half') return Math.round(containerHeight * 0.45);
  return 112;
}

function centerLatLngAboveSheet(
  map: L.Map,
  target: L.LatLngExpression,
  zoom: number,
  topPad: number,
  bottomPad: number,
  animate: boolean,
) {
  const size = map.getSize();
  if (size.y <= 0) {
    map.setView(target, zoom, { animate });
    return;
  }
  const clampedZoom = Math.max(
    map.getMinZoom(),
    Math.min(map.getMaxZoom(), zoom),
  );
  const targetPt = map.project(target, clampedZoom);
  const yOffset = Math.max(0, (bottomPad - topPad) / 2);
  const offsetCenter = map.unproject(
    L.point(targetPt.x, targetPt.y + yOffset),
    clampedZoom,
  );
  if (animate) {
    map.flyTo(offsetCenter, clampedZoom, { duration: 0.4 });
  } else {
    map.setView(offsetCenter, clampedZoom, { animate: false });
  }
}

function getStateHealthColor(row: StateSummaryRow): {
  health: StockHealth;
  hex: string;
  label: string;
} {
  if (row.criticalGroups.length >= 2) {
    return { health: 'critical', hex: '#F43F5E', label: 'Critical' };
  }
  if (row.criticalGroups.length === 1) {
    return { health: 'low', hex: '#FBBF24', label: 'Low' };
  }
  return { health: 'stable', hex: '#34D399', label: 'Stable' };
}

function formatTimeAgo(iso: string): string {
  const diffHours = Math.max(
    1,
    Math.round((Date.now() - new Date(iso).getTime()) / 3600000),
  );
  if (diffHours < 24) return `${diffHours}h ago`;
  const days = Math.round(diffHours / 24);
  return `${days}d ago`;
}

export const MapScreen: React.FC<MapScreenProps> = ({
  initialBloodGroup,
  savedLocation,
  browserPermission,
  onRequestNearMe,
  onOpenManualLocation,
  dataSaver,
  isOnline,
  previewState,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [selectedStateCode, setSelectedStateCode] = useState<string>(ALL_INDIA_CODE);
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>('peek');
  const [stateSearchOpen, setStateSearchOpen] = useState(false);
  const [stateSearchQuery, setStateSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters (B3)
  const [bloodGroupFilter, setBloodGroupFilter] = useState<BloodGroup | 'ALL'>(
    initialBloodGroup ?? 'ALL',
  );
  const [open24x7Only, setOpen24x7Only] = useState(false);
  const [typeFilter, setTypeFilter] = useState<BankTypeFilter>('all');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(250);
  const [includeStale, setIncludeStale] = useState<boolean>(true);
  const [sortByDistance, setSortByDistance] = useState<boolean>(false);
  const [nearMeNotice, setNearMeNotice] = useState<string | null>(null);
  const [srListMode, setSrListMode] = useState<boolean>(false);

  // Aggregated All-India summaries & state-scoped banks
  const [stateSummaries, setStateSummaries] = useState<StateSummaryRow[]>([]);
  const [summariesDemo, setSummariesDemo] = useState(true);
  const [banks, setBanks] = useState<BloodBank[]>([]);
  const [hasMoreBanks, setHasMoreBanks] = useState(false);
  const [bankCursor, setBankCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [banksDemo, setBanksDemo] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

  // Table sort & search (B4)
  const [tableSearch, setTableSearch] = useState('');
  const [tableSort, setTableSort] = useState<{
    field: SortField;
    dir: 'asc' | 'desc';
  }>({ field: 'banksCount', dir: 'desc' });

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const nearMeFocusRef = useRef(false);

  const effectiveOffline = !isOnline || previewState === 'offline' || fromCache;
  const hasUserCoords =
    Boolean(savedLocation?.sharingEnabled) &&
    typeof savedLocation?.coarseLat === 'number' &&
    typeof savedLocation?.coarseLng === 'number';

  // Sync incoming Home pill blood group
  useEffect(() => {
    if (initialBloodGroup) {
      setBloodGroupFilter(initialBloodGroup);
      if (savedLocation && savedLocation.stateCode !== ALL_INDIA_CODE) {
        setSelectedStateCode(savedLocation.stateCode);
      }
    }
  }, [initialBloodGroup, savedLocation]);

  // Load All-India state summaries from stats/state_{code}
  const loadSummaries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await bankService.fetchAllIndiaStateSummaries();
      setStateSummaries(res.rows);
      setSummariesDemo(res.isDemo);
      setFromCache(res.fromOfflineCache);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load India state stats.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummaries();
  }, [loadSummaries]);

  // Load ONLY selected state's banks (paginated, 20/page)
  const loadStateBanks = useCallback(
    async (stateCode: string, append = false) => {
      if (stateCode === ALL_INDIA_CODE) {
        setBanks([]);
        setBankCursor(null);
        setHasMoreBanks(false);
        return;
      }

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const res = await bankService.fetchStateBanksPage(
          stateCode,
          append ? bankCursor : null,
          isOnline,
        );
        setBanks((prev) => (append ? [...prev, ...res.banks] : res.banks));
        setBankCursor(res.cursor);
        setHasMoreBanks(res.hasMore);
        setBanksDemo(res.fromDemoSeed);
        setFromCache(res.fromOfflineCache);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load blood banks for this state.',
        );
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [bankCursor, isOnline],
  );

  useEffect(() => {
    if (selectedStateCode !== ALL_INDIA_CODE) {
      void loadStateBanks(selectedStateCode, false);
      setSheetSnap('half');
    } else {
      setBanks([]);
      setSelectedBankId(null);
      setSheetSnap('peek');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStateCode]);

  // Initialize Leaflet map locked to India
  useEffect(() => {
    if (viewMode !== 'map' || !mapContainerRef.current || mapInstanceRef.current) {
      return;
    }

    const map = L.map(mapContainerRef.current, {
      center: [22.4, 79.0],
      zoom: 4,
      minZoom: 3,
      maxZoom: 16,
      maxBounds: INDIA_MAX_PAN_BOUNDS,
      maxBoundsViscosity: 0.9,
      zoomControl: false,
      fadeAnimation: !dataSaver,
      zoomAnimation: !dataSaver,
      markerZoomAnimation: !dataSaver,
    });

    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
      keepBuffer: dataSaver ? 0 : 2,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    markerLayerRef.current = group;

    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(mapContainerRef.current);

    const onOrient = () => setTimeout(() => map.invalidateSize(), 150);
    window.addEventListener('orientationchange', onOrient);
    window.addEventListener('resize', onOrient);

    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', onOrient);
      window.removeEventListener('resize', onOrient);
      map.remove();
      mapInstanceRef.current = null;
      markerLayerRef.current = null;
    };
  }, [viewMode, dataSaver]);

  // Recalculate Leaflet viewport when sheet snaps or view toggles
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const t = setTimeout(() => map.invalidateSize(), 260);
    return () => clearTimeout(t);
  }, [sheetSnap, viewMode, filtersOpen]);

  // Computed filtered banks for selected state
  const filteredBanks = useMemo(() => {
    if (previewState === 'empty') return [];

    const withDist = banks.map((bank) => {
      const distKm =
        hasUserCoords && savedLocation?.coarseLat && savedLocation?.coarseLng
          ? haversineKm(
              savedLocation.coarseLat,
              savedLocation.coarseLng,
              bank.lat,
              bank.lng,
            )
          : null;
      return { bank, distKm, stale: isBankStale(bank.updatedAt) };
    });

    const filtered = withDist.filter(({ bank, distKm, stale }) => {
      if (bloodGroupFilter !== 'ALL' && (bank.stock[bloodGroupFilter] ?? 0) <= 0) {
        return false;
      }
      if (open24x7Only && !bank.open24x7) return false;
      if (typeFilter !== 'all' && bank.type !== typeFilter) return false;
      if (!includeStale && stale) return false;
      if (hasUserCoords && distKm !== null && distKm > maxDistanceKm) {
        return false;
      }
      return true;
    });

    if (sortByDistance && hasUserCoords) {
      filtered.sort((a, b) => (a.distKm ?? 9999) - (b.distKm ?? 9999));
    }

    return filtered;
  }, [
    banks,
    bloodGroupFilter,
    open24x7Only,
    typeFilter,
    includeStale,
    maxDistanceKm,
    sortByDistance,
    hasUserCoords,
    savedLocation,
    previewState,
  ]);

  // Render Leaflet markers (All-India 36 state clusters OR State banks + approximate user marker)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markerLayerRef.current;
    if (!map || !layer || viewMode !== 'map') return;

    layer.clearLayers();

    if (selectedStateCode === ALL_INDIA_CODE) {
      stateSummaries.forEach((summary) => {
        const st = STATE_MAP.get(summary.stateCode);
        if (!st) return;
        const { hex, label } = getStateHealthColor(summary);

        const icon = L.divIcon({
          className: 'ld-state-cluster-icon',
          html: `<button type="button" aria-label="${st.name}: ${summary.banksCount} blood banks, ${label}" style="background:${hex};color:#0F172A;border:2px solid #FFFFFF;border-radius:999px;min-width:34px;height:34px;padding:0 7px;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.4);cursor:pointer;">${summary.banksCount}</button>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const marker = L.marker([st.center.lat, st.center.lng], { icon });
        marker.on('click', () => {
          setSelectedStateCode(st.code);
        });
        marker.addTo(layer);
      });

      return;
    }

    filteredBanks.forEach(({ bank, distKm }) => {
      const isSelected = bank.id === selectedBankId;
      const color = bank.type === 'government' ? '#34D399' : '#60A5FA';
      const icon = L.divIcon({
        className: 'ld-bank-pin',
        html: `<button type="button" aria-label="${bank.name}, ${bank.city}" style="background:${isSelected ? '#5B3FE0' : color};color:#FFFFFF;border:2px solid #FFFFFF;border-radius:999px;width:${isSelected ? 30 : 22}px;height:${isSelected ? 30 : 22}px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;box-shadow:0 4px 12px rgba(0,0,0,0.45);cursor:pointer;">+</button>`,
        iconSize: [isSelected ? 30 : 22, isSelected ? 30 : 22],
        iconAnchor: [isSelected ? 15 : 11, isSelected ? 15 : 11],
      });

      const marker = L.marker([bank.lat, bank.lng], { icon });
      marker.on('click', () => {
        setSelectedBankId(bank.id);
        setSheetSnap('half');
      });
      marker.bindTooltip(
        `${bank.name}${distKm !== null ? ` (~${distKm.toFixed(1)} km)` : ''}`,
      );
      marker.addTo(layer);
    });

    // Approximate "You are here" marker (never exact home, never any donor markers)
    if (hasUserCoords && savedLocation?.coarseLat && savedLocation?.coarseLng) {
      const userCoords: [number, number] = [
        savedLocation.coarseLat,
        savedLocation.coarseLng,
      ];
      L.circle(userCoords, {
        radius: 1800,
        color: '#A78BFA',
        fillColor: '#5B3FE0',
        fillOpacity: 0.2,
        weight: 1.5,
      }).addTo(layer);

      const youIcon = L.divIcon({
        className: 'ld-you-marker',
        html: `<div aria-label="You are here (approximate area)" style="background:#5B3FE0;border:3px solid #FFFFFF;border-radius:999px;width:16px;height:16px;box-shadow:0 0 14px rgba(91,63,224,0.8);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker(userCoords, { icon: youIcon })
        .bindTooltip('You are here (~2 km area)')
        .addTo(layer);
    }
  }, [
    viewMode,
    selectedStateCode,
    stateSummaries,
    filteredBanks,
    selectedBankId,
    hasUserCoords,
    savedLocation,
  ]);

  // Apply asymmetric padding / bounds so India & state markers remain visible above the sheet
  useEffect(() => {
    const map = mapInstanceRef.current;
    const container = mapContainerRef.current;
    if (!map || !container || viewMode !== 'map' || srListMode) return;

    const containerH = container.clientHeight || map.getSize().y;
    if (containerH <= 0) return;

    const sheetPx = getSheetHeightPx(containerH, sheetSnap);
    const topPad = selectedStateCode === ALL_INDIA_CODE ? 48 : 20;
    const safeBottomPad = Math.min(
      sheetPx + 12,
      Math.max(0, containerH - topPad - 88),
    );
    const animate = !dataSaver;

    map.invalidateSize({ animate: false });

    if (selectedStateCode === ALL_INDIA_CODE) {
      map.fitBounds(INDIA_BOUNDS, {
        paddingTopLeft: [14, topPad],
        paddingBottomRight: [14, safeBottomPad],
        maxZoom: 5,
        animate,
      });
      return;
    }

    if (
      nearMeFocusRef.current &&
      hasUserCoords &&
      savedLocation?.coarseLat &&
      savedLocation?.coarseLng
    ) {
      nearMeFocusRef.current = false;
      centerLatLngAboveSheet(
        map,
        [savedLocation.coarseLat, savedLocation.coarseLng],
        11,
        topPad,
        safeBottomPad,
        animate,
      );
      return;
    }

    if (selectedBankId) {
      const match = filteredBanks.find(({ bank }) => bank.id === selectedBankId);
      if (match) {
        centerLatLngAboveSheet(
          map,
          [match.bank.lat, match.bank.lng],
          12,
          topPad,
          safeBottomPad,
          animate,
        );
        return;
      }
    }

    if (filteredBanks.length >= 2) {
      const bounds = L.latLngBounds(
        filteredBanks.map(({ bank }) => L.latLng(bank.lat, bank.lng)),
      );
      map.fitBounds(bounds, {
        paddingTopLeft: [24, topPad],
        paddingBottomRight: [24, safeBottomPad],
        maxZoom: 10,
        animate,
      });
      return;
    }

    if (filteredBanks.length === 1) {
      centerLatLngAboveSheet(
        map,
        [filteredBanks[0].bank.lat, filteredBanks[0].bank.lng],
        9,
        topPad,
        safeBottomPad,
        animate,
      );
      return;
    }

    const st = STATE_MAP.get(selectedStateCode);
    if (st) {
      centerLatLngAboveSheet(
        map,
        [st.center.lat, st.center.lng],
        7,
        topPad,
        safeBottomPad,
        animate,
      );
    }
  }, [
    viewMode,
    srListMode,
    selectedStateCode,
    sheetSnap,
    selectedBankId,
    filteredBanks,
    hasUserCoords,
    savedLocation,
    dataSaver,
  ]);

  const handleNearMe = async () => {
    setNearMeNotice(null);
    if (browserPermission === 'denied') {
      setNearMeNotice(
        'Location is blocked in browser settings. Enable permission or pick your state manually.',
      );
      return;
    }

    if (!hasUserCoords) {
      await onRequestNearMe();
      return;
    }

    if (savedLocation && savedLocation.stateCode !== ALL_INDIA_CODE) {
      nearMeFocusRef.current = true;
      setSortByDistance(true);
      if (selectedStateCode !== savedLocation.stateCode) {
        setSelectedStateCode(savedLocation.stateCode);
      } else if (
        mapInstanceRef.current &&
        mapContainerRef.current &&
        savedLocation.coarseLat &&
        savedLocation.coarseLng
      ) {
        nearMeFocusRef.current = false;
        const containerH = mapContainerRef.current.clientHeight || 460;
        const sheetPx = getSheetHeightPx(containerH, sheetSnap);
        const safeBottomPad = Math.min(sheetPx + 12, Math.max(0, containerH - 108));
        centerLatLngAboveSheet(
          mapInstanceRef.current,
          [savedLocation.coarseLat, savedLocation.coarseLng],
          11,
          20,
          safeBottomPad,
          !dataSaver,
        );
      }
    }
  };

  const searchedStates = useMemo(() => {
    const q = stateSearchQuery.trim().toLowerCase();
    if (!q) return INDIA_STATES_AND_UTS;
    return INDIA_STATES_AND_UTS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q),
    );
  }, [stateSearchQuery]);

  const tableRows = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    const rows = stateSummaries.filter(
      (r) =>
        !q ||
        r.stateName.toLowerCase().includes(q) ||
        r.stateCode.toLowerCase().includes(q),
    );

    rows.sort((a, b) => {
      const mul = tableSort.dir === 'asc' ? 1 : -1;
      if (tableSort.field === 'stateName') {
        return a.stateName.localeCompare(b.stateName) * mul;
      }
      return (a[tableSort.field] - b[tableSort.field]) * mul;
    });
    return rows;
  }, [stateSummaries, tableSearch, tableSort]);

  const activeStateObj =
    selectedStateCode !== ALL_INDIA_CODE ? STATE_MAP.get(selectedStateCode) : null;
  const isDemoVisible = summariesDemo || banksDemo;

  const sheetHeightClass =
    sheetSnap === 'full'
      ? 'h-[72%]'
      : sheetSnap === 'half'
        ? 'h-[45%]'
        : 'h-[112px]';

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[calc(72px+env(safe-area-inset-bottom,0px))]">
      {/* Fixed Top Map Header */}
      <header className="shrink-0 space-y-2 border-b border-black/10 px-3 pt-[max(0.5rem,env(safe-area-inset-top,0px))] pb-2.5 dark:border-white/15">
        {effectiveOffline && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-2xl border border-[#FBBF24]/40 bg-[#FBBF24]/15 px-3 py-1.5 text-[12px] font-medium text-slate-900 dark:text-white"
          >
            <WifiOff className="h-3.5 w-3.5 shrink-0 text-[#D97706] dark:text-[#FBBF24]" aria-hidden="true" />
            Offline, showing saved data
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          {/* State Selector Trigger */}
          <button
            type="button"
            onClick={() => setStateSearchOpen(true)}
            className="inline-flex min-h-[44px] min-w-0 flex-1 items-center justify-between gap-1.5 rounded-full border border-black/15 bg-white/70 px-3.5 text-[13px] font-medium text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
            aria-label="Select Indian state or union territory"
          >
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-[#5B3FE0] dark:text-[#C4B5FD]" aria-hidden="true" />
              <span className="truncate">
                {activeStateObj ? activeStateObj.name : 'All India (36)'}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-75" aria-hidden="true" />
          </button>

          {/* Map / Table Toggle (B4) */}
          <div
            role="group"
            aria-label="View mode"
            className="flex shrink-0 items-center rounded-full border border-black/15 bg-white/60 p-0.5 dark:border-white/20 dark:bg-white/10"
          >
            <button
              type="button"
              onClick={() => setViewMode('map')}
              aria-pressed={viewMode === 'map'}
              className={`inline-flex min-h-[38px] items-center gap-1 rounded-full px-3 text-[12px] font-medium ${
                viewMode === 'map'
                  ? 'bg-[#5B3FE0] text-white'
                  : 'text-slate-700 dark:text-white/80'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Map
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              className={`inline-flex min-h-[38px] items-center gap-1 rounded-full px-3 text-[12px] font-medium ${
                viewMode === 'table'
                  ? 'bg-[#5B3FE0] text-white'
                  : 'text-slate-700 dark:text-white/80'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Table
            </button>
          </div>
        </div>

        {/* Sub-bar: Near Me, Screen-Reader List Toggle, Demo badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void handleNearMe()}
              aria-label={
                browserPermission === 'denied'
                  ? 'Near me disabled because browser location permission is denied'
                  : 'Center map near my approximate location'
              }
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-[12px] font-medium whitespace-nowrap transition ${
                browserPermission === 'denied'
                  ? 'border border-black/15 bg-white/40 text-slate-500 dark:border-white/15 dark:bg-white/5 dark:text-white/50'
                  : 'bg-[#5B3FE0] text-white hover:bg-[#6A4FF0]'
              }`}
            >
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              Near me
            </button>

            {selectedStateCode !== ALL_INDIA_CODE && (
              <button
                type="button"
                onClick={() => setSelectedStateCode(ALL_INDIA_CODE)}
                className="inline-flex min-h-[40px] items-center gap-1 rounded-full border border-black/15 bg-white/60 px-2.5 text-[12px] font-medium dark:border-white/20 dark:bg-white/10"
              >
                <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                India
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {viewMode === 'map' && (
              <button
                type="button"
                onClick={() => setSrListMode((v) => !v)}
                aria-pressed={srListMode}
                aria-label="Toggle accessible text list view"
                className="inline-flex min-h-[40px] items-center gap-1 rounded-full border border-black/15 bg-white/60 px-2.5 text-[12px] font-medium dark:border-white/20 dark:bg-white/10"
              >
                <List className="h-3.5 w-3.5" aria-hidden="true" />
                {srListMode ? 'Map' : 'List'}
              </button>
            )}

            {isDemoVisible && (
              <span className="rounded-full border border-black/15 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-slate-700 whitespace-nowrap dark:border-white/20 dark:bg-white/15 dark:text-white/90">
                Demo data
              </span>
            )}
          </div>
        </div>

        {nearMeNotice && (
          <div
            role="status"
            className="flex items-center justify-between gap-2 rounded-2xl border border-[#FBBF24]/40 bg-[#FBBF24]/15 px-3 py-1.5 text-[12px]"
          >
            <span>{nearMeNotice}</span>
            <button
              type="button"
              onClick={onOpenManualLocation}
              className="shrink-0 font-semibold underline"
            >
              Pick manually
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area between Header and Bottom Nav */}
      {previewState === 'error' || error ? (
        <div className="flex flex-1 items-center justify-center p-5 text-center">
          <div className="ld-glass w-full rounded-[28px] p-6">
            <AlertTriangle className="mx-auto h-9 w-9 text-[#FBBF24]" aria-hidden="true" />
            <h2 className="mt-2 text-[18px] font-medium">Unable to load map data</h2>
            <p className="mt-1 text-[13px] text-slate-700 dark:text-white/75">
              {error ?? 'Network or cache error occurred.'}
            </p>
            <button
              type="button"
              onClick={() =>
                selectedStateCode === ALL_INDIA_CODE
                  ? void loadSummaries()
                  : void loadStateBanks(selectedStateCode, false)
              }
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#5B3FE0] px-5 text-[14px] font-medium text-white"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Retry
            </button>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* B4. State-wise Table View */
        <div className="flex min-h-0 flex-1 flex-col p-3">
          <div className="mb-2.5 flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-white/60"
                aria-hidden="true"
              />
              <input
                type="search"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search 36 states & UTs..."
                aria-label="Search states in table"
                className="min-h-[44px] w-full rounded-full border border-black/15 bg-white/75 py-2 pr-4 pl-10 text-[13px] text-slate-900 placeholder:text-slate-500 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/55"
              />
            </div>
          </div>

          <div className="ld-glass flex-1 min-h-0 overflow-auto rounded-[24px]">
            <table className="w-full min-w-[360px] border-collapse text-left text-[13px]">
              <thead className="sticky top-0 z-10 bg-[#2A215C] text-white">
                <tr>
                  <th className="px-3 py-2.5 font-medium">
                    <button
                      type="button"
                      onClick={() =>
                        setTableSort((s) => ({
                          field: 'stateName',
                          dir: s.field === 'stateName' && s.dir === 'asc' ? 'desc' : 'asc',
                        }))
                      }
                      className="inline-flex min-h-[36px] items-center gap-1"
                    >
                      State <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="px-2 py-2.5 font-medium text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setTableSort((s) => ({
                          field: 'banksCount',
                          dir: s.field === 'banksCount' && s.dir === 'desc' ? 'asc' : 'desc',
                        }))
                      }
                      className="inline-flex min-h-[36px] items-center gap-1"
                    >
                      Banks <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="px-2 py-2.5 font-medium text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setTableSort((s) => ({
                          field: 'totalUsers',
                          dir: s.field === 'totalUsers' && s.dir === 'desc' ? 'asc' : 'desc',
                        }))
                      }
                      className="inline-flex min-h-[36px] items-center gap-1"
                    >
                      Users <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="px-3 py-2.5 font-medium">Critical</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/10">
                {tableRows.map((row) => (
                  <tr
                    key={row.stateCode}
                    onClick={() => {
                      setSelectedStateCode(row.stateCode);
                      setViewMode('map');
                    }}
                    className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <td className="px-3 py-3 font-medium">
                      <div>{row.stateName}</div>
                      <div className="text-[11px] text-slate-600 dark:text-white/60">
                        {row.stateCode}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums font-semibold">
                      {row.banksCount}
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums">
                      {row.totalUsers.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-medium text-[#E11D48] dark:text-[#FB7185]">
                        {row.criticalGroups.join(', ') || 'None'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* B1–B3. Map View + Draggable/Snapping Glass Sheet */
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Leaflet Canvas OR Screen-reader Accessible List */}
          <div
            ref={mapContainerRef}
            className={`isolate ld-map-canvas h-full w-full ${
              sheetSnap === 'half'
                ? 'ld-map-sheet-half'
                : sheetSnap === 'full'
                  ? 'ld-map-sheet-full'
                  : 'ld-map-sheet-peek'
            } ${srListMode ? 'hidden' : 'block'}`}
            aria-label="Interactive blood bank map of India"
          />

          {srListMode && (
            <div className="ld-scroll-area flex-1 p-3 space-y-2">
              <p className="text-[12px] text-slate-600 dark:text-white/75">
                Screen-reader accessible directory view
              </p>
              {selectedStateCode === ALL_INDIA_CODE
                ? stateSummaries.map((row) => {
                    const { label } = getStateHealthColor(row);
                    return (
                      <button
                        key={row.stateCode}
                        type="button"
                        onClick={() => {
                          setSelectedStateCode(row.stateCode);
                          setSrListMode(false);
                        }}
                        className="flex min-h-[48px] w-full items-center justify-between rounded-2xl border border-black/10 bg-white/60 px-4 py-2.5 text-left dark:border-white/15 dark:bg-white/10"
                      >
                        <span>
                          <strong>{row.stateName}</strong> · {row.banksCount} banks ·{' '}
                          {row.totalUsers.toLocaleString('en-IN')} users
                        </span>
                        <span className="text-[12px] font-medium">{label}</span>
                      </button>
                    );
                  })
                : filteredBanks.map(({ bank }) => (
                    <div
                      key={bank.id}
                      className="rounded-2xl border border-black/10 bg-white/60 p-3 dark:border-white/15 dark:bg-white/10"
                    >
                      <p className="font-medium">{bank.name}</p>
                      <p className="text-[12px] opacity-80">
                        {bank.city}, {bank.district} · {bank.type}
                      </p>
                    </div>
                  ))}
            </div>
          )}

          {/* Legend pill on All-India map */}
          {!srListMode && selectedStateCode === ALL_INDIA_CODE && (
            <div className="pointer-events-none absolute top-3 left-3 z-[400] flex items-center gap-2 rounded-full border border-white/20 bg-[#1B1740]/85 px-3 py-1.5 text-[11px] text-white backdrop-blur-md">
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-[#34D399]" /> Stable
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FBBF24]" /> Low
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-[#F43F5E]" /> Critical
              </span>
            </div>
          )}

          {/* Bottom Glass Sheet (peek / half / full) */}
          {!srListMode && (
            <section
              aria-label="Blood bank list and filters"
              className={`ld-glass-sheet overscroll-contain touch-pan-y absolute right-0 bottom-0 left-0 z-[450] flex flex-col rounded-t-[32px] px-4 pt-2 pb-2 transition-all duration-300 ${sheetHeightClass}`}
            >
              {/* Snap handle */}
              <div className="flex shrink-0 items-center justify-between gap-2 pb-1.5 overscroll-contain touch-pan-y">
                <button
                  type="button"
                  onClick={() =>
                    setSheetSnap((s) =>
                      s === 'peek' ? 'half' : s === 'half' ? 'full' : 'peek',
                    )
                  }
                  aria-label={`Cycle sheet height (currently ${sheetSnap})`}
                  className="flex min-h-[36px] flex-1 items-center justify-center gap-2 rounded-full overscroll-contain touch-pan-y hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <span className="h-1 w-10 rounded-full bg-black/25 dark:bg-white/35" />
                  <span className="text-[12px] font-medium text-slate-700 dark:text-white/80">
                    {selectedStateCode === ALL_INDIA_CODE
                      ? `Tap any of ${stateSummaries.length} states/UTs`
                      : `${filteredBanks.length} banks in ${activeStateObj?.name ?? selectedStateCode}`}
                  </span>
                  {sheetSnap === 'full' ? (
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>

                {selectedStateCode !== ALL_INDIA_CODE && (
                  <button
                    type="button"
                    onClick={() => {
                      setFiltersOpen((v) => !v);
                      if (sheetSnap === 'peek') setSheetSnap('half');
                    }}
                    aria-expanded={filtersOpen}
                    className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-[12px] font-medium ${
                      filtersOpen || bloodGroupFilter !== 'ALL' || open24x7Only || typeFilter !== 'all'
                        ? 'bg-[#5B3FE0] text-white'
                        : 'border border-black/15 bg-white/60 dark:border-white/20 dark:bg-white/10'
                    }`}
                  >
                    <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                    Filters
                  </button>
                )}
              </div>

              {/* Filter Bar (when in State view & Filters open) */}
              {selectedStateCode !== ALL_INDIA_CODE && filtersOpen && (
                <div className="mb-2 shrink-0 space-y-2 rounded-2xl border border-black/10 bg-white/55 p-3 text-[12px] dark:border-white/15 dark:bg-white/[0.08]">
                  <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
                    {(['ALL', ...ORDERED_BLOOD_GROUPS] as const).map((bg) => (
                      <button
                        key={bg}
                        type="button"
                        onClick={() => setBloodGroupFilter(bg)}
                        className={`min-h-[36px] shrink-0 rounded-full px-3 font-medium ${
                          bloodGroupFilter === bg
                            ? 'bg-[#5B3FE0] text-white'
                            : 'bg-black/10 text-slate-800 dark:bg-white/10 dark:text-white/80'
                        }`}
                      >
                        {bg === 'ALL' ? 'All groups' : bg}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex rounded-full bg-black/10 p-0.5 dark:bg-white/10">
                      {(['all', 'government', 'private'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTypeFilter(t)}
                          className={`min-h-[34px] rounded-full px-2.5 capitalize ${
                            typeFilter === t
                              ? 'bg-[#5B3FE0] text-white'
                              : 'text-slate-700 dark:text-white/75'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setOpen24x7Only((v) => !v)}
                      aria-pressed={open24x7Only}
                      className={`min-h-[34px] rounded-full px-3 font-medium ${
                        open24x7Only
                          ? 'bg-[#34D399] text-[#09291E]'
                          : 'bg-black/10 dark:bg-white/10'
                      }`}
                    >
                      24x7 only
                    </button>

                    <button
                      type="button"
                      onClick={() => setIncludeStale((v) => !v)}
                      aria-pressed={includeStale}
                      className={`min-h-[34px] rounded-full px-3 font-medium ${
                        includeStale
                          ? 'bg-[#5B3FE0] text-white'
                          : 'bg-black/10 dark:bg-white/10'
                      }`}
                    >
                      Show stale (&gt;24h)
                    </button>
                  </div>

                  {hasUserCoords && (
                    <label className="flex items-center justify-between gap-3 pt-1">
                      <span className="whitespace-nowrap font-medium">
                        Max distance: {maxDistanceKm} km
                      </span>
                      <input
                        type="range"
                        min={10}
                        max={300}
                        step={10}
                        value={maxDistanceKm}
                        onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                        className="w-full accent-[#5B3FE0]"
                      />
                    </label>
                  )}
                </div>
              )}

              {/* Sheet Scroll Body */}
              <div className="ld-scroll-area flex-1 min-h-0 space-y-2.5 pb-2">
                {previewState === 'loading' || isLoading ? (
                  <div className="space-y-2 animate-pulse">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-24 rounded-[24px] bg-white/15" />
                    ))}
                  </div>
                ) : selectedStateCode === ALL_INDIA_CODE ? (
                  <div className="grid grid-cols-1 gap-2">
                    {stateSummaries.slice(0, 12).map((row) => {
                      const { hex, label } = getStateHealthColor(row);
                      return (
                        <button
                          key={row.stateCode}
                          type="button"
                          onClick={() => setSelectedStateCode(row.stateCode)}
                          className="flex min-h-[52px] w-full items-center justify-between rounded-2xl border border-black/10 bg-white/60 px-3.5 py-2.5 text-left dark:border-white/15 dark:bg-white/[0.08]"
                        >
                          <div>
                            <p className="text-[14px] font-medium">{row.stateName}</p>
                            <p className="text-[12px] text-slate-600 tabular-nums dark:text-white/70">
                              {row.banksCount} banks · Critical: {row.criticalGroups.join(', ') || 'None'}
                            </p>
                          </div>
                          <span
                            className="inline-flex items-center gap-1.5 text-[12px] font-semibold"
                            style={{ color: hex }}
                          >
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : filteredBanks.length === 0 ? (
                  <div className="rounded-[24px] border border-black/10 bg-white/50 p-5 text-center dark:border-white/15 dark:bg-white/[0.07]">
                    <p className="text-[15px] font-medium">
                      No blood banks found in this state yet
                    </p>
                    <p className="mt-1 text-[13px] text-slate-600 dark:text-white/75">
                      Try clearing blood group or 24x7 filters, or switch back to All India.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setBloodGroupFilter('ALL');
                        setOpen24x7Only(false);
                        setTypeFilter('all');
                        setIncludeStale(true);
                      }}
                      className="mt-3 min-h-[44px] rounded-full bg-[#5B3FE0] px-5 text-[13px] font-medium text-white"
                    >
                      Reset filters
                    </button>
                  </div>
                ) : (
                  <>
                    {filteredBanks.map(({ bank, distKm, stale }) => (
                      <article
                        key={bank.id}
                        className={`rounded-[24px] border p-3.5 transition ${
                          selectedBankId === bank.id
                            ? 'border-[#5B3FE0] bg-[#5B3FE0]/20'
                            : 'border-black/10 bg-white/60 dark:border-white/15 dark:bg-white/[0.08]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-[14px] font-semibold leading-snug">
                              {bank.name}
                            </h3>
                            <p className="mt-0.5 text-[12px] text-slate-700 dark:text-white/75">
                              {bank.city}, {bank.district} ·{' '}
                              {bank.type === 'government' ? 'Government' : 'Private'}
                              {bank.open24x7 ? ' · Open 24x7' : ''}
                            </p>
                          </div>

                          {distKm !== null && (
                            <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[#5B3FE0] dark:text-[#C4B5FD]">
                              ~{distKm.toFixed(1)} km
                            </span>
                          )}
                        </div>

                        {/* Blood groups in stock */}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {ORDERED_BLOOD_GROUPS.map((bg) => {
                            const units = bank.stock[bg] ?? 0;
                            const isTarget = bloodGroupFilter === bg;
                            return (
                              <span
                                key={bg}
                                className={`rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ${
                                  isTarget
                                    ? 'bg-[#5B3FE0] text-white'
                                    : units === 0
                                      ? 'bg-[#F43F5E]/20 text-[#E11D48] dark:text-[#FDA4AF]'
                                      : units <= 2
                                        ? 'bg-[#FBBF24]/20 text-[#B45309] dark:text-[#FDE68A]'
                                        : 'bg-[#34D399]/20 text-[#047857] dark:text-[#6EE7B7]'
                                }`}
                              >
                                {bg}: {units}
                              </span>
                            );
                          })}
                        </div>

                        {/* Updated + Stale + Call/Directions */}
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-[12px] text-slate-600 dark:text-white/70">
                            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>Updated {formatTimeAgo(bank.updatedAt)}</span>
                            {stale && (
                              <span className="rounded-full bg-[#FBBF24]/25 px-2 py-0.5 text-[11px] font-semibold text-[#B45309] dark:text-[#FDE68A]">
                                Stale
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${bank.phone}`}
                              aria-label={`Call ${bank.name}`}
                              className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-[#34D399] px-3 text-[12px] font-semibold text-[#09291E]"
                            >
                              <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
                              Call
                            </a>
                            <a
                              href={`https://www.openstreetmap.org/directions?to=${bank.lat}%2C${bank.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Directions to ${bank.name}`}
                              className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-[#5B3FE0] px-3 text-[12px] font-medium text-white"
                            >
                              <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                              Directions
                            </a>
                          </div>
                        </div>
                      </article>
                    ))}

                    {hasMoreBanks && (
                      <button
                        type="button"
                        disabled={isLoadingMore}
                        onClick={() => void loadStateBanks(selectedStateCode, true)}
                        className="min-h-[44px] w-full rounded-full border border-black/15 bg-white/70 px-4 text-[13px] font-medium dark:border-white/20 dark:bg-white/10"
                      >
                        {isLoadingMore ? 'Loading more...' : 'Load more banks'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Searchable 36 States & UTs Picker Modal */}
      {stateSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Choose Indian state or union territory"
        >
          <div className="ld-glass-sheet flex max-h-[90dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[32px] border border-white/20 p-5 text-slate-900 sm:rounded-[32px] dark:text-white">
            <div className="flex shrink-0 items-center justify-between pb-3">
              <h2 className="text-[20px] font-light">Select State / UT (36)</h2>
              <button
                type="button"
                onClick={() => setStateSearchOpen(false)}
                aria-label="Close state picker"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative shrink-0">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-white/60"
                aria-hidden="true"
              />
              <input
                type="search"
                value={stateSearchQuery}
                onChange={(e) => setStateSearchQuery(e.target.value)}
                placeholder="Search state or union territory..."
                className="min-h-[44px] w-full rounded-full border border-black/15 bg-white/75 py-2 pr-4 pl-10 text-[14px] text-slate-900 placeholder:text-slate-500 dark:border-white/20 dark:bg-white/10 dark:text-white"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedStateCode(ALL_INDIA_CODE);
                setStateSearchOpen(false);
                setStateSearchQuery('');
              }}
              className="mt-3 flex min-h-[46px] w-full shrink-0 items-center justify-between rounded-2xl border border-[#5B3FE0]/40 bg-[#5B3FE0]/15 px-4 text-[14px] font-medium"
            >
              <span>All India (36 States &amp; UTs)</span>
              <Globe className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="ld-scroll-area mt-2.5 flex-1 min-h-0 space-y-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              {searchedStates.map((st) => (
                <button
                  key={st.code}
                  type="button"
                  onClick={() => {
                    setSelectedStateCode(st.code);
                    setStateSearchOpen(false);
                    setStateSearchQuery('');
                  }}
                  className="flex min-h-[46px] w-full items-center justify-between rounded-2xl border border-black/10 bg-white/60 px-4 py-2 text-left text-[14px] hover:bg-white/90 dark:border-white/10 dark:bg-white/[0.08]"
                >
                  <span>
                    {st.name}{' '}
                    <span className="text-[12px] opacity-65">
                      · {st.type === 'ut' ? 'UT' : 'State'}
                    </span>
                  </span>
                  <span className="text-[12px] font-semibold opacity-75">
                    {st.code}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapScreen;
