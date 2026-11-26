import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  LocateFixed,
  Trash2,
} from 'lucide-react';
import {
  ALGAE_PRESENCE_OPTIONS,
  AQUATIC_LIFE_OPTIONS,
  BANK_VEGETATION_OPTIONS,
  FRESHWATER_TYPES,
  LAND_USE_OPTIONS,
  POLLUTION_SOURCES_OPTIONS,
  WATER_COLOR_OPTIONS,
  WATER_FLOW_OPTIONS,
  WATER_LEVEL_OPTIONS,
  WATER_SURFACE_OPTIONS,
  WATER_USES_OPTIONS,
  type AlgaePresence,
  type AquaticLifeOption,
  type BankVegetation,
  type FreshwaterType,
  type LandUseOption,
  type ObservationInsertPayload,
  type PollutionSourceOption,
  type WaterColor,
  type WaterFlow,
  type WaterLevel,
  type WaterSurfaceOption,
  type WaterUseOption,
} from '../types/observation';
import { formatBytes, resizeImageUnder1MB, type ResizedImageResult } from '../lib/imageResize';

interface ObservationFormProps {
  selectedLat: number | null;
  selectedLng: number | null;
  isOnline: boolean;
  isSubmitting: boolean;
  onCoordinatesChange: (lat: number | null, lng: number | null) => void;
  onSubmitObservation: (
    payload: ObservationInsertPayload,
    resizedPhoto: ResizedImageResult | null,
  ) => Promise<void>;
}

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toggleArrayValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function ObservationForm({
  selectedLat,
  selectedLng,
  isOnline,
  isSubmitting,
  onCoordinatesChange,
  onSubmitObservation,
}: ObservationFormProps) {
  const [siteName, setSiteName] = useState('');
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [sampleDate, setSampleDate] = useState(getTodayDateString);
  const [sampleTime, setSampleTime] = useState('');
  const [participantCount, setParticipantCount] = useState('1');

  const [freshwaterType, setFreshwaterType] = useState<FreshwaterType>('River/Stream');
  const [landUse, setLandUse] = useState<LandUseOption[]>([]);
  const [bankVegetation, setBankVegetation] = useState<BankVegetation>('Moderate');
  const [waterUses, setWaterUses] = useState<WaterUseOption[]>([]);
  const [waterUsesOther, setWaterUsesOther] = useState('');

  const [waterFlow, setWaterFlow] = useState<WaterFlow>('Moderate');
  const [waterLevel, setWaterLevel] = useState<WaterLevel>('Normal');
  const [waterColor, setWaterColor] = useState<WaterColor>('Clear');
  const [waterSurface, setWaterSurface] = useState<WaterSurfaceOption[]>(['Clear']);
  const [algaePresence, setAlgaePresence] = useState<AlgaePresence>('None');

  const [nitratePpm, setNitratePpm] = useState('');
  const [phosphatePpm, setPhosphatePpm] = useState('');
  const [secchiDepthCm, setSecchiDepthCm] = useState('');

  const [aquaticLife, setAquaticLife] = useState<AquaticLifeOption[]>([]);
  const [pollutionSources, setPollutionSources] = useState<PollutionSourceOption[]>(['None visible']);
  const [notes, setNotes] = useState('');

  const [resizedPhoto, setResizedPhoto] = useState<ResizedImageResult | null>(null);
  const [isResizingPhoto, setIsResizingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [isLocating, setIsLocating] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Sync map-clicked coordinates into inputs
  useEffect(() => {
    if (selectedLat !== null && Number.isFinite(selectedLat)) {
      setLatInput(selectedLat.toFixed(6));
    }
    if (selectedLng !== null && Number.isFinite(selectedLng)) {
      setLngInput(selectedLng.toFixed(6));
    }
  }, [selectedLat, selectedLng]);

  const handleLatChange = (val: string) => {
    setLatInput(val);
    const parsed = Number(val);
    const lngParsed = Number(lngInput);
    if (val.trim() !== '' && Number.isFinite(parsed) && lngInput.trim() !== '' && Number.isFinite(lngParsed)) {
      onCoordinatesChange(parsed, lngParsed);
    } else if (val.trim() === '' && lngInput.trim() === '') {
      onCoordinatesChange(null, null);
    }
  };

  const handleLngChange = (val: string) => {
    setLngInput(val);
    const parsed = Number(val);
    const latParsed = Number(latInput);
    if (val.trim() !== '' && Number.isFinite(parsed) && latInput.trim() !== '' && Number.isFinite(latParsed)) {
      onCoordinatesChange(latParsed, parsed);
    } else if (val.trim() === '' && latInput.trim() === '') {
      onCoordinatesChange(null, null);
    }
  };

  const handleUseCurrentLocation = () => {
    setGeoMessage(null);
    setValidationError(null);
    if (!navigator.geolocation) {
      setGeoMessage('Geolocation is not supported by this browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setLatInput(lat.toFixed(6));
        setLngInput(lng.toFixed(6));
        onCoordinatesChange(lat, lng);
        setGeoMessage(`Location locked (±${Math.round(position.coords.accuracy)} m)`);
        setIsLocating(false);
      },
      (err) => {
        setGeoMessage(err.message || 'Unable to retrieve your current GPS coordinates.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPhotoError(null);
    if (!file) return;

    setIsResizingPhoto(true);
    try {
      const result = await resizeImageUnder1MB(file);
      setResizedPhoto(result);
    } catch (err: any) {
      setPhotoError(err?.message || 'Could not process selected photo.');
      setResizedPhoto(null);
    } finally {
      setIsResizingPhoto(false);
      e.target.value = '';
    }
  };

  const resetForm = () => {
    setSiteName('');
    setSampleDate(getTodayDateString());
    setSampleTime('');
    setParticipantCount('1');
    setLandUse([]);
    setWaterUses([]);
    setWaterUsesOther('');
    setWaterSurface(['Clear']);
    setAlgaePresence('None');
    setNitratePpm('');
    setPhosphatePpm('');
    setSecchiDepthCm('');
    setAquaticLife([]);
    setPollutionSources(['None visible']);
    setNotes('');
    setResizedPhoto(null);
    setPhotoError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSubmitSuccess(null);

    const trimmedSite = siteName.trim();
    if (!trimmedSite) {
      setValidationError('Site name is required.');
      return;
    }

    const lat = Number(latInput);
    const lng = Number(lngInput);
    if (latInput.trim() === '' || !Number.isFinite(lat) || lat < -90 || lat > 90) {
      setValidationError('Latitude must be a valid number between -90 and 90.');
      return;
    }
    if (lngInput.trim() === '' || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      setValidationError('Longitude must be a valid number between -180 and 180.');
      return;
    }

    if (!sampleDate) {
      setValidationError('Sample date is required.');
      return;
    }

    const participants = Number(participantCount);
    if (!Number.isInteger(participants) || participants < 1) {
      setValidationError('Participant count must be a whole number of at least 1.');
      return;
    }

    let nitrateVal: number | null = null;
    if (nitratePpm.trim() !== '') {
      nitrateVal = Number(nitratePpm);
      if (!Number.isFinite(nitrateVal) || nitrateVal < 0 || nitrateVal > 100) {
        setValidationError('Nitrate must be between 0 and 100 ppm.');
        return;
      }
    }

    let phosphateVal: number | null = null;
    if (phosphatePpm.trim() !== '') {
      phosphateVal = Number(phosphatePpm);
      if (!Number.isFinite(phosphateVal) || phosphateVal < 0 || phosphateVal > 10) {
        setValidationError('Phosphate must be between 0 and 10 ppm.');
        return;
      }
    }

    let secchiVal: number | null = null;
    if (secchiDepthCm.trim() !== '') {
      secchiVal = Number(secchiDepthCm);
      if (!Number.isFinite(secchiVal) || secchiVal < 0 || secchiVal > 500) {
        setValidationError('Secchi depth must be between 0 and 500 cm.');
        return;
      }
    }

    const payload: ObservationInsertPayload = {
      site_name: trimmedSite,
      latitude: lat,
      longitude: lng,
      sample_date: sampleDate,
      sample_time: sampleTime ? sampleTime : null,
      freshwater_type: freshwaterType,
      land_use: landUse,
      bank_vegetation: bankVegetation,
      water_surface: waterSurface,
      pollution_sources: pollutionSources,
      water_uses: waterUses,
      water_uses_other: waterUses.includes('Other') && waterUsesOther.trim() ? waterUsesOther.trim() : null,
      aquatic_life: aquaticLife,
      algae_presence: algaePresence,
      water_flow: waterFlow,
      water_level: waterLevel,
      nitrate_ppm: nitrateVal,
      phosphate_ppm: phosphateVal,
      secchi_depth_cm: secchiVal,
      water_color: waterColor,
      participant_count: participants,
      notes: notes.trim() ? notes.trim() : null,
      photo_url: null,
    };

    try {
      await onSubmitObservation(payload, resizedPhoto);
      resetForm();
      setSubmitSuccess(
        isOnline
          ? 'Observation saved to Supabase and plotted on the map.'
          : 'Offline mode: observation queued locally and will sync when online.',
      );
    } catch (err: any) {
      setValidationError(err?.message || 'Failed to submit observation.');
    }
  };

  return (
    <section
      aria-label="Scientific observation form"
      className="rounded-xl border border-slate-200 bg-white"
    >
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">Record Field Observation</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          20-parameter citizen science freshwater monitoring protocol
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="divide-y divide-slate-200">
        {/* Group 1: Site & Geospatial Coordinates */}
        <div className="space-y-4 px-5 py-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-slate-700">
              01. Site &amp; Coordinates
            </h3>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-100 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isLocating ? 'Locating...' : 'Use Current Location'}</span>
            </button>
          </div>

          {geoMessage && (
            <p className="text-xs text-slate-600 font-mono">{geoMessage}</p>
          )}

          <div>
            <label htmlFor="site_name" className="block text-xs font-medium text-slate-700">
              Site Name <span className="text-rose-600">*</span>
            </label>
            <input
              id="site_name"
              type="text"
              required
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="e.g. Cedar Creek Bridge North"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="latitude" className="block text-xs font-medium text-slate-700">
                Latitude (-90 to 90) <span className="text-rose-600">*</span>
              </label>
              <input
                id="latitude"
                type="number"
                step="any"
                min={-90}
                max={90}
                required
                value={latInput}
                onChange={(e) => handleLatChange(e.target.value)}
                placeholder="Click map or enter"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="longitude" className="block text-xs font-medium text-slate-700">
                Longitude (-180 to 180) <span className="text-rose-600">*</span>
              </label>
              <input
                id="longitude"
                type="number"
                step="any"
                min={-180}
                max={180}
                required
                value={lngInput}
                onChange={(e) => handleLngChange(e.target.value)}
                placeholder="Click map or enter"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="sample_date" className="block text-xs font-medium text-slate-700">
                Sample Date <span className="text-rose-600">*</span>
              </label>
              <input
                id="sample_date"
                type="date"
                required
                value={sampleDate}
                onChange={(e) => setSampleDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-mono text-xs sm:text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="sample_time" className="block text-xs font-medium text-slate-700">
                Sample Time
              </label>
              <input
                id="sample_time"
                type="time"
                value={sampleTime}
                onChange={(e) => setSampleTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-mono text-xs sm:text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="participant_count" className="block text-xs font-medium text-slate-700">
                Participants <span className="text-rose-600">*</span>
              </label>
              <input
                id="participant_count"
                type="number"
                min={1}
                step={1}
                required
                value={participantCount}
                onChange={(e) => setParticipantCount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-sky-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Group 2: Habitat, Land Use & Water Uses */}
        <div className="space-y-4 px-5 py-5">
          <h3 className="text-xs font-semibold tracking-wide text-slate-700">
            02. Habitat &amp; Surrounding Context
          </h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="freshwater_type" className="block text-xs font-medium text-slate-700">
                Freshwater Type
              </label>
              <select
                id="freshwater_type"
                value={freshwaterType}
                onChange={(e) => setFreshwaterType(e.target.value as FreshwaterType)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
              >
                {FRESHWATER_TYPES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="bank_vegetation" className="block text-xs font-medium text-slate-700">
                Bank Vegetation
              </label>
              <select
                id="bank_vegetation"
                value={bankVegetation}
                onChange={(e) => setBankVegetation(e.target.value as BankVegetation)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
              >
                {BANK_VEGETATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset>
            <legend className="text-xs font-medium text-slate-700">Surrounding Land Use</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {LAND_USE_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={landUse.includes(opt)}
                    onChange={() => setLandUse((prev) => toggleArrayValue(prev, opt))}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-medium text-slate-700">Human Water Uses</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {WATER_USES_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={waterUses.includes(opt)}
                    onChange={() => setWaterUses((prev) => toggleArrayValue(prev, opt))}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
            {waterUses.includes('Other') && (
              <div className="mt-2">
                <label htmlFor="water_uses_other" className="block text-xs font-medium text-slate-600">
                  Specify Other Water Use
                </label>
                <input
                  id="water_uses_other"
                  type="text"
                  value={waterUsesOther}
                  onChange={(e) => setWaterUsesOther(e.target.value)}
                  placeholder="Describe other water use..."
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-sky-600 focus:outline-none"
                />
              </div>
            )}
          </fieldset>
        </div>

        {/* Group 3: Hydrology & Visual Surface */}
        <div className="space-y-4 px-5 py-5">
          <h3 className="text-xs font-semibold tracking-wide text-slate-700">
            03. Hydrology &amp; Surface Assessment
          </h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="water_flow" className="block text-xs font-medium text-slate-700">
                Water Flow
              </label>
              <select
                id="water_flow"
                value={waterFlow}
                onChange={(e) => setWaterFlow(e.target.value as WaterFlow)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
              >
                {WATER_FLOW_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="water_level" className="block text-xs font-medium text-slate-700">
                Water Level
              </label>
              <select
                id="water_level"
                value={waterLevel}
                onChange={(e) => setWaterLevel(e.target.value as WaterLevel)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
              >
                {WATER_LEVEL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="water_color" className="block text-xs font-medium text-slate-700">
                Water Color
              </label>
              <select
                id="water_color"
                value={waterColor}
                onChange={(e) => setWaterColor(e.target.value as WaterColor)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
              >
                {WATER_COLOR_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="algae_presence" className="block text-xs font-medium text-slate-700">
                Algae Presence
              </label>
              <select
                id="algae_presence"
                value={algaePresence}
                onChange={(e) => setAlgaePresence(e.target.value as AlgaePresence)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
              >
                {ALGAE_PRESENCE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset>
            <legend className="text-xs font-medium text-slate-700">Water Surface Condition</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {WATER_SURFACE_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={waterSurface.includes(opt)}
                    onChange={() => setWaterSurface((prev) => toggleArrayValue(prev, opt))}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Group 4: Water Chemistry & Clarity */}
        <div className="space-y-4 px-5 py-5">
          <h3 className="text-xs font-semibold tracking-wide text-slate-700">
            04. Water Chemistry &amp; Optical Clarity
          </h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="nitrate_ppm" className="block text-xs font-medium text-slate-700">
                Nitrate (0–100 ppm)
              </label>
              <div className="relative mt-1">
                <input
                  id="nitrate_ppm"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={nitratePpm}
                  onChange={(e) => setNitratePpm(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-10 font-mono text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[11px] text-slate-400">
                  ppm
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="phosphate_ppm" className="block text-xs font-medium text-slate-700">
                Phosphate (0–10 ppm)
              </label>
              <div className="relative mt-1">
                <input
                  id="phosphate_ppm"
                  type="number"
                  step="0.01"
                  min={0}
                  max={10}
                  value={phosphatePpm}
                  onChange={(e) => setPhosphatePpm(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-10 font-mono text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[11px] text-slate-400">
                  ppm
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="secchi_depth_cm" className="block text-xs font-medium text-slate-700">
                Secchi Depth (0–500 cm)
              </label>
              <div className="relative mt-1">
                <input
                  id="secchi_depth_cm"
                  type="number"
                  step="0.1"
                  min={0}
                  max={500}
                  value={secchiDepthCm}
                  onChange={(e) => setSecchiDepthCm(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 font-mono text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[11px] text-slate-400">
                  cm
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Group 5: Ecology, Pollution, Photo & Notes */}
        <div className="space-y-4 px-5 py-5">
          <h3 className="text-xs font-semibold tracking-wide text-slate-700">
            05. Ecology, Pollution &amp; Field Photo
          </h3>

          <fieldset>
            <legend className="text-xs font-medium text-slate-700">Aquatic Life Observed</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {AQUATIC_LIFE_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={aquaticLife.includes(opt)}
                    onChange={() => setAquaticLife((prev) => toggleArrayValue(prev, opt))}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-medium text-slate-700">Visible Pollution Sources</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {POLLUTION_SOURCES_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={pollutionSources.includes(opt)}
                    onChange={() => setPollutionSources((prev) => toggleArrayValue(prev, opt))}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="observation_photo" className="block text-xs font-medium text-slate-700">
              Site Photo (auto-resized under 1 MB)
            </label>
            <div className="mt-1.5 flex items-center gap-3">
              <label
                htmlFor="observation_photo"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <Camera className="h-4 w-4 text-slate-500" aria-hidden="true" />
                <span>{isResizingPhoto ? 'Resizing...' : resizedPhoto ? 'Replace Photo' : 'Choose Photo'}</span>
                <input
                  id="observation_photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  disabled={isResizingPhoto}
                  className="sr-only"
                />
              </label>

              {resizedPhoto && (
                <button
                  type="button"
                  onClick={() => setResizedPhoto(null)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-rose-700 hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            {photoError && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-700">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{photoError}</span>
              </p>
            )}

            {resizedPhoto && (
              <div className="mt-2.5 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
                <img
                  src={resizedPhoto.previewDataUrl}
                  alt="Resized field sample preview"
                  referrerPolicy="no-referrer"
                  className="h-14 w-20 rounded object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0 text-xs text-slate-600">
                  <div className="font-medium text-slate-800">Ready for upload</div>
                  <div className="font-mono text-[11px] tabular-nums">
                    {formatBytes(resizedPhoto.originalBytes)} → {formatBytes(resizedPhoto.resizedBytes)} ·{' '}
                    {resizedPhoto.width}×{resizedPhoto.height}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="notes" className="block text-xs font-medium text-slate-700">
              Field Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Weather, odor, wildlife behavior, or sampling context..."
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Validation, status & submit footer */}
        <div className="space-y-3 bg-slate-50/70 px-5 py-4">
          {validationError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
              <span>{validationError}</span>
            </div>
          )}

          {submitSuccess && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
              <span>{submitSuccess}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isResizingPhoto}
            className="w-full rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting
              ? isOnline
                ? 'Saving Observation...'
                : 'Queueing Locally...'
              : isOnline
                ? 'Submit Observation'
                : 'Save Offline to Queue'}
          </button>
        </div>
      </form>
    </section>
  );
}
