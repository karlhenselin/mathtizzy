/** Shared spoken-form helpers for playback and offline TTS generation. */

/** Stable 8-char id from the spoken form of a cue (djb2-style, same as Shepherd). */
export function voiceClipId(text) {
  const spoken = String(text);
  let hash = 5381;

  for (let i = 0; i < spoken.length; i++) {
    hash = Math.imul(hash, 33) ^ spoken.charCodeAt(i);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function voiceClipUrl(text) {
  return `assets/voice/${voiceClipId(text)}.mp3`;
}
