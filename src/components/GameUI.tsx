import React, { useState, useEffect } from "react";
import {
  Rocket,
  Trophy,
  Sliders,
  ChevronRight,
  ChevronLeft,
  X,
  Shield,
  Crosshair,
  Users,
  Timer,
  Swords,
  LogOut,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  Volume1,
  Music,
  Share2,
  Check,
  RotateCcw,
  Infinity as InfinityIcon
} from "lucide-react";
import { playerState } from "../game/state";
import { Language, translations } from "../utils/translations";
import {
  getSolarAudioState,
  setSolarVolume,
  toggleSolarMute,
  subscribeSolarAudio,
} from "../utils/solarAudio";
import { shareRoomLink } from "../utils/shareRoom";
import { ShareRoomModal } from "./ShareRoomModal";

const t = (key: string, lang: Language = "en") => {
  return translations[lang]?.[key] || translations["en"]?.[key] || key;
};

export function MissileCooldownUI({ lang = "en" }: { lang?: Language }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - playerState.lastMissileTime;
      const p = Math.min(100, (elapsed / 10000) * 100);
      setProgress(p);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-black/40 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs text-gray-300 font-mono font-semibold flex items-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5 text-orange-400" />
          <span>{t("missile", lang)} (F / Botão)</span>
        </p>
        <span className={`text-[10px] font-mono font-bold ${progress === 100 ? "text-orange-400" : "text-gray-400"}`}>
          {progress === 100 ? "100%" : `${Math.floor(progress)}%`}
        </span>
      </div>
      <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-white/10">
        <div
          className={`h-full transition-all duration-100 ${
            progress === 100
              ? "bg-gradient-to-r from-orange-500 to-amber-400"
              : "bg-gray-700"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {progress === 100 && (
        <p className="text-[10px] text-orange-400 mt-1 animate-pulse font-bold font-mono">
          {t("readyToFire", lang)}
        </p>
      )}
    </div>
  );
}

export function GameUI({
  showUI,
  setShowUI,
  playersCount,
  health,
  isDead,
  leaderboard,
  socketId,
  onExit,
  matchTime,
  matchResults,
  mode,
  eliminatedReason,
  respawnCountdown,
  lang = "en",
  roomInfo,
  roomId,
}: {
  showUI?: boolean;
  setShowUI?: (v: boolean) => void;
  playersCount: number;
  health: number;
  isDead: boolean;
  leaderboard: any[];
  socketId: string | undefined;
  onExit: () => void;
  matchTime: number;
  matchResults: any[] | null;
  mode: "training" | "multiplayer";
  eliminatedReason?: string | null;
  respawnCountdown?: number | null;
  lang?: Language;
  roomInfo?: {
    mediaType?: "youtube" | "image" | "none";
    mediaUrl?: string;
    roomName?: string;
    duration?: number;
    deathMode?: "respawn" | "elimination";
    maxPlayers?: number;
  };
  roomId?: string;
}) {
  const isPt = lang === "pt";
  // All menus are minimized by default when entering flight or battle!
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [audioState, setAudioState] = useState(() => getSolarAudioState());
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const handleShareRoom = () => {
    if (mode === "training") return;
    setShareModalOpen(true);
  };

  useEffect(() => {
    const unsub = subscribeSolarAudio(() => {
      setAudioState({ ...getSolarAudioState() });
    });
    return unsub;
  }, []);

  const hasSolarVideo = roomInfo?.mediaType === "youtube";

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      {/* ======================================================== */}
      {/* 1. DOCKED TAB ON THE LEFT EDGE (MINIMIZED TRIGGER)      */}
      {/* Clicking expands the menu drawer from left to right     */}
      {/* ======================================================== */}
      {!isDrawerOpen && (
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-40 pointer-events-auto flex items-center py-3.5 px-2 sm:px-2.5 bg-black/85 hover:bg-black text-white border-y border-r border-emerald-500/60 hover:border-emerald-400 rounded-r-2xl shadow-[0_0_25px_rgba(16,185,129,0.35)] backdrop-blur-md transition-all duration-200 group cursor-pointer hover:scale-105 active:scale-95"
          title={isPt ? "Expandir Painel do Piloto (Abre da esquerda para direita)" : "Expand Pilot Drawer"}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30 transition-colors">
              <Sliders className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest [writing-mode:vertical-lr] text-emerald-300">
              {isPt ? "PAINEL" : "MENU"}
            </span>
            <ChevronRight className="w-4 h-4 text-emerald-400 animate-pulse group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      )}

      {/* ======================================================== */}
      {/* 2. TRANSLUCENT BACKDROP WHEN DRAWER IS OPEN              */}
      {/* ======================================================== */}
      {isDrawerOpen && (
        <div
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 pointer-events-auto transition-opacity animate-fadeIn"
        />
      )}

      {/* ======================================================== */}
      {/* 3. SLIDE-OVER DRAWER (SLIDES FROM LEFT TO RIGHT)        */}
      {/* ======================================================== */}
      <div
        className={`fixed top-0 left-0 bottom-0 w-80 sm:w-96 bg-[#0a0f18]/95 backdrop-blur-2xl border-r border-emerald-500/30 shadow-[15px_0_50px_rgba(0,0,0,0.85)] z-50 flex flex-col transition-transform duration-300 ease-out pointer-events-auto font-sans ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-black shadow-md shadow-emerald-500/20">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight leading-tight">
                StarshipX Battle
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-md border border-emerald-500/30">
                  {mode === "training" ? t("training", lang) : t("multiplayer", lang)}
                </span>
                {roomInfo?.roomName && (
                  <span className="text-[10px] text-gray-400 truncate max-w-[120px]">
                    {roomInfo.roomName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsDrawerOpen(false)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-colors text-xs font-semibold border border-white/10"
            title={isPt ? "Minimizar painel" : "Minimize panel"}
          >
            <ChevronLeft className="w-4 h-4 text-emerald-400" />
            <span>{isPt ? "Minimizar" : "Close"}</span>
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 font-mono text-xs pr-4">
          {/* Share Room Card (Multiplayer only - not available in training mode) */}
          {mode !== "training" && (
            <div className="p-3 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-500/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  {isPt ? "Compartilhar Sala" : "Share Room"}
                </span>
                {shareFeedback && (
                  <span className="text-[10px] text-emerald-300 font-bold font-mono animate-pulse flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    {shareFeedback}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-300 font-sans leading-tight">
                {isPt
                  ? "Envie o link de convite para outros pilotos entrarem direto nesta sala!"
                  : "Send this direct invite link for other pilots to join this battle arena!"}
              </p>
              <button
                onClick={handleShareRoom}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/40 active:scale-98"
              >
                {shareFeedback ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{shareFeedback || (isPt ? "Copiar Link de Convite" : "Copy Invite Link")}</span>
              </button>
            </div>
          )}

          {/* Match Timer & Pilot Count */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-black/50 border border-emerald-500/30 rounded-xl">
              <span className="text-[10px] text-emerald-400/80 uppercase font-semibold block flex items-center gap-1">
                <Timer className="w-3 h-3" />
                {t("matchTime", lang)}
              </span>
              <span
                className={`text-xl font-bold font-mono block mt-0.5 ${
                  roomInfo?.duration === 0
                    ? "text-blue-300 flex items-center gap-1.5"
                    : matchTime < 30
                    ? "text-red-400 animate-pulse"
                    : "text-white"
                }`}
              >
                {roomInfo?.duration === 0 ? (
                  <>
                    <InfinityIcon className="w-5 h-5 text-blue-400 animate-pulse" />
                    <span className="text-sm font-sans">{isPt ? "Sem tempo" : "No Limit"}</span>
                  </>
                ) : (
                  formatTime(matchTime)
                )}
              </span>
            </div>

            <div className="p-3 bg-black/50 border border-white/10 rounded-xl">
              <span className="text-[10px] text-gray-400 uppercase font-semibold block flex items-center gap-1">
                <Users className="w-3 h-3" />
                {t("playersOnline", lang)}
              </span>
              <span className="text-xl font-bold text-emerald-400 font-mono block mt-0.5">
                {playersCount}/{roomInfo?.maxPlayers && roomInfo.maxPlayers > 0 ? roomInfo.maxPlayers : "∞"}
              </span>
            </div>
          </div>

          {/* Hull Integrity */}
          <div className="p-3.5 bg-black/40 backdrop-blur-md rounded-xl border border-white/10">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-300 font-semibold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t("hullIntegrity", lang)}</span>
              </span>
              <span
                className={`font-bold font-mono text-xs ${
                  health > 50 ? "text-emerald-400" : health > 20 ? "text-yellow-400" : "text-red-400"
                }`}
              >
                {Math.max(0, Math.floor(health))}%
              </span>
            </div>
            <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-white/10">
              <div
                className={`h-full transition-all duration-300 ${
                  health > 50
                    ? "bg-emerald-500"
                    : health > 20
                    ? "bg-yellow-500"
                    : "bg-red-500 animate-pulse"
                }`}
                style={{ width: `${Math.max(0, Math.min(100, health))}%` }}
              />
            </div>
          </div>

          {/* Missile Cooldown */}
          <MissileCooldownUI lang={lang} />

          {/* Solar Video Audio Control (When room has YouTube projected on Sun) */}
          {hasSolarVideo && (
            <div className="p-3.5 bg-gradient-to-br from-amber-500/10 via-black/40 to-black/60 backdrop-blur-md rounded-xl border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-amber-500/20">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-amber-400" />
                  {isPt ? "Áudio do Vídeo no Sol" : "Sun Video Audio"}
                </span>
                <span className={`text-[10px] font-mono font-bold ${audioState.isMuted ? "text-red-400" : "text-amber-300"}`}>
                  {audioState.isMuted ? (isPt ? "Mudo" : "Muted") : `${audioState.volume}%`}
                </span>
              </div>

              {/* Volume Slider & Mute Toggle */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => toggleSolarMute()}
                  className={`p-2 rounded-lg border transition-all cursor-pointer ${
                    audioState.isMuted
                      ? "bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                  }`}
                  title={audioState.isMuted ? (isPt ? "Ativar Áudio do Vídeo" : "Unmute Video Audio") : (isPt ? "Mutar Áudio" : "Mute Video")}
                >
                  {audioState.isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : audioState.volume > 50 ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <Volume1 className="w-4 h-4" />
                  )}
                </button>

                <div className="flex-1 flex flex-col gap-1">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={audioState.isMuted ? 0 : audioState.volume}
                    onChange={(e) => setSolarVolume(Number(e.target.value))}
                    className="w-full accent-amber-400 h-2 bg-gray-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Preset buttons */}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                {[0, 25, 50, 75, 100].map((v) => (
                  <button
                    key={v}
                    onClick={() => setSolarVolume(v)}
                    className={`flex-1 py-1 text-[10px] font-mono rounded font-semibold transition-colors border cursor-pointer ${
                      !audioState.isMuted && audioState.volume === v
                        ? "bg-amber-500 text-black border-amber-400 font-bold shadow-xs"
                        : "bg-white/5 hover:bg-white/10 text-gray-300 border-white/10"
                    }`}
                  >
                    {v === 0 ? "0%" : `${v}%`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Controls Cheat Sheet */}
          <div className="p-3.5 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10 mb-2">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                {isPt ? "Comandos de Voo" : "Flight Controls"}
              </span>
              <span className="text-[10px] text-gray-500">Teclado</span>
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] text-gray-300">
              <div className="flex items-center justify-between">
                <span className="px-1.5 py-0.5 bg-white/10 rounded font-bold text-emerald-400">W / S</span>
                <span className="text-gray-400">{t("pitch", lang)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="px-1.5 py-0.5 bg-white/10 rounded font-bold text-emerald-400">A / D</span>
                <span className="text-gray-400">{t("yaw", lang)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="px-1.5 py-0.5 bg-white/10 rounded font-bold text-emerald-400">Q / E</span>
                <span className="text-gray-400">{t("roll", lang)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="px-1.5 py-0.5 bg-white/10 rounded font-bold text-emerald-400">SHIFT</span>
                <span className="text-gray-400">{t("accelerate", lang)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="px-1.5 py-0.5 bg-white/10 rounded font-bold text-emerald-400">CTRL</span>
                <span className="text-gray-400">{t("brake", lang)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="px-1.5 py-0.5 bg-white/10 rounded font-bold text-emerald-400">ESPAÇO</span>
                <span className="text-gray-400">{t("shoot", lang)}</span>
              </div>
              <div className="flex items-center justify-between col-span-2 pt-1 border-t border-white/5">
                <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded font-bold border border-orange-500/30">
                  F
                </span>
                <span className="text-orange-300 font-bold">{t("missile", lang)} Teleguiado</span>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="p-3.5 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                {t("topPilots", lang)}
              </span>
              <span className="text-[10px] text-gray-500 font-mono">Top 10</span>
            </div>

            <div className="space-y-1.5">
              {leaderboard.length === 0 ? (
                <p className="text-[11px] text-gray-500 text-center py-2">
                  {isPt ? "Nenhum piloto registrado" : "No pilots recorded"}
                </p>
              ) : (
                leaderboard.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between text-[11px] p-1.5 rounded-lg ${
                      player.id === socketId
                        ? "bg-emerald-500/15 border border-emerald-500/40"
                        : "bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-gray-500 font-bold w-4 shrink-0">{index + 1}.</span>
                      <span
                        className={`truncate ${
                          player.id === socketId ? "text-emerald-400 font-bold" : "text-gray-300"
                        }`}
                      >
                        {player.name}
                      </span>
                    </div>
                    <span className="text-emerald-400 font-mono shrink-0 ml-2">
                      {player.shipsOwned}{" "}
                      {player.shipsOwned === 1
                        ? t("ownedShips", lang).substring(0, t("ownedShips", lang).length - 1)
                        : t("ownedShips", lang)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-black/60 space-y-2 shrink-0">
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4 text-emerald-400" />
            <span>{isPt ? "Minimizar Painel de Menus" : "Minimize All Menus"}</span>
          </button>

          <button
            onClick={onExit}
            className="w-full py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold rounded-xl text-xs transition-colors border border-red-500/30 flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t("exitGame", lang)}</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. SUBTLE MINIMALIST HUD (WHEN MENU IS MINIMIZED)         */}
      {/* ======================================================== */}
      {!isDrawerOpen && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 pointer-events-none z-30 flex items-center gap-3 px-4 py-2 bg-black/70 backdrop-blur-md rounded-full border border-white/10 text-xs font-mono text-gray-300 shadow-xl">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span
              className={
                health > 50 ? "text-emerald-400 font-bold" : health > 20 ? "text-yellow-400 font-bold" : "text-red-400 font-bold"
              }
            >
              {Math.max(0, Math.floor(health))}%
            </span>
          </div>

          <span className="text-gray-600">•</span>

          <div className="flex items-center gap-1.5" title={roomInfo?.duration === 0 ? (isPt ? "Combate sem limite de tempo" : "Unlimited battle time") : undefined}>
            {roomInfo?.duration === 0 ? (
              <>
                <InfinityIcon className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                <span className="text-blue-300 font-bold">{isPt ? "Sem tempo" : "No Limit"}</span>
              </>
            ) : (
              <>
                <Timer className="w-3.5 h-3.5 text-blue-400" />
                <span className={matchTime < 30 ? "text-red-400 font-bold animate-pulse" : "text-white font-bold"}>
                  {formatTime(matchTime)}
                </span>
              </>
            )}
          </div>

          {/* Quick Audio Pill on Floating HUD when YouTube is on the Sun */}
          {hasSolarVideo && (
            <>
              <span className="text-gray-600">•</span>
              <div className="flex items-center gap-1.5 pointer-events-auto">
                <button
                  onClick={() => toggleSolarMute()}
                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                    audioState.isMuted
                      ? "text-red-400 hover:bg-red-500/20"
                      : "text-amber-400 hover:bg-amber-500/20"
                  }`}
                  title={
                    audioState.isMuted
                      ? isPt
                        ? "Áudio do Sol Mudo - Clique para Ativar"
                        : "Solar Audio Muted - Click to Unmute"
                      : isPt
                      ? "Mutar Áudio do Sol"
                      : "Mute Solar Audio"
                  }
                >
                  {audioState.isMuted ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={audioState.isMuted ? 0 : audioState.volume}
                  onChange={(e) => setSolarVolume(Number(e.target.value))}
                  className="w-16 sm:w-20 accent-amber-400 h-1 bg-gray-700 rounded cursor-pointer"
                  title={
                    isPt
                      ? `Volume: ${audioState.isMuted ? "0 (Mudo)" : `${audioState.volume}%`}`
                      : `Volume: ${audioState.isMuted ? "0 (Muted)" : `${audioState.volume}%`}`
                  }
                />
                <span
                  className={`text-[10px] font-mono min-w-[28px] ${
                    audioState.isMuted ? "text-gray-400" : "text-amber-300 font-bold"
                  }`}
                >
                  {audioState.isMuted ? "0%" : `${audioState.volume}%`}
                </span>
              </div>
            </>
          )}

          {/* Quick Share Room Button on Minimized HUD (Multiplayer only) */}
          {mode !== "training" && (
            <>
              <span className="text-gray-600">•</span>
              <button
                onClick={handleShareRoom}
                className="pointer-events-auto px-2.5 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                title={isPt ? "Compartilhar Link desta Sala" : "Share Room Link"}
              >
                {shareFeedback ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3 text-emerald-400" />}
                <span>{shareFeedback || (isPt ? "Compartilhar" : "Share")}</span>
              </button>
            </>
          )}

          <span className="text-gray-600">•</span>

          <button
            onClick={() => setIsDrawerOpen(true)}
            className="pointer-events-auto px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-gray-300 text-[10px] font-bold border border-white/10 transition-all cursor-pointer"
          >
            {isPt ? "Expandir ☰" : "Menu ☰"}
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5A. RESPAWN COUNTDOWN OVERLAY (WHEN RESPAWN IS ACTIVE)   */}
      {/* ======================================================== */}
      {isDead && respawnCountdown !== null && respawnCountdown !== undefined && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center pointer-events-auto animate-fadeIn">
          <div className="p-8 bg-[#0c1017] border border-amber-500/50 rounded-3xl max-w-md w-full shadow-2xl shadow-amber-950/60 flex flex-col items-center gap-4">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin duration-1000" />
              <div className="p-3 bg-amber-500/20 rounded-full text-amber-400">
                <RotateCcw className="w-8 h-8 animate-pulse" />
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-amber-300 uppercase tracking-wider">
                {isPt ? "Nave Destruída!" : "Ship Destroyed!"}
              </h3>
              <p className="text-sm text-gray-300 mt-1">
                {isPt
                  ? "Renascendo em órbita com frente voltada para o Sol..."
                  : "Respawning in orbit facing directly towards the Sun..."}
              </p>
            </div>

            <div className="flex items-center gap-3 px-6 py-2.5 bg-amber-500/15 rounded-full border border-amber-500/40 shadow-lg shadow-amber-950/40">
              <span className="text-3xl font-black font-mono text-amber-300 animate-bounce">
                {respawnCountdown}
              </span>
              <span className="text-xs text-amber-200/80 uppercase tracking-widest font-bold">
                {isPt ? "segundos para renascer" : "seconds to respawn"}
              </span>
            </div>

            <p className="text-[11px] text-gray-400 max-w-xs leading-relaxed">
              {isPt
                ? "Sua nave será rearmada e posicionada no espaço voltada para o Sol para continuar a batalha!"
                : "Your ship will be recalibrated and spawned in deep space looking at the Sun!"}
            </p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5B. SHIP DESTROYED OVERLAY (ELIMINATION / SPECTATOR)     */}
      {/* ======================================================== */}
      {isDead && (respawnCountdown === null || respawnCountdown === undefined) && (
        <div className="fixed inset-0 z-40 bg-red-950/40 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
          <div className="p-6 bg-black/90 border border-red-500/50 rounded-3xl max-w-md shadow-2xl shadow-red-950/60 animate-bounce">
            <h3 className="text-2xl font-black text-red-500 tracking-wider uppercase mb-2">
              {mode === "training" ? t("shipDestroyedFailed", lang) : t("shipDestroyedSpec", lang)}
            </h3>
            {eliminatedReason && (
              <p className="text-xs text-gray-300 mb-4">{eliminatedReason}</p>
            )}
            <button
              onClick={onExit}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-950/50 cursor-pointer"
            >
              {t("backHangar", lang)}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MATCH RESULTS SUMMARY MODAL (RANQUE DE QUEM MATOU MAIS)*/}
      {/* ======================================================== */}
      {matchResults && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xl z-50 flex items-center justify-center p-4 pointer-events-auto animate-fadeIn">
          <div className="bg-zinc-950 border border-amber-500/40 p-6 md:p-8 rounded-3xl max-w-2xl w-full shadow-2xl shadow-amber-950/50">
            <div className="text-center mb-6">
              <Trophy className="w-14 h-14 text-amber-400 mx-auto mb-2 animate-pulse" />
              <h2 className="text-2xl sm:text-3xl font-black text-amber-300 uppercase tracking-tight">
                {isPt ? "Ranque de Quem Matou Mais" : "Top Killers Leaderboard"}
              </h2>
              <p className="text-xs text-gray-300 font-mono mt-1">
                {isPt
                  ? "Pontuação acumulada por abates e naves capturadas"
                  : "Score and kills accumulated across the battlefield"}
              </p>
              <p className="text-emerald-400 font-mono text-[11px] mt-0.5">
                {t("nextMatchStarting", lang)}
              </p>
            </div>

            <div className="space-y-2.5 mb-6 max-h-[350px] overflow-y-auto pr-2">
              {matchResults.map((res, idx) => (
                <div
                  key={res.id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                    idx === 0
                      ? "bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-950/40"
                      : res.id === socketId
                      ? "bg-emerald-500/10 border-emerald-500/50"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xl font-black w-7 text-center ${
                        idx === 0
                          ? "text-amber-400"
                          : idx === 1
                          ? "text-slate-300"
                          : idx === 2
                          ? "text-amber-600"
                          : "text-white/30"
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold text-sm ${
                            res.id === socketId
                              ? "text-emerald-400"
                              : idx === 0
                              ? "text-amber-300"
                              : "text-white"
                          }`}
                        >
                          {res.name}
                        </span>
                        {idx === 0 && (
                          <span className="px-2 py-0.5 bg-amber-500/25 text-amber-300 text-[10px] font-bold rounded-full border border-amber-500/40">
                            🏆 MVP
                          </span>
                        )}
                        {res.id === socketId && (
                          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded">
                            {isPt ? "Você" : "You"}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono mt-0.5 flex items-center gap-2">
                        <span>
                          {res.score || res.kills * 100} {isPt ? "pts" : "pts"}
                        </span>
                        <span>•</span>
                        <span>
                          {res.shipsOwned} {t("ownedShips", lang)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-black text-amber-300 font-mono">
                      {res.kills}
                    </div>
                    <div className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">
                      {t("kills", lang)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={onExit}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-950/50 text-sm cursor-pointer"
            >
              {t("exitGame", lang)}
            </button>
          </div>
        </div>
      )}

      {/* Share Room Modal for in-game multiplayer invitations */}
      <ShareRoomModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        roomId={roomId || "global"}
        roomName={roomInfo?.roomName || (isPt ? "Arena de Batalha" : "Battle Arena")}
        lang={lang}
      />
    </>
  );
}
