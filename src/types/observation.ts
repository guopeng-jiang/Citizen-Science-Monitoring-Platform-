export const FRESHWATER_TYPES = [
  'River/Stream',
  'Lake/Pond',
  'Wetland/Marsh',
  'Canal',
  'Reservoir',
  'Other',
] as const;

export const LAND_USE_OPTIONS = [
  'Urban',
  'Agricultural',
  'Forest/Natural',
  'Industrial',
  'Recreational',
] as const;

export const BANK_VEGETATION_OPTIONS = [
  'None/Bare',
  'Sparse',
  'Moderate',
  'Dense',
] as const;

export const WATER_SURFACE_OPTIONS = [
  'Clear',
  'Scum/Foam',
  'Oil sheen',
  'Floating litter',
  'Algal bloom',
] as const;

export const POLLUTION_SOURCES_OPTIONS = [
  'Pipe discharge',
  'Agricultural runoff',
  'Urban runoff',
  'Litter/Dumping',
  'None visible',
] as const;

export const WATER_USES_OPTIONS = [
  'Drinking',
  'Fishing',
  'Swimming/Boating',
  'Irrigation',
  'Livestock',
  'Nature reserve',
  'Other',
] as const;

export const AQUATIC_LIFE_OPTIONS = [
  'Fish',
  'Amphibians',
  'Macroinvertebrates',
  'Water birds',
  'None observed',
] as const;

export const ALGAE_PRESENCE_OPTIONS = [
  'None',
  'Filaments/Strands',
  'Green scum/mat',
  'Brown/Diploid film',
] as const;

export const WATER_FLOW_OPTIONS = [
  'Stagnant/Still',
  'Slow',
  'Moderate',
  'Fast/Torrential',
] as const;

export const WATER_LEVEL_OPTIONS = [
  'Very low/Dry',
  'Lower than normal',
  'Normal',
  'High/Bankfull',
  'Flooding',
] as const;

export const WATER_COLOR_OPTIONS = [
  'Clear',
  'Brown/Peaty',
  'Green',
  'Milky/Turbid',
  'Dark/Stained',
] as const;

export type FreshwaterType = (typeof FRESHWATER_TYPES)[number];
export type LandUseOption = (typeof LAND_USE_OPTIONS)[number];
export type BankVegetation = (typeof BANK_VEGETATION_OPTIONS)[number];
export type WaterSurfaceOption = (typeof WATER_SURFACE_OPTIONS)[number];
export type PollutionSourceOption = (typeof POLLUTION_SOURCES_OPTIONS)[number];
export type WaterUseOption = (typeof WATER_USES_OPTIONS)[number];
export type AquaticLifeOption = (typeof AQUATIC_LIFE_OPTIONS)[number];
export type AlgaePresence = (typeof ALGAE_PRESENCE_OPTIONS)[number];
export type WaterFlow = (typeof WATER_FLOW_OPTIONS)[number];
export type WaterLevel = (typeof WATER_LEVEL_OPTIONS)[number];
export type WaterColor = (typeof WATER_COLOR_OPTIONS)[number];

export interface Observation {
  id: string;
  site_name: string;
  latitude: number;
  longitude: number;
  sample_date: string;
  sample_time: string | null;
  freshwater_type: FreshwaterType;
  land_use: LandUseOption[];
  bank_vegetation: BankVegetation;
  water_surface: WaterSurfaceOption[];
  pollution_sources: PollutionSourceOption[];
  water_uses: WaterUseOption[];
  water_uses_other: string | null;
  aquatic_life: AquaticLifeOption[];
  algae_presence: AlgaePresence;
  water_flow: WaterFlow;
  water_level: WaterLevel;
  nitrate_ppm: number | null;
  phosphate_ppm: number | null;
  secchi_depth_cm: number | null;
  water_color: WaterColor;
  participant_count: number;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
}

export type ObservationInsertPayload = Omit<Observation, 'id' | 'created_at'>;

export interface QueuedObservation {
  localId: string;
  queuedAt: string;
  payload: ObservationInsertPayload;
  pendingPhotoDataUrl: string | null;
  pendingPhotoExt: string | null;
}

// CDN globals loaded via index.html
declare global {
  interface Window {
    L: any;
    supabase: {
      createClient: (url: string, key: string) => any;
    };
  }
}
