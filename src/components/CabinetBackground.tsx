"use client";

import dynamic from "next/dynamic";

// Лёгкий слой частиц «как на главной» — рендерим только на клиенте (ssr:false),
// поэтому держим в отдельном клиентском компоненте: серверная страница кабинета
// не может использовать dynamic с ssr:false напрямую.
const SectionParticles = dynamic(() => import("./SectionParticles"), {
  ssr: false,
});

export default function CabinetBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-60">
      <SectionParticles id="cabinet-particles" preset="fireflies" />
    </div>
  );
}
