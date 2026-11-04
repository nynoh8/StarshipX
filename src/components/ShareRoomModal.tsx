import React, { useState } from "react";
import {
  Share2,
  Copy,
  Check,
  X,
  MessageCircle,
  Send,
  Hash,
  Globe,
  Rocket,
  ShieldCheck
} from "lucide-react";
import { getRoomInviteData, copyToClipboard } from "../utils/shareRoom";

interface ShareRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName?: string;
  lang?: string;
}

export const ShareRoomModal: React.FC<ShareRoomModalProps> = ({
  isOpen,
  onClose,
  roomId,
  roomName = "Arena de Batalha",
  lang = "pt",
}) => {
  const isPt = lang === "pt";
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const inviteData = getRoomInviteData(roomId, roomName, isPt);

  const handleCopyLink = async () => {
    const success = await copyToClipboard(inviteData.url);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyCode = async () => {
    const success = await copyToClipboard(inviteData.code);
    if (success) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: inviteData.title,
          text: inviteData.text,
          url: inviteData.url,
        });
      } catch (e) {}
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#0c1017] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl text-white overflow-hidden flex flex-col">
        {/* Glow Effects */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span>{isPt ? "Convidar para Sala P2P" : "Invite to P2P Arena"}</span>
              </h2>
              <p className="text-xs text-gray-400 truncate max-w-[220px]">
                {roomName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-4 flex flex-col gap-4 relative z-10">
          {/* Room Code Card */}
          <div className="p-3.5 bg-black/60 border border-amber-500/30 rounded-2xl flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {isPt ? "Código da Sala" : "Room Code"}
              </span>
              <span className="font-mono text-lg font-bold text-white tracking-widest mt-0.5">
                {inviteData.code}
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl text-xs font-bold border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? (isPt ? "Copiado!" : "Copied!") : (isPt ? "Copiar Código" : "Copy Code")}</span>
            </button>
          </div>

          {/* Full Link Input with 1-Click Copy */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              {isPt ? "Link de Acesso Direto" : "Direct Invite Link"}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteData.url}
                className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-gray-300 font-mono select-all focus:outline-none focus:border-emerald-500 truncate"
              />
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md shadow-emerald-950/40"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? (isPt ? "Copiado!" : "Copied!") : (isPt ? "Copiar" : "Copy")}</span>
              </button>
            </div>
          </div>

          {/* Social Quick Share Buttons (WhatsApp & Telegram) */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <a
              href={inviteData.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
              <span>WhatsApp</span>
            </a>

            <a
              href={inviteData.telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4 text-blue-400" />
              <span>Telegram</span>
            </a>
          </div>

          {/* Native Share button on mobile */}
          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <button
              onClick={handleNativeShare}
              className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/10"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isPt ? "Mais opções de compartilhamento" : "More share options"}</span>
            </button>
          )}

          {/* Info note */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2 text-[11px] text-gray-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {isPt
                ? "Seus amigos entram na arena P2P instantaneamente com 1 clique, sem precisar de cadastro."
                : "Your friends join the P2P arena instantly with 1 click, no registration required."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
