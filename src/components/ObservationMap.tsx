import { useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, Maximize2, RefreshCw, Search } from 'lucide-react';
import { FRESHWATER_TYPES, type Observation, type QueuedObservation } from '../types/observation';

interface ObservationMapProps {
  observations: Observation[];
  queuedObservations: QueuedObservation[];
  draftLat: number | null;
  draftLng: number | null;
  focusedObservationId: string | null;
  isLoading: boolean;
  onSelectCoordinates: (lat: number, lng: number) => void;
  onRefresh: () => void;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPopupHtml(obs: Observation, isPending = false): string {
  const safeSite = escapeHtml(obs.site_name);
  const safeType = escapeHtml(obs.freshwater_type);
  const safeDate = escapeHtml(obs.sample_date);
  const safeTime = obs.sample_time ? ` · ${escapeHtml(obs.sample_time.slice(0, 5))}` : '';
  const safeCoords = `${obs.latitude.toFixed(5)}, ${obs.longitude.toFixed(5)}`;

  const nitrate = obs.nitrate_ppm !== null && obs.nitrate_ppm !== undefined ? `${obs.nitrate_ppm} ppm` : '—';
  const phosphate = obs.phosphate_ppm !== null && obs.phosphate_ppm !== undefined ? `${obs.phosphate_ppm} ppm` : '—';
  const secchi = obs.secchi_depth_cm !== null && obs.secchi_depth_cm !== undefined ? `${obs.secchi_depth_cm} cm` : '—';

  const photoBlock = obs.photo_url
    ? `<div style="margin-top:8px;">
         <img src="${escapeHtml(obs.photo_url)}" alt="Site photo for ${safeSite}" referrerpolicy="no-referrer" style="width:100%;height:120px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;display:block;" onerror="this.style.display='none'" />
       </div>`
    : '';

  const pendingLine = isPending
    ? `<div style="margin-bottom:6px;padding:3px 6px;border-radius:4px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:600;">Pending Offline Sync</div>`
    : '';

  const notesBlock = obs.notes
    ? `<p style="margin:6px 0 0;font-size:11px;color:#475569;line-height:1.4;">${escapeHtml(obs.notes.slice(0, 140))}${obs.notes.length > 140 ? '…' : ''}</p>`
    : '';

  return `
    <div style="font-family:'Plus Jakarta Sans',sans-serif;color:#0f172a;">
      ${pendingLine}
      <div style="font-size:14px;font-weight:700;line-height:1.25;">${safeSite}</div>
      <div style="margin-top:2px;font-size:11px;color:#475569;">
        ${safeType} · <span style="font-family:'JetBrains Mono',monospace;">${safeDate}${safeTime}</span>
      </div>
      <div style="margin-top:4px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#64748b;">
        ${safeCoords}
      </div>
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;font-size:11px;">
        <div>
          <div style="color:#64748b;font-size:10px;">Nitrate</div>
          <div style="font-family:'JetBrains Mono',monospace;font-weight:600;">${escapeHtml(nitrate)}</div>
        </div>
        <div>
          <div style="color:#64748b;font-size:10px;">Phosphate</div>
          <div style="font-family:'JetBrains Mono',monospace;font-weight:600;">${escapeHtml(phosphate)}</div>
        </div>
        <div>
          <div style="color:#64748b;font-size:10px;">Secchi</div>
          <div style="font-family:'JetBrains Mono',monospace;font-weight:600;">${escapeHtml(secchi)}</div>
        </div>
      </div>
      <div style="margin-top:6px;font-size:11px;color:#334155;">
        Color: <strong>${escapeHtml(obs.water_color)}</strong> · Flow: <strong>${escapeHtml(obs.water_flow)}</strong>
      </div>
      <div style="margin-top:2px;font-size:11px;color:#334155;">
        Algae: <strong>${escapeHtml(obs.algae_presence)}</strong> · Level: <strong>${escapeHtml(obs.water_level)}</strong>
      </div>
      ${notesBlock}
      ${photoBlock}
    </div>
  `;
}

export function ObservationMap({
  observations,
  queuedObservations,
  draftLat,
  draftLng,
  focusedObservationId,
  isLoading,
  onSelectCoordinates,
  onRefresh,
}: ObservationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const draftMarkerRef = useRef<any>(null);
  const markerByIdRef = useRef<Map<string, any>>(new Map());
  const onSelectCoordsRef = useRef(onSelectCoordinates);
  onSelectCoordsRef.current = onSelectCoordinates;

  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const filteredObservations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return observations.filter((obs) => {
      if (typeFilter !== 'ALL' && obs.freshwater_type !== typeFilter) return false;
      if (q && !obs.site_name.toLowerCase().includes(q) && !(obs.notes ?? '').toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [observations, typeFilter, searchQuery]);

  // Initialize Leaflet map once
  useEffect(() => {
    const L = window.L;
    if (!containerRef.current || !L || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [25, 10],
      zoom: 2,
      minZoom: 2,
      worldCopyJump: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);

    map.on('click', (e: any) => {
      const lat = Number(e.latlng.lat.toFixed(6));
      const wrappedLng = ((((e.latlng.lng + 180) % 360) + 360) % 360) - 180;
      const lng = Number(wrappedLng.toFixed(6));
      onSelectCoordsRef.current(lat, lng);
    });

    map.on('mousemove', (e: any) => {
      const wrappedLng = ((((e.latlng.lng + 180) % 360) + 360) % 360) - 180;
      setHoverCoords({
        lat: Number(e.latlng.lat.toFixed(5)),
        lng: Number(wrappedLng.toFixed(5)),
      });
    });

    map.on('mouseout', () => setHoverCoords(null));

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(containerRef.current);

    mapRef.current = map;
    markersLayerRef.current = markersLayer;
    setMapReady(true);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      draftMarkerRef.current = null;
    };
  }, []);

  // Render synced and queued observation markers whenever data changes
  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!mapReady || !L || !map || !layer) return;

    layer.clearLayers();
    markerByIdRef.current.clear();

    for (const obs of filteredObservations) {
      if (!Number.isFinite(obs.latitude) || !Number.isFinite(obs.longitude)) continue;

      const marker = L.circleMarker([obs.latitude, obs.longitude], {
        radius: 8,
        fillColor: '#0369a1',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.92,
      });

      marker.bindPopup(buildPopupHtml(obs, false), { maxWidth: 300 });
      marker.addTo(layer);
      markerByIdRef.current.set(obs.id, marker);
    }

    for (const item of queuedObservations) {
      const { payload } = item;
      if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) continue;
      const syntheticObs: Observation = {
        ...payload,
        id: item.localId,
        created_at: item.queuedAt,
        photo_url: item.pendingPhotoDataUrl,
      };
      const marker = L.circleMarker([payload.latitude, payload.longitude], {
        radius: 8,
        fillColor: '#d97706',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.92,
      });
      marker.bindPopup(buildPopupHtml(syntheticObs, true), { maxWidth: 300 });
      marker.addTo(layer);
      markerByIdRef.current.set(item.localId, marker);
    }
  }, [mapReady, filteredObservations, queuedObservations]);

  // Render/update draft coordinate marker
  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    if (!mapReady || !L || !map) return;

    if (
      draftLat !== null &&
      draftLng !== null &&
      Number.isFinite(draftLat) &&
      Number.isFinite(draftLng) &&
      draftLat >= -90 &&
      draftLat <= 90 &&
      draftLng >= -180 &&
      draftLng <= 180
    ) {
      if (!draftMarkerRef.current) {
        const icon = L.divIcon({
          className: 'frewa-draft-pin',
          html: `<div style="width:20px;height:20px;border-radius:9999px;background:rgba(14,165,233,0.22);border:2px solid #0284c7;display:flex;align-items:center;justify-content:center;transform:translate(-10px,-10px);"><div style="width:6px;height:6px;border-radius:9999px;background:#0284c7;"></div></div>`,
          iconSize: [0, 0],
        });
        draftMarkerRef.current = L.marker([draftLat, draftLng], { icon, interactive: false }).addTo(map);
      } else {
        draftMarkerRef.current.setLatLng([draftLat, draftLng]);
      }
    } else if (draftMarkerRef.current) {
      map.removeLayer(draftMarkerRef.current);
      draftMarkerRef.current = null;
    }
  }, [mapReady, draftLat, draftLng]);

  // Pan to focused observation when selected from log or just submitted
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !focusedObservationId) return;
    const marker = markerByIdRef.current.get(focusedObservationId);
    if (marker) {
      const latlng = marker.getLatLng();
      map.setView(latlng, Math.max(map.getZoom(), 11), { animate: true });
      marker.openPopup();
    }
  }, [mapReady, focusedObservationId, filteredObservations]);

  const handleFitAllPins = () => {
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map) return;

    const coords: [number, number][] = [];
    for (const obs of filteredObservations) {
      if (Number.isFinite(obs.latitude) && Number.isFinite(obs.longitude)) {
        coords.push([obs.latitude, obs.longitude]);
      }
    }
    for (const item of queuedObservations) {
      coords.push([item.payload.latitude, item.payload.longitude]);
    }

    if (coords.length === 0) {
      map.setView([25, 10], 2);
      return;
    }
    if (coords.length === 1) {
      map.setView(coords[0], 11);
      return;
    }
    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  };

  return (
    <section
      aria-label="Interactive observation map"
      className="rounded-xl border border-slate-200 bg-white overflow-hidden"
    >
      {/* Map controls toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Crosshair className="h-4 w-4 text-sky-700 shrink-0" aria-hidden="true" />
          <span className="font-medium text-slate-800">Field Map</span>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <span>Click map to set GPS coordinates</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search site..."
              aria-label="Search observations by site name"
              className="h-8 w-36 sm:w-44 rounded-md border border-slate-200 bg-white pl-8 pr-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter map pins by freshwater type"
            className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-sky-600 focus:outline-none"
          >
            <option value="ALL">All Types</option>
            {FRESHWATER_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleFitAllPins}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Fit Pins</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Leaflet canvas */}
      <div className="relative h-[420px] sm:h-[480px] w-full frewa-map-crosshair bg-slate-100">
        <div ref={containerRef} className="h-full w-full" />

        {/* Coordinate HUD */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-md border border-slate-200 bg-white/95 px-2.5 py-1.5 font-mono text-[11px] tabular-nums text-slate-700 shadow-sm">
          {hoverCoords ? (
            <span>
              Cursor: {hoverCoords.lat.toFixed(5)}, {hoverCoords.lng.toFixed(5)}
            </span>
          ) : draftLat !== null && draftLng !== null ? (
            <span>
              Selected: {draftLat.toFixed(5)}, {draftLng.toFixed(5)}
            </span>
          ) : (
            <span>Showing {filteredObservations.length} synced pins</span>
          )}
        </div>
      </div>
    </section>
  );
}
