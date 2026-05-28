import { expect, test, type Page } from '@playwright/test';

const useMockServer = process.env.E2E_USE_MOCK === '1';
const PREVIEW_URL = '/mascot-design-preview.html?api_origin=http://127.0.0.1:8000';
const WAITING_PHRASE = 'Секунду, я сейчас над этим подумаю.';

async function primeVoiceSettings(page: Page, consent: 'granted' | 'denied' | 'unknown', muted: '0' | '1'): Promise<void> {
  await page.addInitScript(({ nextConsent, nextMuted }) => {
    const normalize = (value: string) =>
      String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]/gi, '-')
        .replace(/-+/g, '-')
        .slice(0, 80);
    const query = new URLSearchParams(window.location.search);
    const pid = query.get('pid') || query.get('id') || 'default';
    const instance = query.get('instance') || query.get('instanceId') || `manyasha-${normalize(pid || 'default')}`;
    const origin = String((window.location && window.location.origin) || '');
    const ns = [
      'manyasha_ns',
      normalize(origin || 'unknown-origin'),
      normalize(pid || 'default'),
      normalize(instance || `manyasha-${pid || 'default'}`),
    ].join('::');
    localStorage.setItem(`${ns}::manyasha_voice_consent_v1`, nextConsent);
    localStorage.setItem(`${ns}::manyasha_muted`, nextMuted);
  }, { nextConsent: consent, nextMuted: muted });
}

async function currentVisualState(page: Page): Promise<string> {
  return page.evaluate(() => {
    const widget = document.getElementById('manyasha-widget');
    return String(widget?.getAttribute('data-visual-state') || '');
  });
}

async function currentMediaSnapshot(page: Page): Promise<{ state: string; srcs: string[]; fallbackSrc: string; backdrop: string }> {
  return page.evaluate(() => {
    const state = String((window as any).manyashaGetMediaState?.().state || '');
    const srcs = Array.from(document.querySelectorAll<HTMLVideoElement>('#manyasha-stage video'))
      .map((video) => String(video.currentSrc || video.getAttribute('src') || ''))
      .filter(Boolean);
    const fallback = document.getElementById('manyasha-stage-fallback') as HTMLImageElement | null;
    const widget = document.getElementById('manyasha-widget');
    const backdrop = widget ? getComputedStyle(widget).getPropertyValue('--manyasha-stage-backdrop') : '';
    return { state, srcs, fallbackSrc: String(fallback?.currentSrc || fallback?.getAttribute('src') || ''), backdrop: String(backdrop || '') };
  });
}

async function startStateLog(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as any;
    if (w.__manyashaStateObserver) {
      try { w.__manyashaStateObserver.disconnect(); } catch (_err) {}
      w.__manyashaStateObserver = null;
    }
    w.__manyashaStateLog = [];
    const widget = document.getElementById('manyasha-widget');
    if (!widget) return;
    const push = () => {
      const v = String(widget.getAttribute('data-visual-state') || '');
      if (!v) return;
      w.__manyashaStateLog.push(v);
    };
    push();
    const observer = new MutationObserver(() => push());
    observer.observe(widget, { attributes: true, attributeFilter: ['data-visual-state'] });
    w.__manyashaStateObserver = observer;
  });
}

async function stopStateLog(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const w = window as any;
    if (w.__manyashaStateObserver) {
      try { w.__manyashaStateObserver.disconnect(); } catch (_err) {}
      w.__manyashaStateObserver = null;
    }
    const out = Array.isArray(w.__manyashaStateLog) ? w.__manyashaStateLog.slice() : [];
    w.__manyashaStateLog = [];
    return out.filter((item: unknown) => typeof item === 'string' && item.length > 0);
  });
}

function squeezeTransitions(states: string[]): string[] {
  const out: string[] = [];
  for (const s of states) {
    if (!out.length || out[out.length - 1] !== s) out.push(s);
  }
  return out;
}

function indexAfter(states: string[], value: string, after: number): number {
  for (let i = Math.max(0, after); i < states.length; i += 1) {
    if (states[i] === value) return i;
  }
  return -1;
}

