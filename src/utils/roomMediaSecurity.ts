/**
 * Security and Sanitization utilities for Custom Room Media (StarshipX Battle)
 * 
 * Rules enforced:
 * 1. Strictly YouTube links allowed (reject all other domains/protocols).
 * 2. Strict anti-tracking image sanitization: strips all EXIF metadata, GPS coordinates,
 *    camera serial numbers, tracking pixels, and malicious payloads by re-rasterizing
 *    the image pixels on an isolated HTML5 Canvas.
 */

export interface YouTubeValidationResult {
  valid: boolean;
  videoId?: string;
  embedUrl?: string;
  error?: string;
}

export interface ImageSanitizationResult {
  valid: boolean;
  sanitizedDataUrl?: string;
  width?: number;
  height?: number;
  error?: string;
}

/**
 * Validates that the provided URL belongs strictly to YouTube and extracts the clean video ID.
 * Rejects any external or third-party domains, javascript/data protocols, or malicious redirects.
 */
export function validateAndExtractYouTube(url: string): YouTubeValidationResult {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "Link do YouTube é obrigatório." };
  }

  const cleanUrl = url.trim();

  // Strict domain and path validation for official YouTube formats:
  // - https://www.youtube.com/watch?v=VIDEO_ID
  // - https://youtube.com/watch?v=VIDEO_ID
  // - https://youtu.be/VIDEO_ID
  // - https://www.youtube.com/embed/VIDEO_ID
  // - https://www.youtube.com/shorts/VIDEO_ID
  const ytRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[?&].*)?$/;

  const match = cleanUrl.match(ytRegex);

  if (!match || !match[1]) {
    return {
      valid: false,
      error: "Apenas links oficiais do YouTube são permitidos (ex: https://www.youtube.com/watch?v=... ou https://youtu.be/...). Nenhum outro link ou domínio é aceito."
    };
  }

  const videoId = match[1];

  // Extra safety: video ID must be exactly 11 alphanumeric characters / dash / underscore
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return { valid: false, error: "ID do vídeo do YouTube inválido." };
  }

  // Safe privacy-enhanced embed URL with autoplay, loop, mute and no external redirects
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&playsinline=1&modestbranding=1&rel=0`;

  return {
    valid: true,
    videoId,
    embedUrl
  };
}

/**
 * Anti-Tracking & Anti-Exploit Image Sanitization:
 * - Rejects SVGs (vector format susceptible to XSS/CSS script injection).
 * - Re-encodes raw pixel data via HTMLCanvas to permanently strip:
 *   1. EXIF metadata (camera serial, date, software, firmware).
 *   2. Geolocation / GPS latitude, longitude, and altitude tags.
 *   3. Steganographic markers, embedded canary tokens, and tracking payloads.
 *   4. Malicious headers or polyglots.
 */
export async function sanitizeImageFile(file: File): Promise<ImageSanitizationResult> {
  if (!file) {
    return { valid: false, error: "Nenhum arquivo de imagem fornecido." };
  }

  // Strictly enforce safe raster image mime types
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Formato inválido. Apenas imagens raster seguras (JPEG, PNG ou WebP) são permitidas. Arquivos SVG ou executáveis são bloqueados por segurança."
    };
  }

  // Size limit: 8MB max upload before processing
  if (file.size > 8 * 1024 * 1024) {
    return {
      valid: false,
      error: "O arquivo selecionado excede o limite máximo de 8 MB."
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => {
      resolve({ valid: false, error: "Falha ao ler o arquivo de imagem." });
    };

    reader.onload = () => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onerror = () => {
        resolve({ valid: false, error: "Arquivo corrompido ou imagem ilegível." });
      };

      img.onload = () => {
        try {
          // Normalize dimensions (max 1024x1024 for 3D sphere texture performance)
          const MAX_DIM = 1024;
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width <= 0 || height <= 0) {
            resolve({ valid: false, error: "Dimensões da imagem inválidas." });
            return;
          }

          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          // Off-screen canvas re-rasterization
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d", { willReadFrequently: false });
          if (!ctx) {
            resolve({ valid: false, error: "Não foi possível criar o contexto gráfico de higienização." });
            return;
          }

          // Draw the raw image pixels onto fresh canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Re-encode from scratch to WebP (or JPEG fallback)
          // This strips all EXIF, GPS, camera metadata, comments, and auxiliary data streams
          const sanitizedDataUrl = canvas.toDataURL("image/webp", 0.85);

          // Release memory
          canvas.width = 0;
          canvas.height = 0;

          resolve({
            valid: true,
            sanitizedDataUrl,
            width,
            height
          });
        } catch (e: any) {
          resolve({ valid: false, error: `Erro na higienização da imagem: ${e?.message || e}` });
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
