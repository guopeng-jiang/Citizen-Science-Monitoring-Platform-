import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Header } from './components/Header';
import { ObservationMap } from './components/ObservationMap';
import { ObservationForm } from './components/ObservationForm';
import { ObservationsLog } from './components/ObservationsLog';
import { exportObservationsToCsv } from './lib/csvExport';
import { dataUrlToBlob, type ResizedImageResult } from './lib/imageResize';
import {
  enqueueOfflineObservation,
  loadOfflineQueue,
  removeOfflineObservation,
} from './lib/offlineQueue';
import {
  fetchObservations,
  insertObservation,
  uploadObservationPhoto,
} from './lib/supabaseClient';
import type {
  Observation,
  ObservationInsertPayload,
  QueuedObservation,
} from './types/observation';

function isLikelyNetworkError(err: unknown): boolean {
  if (!navigator.onLine) return true;
  const msg = String((err as any)?.message || err || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed')
  );
}

export default function App() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [queuedObservations, setQueuedObservations] = useState<QueuedObservation[]>(() =>
    loadOfflineQueue(),
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [focusedObservationId, setFocusedObservationId] = useState<string | null>(null);

  const isSyncingRef = useRef(false);

  const loadData = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const rows = await fetchObservations();
      setObservations(rows);
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to load observations from Supabase.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncOfflineQueue = useCallback(async () => {
    if (isSyncingRef.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const currentQueue = loadOfflineQueue();
    if (currentQueue.length === 0) return;

    isSyncingRef.current = true;
    setIsSyncing(true);
    setSyncNotice(null);

    let syncedCount = 0;
    try {
      // Sync oldest first
      const chronological = [...currentQueue].reverse();
      for (const item of chronological) {
        let photoUrl = item.payload.photo_url;
        if (!photoUrl && item.pendingPhotoDataUrl) {
          const blob = dataUrlToBlob(item.pendingPhotoDataUrl);
          photoUrl = await uploadObservationPhoto(blob, item.pendingPhotoExt || 'jpg');
        }

        const inserted = await insertObservation({
          ...item.payload,
          photo_url: photoUrl,
        });

        const updatedQueue = removeOfflineObservation(item.localId);
        setQueuedObservations(updatedQueue);
        setObservations((prev) => [inserted, ...prev.filter((o) => o.id !== inserted.id)]);
        syncedCount += 1;
      }

      if (syncedCount > 0) {
        setSyncNotice(
          `Synced ${syncedCount} offline ${syncedCount === 1 ? 'observation' : 'observations'} to Supabase.`,
        );
      }
    } catch (err: any) {
      setSyncNotice(
        err?.message
          ? `Sync paused: ${err.message}`
          : 'Could not sync all offline observations yet.',
      );
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  // Initial fetch and automatic queue sync if online
  useEffect(() => {
    void loadData();
    if (typeof navigator === 'undefined' || navigator.onLine) {
      void syncOfflineQueue();
    }
  }, [loadData, syncOfflineQueue]);

  // Listen to browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void loadData();
      void syncOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadData, syncOfflineQueue]);

  const handleSubmitObservation = async (
    payload: ObservationInsertPayload,
    resizedPhoto: ResizedImageResult | null,
  ) => {
    setIsSubmitting(true);
    setSyncNotice(null);

    const queueLocally = () => {
      const localId = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const queuedItem: QueuedObservation = {
        localId,
        queuedAt: new Date().toISOString(),
        payload,
        pendingPhotoDataUrl: resizedPhoto ? resizedPhoto.previewDataUrl : null,
        pendingPhotoExt: resizedPhoto ? resizedPhoto.extension : null,
      };
      const updated = enqueueOfflineObservation(queuedItem);
      setQueuedObservations(updated);
      setFocusedObservationId(localId);
    };

    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        queueLocally();
        return;
      }

      let photoUrl: string | null = null;
      if (resizedPhoto) {
        photoUrl = await uploadObservationPhoto(resizedPhoto.blob, resizedPhoto.extension);
      }

      const inserted = await insertObservation({
        ...payload,
        photo_url: photoUrl,
      });

      setObservations((prev) => [inserted, ...prev.filter((o) => o.id !== inserted.id)]);
      setFocusedObservationId(inserted.id);
    } catch (err) {
      if (isLikelyNetworkError(err)) {
        queueLocally();
        return;
      }
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveQueued = (localId: string) => {
    const next = removeOfflineObservation(localId);
    setQueuedObservations(next);
  };

  const summary = useMemo(() => {
    const sites = new Set<string>();
    let participants = 0;

    for (const obs of observations) {
      sites.add(obs.site_name.trim().toLowerCase());
      participants += Number(obs.participant_count) || 1;
    }

    return {
      totalObservations: observations.length,
      uniqueSites: sites.size,
      totalParticipants: participants,
    };
  }, [observations]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header
        totalObservations={summary.totalObservations}
        uniqueSites={summary.uniqueSites}
        totalParticipants={summary.totalParticipants}
        isOnline={isOnline}
        queuedCount={queuedObservations.length}
        isSyncing={isSyncing}
        onSyncQueue={() => void syncOfflineQueue()}
        onExportCsv={() => exportObservationsToCsv(observations)}
      />

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
        {syncNotice && (
          <div
            role="status"
            className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs text-sky-900"
          >
            <span>{syncNotice}</span>
            <button
              type="button"
              onClick={() => setSyncNotice(null)}
              className="font-medium text-sky-800 hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Left / Main Viewport Stage: Map + Field Log */}
          <div className="space-y-6 lg:col-span-7">
            <ObservationMap
              observations={observations}
              queuedObservations={queuedObservations}
              draftLat={selectedLat}
              draftLng={selectedLng}
              focusedObservationId={focusedObservationId}
              isLoading={isLoading}
              onSelectCoordinates={(lat, lng) => {
                setSelectedLat(lat);
                setSelectedLng(lng);
              }}
              onRefresh={() => void loadData()}
            />

            <ObservationsLog
              observations={observations}
              queuedObservations={queuedObservations}
              isLoading={isLoading}
              loadError={loadError}
              isOnline={isOnline}
              isSyncing={isSyncing}
              onSelectObservation={(id) => setFocusedObservationId(id)}
              onSyncQueue={() => void syncOfflineQueue()}
              onRemoveQueued={handleRemoveQueued}
              onRetryLoad={() => void loadData()}
            />
          </div>

          {/* Right Column: 20-Parameter Scientific Observation Form */}
          <div className="lg:col-span-5">
            <ObservationForm
              selectedLat={selectedLat}
              selectedLng={selectedLng}
              isOnline={isOnline}
              isSubmitting={isSubmitting}
              onCoordinatesChange={(lat, lng) => {
                setSelectedLat(lat);
                setSelectedLng(lng);
              }}
              onSubmitObservation={handleSubmitObservation}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
