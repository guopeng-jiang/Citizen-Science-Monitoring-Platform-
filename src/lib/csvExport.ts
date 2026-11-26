import type { Observation } from '../types/observation';

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = Array.isArray(value) ? value.join('; ') : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

const CSV_COLUMNS: { key: keyof Observation; label: string }[] = [
  { key: 'id', label: 'id' },
  { key: 'site_name', label: 'site_name' },
  { key: 'latitude', label: 'latitude' },
  { key: 'longitude', label: 'longitude' },
  { key: 'sample_date', label: 'sample_date' },
  { key: 'sample_time', label: 'sample_time' },
  { key: 'freshwater_type', label: 'freshwater_type' },
  { key: 'land_use', label: 'land_use' },
  { key: 'bank_vegetation', label: 'bank_vegetation' },
  { key: 'water_surface', label: 'water_surface' },
  { key: 'pollution_sources', label: 'pollution_sources' },
  { key: 'water_uses', label: 'water_uses' },
  { key: 'water_uses_other', label: 'water_uses_other' },
  { key: 'aquatic_life', label: 'aquatic_life' },
  { key: 'algae_presence', label: 'algae_presence' },
  { key: 'water_flow', label: 'water_flow' },
  { key: 'water_level', label: 'water_level' },
  { key: 'nitrate_ppm', label: 'nitrate_ppm' },
  { key: 'phosphate_ppm', label: 'phosphate_ppm' },
  { key: 'secchi_depth_cm', label: 'secchi_depth_cm' },
  { key: 'water_color', label: 'water_color' },
  { key: 'participant_count', label: 'participant_count' },
  { key: 'notes', label: 'notes' },
  { key: 'photo_url', label: 'photo_url' },
  { key: 'created_at', label: 'created_at' },
];

export function exportObservationsToCsv(observations: Observation[]): void {
  const header = CSV_COLUMNS.map((col) => escapeCsvCell(col.label)).join(',');
  const rows = observations.map((obs) =>
    CSV_COLUMNS.map((col) => escapeCsvCell(obs[col.key])).join(','),
  );

  const csvContent = `\uFEFF${[header, ...rows].join('\r\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const today = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.href = url;
  link.download = `frewa-observations-${today}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
