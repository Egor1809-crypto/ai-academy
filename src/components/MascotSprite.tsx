"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface MascotSpriteProps {
  /** Number of frames */
  frameCount?: number;
  /** Frames per second */
  fps?: number;
  /** Extra CSS classes for the wrapper */
  className?: string;
  /** Inline style for the wrapper */
  style?: React.CSSProperties;
}

const FRAME_PATH = "/mascot/frames/idle_";

export default function MascotSprite({
  frameCount = 16,
  fps = 10,
  className = "",
  style,
}: MascotSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const [loaded, setLoaded] = useState(false);

  // Preload all frames
  useEffect(() => {
    let cancelled = false;
    const images: HTMLImageElement[] = [];
    let loadedCount = 0;

    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      img.src = `${FRAME_PATH}${String(i).padStart(2, "0")}.png`;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === frameCount && !cancelled) {
          imagesRef.current = images;
          setLoaded(true);
        }
      };
      images.push(img);
    }

    return () => {
      cancelled = true;
    };
  }, [frameCount]);

  // Animation loop
  const animate = useCallback(
    (time: number) => {
      if (!loaded) return;
      const interval = 1000 / fps;
      const delta = time - lastTimeRef.current;

      if (delta >= interval) {
        lastTimeRef.current = time - (delta % interval);
        const canvas = canvasRef.current;
        const images = imagesRef.current;
        if (canvas && images.length > 0) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const frame = images[frameRef.current];
            canvas.width = frame.naturalWidth;
            canvas.height = frame.naturalHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(frame, 0, 0);
            frameRef.current = (frameRef.current + 1) % images.length;
          }
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    },
    [loaded, fps],
  );

  useEffect(() => {
    if (loaded) {
      rafRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [loaded, animate]);

  return (
    <div className={`relative ${className}`} style={style}>
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-contain transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
