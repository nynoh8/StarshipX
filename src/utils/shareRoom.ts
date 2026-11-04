// Utility for sharing battle rooms via native Web Share API or Clipboard Copy

export async function shareRoomLink(
  roomId: string,
  roomName = "Arena",
  isPt = true
): Promise<{ success: boolean; method: "share" | "clipboard" | "error" }> {
  const cleanId = roomId.trim();
  const url = `${window.location.origin}/?room=${encodeURIComponent(cleanId)}`;
  const title = `StarshipX Battle - ${roomName}`;
  const text = isPt
    ? `🚀 Entre na minha sala "${roomName}" no StarshipX Battle! O combate espacial já começou:`
    : `🚀 Join my space combat arena "${roomName}" on StarshipX Battle! Fly and battle now:`;

  // Prefer Native Web Share on supported devices (Mobile / tablets / modern browsers)
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url,
      });
      return { success: true, method: "share" };
    } catch (err: any) {
      if (err.name === "AbortError") {
        return { success: false, method: "share" };
      }
      // If native share fails or permissions are denied, fallback to clipboard below
    }
  }

  // Clipboard copy fallback
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      return { success: true, method: "clipboard" };
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return { success: true, method: "clipboard" };
    }
  } catch (e) {
    console.error("Failed to copy room link:", e);
    return { success: false, method: "error" };
  }
}
