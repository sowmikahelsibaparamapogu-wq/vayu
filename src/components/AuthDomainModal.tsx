import React, { useState } from 'react';
import {
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
  X,
  UserCheck,
  Globe,
  Settings
} from 'lucide-react';

interface AuthDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  hostname: string;
  projectId: string;
  onContinueDemo: () => void;
  userEmail?: string;
}

export const AuthDomainModal: React.FC<AuthDomainModalProps> = ({
  isOpen,
  onClose,
  hostname,
  projectId,
  onContinueDemo,
  userEmail = '249xa05219@gmail.com'
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentHost = hostname || (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
  const firebaseConsoleUrl = `https://console.firebase.google.com/project/${projectId || 'vibrant-dimension-rlsxp'}/authentication/settings`;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentHost);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      id="modal-auth-unauthorized-domain"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-sky-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#0C4A8A] via-[#0B5FA5] to-[#1D70B8] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <ShieldAlert className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">
                Firebase Domain Authorization Required
              </h3>
              <p className="text-[11px] text-sky-100/80">
                Google Sign-In Security Policy (auth/unauthorized-domain)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs text-slate-600">
          <p className="text-slate-700 leading-relaxed">
            Google Firebase Authentication requires that any web domain hosting your application must be added to your Firebase project&apos;s <strong>Authorized Domains</strong> allowlist before Google Sign-In popups can complete.
          </p>

          {/* Current Domain Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5 text-[11px]">
                <Globe className="w-3.5 h-3.5 text-[#0B5FA5]" />
                Your Current Application Domain:
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-white border border-slate-200 hover:bg-sky-50 hover:text-[#0B5FA5] text-slate-600 transition-colors shadow-2xs cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Domain</span>
                  </>
                )}
              </button>
            </div>
            <code className="block p-2 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-[#0B5FA5] break-all select-all font-semibold">
              {currentHost}
            </code>
          </div>

          {/* Steps to authorize in Firebase Console */}
          <div className="space-y-2 bg-sky-50/60 border border-sky-100 rounded-xl p-3.5 text-slate-700">
            <div className="font-bold text-[#0C4A8A] flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              <span>To Authorize Permanently in Firebase Console:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 pl-1 leading-relaxed">
              <li>
                Open the Firebase Console for project <strong>{projectId}</strong>.
              </li>
              <li>
                Under <strong>Authentication &gt; Settings &gt; Authorized domains</strong>, click <strong>Add domain</strong>.
              </li>
              <li>
                Paste <code className="bg-white px-1 py-0.5 rounded border text-[#0B5FA5]">{currentHost}</code> and click <strong>Add</strong>.
              </li>
            </ol>
            <div className="pt-1">
              <a
                href={firebaseConsoleUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B5FA5] hover:underline cursor-pointer"
              >
                <span>Open Firebase Authentication Settings</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Instant Emergency Coordinator Mode */}
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-950 space-y-2">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="font-bold text-xs text-emerald-900">
                Continue Immediately in Emergency Coordinator Mode
              </div>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              You can proceed immediately as <strong>{userEmail}</strong> (Disaster Commander) to test saving priority bookmarks, issuing tactical directives, and reviewing incident logs.
            </p>
            <button
              id="btn-continue-demo-coordinator"
              onClick={() => {
                onContinueDemo();
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Continue as Disaster Commander ({userEmail})</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
