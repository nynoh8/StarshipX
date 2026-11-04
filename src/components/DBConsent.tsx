import React, { useState, useEffect } from "react";
import { Shield, Check, X, Database, AlertTriangle } from "lucide-react";
import { Language, translations } from "../utils/translations";

interface DBConsentProps {
  lang: Language;
  onConsentChange?: (granted: boolean) => void;
}

export function DBConsent({ lang, onConsentChange }: DBConsentProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [consentState, setConsentState] = useState<"pending" | "granted" | "denied">("pending");

  useEffect(() => {
    const savedConsent = localStorage.getItem("db_consent_granted");
    if (savedConsent === null) {
      // No consent decision saved yet -> show prompt after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      const isGranted = savedConsent === "true";
      setConsentState(isGranted ? "granted" : "denied");
      // Double check that the cookie matches localStorage
      document.cookie = `db_consent_granted=${isGranted}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, []);

  const handleChoice = (granted: boolean) => {
    localStorage.setItem("db_consent_granted", String(granted));
    document.cookie = `db_consent_granted=${granted}; path=/; max-age=31536000; SameSite=Lax`;
    setConsentState(granted ? "granted" : "denied");
    setIsVisible(false);
    
    if (onConsentChange) {
      onConsentChange(granted);
    }

    // Refresh page / reload components to update all session indicators smoothly
    window.location.reload();
  };

  const t = (key: string) => {
    return translations[lang]?.[key] || translations["en"]?.[key] || key;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-emerald-500/30 rounded-2xl w-full max-w-xl shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden font-sans animate-in zoom-in-95 duration-300">
        <div className="p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 shrink-0">
              <Database className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                {t("dbConsentTitle")}
              </h2>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-400 font-semibold uppercase">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>LGPD &amp; GDPR Compliance</span>
              </div>
            </div>
          </div>

          <p className="text-zinc-300 text-sm leading-relaxed mb-6 bg-zinc-900/40 p-4 rounded-xl border border-white/5 font-sans">
            {t("dbConsentDesc")}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => handleChoice(true)}
              className="w-full sm:flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <Check className="w-4 h-4 stroke-[3px]" />
              {t("dbConsentAllow")}
            </button>
            <button
              onClick={() => handleChoice(false)}
              className="w-full sm:flex-1 bg-zinc-900 hover:bg-zinc-855 text-zinc-300 hover:text-white font-bold py-3 px-4 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <X className="w-4 h-4 stroke-[3px]" />
              {t("dbConsentLocal")}
            </button>
          </div>
        </div>

        {/* Informative Footer */}
        <div className="px-6 py-3 bg-zinc-900/50 border-t border-zinc-900 text-[10px] text-zinc-500 flex justify-between font-mono">
          <span>SECURE END-TO-END CRYPTO</span>
          <span>POSTGRESQL &amp; SESSION FALLBACK</span>
        </div>
      </div>
    </div>
  );
}
