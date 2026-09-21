import React from 'react';
import {
  Wind,
  Compass,
  Gauge,
  MapPin,
  Building2,
  Zap,
  Home,
  Navigation,
  Radio,
  Droplet,
  Layers
} from 'lucide-react';
import { CycloneScenario, InfrastructureType } from '../types.js';

interface CycloneSelectorProps {
  scenarios: CycloneScenario[];
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
  selectedCategory: InfrastructureType | 'all';
  onSelectCategory: (cat: InfrastructureType | 'all') => void;
  selectedDistrict: string;
  onSelectDistrict: (district: string) => void;
  categoryCounts: Record<string, number>;
  districts: string[];
}

export const CycloneSelector: React.FC<CycloneSelectorProps> = ({
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  selectedCategory,
  onSelectCategory,
  selectedDistrict,
  onSelectDistrict,
  categoryCounts,
  districts
}) => {
  const current = scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];

  const categories: { id: InfrastructureType | 'all'; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Assets', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'hospital', label: 'Hospitals', icon: <Building2 className="w-3.5 h-3.5 text-rose-500" /> },
    { id: 'power_substation', label: 'Power Grids', icon: <Zap className="w-3.5 h-3.5 text-amber-500" /> },
    { id: 'cyclone_shelter', label: 'Shelters', icon: <Home className="w-3.5 h-3.5 text-emerald-500" /> },
    { id: 'road_lifeline', label: 'Evac Roads', icon: <Navigation className="w-3.5 h-3.5 text-blue-500" /> },
    { id: 'telecom_tower', label: 'Telecom', icon: <Radio className="w-3.5 h-3.5 text-purple-500" /> },
    { id: 'water_facility', label: 'Water Plants', icon: <Droplet className="w-3.5 h-3.5 text-cyan-500" /> }
  ];

  return (
    <div className="bg-white rounded-2xl p-4 border border-sky-100 shadow-[0_4px_20px_-4px_rgba(11,95,165,0.06)] space-y-4">
      {/* Cyclone Scenario Cards Slider / Selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Wind className="w-3.5 h-3.5 text-[#0B5FA5]" />
            Cyclone Scenario Library
          </label>
          <span className="text-[11px] text-[#0B5FA5] font-semibold bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
            IMD Best-Track Synthesized
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {scenarios.map((sc) => {
            const isSelected = sc.id === selectedScenarioId;
            return (
              <button
                key={sc.id}
                onClick={() => onSelectScenario(sc.id)}
                className={`text-left p-3 rounded-xl border transition-all duration-200 ${
                  isSelected
                    ? 'bg-gradient-to-br from-sky-50/90 to-blue-50/50 border-[#3FA9E0] ring-2 ring-sky-300/40 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200/80 hover:bg-white hover:border-sky-200 text-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <h4 className="font-bold text-xs text-slate-900 line-clamp-1">
                    {sc.name.split('(')[0]}
                  </h4>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase ${
                      sc.current.maxWindKmh > 180
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {sc.current.maxWindKmh} km/h
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 line-clamp-1">
                  <MapPin className="w-3 h-3 text-sky-600 shrink-0" />
                  {sc.landfallRegion}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters: District & Infrastructure Category Chips */}
      <div className="pt-2 border-t border-slate-100 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">District:</span>
            <select
              value={selectedDistrict}
              onChange={(e) => onSelectDistrict(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:ring-1 focus:ring-[#0B5FA5] focus:outline-none"
            >
              <option value="All">All Impacted Coastal Districts</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d} District
                </option>
              ))}
            </select>
          </div>

          <div className="text-[11px] text-slate-500">
            Filtering <span className="font-bold text-slate-900">{categoryCounts[selectedCategory] || 0}</span> critical assets
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.2 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-[#0B5FA5] text-white shadow-sm font-semibold'
                    : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
                <span
                  className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
