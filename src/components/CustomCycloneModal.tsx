import React, { useState } from 'react';
import {
  X,
  SlidersHorizontal,
  Compass,
  Wind,
  Gauge,
  MapPin,
  Play,
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface CustomCycloneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: {
    lat: number;
    lon: number;
    forwardSpeedKmh: number;
    headingDeg: number;
    centralPressureHpa: number;
    maxWindKmh: number;
  }) => void;
}

export const CustomCycloneModal: React.FC<CustomCycloneModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [lat, setLat] = useState<number>(18.5);
  const [lon, setLon] = useState<number>(85.5);
  const [forwardSpeedKmh, setForwardSpeedKmh] = useState<number>(18);
  const [headingDeg, setHeadingDeg] = useState<number>(335);
  const [centralPressureHpa, setCentralPressureHpa] = useState<number>(945);
  const [maxWindKmh, setMaxWindKmh] = useState<number>(185);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: 'super' | 'slow' | 'chennai') => {
    if (preset === 'super') {
      setLat(18.2);
      setLon(86.0);
      setForwardSpeedKmh(22);
      setHeadingDeg(325);
      setCentralPressureHpa(925);
      setMaxWindKmh(230);
    } else if (preset === 'slow') {
      setLat(19.0);
      setLon(85.8);
      setForwardSpeedKmh(9);
      setHeadingDeg(340);
      setCentralPressureHpa(975);
      setMaxWindKmh(120);
    } else if (preset === 'chennai') {
      setLat(12.8);
      setLon(81.0);
      setForwardSpeedKmh(12);
      setHeadingDeg(350);
      setCentralPressureHpa(980);
      setMaxWindKmh(115);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      lat,
      lon,
      forwardSpeedKmh,
      headingDeg,
      centralPressureHpa,
      maxWindKmh
    });
    onClose();
  };

  const getCompassDirection = (deg: number) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round((deg % 360) / 22.5) % 16;
    return directions[idx];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-sky-100 shadow-2xl p-6 text-slate-800 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-50 text-[#0B5FA5]">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                Custom Cyclone Track Simulator
              </h3>
              <p className="text-xs text-slate-500">
                Input synthetic or real-time storm parameters to recalculate forecast cone and infrastructure risk
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

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Rapid Presets
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleApplyPreset('super')}
              className="p-2 text-left rounded-xl bg-slate-50 hover:bg-sky-50 border border-slate-200/80 hover:border-sky-300 text-xs transition-colors"
            >
              <strong className="block text-rose-600 font-bold text-[11px]">Cat 4+ Super Storm</strong>
              <span className="text-[10px] text-slate-500">230 km/h • 925 hPa</span>
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('slow')}
              className="p-2 text-left rounded-xl bg-slate-50 hover:bg-sky-50 border border-slate-200/80 hover:border-sky-300 text-xs transition-colors"
            >
              <strong className="block text-amber-600 font-bold text-[11px]">Slow Flooder</strong>
              <span className="text-[10px] text-slate-500">9 km/h • Extreme Rain</span>
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('chennai')}
              className="p-2 text-left rounded-xl bg-slate-50 hover:bg-sky-50 border border-slate-200/80 hover:border-sky-300 text-xs transition-colors"
            >
              <strong className="block text-sky-700 font-bold text-[11px]">South Coast Arc</strong>
              <span className="text-[10px] text-slate-500">Chennai / Nellore</span>
            </button>
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Latitude & Longitude */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                <span>Start Latitude (°N)</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="10"
                max="25"
                value={lat}
                onChange={(e) => setLat(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5FA5]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                <span>Start Longitude (°E)</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="78"
                max="92"
                value={lon}
                onChange={(e) => setLon(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5FA5]"
                required
              />
            </div>
          </div>

          {/* Heading and Forward Speed */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="font-semibold text-slate-700 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-sky-600" />
                  <span>Heading Angle</span>
                </label>
                <span className="font-bold text-[#0B5FA5]">
                  {headingDeg}° ({getCompassDirection(headingDeg)})
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={headingDeg}
                onChange={(e) => setHeadingDeg(Number(e.target.value))}
                className="w-full accent-[#0B5FA5]"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="font-semibold text-slate-700 flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5 text-sky-600" />
                  <span>Forward Speed</span>
                </label>
                <span className="font-bold text-[#0B5FA5]">{forwardSpeedKmh} km/h</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                step="1"
                value={forwardSpeedKmh}
                onChange={(e) => setForwardSpeedKmh(Number(e.target.value))}
                className="w-full accent-[#0B5FA5]"
              />
            </div>
          </div>

          {/* Max Sustained Wind & Central Pressure */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="font-semibold text-slate-700 flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5 text-rose-600" />
                  <span>Max Sustained Wind</span>
                </label>
                <span className="font-bold text-rose-600">{maxWindKmh} km/h</span>
              </div>
              <input
                type="range"
                min="60"
                max="260"
                step="5"
                value={maxWindKmh}
                onChange={(e) => setMaxWindKmh(Number(e.target.value))}
                className="w-full accent-rose-600"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="font-semibold text-slate-700 flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-sky-700" />
                  <span>Central Pressure</span>
                </label>
                <span className="font-bold text-sky-800">{centralPressureHpa} hPa</span>
              </div>
              <input
                type="range"
                min="900"
                max="1005"
                step="5"
                value={centralPressureHpa}
                onChange={(e) => setCentralPressureHpa(Number(e.target.value))}
                className="w-full accent-sky-700"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0B5FA5] to-[#3FA9E0] hover:from-[#0C4A8A] hover:to-[#0B5FA5] text-white font-bold flex items-center gap-1.5 transition-all shadow-md"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Generate Forecast Cone</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
