import { expect, test, type Page } from '@playwright/test';

const useMockServer = process.env.E2E_USE_MOCK === '1';
const PREVIEW_URL = '/mascot-design-preview.html?api_origin=http://127.0.0.1:8000';

async function openWidget(page: Page): Promise<void> {
  await page.goto(PREVIEW_URL);
  await expect(page.locator('#manyasha-widget')).toBeVisible();
  await expect.poll(async () => {
    return page.locator('#manyasha-widget').getAttribute('data-visual-state');
  }, { timeout: 20_000 }).toBe('idle');
}

async function sendChatMessage(page: Page, text: string): Promise<void> {
  await page.locator('#manyasha-chat-input').fill(text);
  await page.locator('#manyasha-chat-send').click();
}

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

type TtsPlayMetrics = {
  audioPlays: number;
  synthesisPlays: number;
};

type AudioTimelineEvent = {
  type: string;
  t: number;
  index?: number;
  state?: string;
};

async function installTtsPlaybackSpy(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const metrics = { audioPlays: 0, synthesisPlays: 0 };
    (window as any).__manyashaTtsPlayMetrics = metrics;
    const originalAudioPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function patchedAudioPlay(...args: any[]) {
      const src = String((this as HTMLMediaElement).currentSrc || (this as HTMLMediaElement).getAttribute('src') || '');
      const isPrimer = (this as HTMLMediaElement).getAttribute('data-manyasha-audio-primer') === '1' || src.startsWith('data:audio/wav;base64,');
      if ((this && this.tagName && String(this.tagName).toLowerCase() === 'audio') && !isPrimer && (window as any).__manyashaTtsPlayMetrics) {
        (window as any).__manyashaTtsPlayMetrics.audioPlays += 1;
      }
      return originalAudioPlay.apply(this, args as never);
    };
    if (window.speechSynthesis && typeof window.speechSynthesis.speak === 'function') {
      const originalSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
      window.speechSynthesis.speak = function patchedSpeak(...args: Parameters<SpeechSynthesis['speak']>) {
        if ((window as any).__manyashaTtsPlayMetrics) {
          (window as any).__manyashaTtsPlayMetrics.synthesisPlays += 1;
        }
        return originalSpeak(...args);
      };
    }
  });
}

async function installAudioTimeline(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as any;
    w.__manyashaAudioTimeline = [];
    const log = (type: string, data: Record<string, unknown> = {}) => {
      w.__manyashaAudioTimeline.push({
        t: Math.round(performance.now()),
        type,
        ...data,
      });
    };
    const originalAudioPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function patchedTimelineAudioPlay(...args: any[]) {
      const src = String((this as HTMLMediaElement).currentSrc || (this as HTMLMediaElement).getAttribute('src') || '');
      const isPrimer = (this as HTMLMediaElement).getAttribute('data-manyasha-audio-primer') === '1' || src.startsWith('data:audio/wav;base64,');
      if (this && this.tagName && String(this.tagName).toLowerCase() === 'audio' && !isPrimer) {
        const index = (w.__manyashaTimelineAudioIndex = (w.__manyashaTimelineAudioIndex || 0) + 1);
        log('audio.play.call', { index });
        this.addEventListener('playing', () => log('audio.playing', { index }), { once: true });
        this.addEventListener('ended', () => log('audio.ended', { index }), { once: true });
        this.addEventListener('error', () => log('audio.error', { index }), { once: true });
      }
      return originalAudioPlay.apply(this, args as never);
    };
    window.addEventListener('DOMContentLoaded', () => {
      const widget = document.getElementById('manyasha-widget');
      if (!widget) return;
      const pushVisual = () => {
        log('visual', { state: String(widget.getAttribute('data-visual-state') || '') });
      };
      pushVisual();
      const observer = new MutationObserver(pushVisual);
      observer.observe(widget, { attributes: true, attributeFilter: ['data-visual-state'] });
      w.__manyashaAudioTimelineObserver = observer;
    });
  });
}

async function installReplyTextTimeline(page: Page, marker: string): Promise<void> {
  await page.addInitScript((replyMarker) => {
    const w = window as any;
    const logReplyStart = () => {
      if (!Array.isArray(w.__manyashaAudioTimeline)) return;
      if (w.__manyashaReplyTextTimelineLogged) return;
      const messages = document.getElementById('manyasha-chat-messages');
      const text = String(messages?.textContent || '');
      if (!text.includes(String(replyMarker || ''))) return;
      w.__manyashaReplyTextTimelineLogged = true;
      w.__manyashaAudioTimeline.push({
        t: Math.round(performance.now()),
        type: 'reply.text.visible',
      });
    };
    window.addEventListener('DOMContentLoaded', () => {
      const messages = document.getElementById('manyasha-chat-messages');
      if (!messages) return;
      logReplyStart();
      const observer = new MutationObserver(logReplyStart);
      observer.observe(messages, { childList: true, subtree: true, characterData: true });
      w.__manyashaReplyTextTimelineObserver = observer;
    });
  }, marker);
}

