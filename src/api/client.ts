import {
  CycloneScenario,
  ForecastResult,
  InfrastructureFeature,
  ScoredAsset,
  VulnerabilitySummary
} from '../types.js';

export async function fetchCyclones(): Promise<CycloneScenario[]> {
  const res = await fetch('/api/cyclones');
  if (!res.ok) throw new Error('Failed to fetch cyclone scenarios');
  return res.json();
}

export async function fetchForecast(params: {
  cycloneId?: string;
  lat?: number;
  lon?: number;
  forwardSpeedKmh?: number;
  headingDeg?: number;
  centralPressureHpa?: number;
  maxWindKmh?: number;
}): Promise<ForecastResult> {
  const res = await fetch('/api/cyclones/forecast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error('Failed to fetch forecast cone');
  return res.json();
}

export async function fetchInfrastructure(filter?: {
  type?: string;
  district?: string;
}): Promise<InfrastructureFeature[]> {
  const query = new URLSearchParams();
  if (filter?.type && filter.type !== 'all') query.set('type', filter.type);
  if (filter?.district && filter.district !== 'All') query.set('district', filter.district);

  const res = await fetch(`/api/infrastructure?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch infrastructure features');
  const data = await res.json();
  return data.features || [];
}

export async function addInfrastructurePlace(
  place: Partial<InfrastructureFeature>
): Promise<{ status: string; feature: InfrastructureFeature; totalFeatures: number }> {
  const res = await fetch('/api/infrastructure', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(place)
  });
  if (!res.ok) throw new Error('Failed to add infrastructure place');
  return res.json();
}

export async function scoreVulnerability(payload: {
  cycloneId?: string;
  customParams?: {
    lat: number;
    lon: number;
    forwardSpeedKmh: number;
    headingDeg: number;
    centralPressureHpa: number;
    maxWindKmh: number;
  };
  district?: string;
}): Promise<{
  cycloneName: string;
  totalScored: number;
  summary: VulnerabilitySummary;
  assets: ScoredAsset[];
}> {
  const res = await fetch('/api/vulnerability/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to score vulnerability');
  return res.json();
}

export async function fetchVulnerabilitySummary(
  cycloneId: string,
  district?: string
): Promise<VulnerabilitySummary> {
  const query = new URLSearchParams({ cycloneId });
  if (district && district !== 'All') query.set('district', district);

  const res = await fetch(`/api/vulnerability/summary?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch vulnerability summary');
  return res.json();
}

export async function generateAiBriefing(payload: {
  cycloneName: string;
  summary: VulnerabilitySummary;
  topAssets: ScoredAsset[];
}): Promise<{ briefing: string; source: string }> {
  const res = await fetch('/api/ai-briefing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to generate AI briefing');
  return res.json();
}

export async function sendChatMessage(payload: {
  messages: Array<{ role: 'user' | 'model'; text: string }>;
  taskType?: 'general' | 'complex' | 'fast';
  contextData?: {
    cycloneName?: string;
    landfallRegion?: string;
    criticalAssetsCount?: number;
    highAssetsCount?: number;
  };
}): Promise<{ text: string; modelUsed: string }> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to send chat message');
  return res.json();
}

export async function fetchSearchGrounding(payload: {
  query?: string;
  cycloneName?: string;
}): Promise<{
  text: string;
  sources: Array<{ title: string; url: string }>;
  model: string;
  groundingType: 'search';
}> {
  const res = await fetch('/api/grounding/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to fetch search grounding');
  return res.json();
}

export async function fetchMapsGrounding(payload: {
  query?: string;
  lat?: number;
  lon?: number;
}): Promise<{
  text: string;
  sources: Array<{ title: string; url: string }>;
  model: string;
  groundingType: 'maps';
}> {
  const res = await fetch('/api/grounding/maps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to fetch maps grounding');
  return res.json();
}

export async function fetchLiveWeatherOverlay(lat?: number, lon?: number): Promise<{
  source: string;
  timestamp: string;
  data: Array<{
    lat: number;
    lon: number;
    precipitationMm: number;
    windSpeedKmh: number;
    windDirectionDeg: number;
    surfacePressureHpa: number;
    stationName: string;
  }>;
}> {
  const query = new URLSearchParams();
  if (lat !== undefined) query.set('lat', lat.toString());
  if (lon !== undefined) query.set('lon', lon.toString());

  const res = await fetch(`/api/weather/live-overlay?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch live weather overlay');
  return res.json();
}


