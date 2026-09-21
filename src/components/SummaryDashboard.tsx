import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  FileText,
  FileDown,
  Download,
  Printer,
  Users,
  Building2,
  ShieldAlert,
  Bot,
  Sparkles,
  RefreshCw,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Activity
} from 'lucide-react';
import { VulnerabilitySummary, ScoredAsset } from '../types.js';
import { generateAiBriefing } from '../api/client.js';
import { generateDisasterReportPdf } from '../utils/pdfGenerator.js';

interface SummaryDashboardProps {
  summary: VulnerabilitySummary | null;
  assets: ScoredAsset[];
  cycloneName: string;
  districts: string[];
  selectedDistrict: string;
  onSelectDistrict: (district: string) => void;
}

const TIER_COLORS: Record<string, string> = {
  Critical: '#EF4444',
  High: '#F97316',
  Medium: '#EAB308',
  Low: '#14B8A6'
};

export const SummaryDashboard: React.FC<SummaryDashboardProps> = ({
  summary,
  assets,
  cycloneName,
  districts,
  selectedDistrict,
  onSelectDistrict
}) => {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingSource, setBriefingSource] = useState<string>('');
  const [loadingBriefing, setLoadingBriefing] = useState<boolean>(false);
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false);

  if (!summary) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Loading summary analytics...
      </div>
    );
  }

  // District Scoped Assets and Statistics
  const districtAssets = selectedDistrict === 'All'
    ? assets
    : assets.filter((a) => a.properties.district.toLowerCase() === selectedDistrict.toLowerCase());

  const totalAssetsCount = districtAssets.length || summary.totalAssets;
  const criticalAssets = districtAssets.filter((a) => a.score.riskTier === 'critical');
  const highAssets = districtAssets.filter((a) => a.score.riskTier === 'high');
  const mediumAssets = districtAssets.filter((a) => a.score.riskTier === 'medium');
  const lowAssets = districtAssets.filter((a) => a.score.riskTier === 'low');

  const popAtRisk = selectedDistrict === 'All'
    ? summary.estimatedPopulationAtRisk
    : districtAssets.reduce((sum, a) => sum + (a.properties.population_served || 0), 0);

  // High priority assets (Critical and High, sorted by vulnerabilityScore desc)
  const highPriorityAssets = [...districtAssets]
    .filter((a) => a.score.riskTier === 'critical' || a.score.riskTier === 'high')
    .sort((a, b) => b.score.vulnerabilityScore - a.score.vulnerabilityScore);

  const topDisplayAssets = highPriorityAssets.length > 0
    ? highPriorityAssets
    : [...districtAssets].sort((a, b) => b.score.vulnerabilityScore - a.score.vulnerabilityScore).slice(0, 10);

  // Chart 1: Risk Tier Distribution
  const tierData = [
    { name: 'Critical', count: criticalAssets.length, fill: TIER_COLORS.Critical },
    { name: 'High', count: highAssets.length, fill: TIER_COLORS.High },
    { name: 'Medium', count: mediumAssets.length, fill: TIER_COLORS.Medium },
    { name: 'Low', count: lowAssets.length, fill: TIER_COLORS.Low }
  ];

  // Chart 2: Category Vulnerability Breakdown
  const categoryStatsMap: Record<string, { total: number; critical: number; high: number }> = {};
  for (const a of districtAssets) {
    const t = a.properties.type;
    if (!categoryStatsMap[t]) {
      categoryStatsMap[t] = { total: 0, critical: 0, high: 0 };
    }
    categoryStatsMap[t].total += 1;
    if (a.score.riskTier === 'critical') categoryStatsMap[t].critical += 1;
    if (a.score.riskTier === 'high') categoryStatsMap[t].high += 1;
  }

  const categoryData = Object.entries(categoryStatsMap).map(([type, stats]) => ({
    name: type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    Critical: stats.critical,
    High: stats.high,
    SafeOrMedium: Math.max(0, stats.total - stats.critical - stats.high)
  }));

  // Chart 3: Holland Wind Decay Curve Sample (Distance vs Wind Speed)
  const windCurveData = [
    { dist: 0, wind: 215, label: 'Eye Center' },
    { dist: 35, wind: 215, label: 'Eyewall Rmax' },
    { dist: 60, wind: 175, label: 'Inner Core' },
    { dist: 100, wind: 130, label: 'Outer Swathe' },
    { dist: 150, wind: 95, label: 'Gale Perimeter' },
    { dist: 220, wind: 55, label: 'Marginal Zone' }
  ];

  const handleFetchAiBriefing = async () => {
    try {
      setLoadingBriefing(true);
      const res = await generateAiBriefing({
        cycloneName,
        summary,
        topAssets: assets.slice(0, 5)
      });
      setBriefing(res.briefing);
      setBriefingSource(res.source);
    } catch (err) {
      console.error('Error fetching briefing:', err);
    } finally {
      setLoadingBriefing(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'District',
      'Total Assets',
      'Critical Tier',
      'High Tier',
      'Medium Tier',
      'Low Tier',
      'Population at Risk',
      'Generated At'
    ];
    const row = [
      `"${selectedDistrict}"`,
      totalAssetsCount,
      criticalAssets.length,
      highAssets.length,
      mediumAssets.length,
      lowAssets.length,
      popAtRisk,
      `"${new Date().toISOString()}"`
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), row.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cycloneguard-district-summary-${selectedDistrict.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGeneratePDF = () => {
    try {
      setGeneratingPdf(true);
      generateDisasterReportPdf({
        summary,
        assets,
        cycloneName,
        selectedDistrict,
        briefing,
        briefingSource
      });
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------
          PRINT-ONLY OFFICIAL DOCUMENT HEADER
          ---------------------------------------------------- */}
      <div className="print-only mb-6 pb-4 border-b-2 border-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
              Vayu™ Disaster Management Incident Report
            </h1>
            <p className="text-xs text-slate-700 font-semibold mt-0.5">
              State Disaster Management Authority (SDMA) • Multi-Hazard Infrastructure Triage
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-1 bg-rose-600 text-white font-bold text-[10px] rounded uppercase tracking-wider">
              Emergency Directive
            </span>
            <p className="text-[10px] text-slate-600 mt-1">
              Generated: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-slate-300 text-xs">
          <div><strong>Active Cyclone:</strong> {cycloneName}</div>
          <div><strong>Target District:</strong> {selectedDistrict === 'All' ? 'All Coastal Districts' : `${selectedDistrict} District`}</div>
          <div><strong>Security:</strong> Restricted Operational Distribution</div>
        </div>
      </div>

      {/* Top Banner with Stats & Controls */}
      <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-[0_4px_25px_-5px_rgba(11,95,165,0.08)] print-card">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-50 text-[#0B5FA5]">
                <FileText className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Disaster Management District Incident Rollup
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-hazard risk aggregation for <strong>{cycloneName}</strong> across impacted civil districts
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            <select
              value={selectedDistrict}
              onChange={(e) => onSelectDistrict(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0B5FA5]"
            >
              <option value="All">All Impacted Coastal Districts</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d} District
                </option>
              ))}
            </select>

            <button
              onClick={handleGeneratePDF}
              disabled={generatingPdf}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0B5FA5] to-[#0C4A8A] hover:from-[#094880] hover:to-[#0B5FA5] transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Export formatted official PDF report with district statistics and high-priority assets"
            >
              {generatingPdf ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Generate PDF Report</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#0B5FA5] bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors shadow-xs"
              title="Export raw tabular metrics as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-xs"
              title="Print document or save using browser print dialog"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>
          </div>
        </div>

        {/* 4 Key Stat Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 print-avoid-break">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Total Assets Scored
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {totalAssetsCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Critical lifelines tracked</p>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200/80 print-avoid-break">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              Critical Risk Tier
            </span>
            <div className="text-2xl font-black text-rose-600 mt-1">
              {criticalAssets.length}
            </div>
            <p className="text-[11px] text-rose-700 mt-0.5">Requires immediate pre-landfall action</p>
          </div>

          <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200/80 print-avoid-break">
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-orange-600" />
              High Risk Tier
            </span>
            <div className="text-2xl font-black text-orange-600 mt-1">
              {highAssets.length}
            </div>
            <p className="text-[11px] text-orange-700 mt-0.5">High probability of service disruption</p>
          </div>

          <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200/80 print-avoid-break">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#0B5FA5]" />
              Population at Risk
            </span>
            <div className="text-2xl font-black text-[#0B5FA5] mt-1">
              {(popAtRisk / 1000000).toFixed(1)}M
            </div>
            <p className="text-[11px] text-sky-800 mt-0.5">In severe inundation/wind swathe</p>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Risk Tier Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-[0_4px_25px_-5px_rgba(11,95,165,0.08)] print-card">
          <h3 className="font-bold text-slate-900 text-sm tracking-tight mb-1">
            Infrastructure Breakdown by Risk Tier
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Percentage of public facilities falling into Critical, High, Medium, and Low buckets
          </p>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tierData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {tierData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Category Vulnerability Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-[0_4px_25px_-5px_rgba(11,95,165,0.08)] print-card">
          <h3 className="font-bold text-slate-900 text-sm tracking-tight mb-1">
            Vulnerability by Asset Category
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Stacked evaluation of Critical, High, and Moderate facilities across essential lifelines
          </p>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                />
                <Bar dataKey="Critical" stackId="a" fill="#EF4444" />
                <Bar dataKey="High" stackId="a" fill="#F97316" />
                <Bar dataKey="SafeOrMedium" stackId="a" fill="#3FA9E0" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Holland Wind Decay Gradient */}
        <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-[0_4px_25px_-5px_rgba(11,95,165,0.08)] lg:col-span-2 print-card">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm tracking-tight">
                Holland Wind Field Radial Decay Model
              </h3>
              <p className="text-xs text-slate-500">
                Simulated wind velocity gradient V(r) extending outwards from storm center (Eyewall Rmax = 35 km)
              </p>
            </div>
            <span className="text-[11px] font-semibold text-[#0B5FA5] bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
              Vmax = 215 km/h • B = 1.25
            </span>
          </div>

          <div className="h-56 w-full mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={windCurveData} margin={{ top: 10, right: 20, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="dist"
                  unit="km"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  label={{ value: 'Distance from Cyclone Eye (km)', position: 'insideBottom', offset: -5, fontSize: 11, fill: '#94A3B8' }}
                />
                <YAxis
                  unit=" km/h"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  label={{ value: 'Wind Speed', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#94A3B8' }}
                />
                <Tooltip
                  formatter={(value) => [`${value} km/h`, 'Wind Speed']}
                  labelFormatter={(label) => `Distance: ${label} km from eye`}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="wind"
                  stroke="#0B5FA5"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#0B5FA5' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          HIGH-PRIORITY ASSETS TRIAGE MATRIX
          ---------------------------------------------------- */}
      <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-[0_4px_25px_-5px_rgba(11,95,165,0.08)] print-card">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <h3 className="font-bold text-slate-900 text-base">
                High-Priority Infrastructure Assets (Disaster Triage Matrix)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked by composite vulnerability index ({selectedDistrict === 'All' ? 'All Districts' : `${selectedDistrict} District`})
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-bold text-[11px]">
              {criticalAssets.length} Critical
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800 font-bold text-[11px]">
              {highAssets.length} High
            </span>
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                <th className="py-2.5 px-3 font-bold">Rank & Tier</th>
                <th className="py-2.5 px-3 font-bold">Facility Name & Type</th>
                <th className="py-2.5 px-3 font-bold">Location & Coast</th>
                <th className="py-2.5 px-3 font-bold text-center">Score</th>
                <th className="py-2.5 px-3 font-bold">Projected Hazards</th>
                <th className="py-2.5 px-3 font-bold">Recommended Tactical Directive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topDisplayAssets.map((asset, idx) => {
                const isCrit = asset.score.riskTier === 'critical';
                const isHi = asset.score.riskTier === 'high';
                return (
                  <tr
                    key={asset.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isCrit ? 'bg-rose-50/30' : isHi ? 'bg-orange-50/20' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-700">#{idx + 1}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isCrit
                              ? 'bg-rose-600 text-white'
                              : isHi
                              ? 'bg-orange-500 text-white'
                              : 'bg-amber-400 text-slate-900'
                          }`}
                        >
                          {asset.score.riskTier}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <div>{asset.properties.name}</div>
                      <div className="text-[10px] text-slate-500 font-normal uppercase tracking-wider">
                        {asset.properties.type.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <div>{asset.properties.district}</div>
                      <div className="text-[10px] text-slate-400">
                        {asset.properties.dist_to_coast_km} km coast • {asset.properties.elevation_m}m AMSL
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block font-black text-sm ${
                          isCrit ? 'text-rose-600' : isHi ? 'text-orange-600' : 'text-amber-600'
                        }`}
                      >
                        {asset.score.vulnerabilityScore.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      <div className="font-medium text-slate-900">{asset.score.estimatedWindSpeedKmh} km/h wind</div>
                      <div className="text-[10px] text-slate-500">
                        Surge: {asset.score.stormSurgeRiskMeters}m ({asset.score.inundationProbabilityPercent}% inundation)
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-xs text-[11px] leading-relaxed">
                      {asset.score.recommendedActions && asset.score.recommendedActions.length > 0 ? (
                        <div className="space-y-0.5">
                          {asset.score.recommendedActions.slice(0, 2).map((act, i) => (
                            <div key={i} className="flex items-start gap-1">
                              <span className="text-[#0B5FA5] font-bold">•</span>
                              <span>{act}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Execute emergency backup and coastal hardening</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Disaster Management Executive Briefing */}
      <div className="bg-gradient-to-br from-white to-sky-50/50 rounded-2xl p-5 border border-sky-200 shadow-[0_4px_25px_-5px_rgba(11,95,165,0.08)] space-y-3 print-card print-avoid-break">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0B5FA5] to-[#3FA9E0] text-white flex items-center justify-center shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Executive Disaster Briefing & Strategic Command Directive
              </h3>
              <p className="text-[11px] text-slate-500">
                Automated multi-agency intelligence synthesis for Relief Commissioners & Incident Commanders
              </p>
            </div>
          </div>

          <button
            onClick={handleFetchAiBriefing}
            disabled={loadingBriefing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0B5FA5] to-[#3FA9E0] hover:from-[#0C4A8A] hover:to-[#0B5FA5] transition-all shadow-sm disabled:opacity-50 cursor-pointer no-print"
          >
            {loadingBriefing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{briefing ? 'Regenerate Briefing' : 'Generate AI Briefing'}</span>
              </>
            )}
          </button>
        </div>

        {briefing ? (
          <div className="mt-3 p-4 bg-white rounded-xl border border-sky-100 text-xs text-slate-800 leading-relaxed space-y-2 whitespace-pre-line shadow-xs">
            <div className="flex items-center justify-between text-[10px] text-sky-800 font-semibold border-b border-slate-100 pb-1.5">
              <span>SOURCE: {briefingSource}</span>
              <span>CLASSIFICATION: OPERATIONAL EMERGENCY DIRECTIVE</span>
            </div>
            {briefing}
          </div>
        ) : (
          <div className="p-4 bg-white/70 rounded-xl border border-slate-200/60 text-center text-slate-500 text-xs py-6">
            Click &quot;Generate AI Briefing&quot; to synthesize an emergency operational action brief combining real-time track prediction, power grid hazards, and ICU hospital contingencies.
          </div>
        )}
      </div>

      {/* ----------------------------------------------------
          INCIDENT COMMAND SIGN-OFF & VERIFICATION BLOCK
          ---------------------------------------------------- */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs print-card print-avoid-break">
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold border-b border-slate-100 pb-2 mb-4">
          <span className="uppercase tracking-wider">Disaster Management Command Verification & Sign-Off</span>
          <span>DOCUMENT REF: CG-SDMA-{new Date().toISOString().slice(0, 10)}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-700">
          <div>
            <p className="font-bold text-slate-900">Incident Commander (SEOC)</p>
            <div className="mt-4 pt-4 border-t border-slate-300">
              <span className="text-slate-400 italic">Signature & Date</span>
            </div>
          </div>
          <div>
            <p className="font-bold text-slate-900">District Magistrate / Collector</p>
            <div className="mt-4 pt-4 border-t border-slate-300">
              <span className="text-slate-400 italic">Approval Seal</span>
            </div>
          </div>
          <div>
            <p className="font-bold text-slate-900">NDRF Sector Coordinator</p>
            <div className="mt-4 pt-4 border-t border-slate-300">
              <span className="text-slate-400 italic">Dispatch Authorization</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
