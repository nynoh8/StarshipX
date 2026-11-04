import React, { useState, useRef, useEffect } from "react";
import {
  SpaceshipViewer,
  SpaceshipViewerRef,
} from "./components/SpaceshipViewer";
import { Game } from "./components/Game";
import { generateSpaceship, Part, ColorPalette, palettes } from "./utils/spaceshipGenerator";
import { getShipStats } from "./utils/shipStats";
import {
  RefreshCw,
  Box,
  Settings2,
  Rocket,
  Hash,
  User,
  Swords,
  Target,
  Palette,
  ChevronLeft,
  ChevronRight,
  Shield,
  Trash2,
  Download,
  Globe,
  HelpCircle,
  Sparkles,
  Share2,
  Wifi,
  Edit3,
  X
} from "lucide-react";
import { PrivacyPolicy } from "./components/legal/PrivacyPolicy";
import { CookieConsent } from "./components/legal/CookieConsent";
import { Language, languageNames, translations } from "./utils/translations";
import { AboutGame } from "./components/AboutGame";
import { LoginModal } from "./components/LoginModal";
import { CreateRoomModal } from "./components/CreateRoomModal";
import { RoomsListModal } from "./components/RoomsListModal";
import { ShareRoomModal } from "./components/ShareRoomModal";

