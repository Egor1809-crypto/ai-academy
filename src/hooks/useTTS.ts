"use client";

import { useRef, useCallback, useEffect } from "react";

export function useTTS() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());

  // Cleanup blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    const cache = cacheRef.current;
    return () => {
      // Stop any playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      // Abort any in-flight request
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      // Revoke all cached blob URLs
      for (const url of cache.values()) {
        URL.revokeObjectURL(url);
      }
      cache.clear();
    };
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!text) return;

    // Stop previous playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Abort previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    // Check cache
    const cached = cacheRef.current.get(text);
    if (cached) {
      const audio = new Audio(cached);
      audioRef.current = audio;
      audio.play().catch(() => {});
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      if (!res.ok) return;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Limit cache size to prevent unbounded growth
      if (cacheRef.current.size >= 20) {
        const firstKey = cacheRef.current.keys().next().value;
        if (firstKey !== undefined) {
          const oldUrl = cacheRef.current.get(firstKey);
          if (oldUrl) URL.revokeObjectURL(oldUrl);
          cacheRef.current.delete(firstKey);
        }
      }

      cacheRef.current.set(text, url);

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play().catch(() => {});
    } catch {
      // Aborted or network error — ignore
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  return { speak, stop };
}
