import React, { useState, useEffect } from "react";
import { Cookie, X, Check } from "lucide-react";
import { Language, translations } from "../../utils/translations";

export const CookieConsent = ({ lang }: { lang: Language }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookie-consent", "declined");
    setIsVisible(false);
  };

  const t = (key: string) => {
    return translations[lang]?.[key] || translations["en"]?.[key] || key;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:max-w-sm z-[100] animate-in fade-in slide-in-from-bottom-5 duration-500 font-sans">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Cookie className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-white font-semibold mb-1 text-base">{t("cookieTitle")}</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              {t("cookieDesc")}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleAccept}
            className="flex-1 bg-white text-black text-xs font-bold py-2.5 rounded-lg hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-3 h-3" />
            {t("acceptAll")}
          </button>
          <button
            onClick={handleDecline}
            className="flex-1 bg-zinc-800 text-white text-xs font-bold py-2.5 rounded-lg hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            {t("essentialOnly")}
          </button>
        </div>
        
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute top-2 right-2 p-1 text-zinc-500 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
