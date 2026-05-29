"use client";

import { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Engine } from "@tsparticles/engine";

async function initEngine(engine: Engine): Promise<void> {
  await loadSlim(engine);
}

export default function ParticlesInit({ children }: { children: React.ReactNode }) {
  return <ParticlesProvider init={initEngine}>{children}</ParticlesProvider>;
}
