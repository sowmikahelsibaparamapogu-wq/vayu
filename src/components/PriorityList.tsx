import React, { useState } from 'react';
import {
  ShieldAlert,
  MapPin,
  ArrowUpRight,
  Download,
  AlertTriangle,
  Building2,
  Zap,
  Home,
  Navigation,
  Radio,
  Droplet,
  CheckCircle,
  Filter
} from 'lucide-react';
import { ScoredAsset, RiskTier, InfrastructureType } from '../types.js';

interface PriorityListProps {
  assets: ScoredAsset[];
  onSelectAsset: (asset: ScoredAsset) => void;
  cycloneName: string;
}

export const PriorityList: React.FC<PriorityListProps> = ({
  assets,
  onSelectAsset,
  cycloneName
}) => {
  const [filterTier, setFilterTier] = useState<RiskTier | 'all'>('all');
  const [filterType, setFilterType] = useState<InfrastructureType | 'all'>('all');

  // Filter and sort top 10 assets
  let filtered = assets.slice().sort((a, b) => b.score.vulnerabilityScore - a.score.vulnerabilityScore);

  if (filterTier !== 'all') {
    filtered = filtered.filter((a) => a.score.riskTier === filterTier);
  }
  if (filterType !== 'all') {
    filtered = filtered.filter((a) => a.properties.type === filterType);
  }

  const top10 = filtered.slice(0, 10);

  const handleExportCSV = () => {
    const headers = [
      'Rank',
      'Asset Name',
      'Type',
      'District',
      'Risk Tier',
      'Vulnerability Score',
      'Wind Speed (km/h)',
      'Surge Height (m)',
      'Elevation (m)',
      'Distance to Coast (km)',
      'Primary Action'
    ];

    const rows = top10.map((a, idx) => [
      idx + 1,
      `"${a.properties.name}"`,
      a.properties.type,
      a.properties.district,
      a.score.riskTier,
      a.score.vulnerabilityScore,
      a.score.estimatedWindSpeedKmh,
      a.score.stormSurgeRiskMeters,
      a.properties.elevation_m,
      a.properties.dist_to_coast_km,
      `"${(a.score.recommendedActions[0] || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cycloneguard-priority-action-list-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAssetIcon = (type: InfrastructureType) => {
    switch (type) {
      case 'hospital':
        return <Building2 className="w-4 h-4 text-rose-500" />;
      case 'power_substation':
        return <Zap className="w-4 h-4 text-amber-500" />;
      case 'cyclone_shelter':
        return <Home className="w-4 h-4 text-emerald-500" />;
      case 'road_lifeline':
        return <Navigation className="w-4 h-4 text-blue-500" />;
      case 'telecom_tower':
        return <Radio className="w-4 h-4 text-purple-500" />;
      case 'water_facility':
        return <Droplet className="w-4 h-4 text-cyan-500" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-[0_4px_25px_-5px_rgba(11,95,165,0.08)] space-y-4">
      {/* Header and Export */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <h3 className="font-bold text-slate-900 text-lg tracking-tight">
              Top Critical-Risk Assets in Next 48 Hours
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-generated priority ranking for State Disaster Management Authority (SDMA) resource pre-positioning and evacuation
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#0B5FA5] bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Action Directives CSV</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-600">Risk Tier:</span>
          {(['all', 'critical', 'high', 'medium'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterTier(t)}
              className={`px-2 py-1 rounded-lg font-semibold capitalize transition-colors ${
                filterTier === t
                  ? 'bg-[#0B5FA5] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="text-[11px] text-slate-500">
          Showing <strong>{top10.length}</strong> prioritized interventions for <strong>{cycloneName}</strong>
        </div>
      </div>

      {/* Priority Cards List */}
      <div className="space-y-3">
        {top10.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            No assets match the selected filter criteria.
          </div>
        ) : (
          top10.map((asset, index) => {
            const isCritical = asset.score.riskTier === 'critical';
            return (
              <div
                key={asset.id}
                className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
                  isCritical
                    ? 'bg-gradient-to-r from-rose-50/40 via-white to-white border-rose-200/80'
                    : 'bg-white hover:bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Priority Rank Badge */}
                    <div
                      className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl font-extrabold shrink-0 shadow-xs ${
                        isCritical
                          ? 'bg-rose-600 text-white shadow-rose-200'
                          : 'bg-orange-500 text-white shadow-orange-200'
                      }`}
                    >
                      <span className="text-[9px] uppercase font-bold opacity-80">Rank</span>
                      <span className="text-sm leading-none">#{index + 1}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        {getAssetIcon(asset.properties.type)}
                        <h4 className="font-bold text-slate-900 text-sm hover:text-[#0B5FA5] cursor-pointer" onClick={() => onSelectAsset(asset)}>
                          {asset.properties.name}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <MapPin className="w-3 h-3 text-sky-600" />
                          {asset.properties.district}, {asset.properties.state}
                        </span>
                        <span>•</span>
                        <span>
                          Dist to Track: <strong className="text-slate-800">{asset.score.minDistToTrackKm} km</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Wind: <strong className="text-rose-600 font-bold">{asset.score.estimatedWindSpeedKmh} km/h</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Elev: <strong className="text-slate-800">{asset.properties.elevation_m}m</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Vulnerability Score Pill & Action Button */}
                  <div className="flex flex-col items-end shrink-0 gap-1.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wide border shadow-xs ${
                        isCritical
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-orange-100 text-orange-800 border-orange-300'
                      }`}
                    >
                      Score: {asset.score.vulnerabilityScore}/100
                    </span>

                    <button
                      onClick={() => onSelectAsset(asset)}
                      className="flex items-center gap-1 text-[11px] font-bold text-[#0B5FA5] hover:text-[#0C4A8A] transition-colors"
                    >
                      <span>Inspect Details</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Recommended Immediate Command Directive */}
                <div className="mt-3 pt-2.5 border-t border-slate-100/80 bg-slate-50/70 p-2.5 rounded-lg text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-rose-600 font-bold shrink-0 text-[10px] uppercase tracking-wider bg-rose-100 px-1.5 py-0.5 rounded">
                      Immediate Directive
                    </span>
                    <p className="text-slate-800 font-medium text-[11px] leading-relaxed">
                      {asset.score.recommendedActions[0] || 'Initiate standard coastal cyclone emergency precautions.'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
