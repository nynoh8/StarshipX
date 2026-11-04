import React from "react";
import { Shield, Lock, Trash2, Download } from "lucide-react";
import { Language, translations } from "../../utils/translations";

export const PrivacyPolicy = ({ onBack, lang }: { onBack: () => void; lang: Language }) => {
  const t = (key: string) => {
    return translations[lang]?.[key] || translations["en"]?.[key] || key;
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={onBack}
          className="mb-8 text-emerald-400 hover:text-emerald-300 flex items-center gap-2 transition-colors font-sans"
        >
          <Shield className="w-4 h-4" />
          <span>{t("backToApp")}</span>
        </button>

        <h1 className="text-4xl font-bold mb-8 flex items-center gap-3">
          <Lock className="w-8 h-8 text-emerald-500" />
          {t("privacyPolicyTitle")}
        </h1>

        <section className="space-y-6 text-gray-300 leading-relaxed font-sans">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">{t("overviewTitle")}</h2>
            <p>
              {t("overviewDesc")}
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">{t("dataCollectionTitle")}</h2>
            <p>{t("dataCollectionDesc")}</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>{t("authDataLabel")}</strong> {t("authDataDesc")}</li>
              <li><strong>{t("gameplayDataLabel")}</strong> {t("gameplayDataDesc")}</li>
              <li><strong>{t("technicalDataLabel")}</strong> {t("technicalDataDesc")}</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">{t("purposeTitle")}</h2>
            <p>{t("purposeDesc")}</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>{t("purpose1")}</li>
              <li>{t("purpose2")}</li>
              <li>{t("purpose3")}</li>
              <li>{t("purpose4")}</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">{t("rightsTitle")}</h2>
            <p>{t("rightsDesc")}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <h3 className="text-emerald-400 font-medium mb-1 flex items-center gap-2">
                  <Download className="w-4 h-4" /> {t("rightAccessTitle")}
                </h3>
                <p className="text-sm">{t("rightAccessDesc")}</p>
              </div>
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <h3 className="text-red-400 font-medium mb-1 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> {t("rightErasureTitle")}
                </h3>
                <p className="text-sm">{t("rightErasureDesc")}</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">{t("retentionTitle")}</h2>
            <p>{t("retentionDesc")}</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">{t("termsTitle")}</h2>
            <p>
              {t("termsDesc")}
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>{t("terms1")}</li>
              <li>{t("terms2")}</li>
              <li>{t("terms3")}</li>
              <li>{t("terms4")}</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">{t("contactTitle")}</h2>
            <p>{t("contactDesc")}</p>
          </div>
        </section>

        <div className="mt-12 pt-8 border-t border-white/10 text-xs text-gray-500 text-center font-mono">
          {t("lastUpdated")}: {new Date().toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US")}
        </div>
      </div>
    </div>
  );
};
