import React from 'react';
import { X, BookOpen, Layers, Wind, Waves, ShieldCheck, Database, Cpu } from 'lucide-react';

interface ModelExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModelExplanationModal: React.FC<ModelExplanationModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-sky-100 shadow-2xl space-y-5 p-6 text-slate-800">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-50 text-[#0B5FA5]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                Vayu Mathematical & Vulnerability Scoring Architecture
              </h3>
              <p className="text-xs text-slate-500">
                Methodological specification for hackathon judges & disaster management authorities
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: The Core Equation */}
        <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200/80 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0B5FA5] block">
            1. Composite Vulnerability Index Formulation
          </span>
          <div className="p-3 bg-white rounded-lg border border-sky-200 font-mono text-xs text-[#0C4A8A] font-bold text-center">
            V = 0.40 × Hazard_Exposure + 0.35 × Asset_Criticality + 0.25 × Structural_Fragility
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            The composite vulnerability index (0 to 100) separates physical hazard from the intrinsic societal importance of the asset and its engineering vulnerability, preventing the common fallacy of treating a high-elevation warehouse identically to a coastal hospital.
          </p>
        </div>

        {/* Section 2: Physical Hazard Modeling */}
        <div className="space-y-3">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Wind className="w-4 h-4 text-sky-600" />
            <span>2. Hazard Exposure & Aerodynamic Decay (Holland 1980)</span>
          </h4>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs space-y-2 text-slate-700">
            <p>
              Rather than assuming uniform winds inside the cone, Vayu applies the classic <strong>Holland Vortex Model</strong> for tropical cyclones:
            </p>
            <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200 text-slate-900">
              V(r) = V_max · [ (R_max / r)^B · exp( 1 - (R_max / r)^B ) ]^0.5
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
              <li><strong>R_max (Radius of Maximum Winds):</strong> Calibrated between 32 km and 45 km based on central pressure depth.</li>
              <li><strong>Holland B Parameter (1.20 – 1.35):</strong> Governs the steepness of the pressure and wind profile.</li>
              <li><strong>Distance to Track (r):</strong> Geodesic minimum perpendicular distance from asset coordinates to the forecast polyline.</li>
            </ul>
          </div>
        </div>

        {/* Section 3: Storm Surge Inundation Risk */}
        <div className="space-y-3">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Waves className="w-4 h-4 text-cyan-600" />
            <span>3. Hydrodynamic Storm Surge & Coastal Attenuation</span>
          </h4>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs space-y-2 text-slate-700">
            <p>
              Storm surge water levels are driven by barometric suction (inverse barometer effect) and coastal bathymetry slope:
            </p>
            <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200 text-slate-900">
              Surge_Peak = 0.048 × (1013 - P_central) [meters]
              <br />
              Surge_Local(d) = Surge_Peak · exp( -0.28 · Distance_to_Coast_km )
              <br />
              Net_Inundation_Depth = max( 0, Surge_Local - Asset_Elevation_m )
            </div>
            <p className="text-[11px] text-slate-600">
              When the net water depth exceeds 0.5m, vulnerability escalates exponentially as electrical equipment, basement oxygen systems, and transformers are submerged.
            </p>
          </div>
        </div>

        {/* Section 4: Criticality & Fragility Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
            <h5 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0B5FA5]" />
              Asset Criticality Weighting
            </h5>
            <ul className="space-y-1 text-slate-600 text-[11px]">
              <li><strong>Hospitals & Trauma Care:</strong> Weight 95 (+ pop. bonus)</li>
              <li><strong>Power Substations & Grid:</strong> Weight 90</li>
              <li><strong>Water Treatment / Pumping:</strong> Weight 85</li>
              <li><strong>Cyclone Shelters (MPCS):</strong> Weight 82</li>
              <li><strong>Telecom & Radar Towers:</strong> Weight 78</li>
              <li><strong>Road Lifelines & Bridges:</strong> Weight 72</li>
            </ul>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
            <h5 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <Cpu className="w-3.5 h-3.5 text-amber-600" />
              Structural Fragility Penalty Matrix
            </h5>
            <ul className="space-y-1 text-slate-600 text-[11px]">
              <li><strong>No Backup Generator:</strong> +22 points fragility penalty</li>
              <li><strong>Limited Fuel (&lt;24h):</strong> +10 points fragility penalty</li>
              <li><strong>No Flood Barrier / Berm:</strong> +16 points penalty</li>
              <li><strong>Unreinforced Masonry:</strong> +35 points penalty</li>
              <li><strong>Steel Lattice Guyed Mast:</strong> +30 points penalty</li>
              <li><strong>Low Coastal Profile (&lt;4m elev):</strong> +15 points penalty</li>
            </ul>
          </div>
        </div>

        {/* Section 5: Hackathon Architecture Note */}
        <div className="p-3 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-500" />
            <span>Full-Stack Architecture: React (Vite) + Express + Leaflet + Recharts + GeoJSON Models</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#0B5FA5] text-white font-semibold text-xs hover:bg-[#0C4A8A] transition-colors"
          >
            Got it, Return to Map
          </button>
        </div>
      </div>
    </div>
  );
};
