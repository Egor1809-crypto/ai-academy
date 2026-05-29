"use client";

import { useMemo } from "react";
import { Particles } from "@tsparticles/react";
import type { ISourceOptions } from "@tsparticles/engine";

/**
 * Preset configurations — each section gets a unique particle feel.
 *
 * "constellation"  — sparse, slow, big triangles (WhyNow)
 * "fireflies"      — tiny warm dots drifting up (Manifesto)
 * "matrix"         — dense falling green/cyan dots (Audience)
 * "nebula"         — large blurry blobs with slow drift (Testimonials)
 * "sparks"         — fast small gold sparks bouncing (TimeSavingsCalc)
 * "orbit"          — circular motion, few big particles (UseCases)
 */
export type ParticlePreset =
  | "constellation"
  | "fireflies"
  | "matrix"
  | "nebula"
  | "sparks"
  | "orbit";

const PRESETS: Record<ParticlePreset, () => ISourceOptions> = {
  /* ── WhyNow — constellation: sparse nodes, thick links, triangles ── */
  constellation: () => ({
    fullScreen: false,
    background: { color: { value: "transparent" } },
    fpsLimit: 30,
    interactivity: {
      events: { onHover: { enable: true, mode: "connect" } },
      modes: { connect: { distance: 200, radius: 200, links: { opacity: 0.3 } } },
    },
    particles: {
      color: { value: ["#00CFFF", "#7B61FF"] },
      links: {
        color: "#00CFFF",
        distance: 220,
        enable: true,
        opacity: 0.12,
        width: 1,
        triangles: { enable: true, color: "#7B61FF", opacity: 0.015 },
      },
      move: { enable: true, speed: 0.3, direction: "none" as const, outModes: { default: "bounce" as const } },
      number: { value: 35, density: { enable: true } },
      opacity: { value: { min: 0.15, max: 0.5 } },
      size: { value: { min: 2, max: 5 } },
      shape: { type: "circle" },
    },
    detectRetina: true,
  }),

  /* ── Manifesto — fireflies: warm tiny dots floating upward ── */
  fireflies: () => ({
    fullScreen: false,
    background: { color: { value: "transparent" } },
    fpsLimit: 30,
    particles: {
      color: { value: ["#00CFFF", "#FFD700", "#FF007A"] },
      links: { enable: false },
      move: {
        enable: true,
        speed: { min: 0.2, max: 0.8 },
        direction: "top" as const,
        outModes: { default: "out" as const },
        straight: false,
        random: true,
      },
      number: { value: 40, density: { enable: true } },
      opacity: {
        value: { min: 0.1, max: 0.6 },
        animation: { enable: true, speed: 1.2, sync: false, startValue: "random" as const },
      },
      size: { value: { min: 1, max: 3 } },
      shape: { type: "circle" },
      wobble: { enable: true, distance: 15, speed: 5 },
    },
    detectRetina: true,
  }),

  /* ── Audience — matrix: dense, falling tiny dots like digital rain ── */
  matrix: () => ({
    fullScreen: false,
    background: { color: { value: "transparent" } },
    fpsLimit: 30,
    particles: {
      color: { value: ["#00CFFF", "#00CFFF", "#7B61FF"] },
      links: { enable: false },
      move: {
        enable: true,
        speed: { min: 0.5, max: 1.5 },
        direction: "bottom" as const,
        outModes: { default: "out" as const },
        straight: true,
      },
      number: { value: 60, density: { enable: true } },
      opacity: {
        value: { min: 0.05, max: 0.35 },
        animation: { enable: true, speed: 0.8, sync: false },
      },
      size: { value: { min: 1, max: 2.5 } },
      shape: { type: "circle" },
    },
    detectRetina: true,
  }),

  /* ── Testimonials — nebula: large blurry slow-moving blobs ── */
  nebula: () => ({
    fullScreen: false,
    background: { color: { value: "transparent" } },
    fpsLimit: 30,
    particles: {
      color: { value: ["#00CFFF", "#7B61FF", "#FF007A"] },
      links: { enable: false },
      move: {
        enable: true,
        speed: 0.15,
        direction: "none" as const,
        outModes: { default: "bounce" as const },
        random: true,
      },
      number: { value: 12 },
      opacity: {
        value: { min: 0.02, max: 0.08 },
        animation: { enable: true, speed: 0.3, sync: false },
      },
      size: {
        value: { min: 30, max: 80 },
        animation: { enable: true, speed: 2, sync: false, startValue: "random" as const },
      },
      shape: { type: "circle" },
    },
    detectRetina: true,
  }),

  /* ── TimeSavingsCalc — sparks: fast small gold particles bouncing ── */
  sparks: () => ({
    fullScreen: false,
    background: { color: { value: "transparent" } },
    fpsLimit: 30,
    interactivity: {
      events: { onHover: { enable: true, mode: "repulse" } },
      modes: { repulse: { distance: 100, speed: 0.5 } },
    },
    particles: {
      color: { value: ["#00CFFF", "#FFD700"] },
      links: {
        color: "#00CFFF",
        distance: 100,
        enable: true,
        opacity: 0.08,
        width: 0.5,
      },
      move: {
        enable: true,
        speed: { min: 0.8, max: 2 },
        direction: "none" as const,
        outModes: { default: "bounce" as const },
      },
      number: { value: 50, density: { enable: true } },
      opacity: { value: { min: 0.1, max: 0.5 } },
      size: { value: { min: 0.8, max: 2 } },
      shape: { type: "circle" },
    },
    detectRetina: true,
  }),

  /* ── UseCases — orbit: few large particles with circular paths ── */
  orbit: () => ({
    fullScreen: false,
    background: { color: { value: "transparent" } },
    fpsLimit: 30,
    particles: {
      color: { value: ["#00CFFF", "#7B61FF", "#FF007A", "#FFD700"] },
      links: {
        color: "#7B61FF",
        distance: 300,
        enable: true,
        opacity: 0.06,
        width: 1.5,
      },
      move: {
        enable: true,
        speed: 0.4,
        direction: "none" as const,
        outModes: { default: "bounce" as const },
        path: {
          enable: true,
          delay: { value: 0 },
        },
      },
      number: { value: 18 },
      opacity: {
        value: { min: 0.15, max: 0.6 },
        animation: { enable: true, speed: 0.5, sync: false },
      },
      size: { value: { min: 3, max: 7 } },
      shape: { type: "circle" },
    },
    detectRetina: true,
  }),
};

/* ── Public component ── */
interface SectionParticlesProps {
  id: string;
  preset: ParticlePreset;
}

export default function SectionParticles({ id, preset }: SectionParticlesProps) {
  const options = useMemo(() => PRESETS[preset](), [preset]);
  return <Particles id={id} className="absolute inset-0 z-0 pointer-events-none" options={options} />;
}
