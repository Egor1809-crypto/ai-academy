import { loadSlim } from "@tsparticles/slim";
import type { Engine } from "@tsparticles/engine";

// Единая, СТАБИЛЬНАЯ по ссылке функция инициализации движка частиц.
// ParticlesProvider из @tsparticles/react требует, чтобы init-callback был
// одним и тем же на протяжении жизни приложения (иначе кидает
// "init callback must be stable"). Поэтому держим её здесь как singleton и
// импортируем во все particle-компоненты.
export async function initEngine(engine: Engine): Promise<void> {
  await loadSlim(engine);
}
