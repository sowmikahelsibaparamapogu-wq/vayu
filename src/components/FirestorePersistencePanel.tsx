import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  Trash2,
  ExternalLink,
  Plus,
  FileCheck2,
  ShieldCheck,
  AlertTriangle,
  Send,
  Building2,
  Clock,
  LogIn,
  UserCheck,
  Settings,
  Info
} from 'lucide-react';
import {
  collection,
  query,
  onSnapshot,
  setDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db, signInWithGoogle, handleFirestoreError, AppUserProfile } from '../lib/firebase.js';
import { User } from 'firebase/auth';
import { OperationalBookmark, IncidentDirective } from '../types.js';

interface FirestorePersistencePanelProps {
  user: User | AppUserProfile | null;
  cycloneName: string;
  onSignIn?: () => void;
  onOpenDomainHelp?: () => void;
  onContinueDemo?: () => void;
}

const LOCAL_STORAGE_BOOKMARKS_KEY = 'vayu_local_bookmarks';
const LOCAL_STORAGE_DIRECTIVES_KEY = 'vayu_local_directives';

export const FirestorePersistencePanel: React.FC<FirestorePersistencePanelProps> = ({
  user,
  cycloneName,
  onSignIn,
  onOpenDomainHelp,
  onContinueDemo
}) => {
  const [bookmarks, setBookmarks] = useState<OperationalBookmark[]>([]);
  const [incidents, setIncidents] = useState<IncidentDirective[]>([]);
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'directives'>('directives');
  const [newTitle, setNewTitle] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [saving, setSaving] = useState(false);

  const isDemo = (user as any)?.isDemo;

  // 1. Subscribe to User Bookmarks
  useEffect(() => {
    if (!user) {
      setBookmarks([]);
      return;
    }

    if (isDemo) {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_BOOKMARKS_KEY);
        if (raw) {
          setBookmarks(JSON.parse(raw));
        } else {
          // Pre-seed with current storm operational bookmark if empty
          const sample: OperationalBookmark[] = [
            {
              id: 'bm-init-1',
              userId: user.uid,
              assetId: 'paradeep-port-hospital',
              assetName: 'Paradeep Port Trust Hospital',
              cycloneName,
              riskTier: 'critical',
              notes: 'Prioritized facility: ICU backup generator fuel topped up to 48 hrs.',
              createdAt: new Date().toISOString()
            }
          ];
          setBookmarks(sample);
          localStorage.setItem(LOCAL_STORAGE_BOOKMARKS_KEY, JSON.stringify(sample));
        }
      } catch (err) {
        console.warn('Local bookmarks read error:', err);
      }
      return;
    }

    const bookmarksRef = collection(db, 'users', user.uid, 'bookmarks');
    const unsub = onSnapshot(
      bookmarksRef,
      (snapshot) => {
        const bList: OperationalBookmark[] = [];
        snapshot.forEach((docSnap) => {
          bList.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        setBookmarks(bList);
      },
      (error) => {
        handleFirestoreError(error, 'list', `users/${user.uid}/bookmarks`);
      }
    );

    return () => unsub();
  }, [user, isDemo, cycloneName]);

  // 2. Subscribe to Shared Incident Directives
  useEffect(() => {
    if (!user) {
      setIncidents([]);
      return;
    }

    if (isDemo) {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_DIRECTIVES_KEY);
        if (raw) {
          setIncidents(JSON.parse(raw));
        } else {
          const sample: IncidentDirective[] = [
            {
              id: 'dir-init-1',
              userId: user.uid,
              userEmail: user.email || 'coordinator@disaster.gov',
              title: `Deploy NDRF Team 3 to Paradeep Lifeline Road`,
              cycloneName,
              status: 'DISPATCHED',
              details: 'Pre-position heavy clearing machinery and tree cutters along SH-12.',
              createdAt: new Date(Date.now() - 3600000).toISOString()
            }
          ];
          setIncidents(sample);
          localStorage.setItem(LOCAL_STORAGE_DIRECTIVES_KEY, JSON.stringify(sample));
        }
      } catch (err) {
        console.warn('Local directives read error:', err);
      }
      return;
    }

    const incidentsRef = collection(db, 'incidents');
    const unsub = onSnapshot(
      incidentsRef,
      (snapshot) => {
        const iList: IncidentDirective[] = [];
        snapshot.forEach((docSnap) => {
          iList.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        setIncidents(iList);
      },
      (error) => {
        handleFirestoreError(error, 'list', 'incidents');
      }
    );

    return () => unsub();
  }, [user, isDemo, cycloneName]);

  // Log new operational directive
  const handleCreateDirective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle.trim()) return;

    try {
      setSaving(true);
      const incidentId = `dir-${Date.now()}`;
      const newDirective: IncidentDirective = {
        id: incidentId,
        userId: user.uid,
        userEmail: user.email || 'coordinator@disaster.gov',
        title: newTitle.trim(),
        cycloneName,
        status: 'DISPATCHED',
        details: newDetails.trim() || 'Dispatched for operational ground execution.',
        createdAt: new Date().toISOString()
      };

      if (isDemo) {
        const updated = [newDirective, ...incidents];
        setIncidents(updated);
        try {
          localStorage.setItem(LOCAL_STORAGE_DIRECTIVES_KEY, JSON.stringify(updated));
        } catch (e) {
          console.warn('Failed to save to localStorage:', e);
        }
      } else {
        await setDoc(doc(db, 'incidents', incidentId), newDirective);
      }

      setNewTitle('');
      setNewDetails('');
    } catch (err) {
      if (!isDemo) {
        handleFirestoreError(err, 'create', `incidents/${Date.now()}`);
      } else {
        console.error('Error logging incident directive:', err);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBookmark = async (bId: string) => {
    if (!user) return;
    try {
      if (isDemo) {
        const updated = bookmarks.filter((b) => b.id !== bId);
        setBookmarks(updated);
        localStorage.setItem(LOCAL_STORAGE_BOOKMARKS_KEY, JSON.stringify(updated));
      } else {
        await deleteDoc(doc(db, 'users', user.uid, 'bookmarks', bId));
      }
    } catch (err) {
      if (!isDemo) {
        handleFirestoreError(err, 'delete', `users/${user.uid}/bookmarks/${bId}`);
      } else {
        console.error('Delete bookmark error:', err);
      }
    }
  };

  const handleDeleteDirective = async (iId: string) => {
    if (!user) return;
    try {
      if (isDemo) {
        const updated = incidents.filter((i) => i.id !== iId);
        setIncidents(updated);
        localStorage.setItem(LOCAL_STORAGE_DIRECTIVES_KEY, JSON.stringify(updated));
      } else {
        await deleteDoc(doc(db, 'incidents', iId));
      }
    } catch (err) {
      if (!isDemo) {
        handleFirestoreError(err, 'delete', `incidents/${iId}`);
      } else {
        console.error('Delete directive error:', err);
      }
    }
  };

  if (!user) {
    return (
      <div className="bg-white rounded-2xl border border-sky-100 p-8 shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0B5FA5] flex items-center justify-center mx-auto mb-3 border border-sky-200">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-slate-800 text-base font-['Plus_Jakarta_Sans',sans-serif]">
          Firestore Operational Persistence
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5 leading-relaxed">
          Sign in to persist incident command directives, priority facility bookmarks, and field dispatch notes across devices.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            id="btn-persistence-signin-google"
            onClick={() => (onSignIn ? onSignIn() : signInWithGoogle())}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B5FA5] hover:bg-[#0C4A8A] text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In with Google</span>
          </button>
          {onContinueDemo && (
            <button
              id="btn-persistence-demo-mode"
              onClick={onContinueDemo}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Continue in Coordinator Mode</span>
            </button>
          )}
        </div>
        {onOpenDomainHelp && (
          <div className="mt-4">
            <button
              onClick={onOpenDomainHelp}
              className="text-[11px] text-slate-400 hover:text-[#0B5FA5] inline-flex items-center gap-1 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Firebase Domain Authorization Guide</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden flex flex-col">
      {/* Demo notice banner if applicable */}
      {isDemo && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span className="font-semibold">
              Operating as Disaster Commander ({user.email})
            </span>
            <span className="hidden sm:inline text-amber-700 text-[11px]">
              — Local persistence active.
            </span>
          </div>
          {onOpenDomainHelp && (
            <button
              onClick={onOpenDomainHelp}
              className="text-[11px] font-bold text-amber-900 hover:text-amber-950 underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Settings className="w-3 h-3" />
              <span>Authorize Domain in Firebase</span>
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileCheck2 className="w-4 h-4 text-[#0B5FA5]" />
          <h3 className="font-bold text-slate-800 text-xs tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">
            {isDemo ? 'Emergency Directives & Saved Facilities' : 'Firestore Disaster Management Log'}
          </h3>
        </div>
        <div className="flex items-center space-x-1 bg-white p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab('directives')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'directives'
                ? 'bg-[#0B5FA5] text-white font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Directives ({incidents.length})
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'bookmarks'
                ? 'bg-[#0B5FA5] text-white font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Saved Assets ({bookmarks.length})
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Directives Tab */}
        {activeTab === 'directives' && (
          <div className="space-y-4">
            {/* Create Directive Form */}
            <form onSubmit={handleCreateDirective} className="bg-sky-50/50 rounded-xl p-3.5 border border-sky-100 space-y-2.5">
              <span className="text-[11px] font-bold text-[#0B5FA5] uppercase tracking-wider block">
                Log New Action Directive ({cycloneName})
              </span>
              <input
                type="text"
                placeholder="e.g., Deploy 10 high-output dewatering pumps to Paradeep Port area"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#0B5FA5]"
                required
              />
              <textarea
                placeholder="Operational notes, assigned team (e.g., NDRF 3rd Bn, SEOC, DISCOM), contact..."
                value={newDetails}
                onChange={(e) => setNewDetails(e.target.value)}
                rows={2}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#0B5FA5]"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving || !newTitle.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-[#0B5FA5] hover:bg-[#0C4A8A] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                  <span>{saving ? 'Syncing...' : 'Dispatch Directive'}</span>
                </button>
              </div>
            </form>

            {/* List of Directives */}
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {incidents.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No incident directives logged yet. Use the form above to record disaster actions.
                </div>
              ) : (
                incidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex items-start justify-between gap-3 text-xs shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{inc.title}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {inc.status}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{inc.details}</p>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <span>By: {inc.userEmail}</span>
                        <span>•</span>
                        <span>{new Date(inc.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    {inc.userId === user.uid && (
                      <button
                        onClick={() => handleDeleteDirective(inc.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        title="Delete directive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Bookmarks Tab */}
        {activeTab === 'bookmarks' && (
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {bookmarks.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No saved infrastructure facilities. Click &quot;Bookmark Facility&quot; on any asset card to save it for persistent tracking.
              </div>
            ) : (
              bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="p-3 bg-white border border-slate-200 rounded-xl flex items-start justify-between gap-3 text-xs shadow-2xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-[#0B5FA5]" />
                      <span className="font-bold text-slate-800">{bm.assetName}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800">
                        {bm.riskTier}
                      </span>
                    </div>
                    {bm.notes && <p className="text-slate-600 text-[11px] mt-1">{bm.notes}</p>}
                    <div className="text-[10px] text-slate-400 mt-1">
                      Saved during {bm.cycloneName} • {new Date(bm.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteBookmark(bm.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                    title="Remove bookmark"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