async function markAudioTimeline(page: Page, type: string): Promise<void> {
  await page.evaluate((eventType) => {
    const w = window as any;
    if (!Array.isArray(w.__manyashaAudioTimeline)) return;
    w.__manyashaAudioTimeline.push({ t: Math.round(performance.now()), type: eventType });
  }, type);
}

async function getAudioTimeline(page: Page): Promise<AudioTimelineEvent[]> {
  return page.evaluate(() => {
    const w = window as any;
    return Array.isArray(w.__manyashaAudioTimeline) ? w.__manyashaAudioTimeline.slice() : [];
  });
}

function timelineEvent(
  timeline: AudioTimelineEvent[],
  type: string,
  predicate: (event: AudioTimelineEvent) => boolean = () => true,
): AudioTimelineEvent | undefined {
  return timeline.find((event) => event.type === type && predicate(event));
}

async function getTtsPlayMetrics(page: Page): Promise<TtsPlayMetrics> {
  return page.evaluate(() => {
    return (window as any).__manyashaTtsPlayMetrics || { audioPlays: 0, synthesisPlays: 0 };
  });
}

async function getStoredMuteState(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.endsWith('::manyasha_muted'));
    return key ? localStorage.getItem(key) : null;
  });
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

async function currentVisualState(page: Page): Promise<string> {
  return page.evaluate(() => {
    const widget = document.getElementById('manyasha-widget');
    return String(widget?.getAttribute('data-visual-state') || '');
  });
}

async function startVisualStateLog(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as any;
    if (w.__manyashaVoiceEdgeStateObserver) {
      try { w.__manyashaVoiceEdgeStateObserver.disconnect(); } catch (_err) {}
      w.__manyashaVoiceEdgeStateObserver = null;
    }
    w.__manyashaVoiceEdgeStateLog = [];
    const widget = document.getElementById('manyasha-widget');
    if (!widget) return;
    const push = () => {
      const value = String(widget.getAttribute('data-visual-state') || '');
      if (value) w.__manyashaVoiceEdgeStateLog.push(value);
    };
    push();
    const observer = new MutationObserver(push);
    observer.observe(widget, { attributes: true, attributeFilter: ['data-visual-state'] });
    w.__manyashaVoiceEdgeStateObserver = observer;
  });
}

async function stopVisualStateLog(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const w = window as any;
    if (w.__manyashaVoiceEdgeStateObserver) {
      try { w.__manyashaVoiceEdgeStateObserver.disconnect(); } catch (_err) {}
      w.__manyashaVoiceEdgeStateObserver = null;
    }
    const out = Array.isArray(w.__manyashaVoiceEdgeStateLog)
      ? w.__manyashaVoiceEdgeStateLog.slice()
      : [];
    w.__manyashaVoiceEdgeStateLog = [];
    return out.filter((item: unknown) => typeof item === 'string' && item.length > 0);
  });
}

function squeezeTransitions(states: string[]): string[] {
  const out: string[] = [];
  for (const state of states) {
    if (!out.length || out[out.length - 1] !== state) out.push(state);
  }
  return out;
}

function expectTransitionOrder(transitions: string[], expected: string[]): void {
  let cursor = 0;
  for (const state of expected) {
    const idx = transitions.indexOf(state, cursor);
    expect(idx).toBeGreaterThanOrEqual(0);
    cursor = idx + 1;
  }
}

