"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

/**
 * Детектор бага Chrome с alpha-WebM (VP9 yuva420p): на части GPU при аппаратном
 * декодировании альфа игнорируется и на месте маскота рендерится чёрный
 * прямоугольник. Хук рисует кадр видео на canvas и проверяет углы, которые у
 * исправного видео прозрачны. Если они вернулись непрозрачно-чёрными — значит
 * альфа не работает, и компонент должен показать статичную картинку.
 *
 * Возвращает `true`, когда видео нужно заменить на фолбэк-изображение. Срабатывает
 * также на `error` видео и на таймаут декодирования (видео так и не отдало кадр).
 *
 * PATTERN(7): FeatureDetect; CONCEPT(8): GracefulDegradation; TECH(7): Canvas, Video
 */
export function useAlphaVideoFallback(
  ref: RefObject<HTMLVideoElement | null>,
): boolean {
  const [fallback, setFallback] = useState(false);

  const probe = useCallback(() => {
    const v = ref.current;
    if (!v || v.videoWidth === 0 || v.videoHeight === 0) return;
    try {
      const c = document.createElement("canvas");
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(v, 0, 0, c.width, c.height);
      const pts: [number, number][] = [
        [4, 4],
        [c.width - 5, 4],
        [4, c.height - 5],
        [c.width - 5, c.height - 5],
      ];
      let opaqueBlack = 0;
      for (const [x, y] of pts) {
        const d = ctx.getImageData(x, y, 1, 1).data;
        if (d[3] > 250 && d[0] < 16 && d[1] < 16 && d[2] < 16) opaqueBlack++;
      }
      // ≥3 из 4 прозрачных углов оказались чёрно-непрозрачными → баг альфы.
      if (opaqueBlack >= 3) setFallback(true);
    } catch {
      /* readback заблокирован (tainted canvas) — оставляем видео как есть */
    }
  }, [ref]);

  // BUG_FIX_CONTEXT: Safari (desktop+iOS) не поддерживает VP9/VP8-WebM вообще —
  // видео не декодируется и виден чёрный фон <video>; onError при этом срабатывает
  // ненадёжно. Детерминированно ловим это через canPlayType и сразу включаем
  // статичный фолбэк, не дожидаясь onError/таймаута.
  useEffect(() => {
    const test = document.createElement("video");
    const vp9 = test.canPlayType('video/webm; codecs="vp9"');
    const vp8 = test.canPlayType('video/webm; codecs="vp8"');
    if (!vp9 && !vp8) setFallback(true);
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    const onPlay = () => {
      t1 = setTimeout(probe, 250);
      t2 = setTimeout(probe, 900);
    };
    const onErr = () => setFallback(true);
    v.addEventListener("playing", onPlay);
    v.addEventListener("error", onErr);
    // Страховка: если кадр так и не декодировался за 2.5с — показываем картинку.
    const guard = setTimeout(() => {
      if ((ref.current?.readyState ?? 0) < 2) setFallback(true);
    }, 2500);
    return () => {
      v.removeEventListener("playing", onPlay);
      v.removeEventListener("error", onErr);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(guard);
    };
  }, [probe, ref]);

  return fallback;
}
