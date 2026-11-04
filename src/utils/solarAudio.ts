// Utility for managing Solar YouTube video audio in the 3D game arena

let currentVolume = 75;
let isMuted = true; // Modern browsers require muted autoplay initially

export function getSolarAudioState() {
  return { volume: currentVolume, isMuted };
}

export function sendSolarYouTubeCommand(func: string, args: any[] = []) {
  const iframe = document.getElementById("solar-youtube-iframe") as HTMLIFrameElement | null;
  if (iframe && iframe.contentWindow) {
    try {
      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: func,
          args: args,
        }),
        "*"
      );
    } catch (e) {
      console.warn("Failed to send command to Solar YouTube iframe:", e);
    }
  }
}

export function setSolarVolume(vol: number) {
  const clamped = Math.max(0, Math.min(100, Math.round(vol)));
  currentVolume = clamped;
  if (clamped === 0) {
    isMuted = true;
    sendSolarYouTubeCommand("mute");
  } else {
    isMuted = false;
    sendSolarYouTubeCommand("unMute");
    sendSolarYouTubeCommand("setVolume", [clamped]);
    sendSolarYouTubeCommand("playVideo");
  }
  notifyAudioListeners();
}

export function toggleSolarMute() {
  if (isMuted) {
    isMuted = false;
    if (currentVolume === 0) currentVolume = 75;
    sendSolarYouTubeCommand("unMute");
    sendSolarYouTubeCommand("setVolume", [currentVolume]);
    sendSolarYouTubeCommand("playVideo");
  } else {
    isMuted = true;
    sendSolarYouTubeCommand("mute");
  }
  notifyAudioListeners();
}

const listeners = new Set<() => void>();

export function subscribeSolarAudio(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyAudioListeners() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error(e);
    }
  });
}
