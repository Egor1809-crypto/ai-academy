"use client";

import { useMemo } from "react";
import { Particles, ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Engine, ISourceOptions } from "@tsparticles/engine";

function ParticleCanvas() {
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
        color: { value: ["#00CFFF", "#FF007A", "#7B61FF", "#00CFFF"] },
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

  return (
    <Particles id="hero-particles" className="absolute inset-0 z-0" options={options} />
  );
}

async function initEngine(engine: Engine): Promise<void> {
  await loadSlim(engine);
}

export default function ParticleBackground() {
  return (
    <ParticlesProvider init={initEngine}>
      <ParticleCanvas />
    </ParticlesProvider>
  );
}
