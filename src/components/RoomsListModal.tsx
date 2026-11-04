import React, { useEffect, useState } from "react";
import {
  Users,
  Sun,
  Video,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  X,
  Swords,
  Shield,
  Lock,
  Globe,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  Zap,
  Share2,
  Check,
  Hash,
  ArrowRight
} from "lucide-react";
import { shareRoomLink, copyToClipboard } from "../utils/shareRoom";
import { ShareRoomModal } from "./ShareRoomModal";

interface RoomItem {
  id: string;
  name: string;
  creatorName: string;
  mediaType: "youtube" | "image" | "none";
  mediaUrl?: string | null;
  playerCount: number;
  maxPlayers: number;
  duration?: number;
  deathMode?: "respawn" | "elimination";
  isPrivate?: boolean;
  createdAt: string;
}

interface RoomsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRoom: (roomId: string, roomData?: any) => void;
  onOpenCreateRoom: () => void;
  onOpenLogin?: () => void;
  user: any;
  lang: string;
}

export const RoomsListModal: React.FC<RoomsListModalProps> = ({
  isOpen,
  onClose,
  onSelectRoom,
  onOpenCreateRoom,
  user,
  lang,
}) => {
  const isPt = lang === "pt";
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [directCode, setDirectCode] = useState("");
  
  // Password prompt for private rooms
  const [passwordModalRoom, setPasswordModalRoom] = useState<RoomItem | null>(null);
  const [enteredPassword, setEnteredPassword] = useState("");
  const [showEnteredPassword, setShowEnteredPassword] = useState(false);
  const [passwordPromptError, setPasswordPromptError] = useState<string | null>(null);
  const [shareTargetRoom, setShareTargetRoom] = useState<RoomItem | null>(null);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);

  const handleShareRoom = (e: React.MouseEvent, room: RoomItem) => {
    e.stopPropagation();
    setShareTargetRoom(room);
  };

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/rooms");
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
        return;
      }
    } catch (e) {
      // Ignored - fallback below
    } finally {
      setIsLoading(false);
    }

    // Static GitHub Pages fallback
    setRooms([
      { id: "global-1", name: "Arena P2P #1 (Alpha)", creatorName: "StarshipX", mediaType: "none", playerCount: 1, maxPlayers: 16, duration: 300, deathMode: "respawn", createdAt: new Date().toISOString() },
      { id: "global-2", name: "Arena P2P #2 (Beta)", creatorName: "StarshipX", mediaType: "none", playerCount: 0, maxPlayers: 16, duration: 300, deathMode: "respawn", createdAt: new Date().toISOString() },
      { id: "global-3", name: "Arena P2P #3 (Gamma)", creatorName: "StarshipX", mediaType: "none", playerCount: 0, maxPlayers: 16, duration: 300, deathMode: "respawn", createdAt: new Date().toISOString() },
    ]);
  };

  useEffect(() => {
    if (isOpen) {
      fetchRooms();
    }
  }, [isOpen]);

  const handleJoinDirectCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = directCode.trim().toUpperCase();
    if (!clean) return;
    onSelectRoom(clean, { name: `Sala P2P [${clean}]` });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#0c1017] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl text-white overflow-hidden max-h-[90vh] flex flex-col">
        {/* Glow */}
        <div className="absolute -top-20 -left-20 w-52 h-52 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-52 h-52 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>{isPt ? "Salas de Combate P2P" : "P2P Battle Arenas"}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  {isPt ? "Sem Chaves" : "Zero Keys"}
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                {isPt
                  ? "Entre em uma arena global, digite um código ou crie sua própria sala."
                  : "Join a global arena, enter a code, or host your own room."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Direct Code Join Quick Bar */}
        <form onSubmit={handleJoinDirectCode} className="mt-4 p-3 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold px-2 shrink-0">
            <Hash className="w-4 h-4" />
            <span>{isPt ? "Entrar por Código P2P:" : "Join by P2P Code:"}</span>
          </div>
          <div className="flex items-center gap-2 w-full flex-1">
            <input
              type="text"
              value={directCode}
              onChange={(e) => setDirectCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
              placeholder={isPt ? "Ex: SALA1 ou P2P-9A8B" : "e.g. ROOM1 or P2P-9A8B"}
              className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 uppercase font-mono"
            />
            <button
              type="submit"
              disabled={!directCode.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>{isPt ? "Conectar" : "Connect"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Action Bar */}
        <div className="flex items-center justify-between py-3 shrink-0">
          <button
            onClick={fetchRooms}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>{isPt ? "Atualizar Lista" : "Refresh List"}</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenCreateRoom();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-950/40 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{isPt ? "Criar Nova Sala P2P" : "Host P2P Arena"}</span>
          </button>
        </div>

        {/* Rooms List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {/* Global Arena Shards */}
          {rooms
            .filter((r) => r.id.startsWith("global"))
            .map((room) => {
              const isFull = room.maxPlayers > 0 && room.playerCount >= room.maxPlayers;
              return (
                <div
                  key={room.id}
                  className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 to-blue-950/20 border border-emerald-500/30 hover:border-emerald-400/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      <Sun className="w-6 h-6 animate-pulse text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white text-base">{room.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {isPt ? "PÚBLICA" : "PUBLIC"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          {room.deathMode === "elimination" ? (isPt ? "Eliminação" : "Elimination") : (isPt ? "Renascer" : "Respawn")}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          {room.duration ? `${Math.floor(room.duration / 60)}m` : "∞"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <span className={isFull ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                            {room.playerCount}/{room.maxPlayers > 0 ? room.maxPlayers : "∞"}
                          </span>
                          <span>{isPt ? "pilotos conectados" : "pilots online"}</span>
                        </span>
                        <span>•</span>
                        <span className={isFull ? "text-red-400 font-medium" : "text-emerald-400 font-medium"}>
                          {isFull ? (isPt ? "Lotada" : "Full") : (isPt ? "Disponível" : "Open")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => handleShareRoom(e, room)}
                      className="p-2.5 bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white rounded-xl border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-semibold shrink-0"
                      title={isPt ? "Compartilhar Link da Sala" : "Share Room Link"}
                    >
                      {copiedRoomId === room.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span className="hidden sm:inline">
                        {copiedRoomId === room.id ? (isPt ? "Copiado!" : "Copied!") : (isPt ? "Compartilhar" : "Share")}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        if (isFull) return;
                        onSelectRoom(room.id, room);
                        onClose();
                      }}
                      disabled={isFull}
                      className={`px-5 py-2.5 font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                        isFull
                          ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5 opacity-60"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/50 cursor-pointer"
                      }`}
                    >
                      <Swords className="w-3.5 h-3.5" />
                      <span>{isFull ? (isPt ? "Lotada" : "Full") : (isPt ? "Entrar" : "Join")}</span>
                    </button>
                  </div>
                </div>
              );
            })}

          {/* Custom User Rooms */}
          <div className="pt-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Swords className="w-3.5 h-3.5 text-amber-400" />
              <span>{isPt ? "Salas Criadas por Pilotos (P2P)" : "Pilot Created Arenas (P2P)"}</span>
            </h3>

            {rooms
              .filter((r) => !r.id.startsWith("global"))
              .map((room) => {
                const isFull = room.maxPlayers > 0 && room.playerCount >= room.maxPlayers;
                return (
                  <div
                    key={room.id}
                    className="mb-3 p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-amber-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${
                          room.mediaType === "youtube"
                            ? "bg-red-500/20 text-red-400 border-red-500/40"
                            : room.mediaType === "image"
                            ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                            : "bg-amber-500/20 text-amber-400 border-amber-500/40"
                        }`}
                      >
                        {room.mediaType === "youtube" ? (
                          <Video className="w-6 h-6" />
                        ) : room.mediaType === "image" ? (
                          <ImageIcon className="w-6 h-6" />
                        ) : (
                          <Sun className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-white text-base">{room.name}</span>
                          <span className="font-mono text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            #{room.id}
                          </span>
                          
                          {room.isPrivate ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                              <Lock className="w-3 h-3 text-amber-400" />
                              <span>{isPt ? "Privada" : "Private"}</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                              <Globe className="w-3 h-3 text-blue-400" />
                              <span>{isPt ? "Aberta" : "Public"}</span>
                            </span>
                          )}

                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                            {room.duration === 0 ? (isPt ? "Sem tempo" : "No Limit") : `${Math.floor((room.duration || 300) / 60)}m`}
                          </span>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                            room.deathMode === "elimination"
                              ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          }`}>
                            {room.deathMode === "elimination" ? (isPt ? "Eliminação" : "Elimination") : (isPt ? "Renascer" : "Respawn")}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                          <span>
                            {isPt ? "Criado por:" : "Host:"} <strong className="text-gray-200">{room.creatorName}</strong>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono">
                            <Users className="w-3.5 h-3.5" />
                            <span className={isFull ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                              {room.playerCount}/{room.maxPlayers > 0 ? room.maxPlayers : "∞"}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => handleShareRoom(e, room)}
                        className="p-2.5 bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white rounded-xl border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-semibold shrink-0"
                      >
                        {copiedRoomId === room.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span className="hidden sm:inline">
                          {copiedRoomId === room.id ? (isPt ? "Copiado!" : "Copied!") : (isPt ? "Compartilhar" : "Share")}
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          if (isFull) return;
                          if (room.isPrivate) {
                            setPasswordModalRoom(room);
                            setEnteredPassword("");
                            setPasswordPromptError(null);
                          } else {
                            onSelectRoom(room.id, room);
                            onClose();
                          }
                        }}
                        disabled={isFull}
                        className={`px-5 py-2.5 font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                          isFull
                            ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5 opacity-60"
                            : "bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-950/40 cursor-pointer"
                        }`}
                      >
                        {room.isPrivate ? <Lock className="w-3.5 h-3.5" /> : <Swords className="w-3.5 h-3.5" />}
                        <span>{isFull ? (isPt ? "Lotada" : "Full") : isPt ? "Entrar" : "Join"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}

            {rooms.filter((r) => !r.id.startsWith("global")).length === 0 && (
              <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl text-xs text-gray-400">
                {isPt
                  ? "Nenhuma sala criada no momento. Clique em 'Criar Nova Sala P2P' acima para inaugurar a sua!"
                  : "No custom rooms hosted right now. Click 'Host P2P Arena' to create yours!"}
              </div>
            )}
          </div>
        </div>

        {/* Private Room Password Modal */}
        {passwordModalRoom && (
          <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#121722] border border-amber-500/40 rounded-2xl p-5 flex flex-col gap-3 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-bold text-sm text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  {isPt ? "Sala Particular" : "Private Arena"}
                </span>
                <button
                  onClick={() => setPasswordModalRoom(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-gray-300">
                {isPt
                  ? `Digite a senha para acessar a sala "${passwordModalRoom.name}":`
                  : `Enter password to enter "${passwordModalRoom.name}":`}
              </p>

              <div className="relative">
                <input
                  type={showEnteredPassword ? "text" : "password"}
                  value={enteredPassword}
                  onChange={(e) => setEnteredPassword(e.target.value)}
                  placeholder={isPt ? "Senha de acesso..." : "Password..."}
                  className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setShowEnteredPassword(!showEnteredPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                >
                  {showEnteredPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {passwordPromptError && (
                <span className="text-[11px] text-red-400">{passwordPromptError}</span>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPasswordModalRoom(null)}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold"
                >
                  {isPt ? "Cancelar" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!enteredPassword.trim()) {
                      setPasswordPromptError(isPt ? "Digite a senha." : "Enter password.");
                      return;
                    }
                    onSelectRoom(passwordModalRoom.id, {
                      ...passwordModalRoom,
                      enteredPassword: enteredPassword.trim(),
                    });
                    setPasswordModalRoom(null);
                    onClose();
                  }}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs"
                >
                  {isPt ? "Confirmar" : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dedicated Share Room Invite Modal */}
      {shareTargetRoom && (
        <ShareRoomModal
          isOpen={!!shareTargetRoom}
          onClose={() => setShareTargetRoom(null)}
          roomId={shareTargetRoom.id}
          roomName={shareTargetRoom.name}
          lang={lang}
        />
      )}
    </div>
  );
};
