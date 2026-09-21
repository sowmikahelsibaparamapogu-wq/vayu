export type RiskTier = 'low' | 'medium' | 'high' | 'critical';

export type InfrastructureType = 
  | 'hospital' 
  | 'power_substation' 
  | 'cyclone_shelter' 
  | 'road_lifeline' 
  | 'telecom_tower' 
  | 'water_facility';

export interface StormTrackPoint {
  timeOffsetHours: number;
  label: string;
  lat: number;
  lon: number;
  maxWindKmh: number;
  centralPressureHpa: number;
  category: string;
  radiusKm: number;
}

export interface CycloneScenario {
  id: string;
  name: string;
  basin: string;
  season: string;
  category: string;
  landfallRegion: string;
  current: {
    lat: number;
    lon: number;
    maxWindKmh: number;
    centralPressureHpa: number;
    forwardSpeedKmh: number;
    headingDeg: number;
    radiusMaxWindKm: number;
    gustsKmh: number;
    timestamp: string;
  };
  track: StormTrackPoint[];
  description: string;
  affectedDistricts: string[];
}

export interface ForecastConeGeometry {
  type: 'Polygon';
  coordinates: number[][][]; // [ [ [lon, lat], ... ] ]
}

export interface ForecastResult {
  cycloneId?: string;
  cycloneName?: string;
  coneGeometry: ForecastConeGeometry;
  trackPoints: StormTrackPoint[];
  swatheRadiusKm: number[];
  landfallEstimate?: {
    estimatedTimeHours: number;
    estimatedLat: number;
    estimatedLon: number;
    locationName: string;
  };
}

export interface InfrastructureFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  properties: {
    id: string;
    name: string;
    type: InfrastructureType;
    district: string;
    state: string;
    elevation_m: number;
    dist_to_coast_km: number;
    capacity: string;
    backup_power: boolean;
    backup_hours: number;
    structure_type: string;
    age_years: number;
    population_served: number;
    critical_notes: string;
    flood_barrier: boolean;
  };
}

export interface ScoredAsset extends InfrastructureFeature {
  score: {
    vulnerabilityScore: number; // 0 - 100
    riskTier: RiskTier;
    hazardExposure: number; // 0 - 100
    assetCriticality: number; // 0 - 100
    structuralFragility: number; // 0 - 100
    estimatedWindSpeedKmh: number;
    minDistToTrackKm: number;
    stormSurgeRiskMeters: number;
    inundationProbabilityPercent: number;
    primaryVulnerabilityDrivers: string[];
    recommendedActions: string[];
    priorityRank: number;
  };
}

export interface VulnerabilitySummary {
  totalAssets: number;
  tierCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  typeCounts: Record<InfrastructureType, { total: number; critical: number; high: number }>;
  estimatedPopulationAtRisk: number;
  district: string;
  topCriticalAssets: ScoredAsset[];
  cycloneId: string;
  cycloneName: string;
  generatedAt: string;
}

export type ChatRole = 'user' | 'model';

export interface GroundingSource {
  title: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  timestamp: string;
  modelUsed?: string;
  groundingType?: 'search' | 'maps' | 'none';
  sources?: GroundingSource[];
}

export interface OperationalBookmark {
  id: string;
  userId: string;
  assetId: string;
  assetName: string;
  cycloneName: string;
  riskTier: string;
  notes?: string;
  createdAt: string;
}

export interface IncidentDirective {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  cycloneName: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DISPATCHED' | 'RESOLVED';
  details: string;
  createdAt: string;
}

export interface WeatherOverlayPoint {
  lat: number;
  lon: number;
  precipitationMm: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  surfacePressureHpa: number;
  stationName: string;
}