export default function App() {
  const [parts, setParts] = useState<Part[]>([]);
  const [mode, setMode] = useState<"hangar" | "training" | "multiplayer" | "leaderboard" | "privacy" | "about">("hangar");
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem("lang") as Language;
    if (saved && ["en", "pt", "es", "zh", "ja", "fr", "de", "ru", "ko"].includes(saved)) {
      return saved;
    }
    const bLang = navigator.language?.substring(0, 2);
    if (["pt", "es", "zh", "ja", "fr", "de", "ru", "ko"].includes(bLang)) {
      return bLang as Language;
    }
    return "pt";
  });

  const t = (key: string) => {
    return translations[lang]?.[key] || translations["en"]?.[key] || key;
  };

  const handleLangChange = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("lang", newLang);
  };

  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch("/api/leaderboard/ships");
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
        return;
      }
    } catch (e) {}
    // Static fallback for GitHub Pages
    setLeaderboard([
      { nickname: "Viper_99", ship_count: 8 },
      { nickname: "GhostAce", ship_count: 5 },
      { nickname: "StarLord", ship_count: 4 },
      { nickname: playerName || "Piloto P2P", ship_count: 3 },
      { nickname: "NovaPilot", ship_count: 2 },
    ]);
  };

  const handleShowLeaderboard = () => {
    fetchLeaderboard();
    setMode("leaderboard");
  };

  const [seed, setSeed] = useState("");
  const [palette, setPalette] = useState<ColorPalette>("random");
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem("pilot_name") || "Piloto P2P";
  });
  const [stats, setStats] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [selectedPartId, setSelectedPartId] = useState<string | undefined>();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [createRoomModalOpen, setCreateRoomModalOpen] = useState(false);
  const [roomsListModalOpen, setRoomsListModalOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("global");
  const [selectedRoomData, setSelectedRoomData] = useState<any>(null);
  const [shareModalState, setShareModalState] = useState<{ open: boolean; roomId: string; roomName?: string } | null>(null);
  const [pendingInviteRoom, setPendingInviteRoom] = useState<string | null>(null);
  const viewerRef = useRef<SpaceshipViewerRef>(null);

  const handleRoomCreated = (room: any) => {
    setSelectedRoomId(room.id);
    setSelectedRoomData(room);
    setShareModalState({ open: true, roomId: room.id, roomName: room.name });
    setMode("multiplayer");
  };

  const handleSelectRoom = (roomId: string, roomData?: any) => {
    setSelectedRoomId(roomId);
    setSelectedRoomData(roomData || null);
    setPendingInviteRoom(null);
    setMode("multiplayer");
  };

  useEffect(() => {
    // Auto-detect shared room invite links (?room=... or ?p2p=...)
    const urlParams = new URLSearchParams(window.location.search);
    const targetRoom = urlParams.get('room') || urlParams.get('p2p');
    if (targetRoom) {
      const cleanId = targetRoom.trim().toUpperCase();
      setSelectedRoomId(cleanId);
      setSelectedRoomData({ id: cleanId, name: `Sala P2P [${cleanId}]` });
      setPendingInviteRoom(cleanId);
    }
  }, []);

  const checkAuth = async () => {
    try {
      const headers: Record<string, string> = {};
      const savedUser = localStorage.getItem("pilot_user");
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed.dbId || parsed.id) {
            headers["x-user-id"] = parsed.dbId || parsed.id;
          }
        } catch {}
      }

      const res = await fetch("/api/auth/me", { headers });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        if (data.name) {
          setPlayerName(data.name);
          localStorage.setItem("pilot_name", data.name);
        }
        localStorage.setItem("pilot_user", JSON.stringify(data));
        
        if (data.ships && data.ships.length > 0) {
          const firstShip = data.ships[0];
          setSeed(firstShip.seed);
          updateShip(firstShip.seed, palette);
        }
        return;
      }
    } catch (e) {
      // Fallback in-memory / static GitHub Pages
    }

    // Static GitHub Pages fallback
    const savedUser = localStorage.getItem("pilot_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        if (parsed.name) setPlayerName(parsed.name);
      } catch {}
    } else {
      const defaultName = localStorage.getItem("pilot_name") || "Piloto P2P";
      const localPilot = {
        id: "pilot_local",
        dbId: "pilot_local",
        name: defaultName,
        ships: [{ id: "starter", seed: "STAR77", vida: 120 }],
      };
      setUser(localPilot);
      localStorage.setItem("pilot_user", JSON.stringify(localPilot));
    }
  };

  const handleNextShip = () => {
    if (!user || (!user.ships) || user.ships.length <= 1) return;
    const currentIndex = user.ships.findIndex((s: any) => s.seed === seed);
    const nextIndex = (currentIndex + 1) % user.ships.length;
    const nextShip = user.ships[nextIndex];
    setSeed(nextShip.seed);
    updateShip(nextShip.seed, palette);
  };

  const handlePrevShip = () => {
    if (!user || (!user.ships) || user.ships.length <= 1) return;
    const currentIndex = user.ships.findIndex((s: any) => s.seed === seed);
    const prevIndex = currentIndex <= 0 ? user.ships.length - 1 : currentIndex - 1;
    const prevShip = user.ships[prevIndex];
    setSeed(prevShip.seed);
    updateShip(prevShip.seed, palette);
  };

  const handlePartClick = (partId?: string) => {
    if (!partId) {
      setSelectedPartId(undefined);
    } else {
      setSelectedPartId(partId === selectedPartId ? undefined : partId);
    }
  };

  const updatePart = (partId: string, updates: Partial<Part>) => {
    setParts(prevParts => prevParts.map(p => p.id === partId ? { ...p, ...updates } : p));
  };

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
    setPlayerName(userData.name);
    localStorage.setItem("pilot_name", userData.name);
    localStorage.setItem("pilot_user", JSON.stringify(userData));
    if (userData.ships && userData.ships.length > 0) {
      setSeed(userData.ships[0].seed);
      updateShip(userData.ships[0].seed, palette);
    }
  };

  useEffect(() => {
    handleGenerate();
    checkAuth();
  }, []);

  const handleNameChange = (newName: string) => {
    const clean = newName.substring(0, 16);
    setPlayerName(clean);
    localStorage.setItem("pilot_name", clean);
    if (user) {
      setUser({ ...user, name: clean });
    }
  };

  const updateShip = (s: string, p: ColorPalette) => {
    const fullSeed = `${s}_${p}`;
    setParts(generateSpaceship(fullSeed));
    setStats(getShipStats(fullSeed));
  };

  // 100% Free Instant Random Ship Generation (Zero keys/credits needed)
  const handleGenerate = () => {
    const newSeed = Math.random().toString(36).substring(2, 10).toUpperCase();
    setSeed(newSeed);
    updateShip(newSeed, palette);
  };

  const handlePaletteChange = (newPalette: ColorPalette) => {
    setPalette(newPalette);
    if (seed) {
      updateShip(seed, newPalette);
    }
  };

  const startTraining = () => {
    setMode("training");
  };

  const startMultiplayer = () => {
    setSelectedRoomId("global");
    setSelectedRoomData(null);
    setMode("multiplayer");
  };

  if (mode === "multiplayer" || mode === "training") {
    return (
      <Game
        initialSeed={`${seed}_${palette}`}
        customParts={parts}
        playerName={playerName || "Piloto P2P"}
        onExit={() => {
          setMode("hangar");
          setSelectedRoomId("global");
          setSelectedRoomData(null);
        }}
        mode={mode}
        user={user}
        lang={lang}
        roomId={selectedRoomId}
        roomData={selectedRoomData}
      />
    );
  }

  if (mode === "privacy") {
    return <PrivacyPolicy onBack={() => setMode("hangar")} lang={lang} />;
  }

  if (mode === "about") {
    return <AboutGame onBack={() => setMode("hangar")} lang={lang} />;
  }

  if (mode === "leaderboard") {
    return (
      <div className="flex flex-col h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{t("topPilots")}</h1>
              <p className="text-xs text-gray-400">{lang === "pt" ? "Ranking de pilotos e naves conquistadas em P2P" : "P2P Pilots and captured fleet ranking"}</p>
            </div>
          </div>
          <button
            onClick={() => setMode("hangar")}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all font-semibold text-sm border border-white/10 cursor-pointer"
          >
            {t("backHangar")}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-8 flex justify-center">
          <div className="w-full max-w-4xl flex flex-col md:flex-row gap-8">
            {/* Leaderboard */}
            <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Swords className="w-6 h-6 text-emerald-400" />
                {t("globalLeaderboard")}
              </h2>
              
              <div className="flex flex-col gap-3">
                {leaderboard.length === 0 ? (
                  <div className="text-gray-400 text-center py-8">
                    {lang === "pt" 
                      ? "Nenhum piloto no ranking ainda. Entre nas salas P2P para batalhar!" 
                      : "No ranked pilots yet. Jump into P2P arenas to battle!"}
                  </div>
                ) : (
                  leaderboard.map((player, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full font-bold text-emerald-400">
                          {index + 1}
                        </div>
                        <span className="font-semibold text-lg">{player.nickname}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Rocket className="w-4 h-4" />
                        <span className="font-mono">
                          {player.ship_count} {player.ship_count === 1 ? "nave" : "naves"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* User Fleet */}
            <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3 mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Box className="w-6 h-6 text-blue-400" />
                  {t("myFleet")}
                </h2>
                <button
                  onClick={() => setCreateRoomModalOpen(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold rounded-xl transition-all shadow-md text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{lang === "pt" ? "Criar Sala P2P" : "Create Room"}</span>
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {(!user || !user.ships || user.ships.length === 0) ? (
                  <div className="text-gray-400 text-center py-8">
                    {lang === "pt" ? "Você possui sua nave inicial. Capture naves de rivais nas batalhas P2P!" : "Fly your ship and capture rival ships in P2P battles!"}
                  </div>
                ) : (
                  user.ships.map((ship: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => {
                        setSeed(ship.seed);
                        setParts(generateSpaceship(ship.seed));
                        setStats(getShipStats(ship.seed));
                        setMode("hangar");
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black/50 rounded-lg flex items-center justify-center border border-white/10">
                          <Hash className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-emerald-400">{ship.seed}</span>
                          <span className="text-xs text-gray-500">{t("hullStrength")}: {ship.vida || 100}</span>
                        </div>
                      </div>
                      <button className="text-xs px-3 py-1 bg-emerald-600/20 text-emerald-400 rounded-full border border-emerald-500/30">
                        {t("select")}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/50 backdrop-blur-md z-10 absolute top-0 left-0 right-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">StarshipX Battle</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                <span>P2P</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setMode("about")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-emerald-400 rounded-full transition-all font-semibold text-xs border border-emerald-500/20 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{lang === "pt" ? "Como Jogar" : "How to Play"}</span>
          </button>

          <button
            onClick={handleShowLeaderboard}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all font-semibold text-xs border border-white/10 cursor-pointer"
          >
            <Rocket className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t("topPilots")}</span>
          </button>

          {/* Pilot Identity Badge (No Google Keys Needed) */}
          <button
            onClick={() => setLoginModalOpen(true)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-full border border-white/15 transition-all text-xs font-semibold cursor-pointer"
            title={lang === "pt" ? "Alterar Codinome do Piloto" : "Change Pilot Call Sign"}
          >
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-300 font-bold">{playerName}</span>
            <Edit3 className="w-3 h-3 text-gray-400" />
          </button>
        </div>
      </header>

      {/* Main 3D Viewer Area */}
      <main className="flex-1 relative">
        {/* Battle Invite Banner received via URL */}
        {pendingInviteRoom && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-lg p-3.5 sm:p-4 bg-[#0a121d]/95 backdrop-blur-xl border border-emerald-500/50 rounded-2xl shadow-[0_0_35px_rgba(16,185,129,0.3)] flex items-center justify-between gap-3 text-white animate-fadeIn">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/40 shrink-0">
                <Swords className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  {lang === "pt" ? "Convite de Sala Detectado!" : "Room Invite Detected!"}
                </p>
                <p className="text-sm font-bold text-white truncate">
                  {lang === "pt" ? "Entrar na Sala:" : "Join Room:"}{" "}
                  <span className="font-mono text-amber-300 font-bold px-1.5 py-0.5 bg-amber-500/10 rounded border border-amber-500/30">
                    #{pendingInviteRoom}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  handleSelectRoom(pendingInviteRoom, { name: `Sala [${pendingInviteRoom}]` });
                  setPendingInviteRoom(null);
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
              >
                {lang === "pt" ? "Entrar Agora" : "Join Now"}
              </button>
              <button
                onClick={() => setPendingInviteRoom(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <SpaceshipViewer ref={viewerRef} parts={parts} onPartClick={handlePartClick} selectedPartId={selectedPartId} />

        {user && user.ships && user.ships.length > 1 && (
          <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-8 pointer-events-none z-10">
            <button 
              onClick={handlePrevShip}
              className="p-4 bg-black/60 hover:bg-white/10 rounded-full border border-white/10 text-white pointer-events-auto transition-all backdrop-blur-md cursor-pointer"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button 
              onClick={handleNextShip}
              className="p-4 bg-black/60 hover:bg-white/10 rounded-full border border-white/10 text-white pointer-events-auto transition-all backdrop-blur-md cursor-pointer"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </div>
        )}

        {/* Controls Overlay */}
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 p-4 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-[calc(100%-2rem)] sm:w-[720px] max-w-full max-h-[80vh] overflow-y-auto z-50">
          <div className="flex flex-col sm:flex-row w-full gap-4">
            {/* Pilot Name */}
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3 text-emerald-400" /> {t("pilotName")}
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={t("enterName")}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500 transition-colors font-medium text-sm"
                maxLength={16}
              />
            </div>

            {/* Ship Seed (Instant Free Randomization) */}
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Hash className="w-3 h-3 text-emerald-400" /> {t("shipSeed")}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={seed}
                  readOnly
                  placeholder={t("seeding")}
                  className="flex-1 min-w-0 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none font-mono font-bold text-emerald-400 uppercase text-sm"
                />
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all text-xs cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.3)] shrink-0"
                  title={lang === "pt" ? "Gerar Nova Nave Aleatória (100% Grátis)" : "Randomize New Ship (Free)"}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t("randomize")}</span>
                </button>
              </div>
            </div>

            {/* Color Palette (Always Unlocked) */}
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Palette className="w-3 h-3 text-emerald-400" /> {t("palette")}
              </label>
              <select
                value={palette}
                onChange={(e) => handlePaletteChange(e.target.value as ColorPalette)}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500 transition-colors capitalize text-sm cursor-pointer"
              >
                <option value="random">{t("pal_random") || "Aleatória"}</option>
                <option value="stealth">{t("pal_stealth") || "Furtiva (Stealth)"}</option>
                <option value="neon">{t("pal_neon") || "Neon Cibernético"}</option>
                <option value="industrial">{t("pal_industrial") || "Industrial Militar"}</option>
                <option value="royal">{t("pal_royal") || "Imperial Real"}</option>
              </select>
            </div>
          </div>

          <div className="w-full h-px bg-white/10 shrink-0"></div>

          {/* Action Buttons (100% Unlocked) */}
          <div className="flex flex-col sm:flex-row gap-2 w-full shrink-0">
            <button
              onClick={startTraining}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-bold shadow-[0_0_15px_rgba(37,99,235,0.3)] text-sm cursor-pointer"
            >
              <Target className="w-4 h-4 font-bold" />
              <span>{t("btnTraining")}</span>
            </button>

            <button
              onClick={() => setRoomsListModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-3 bg-white/10 hover:bg-white/15 text-amber-300 rounded-xl transition-all font-bold border border-amber-500/30 text-sm cursor-pointer shadow-md"
            >
              <Swords className="w-4 h-4 text-amber-400" />
              <span>{lang === "pt" ? "Salas P2P" : "P2P Arenas"}</span>
            </button>

            <button
              onClick={startMultiplayer}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl transition-all font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)] text-sm cursor-pointer"
            >
              <Rocket className="w-4 h-4 font-bold" />
              <span>{lang === "pt" ? "Batalha Rápida P2P" : "Quick P2P Battle"}</span>
            </button>
          </div>
        </div>

        {/* Stats / Info Overlay */}
        <div className="absolute top-24 left-6 p-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl text-xs font-mono text-gray-400 flex flex-col gap-2 pointer-events-none w-64 shadow-xl">
          <div className="flex items-center gap-2 text-white">
            <Settings2 className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold">{t("shipCharacteristics")}</span>
          </div>
          <div className="w-full h-px bg-white/10 my-1"></div>
          {stats && (
            <>
              <div className="flex justify-between gap-4">
                <span>{t("hullStrength")}:</span>
                <span className={stats.maxHealth > 100 ? "text-emerald-400 font-bold" : "text-yellow-400 font-bold"}>
                  {stats.maxHealth}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>{t("topSpeed")}:</span>
                <span className={stats.speedMultiplier > 1 ? "text-emerald-400 font-bold" : "text-yellow-400 font-bold"}>
                  {(stats.speedMultiplier * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>{t("agility")}:</span>
                <span className={stats.turnSpeedMultiplier > 1 ? "text-emerald-400 font-bold" : "text-yellow-400 font-bold"}>
                  {(stats.turnSpeedMultiplier * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>{t("firepower")}:</span>
                <span className={stats.damageMultiplier > 1 ? "text-emerald-400 font-bold" : "text-yellow-400 font-bold"}>
                  {(stats.damageMultiplier * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>{t("fireRate")}:</span>
                <span className={stats.fireRateMultiplier > 1 ? "text-emerald-400 font-bold" : "text-yellow-400 font-bold"}>
                  {(stats.fireRateMultiplier * 100).toFixed(0)}%
                </span>
              </div>
            </>
          )}
        </div>

        {/* Part Editing Overlay */}
        {selectedPartId && (
          <div className="absolute top-24 right-6 p-4 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-72 flex flex-col gap-4 text-sm text-zinc-100 z-50">
            <div className="flex items-center justify-between text-white border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold">{t("editPart")}</span>
              </div>
              <button 
                onClick={() => setSelectedPartId(undefined)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            {(() => {
              const part = parts.find(p => p.id === selectedPartId);
              if (!part) return null;
              
              return (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{t("type")}</label>
                    <select
                      value={part.type}
                      onChange={(e) => updatePart(part.id, { type: e.target.value as any })}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500 transition-colors capitalize"
                    >
                      <option value="box">{t("typeBox")}</option>
                      <option value="cylinder">{t("typeCylinder")}</option>
                      <option value="cone">{t("typeCone")}</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{t("color")}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={part.color}
                        onChange={(e) => updatePart(part.id, { color: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input
                        type="text"
                        value={part.color}
                        onChange={(e) => updatePart(part.id, { color: e.target.value })}
                        className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-white outline-none focus:border-emerald-500 transition-colors uppercase font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex justify-between">
                      <span>{t("roughness")}</span>
                      <span>{part.roughness?.toFixed(2) ?? "0.40"}</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={part.roughness ?? 0.4}
                      onChange={(e) => updatePart(part.id, { roughness: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex justify-between">
                      <span>{t("metalness")}</span>
                      <span>{part.metalness?.toFixed(2) ?? "0.60"}</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={part.metalness ?? 0.6}
                      onChange={(e) => updatePart(part.id, { metalness: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm text-white cursor-pointer mt-2">
                    <input
                      type="checkbox"
                      checked={part.isGlow ?? false}
                      onChange={(e) => updatePart(part.id, { isGlow: e.target.checked })}
                      className="rounded border-white/10 bg-black/50 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                    />
                    <span className="font-medium">{t("emissiveGlow")}</span>
                  </label>
                </div>
              );
            })()}
          </div>
        )}

        {/* Footer */}
        <footer className="absolute bottom-4 left-6 right-6 z-10 flex flex-wrap items-center justify-between gap-3 text-[10px] text-gray-500 uppercase tracking-widest font-bold pointer-events-auto">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMode("privacy")}
              className="hover:text-emerald-400 transition-colors cursor-pointer"
            >
              {t("privacyPolicy")}
            </button>
            <span className="opacity-20">•</span>
            <button 
              onClick={() => setMode("privacy")}
              className="hover:text-emerald-400 transition-colors cursor-pointer"
            >
              {t("termsOfService")}
            </button>
            <span className="opacity-20">•</span>
            <span>© {new Date().getFullYear()} StarshipX Battle • Modo P2P</span>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-2 bg-black/70 border border-white/10 px-3 py-1.5 rounded-full text-xs normal-case backdrop-blur-md shadow-lg shadow-black/40">
            <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <select
              value={lang}
              onChange={(e) => handleLangChange(e.target.value as Language)}
              className="bg-transparent text-gray-200 border-none outline-none cursor-pointer font-medium pr-1 text-xs"
            >
              {Object.keys(languageNames).map((key) => (
                <option key={key} value={key} className="bg-zinc-950 text-white">
                  {languageNames[key as Language]}
                </option>
              ))}
            </select>
          </div>
        </footer>

        <CookieConsent lang={lang} />
        <LoginModal 
          isOpen={loginModalOpen} 
          onClose={() => setLoginModalOpen(false)} 
          onLoginSuccess={handleLoginSuccess} 
          lang={lang} 
        />
        <CreateRoomModal
          isOpen={createRoomModalOpen}
          onClose={() => setCreateRoomModalOpen(false)}
          user={user}
          onRoomCreated={handleRoomCreated}
          lang={lang}
        />
        <RoomsListModal
          isOpen={roomsListModalOpen}
          onClose={() => setRoomsListModalOpen(false)}
          onSelectRoom={handleSelectRoom}
          onOpenCreateRoom={() => setCreateRoomModalOpen(true)}
          user={user}
          lang={lang}
        />
        {shareModalState && (
          <ShareRoomModal
            isOpen={shareModalState.open}
            onClose={() => setShareModalState(null)}
            roomId={shareModalState.roomId}
            roomName={shareModalState.roomName}
            lang={lang}
          />
        )}
      </main>
    </div>
  );
}
