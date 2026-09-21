import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import * as d3 from 'd3';
import {
  ScoredAsset,
  StormTrackPoint,
  ForecastResult,
  RiskTier,
  InfrastructureType,
  WeatherOverlayPoint,
  InfrastructureFeature
} from '../types.js';
import { fetchLiveWeatherOverlay } from '../api/client.js';
import {
  Compass,
  Maximize2,
  Eye,
  EyeOff,
  Layers,
  ShieldAlert,
  Building2,
  Zap,
  Home,
  Navigation,
  Radio,
  Droplet,
  CloudRain,
  Wind,
  Loader2,
  RefreshCw,
  RotateCcw,
  Plus,
  Search,
  MapPin,
  X,
  CheckCircle2,
  PackagePlus,
  Crosshair,
  Sparkles,
  Flame
} from 'lucide-react';

interface MapViewProps {
  forecast: ForecastResult | null;
  assets: ScoredAsset[];
  selectedAsset: ScoredAsset | null;
  onSelectAsset: (asset: ScoredAsset) => void;
  showCone: boolean;
  setShowCone: (val: boolean) => void;
  showTrack: boolean;
  setShowTrack: (val: boolean) => void;
  onAddPlace?: (place: Partial<InfrastructureFeature>) => Promise<void>;
}

