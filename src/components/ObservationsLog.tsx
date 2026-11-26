import { AlertCircle, MapPin, RefreshCw, Trash2, WifiOff } from 'lucide-react';
import type { Observation, QueuedObservation } from '../types/observation';

interface ObservationsLogProps {
  observations: Observation[];
  queuedObservations: QueuedObservation[];
  isLoading: boolean;
  loadError: string | null;
  isOnline: boolean;
  isSyncing: boolean;
  onSelectObservation: (id: string) => void;
  onSyncQueue: () => void;
  onRemoveQueued: (localId: string) => void;
  onRetryLoad: () => void;
}

export function ObservationsLog({
  observations,
  queuedObservations,
  isLoading,
  loadError,
  isOnline,
  isSyncing,
  onSelectObservation,
  onSyncQueue,
  onRemoveQueued,
  onRetryLoad,
}: ObservationsLogProps) {
  return (
    <section
      aria-label="Recorded observations log"
      className="rounded-xl border border-slate-200 bg-white overflow-hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Recent Observations</h2>
          <p className="text-xs text-slate-500">
            Select any sample row to inspect its location and metrics on the map
          </p>
        </div>
        {queuedObservations.length > 0 && isOnline && (
          <button
            type="button"
            onClick={onSyncQueue}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-100 disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{isSyncing ? 'Syncing...' : `Sync ${queuedObservations.length} Pending`}</span>
          </button>
        )}
      </div>

      {queuedObservations.length > 0 && (
        <div className="border-b border-amber-200 bg-amber-50/70 px-4 py-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
            <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Queued Offline Submissions ({queuedObservations.length})</span>
          </div>
          <div className="space-y-1.5">
            {queuedObservations.map((item) => (
              <div
                key={item.localId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-white px-3 py-2 text-xs"
              >
                <button
                  type="button"
                  onClick={() => onSelectObservation(item.localId)}
                  className="text-left hover:underline cursor-pointer"
                >
                  <span className="font-semibold text-slate-900">{item.payload.site_name}</span>
                  <span className="mx-1.5 text-slate-300">·</span>
                  <span className="font-mono tabular-nums text-slate-600">
                    {item.payload.sample_date}
                  </span>
                  <span className="mx-1.5 text-slate-300">·</span>
                  <span className="text-amber-800 font-medium">Pending Sync</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveQueued(item.localId)}
                  aria-label={`Discard queued observation for ${item.payload.site_name}`}
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-rose-700 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Discard</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loadError && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={onRetryLoad}
            className="rounded-md border border-rose-200 bg-white px-2.5 py-1 font-medium text-rose-800 hover:bg-rose-100 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading && observations.length === 0 ? (
        <div className="divide-y divide-slate-100 px-4 py-2">
          {[0, 1, 2].map((idx) => (
            <div key={idx} className="flex items-center justify-between py-3 animate-pulse">
              <div className="space-y-1.5">
                <div className="h-4 w-44 rounded bg-slate-200" />
                <div className="h-3 w-64 rounded bg-slate-100" />
              </div>
              <div className="h-4 w-24 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : observations.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">No observations recorded yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Click anywhere on the map or use Current Location to submit the first water sample.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-500">
                <th className="px-4 py-2.5 font-medium">Site &amp; Type</th>
                <th className="px-3 py-2.5 font-medium">Date</th>
                <th className="px-3 py-2.5 font-medium">Coordinates</th>
                <th className="px-3 py-2.5 font-medium text-right">NO3</th>
                <th className="px-3 py-2.5 font-medium text-right">PO4</th>
                <th className="px-4 py-2.5 font-medium text-right">Secchi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {observations.map((obs) => (
                <tr
                  key={obs.id}
                  onClick={() => onSelectObservation(obs.id)}
                  className="transition-colors hover:bg-sky-50/50 cursor-pointer"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      {obs.photo_url ? (
                        <img
                          src={obs.photo_url}
                          alt={`Thumbnail for ${obs.site_name}`}
                          referrerPolicy="no-referrer"
                          className="h-8 w-10 rounded object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <span
                          className="flex h-8 w-10 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-400 shrink-0"
                          aria-hidden="true"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate max-w-[200px]">
                          {obs.site_name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {obs.freshwater_type} · {obs.water_color} · {obs.water_flow}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                    {obs.sample_date}
                  </td>
                  <td className="px-3 py-2.5 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                    {obs.latitude.toFixed(4)}, {obs.longitude.toFixed(4)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                    {obs.nitrate_ppm !== null && obs.nitrate_ppm !== undefined
                      ? `${obs.nitrate_ppm} ppm`
                      : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                    {obs.phosphate_ppm !== null && obs.phosphate_ppm !== undefined
                      ? `${obs.phosphate_ppm} ppm`
                      : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                    {obs.secchi_depth_cm !== null && obs.secchi_depth_cm !== undefined
                      ? `${obs.secchi_depth_cm} cm`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
