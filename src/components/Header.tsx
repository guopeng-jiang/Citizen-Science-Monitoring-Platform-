import { Download, RefreshCw, WifiOff, Droplets } from 'lucide-react';

interface HeaderProps {
  totalObservations: number;
  uniqueSites: number;
  totalParticipants: number;
  isOnline: boolean;
  queuedCount: number;
  isSyncing: boolean;
  onSyncQueue: () => void;
  onExportCsv: () => void;
}

export function Header({
  totalObservations,
  uniqueSites,
  totalParticipants,
  isOnline,
  queuedCount,
  isSyncing,
  onSyncQueue,
  onExportCsv,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Zone 1: Brand wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-700 text-white"
            aria-hidden="true"
          >
            <Droplets className="h-4 w-4" />
          </span>
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            FreWA - Freshwater Observation Hub
          </h1>
        </div>

        {/* Zone 2: Summary counters & real offline/sync status */}
        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-600">
          <div className="flex items-center gap-2.5 font-mono tabular-nums">
            <span>
              <strong className="font-semibold text-slate-900">{totalObservations}</strong>{' '}
              {totalObservations === 1 ? 'Observation' : 'Observations'}
            </span>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <span>
              <strong className="font-semibold text-slate-900">{uniqueSites}</strong>{' '}
              {uniqueSites === 1 ? 'Site' : 'Sites'}
            </span>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <span>
              <strong className="font-semibold text-slate-900">{totalParticipants}</strong>{' '}
              {totalParticipants === 1 ? 'Participant' : 'Participants'}
            </span>
          </div>

          {!isOnline && (
            <div
              role="status"
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 whitespace-nowrap shrink-0"
            >
              <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                Offline{queuedCount > 0 ? ` · ${queuedCount} queued` : ''}
              </span>
            </div>
          )}

          {isOnline && queuedCount > 0 && (
            <button
              type="button"
              onClick={onSyncQueue}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800 transition-colors hover:bg-sky-100 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>
                {isSyncing ? 'Syncing queue...' : `Sync ${queuedCount} queued`}
              </span>
            </button>
          )}
        </div>

        {/* Zone 3: Primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onExportCsv}
            disabled={totalObservations === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2 text-xs sm:text-sm font-medium text-white transition-colors hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>
    </header>
  );
}
