import React from 'react';
import {
  Wind,
  ShieldAlert,
  SlidersHorizontal,
  HelpCircle,
  Activity,
  Layers,
  FileText,
  Bot,
  LogIn,
  LogOut,
  Database
} from 'lucide-react';
import { CycloneScenario } from '../types.js';
import { User } from 'firebase/auth';
import { AppUserProfile } from '../lib/firebase.js';

interface NavbarProps {
  scenarios: CycloneScenario[];
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
  onOpenCustomModal: () => void;
  onOpenModelModal: () => void;
  activeView: 'map' | 'priority' | 'summary' | 'chat' | 'persistence';
  setActiveView: (view: 'map' | 'priority' | 'summary' | 'chat' | 'persistence') => void;
  criticalCount: number;
  user: User | AppUserProfile | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenDomainHelp?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  onOpenCustomModal,
  onOpenModelModal,
  activeView,
  setActiveView,
  criticalCount,
  user,
  onSignIn,
  onSignOut,
  onOpenDomainHelp
}) => {
  const currentScenario = scenarios.find((s) => s.id === selectedScenarioId);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-sky-100 shadow-[0_4px_20px_-4px_rgba(11,95,165,0.08)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo & Brand Identity */}
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#0B5FA5] to-[#3FA9E0] text-white shadow-md shadow-sky-500/20">
              {/* Custom Cyclone Swirl SVG */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6 animate-[spin_12s_linear_infinite]"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12c0 3.87 2.2 7.23 5.42 8.92" />
                <path d="M12 22c5.52 0 10-4.48 10-10 0-3.87-2.2-7.23-5.42-8.92" />
                <path d="M12 7a5 5 0 0 0-5 5c0 1.93 1.1 3.61 2.71 4.46" />
                <path d="M12 17a5 5 0 0 0 5-5c0-1.93-1.1-3.61-2.71-4.46" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-[#0C4A8A] font-['Plus_Jakarta_Sans',sans-serif]">
                  Vayu
                </span>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-[#0B5FA5] border border-sky-200">
                  SDMA Early Warning v2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Predictive Landfall Swathe & Critical Infrastructure Vulnerability Matrix
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 text-xs font-semibold">
            <button
              id="nav-map-view"
              onClick={() => setActiveView('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'map'
                  ? 'bg-white text-[#0B5FA5] shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Map & Cone</span>
            </button>
            <button
              id="nav-priority-view"
              onClick={() => setActiveView('priority')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'priority'
                  ? 'bg-white text-[#0B5FA5] shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              <span>Priority Actions</span>
              {criticalCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold animate-pulse">
                  {criticalCount}
                </span>
              )}
            </button>
            <button
              id="nav-summary-view"
              onClick={() => setActiveView('summary')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'summary'
                  ? 'bg-white text-[#0B5FA5] shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>District Rollup</span>
            </button>
            <button
              id="nav-chat-view"
              onClick={() => setActiveView('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'chat'
                  ? 'bg-[#0B5FA5] text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Gemini AI Tactical</span>
            </button>
            <button
              id="nav-persistence-view"
              onClick={() => setActiveView('persistence')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'persistence'
                  ? 'bg-white text-[#0B5FA5] shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Directives Log</span>
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2">
            {/* Scenario Dropdown */}
            <div className="hidden xl:flex items-center gap-1.5 bg-sky-50/80 border border-sky-200 rounded-xl px-2.5 py-1 text-xs">
              <span className="text-slate-500 font-medium">Scenario:</span>
              <select
                id="scenario-selector-dropdown"
                value={selectedScenarioId}
                onChange={(e) => onSelectScenario(e.target.value)}
                className="bg-transparent text-[#0B5FA5] font-semibold focus:outline-none cursor-pointer pr-1"
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Simulator Button */}
            <button
              id="btn-custom-cyclone"
              onClick={onOpenCustomModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#0B5FA5] bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors shadow-sm"
              title="Simulate custom coordinates, pressure, and wind speed"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Simulate Storm</span>
            </button>

            {/* Google Sign-in / Profile */}
            {user ? (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-5 h-5 rounded-full border border-sky-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#0B5FA5] text-white flex items-center justify-center font-bold text-[10px]">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <span className="font-semibold text-slate-700 hidden lg:inline max-w-[110px] truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                {(user as any)?.isDemo && (
                  <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    Coordinator Session
                  </span>
                )}
                <button
                  onClick={onSignOut}
                  className="text-slate-400 hover:text-rose-600 ml-1 p-0.5 transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  id="btn-firebase-signin"
                  onClick={onSignIn}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#0B5FA5] hover:bg-[#0C4A8A] transition-colors shadow-sm cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Google Sign-In</span>
                </button>
              </div>
            )}

            {/* Model Info Modal Trigger */}
            <button
              id="btn-model-info"
              onClick={onOpenModelModal}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-[#0B5FA5] bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-sm"
              title="View Holland wind field & vulnerability scoring methodology"
            >
              <HelpCircle className="w-4 h-4 text-sky-600" />
              <span className="hidden md:inline">Logic</span>
            </button>
          </div>
        </div>
      </div>


      {/* Live Status Bar Under Header */}
      {currentScenario && (
        <div className="bg-gradient-to-r from-[#EAF6FF] via-[#F0F8FF] to-[#EAF6FF] border-t border-sky-100 px-4 py-1.5 text-xs text-slate-700">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              <span className="font-bold text-[#0C4A8A]">
                {currentScenario.name}
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600 font-medium">
                {currentScenario.landfallRegion}
              </span>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-600">
              <span>
                Peak Wind: <strong className="text-slate-900">{currentScenario.current.maxWindKmh} km/h</strong> (Gusts {currentScenario.current.gustsKmh} km/h)
              </span>
              <span className="hidden sm:inline">
                Central Pressure: <strong className="text-slate-900">{currentScenario.current.centralPressureHpa} hPa</strong>
              </span>
              <span className="hidden md:inline">
                Forward Speed: <strong className="text-slate-900">{currentScenario.current.forwardSpeedKmh} km/h</strong> @ {currentScenario.current.headingDeg}°
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                {currentScenario.category}
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
