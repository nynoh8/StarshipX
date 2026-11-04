import React, { useState, useRef } from "react";
import {
  Sun,
  Video,
  Image as ImageIcon,
  X,
  Sparkles,
  UploadCloud,
  Loader2,
  Lock,
  Globe,
  Timer,
  Infinity as InfinityIcon,
  Skull,
  RotateCcw,
  Users,
  Swords,
  Hash
} from "lucide-react";
import { validateAndExtractYouTube, sanitizeImageFile } from "../utils/roomMediaSecurity";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  credits?: number;
  onRoomCreated: (room: any) => void;
  onOpenPayment?: () => void;
  onOpenLogin?: () => void;
  lang: string;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  user,
  onRoomCreated,
  lang,
}) => {
  const isPt = lang === "pt";
  const [roomName, setRoomName] = useState("");
  const [customRoomId, setCustomRoomId] = useState("");
  const [accessType, setAccessType] = useState<"public" | "private">("public");
  const [roomPassword, setRoomPassword] = useState("");
  const [mediaType, setMediaType] = useState<"youtube" | "image" | "none">("none");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [youtubeValidInfo, setYoutubeValidInfo] = useState<{ videoId: string; embedUrl: string } | null>(null);
  
  const [sanitizedImage, setSanitizedImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isSanitizing, setIsSanitizing] = useState(false);

  // Custom Match Rules
  const [duration, setDuration] = useState<number>(300);
  const [deathMode, setDeathMode] = useState<"respawn" | "elimination">("respawn");
  const [maxPlayers, setMaxPlayers] = useState<number>(16);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleYoutubeChange = (val: string) => {
    setYoutubeUrl(val);
    setFormError(null);
    if (!val.trim()) {
      setYoutubeError(null);
      setYoutubeValidInfo(null);
      return;
    }
    const res = validateAndExtractYouTube(val);
    if (res.valid && res.videoId && res.embedUrl) {
      setYoutubeError(null);
      setYoutubeValidInfo({ videoId: res.videoId, embedUrl: res.embedUrl });
    } else {
      setYoutubeError(res.error || "Link inválido.");
      setYoutubeValidInfo(null);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError(null);
    setIsSanitizing(true);

    try {
      const res = await sanitizeImageFile(file);
      if (res.valid && res.sanitizedDataUrl) {
        setSanitizedImage(res.sanitizedDataUrl);
      } else {
        setImageError(res.error || "Falha ao processar imagem.");
        setSanitizedImage(null);
      }
    } catch (err: any) {
      setImageError(err.message || "Erro ao processar imagem.");
      setSanitizedImage(null);
    } finally {
      setIsSanitizing(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (accessType === "private" && (!roomPassword || roomPassword.trim().length < 2)) {
      setFormError(
        isPt
          ? "Defina uma senha de acesso (mínimo 2 caracteres) para sua sala privada."
          : "Please define an access password (at least 2 characters) for your private room."
      );
      return;
    }

    let finalMediaUrl = "";
    if (mediaType === "youtube") {
      if (!youtubeValidInfo) {
        setFormError(isPt ? "Forneça um link válido do YouTube antes de prosseguir." : "Please provide a valid YouTube link.");
        return;
      }
      finalMediaUrl = youtubeUrl.trim();
    } else if (mediaType === "image") {
      if (!sanitizedImage) {
        setFormError(isPt ? "Selecione uma imagem para aplicar ao Sol." : "Please select an image for the Sun.");
        return;
      }
      finalMediaUrl = sanitizedImage;
    }

    setIsSubmitting(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (user?.dbId || user?.id) {
        headers["x-user-id"] = user.dbId || user.id;
      }

      const pilotName = user?.name || "Piloto P2P";
      const finalTitle = roomName.trim() || (isPt ? `Arena P2P de ${pilotName}` : `${pilotName}'s P2P Arena`);

      let roomData: any = null;
      try {
        const res = await fetch("/api/rooms/create", {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: finalTitle,
            customRoomId: customRoomId.trim() || undefined,
            accessType,
            isPrivate: accessType === "private",
            password: accessType === "private" ? roomPassword.trim() : undefined,
            mediaType,
            mediaUrl: finalMediaUrl,
            duration,
            deathMode,
            maxPlayers,
            creatorName: pilotName,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          roomData = data.room;
        }
      } catch (err: any) {}

      if (!roomData) {
        // Fallback for static GitHub Pages host
        const generatedId = customRoomId.trim().toUpperCase() || "p2p-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        roomData = {
          id: generatedId,
          name: finalTitle,
          creatorName: pilotName,
          mediaType,
          mediaUrl: finalMediaUrl,
          duration,
          deathMode,
          maxPlayers,
          playerCount: 1,
          isPrivate: accessType === "private",
        };
      }

      onRoomCreated(roomData);
      onClose();
    } catch (err: any) {
      setFormError(err.message || (isPt ? "Falha ao processar sala." : "Failed to process room."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-[#0c1017] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl text-white overflow-hidden max-h-[90vh] flex flex-col">
        {/* Glow */}
        <div className="absolute -top-20 -right-20 w-52 h-52 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-52 h-52 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl text-black">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>{isPt ? "Criar Sala P2P de Batalha" : "Create P2P Battle Arena"}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  {isPt ? "100% Grátis" : "Free"}
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                {isPt
                  ? "Sem chaves ou taxas. Convide amigos por código ou link direto!"
                  : "Zero keys or fees. Invite friends by code or direct share link!"}
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

        {/* Form Body */}
        <form onSubmit={handleCreateRoom} className="overflow-y-auto pr-1 flex flex-col gap-5 py-4 relative z-10">
          {formError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
              {formError}
            </div>
          )}

          {/* Room Name & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {isPt ? "Nome da Arena" : "Arena Name"}
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value.substring(0, 32))}
                maxLength={32}
                placeholder={isPt ? "Ex: Duelo dos Astros" : "e.g. Star Clash"}
                className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1">
                <Hash className="w-3 h-3 text-amber-400" />
                {isPt ? "Código P2P (Opcional)" : "P2P Code (Optional)"}
              </label>
              <input
                type="text"
                value={customRoomId}
                onChange={(e) => setCustomRoomId(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "").substring(0, 16))}
                maxLength={16}
                placeholder={isPt ? "Auto-gerado ou Ex: SALA1" : "Auto or e.g. ROOM1"}
                className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-amber-300 font-mono focus:outline-none focus:border-amber-400 transition-colors uppercase"
              />
            </div>
          </div>

          {/* Privacy & Password */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              {isPt ? "Visibilidade da Sala" : "Room Visibility"}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAccessType("public")}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  accessType === "public"
                    ? "bg-white/15 border-emerald-500/50 text-emerald-300"
                    : "bg-black/40 border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{isPt ? "Pública (Lista Aberta)" : "Public (Lobby List)"}</span>
              </button>
              <button
                type="button"
                onClick={() => setAccessType("private")}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  accessType === "private"
                    ? "bg-white/15 border-amber-500/50 text-amber-300"
                    : "bg-black/40 border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isPt ? "Privada (Com Senha)" : "Private (Password)"}</span>
              </button>
            </div>
            {accessType === "private" && (
              <input
                type="text"
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
                maxLength={20}
                placeholder={isPt ? "Senha de acesso (mínimo 2 letras/números)" : "Access password (min 2 characters)"}
                className="w-full bg-black/60 border border-amber-500/30 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors mt-1"
                required
              />
            )}
          </div>

          {/* Match Rules: Duration, Death Mode, Max Players */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-3">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-blue-400" />
              {isPt ? "Regras da Partida" : "Match Rules"}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-400">{isPt ? "Duração:" : "Duration:"}</span>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="bg-black/60 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
                >
                  <option value={120}>2 min</option>
                  <option value={300}>5 min</option>
                  <option value={600}>10 min</option>
                  <option value={0}>{isPt ? "Sem tempo (Infinito)" : "No timer (Infinite)"}</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-400">{isPt ? "Modo de Morte:" : "Death Mode:"}</span>
                <select
                  value={deathMode}
                  onChange={(e) => setDeathMode(e.target.value as any)}
                  className="bg-black/60 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="respawn">{isPt ? "Renascer (3s)" : "Respawn (3s)"}</option>
                  <option value="elimination">{isPt ? "Eliminação" : "Elimination"}</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-400">{isPt ? "Máx. Pilotos:" : "Max Pilots:"}</span>
                <select
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="bg-black/60 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
                >
                  <option value={4}>4 pilotos</option>
                  <option value={8}>8 pilotos</option>
                  <option value={16}>16 pilotos</option>
                  <option value={0}>{isPt ? "Ilimitado" : "Unlimited"}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Optional Solar Media (YouTube / Photo on Sun) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              {isPt ? "Mídia Solar no Centro da Arena (Opcional)" : "Solar Media in Arena Center (Optional)"}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMediaType("none")}
                className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  mediaType === "none" ? "bg-white/15 border-white/30 text-white" : "bg-black/40 border-white/10 text-gray-400"
                }`}
              >
                {isPt ? "Sol Padrão" : "Standard Sun"}
              </button>
              <button
                type="button"
                onClick={() => setMediaType("youtube")}
                className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  mediaType === "youtube" ? "bg-red-500/20 border-red-500/40 text-red-300" : "bg-black/40 border-white/10 text-gray-400"
                }`}
              >
                <Video className="w-3 h-3 text-red-400" />
                <span>YouTube</span>
              </button>
              <button
                type="button"
                onClick={() => setMediaType("image")}
                className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  mediaType === "image" ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "bg-black/40 border-white/10 text-gray-400"
                }`}
              >
                <ImageIcon className="w-3 h-3 text-amber-400" />
                <span>{isPt ? "Foto" : "Photo"}</span>
              </button>
            </div>

            {mediaType === "youtube" && (
              <div className="flex flex-col gap-1.5 mt-1">
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => handleYoutubeChange(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-red-500 transition-colors"
                />
                {youtubeError && <span className="text-[11px] text-red-400">{youtubeError}</span>}
                {youtubeValidInfo && (
                  <span className="text-[11px] text-emerald-400">
                    {isPt ? "✓ Vídeo pronto para projeção solar!" : "✓ Video ready for solar projection!"}
                  </span>
                )}
              </div>
            )}

            {mediaType === "image" && (
              <div className="flex flex-col gap-2 mt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSanitizing}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 rounded-xl text-xs text-gray-300 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {isSanitizing ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <UploadCloud className="w-4 h-4 text-amber-400" />}
                  <span>{sanitizedImage ? (isPt ? "✓ Foto Carregada (Trocar)" : "✓ Photo Loaded (Change)") : (isPt ? "Escolher Foto para o Sol" : "Upload Photo for the Sun")}</span>
                </button>
                {imageError && <span className="text-[11px] text-red-400">{imageError}</span>}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-amber-950/40 text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Swords className="w-4 h-4" />
              <span>{isSubmitting ? (isPt ? "Criando Sala P2P..." : "Creating P2P Arena...") : (isPt ? "Lançar Sala P2P" : "Launch P2P Arena")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
