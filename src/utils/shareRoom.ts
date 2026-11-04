// Utility for sharing battle rooms via native Web Share API, Clipboard Copy, WhatsApp and Telegram
// Works perfectly on GitHub Pages, custom domains, and local development.

export interface ShareResult {
  success: boolean;
  method: "share" | "clipboard" | "error";
  url: string;
  code: string;
  message: string;
}

export function getRoomInviteData(roomId: string, roomName = "Arena P2P", isPt = true) {
  const cleanId = (roomId || "global").trim();
  // Safe base URL preserving repo name on GitHub Pages (e.g. https://nynoh8.github.io/StarshipX/)
  let baseUrl = typeof window !== "undefined" && window.location
    ? window.location.href.split("?")[0].split("#")[0]
    : "https://nynoh8.github.io/StarshipX/";

  // Ensure trailing slash if no file extension (prevents GitHub Pages CDN from 301 stripping query params)
  if (!baseUrl.endsWith("/") && !baseUrl.match(/\.[a-zA-Z0-9]+$/)) {
    baseUrl += "/";
  }

  const url = `${baseUrl}?room=${encodeURIComponent(cleanId)}`;
  const title = `StarshipX Battle - ${roomName}`;
  const text = isPt
    ? `🚀 Entre na minha sala de combate espacial "${roomName}" no StarshipX Battle! Código: ${cleanId}\nEntre pelo link:`
    : `🚀 Join my space combat arena "${roomName}" on StarshipX Battle! Code: ${cleanId}\nJoin via link:`;

  return {
    url,
    code: cleanId,
    title,
    text,
    fullShareText: `${text} ${url}`,
    whatsappUrl: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${text} ${url}`)}`,
    telegramUrl: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  };
}

export async function copyToClipboard(text: string): Promise<boolean> {
  // Method 1: Modern navigator.clipboard API
  if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // Fallback below
    }
  }

  // Method 2: Robust fallback for mobile browsers, iOS Safari, and iframes
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.position = "fixed";
    textarea.style.opacity = "0.01";
    textarea.style.fontSize = "16px"; // Prevents iOS Safari from zooming in
    // Note: readOnly=false is essential for iOS Safari execCommand copy!
    textarea.removeAttribute("readonly");
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    if (textarea.setSelectionRange) {
      textarea.setSelectionRange(0, text.length);
    }
    const successful = document.execCommand("copy");
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error("Clipboard copy failed:", err);
    return false;
  }
}

export async function shareRoomLink(
  roomId: string,
  roomName = "Arena P2P",
  isPt = true
): Promise<ShareResult> {
  const data = getRoomInviteData(roomId, roomName, isPt);

  // 1. Try Native Web Share if available and allowed by context
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: data.title,
        text: data.text,
        url: data.url,
      });
      return { success: true, method: "share", url: data.url, code: data.code, message: data.fullShareText };
    } catch (err: any) {
      if (err.name === "AbortError") {
        // User voluntarily dismissed share sheet
        return { success: true, method: "share", url: data.url, code: data.code, message: data.fullShareText };
      }
      console.warn("navigator.share unavailable or blocked in this context:", err);
    }
  }

  // 2. Clipboard copy fallback
  const copied = await copyToClipboard(data.url);
  return {
    success: copied,
    method: copied ? "clipboard" : "error",
    url: data.url,
    code: data.code,
    message: data.fullShareText,
  };
}