test.describe('Widget voice edge-cases', () => {
  test.beforeEach(async () => {
    test.skip(useMockServer, 'Тесты voice edge-cases требуют реальный backend.');
  });

  test('VE-00: no spontaneous speech on open/close/expand', async ({ page }) => {
    await installTtsPlaybackSpy(page);

    await openWidget(page);
    await expect(page.locator('#manyasha-voice-consent')).toHaveCount(0);
    await expect(page.locator('#manyasha-sound-toggle')).toBeVisible();
    await expect(page.locator('#manyasha-sound-toggle')).toHaveAttribute('aria-label', 'Выключить голос');
    await page.waitForTimeout(700);
    await expect.soft((await getTtsPlayMetrics(page)).audioPlays).toBe(0);
    await expect.soft((await getTtsPlayMetrics(page)).synthesisPlays).toBe(0);

    await page.locator('#manyasha-hide-btn').click();
    await expect(page.locator('#manyasha-show-btn')).toBeVisible({ timeout: 4_000 });
    await page.waitForTimeout(400);
    await page.locator('#manyasha-show-btn').click();
    await expect(page.locator('#manyasha-widget')).toBeVisible({ timeout: 4_000 });
    await page.waitForTimeout(700);
    await expect.soft((await getTtsPlayMetrics(page)).audioPlays).toBe(0);
    await expect.soft((await getTtsPlayMetrics(page)).synthesisPlays).toBe(0);

    const expandBtn = page.locator('#manyasha-expand-btn');
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await page.waitForTimeout(500);
      await expect.soft((await getTtsPlayMetrics(page)).audioPlays).toBe(0);
      await expect.soft((await getTtsPlayMetrics(page)).synthesisPlays).toBe(0);
      await expandBtn.click();
      await page.waitForTimeout(500);
      await expect.soft((await getTtsPlayMetrics(page)).audioPlays).toBe(0);
      await expect.soft((await getTtsPlayMetrics(page)).synthesisPlays).toBe(0);
    }
  });

  test('VE-09: idle 30s -> browser speechSynthesis не вызывается', async ({ page }) => {
    await installTtsPlaybackSpy(page);
    await primeVoiceSettings(page, 'granted', '0');

    await openWidget(page);
    await page.waitForTimeout(30_000);

    const metrics = await getTtsPlayMetrics(page);
    expect(metrics.synthesisPlays).toBe(0);
  });

  test('VE-08: no extra TTS phrases after reply', async ({ page }) => {
    const fullReply = 'Проверю, чтобы после ответа не было дополнительных реплик.';
    const speechReply = 'Голосовая речь к ответу.';
    const waitingPhrase = 'Секунду, я сейчас над этим подумаю.';
    await installTtsPlaybackSpy(page);
    await primeVoiceSettings(page, 'granted', '0');
    const ttsTexts: { at: number; text: string }[] = [];
    let submitAt = 0;

    await page.route('**/api/manyasha/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: fullReply,
          speech_reply: speechReply,
          suggest_consultation: false,
          mood: 'neutral',
        }),
      });
    });
    await page.route('**/api/tts', async (route) => {
      const payload = route.request().postDataJSON() as { text?: string } | null;
      const text = String(payload?.text || '').trim();
      ttsTexts.push({ at: Date.now(), text });
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.alloc(256, 6),
      });
    });

    await openWidget(page);
    await page.waitForTimeout(300);
    submitAt = Date.now();
    await sendChatMessage(page, 'Проверка случайных фраз');
    await expect(page.locator('#manyasha-chat-messages')).toContainText(fullReply, { timeout: 12_000 });

    const afterSubmitRequests = ttsTexts.filter((item) => item.at >= submitAt);
    const allowedTexts = new Set([waitingPhrase, speechReply]);
    const unexpected = afterSubmitRequests
      .map((item) => item.text)
      .filter((text) => text && !allowedTexts.has(text));
    const hasListenerPhrase = unexpected.some((text) => /слуш|пока не|готова помочь|готов помочь|подум|прислуш|готов/.test(text));
    expect(unexpected.length).toBe(0);
    expect(hasListenerPhrase).toBeFalsy();
  });

  test('VE-01: mic denied -> мягкий fallback без зависания', async ({ page }) => {
    await page.addInitScript(() => {
      class FakeSpeechRecognition {
        public onstart: (() => void) | null = null;
        public onerror: ((event: { error: string }) => void) | null = null;
        public onend: (() => void) | null = null;
        public lang = 'ru-RU';
        public interimResults = true;
        public continuous = false;

        start(): void {
          if (this.onstart) this.onstart();
          setTimeout(() => {
            if (this.onerror) this.onerror({ error: 'not-allowed' });
            if (this.onend) this.onend();
          }, 30);
        }

        stop(): void {
          if (this.onend) this.onend();
        }
      }

      (window as any).SpeechRecognition = FakeSpeechRecognition;
      (window as any).webkitSpeechRecognition = FakeSpeechRecognition;
    });

    await openWidget(page);
    await page.locator('#manyasha-voice-btn').dispatchEvent('pointerdown');
    await page.waitForTimeout(120);
    await page.locator('#manyasha-voice-btn').dispatchEvent('pointerup');

    await expect(page.locator('#manyasha-widget')).not.toHaveAttribute('data-visual-state', 'listening', { timeout: 4_000 });
    await expect.poll(async () => page.locator('#manyasha-widget').getAttribute('data-visual-state'), { timeout: 6_000 }).toBe('idle');
  });

  test('VE-02: autoplay blocked -> fallback c подсказкой', async ({ page }) => {
  const fullReply = 'Поняла ваш запрос. Давайте разберём по шагам в полном формате.';
  const speechReply = 'Фраза для озвучки.';
  const ttsPayloadTexts: string[] = [];

    await primeVoiceSettings(page, 'granted', '0');
    await page.addInitScript(() => {
      const originalPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function patchedPlay(...args: any[]) {
        const thisEl = this as HTMLMediaElement;
        if (thisEl && thisEl.tagName && thisEl.tagName.toLowerCase() === 'audio') {
          return Promise.reject(new DOMException('Autoplay blocked', 'NotAllowedError'));
        }
        return originalPlay.apply(this, args as never);
      };
    });

    await page.route('**/api/manyasha/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: fullReply,
          speech_reply: speechReply,
          suggest_consultation: false,
          mood: 'neutral',
        }),
      });
    });
    await page.route('**/api/tts', async (route) => {
      const payload = route.request().postDataJSON() as { text?: string } | null;
      ttsPayloadTexts.push(String(payload?.text || '').trim());
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.alloc(256, 7),
      });
    });

  await openWidget(page);
  ttsPayloadTexts.length = 0;
  await startVisualStateLog(page);
  await sendChatMessage(page, 'Проверь блокировку автозвука');
  await expect(page.locator('#manyasha-voice-status')).toContainText('Нажмите, чтобы включить голос', { timeout: 4_000 });
  await expect.poll(() => currentVisualState(page), { timeout: 10_000 }).toBe('speaking');

  await expect.poll(async () => {
    const txt = await page.locator('#manyasha-chat-messages').innerText();
    return txt.includes(fullReply)
      || txt.includes('Добрый вечер! Я рядом и помогу спокойно разобрать вашу ситуацию по шагам')
      || txt.includes('Поняла ваш запрос. Давайте разберём по шагам в полном формате');
  }, { timeout: 12_000 }).toBeTruthy();
  await expect(page.locator('#manyasha-chat-input')).toBeEnabled({ timeout: 8_000 });
  await expect.poll(async () => page.locator('#manyasha-widget').getAttribute('data-visual-state'), { timeout: 8_000 }).toBe('idle');
  const transitions = squeezeTransitions(await stopVisualStateLog(page));
  expect(transitions).not.toContain('error');
  expectTransitionOrder(transitions, ['thinking', 'speaking', 'idle']);
  });

  test('VE-02b: muted text reply still shows answering fallback animation', async ({ page }) => {
    const fullReply = 'MUTED_VISUAL_REPLY: текстовый ответ показывает fallback-анимацию speaking до возврата в idle.';
    let ttsCalls = 0;

    await primeVoiceSettings(page, 'granted', '0');
    await page.route('**/api/manyasha/chat', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 700));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: fullReply,
          speech_reply: 'Этот голос не должен запрашиваться в mute.',
          suggest_consultation: false,
          mood: 'neutral',
        }),
      });
    });
    await page.route('**/api/tts', async (route) => {
      ttsCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.alloc(256, 2),
      });
    });

    await openWidget(page);
    const soundToggle = page.locator('#manyasha-sound-toggle');
    await soundToggle.click();
    await expect(soundToggle).toHaveAttribute('aria-label', 'Включить голос');
    expect(await getStoredMuteState(page)).toBe('1');

    await startVisualStateLog(page);
    await sendChatMessage(page, 'Проверь mute visual fallback');

    await expect.poll(() => currentVisualState(page), { timeout: 4_000 }).toBe('thinking');
    await expect.poll(() => currentVisualState(page), { timeout: 10_000 }).toBe('speaking');
    await expect(page.locator('#manyasha-chat-messages')).toContainText(fullReply, { timeout: 12_000 });
    await expect.poll(() => currentVisualState(page), { timeout: 10_000 }).toBe('idle');

    expectTransitionOrder(squeezeTransitions(await stopVisualStateLog(page)), ['thinking', 'speaking', 'idle']);
    expect(ttsCalls).toBe(0);
  });

  test('VE-10: default voice on, inline mute/unmute controls TTS', async ({ page }) => {
    const ttsPayloadTexts: string[] = [];
    const ttsPlayMetrics = { audio: 0, synthesis: 0 };
    let chatCalls = 0;
    const speechReply = 'Одинаковая озвучка после переключения.';

    await page.addInitScript(() => {
      const metrics = { audio: 0, synthesis: 0 };
      (window as any).__manyashaInlineMuteMetrics = metrics;
      const originalAudioPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function patchedAudioPlay(...args: any[]) {
        const src = String((this as HTMLMediaElement).currentSrc || (this as HTMLMediaElement).getAttribute('src') || '');
        const isPrimer = (this as HTMLMediaElement).getAttribute('data-manyasha-audio-primer') === '1' || src.startsWith('data:audio/wav;base64,');
        if ((this && this.tagName && String(this.tagName).toLowerCase() === 'audio') && !isPrimer) {
          metrics.audio += 1;
        }
        return originalAudioPlay.apply(this, args as never);
      };
      if (window.speechSynthesis && typeof window.speechSynthesis.speak === 'function') {
        const originalSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
        window.speechSynthesis.speak = function patchedSpeak(...args: Parameters<SpeechSynthesis['speak']>) {
          metrics.synthesis += 1;
          return originalSpeak(...args);
        };
      }
    });

    await page.route('**/api/manyasha/chat', async (route) => {
      chatCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: `Ответ ${chatCalls}: текстовый поток работает.`,
          speech_reply: speechReply,
          suggest_consultation: false,
          mood: 'neutral',
        }),
      });
    });
    await page.route('**/api/tts', async (route) => {
      const payload = route.request().postDataJSON() as { text?: string } | null;
      ttsPayloadTexts.push(String(payload?.text || '').trim());
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.alloc(256, 4),
      });
    });

    await openWidget(page);
    const soundToggle = page.locator('#manyasha-sound-toggle');
    await expect(page.locator('#manyasha-voice-consent')).toHaveCount(0);
    await expect(soundToggle).toBeVisible();
    await expect(soundToggle).toHaveAttribute('aria-label', 'Выключить голос');
    expect(await getStoredMuteState(page)).not.toBe('1');

    await sendChatMessage(page, 'Проверь голос по умолчанию');
    await expect(page.locator('#manyasha-chat-messages')).toContainText('Ответ 1', { timeout: 12_000 });
    await expect.poll(() => ttsPayloadTexts.some((text) => text === speechReply), { timeout: 10_000 }).toBeTruthy();

    ttsPayloadTexts.length = 0;
    await soundToggle.click();
    await expect(soundToggle).toHaveAttribute('aria-label', 'Включить голос');
    expect(await getStoredMuteState(page)).toBe('1');
    await sendChatMessage(page, 'Проверь mute');
    await expect(page.locator('#manyasha-chat-messages')).toContainText('Ответ 2', { timeout: 12_000 });
    await page.waitForTimeout(500);
    expect(ttsPayloadTexts).toHaveLength(0);

    await soundToggle.click();
    await expect(soundToggle).toHaveAttribute('aria-label', 'Выключить голос');
    expect(await getStoredMuteState(page)).toBe('0');
    await page.waitForTimeout(500);
    expect(ttsPayloadTexts).toHaveLength(0);
    await sendChatMessage(page, 'Проверь unmute');
    await expect(page.locator('#manyasha-chat-messages')).toContainText('Ответ 3', { timeout: 12_000 });
    await expect.poll(() => ttsPayloadTexts.some((text) => text === speechReply), { timeout: 10_000 }).toBeTruthy();
    Object.assign(ttsPlayMetrics, await page.evaluate(() => (window as any).__manyashaInlineMuteMetrics));
    expect(ttsPlayMetrics.audio).toBeGreaterThan(0);
    expect(ttsPlayMetrics.synthesis).toBe(0);
  });

  test('VE-11: menu mute syncs with inline sound toggle and restores future TTS', async ({ page }) => {
    const ttsPayloadTexts: string[] = [];
    let chatCalls = 0;
    const speechReply = 'Меню тоже возвращает голос.';

    await page.route('**/api/manyasha/chat', async (route) => {
      chatCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: `Меню ответ ${chatCalls}.`,
          speech_reply: speechReply,
          suggest_consultation: false,
          mood: 'neutral',
        }),
      });
    });
    await page.route('**/api/tts', async (route) => {
      const payload = route.request().postDataJSON() as { text?: string } | null;
      ttsPayloadTexts.push(String(payload?.text || '').trim());
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.alloc(256, 3),
      });
    });

    await openWidget(page);
    const soundToggle = page.locator('#manyasha-sound-toggle');
    const menuBtn = page.locator('#manyasha-menu-btn');
    const menuMute = page.locator('#manyasha-mute-btn');

    await menuBtn.click();
    await expect(menuMute).toBeVisible();
    await menuMute.click();
    await expect(soundToggle).toHaveAttribute('aria-label', 'Включить голос');
    expect(await getStoredMuteState(page)).toBe('1');

    await menuBtn.click();
    await expect(menuMute).toBeVisible();
    await menuMute.click();
    await expect(soundToggle).toHaveAttribute('aria-label', 'Выключить голос');
    expect(await getStoredMuteState(page)).toBe('0');
    await page.waitForTimeout(400);
    expect(ttsPayloadTexts).toHaveLength(0);

    await sendChatMessage(page, 'Проверь menu unmute');
    await expect(page.locator('#manyasha-chat-messages')).toContainText('Меню ответ 1', { timeout: 12_000 });
    await expect.poll(() => ttsPayloadTexts.some((text) => text === speechReply), { timeout: 10_000 }).toBeTruthy();
  });

  test('VE-03: TTS unavailable -> продолжаем текстом', async ({ page }) => {
    await primeVoiceSettings(page, 'granted', '0');

    await page.route('**/api/manyasha/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: 'Готово. Вот краткий ответ по вашей ситуации.',
          speech_reply: 'Готово, даю краткий ответ по ситуации.',
          suggest_consultation: false,
          mood: 'neutral',
        }),
      });
    });
    await page.route('**/api/tts', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'tts_unavailable' }),
      });
    });

    await openWidget(page);
    await startVisualStateLog(page);
    await sendChatMessage(page, 'Проверь fallback TTS');

    await expect(page.locator('#manyasha-chat-messages')).toContainText('Готово. Вот краткий ответ', { timeout: 12_000 });
    await expect(page.locator('#manyasha-chat-input')).toBeEnabled({ timeout: 8_000 });
    await expect.poll(async () => page.locator('#manyasha-widget').getAttribute('data-visual-state'), { timeout: 8_000 }).toBe('idle');
    expectTransitionOrder(squeezeTransitions(await stopVisualStateLog(page)), ['thinking', 'speaking', 'idle']);
  });

  test('VE-04: slow API -> degraded mode и восстановление', async ({ page }) => {
    let ttsCalls = 0;
    await primeVoiceSettings(page, 'granted', '1');

    await page.route('**/api/manyasha/chat', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2300));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: 'Ответ готов. Продолжим по шагам.',
          speech_reply: 'Ответ готов, продолжаем по шагам.',
          suggest_consultation: false,
          mood: 'neutral',
        }),
      });
    });
    await page.route('**/api/tts', async (route) => {
      ttsCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.alloc(256, 9),
      });
    });

    await openWidget(page);
    await sendChatMessage(page, 'Проверь slow api');

    await expect(page.locator('#manyasha-chat-messages .chat-msg.bot').last()).toContainText('Ответ готов', { timeout: 10_000 });
    await expect.poll(() => ttsCalls, { timeout: 6_000 }).toBe(0);
    await expect.poll(async () => page.locator('#manyasha-widget').getAttribute('data-visual-state'), { timeout: 8_000 }).toBe('idle');
  });

  test('VE-05: waiting voice стартует быстро и сохраняется serial порядок', async ({ page }) => {
    const fullReply = 'FULL_REPLY_MARKER: Полный текст ответа для проверки порядка голос-потом-текст.';
    const speechReply = 'Короткая озвучка основного ответа.';
    const waitingPhrase = 'Секунду, я сейчас над этим подумаю.';
    let submitAt = 0;
    let waitingTtsRequestedAt = 0;
    let waitingTtsResolvedAt = 0;
    let chatRequestedAt = 0;
    let chatRespondedAt = 0;
    let mainTtsRequestedAt = 0;
    let mainTypingStartedAt = 0;

    await primeVoiceSettings(page, 'granted', '0');
    await page.route('**/api/manyasha/chat', async (route) => {
      if (submitAt > 0 && chatRequestedAt === 0) {
        chatRequestedAt = Date.now();
      }
      if (submitAt > 0 && chatRespondedAt === 0) {
        chatRespondedAt = Date.now();
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: fullReply,
          speech_reply: speechReply,
          suggest_consultation: false,
          mood: 'neutral',
        }),
      });
    });
    await page.route('**/api/tts', async (route) => {
      const payload = route.request().postDataJSON() as { text?: string } | null;
      const text = String(payload?.text || '').trim();
      if (text === waitingPhrase) {
        if (submitAt > 0 && waitingTtsRequestedAt === 0) {
          waitingTtsRequestedAt = Date.now();
        }
        await new Promise((resolve) => setTimeout(resolve, 800));
        if (submitAt > 0 && waitingTtsResolvedAt === 0) {
          waitingTtsResolvedAt = Date.now();
        }
      } else if (text === speechReply) {
        if (submitAt > 0 && mainTtsRequestedAt === 0) {
          mainTtsRequestedAt = Date.now();
        }
        await new Promise((resolve) => setTimeout(resolve, 220));
      }
      await route.fulfill({
        status: 200,
        contentType: 'audio/wav',
        body: text === waitingPhrase ? makeSilentWav(450) : makeSilentWav(900),
      });
    });

    await openWidget(page);
    await page.locator('#manyasha-chat-input').evaluate((node, value) => {
      (node as HTMLTextAreaElement).value = String(value);
    }, 'Проверь быстрый старт waiting voice');
    submitAt = Date.now();
    await page.locator('#manyasha-chat-send').click();

    await expect(page.locator('#manyasha-chat-messages .chat-msg.bot.waiting').last()).toContainText(waitingPhrase, { timeout: 1_000 });
    await expect.poll(() => chatRequestedAt, { timeout: 8_000 }).toBeGreaterThan(0);
    expect(chatRequestedAt - submitAt).toBeLessThanOrEqual(450);
    if (waitingTtsRequestedAt > 0) {
      expect(waitingTtsRequestedAt - submitAt).toBeLessThanOrEqual(500);
    }

    await page.waitForTimeout(700);
    expect(await currentVisualState(page)).not.toBe('speaking');
    await expect.poll(() => waitingTtsRequestedAt, { timeout: 2_000 }).toBeGreaterThan(0);
    await expect.poll(() => waitingTtsResolvedAt, { timeout: 3_000 }).toBeGreaterThan(0);

    await expect.poll(() => mainTtsRequestedAt, { timeout: 10_000 }).toBeGreaterThan(0);
    expect(mainTtsRequestedAt - chatRespondedAt).toBeLessThanOrEqual(2_000);

    const guardStartedAt = Date.now();
    while (Date.now() - guardStartedAt < 5_000 && mainTypingStartedAt === 0) {
      const textNow = await page.locator('#manyasha-chat-messages').innerText();
      if (textNow.includes('FULL_REPLY_MARKER')) {
        mainTypingStartedAt = Date.now();
        break;
      }
      await page.waitForTimeout(100);
    }
    expect(mainTypingStartedAt).toBeGreaterThan(0);
    expect(mainTypingStartedAt).toBeGreaterThan(mainTtsRequestedAt);
    if (waitingTtsResolvedAt > 0) {
      expect(mainTypingStartedAt).toBeGreaterThan(waitingTtsResolvedAt);
    }
    await expect(page.locator('#manyasha-chat-messages')).toContainText(fullReply, { timeout: 12_000 });
  });

  test('VE-05b: main TTS не стартует поверх уже звучащей waiting phrase', async ({ page }) => {
    const fullReply = 'NO_OVERLAP_REPLY_MARKER: основной ответ ждёт завершения waiting voice.';
    const speechReply = 'Основной голосовой ответ после waiting-фразы.';
    const waitingPhrase = 'Секунду, я сейчас над этим подумаю.';

    await installAudioTimeline(page);
    await installReplyTextTimeline(page, 'NO_OVERLAP_REPLY_MARKER');
    await primeVoiceSettings(page, 'granted', '0');
    await page.route('**/api/manyasha/chat', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 250));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: fullReply,
          speech_reply: speechReply,
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
        body: text === waitingPhrase ? makeSilentWav(2600) : makeSilentWav(800),
      });
    });

    await openWidget(page);
    await page.locator('#manyasha-chat-input').fill('Проверь, что голос не накладывается');
    await markAudioTimeline(page, 'submit.before.click');
    await page.locator('#manyasha-chat-send').click();

    await expect(page.locator('#manyasha-chat-messages')).toContainText(fullReply, { timeout: 12_000 });
    await expect.poll(async () => {
      const timeline = await getAudioTimeline(page);
      return timeline.filter((event) => event.type === 'audio.ended').length;
    }, { timeout: 12_000 }).toBeGreaterThanOrEqual(2);

    const timeline = await getAudioTimeline(page);
    const submit = timelineEvent(timeline, 'submit.before.click');
    const thinking = timelineEvent(timeline, 'visual', (event) => event.state === 'thinking');
    const waitingPlaying = timelineEvent(timeline, 'audio.playing', (event) => event.index === 1);
    const waitingEnded = timelineEvent(timeline, 'audio.ended', (event) => event.index === 1);
    const mainPlaying = timelineEvent(timeline, 'audio.playing', (event) => event.index === 2);
    const replyTextVisible = timelineEvent(timeline, 'reply.text.visible');
    const speaking = timeline.find((event) => event.type === 'visual' && event.state === 'speaking' && mainPlaying && event.t >= mainPlaying.t);

    expect(submit).toBeTruthy();
    expect(thinking).toBeTruthy();
    expect(waitingPlaying).toBeTruthy();
    expect(waitingEnded).toBeTruthy();
    expect(mainPlaying).toBeTruthy();
    expect(replyTextVisible).toBeTruthy();
    expect(speaking).toBeTruthy();
    expect((thinking?.t || 0) - (submit?.t || 0)).toBeLessThanOrEqual(300);
    expect(mainPlaying!.t).toBeGreaterThanOrEqual(waitingEnded!.t);
    expect(replyTextVisible!.t).toBeGreaterThanOrEqual(waitingEnded!.t);
    expect(speaking!.t - mainPlaying!.t).toBeLessThanOrEqual(300);
  });

  test('VE-06: если waiting TTS тормозит, основной ответ не блокируется на 2-3 секунды', async ({ page }) => {
    const fullReply = 'SLOW_WAITING_REPLY_MARKER: основной ответ не должен ждать долгий waiting TTS.';
    const speechReply = 'Основной голосовой ответ без лишней паузы.';
    const waitingPhrase = 'Секунду, я сейчас над этим подумаю.';
    let submitAt = 0;
    let waitingTtsRequestedAt = 0;
    let chatRequestedAt = 0;
    let chatRespondedAt = 0;
    let mainTtsRequestedAt = 0;

    await installTtsPlaybackSpy(page);
    await installAudioTimeline(page);
    await primeVoiceSettings(page, 'granted', '0');
    await page.route('**/api/manyasha/chat', async (route) => {
      if (submitAt > 0 && chatRequestedAt === 0) {
        chatRequestedAt = Date.now();
      }
      if (submitAt > 0 && chatRespondedAt === 0) {
        chatRespondedAt = Date.now();
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: fullReply,
          speech_reply: speechReply,
          suggest_consultation: false,
          mood: 'neutral',
        }),
      });
    });
    await page.route('**/api/tts', async (route) => {
      const payload = route.request().postDataJSON() as { text?: string } | null;
      const text = String(payload?.text || '').trim();
      if (text === waitingPhrase) {
        if (submitAt > 0 && waitingTtsRequestedAt === 0) {
          waitingTtsRequestedAt = Date.now();
        }
        await new Promise((resolve) => setTimeout(resolve, 2200));
      } else if (text === speechReply) {
        if (submitAt > 0 && mainTtsRequestedAt === 0) {
          mainTtsRequestedAt = Date.now();
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'audio/wav',
        body: text === waitingPhrase ? makeSilentWav(450) : makeSilentWav(900),
      });
    });

    await openWidget(page);
    await page.locator('#manyasha-chat-input').evaluate((node, value) => {
      (node as HTMLTextAreaElement).value = String(value);
    }, 'Проверь анти-блокировку при медленном waiting TTS');
    submitAt = Date.now();
    await markAudioTimeline(page, 'submit.before.click');
    await page.locator('#manyasha-chat-send').click();

    await expect(page.locator('#manyasha-chat-messages .chat-msg.bot.waiting').last()).toContainText(waitingPhrase, { timeout: 1_000 });
    await expect.poll(() => chatRequestedAt, { timeout: 8_000 }).toBeGreaterThan(0);
    await expect.poll(() => mainTtsRequestedAt, { timeout: 10_000 }).toBeGreaterThan(0);
    if (waitingTtsRequestedAt > 0) {
      expect(waitingTtsRequestedAt - submitAt).toBeLessThanOrEqual(500);
    }
    expect(mainTtsRequestedAt - chatRespondedAt).toBeLessThanOrEqual(120);
    await expect(page.locator('#manyasha-chat-messages')).toContainText(fullReply, { timeout: 12_000 });
    await page.waitForTimeout(400);
    const playMetrics = await getTtsPlayMetrics(page);
    expect(playMetrics.audioPlays).toBeLessThanOrEqual(1);
    expect(playMetrics.synthesisPlays).toBe(0);

    const timeline = await getAudioTimeline(page);
    const submit = timelineEvent(timeline, 'submit.before.click');
    const thinking = timelineEvent(timeline, 'visual', (event) => event.state === 'thinking');
    const firstAudio = timelineEvent(timeline, 'audio.playing', (event) => event.index === 1);
    const speaking = timeline.find((event) => event.type === 'visual' && event.state === 'speaking' && firstAudio && event.t >= firstAudio.t);
    expect(thinking).toBeTruthy();
    expect(firstAudio).toBeTruthy();
    expect(speaking).toBeTruthy();
    expect((thinking?.t || 0) - (submit?.t || 0)).toBeLessThanOrEqual(300);
    expect(speaking!.t - firstAudio!.t).toBeLessThanOrEqual(300);
  });

  test('VE-07: speech_reply нормализуется для TTS и не режется на мелкие чанки', async ({ page }) => {
    const waitingPhrase = 'Секунду, я сейчас над этим подумаю.';
    const fullReply = 'Полный ответ в чате может быть длиннее и подробнее.';
    const speechReply =
      'По ФЗ №127 и данным ФССП в МФЦ можно подать заявление, если ИП у приставов длится 90+ дней и просрочка 1-2 месяца.';
    const ttsPayloadTexts: string[] = [];

    await primeVoiceSettings(page, 'granted', '0');
    await page.route('**/api/manyasha/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: fullReply,
          speech_reply: speechReply,
          suggest_consultation: false,
          mood: 'neutral',
        }),
      });
    });
    await page.route('**/api/tts', async (route) => {
      const payload = route.request().postDataJSON() as { text?: string } | null;
      ttsPayloadTexts.push(String(payload?.text || '').trim());
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.alloc(256, 8),
      });
    });

    await openWidget(page);
    ttsPayloadTexts.length = 0;
    await sendChatMessage(page, 'Проверь нормализацию озвучки');
    await expect(page.locator('#manyasha-chat-messages')).toContainText(fullReply, { timeout: 12_000 });

    await expect.poll(() => ttsPayloadTexts.length, { timeout: 10_000 }).toBeGreaterThanOrEqual(1);
    const mainSpeechChunks = ttsPayloadTexts.filter((txt) => !!txt && txt !== waitingPhrase);
    expect(mainSpeechChunks.length).toBeGreaterThan(0);
    expect(mainSpeechChunks.length).toBeLessThanOrEqual(2);

    const joined = mainSpeechChunks.join(' ').toLowerCase();
    expect(joined).toContain('федераль');
    expect(joined).toContain('служба судебных приставов');
    expect(joined).toContain('многофункциональный центр');
    expect(joined).toContain('исполнительное производство');
    expect(joined).toContain('больше девяноста дней');
    expect(joined).toContain('один-два');
    expect(joined).not.toMatch(/\bфз\b|\bфссп\b|\bмфц\b|\bип\b|90\+|1-2/);
    expect(joined).not.toMatch(/[\[\]`*_]/);
  });
});
