import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { CycloneSelector } from './components/CycloneSelector.js';
import { MapView } from './components/MapView.js';
import { VulnerabilityPanel } from './components/VulnerabilityPanel.js';
import { PriorityList } from './components/PriorityList.js';
import { SummaryDashboard } from './components/SummaryDashboard.js';
import { GeminiChatbot } from './components/GeminiChatbot.js';
import { FirestorePersistencePanel } from './components/FirestorePersistencePanel.js';
import { ModelExplanationModal } from './components/ModelExplanationModal.js';
import { CustomCycloneModal } from './components/CustomCycloneModal.js';
import {
  fetchCyclones,
  fetchForecast,
  scoreVulnerability,
  addInfrastructurePlace
} from './api/client.js';
import {
  CycloneScenario,
  ForecastResult,
  InfrastructureFeature,
  ScoredAsset,
  VulnerabilitySummary,
  InfrastructureType
} from './types.js';
import { auth, signInWithGoogle, logOut, db } from './lib/firebase.js';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [scenarios, setScenarios] = useState<CycloneScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('fani-2019');
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [assets, setAssets] = useState<ScoredAsset[]>([]);
  const [summary, setSummary] = useState<VulnerabilitySummary | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<ScoredAsset | null>(null);

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  // Filters and Views
  const [activeView, setActiveView] = useState<'map' | 'priority' | 'summary' | 'chat' | 'persistence'>('map');
  const [selectedCategory, setSelectedCategory] = useState<InfrastructureType | 'all'>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All');
  const [showCone, setShowCone] = useState<boolean>(true);
  const [showTrack, setShowTrack] = useState<boolean>(true);

  // Modals
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState<boolean>(false);

  // Loading state
  const [loading, setLoading] = useState<boolean>(true);

  // 1. Listen for Firebase Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Sync user profile to Firestore
        setDoc(
          doc(db, 'users', currentUser.uid),
          {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName || 'Disaster Commander',
            role: 'DISASTER_COMMANDER',
            lastLogin: new Date().toISOString()
          },
          { merge: true }
        ).catch((err) => console.warn('Could not sync user profile:', err));
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Initial Load: Scenarios
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const data = await fetchCyclones();
        setScenarios(data);
        if (data.length > 0) {
          const initialId = data[0].id;
          setSelectedScenarioId(initialId);
          await loadScenarioData(initialId, data[0]);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Helper to load forecast & score infrastructure for a given scenario
  async function loadScenarioData(scenarioId: string, scenarioObj?: CycloneScenario) {
    try {
      setLoading(true);
      const [forecastRes, scoreRes] = await Promise.all([
        fetchForecast({ cycloneId: scenarioId }),
        scoreVulnerability({ cycloneId: scenarioId })
      ]);
      setForecast(forecastRes);
      setAssets(scoreRes.assets);
      setSummary(scoreRes.summary);
      if (scoreRes.assets.length > 0) {
        setSelectedAsset(scoreRes.assets[0]);
      }
    } catch (err) {
      console.error('Error loading scenario data:', err);
    } finally {
      setLoading(false);
    }
  }

  // When user picks a different scenario
  const handleSelectScenario = (id: string) => {
    setSelectedScenarioId(id);
    const scenario = scenarios.find((s) => s.id === id);
    loadScenarioData(id, scenario);
  };

  // When user simulates custom cyclone parameters
  const handleCustomSimulation = async (params: {
    lat: number;
    lon: number;
    forwardSpeedKmh: number;
    headingDeg: number;
    centralPressureHpa: number;
    maxWindKmh: number;
  }) => {
    try {
      setLoading(true);
      const [forecastRes, scoreRes] = await Promise.all([
        fetchForecast(params),
        scoreVulnerability({ customParams: params })
      ]);
      setForecast(forecastRes);
      setAssets(scoreRes.assets);
      setSummary(scoreRes.summary);
      if (scoreRes.assets.length > 0) {
        setSelectedAsset(scoreRes.assets[0]);
      }
      setActiveView('map');
    } catch (err) {
      console.error('Custom simulation error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add a new place / facility dynamically to the infrastructure layer
  const handleAddPlace = async (placeData: Partial<InfrastructureFeature>) => {
    try {
      await addInfrastructurePlace(placeData);
      // Reload current scenario data with the newly added place
      const currentScen = scenarios.find((s) => s.id === selectedScenarioId);
      await loadScenarioData(selectedScenarioId, currentScen);
    } catch (err) {
      console.error('Error adding place:', err);
      throw err;
    }
  };

  // Bookmark an asset to Firestore
  const handleBookmarkAsset = async (asset: ScoredAsset) => {
    if (!user) {
      alert('Please sign in with Google to save bookmarks to your disaster operations log.');
      await signInWithGoogle();
      return;
    }

    const bookmarkDocId = `bm-${asset.id}`;
    const isCurrentlyBookmarked = bookmarkedIds.has(asset.id);

    try {
      if (isCurrentlyBookmarked) {
        await deleteDoc(doc(db, 'users', user.uid, 'bookmarks', bookmarkDocId));
        setBookmarkedIds((prev) => {
          const next = new Set(prev);
          next.delete(asset.id);
          return next;
        });
      } else {
        await setDoc(doc(db, 'users', user.uid, 'bookmarks', bookmarkDocId), {
          id: bookmarkDocId,
          userId: user.uid,
          assetId: asset.id,
          assetName: asset.properties.name,
          riskTier: asset.score.riskTier,
          cycloneName: currentScenarioName,
          notes: `Prioritized during ${currentScenarioName}. Score: ${asset.score.vulnerabilityScore}/100. ${asset.properties.type} in ${asset.properties.district}.`,
          createdAt: new Date().toISOString()
        });
        setBookmarkedIds((prev) => new Set(prev).add(asset.id));
      }
    } catch (err) {
      console.error('Firestore bookmark save error:', err);
    }
  };

  // Save an AI Chat advisory to user directives
  const handleSaveChatBookmark = async (advisoryText: string) => {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    try {
      const dirId = `adv-${Date.now()}`;
      await setDoc(doc(db, 'incidents', dirId), {
        id: dirId,
        userId: user.uid,
        userEmail: user.email || 'commander@disaster.gov',
        title: `AI Tactical Directive: ${currentScenarioName}`,
        cycloneName: currentScenarioName,
        status: 'DISPATCHED',
        details: advisoryText.slice(0, 500) + '...',
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Save chat advisory error:', err);
    }
  };

  // Derive unique districts from loaded assets
  const districts = Array.from(new Set(assets.map((a) => a.properties.district))).sort();

  // Filter assets by selected Category and District
  const filteredAssets = assets.filter((a) => {
    const matchCat = selectedCategory === 'all' || a.properties.type === selectedCategory;
    const matchDist = selectedDistrict === 'All' || a.properties.district.toLowerCase() === selectedDistrict.toLowerCase();
    return matchCat && matchDist;
  });

  // Calculate category counts
  const categoryCounts: Record<string, number> = { all: assets.length };
  assets.forEach((a) => {
    const t = a.properties.type;
    categoryCounts[t] = (categoryCounts[t] || 0) + 1;
  });

  const criticalCount = assets.filter((a) => a.score.riskTier === 'critical').length;
  const highCount = assets.filter((a) => a.score.riskTier === 'high').length;
  const currentScenarioName =
    scenarios.find((s) => s.id === selectedScenarioId)?.name || forecast?.cycloneName || 'Tropical Cyclone';
  const currentScenarioObj = scenarios.find((s) => s.id === selectedScenarioId);

  return (
    <div className="min-h-screen bg-[#F5FAFF] flex flex-col font-['Inter',sans-serif]">
      {/* Top Navbar */}
      <Navbar
        scenarios={scenarios}
        selectedScenarioId={selectedScenarioId}
        onSelectScenario={handleSelectScenario}
        onOpenCustomModal={() => setIsCustomModalOpen(true)}
        onOpenModelModal={() => setIsModelModalOpen(true)}
        activeView={activeView}
        setActiveView={setActiveView}
        criticalCount={criticalCount}
        user={user}
        onSignIn={signInWithGoogle}
        onSignOut={logOut}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {/* Scenario Selector & Filters Bar (shown on Map & Priority tabs) */}
        {(activeView === 'map' || activeView === 'priority') && (
          <CycloneSelector
            scenarios={scenarios}
            selectedScenarioId={selectedScenarioId}
            onSelectScenario={handleSelectScenario}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            selectedDistrict={selectedDistrict}
            onSelectDistrict={setSelectedDistrict}
            categoryCounts={categoryCounts}
            districts={districts}
          />
        )}

        {/* Loading Overlay State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[450px] bg-white/70 backdrop-blur-sm rounded-2xl border border-sky-100 shadow-sm p-12">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-sky-100 border-t-[#0B5FA5] animate-spin" />
              <Loader2 className="w-8 h-8 text-[#0B5FA5] animate-spin" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm mt-4">
              Computing Holland Wind Swathe & Spatial Vulnerability Matrix...
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Intersecting 72-hour forecast uncertainty cone with critical coastal infrastructure
            </p>
          </div>
        ) : (
          <>
            {/* View 1: Map View & Vulnerability Inspector */}
            {activeView === 'map' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Map Area */}
                <div className="lg:col-span-8 h-[580px] lg:h-[680px]">
                  <MapView
                    forecast={forecast}
                    assets={filteredAssets}
                    selectedAsset={selectedAsset}
                    onSelectAsset={setSelectedAsset}
                    showCone={showCone}
                    setShowCone={setShowCone}
                    showTrack={showTrack}
                    setShowTrack={setShowTrack}
                    onAddPlace={handleAddPlace}
                  />
                </div>

                {/* Right Side Detail Panel */}
                <div className="lg:col-span-4">
                  <VulnerabilityPanel
                    asset={selectedAsset}
                    onClose={() => setSelectedAsset(null)}
                    cycloneName={currentScenarioName}
                    onBookmark={handleBookmarkAsset}
                    isBookmarked={selectedAsset ? bookmarkedIds.has(selectedAsset.id) : false}
                  />
                </div>
              </div>
            )}

            {/* View 2: Priority Action List */}
            {activeView === 'priority' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-8">
                  <PriorityList
                    assets={filteredAssets}
                    onSelectAsset={(asset) => {
                      setSelectedAsset(asset);
                      setActiveView('map');
                    }}
                    cycloneName={currentScenarioName}
                  />
                </div>
                <div className="lg:col-span-4">
                  <VulnerabilityPanel
                    asset={selectedAsset}
                    onClose={() => setSelectedAsset(null)}
                    cycloneName={currentScenarioName}
                    onBookmark={handleBookmarkAsset}
                    isBookmarked={selectedAsset ? bookmarkedIds.has(selectedAsset.id) : false}
                  />
                </div>
              </div>
            )}

            {/* View 3: District Summary & Rollup */}
            {activeView === 'summary' && (
              <SummaryDashboard
                summary={summary}
                assets={assets}
                cycloneName={currentScenarioName}
                districts={districts}
                selectedDistrict={selectedDistrict}
                onSelectDistrict={setSelectedDistrict}
              />
            )}

            {/* View 4: Gemini AI Multi-Turn Tactical Chatbot + Search & Maps Grounding */}
            {activeView === 'chat' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-8">
                  <GeminiChatbot
                    cycloneName={currentScenarioName}
                    landfallRegion={currentScenarioObj?.landfallRegion}
                    criticalCount={criticalCount}
                    highCount={highCount}
                    userEmail={user?.email}
                    onSaveBookmark={handleSaveChatBookmark}
                  />
                </div>
                <div className="lg:col-span-4 space-y-4">
                  <FirestorePersistencePanel
                    user={user}
                    cycloneName={currentScenarioName}
                  />
                </div>
              </div>
            )}

            {/* View 5: Firestore Directives & Persistence Log */}
            {activeView === 'persistence' && (
              <div className="max-w-4xl mx-auto">
                <FirestorePersistencePanel
                  user={user}
                  cycloneName={currentScenarioName}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <ModelExplanationModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
      />

      <CustomCycloneModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onSubmit={handleCustomSimulation}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-sky-100 py-4 mt-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0C4A8A]">Vayu</span>
            <span>•</span>
            <span>Early Action System for Disaster Management Authorities (SDMA / NDMA)</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Model: Holland Vortex Wind Decay + Hydrodynamic Surge</span>
            <span>•</span>
            <span>Powered by Gemini 3.5 Flash & Firebase</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
