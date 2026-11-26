import type { Observation, ObservationInsertPayload } from '../types/observation';

export const SUPABASE_URL = 'https://sikrudzhwswucavwibyr.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpa3J1ZHpod3N3dWNhdndpYnlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzODA1MjUsImV4cCI6MjExMDk1NjUyNX0.y2J2n6g3xjvHrtUhjkFy9F6KXtAasoqfJyTYoJH6kLc';
export const OBSERVATION_PHOTOS_BUCKET = 'observation-photos';

let cachedClient: any = null;

export function getSupabaseClient() {
  if (cachedClient) return cachedClient;
  if (typeof window === 'undefined' || !window.supabase?.createClient) {
    throw new Error('Supabase JS v2 client library is not available.');
  }
  cachedClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cachedClient;
}

export async function fetchObservations(): Promise<Observation[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('observations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to fetch observations from Supabase.');
  }

  return (data ?? []) as Observation[];
}

export async function uploadObservationPhoto(blob: Blob, extension = 'jpg'): Promise<string> {
  const client = getSupabaseClient();
  const safeExt = extension.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg';
  const uniqueId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  const filePath = `samples/${Date.now()}-${uniqueId}.${safeExt}`;

  const { error: uploadError } = await client.storage
    .from(OBSERVATION_PHOTOS_BUCKET)
    .upload(filePath, blob, {
      contentType: blob.type || 'image/jpeg',
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || 'Failed to upload photo to Supabase Storage.');
  }

  const { data } = client.storage.from(OBSERVATION_PHOTOS_BUCKET).getPublicUrl(filePath);
  if (!data?.publicUrl) {
    throw new Error('Could not resolve public URL for uploaded photo.');
  }

  return data.publicUrl;
}

export async function insertObservation(payload: ObservationInsertPayload): Promise<Observation> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('observations')
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to save observation.');
  }

  return data as Observation;
}