// Color mapping for Risk Tiers
const TIER_COLORS: Record<RiskTier, { bg: string; border: string; text: string; hex: string }> = {
  critical: { bg: 'bg-rose-500', border: 'border-rose-600', text: 'text-white', hex: '#EF4444' },
  high: { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-white', hex: '#F97316' },
  medium: { bg: 'bg-amber-400', border: 'border-amber-500', text: 'text-slate-900', hex: '#EAB308' },
  low: { bg: 'bg-teal-500', border: 'border-teal-600', text: 'text-white', hex: '#14B8A6' }
};

// SVG Icons for different asset types to be rendered inside Leaflet DivIcons
function getAssetSvgIcon(type: InfrastructureType): string {
  switch (type) {
    case 'hospital':
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 6v12"/><path d="M6 12h12"/></svg>`;
    case 'power_substation':
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
    case 'cyclone_shelter':
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
    case 'road_lifeline':
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`;
    case 'telecom_tower':
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>`;
    case 'water_facility':
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`;
  }
}

export const MapView: React.FC<MapViewProps> = ({
  forecast,
  assets,
  selectedAsset,
  onSelectAsset,
  showCone,
  setShowCone,
  showTrack,
  setShowTrack,
  onAddPlace
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer groups for dynamic toggling & updates
  const coneLayerRef = useRef<L.LayerGroup | null>(null);
  const trackLayerRef = useRef<L.LayerGroup | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const eyeLayerRef = useRef<L.LayerGroup | null>(null);
  const weatherOverlayLayerRef = useRef<L.LayerGroup | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const baseLabelLayerRef = useRef<L.TileLayer | null>(null);

  // Basemap style: 'osm' (OpenStreetMap) | 'gray' (Clean Canvas) | 'topo' (Topography)
  // 100% Free & Open - Zero API keys or watermarks required
  const [basemap, setBasemap] = useState<'osm' | 'gray' | 'topo'>('osm');

  // Live weather overlay state (Open-Meteo API)
  const [showWeatherOverlay, setShowWeatherOverlay] = useState<boolean>(true);
  const [weatherMode, setWeatherMode] = useState<'both' | 'radar' | 'wind'>('both');
  const [weatherData, setWeatherData] = useState<WeatherOverlayPoint[]>([]);
  const [weatherSource, setWeatherSource] = useState<string>('Open-Meteo API');
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);

  // D3 Heatmap Overlay State: visually interpolates asset vulnerability scores using point density & KDE
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [heatmapMode, setHeatmapMode] = useState<'both' | 'contours' | 'density'>('both');

  // Place Search & Quick Navigation
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Add Place States
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isPickingLocation, setIsPickingLocation] = useState<boolean>(false);
  const isPickingRef = useRef<boolean>(false);
  const [activeAddTab, setActiveAddTab] = useState<'single' | 'batch'>('single');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  // Single Place Form Fields
  const [formName, setFormName] = useState<string>('');
  const [formType, setFormType] = useState<InfrastructureType>('hospital');
  const [formDistrict, setFormDistrict] = useState<string>('Puri');
  const [formState, setFormState] = useState<string>('Odisha');
  const [formLat, setFormLat] = useState<number>(19.82);
  const [formLon, setFormLon] = useState<number>(85.83);
  const [formElevation, setFormElevation] = useState<number>(5.0);
  const [formDistCoast, setFormDistCoast] = useState<number>(2.0);
  const [formCapacity, setFormCapacity] = useState<string>('120 beds, Emergency triage');
  const [formPopulation, setFormPopulation] = useState<number>(75000);
  const [formBackupPower, setFormBackupPower] = useState<boolean>(true);
  const [formBackupHours, setFormBackupHours] = useState<number>(24);
  const [formFloodBarrier, setFormFloodBarrier] = useState<boolean>(false);
  const [formNotes, setFormNotes] = useState<string>('Rapidly deployable disaster response station');

  // Keep isPickingRef in sync and update map cursor
  useEffect(() => {
    isPickingRef.current = isPickingLocation;
    if (mapContainerRef.current) {
      mapContainerRef.current.style.cursor = isPickingLocation ? 'crosshair' : '';
    }
  }, [isPickingLocation]);

  // Pre-fill presets for fast additions
  const applyPreset = (presetKey: string) => {
    switch (presetKey) {
      case 'clinic':
        setFormName('Coastal Primary Health Center (PHC)');
        setFormType('hospital');
        setFormCapacity('60 beds, Trauma stabilization, Oxygen manifold');
        setFormElevation(4.0);
        setFormDistCoast(1.5);
        setFormPopulation(85000);
        setFormBackupPower(true);
        setFormBackupHours(36);
        setFormFloodBarrier(false);
        setFormNotes('First-line coastal triage post vulnerable to storm surge inundation.');
        break;
      case 'shelter':
        setFormName('Multi-Purpose Coastal Cyclone Haven');
        setFormType('cyclone_shelter');
        setFormCapacity('2,500 evacuees, Stilted ground cattle ramp, Rooftop solar');
        setFormElevation(6.5);
        setFormDistCoast(1.2);
        setFormPopulation(16000);
        setFormBackupPower(true);
        setFormBackupHours(72);
        setFormFloodBarrier(true);
        setFormNotes('Reinforced concrete stilted haven with autonomous freshwater cistern.');
        break;
      case 'power':
        setFormName('Coastal 132/33kV Feeder Grid Substation');
        setFormType('power_substation');
        setFormCapacity('150 MVA, Powers municipal hospitals and pumping stations');
        setFormElevation(3.5);
        setFormDistCoast(2.8);
        setFormPopulation(320000);
        setFormBackupPower(false);
        setFormBackupHours(0);
        setFormFloodBarrier(false);
        setFormNotes('High risk of conductor galloping and insulator flashover in 180+ km/h gales.');
        break;
      case 'water':
        setFormName('Emergency Potable Desalination & Booster Station');
        setFormType('water_facility');
        setFormCapacity('20 MLD filtration & automated booster pump');
        setFormElevation(2.8);
        setFormDistCoast(0.8);
        setFormPopulation(140000);
        setFormBackupPower(true);
        setFormBackupHours(48);
        setFormFloodBarrier(true);
        setFormNotes('Vital drinking water lifeline preventing cholera outbreaks post-cyclone.');
        break;
      case 'road':
        setFormName('Coastal Evacuation Lifeline Causeway & Bridge');
        setFormType('road_lifeline');
        setFormCapacity('4-lane reinforced pre-stressed evacuation artery');
        setFormElevation(3.2);
        setFormDistCoast(0.5);
        setFormPopulation(500000);
        setFormBackupPower(false);
        setFormBackupHours(0);
        setFormFloodBarrier(true);
        setFormNotes('Primary high-volume evacuation route towards inland elevated ground.');
        break;
      case 'telecom':
        setFormName('Coastal Early Warning Radar & Microwave Repeater');
        setFormType('telecom_tower');
        setFormCapacity('100m guyed lattice mast, VHF maritime distress relay');
        setFormElevation(8.0);
        setFormDistCoast(0.6);
        setFormPopulation(250000);
        setFormBackupPower(true);
        setFormBackupHours(96);
        setFormFloodBarrier(false);
        setFormNotes('Transmits automated siren alarms to frontline fishing hamlets.');
        break;
    }
  };

  // Submit Single Place
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setIsSubmitting(true);
    setSubmitMessage(null);
    try {
      const newPlace: Partial<InfrastructureFeature> = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [formLon, formLat]
        },
        properties: {
          id: `place-${Date.now()}`,
          name: formName.trim(),
          type: formType,
          district: formDistrict,
          state: formState,
          elevation_m: Number(formElevation),
          dist_to_coast_km: Number(formDistCoast),
          capacity: formCapacity,
          backup_power: formBackupPower,
          backup_hours: Number(formBackupHours),
          structure_type: 'Reinforced Concrete Modern Specification',
          age_years: 4,
          population_served: Number(formPopulation),
          critical_notes: formNotes,
          flood_barrier: formFloodBarrier
        }
      };

      if (onAddPlace) {
        await onAddPlace(newPlace);
      }
      setSubmitMessage(`Successfully added "${formName}" to map!`);
      setTimeout(() => {
        setIsAddModalOpen(false);
        setSubmitMessage(null);
        setFormName('');
      }, 1200);
    } catch (err: any) {
      setSubmitMessage(`Failed to add place: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Deploy Coordinated Multi-Place Emergency Packs
  const handleDeployBatchPack = async (packId: 'odisha-south' | 'delta-estuary' | 'andhra-north') => {
    setIsSubmitting(true);
    setSubmitMessage(null);
    try {
      let placesToDeploy: Partial<InfrastructureFeature>[] = [];

      if (packId === 'odisha-south') {
        placesToDeploy = [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [84.992, 19.332] },
            properties: {
              id: `batch-os-1-${Date.now()}`,
              name: 'Gopalpur Coastal Mobile Trauma Field Station',
              type: 'hospital',
              district: 'Ganjam',
              state: 'Odisha',
              elevation_m: 4.8,
              dist_to_coast_km: 1.1,
              capacity: '80 beds, Emergency triage tent',
              backup_power: true,
              backup_hours: 48,
              structure_type: 'Prefab Modular Elevated Hospital',
              age_years: 2,
              population_served: 95000,
              critical_notes: 'Rapid deployment triage station set up ahead of landfall.',
              flood_barrier: true
            }
          },
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [84.882, 19.214] },
            properties: {
              id: `batch-os-2-${Date.now()}`,
              name: 'Sonapur Beach Coastal Cyclone Haven (ODRRP-28)',
              type: 'cyclone_shelter',
              district: 'Ganjam',
              state: 'Odisha',
              elevation_m: 6.2,
              dist_to_coast_km: 0.8,
              capacity: '2,200 evacuees with solar desalinator',
              backup_power: true,
              backup_hours: 72,
              structure_type: 'Reinforced Concrete Anti-Surge Haven',
              age_years: 6,
              population_served: 15000,
              critical_notes: 'Engineered stilted sanctuary with livestock ground bay.',
              flood_barrier: true
            }
          },
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [84.935, 19.345] },
            properties: {
              id: `batch-os-3-${Date.now()}`,
              name: 'Chatrapur Coastal Corridor 132kV Transmission Node',
              type: 'power_substation',
              district: 'Ganjam',
              state: 'Odisha',
              elevation_m: 12.0,
              dist_to_coast_km: 4.2,
              capacity: '120 MVA, Feeds emergency hospital and police radios',
              backup_power: true,
              backup_hours: 36,
              structure_type: 'Heavy Outdoor Switchyard with Guyed Towers',
              age_years: 15,
              population_served: 280000,
              critical_notes: 'Priority power feed for emergency coordination headquarters.',
              flood_barrier: true
            }
          }
        ];
      } else if (packId === 'delta-estuary') {
        placesToDeploy = [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [86.892, 20.842] },
            properties: {
              id: `batch-de-1-${Date.now()}`,
              name: 'Dhamra Port Maritime First Aid & Medical Depot',
              type: 'hospital',
              district: 'Bhadrak',
              state: 'Odisha',
              elevation_m: 3.8,
              dist_to_coast_km: 1.0,
              capacity: '75 beds, Sea ambulance docking ramp',
              backup_power: true,
              backup_hours: 48,
              structure_type: 'RCC Frame - Coastal Spec',
              age_years: 5,
              population_served: 80000,
              critical_notes: 'Handles casualties evacuated from offshore barges and fishing fleet.',
              flood_barrier: true
            }
          },
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [86.792, 20.724] },
            properties: {
              id: `batch-de-2-${Date.now()}`,
              name: 'Baitarani Estuary High-Capacity Haven',
              type: 'cyclone_shelter',
              district: 'Bhadrak',
              state: 'Odisha',
              elevation_m: 5.5,
              dist_to_coast_km: 2.5,
              capacity: '3,000 evacuees, Emergency radio mast',
              backup_power: true,
              backup_hours: 60,
              structure_type: 'Stilted Anti-Surge Concrete Haven',
              age_years: 8,
              population_served: 20000,
              critical_notes: 'Vital shelter for low-lying agrarian islands vulnerable to river breaches.',
              flood_barrier: true
            }
          },
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [86.814, 20.762] },
            properties: {
              id: `batch-de-3-${Date.now()}`,
              name: 'Chandbali Estuarine Water Pumping & Sluice Gate',
              type: 'water_facility',
              district: 'Bhadrak',
              state: 'Odisha',
              elevation_m: 3.1,
              dist_to_coast_km: 3.8,
              capacity: '80 cusecs automated drainage and booster station',
              backup_power: true,
              backup_hours: 36,
              structure_type: 'Reinforced Hydraulic Sluice Complex',
              age_years: 11,
              population_served: 110000,
              critical_notes: 'Prevents saline storm surge backwaters from drowning inland paddy fields.',
              flood_barrier: true
            }
          }
        ];
      } else {
        placesToDeploy = [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [83.352, 17.785] },
            properties: {
              id: `batch-an-1-${Date.now()}`,
              name: 'Rushikonda Coastal Emergency Medical Cell',
              type: 'hospital',
              district: 'Visakhapatnam',
              state: 'Andhra Pradesh',
              elevation_m: 18.0,
              dist_to_coast_km: 0.8,
              capacity: '100 beds, Coastal trauma triage',
              backup_power: true,
              backup_hours: 48,
              structure_type: 'RCC Frame - Hillside Anchored',
              age_years: 6,
              population_served: 140000,
              critical_notes: 'Elevated hillside hospital safe from surge, exposed to gale wind gusts.',
              flood_barrier: true
            }
          },
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [83.412, 17.842] },
            properties: {
              id: `batch-an-2-${Date.now()}`,
              name: 'Thotlakonda Beach Community Cyclone Haven',
              type: 'cyclone_shelter',
              district: 'Visakhapatnam',
              state: 'Andhra Pradesh',
              elevation_m: 7.0,
              dist_to_coast_km: 0.9,
              capacity: '2,000 evacuees, Emergency kitchen',
              backup_power: true,
              backup_hours: 48,
              structure_type: 'Stilted Anti-Surge Haven',
              age_years: 9,
              population_served: 14000,
              critical_notes: 'Primary sanctuary for artisanal fishing hamlets north of Vizag city.',
              flood_barrier: true
            }
          },
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [83.312, 17.765] },
            properties: {
              id: `batch-an-3-${Date.now()}`,
              name: 'Visakhapatnam Coastal Microwave Repeater Mast',
              type: 'telecom_tower',
              district: 'Visakhapatnam',
              state: 'Andhra Pradesh',
              elevation_m: 45.0,
              dist_to_coast_km: 0.7,
              capacity: '80m hardened tower, Maritime distress frequency transceiver',
              backup_power: true,
              backup_hours: 72,
              structure_type: 'Heavy Steel Lattice Mast',
              age_years: 14,
              population_served: 400000,
              critical_notes: 'Maintains radio connectivity if terrestrial fiber links sever.',
              flood_barrier: true
            }
          }
        ];
      }

      if (onAddPlace) {
        for (const p of placesToDeploy) {
          await onAddPlace(p);
        }
      }
      setSubmitMessage(`Successfully deployed ${placesToDeploy.length} coordinated places!`);
      setTimeout(() => {
        setIsAddModalOpen(false);
        setSubmitMessage(null);
      }, 1400);
    } catch (err: any) {
      setSubmitMessage(`Failed to deploy pack: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered assets for Search
  const filteredSearchAssets = searchQuery.trim() === ''
    ? assets.slice(0, 10)
    : assets.filter((a) => {
        const q = searchQuery.toLowerCase();
        return (
          a.properties.name.toLowerCase().includes(q) ||
          a.properties.district.toLowerCase().includes(q) ||
          a.properties.type.toLowerCase().includes(q)
        );
      });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Create Leaflet map container
      const map = L.map(mapContainerRef.current, {
        center: [19.5, 85.5],
        zoom: 7,
        zoomControl: false,
        attributionControl: false
      });

      // Attribution in bottom right corner
      L.control
        .attribution({ position: 'bottomright', prefix: 'Vayu • OpenStreetMap • Open-Meteo' })
        .addTo(map);

      // Zoom control in top right corner
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Initialize layer groups
      coneLayerRef.current = L.layerGroup().addTo(map);
      trackLayerRef.current = L.layerGroup().addTo(map);
      markerLayerRef.current = L.layerGroup().addTo(map);
      eyeLayerRef.current = L.layerGroup().addTo(map);
      weatherOverlayLayerRef.current = L.layerGroup().addTo(map);

      // Map click handler for interactive location picking
      map.on('click', (e: L.LeafletMouseEvent) => {
        if (isPickingRef.current) {
          const lat = Number(e.latlng.lat.toFixed(4));
          const lon = Number(e.latlng.lng.toFixed(4));
          setFormLat(lat);
          setFormLon(lon);
          setIsPickingLocation(false);
          isPickingRef.current = false;
          setIsAddModalOpen(true);
        }
      });

      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update base tile layer without any API key requirements
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing tile layer(s)
    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
      baseTileLayerRef.current = null;
    }
    if (baseLabelLayerRef.current) {
      map.removeLayer(baseLabelLayerRef.current);
      baseLabelLayerRef.current = null;
    }

    if (basemap === 'osm') {
      // OpenStreetMap: 100% Free & Open Source, No API key needed
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: 'abc',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
      });
      osmLayer.addTo(map);
      baseTileLayerRef.current = osmLayer;
    } else if (basemap === 'gray') {
      // Esri Light Gray Canvas: Crisp neutral basemap, No API key needed
      const grayBase = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 16,
          attribution: 'Tiles &copy; Esri'
        }
      );
      const grayRef = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 16
        }
      );
      grayBase.addTo(map);
      grayRef.addTo(map);
      baseTileLayerRef.current = grayBase;
      baseLabelLayerRef.current = grayRef;
    } else if (basemap === 'topo') {
      // Esri Topo Map: Coastal contours & bathymetry, No API key needed
      const topoLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 18,
          attribution: 'Tiles &copy; Esri'
        }
      );
      topoLayer.addTo(map);
      baseTileLayerRef.current = topoLayer;
    }
  }, [basemap]);

  // Fetch Open-Meteo live weather data on mount or scenario change
  useEffect(() => {
    async function loadWeather() {
      try {
        setWeatherLoading(true);
        const centerLat = forecast?.trackPoints?.[0]?.lat ?? 19.8;
        const centerLon = forecast?.trackPoints?.[0]?.lon ?? 85.8;
        const res = await fetchLiveWeatherOverlay(centerLat, centerLon);
        setWeatherData(res.data || []);
        setWeatherSource(res.source || 'Open-Meteo API');
      } catch (err) {
        console.warn('Weather overlay fetch error:', err);
      } finally {
        setWeatherLoading(false);
      }
    }
    loadWeather();
  }, [forecast?.cycloneName]);

  // Render Weather Overlay (Precipitation Radar Swathes + Wind Vector Arrows)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const weatherGroup = weatherOverlayLayerRef.current;
    if (!map || !weatherGroup) return;

    weatherGroup.clearLayers();

    if (!showWeatherOverlay || weatherData.length === 0) return;

    weatherData.forEach((station) => {
      // 1. Radar Precipitation Heat Halo (if mode is 'both' or 'radar')
      if (weatherMode === 'both' || weatherMode === 'radar') {
        // Color scale for precipitation: light blue (<5mm), cyan (5-15mm), orange (15-30mm), red/purple (>30mm)
        let radarColor = '#38BDF8'; // Sky blue
        let radarOpacity = 0.35;
        let radiusMeters = 24000;

        if (station.precipitationMm > 30) {
          radarColor = '#DC2626'; // Intense heavy convective band
          radarOpacity = 0.45;
          radiusMeters = 38000;
        } else if (station.precipitationMm > 15) {
          radarColor = '#EA580C'; // High rain
          radarOpacity = 0.40;
          radiusMeters = 32000;
        } else if (station.precipitationMm > 5) {
          radarColor = '#0284C7'; // Moderate rain
          radarOpacity = 0.35;
          radiusMeters = 28000;
        }

        const radarCircle = L.circle([station.lat, station.lon], {
          radius: radiusMeters,
          color: radarColor,
          weight: 1.5,
          fillColor: radarColor,
          fillOpacity: radarOpacity,
          dashArray: '3, 6'
        });

        radarCircle.bindTooltip(
          `<div class="p-1 font-sans text-xs">
            <strong class="text-sky-900">${station.stationName}</strong><br/>
            <span class="text-slate-600">Live Radar Precip:</span> <strong class="text-blue-600">${station.precipitationMm} mm/h</strong><br/>
            <span class="text-slate-600">Surface Pressure:</span> ${station.surfacePressureHpa} hPa
          </div>`,
          { sticky: true }
        );

        weatherGroup.addLayer(radarCircle);
      }

      // 2. Dynamic Wind Vector Overlay with Arrow Rotation (if mode is 'both' or 'wind')
      if (weatherMode === 'both' || weatherMode === 'wind') {
        const windColor = station.windSpeedKmh > 100 ? '#E11D48' : station.windSpeedKmh > 65 ? '#D97706' : '#0B5FA5';
        const windIcon = L.divIcon({
          className: 'wind-vector-divicon',
          html: `
            <div class="flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
              <div class="flex items-center justify-center w-7 h-7 rounded-full bg-white/90 shadow-md border border-slate-200 backdrop-blur-xs" style="transform: rotate(${station.windDirectionDeg}deg);">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${windColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"></line>
                  <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
              </div>
              <span class="text-[9px] font-black px-1 rounded bg-slate-900/80 text-white shadow-2xs mt-0.5 whitespace-nowrap">
                ${station.windSpeedKmh}k
              </span>
            </div>
          `,
          iconSize: [30, 36],
          iconAnchor: [15, 18]
        });

        const windMarker = L.marker([station.lat, station.lon], { icon: windIcon, zIndexOffset: 200 });
        windMarker.bindTooltip(
          `<div class="p-1 font-sans text-xs">
            <strong class="text-[#0B5FA5]">${station.stationName}</strong><br/>
            <span>Live Wind Vector: <strong class="text-rose-600">${station.windSpeedKmh} km/h</strong> @ ${station.windDirectionDeg}°</span><br/>
            <span>Barometer: ${station.surfacePressureHpa} hPa</span>
          </div>`,
          { direction: 'top', offset: [0, -14] }
        );

        weatherGroup.addLayer(windMarker);
      }
    });
  }, [weatherData, showWeatherOverlay, weatherMode]);

  // Update Forecast Cone
  useEffect(() => {
    const map = mapInstanceRef.current;
    const coneGroup = coneLayerRef.current;
    if (!map || !coneGroup) return;

    coneGroup.clearLayers();

    if (showCone && forecast?.coneGeometry) {
      // Coordinates in GeoJSON: [lon, lat] -> Leaflet: [lat, lon]
      const rings = forecast.coneGeometry.coordinates.map((ring) =>
        ring.map(([lon, lat]) => [lat, lon] as [number, number])
      );

      const conePolygon = L.polygon(rings, {
        color: '#0B5FA5',
        weight: 2,
        dashArray: '5, 5',
        fillColor: '#3FA9E0',
        fillOpacity: 0.16
      });

      conePolygon.bindTooltip(
        `<div class="p-1 font-sans text-xs">
          <strong class="text-sky-900">72-Hour Forecast Uncertainty Cone</strong><br/>
          <span class="text-slate-600">IMD Radius of Maximum Winds Expansion</span>
        </div>`,
        { sticky: true }
      );

      coneGroup.addLayer(conePolygon);
    }
  }, [forecast, showCone]);

  // Update Storm Track & Center Eye
  useEffect(() => {
    const map = mapInstanceRef.current;
    const trackGroup = trackLayerRef.current;
    const eyeGroup = eyeLayerRef.current;
    if (!map || !trackGroup || !eyeGroup || !forecast) return;

    trackGroup.clearLayers();
    eyeGroup.clearLayers();

    if (forecast.trackPoints && forecast.trackPoints.length > 0) {
      const latLngs = forecast.trackPoints.map((p) => [p.lat, p.lon] as [number, number]);

      if (showTrack) {
        // Track Polyline
        const trackLine = L.polyline(latLngs, {
          color: '#0C4A8A',
          weight: 3.5,
          opacity: 0.85,
          lineCap: 'round',
          lineJoin: 'round'
        });
        trackGroup.addLayer(trackLine);

        // Milestone markers (+0h, +12h, +24h, +48h, +72h)
        forecast.trackPoints.forEach((pt, idx) => {
          const isCurrent = idx === 0;
          const milestoneIcon = L.divIcon({
            className: 'custom-milestone-marker',
            html: `
              <div class="flex items-center justify-center w-6 h-6 rounded-full border-2 ${
                isCurrent
                  ? 'bg-rose-600 border-white text-white font-black shadow-md ring-2 ring-rose-300'
                  : 'bg-white border-[#0B5FA5] text-[#0B5FA5] font-bold text-[10px] shadow-sm'
              }">
                ${isCurrent ? '●' : `+${pt.timeOffsetHours}h`}
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          const marker = L.marker([pt.lat, pt.lon], { icon: milestoneIcon });
          marker.bindPopup(`
            <div class="p-2 font-sans text-xs space-y-1">
              <div class="font-bold text-[#0B5FA5] text-sm">${pt.label}</div>
              <div class="text-slate-600"><span class="font-semibold">Category:</span> ${pt.category}</div>
              <div class="text-slate-600"><span class="font-semibold">Max Winds:</span> <strong class="text-rose-600">${pt.maxWindKmh} km/h</strong></div>
              <div class="text-slate-600"><span class="font-semibold">Central Pressure:</span> ${pt.centralPressureHpa} hPa</div>
              <div class="text-slate-500 text-[10px] mt-1">Uncertainty Radius: ±${pt.radiusKm} km</div>
            </div>
          `);
          trackGroup.addLayer(marker);
        });
      }

      // Eye of Cyclone Pulsing Animation at Current Storm Center (T-0h)
      const currentPt = forecast.trackPoints[0];
      if (currentPt) {
        const eyeIcon = L.divIcon({
          className: 'storm-eye-divicon',
          html: `
            <div class="relative flex items-center justify-center w-10 h-10">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60"></span>
              <span class="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 text-white shadow-lg border-2 border-white">
                <svg class="w-4 h-4 animate-[spin_4s_linear_infinite]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M12 2C6.48 2 2 6.48 2 12c0 3.87 2.2 7.23 5.42 8.92" />
                  <path d="M12 22c5.52 0 10-4.48 10-10 0-3.87-2.2-7.23-5.42-8.92" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                </svg>
              </span>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        const eyeMarker = L.marker([currentPt.lat, currentPt.lon], { icon: eyeIcon, zIndexOffset: 1000 });
        eyeMarker.bindTooltip(
          `<div class="p-1 font-sans text-xs">
            <strong class="text-rose-600">Eye of Cyclone (${currentPt.maxWindKmh} km/h)</strong><br/>
            ${forecast.cycloneName}
          </div>`,
          { permanent: false, direction: 'top', offset: [0, -18] }
        );
        eyeGroup.addLayer(eyeMarker);
      }
    }
  }, [forecast, showTrack]);

  // Update Infrastructure Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markerGroup = markerLayerRef.current;
    if (!map || !markerGroup) return;

    markerGroup.clearLayers();

    assets.forEach((asset) => {
      const [lon, lat] = asset.geometry.coordinates;
      const isSelected = selectedAsset?.id === asset.id;
      const tier = asset.score.riskTier;
      const color = TIER_COLORS[tier];
      const svgIcon = getAssetSvgIcon(asset.properties.type);

      const markerHtml = `
        <div class="relative group cursor-pointer transition-transform duration-200 ${
          isSelected ? 'scale-125 z-50' : 'hover:scale-115'
        }">
          <div class="flex items-center justify-center w-7 h-7 rounded-xl ${color.bg} ${color.text} shadow-md border-2 ${
            isSelected ? 'border-sky-900 ring-4 ring-sky-300' : 'border-white'
          }">
            ${svgIcon}
          </div>
          ${
            tier === 'critical'
              ? `<span class="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                   <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                   <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                 </span>`
              : ''
          }
          <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-black px-1 rounded-md bg-white/95 text-slate-800 border border-slate-200 shadow-xs whitespace-nowrap">
            ${asset.score.vulnerabilityScore}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: `infra-marker-${asset.id}`,
        html: markerHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([lat, lon], { icon: customIcon });

      marker.on('click', () => {
        onSelectAsset(asset);
      });

      // Hover Tooltip
      marker.bindTooltip(
        `
        <div class="p-1.5 font-sans text-xs space-y-0.5">
          <div class="font-bold text-slate-900">${asset.properties.name}</div>
          <div class="text-slate-600 flex items-center justify-between gap-3">
            <span>Type: <strong class="capitalize">${asset.properties.type.replace('_', ' ')}</strong></span>
            <span class="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${color.bg} ${color.text}">${tier}</span>
          </div>
          <div class="text-slate-500 text-[10px]">
            Vulnerability Index: <strong class="text-[#0B5FA5]">${asset.score.vulnerabilityScore}/100</strong> • Dist to track: ${asset.score.minDistToTrackKm}km
          </div>
        </div>
      `,
        { direction: 'top', offset: [0, -14] }
      );

      markerGroup.addLayer(marker);
    });
  }, [assets, selectedAsset, onSelectAsset]);

  // Render D3 Heatmap Overlay Layer (Visual interpolation of vulnerability scores by point density)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!showHeatmap) {
      const existingCanvas = map.getPanes().overlayPane.querySelector('.d3-vulnerability-heatmap-canvas');
      if (existingCanvas && existingCanvas.parentNode) {
        existingCanvas.parentNode.removeChild(existingCanvas);
      }
      return;
    }

    const overlayPane = map.getPanes().overlayPane;
    const canvas = document.createElement('canvas');
    canvas.className = 'd3-vulnerability-heatmap-canvas';
    canvas.style.position = 'absolute';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '350';
    canvas.style.opacity = '0.78';
    overlayPane.appendChild(canvas);

    // Color interpolator for vulnerability density
    const d3RiskColor = d3.scaleSequential(
      d3.interpolateRgbBasis([
        '#0284c7', // Sky blue: low density / low vulnerability
        '#10b981', // Emerald
        '#eab308', // Amber
        '#f97316', // Orange
        '#ef4444', // Red
        '#991b1b'  // Deep Crimson: critical vulnerability concentration
      ])
    );

    const redraw = () => {
      if (!mapInstanceRef.current) return;
      const size = map.getSize();
      if (size.x === 0 || size.y === 0) return;

      const topLeft = map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvas, topLeft);

      const dpr = window.devicePixelRatio || 1;
      canvas.width = size.x * dpr;
      canvas.height = size.y * dpr;
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size.x, size.y);

      if (assets.length === 0) return;

      interface HeatPoint {
        x: number;
        y: number;
        weight: number;
        score: number;
      }

      const points: HeatPoint[] = [];
      assets.forEach((asset) => {
        const [lon, lat] = asset.geometry.coordinates;
        const pt = map.latLngToContainerPoint([lat, lon]);

        // Keep points with a 120px buffer around container viewport
        if (pt.x >= -120 && pt.x <= size.x + 120 && pt.y >= -120 && pt.y <= size.y + 120) {
          const score = asset.score.vulnerabilityScore;
          // Point density weighted by vulnerability score
          const weight = Math.max(1, (score / 8) + 1);
          points.push({ x: pt.x, y: pt.y, weight, score });
        }
      });

      if (points.length === 0) return;

      const zoom = map.getZoom();
      const bandwidth = Math.max(22, Math.min(85, 28 + (zoom - 6) * 6));

      // 1. D3 Isarithmic Density Contours (interpolated across point density fields)
      if (heatmapMode === 'both' || heatmapMode === 'contours') {
        try {
          if (points.length >= 2) {
            const density = d3
              .contourDensity<HeatPoint>()
              .x((d) => d.x)
              .y((d) => d.y)
              .weight((d) => d.weight)
              .size([size.x, size.y])
              .bandwidth(bandwidth)
              .thresholds(22);

            const contours = density(points);
            const geoPath = d3.geoPath().context(ctx);
            const maxVal = d3.max(contours, (d) => d.value) || 0.0001;
            const contourColorScale = d3.scaleSequential(
              d3.interpolateRgbBasis([
                '#38bdf8',
                '#34d399',
                '#fbbf24',
                '#fb923c',
                '#f87171',
                '#b91c1c'
              ])
            ).domain([0, maxVal]);

            contours.forEach((contour) => {
              ctx.beginPath();
              geoPath(contour);
              const c = d3.rgb(contourColorScale(contour.value));
              ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.32)`;
              ctx.fill();
              ctx.lineWidth = 1;
              ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.45)`;
              ctx.stroke();
            });
          }
        } catch (e) {
          console.warn('D3 contour density generation warning:', e);
        }
      }

      // 2. D3 Smooth Radial Point Density & Vulnerability Kernels
      if (heatmapMode === 'both' || heatmapMode === 'density') {
        points.forEach((pt) => {
          const normScore = Math.max(0, Math.min(1, pt.score / 100));
          const c = d3.rgb(d3RiskColor(normScore));
          const radius = Math.max(28, Math.min(85, 22 + normScore * 55));

          const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius);
          grad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, 0.55)`);
          grad.addColorStop(0.35, `rgba(${c.r}, ${c.g}, ${c.b}, 0.28)`);
          grad.addColorStop(0.7, `rgba(${c.r}, ${c.g}, ${c.b}, 0.1)`);
          grad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    };

    redraw();

    map.on('move', redraw);
    map.on('moveend', redraw);
    map.on('zoomend', redraw);
    map.on('viewreset', redraw);
    map.on('resize', redraw);

    return () => {
      map.off('move', redraw);
      map.off('moveend', redraw);
      map.off('zoomend', redraw);
      map.off('viewreset', redraw);
      map.off('resize', redraw);
      if (overlayPane.contains(canvas)) {
        overlayPane.removeChild(canvas);
      }
    };
  }, [showHeatmap, heatmapMode, assets]);

  // Auto Pan / Zoom when Scenario or Selected Asset changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (selectedAsset) {
      const [lon, lat] = selectedAsset.geometry.coordinates;
      map.flyTo([lat, lon], 11, { duration: 1.2 });
    } else if (forecast?.trackPoints && forecast.trackPoints.length > 0) {
      // Fit to track & assets
      const pts = forecast.trackPoints.map((p) => [p.lat, p.lon] as [number, number]);
      assets.forEach((a) => {
        const [lon, lat] = a.geometry.coordinates;
        pts.push([lat, lon]);
      });
      if (pts.length > 0) {
        const bounds = L.latLngBounds(pts);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 9 });
      }
    }
  }, [forecast?.cycloneName, selectedAsset]);

  // Reset map view: automatically pans and zooms the map to fit the current cyclone forecast cone bounds
  const handleResetView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Ensure forecast cone layer is visible so user sees the framed cone bounds
    if (!showCone) {
      setShowCone(true);
    }

    // Extract all polygon ring vertices from current forecast cone geometry
    const coneLatLngs: [number, number][] = [];
    if (forecast?.coneGeometry?.coordinates) {
      forecast.coneGeometry.coordinates.forEach((ring) => {
        ring.forEach(([lon, lat]) => {
          if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
            coneLatLngs.push([lat, lon]);
          }
        });
      });
    }

    if (coneLatLngs.length > 0) {
      const coneBounds = L.latLngBounds(coneLatLngs);
      if (typeof (map as any).flyToBounds === 'function') {
        (map as any).flyToBounds(coneBounds, {
          padding: [50, 50],
          maxZoom: 9,
          duration: 1.0
        });
      } else {
        map.fitBounds(coneBounds, {
          padding: [50, 50],
          maxZoom: 9,
          animate: true
        });
      }
    } else if (forecast?.trackPoints && forecast.trackPoints.length > 0) {
      // Fallback to cyclone track points if cone polygon coordinates are not available
      const trackPts = forecast.trackPoints.map((p) => [p.lat, p.lon] as [number, number]);
      map.fitBounds(L.latLngBounds(trackPts), {
        padding: [50, 50],
        maxZoom: 8,
        animate: true
      });
    } else {
      map.setView([19.5, 85.5], 7, { animate: true });
    }
  };

  const handleRecenter = handleResetView;

  return (
    <div className="relative w-full h-full min-h-[500px] lg:min-h-[640px] rounded-2xl overflow-hidden border border-sky-100 shadow-[0_4px_25px_-5px_rgba(11,95,165,0.08)] bg-[#EBF5FB]">
      {/* The Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Map Controls Top-Left */}
      <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2">
        <div className="bg-white/95 backdrop-blur-md rounded-xl p-1.5 border border-sky-100 shadow-md flex items-center space-x-1 text-xs">
          <button
            onClick={() => setShowCone(!showCone)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-colors ${
              showCone ? 'bg-sky-100 text-[#0B5FA5] font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle 72-Hour Forecast Uncertainty Cone"
          >
            {showCone ? <Eye className="w-3.5 h-3.5 text-sky-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
            <span>Forecast Cone</span>
          </button>

          <button
            onClick={() => setShowTrack(!showTrack)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-colors ${
              showTrack ? 'bg-sky-100 text-[#0B5FA5] font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle Storm Center Track and Milestones"
          >
            {showTrack ? <Eye className="w-3.5 h-3.5 text-sky-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
            <span>Storm Track</span>
          </button>

          <button
            onClick={() => setShowWeatherOverlay(!showWeatherOverlay)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-colors ${
              showWeatherOverlay ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle Live Radar Precipitation & Wind Vector Overlay (Open-Meteo)"
          >
            {weatherLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            ) : showWeatherOverlay ? (
              <CloudRain className="w-3.5 h-3.5 text-indigo-600" />
            ) : (
              <Wind className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>Live Radar & Wind</span>
          </button>

          {/* Toggleable D3 Heatmap Overlay Layer */}
          <button
            id="toggle-heatmap-overlay-btn"
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-colors ${
              showHeatmap
                ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle D3 Vulnerability Density Heatmap Overlay (KDE & Contours)"
          >
            <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'text-amber-600 fill-amber-500' : 'text-slate-400'}`} />
            <span>Heatmap Overlay</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          {/* Keyless Basemap Selector: 100% Free, Zero API Keys Required */}
          <div className="flex items-center bg-slate-100/90 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setBasemap('osm')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-colors ${
                basemap === 'osm'
                  ? 'bg-white text-[#0B5FA5] shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="OpenStreetMap Standard (Free, Open-Source, No API Key)"
            >
              <Layers className="w-3 h-3 text-[#0B5FA5]" />
              <span>OSM</span>
            </button>
            <button
              onClick={() => setBasemap('gray')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                basemap === 'gray'
                  ? 'bg-white text-[#0B5FA5] shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Clean Gray Canvas (Free, No API Key)"
            >
              <span>Canvas</span>
            </button>
            <button
              onClick={() => setBasemap('topo')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                basemap === 'topo'
                  ? 'bg-white text-[#0B5FA5] shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Topographic Terrain (Free, No API Key)"
            >
              <span>Topo</span>
            </button>
          </div>

          {/* 'Reset View' control: automatically pans and zooms to fit cyclone forecast cone bounds */}
          <button
            id="reset-view-control-btn"
            onClick={handleResetView}
            className="flex items-center gap-1.5 px-2.5 py-1 text-slate-700 hover:text-[#0B5FA5] hover:bg-sky-50 rounded-lg font-medium transition-colors border border-slate-200/70 hover:border-sky-300 shadow-2xs"
            title="Reset View: Automatically pan and zoom to fit cyclone forecast cone bounds"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#0B5FA5]" />
            <span className="font-semibold text-xs">Reset View</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          {/* Quick Place Search & Fly-To */}
          <div className="relative">
            <div className="flex items-center bg-slate-100/90 rounded-lg px-2 py-1 gap-1 text-slate-600 focus-within:bg-white focus-within:ring-1 focus-within:ring-[#0B5FA5]">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={`Find in ${assets.length} places...`}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                className="bg-transparent border-none outline-none text-xs w-28 sm:w-36 text-slate-800 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Dropdown Results */}
            {isSearchOpen && (
              <div className="absolute top-full left-0 mt-1 w-72 max-h-60 overflow-y-auto bg-white/98 backdrop-blur-md rounded-xl border border-sky-100 shadow-xl z-50 p-1 divide-y divide-slate-100">
                <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 flex items-center justify-between">
                  <span>{filteredSearchAssets.length} Places Found</span>
                  <button
                    onClick={() => setIsSearchOpen(false)}
                    className="text-slate-400 hover:text-slate-600 text-[10px]"
                  >
                    Close
                  </button>
                </div>
                {filteredSearchAssets.map((asset) => {
                  const [lon, lat] = asset.geometry.coordinates;
                  const tier = asset.score.riskTier;
                  const color = TIER_COLORS[tier];
                  return (
                    <button
                      key={asset.id}
                      onClick={() => {
                        mapInstanceRef.current?.flyTo([lat, lon], 12, { duration: 1.0 });
                        onSelectAsset(asset);
                        setIsSearchOpen(false);
                      }}
                      className="w-full text-left p-2 hover:bg-sky-50 rounded-lg flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="truncate">
                        <div className="font-semibold text-slate-900 text-xs truncate">
                          {asset.properties.name}
                        </div>
                        <div className="text-[10px] text-slate-500 capitalize">
                          {asset.properties.district} • {asset.properties.type.replace('_', ' ')}
                        </div>
                      </div>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${color.bg} ${color.text} shrink-0`}>
                        {asset.score.vulnerabilityScore}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Place / Add Multiple Places Button */}
          <button
            onClick={() => {
              setIsAddModalOpen(true);
              setIsPickingLocation(false);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold bg-[#0B5FA5] hover:bg-[#094d86] text-white shadow-xs transition-colors"
            title="Add new places or multi-place emergency networks to the map"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Places</span>
          </button>
        </div>

        {/* Weather Overlay Filter Sub-Bar when Weather Layer is active */}
        {showWeatherOverlay && (
          <div className="bg-white/95 backdrop-blur-md rounded-xl px-2.5 py-1.5 border border-indigo-100 shadow-sm flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Open-Meteo:
              </span>
              <div className="flex items-center bg-slate-100 rounded-md p-0.5 text-[10px]">
                <button
                  onClick={() => setWeatherMode('both')}
                  className={`px-1.5 py-0.5 rounded font-medium transition-colors ${weatherMode === 'both' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Both
                </button>
                <button
                  onClick={() => setWeatherMode('radar')}
                  className={`px-1.5 py-0.5 rounded font-medium transition-colors ${weatherMode === 'radar' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Rain Radar
                </button>
                <button
                  onClick={() => setWeatherMode('wind')}
                  className={`px-1.5 py-0.5 rounded font-medium transition-colors ${weatherMode === 'wind' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Wind Vectors
                </button>
              </div>
            </div>

            <span className="text-[10px] text-slate-400 font-mono">
              {weatherData.length} stations
            </span>
          </div>
        )}

        {/* Heatmap Overlay Filter Sub-Bar when Heatmap is active */}
        {showHeatmap && (
          <div className="bg-white/95 backdrop-blur-md rounded-xl px-2.5 py-1.5 border border-amber-200 shadow-sm flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-600 fill-amber-500" />
                D3 Heatmap:
              </span>
              <div className="flex items-center bg-slate-100 rounded-md p-0.5 text-[10px]">
                <button
                  onClick={() => setHeatmapMode('both')}
                  className={`px-1.5 py-0.5 rounded font-medium transition-colors ${heatmapMode === 'both' ? 'bg-amber-600 text-white shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Both
                </button>
                <button
                  onClick={() => setHeatmapMode('contours')}
                  className={`px-1.5 py-0.5 rounded font-medium transition-colors ${heatmapMode === 'contours' ? 'bg-amber-600 text-white shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Contours
                </button>
                <button
                  onClick={() => setHeatmapMode('density')}
                  className={`px-1.5 py-0.5 rounded font-medium transition-colors ${heatmapMode === 'density' ? 'bg-amber-600 text-white shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Density Glow
                </button>
              </div>
            </div>

            <span className="text-[10px] text-amber-800 font-mono">
              {assets.length} assets interpolated
            </span>
          </div>
        )}
      </div>

      {/* Map Legend Floating Bottom-Left */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-md rounded-xl p-3 border border-sky-100 shadow-md max-w-xs text-xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
          <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-[#0B5FA5]" />
            Vulnerability Matrix
          </span>
          <span className="text-[10px] text-slate-400">Score 0–100</span>
        </div>

        {/* Risk Tiers */}
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-500 shrink-0"></span>
            <span className="text-slate-700">Critical (80–100)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-orange-500 shrink-0"></span>
            <span className="text-slate-700">High (60–79)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-400 shrink-0"></span>
            <span className="text-slate-700">Medium (35–59)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-teal-500 shrink-0"></span>
            <span className="text-slate-700">Low (0–34)</span>
          </div>
        </div>

        {/* D3 Heatmap Overlay Legend item when enabled */}
        {showHeatmap && (
          <div className="pt-1.5 border-t border-slate-100 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-amber-900 font-semibold">
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-600 fill-amber-500" /> D3 Vulnerability Density
              </span>
              <span className="text-[9px] text-slate-400">Point Density KDE</span>
            </div>
            {/* Continuous gradient bar */}
            <div className="h-2 w-full rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 via-amber-400 via-orange-500 to-red-600"></div>
            <div className="flex items-center justify-between text-[9px] text-slate-500 font-medium">
              <span>Low Risk Density</span>
              <span>Moderate</span>
              <span>Critical Hotspot</span>
            </div>
          </div>
        )}

        {/* Weather Overlay Legend items when enabled */}
        {showWeatherOverlay && (
          <div className="pt-1.5 border-t border-slate-100 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-indigo-900 font-semibold">
              <span className="flex items-center gap-1"><CloudRain className="w-3 h-3 text-indigo-600" /> Live Radar & Wind Layer</span>
              <span className="text-[9px] text-slate-400">{weatherSource}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500/50 inline-block"></span> Light Rain</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500/60 inline-block"></span> Mod/Heavy</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-600/70 inline-block"></span> Torrential</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border border-slate-400 bg-white inline-block text-[8px] text-center font-bold text-rose-600">↑</span> Wind</span>
            </div>
          </div>
        )}

        {/* Legend Symbols */}
        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span> Storm Eye</span>
          <span className="flex items-center gap-1"><span className="w-3 h-1 bg-[#0B5FA5] inline-block"></span> Projected Track</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 bg-sky-200 border border-sky-400 inline-block"></span> Cone</span>
        </div>

        {/* Total Places Badge */}
        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-600 font-medium">
          <span className="flex items-center gap-1 text-[#0B5FA5]">
            <MapPin className="w-3 h-3" /> {assets.length} Places Active
          </span>
          <button
            onClick={() => {
              setIsAddModalOpen(true);
              setIsPickingLocation(false);
            }}
            className="text-[10px] font-semibold text-[#0B5FA5] hover:underline"
          >
            + Add More
          </button>
        </div>
      </div>

      {/* Floating Quick Reset View Control on Top-Right beneath Zoom stack */}
      <div className="absolute top-[82px] right-[10px] z-10">
        <button
          id="quick-reset-cone-view-btn"
          onClick={handleResetView}
          className="w-[30px] h-[30px] bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0B5FA5] rounded-xs shadow-md border border-slate-300 flex items-center justify-center transition-colors group"
          title="Reset View: Pan and zoom to fit cyclone forecast cone bounds"
          aria-label="Reset View: Fit Forecast Cone"
        >
          <RotateCcw className="w-3.5 h-3.5 transition-transform group-hover:-rotate-90 text-slate-600 group-hover:text-[#0B5FA5]" />
        </button>
      </div>

      {/* Floating Interactive Location-Picking Banner */}
      {isPickingLocation && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 text-white px-5 py-2.5 rounded-full shadow-2xl border border-sky-400/60 flex items-center gap-3 animate-pulse">
          <Crosshair className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-semibold">
            Click anywhere on the map to set the new place's location
          </span>
          <button
            onClick={() => setIsPickingLocation(false)}
            className="text-xs text-rose-300 hover:text-rose-100 font-bold ml-1 px-2 py-0.5 rounded-md hover:bg-white/10"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Add Place & Multiple Places Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0B5FA5]/10 flex items-center justify-center text-[#0B5FA5]">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Places to Map</h3>
                  <p className="text-xs text-slate-500">
                    Plot single critical assets or deploy coordinated multi-facility response networks
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setSubmitMessage(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification message if any */}
            {submitMessage && (
              <div
                className={`px-6 py-2.5 text-xs font-medium flex items-center gap-2 ${
                  submitMessage.startsWith('Failed')
                    ? 'bg-rose-50 text-rose-700 border-b border-rose-100'
                    : 'bg-emerald-50 text-emerald-800 border-b border-emerald-100'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{submitMessage}</span>
              </div>
            )}

            {/* Tabs: Single vs Batch */}
            <div className="flex border-b border-slate-200 px-6 bg-slate-50/40">
              <button
                onClick={() => setActiveAddTab('single')}
                className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeAddTab === 'single'
                    ? 'border-[#0B5FA5] text-[#0B5FA5]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Add Single Place</span>
              </button>
              <button
                onClick={() => setActiveAddTab('batch')}
                className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeAddTab === 'batch'
                    ? 'border-[#0B5FA5] text-[#0B5FA5]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <PackagePlus className="w-4 h-4" />
                <span>Deploy Multiple Places (Packs)</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {activeAddTab === 'single' ? (
                <form onSubmit={handleSingleSubmit} className="space-y-4">
                  {/* Preset Quick-Buttons */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Quick Archetype Templates
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => applyPreset('clinic')}
                        className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 hover:border-sky-400 bg-white hover:bg-sky-50 text-slate-700 font-medium transition-colors"
                      >
                        🏥 Health Clinic
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('shelter')}
                        className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 hover:border-sky-400 bg-white hover:bg-sky-50 text-slate-700 font-medium transition-colors"
                      >
                        🏠 Cyclone Haven
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('power')}
                        className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 hover:border-sky-400 bg-white hover:bg-sky-50 text-slate-700 font-medium transition-colors"
                      >
                        ⚡ 132kV Substation
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('water')}
                        className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 hover:border-sky-400 bg-white hover:bg-sky-50 text-slate-700 font-medium transition-colors"
                      >
                        💧 Potable Water Booster
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('road')}
                        className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 hover:border-sky-400 bg-white hover:bg-sky-50 text-slate-700 font-medium transition-colors"
                      >
                        🛣️ Evacuation Causeway
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('telecom')}
                        className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 hover:border-sky-400 bg-white hover:bg-sky-50 text-slate-700 font-medium transition-colors"
                      >
                        📡 Radar & Warning Mast
                      </button>
                    </div>
                  </div>

                  {/* Location Picker Box */}
                  <div className="bg-sky-50/60 border border-sky-100 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#0B5FA5]" />
                        Plotted Map Coordinates
                      </span>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Lat: {formLat.toFixed(4)}°N • Lon: {formLon.toFixed(4)}°E
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddModalOpen(false);
                        setIsPickingLocation(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#0B5FA5] hover:bg-[#094d86] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>Click on Map to Pick Point</span>
                    </button>
                  </div>

                  {/* Basic Info Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Place / Facility Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Gopalpur Coastal Community Health Center"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B5FA5]/30 focus:border-[#0B5FA5]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Facility Category
                      </label>
                      <select
                        value={formType}
                        onChange={(e) => setFormType(e.target.value as InfrastructureType)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B5FA5]/30 focus:border-[#0B5FA5] bg-white"
                      >
                        <option value="hospital">Hospital / Emergency Health Center</option>
                        <option value="cyclone_shelter">Cyclone Shelter / Evacuation Haven</option>
                        <option value="power_substation">Power Substation / Electrical Grid</option>
                        <option value="water_facility">Water Pumping & Desalination Facility</option>
                        <option value="road_lifeline">Road Lifeline / Evacuation Bridge</option>
                        <option value="telecom_tower">Telecom / Early Warning Tower</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        District & State
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="District (e.g. Ganjam)"
                          value={formDistrict}
                          onChange={(e) => setFormDistrict(e.target.value)}
                          className="w-1/2 text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B5FA5]/30 focus:border-[#0B5FA5]"
                        />
                        <input
                          type="text"
                          placeholder="State (e.g. Odisha)"
                          value={formState}
                          onChange={(e) => setFormState(e.target.value)}
                          className="w-1/2 text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B5FA5]/30 focus:border-[#0B5FA5]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Elevation Above Sea Level (m)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formElevation}
                        onChange={(e) => setFormElevation(parseFloat(e.target.value) || 0)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B5FA5]/30 focus:border-[#0B5FA5]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Distance to Coastline (km)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formDistCoast}
                        onChange={(e) => setFormDistCoast(parseFloat(e.target.value) || 0)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B5FA5]/30 focus:border-[#0B5FA5]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Population Served
                      </label>
                      <input
                        type="number"
                        step="1000"
                        value={formPopulation}
                        onChange={(e) => setFormPopulation(parseInt(e.target.value) || 0)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B5FA5]/30 focus:border-[#0B5FA5]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Capacity & Key Spec
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 120 beds, 2 operating rooms"
                        value={formCapacity}
                        onChange={(e) => setFormCapacity(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B5FA5]/30 focus:border-[#0B5FA5]"
                      />
                    </div>
                  </div>

                  {/* Resilience Features */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formBackupPower}
                        onChange={(e) => setFormBackupPower(e.target.checked)}
                        className="rounded border-slate-300 text-[#0B5FA5] focus:ring-[#0B5FA5]"
                      />
                      <span className="text-xs text-slate-700 font-medium">
                        Autonomous Backup Generator ({formBackupHours}h runtime)
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formFloodBarrier}
                        onChange={(e) => setFormFloodBarrier(e.target.checked)}
                        className="rounded border-slate-300 text-[#0B5FA5] focus:ring-[#0B5FA5]"
                      />
                      <span className="text-xs text-slate-700 font-medium">
                        Engineered Flood Inundation Barrier
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !formName.trim()}
                      className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#0B5FA5] hover:bg-[#094d86] text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Integrating Place...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Place & Calculate Vulnerability</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* Coordinated Regional Multi-Place Packs */
                <div className="space-y-4">
                  <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800 mb-0.5">
                      1-Click Deploy Coordinated Emergency Response Networks
                    </p>
                    Deploy 3 mutually supportive emergency facilities (triage clinic, stilted haven, and lifeline node) configured for coastal cyclone resilience.
                  </div>

                  {/* Pack 1 */}
                  <div className="p-4 rounded-xl border border-slate-200 hover:border-sky-300 bg-white shadow-2xs space-y-3 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          Pack 1: South Odisha Coastal Shield (Ganjam & Gopalpur)
                        </div>
                        <div className="text-xs text-slate-500">
                          3 Coordinated Facilities in Ganjam District
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeployBatchPack('odisha-south')}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 rounded-lg bg-[#0B5FA5] hover:bg-[#094d86] text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackagePlus className="w-3.5 h-3.5" />}
                        <span>Deploy 3 Places</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="font-semibold text-slate-800 text-[11px]">🏥 Mobile Trauma Station</div>
                        <div className="text-[10px] text-slate-500">Gopalpur Beach (4.8m elev, 80 beds)</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="font-semibold text-slate-800 text-[11px]">🏠 Sonapur Cyclone Haven</div>
                        <div className="text-[10px] text-slate-500">Surge Stilted (2,200 capacity)</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="font-semibold text-slate-800 text-[11px]">⚡ Chatrapur 132kV Node</div>
                        <div className="text-[10px] text-slate-500">Corridor Substation (120 MVA)</div>
                      </div>
                    </div>
                  </div>

                  {/* Pack 2 */}
                  <div className="p-4 rounded-xl border border-slate-200 hover:border-sky-300 bg-white shadow-2xs space-y-3 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          Pack 2: Delta Estuarine Network (Bhadrak & Chandbali)
                        </div>
                        <div className="text-xs text-slate-500">
                          3 Estuarine Protection Facilities in Lowland Delta
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeployBatchPack('delta-estuary')}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 rounded-lg bg-[#0B5FA5] hover:bg-[#094d86] text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackagePlus className="w-3.5 h-3.5" />}
                        <span>Deploy 3 Places</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="font-semibold text-slate-800 text-[11px]">🏥 Dhamra Port Medical Depot</div>
                        <div className="text-[10px] text-slate-500">Sea Ambulance Ramp (75 beds)</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="font-semibold text-slate-800 text-[11px]">🏠 Baitarani Estuary Haven</div>
                        <div className="text-[10px] text-slate-500">Island Sanctuary (3,000 capacity)</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="font-semibold text-slate-800 text-[11px]">💧 Chandbali Sluice & Booster</div>
                        <div className="text-[10px] text-slate-500">Anti-Saline Barrier (80 cusecs)</div>
                      </div>
                    </div>
                  </div>

                  {/* Pack 3 */}
                  <div className="p-4 rounded-xl border border-slate-200 hover:border-sky-300 bg-white shadow-2xs space-y-3 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          Pack 3: Andhra Coastal Critical Nodes (Visakhapatnam)
                        </div>
                        <div className="text-xs text-slate-500">
                          3 Coastal Defense Facilities in Visakhapatnam
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeployBatchPack('andhra-north')}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 rounded-lg bg-[#0B5FA5] hover:bg-[#094d86] text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackagePlus className="w-3.5 h-3.5" />}
                        <span>Deploy 3 Places</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="font-semibold text-slate-800 text-[11px]">🏥 Rushikonda Medical Cell</div>
                        <div className="text-[10px] text-slate-500">Elevated Hillside (100 beds)</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="font-semibold text-slate-800 text-[11px]">🏠 Thotlakonda Beach Haven</div>
                        <div className="text-[10px] text-slate-500">Artisanal Bay (2,000 capacity)</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="font-semibold text-slate-800 text-[11px]">📡 Vizag Microwave Tower</div>
                        <div className="text-[10px] text-slate-500">80m Hardened Mast (Distress Relay)</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
