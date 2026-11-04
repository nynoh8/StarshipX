import React, { useState } from "react";
import { User, Sparkles, X, Rocket, ShieldCheck } from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (userData: any) => void;
  lang: string;
}

const COOL_PILOT_NAMES = [
  "StarLord", "Viper", "Ghost", "Phoenix", "Nova", 
  "CyberFox", "Nebula", "AstroAce", "Orion", "ShadowWing"
];

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  lang,
}) => {
  const isPt = lang === "pt";
  const [pilotName, setPilotName] = useState(() => {
    return COOL_PILOT_NAMES[Math.floor(Math.random() * COOL_PILOT_NAMES.length)];
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSavePilot = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = pilotName.trim();
    if (!cleanName) return;

    setLoading(true);
    setErrorMsg(null);

    let data: any = null;
    try {
      const res = await fetch("/api/auth/guest-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName }),
      });
      if (res.ok) {
        data = await res.json();
      }
    } catch (err: any) {}

    if (!data) {
      // Fallback for static GitHub Pages host
      const baseSeed = cleanName.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 8) || "STAR77";
      data = {
        id: "pilot_" + Math.random().toString(36).substring(2, 8),
        dbId: "pilot_" + Math.random().toString(36).substring(2, 8),
        name: cleanName,
        picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`,
        ships: [{ id: "starter", seed: baseSeed, vida: 120, posicao_x: 0, posicao_y: 0, posicao_z: -2800 }]
      };
    }

    onLoginSuccess(data);
    onClose();
    setLoading(false);
  };

  const handleRandomizeName = () => {
    const randomPick = COOL_PILOT_NAMES[Math.floor(Math.random() * COOL_PILOT_NAMES.length)];
    const num = Math.floor(10 + Math.random() * 89);
    setPilotName(`${randomPick}_${num}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#0c1017] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl text-white overflow-hidden flex flex-col">
        {/* Glow */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                {isPt ? "Identificação do Piloto P2P" : "P2P Pilot Identification"}
              </h2>
              <p className="text-xs text-gray-400">
                {isPt ? "Zero chaves ou senhas necessárias. Jogue direto!" : "Zero keys or credentials required. Play directly!"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSavePilot} className="mt-6 flex flex-col gap-4 relative z-10">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                {isPt ? "Codinome do Piloto" : "Pilot Call Sign"}
              </span>
              <button
                type="button"
                onClick={handleRandomizeName}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 normal-case flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                {isPt ? "Gerar Aleatório" : "Randomize"}
              </button>
            </label>
            <input
              type="text"
              value={pilotName}
              onChange={(e) => setPilotName(e.target.value.substring(0, 16))}
              maxLength={16}
              placeholder={isPt ? "Ex: StarLord" : "e.g. StarLord"}
              className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-emerald-500 transition-colors font-medium"
              required
            />
            <p className="text-[11px] text-gray-500">
              {isPt 
                ? "Este nome aparecerá nos combates espaciais P2P e no ranking de naves."
                : "This call sign will appear in P2P space dogfights and rankings."}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
              {errorMsg}
            </div>
          )}

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="submit"
              disabled={loading || !pilotName.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-emerald-950/40 text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Rocket className="w-4 h-4" />
              <span>{loading ? (isPt ? "Entrando..." : "Entering...") : (isPt ? "Pronto para o Combate" : "Ready for Battle")}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-medium rounded-xl transition-colors text-xs"
            >
              {isPt ? "Continuar sem salvar" : "Continue without saving"}
            </button>
          </div>

          <div className="mt-2 p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2.5 text-xs text-gray-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {isPt 
                ? "Conexão P2P descentralizada ativa: nenhuma chave de terceiros é necessária." 
                : "Decentralized P2P connection active: no third-party keys required."}
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};
