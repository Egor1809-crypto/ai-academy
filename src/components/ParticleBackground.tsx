"use client";

import { useEffect, useMemo, useState } from "react";
import { Particles } from "@tsparticles/react";
import type { ISourceOptions } from "@tsparticles/engine";

export default function ParticleBackground() {
  // Skip the particle engine entirely for visitors who prefer reduced motion.
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  const options: ISourceOptions = useMemo(
    () => ({
      fullScreen: false,
      background: { color: { value: "transparent" } },
      fpsLimit: 60,
      interactivity: {
        events: {
          onHover: { enable: true, mode: "grab" },
        },
        modes: {
          grab: { distance: 220, links: { opacity: 0.6 } },
        },
      },
      particles: {
        color: { value: ["#00CFFF", "#00CFFF", "#70EFFF", "#00CFFF"] },
        links: {
          color: "#00CFFF",
          distance: 180,
          enable: true,
          opacity: 0.25,
          width: 1.2,
          triangles: {
            enable: true,
            color: "#00CFFF",
            opacity: 0.03,
          },
        },
        move: {
          enable: true,
          speed: 0.6,
          direction: "none",
          outModes: { default: "out" },
        },
        number: {
          value: 90,
          density: { enable: true },
        },
        opacity: {
          value: { min: 0.2, max: 0.7 },
          animation: { enable: true, speed: 0.6, sync: false },
        },
        size: {
          value: { min: 1.5, max: 4 },
        },
        shape: { type: "circle" },
      },
      detectRetina: true,
    }),
    []
  );

  if (reducedMotion) return null;

  return (
    <Particles id="hero-particles" className="absolute inset-0 z-0" options={options} />
  );
}