function makeSilentWav(durationMs: number, sampleRate = 16000): Buffer {
  const channels = 1;
  const bitsPerSample = 16;
  const blockAlign = channels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const sampleCount = Math.max(1, Math.floor((sampleRate * durationMs) / 1000));
  const dataSize = sampleCount * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

test.describe('Widget visual state machine', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(useMockServer, 'Тесты state-machine требуют реальный backend.');
    await primeVoiceSettings(page, 'granted', '0');
  });

  test('SM-01: idle -> listening -> thinking -> speaking -> idle', async ({ page }) => {
    await page.route('**/api/manyasha/chat', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1300));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: 'Поняла задачу. Сейчас помогу по шагам.',
          speech_reply: 'Поняла задачу, сейчас помогу по шагам.',
          suggest_consultation: false,
          mood: 'neutral',
        }),
      });
    });

    await page.goto(PREVIEW_URL);
    await expect(page.locator('#manyasha-widget')).toBeVisible();
    await expect.poll(() => currentVisualState(page), { timeout: 10_000 }).toBe('idle');

    await startStateLog(page);

    await page.locator('#manyasha-chat-input').fill('Проверь состояние виджета');
    await expect.poll(() => currentVisualState(page), { timeout: 3_000 }).toBe('listening');

    await page.locator('#manyasha-chat-send').click();
    await page.waitForTimeout(220);
    await expect.poll(() => currentVisualState(page), { timeout: 2_000 }).toBe('thinking');

    // Anti-jitter при pending запросе: искусственный input не должен возвращать состояние в listening.
    await page.evaluate(() => {
      const input = document.getElementById('manyasha-chat-input') as HTMLTextAreaElement | null;
      if (!input) return;
      input.value = 'попытка сбить состояние';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await expect.poll(() => currentVisualState(page), { timeout: 8_000 }).toBe('speaking');
    await expect.poll(() => currentVisualState(page), { timeout: 12_000 }).toBe('idle');

    const transitions = squeezeTransitions(await stopStateLog(page));
    const idxListening = indexAfter(transitions, 'listening', 0);
    const idxThinking = indexAfter(transitions, 'thinking', idxListening + 1);
    const idxSpeaking = indexAfter(transitions, 'speaking', idxThinking + 1);
    const idxIdleBack = indexAfter(transitions, 'idle', idxSpeaking + 1);

    expect(idxListening).toBeGreaterThanOrEqual(0);
    expect(idxThinking).toBeGreaterThan(idxListening);
    expect(idxSpeaking).toBeGreaterThan(idxThinking);
    expect(idxIdleBack).toBeGreaterThan(idxSpeaking);
    expect(transitions.slice(idxThinking + 1, idxSpeaking)).not.toContain('listening');

    const idleMedia = await currentMediaSnapshot(page);
    expect(idleMedia.state).toBe('idle');
    expect(idleMedia.srcs.join('\n')).not.toContain('manyasha-idle.mp4');
    expect(idleMedia.fallbackSrc).not.toContain('manyasha-idle-poster.jpg');
    expect(idleMedia.backdrop).not.toContain('manyasha-idle-poster.jpg');
  });

  test('SM-02: rapid input toggles do not cause visual jitter', async ({ page }) => {
    await page.goto(PREVIEW_URL);
    await expect(page.locator('#manyasha-widget')).toBeVisible();
    await expect.poll(() => currentVisualState(page), { timeout: 10_000 }).toBe('idle');

    await startStateLog(page);

    await page.evaluate(() => {
      const input = document.getElementById('manyasha-chat-input') as HTMLTextAreaElement | null;
      if (!input) return;
      for (let i = 0; i < 10; i += 1) {
        input.value = i % 2 === 0 ? 'быстрый ввод' : '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      input.value = 'финальный ввод';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await expect.poll(() => currentVisualState(page), { timeout: 3_000 }).toBe('listening');

    await page.evaluate(() => {
      const input = document.getElementById('manyasha-chat-input') as HTMLTextAreaElement | null;
      if (!input) return;
      for (let i = 0; i < 8; i += 1) {
        input.value = i % 2 === 0 ? '' : 'x';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await expect.poll(() => currentVisualState(page), { timeout: 3_000 }).toBe('idle');

    const transitions = squeezeTransitions(await stopStateLog(page));
    const heavyOscillationPattern = 'idle>listening>idle>listening>idle>listening';

    expect(transitions).toEqual(expect.arrayContaining(['idle', 'listening']));
    expect(transitions.length).toBeLessThanOrEqual(4);
    expect(transitions.join('>')).not.toContain(heavyOscillationPattern);
  });

  test('SM-03: speaking animation keeps looping until main audio ended', async ({ page }) => {
    await page.route('**/api/manyasha/chat', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 900));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: 'Подробный ответ для проверки синхронизации talking-анимации.',
          speech_reply: 'Короткая голосовая реплика для синхронизации.',
          suggest_consultation: false,
          mood: 'neutral',
        }),
      });
    });
    await page.route('**/api/tts', async (route) => {
      const payload = route.request().postDataJSON() as { text?: string } | null;
      const text = String(payload?.text || '').trim();
      const wav = text === WAITING_PHRASE ? makeSilentWav(650) : makeSilentWav(2800);
      await route.fulfill({
        status: 200,
        contentType: 'audio/wav',
        body: wav,
      });
    });

    await page.goto(PREVIEW_URL);
    await expect(page.locator('#manyasha-widget')).toBeVisible();
    await expect.poll(() => currentVisualState(page), { timeout: 10_000 }).toBe('idle');

    await page.locator('#manyasha-chat-input').fill('Проверь, что talking не обрывается раньше голоса');
    await page.locator('#manyasha-chat-send').click();

    await expect.poll(() => currentVisualState(page), { timeout: 2_500 }).toBe('thinking');
    await expect.poll(() => currentVisualState(page), { timeout: 9_000 }).toBe('speaking');
    await page.waitForTimeout(1_200);
    await expect.poll(() => currentVisualState(page), { timeout: 1_500 }).toBe('speaking');
    await expect.poll(() => currentVisualState(page), { timeout: 8_000 }).toBe('idle');
  });

  test('SM-04: media controller allowlist remaps legacy states safely', async ({ page }) => {
    await page.goto(PREVIEW_URL);
    await expect(page.locator('#manyasha-widget')).toBeVisible();
    await expect.poll(() => currentVisualState(page), { timeout: 10_000 }).toBe('idle');

    const publicStates = [
      'greeting',
      'idle',
      'listening',
      'thinking',
      'answering',
      'speaking',
      'short',
      'long',
      'error',
      'confused',
      'goodbye',
      'compliment',
      'thanks',
      'good',
      'empathy',
      'consult',
      'success',
      'motivate',
      'custom-16',
      'random-old-state',
    ];
    const allowedStates = new Set(['greeting', 'idle', 'listening', 'thinking', 'answering']);
    const allowedSrc = /manyasha-(greeting|listening|thinking|answering)\.mp4(?:$|\?)/;
    const forbiddenSrc = /(custom-|reassure|clarify|short\.mp4|long\.mp4|goodbye\.mp4|error\.mp4|confused\.mp4|compliment\.mp4|thanks\.mp4|good\.mp4|empathy\.mp4|consult\.mp4|success\.mp4|motivate\.mp4)/;

    for (const state of publicStates) {
      await page.evaluate((nextState) => {
        (window as any).manyashaPlay?.(nextState);
      }, state);
      await page.waitForTimeout(120);
      const snapshot = await currentMediaSnapshot(page);

      expect(allowedStates.has(snapshot.state), `state ${state} remapped to ${snapshot.state}`).toBeTruthy();
      for (const src of snapshot.srcs) {
        expect(src, `state ${state} should not use removed idle loop`).not.toContain('manyasha-idle.mp4');
        expect(src, `state ${state} should not use forbidden video`).not.toMatch(forbiddenSrc);
        expect(src, `state ${state} should use approved Manyasha mp4`).toMatch(allowedSrc);
      }
    }
  });

  test('SM-05: assistant-only saved history does not restore a long startup answer', async ({ page }) => {
    const longStartupAnswer = 'Я Маняша, помогаю по долгам и банкротству без перегруза юридическим языком.';
    await page.addInitScript((message) => {
      const normalize = (value: string) =>
        String(value || '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9._-]/gi, '-')
          .replace(/-+/g, '-')
          .slice(0, 80);
      const query = new URLSearchParams(window.location.search);
      const pid = query.get('pid') || query.get('id') || 'default';
      const instance = query.get('instance') || query.get('instanceId') || `manyasha-${normalize(pid || 'default')}`;
      const origin = String((window.location && window.location.origin) || '');
      const ns = [
        'manyasha_ns',
        normalize(origin || 'unknown-origin'),
        normalize(pid || 'default'),
        normalize(instance || `manyasha-${pid || 'default'}`),
      ].join('::');
      localStorage.setItem(`${ns}::manyasha_history`, JSON.stringify({
        messages: [{ role: 'assistant', content: message }],
      }));
    }, longStartupAnswer);
    await page.route('**/api/chat/session/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ messages: [] }),
      });
    });

    await page.goto(PREVIEW_URL);
    await expect(page.locator('#manyasha-widget')).toBeVisible();
    await expect.poll(() => currentVisualState(page), { timeout: 10_000 }).toBe('idle');
    await expect(page.locator('#manyasha-chat-messages')).toContainText('Я рядом и помогу спокойно разобрать вашу ситуацию по шагам.', { timeout: 3_000 });
    await expect(page.locator('#manyasha-chat-messages')).not.toContainText(longStartupAnswer);
  });

  test('SM-06: slow live media keeps requested flow without random animation', async ({ page }) => {
    const allowedSrc = /manyasha-(greeting|listening|thinking|answering)\.mp4(?:$|\?)/;
    const forbiddenSrc = /(custom-|reassure|clarify|short\.mp4|long\.mp4|goodbye\.mp4|error\.mp4|confused\.mp4|compliment\.mp4|thanks\.mp4|good\.mp4|empathy\.mp4|consult\.mp4|success\.mp4|motivate\.mp4)/;

    await page.route('**/mascot/v/*.mp4', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 650));
      await route.continue();
    });
    await page.route('**/api/manyasha/chat', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: 'LIVE_SLOW_MEDIA_MARKER: отвечаю без случайной анимации.',
          speech_reply: 'Отвечаю без случайной анимации.',
          suggest_consultation: false,
          mood: 'neutral',
        }),
      });
    });
    await page.route('**/api/tts', async (route) => {
      const payload = route.request().postDataJSON() as { text?: string } | null;
      const text = String(payload?.text || '').trim();
      await route.fulfill({
        status: 200,
        contentType: 'audio/wav',
        body: text === WAITING_PHRASE ? makeSilentWav(350) : makeSilentWav(600),
      });
    });

    await page.goto(PREVIEW_URL);
    await expect(page.locator('#manyasha-widget')).toBeVisible();
    await expect.poll(() => currentVisualState(page), { timeout: 10_000 }).toBe('idle');

    await page.locator('#manyasha-chat-input').fill('Проверь slow media flow');
    await expect.poll(() => currentVisualState(page), { timeout: 1_500 }).toBe('listening');
    await page.locator('#manyasha-chat-send').click();
    await expect.poll(() => currentVisualState(page), { timeout: 1_000 }).toBe('thinking');

    const thinkingMedia = await currentMediaSnapshot(page);
    for (const src of thinkingMedia.srcs) {
      expect(src).not.toMatch(forbiddenSrc);
      expect(src).toMatch(allowedSrc);
    }

    await expect.poll(() => currentVisualState(page), { timeout: 8_000 }).toBe('speaking');
    const speakingMedia = await currentMediaSnapshot(page);
    for (const src of speakingMedia.srcs) {
      expect(src).not.toMatch(forbiddenSrc);
      expect(src).toMatch(allowedSrc);
    }
    await expect(page.locator('#manyasha-chat-messages')).toContainText('LIVE_SLOW_MEDIA_MARKER', { timeout: 8_000 });
    await expect.poll(() => currentVisualState(page), { timeout: 8_000 }).toBe('idle');
  });
});
