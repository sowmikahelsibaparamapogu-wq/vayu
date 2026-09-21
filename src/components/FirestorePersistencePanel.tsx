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
  LogIn
} from 'lucide-react';
import {
  collection,
  query,
  onSnapshot,
  setDoc,
  deleteDoc,
  doc,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db, signInWithGoogle } from '../lib/firebase.js';
import { User } from 'firebase/auth';
import { OperationalBookmark, IncidentDirective } from '../types.js';

interface FirestorePersistencePanelProps {
  user: User | null;
  cycloneName: string;
}

export const FirestorePersistencePanel: React.FC<FirestorePersistencePanelProps> = ({
  user,
  cycloneName
}) => {
  const [bookmarks, setBookmarks] = useState<OperationalBookmark[]>([]);
  const [incidents, setIncidents] = useState<IncidentDirective[]>([]);
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'directives'>('directives');
  const [newTitle, setNewTitle] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [saving, setSaving] = useState(false);

  // 1. Subscribe to User Bookmarks
  useEffect(() => {
    if (!user) {
      setBookmarks([]);
      return;
    }

    const bookmarksRef = collection(db, 'users', user.uid, 'bookmarks');
    const unsub = onSnapshot(bookmarksRef, (snapshot) => {
      const bList: OperationalBookmark[] = [];
      snapshot.forEach((docSnap) => {
        bList.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      setBookmarks(bList);
    });

    return () => unsub();
  }, [user]);

  // 2. Subscribe to Shared Incident Directives
  useEffect(() => {
    if (!user) {
      setIncidents([]);
      return;
    }

    const incidentsRef = collection(db, 'incidents');
    const unsub = onSnapshot(incidentsRef, (snapshot) => {
      const iList: IncidentDirective[] = [];
      snapshot.forEach((docSnap) => {
        iList.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      setIncidents(iList);
    });

    return () => unsub();
  }, [user]);

  // Log new operational directive to Firestore
  const handleCreateDirective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle.trim()) return;

    try {
      setSaving(true);
      const incidentId = `dir-${Date.now()}`;
      await setDoc(doc(db, 'incidents', incidentId), {
        id: incidentId,
        userId: user.uid,
        userEmail: user.email || 'coordinator@disaster.gov',
        title: newTitle.trim(),
        cycloneName,
        status: 'DISPATCHED',
        details: newDetails.trim() || 'Dispatched for operational ground execution.',
        createdAt: new Date().toISOString()
      });
      setNewTitle('');
      setNewDetails('');
    } catch (err) {
      console.error('Error logging incident directive:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBookmark = async (bId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'bookmarks', bId));
    } catch (err) {
      console.error('Delete bookmark error:', err);
    }
  };

  const handleDeleteDirective = async (iId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'incidents', iId));
    } catch (err) {
      console.error('Delete directive error:', err);
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
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
          Sign in with your Google account via Firebase Authentication to persist incident command directives, priority facility bookmarks, and field dispatch notes across devices.
        </p>
        <button
          onClick={() => signInWithGoogle()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B5FA5] hover:bg-[#0C4A8A] text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          <span>Sign In with Google</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileCheck2 className="w-4 h-4 text-[#0B5FA5]" />
          <h3 className="font-bold text-slate-800 text-xs tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">
            Firestore Disaster Management Log
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
                  <span>{saving ? 'Syncing to Firestore...' : 'Dispatch Directive'}</span>
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
