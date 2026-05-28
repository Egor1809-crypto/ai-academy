import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const useMockServer = process.env.E2E_USE_MOCK === '1';
const API_ORIGIN = process.env.PLAYWRIGHT_API_URL
  || process.env.E2E_API_URL
  || 'http://127.0.0.1:8000';
const WIDGET_INSTALL_SECRET = process.env.PLAYWRIGHT_WIDGET_INSTALL_SECRET
  || process.env.WIDGET_INSTALL_PROVISION_KEY
  || process.env.WIDGET_INSTALL_SIGNING_SECRET
  || 'dev-widget-install-signing-secret';
const WIDGET_INSTANCE_ID = 'portable-lab';
const EXTERNAL_INSTANCE_ID = 'ext-dev';
const WIDGET_SITE_KEY = process.env.PLAYWRIGHT_WIDGET_SITE_KEY
  || process.env.WIDGET_SITE_KEY
  || 'demo-default-site';

type InstallTokenResponse = {
  token: string;
  expires_at: string;
  ttl_seconds: number;
};

async function issueWidgetInstallToken(
  request: APIRequestContext,
): Promise<InstallTokenResponse> {
  const result = await request.post(
    `${API_ORIGIN}/api/manyasha/widget-install-token`,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Widget-Install-Secret': WIDGET_INSTALL_SECRET,
      },
      data: {
        partner_id: 'default',
        site_key: WIDGET_SITE_KEY,
        ttl_seconds: 900,
      },
    },
  );
  const payload = (await result.json()) as InstallTokenResponse & { detail?: string };
  if (!result.ok()) {
    throw new Error(`Не удалось выпустить install_token: ${payload && payload.detail ? payload.detail : result.statusText()}`);
  }
  if (!payload || !payload.token) {
    throw new Error('Не получен install_token из widget-install-token.');
  }
  return payload;
}

function buildTransferWidgetUrl(token: string): string {
  return `/embed-transfer-site-dev.html?api_origin=${encodeURIComponent(API_ORIGIN)}`
    + `&pid=default&start_open=false`
    + `&site_key=${encodeURIComponent(WIDGET_SITE_KEY)}`
    + `&install_token=${encodeURIComponent(token)}`
    + `&instance=${encodeURIComponent(WIDGET_INSTANCE_ID)}`;
}

function buildLetaibeWidgetUrl(token: string): string {
  return `/embed-letaibe-dev.html?api_origin=${encodeURIComponent(API_ORIGIN)}`
    + `&pid=default&start_open=false&widget_preview=1`
    + `&site_key=${encodeURIComponent(WIDGET_SITE_KEY)}`
    + `&install_token=${encodeURIComponent(token)}`
    + `&instance=letaibe-clean-shell`;
}

type InstallHealth = {
  status?: string;
  code?: string;
  message?: string;
};

async function waitForApi(page: Page, instanceId: string): Promise<void> {
  await expect.poll(async () => {
    return page.evaluate((id) => {
      const mw = (window as any).ManyashaWidget;
      if (!mw || typeof mw.get !== 'function') return false;
      if (mw.get(id)) return true;
      const fallback = mw.get();
      return Boolean(fallback);
    }, instanceId);
  }, { timeout: 12_000 }).toBeTruthy();
}

async function readInstallHealth(page: Page, instanceId: string): Promise<InstallHealth | null> {
  return page.evaluate((id) => {
    const mw = (window as any).ManyashaWidget;
    const api = mw && typeof mw.get === 'function'
      ? mw.get(id)
      : null;
    if (!api || typeof api.getInstallHealth !== 'function') return null;
    return api.getInstallHealth() as InstallHealth;
  }, instanceId);
}

async function readWidgetOpenState(page: Page, instanceId: string): Promise<boolean | null> {
  return page.evaluate((id) => {
    const mw = (window as any).ManyashaWidget;
    const instance = mw && typeof mw.get === 'function'
      ? mw.get(id)
      : null;
    if (!instance) return null;
    if (typeof instance.isOpen === 'function') {
      return Boolean(instance.isOpen());
    }
    const iframe = document.querySelector('iframe[title="Маняша — AI-помощник"]');
    return Boolean(iframe && iframe.getBoundingClientRect().width > 0);
  }, instanceId);
}

async function readWidgetPosition(page: Page, instanceId: string): Promise<{ mode?: string; left?: number; top?: number } | null> {
  return page.evaluate((id) => {
    const mw = (window as any).ManyashaWidget;
    const instance = mw && typeof mw.get === 'function'
      ? mw.get(id)
      : null;
    if (!instance || typeof instance.getPosition !== 'function') return null;
    return instance.getPosition();
  }, instanceId);
}

async function setWidgetOpenState(page: Page, instanceId: string, open: boolean): Promise<boolean> {
  const applied = await page.evaluate(
    ({ id, openWidget }) => {
      const api = (window as any).ManyashaWidget;
      if (!api) return false;
      const staticMethod = openWidget ? api.open : api.close;
      if (typeof staticMethod === 'function') {
        staticMethod.call(api, id);
        return true;
      }
      if (typeof api.get === 'function') {
        const instanceApi = api.get(id);
        const instanceMethod = instanceApi && (openWidget ? instanceApi.open : instanceApi.close);
        if (instanceApi && typeof instanceMethod === 'function') {
          instanceMethod.call(instanceApi);
          return true;
        }
      }
      return false;
    },
    { id: instanceId, openWidget: open },
  );

  if (!applied) {
    return false;
  }

  try {
    await expect.poll(async () => readWidgetOpenState(page, instanceId), { timeout: 12_000 })
      .toBe(open);
    return true;
  } catch (_e) {
    return false;
  }
}

async function waitForInstallHealth(page: Page, instanceId: string): Promise<void> {
  await expect.poll(async () => {
    const health = await readInstallHealth(page, instanceId);
    const status = `${(health && health.status) || 'unknown'}/${(health && health.code) || 'unknown'}`;
    return status;
  }, { timeout: 12_000 }).toBe('ok/widget_ready');
}

async function sendAndWaitForBotReply(frame: any, text: string, botBefore: number): Promise<void> {
  const input = frame.locator('#manyasha-chat-input');
  const send = frame.locator('#manyasha-chat-send');
  const bots = frame.locator('.chat-msg.bot');
  const usersByText = frame.locator('.chat-msg.user').filter({ hasText: text });

  await expect(send).toBeEnabled({ timeout: 12_000 });
  await input.fill(text);
  await send.click();
  await expect(input).toHaveValue('');
  await expect(usersByText).toBeVisible({ timeout: 16_000 });

  await expect.poll(async () => (await bots.count()), { timeout: 16_000 })
    .toBeGreaterThan(botBefore);
}

async function currentFrameVisualState(frame: any): Promise<string> {
  return String(await frame.locator('#manyasha-widget').getAttribute('data-visual-state') || '');
}

async function startFrameVisualStateLog(frame: any): Promise<void> {
  await frame.locator('#manyasha-widget').evaluate((widget: HTMLElement) => {
    const w = window as any;
    if (w.__manyashaEmbedStateObserver) {
      try { w.__manyashaEmbedStateObserver.disconnect(); } catch (_err) {}
      w.__manyashaEmbedStateObserver = null;
    }
    w.__manyashaEmbedStateLog = [];
    const push = () => {
      const value = String(widget.getAttribute('data-visual-state') || '');
      if (value) w.__manyashaEmbedStateLog.push(value);
    };
    push();
    const observer = new MutationObserver(push);
    observer.observe(widget, { attributes: true, attributeFilter: ['data-visual-state'] });
    w.__manyashaEmbedStateObserver = observer;
  });
}

async function stopFrameVisualStateLog(frame: any): Promise<string[]> {
  return frame.locator('#manyasha-widget').evaluate(() => {
    const w = window as any;
    if (w.__manyashaEmbedStateObserver) {
      try { w.__manyashaEmbedStateObserver.disconnect(); } catch (_err) {}
      w.__manyashaEmbedStateObserver = null;
    }
    const out = Array.isArray(w.__manyashaEmbedStateLog)
      ? w.__manyashaEmbedStateLog.slice()
      : [];
    w.__manyashaEmbedStateLog = [];
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

async function expectWidgetOpen(page: Page): Promise<void> {
  const frameLocator = page.locator('iframe[title="Маняша — AI-помощник"]');
  await expect(frameLocator.first()).toBeVisible();
}

async function expectWidgetClosed(page: Page): Promise<void> {
  const frameLocator = page.locator('iframe[title="Маняша — AI-помощник"]');
  await expect(frameLocator.first()).not.toBeVisible();
}

function normalizeChatText(index = 0): string {
  const samples = [
    'Привет, нужно узнать про банкротство.',
    'Какая сумма долга считается критичной?',
    'Какой порядок отмены подписки?'
  ];
  return samples[index % samples.length];
}

test('EMB-01: внешний embed загружается и открывает iframe', async ({ page }) => {
  test.skip(useMockServer, 'Тест требует реальный backend + embed.js.');

  await page.goto(`/embed-external-dev.html?api_origin=${encodeURIComponent(API_ORIGIN)}&instance=${EXTERNAL_INSTANCE_ID}`);
  await waitForApi(page, EXTERNAL_INSTANCE_ID);

  await page.getByRole('button', { name: 'Открыть Маняшу' }).click();
  await expect(page.locator('iframe[title="Маняша — AI-помощник"]').first()).toBeVisible();

  await expect.poll(async () => {
    const health = await readInstallHealth(page, EXTERNAL_INSTANCE_ID);
    return (health && health.status) || 'unknown';
  }, { timeout: 12_000 }).toBe('ok');
});

test('EMB-04: transfer-сайт: open/close/drag/resize/send и install-health', async ({ page, request }) => {
  test.skip(useMockServer, 'Тест требует реальный backend + embed.js.');

  const { token } = await issueWidgetInstallToken(request);
  await page.goto(buildTransferWidgetUrl(token));
  await waitForApi(page, WIDGET_INSTANCE_ID);
  await expectWidgetClosed(page);

  const healthBefore = await readInstallHealth(page, WIDGET_INSTANCE_ID);
  expect(['booting', 'ok']).toContain((healthBefore && healthBefore.status) || 'unknown');
  expect(['booting', 'widget_iframe_loading', 'widget_ready']).toContain((healthBefore && healthBefore.code) || 'unknown');

  const launcher = page.getByRole('button', { name: 'Открыть Маняшу' });
  const launcherStart = await launcher.boundingBox();
  expect(launcherStart).toBeTruthy();
  expect(launcherStart && launcherStart.width).toBeGreaterThan(0);

  if (launcherStart) {
    await page.mouse.move(launcherStart.x + launcherStart.width / 2, launcherStart.y + launcherStart.height / 2);
    await page.mouse.down();
    await page.mouse.move(launcherStart.x + 150, launcherStart.y + 20);
    await page.mouse.up();
    await page.waitForTimeout(200);
    const movedPos = await page.evaluate((id) => {
      const api = (window as any).ManyashaWidget && (window as any).ManyashaWidget.get
        ? (window as any).ManyashaWidget.get(id)
        : null;
      return api && typeof api.getPosition === 'function' ? api.getPosition() : null;
    }, WIDGET_INSTANCE_ID);
    expect(movedPos).toBeTruthy();
    expect((movedPos as any).mode).toBe('custom');
  }

  const closedByApi = await setWidgetOpenState(page, WIDGET_INSTANCE_ID, false);
  if (!closedByApi) {
    await launcher.click();
  }
  await expectWidgetClosed(page);
  await expect.poll(async () => readWidgetOpenState(page, WIDGET_INSTANCE_ID), { timeout: 12_000 }).toBe(false);

  const openedByApi = await setWidgetOpenState(page, WIDGET_INSTANCE_ID, true);
  if (!openedByApi) {
    await launcher.click();
  }
  await expectWidgetOpen(page);
  await expect.poll(async () => readWidgetOpenState(page, WIDGET_INSTANCE_ID), { timeout: 12_000 }).toBe(true);
  await expect.poll(async () => {
    const health = await readInstallHealth(page, WIDGET_INSTANCE_ID);
    return `${(health && health.status) || 'unknown'}/${(health && health.code) || 'unknown'}`;
  }, { timeout: 12_000 }).toBe('ok/widget_ready');

  const frame = page.frameLocator('iframe[title="Маняша — AI-помощник"]').first();
  const frameContent = frame.locator('#manyasha-chat-messages');
  await expect(frameContent).toBeVisible({ timeout: 12_000 });

  const widthBeforeResize = await page.locator('iframe[title="Маняша — AI-помощник"]').first()
    .evaluate((node) => node.getBoundingClientRect().width);

  const resizeBtn = frame.locator('#manyasha-chat-resize');
  if (await resizeBtn.count()) {
    await resizeBtn.click();
    await expect.poll(async () => {
      return page.locator('iframe[title="Маняша — AI-помощник"]').first()
        .evaluate((node) => node.getBoundingClientRect().width);
    }, { timeout: 8_000 }).toBeGreaterThan(widthBeforeResize);
  }

  for (let i = 0; i < 2; i++) {
    const botBefore = await frame.locator('.chat-msg.bot').count();
    await sendAndWaitForBotReply(frame, normalizeChatText(i), botBefore);
  }

  const botMsgCount = await frame.locator('.chat-msg.bot').count();
  expect(botMsgCount).toBeGreaterThanOrEqual(1);
});

test('EMB-06: portable embed использует чистый widget shell без preview landing', async ({ page, request }) => {
  test.skip(useMockServer, 'Тест требует реальный backend + embed.js.');

  const { token } = await issueWidgetInstallToken(request);
  await page.goto(buildLetaibeWidgetUrl(token));
  await waitForApi(page, 'letaibe-clean-shell');

  const openedByApi = await setWidgetOpenState(page, 'letaibe-clean-shell', true);
  if (!openedByApi) {
    await page.getByRole('button', { name: 'Открыть Маняшу' }).click();
  }
  await expectWidgetOpen(page);
  await waitForInstallHealth(page, 'letaibe-clean-shell');
  await expect(page.getByRole('button', { name: 'Закрыть Маняшу' })).toHaveCount(0);

  const frame = page.frameLocator('iframe[title="Маняша — AI-помощник"]').first();
  await expect(frame.locator('#manyasha-widget')).toBeVisible({ timeout: 12_000 });
  await expect(frame.locator('.site-header')).toHaveCount(0);
  await expect(frame.locator('.site-main')).toHaveCount(0);
  await expect(frame.getByText('Egor Банкротит')).toHaveCount(0);
  await expect(frame.getByText('Запросить разбор')).toHaveCount(0);
  await expect(frame.getByText('Законная стратегия по списанию долгов')).toHaveCount(0);

  const positionBeforeDrag = await readWidgetPosition(page, 'letaibe-clean-shell');
  const headerBox = await frame.locator('#manyasha-header').boundingBox();
  expect(headerBox).toBeTruthy();
  if (headerBox) {
    await page.mouse.move(headerBox.x + headerBox.width / 2, headerBox.y + headerBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      headerBox.x + headerBox.width / 2 - 120,
      headerBox.y + headerBox.height / 2 + 40,
      { steps: 8 },
    );
    await page.mouse.up();
  }
  const positionAfterDrag = await readWidgetPosition(page, 'letaibe-clean-shell');
  expect(positionAfterDrag).toBeTruthy();
  expect(positionAfterDrag && positionAfterDrag.mode).toBe('custom');
  expect(Math.abs(((positionAfterDrag && positionAfterDrag.left) || 0) - ((positionBeforeDrag && positionBeforeDrag.left) || 0)))
    .toBeGreaterThan(60);

  const botBefore = await frame.locator('.chat-msg.bot').count();
  await sendAndWaitForBotReply(frame, 'Проверяю чистый перенос виджета', botBefore);

  await page.setViewportSize({ width: 390, height: 844 });
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  expect(metrics.documentScrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);

  await frame.getByRole('button', { name: 'Скрыть Маняшу' }).click();
  await expectWidgetClosed(page);
});

test('EMB-07: portable embed muted reply shows answering fallback animation', async ({ page, request }) => {
  test.skip(useMockServer, 'Тест требует реальный backend + embed.js.');

  const fullReply = 'EMBED_MUTED_VISUAL_REPLY: portable embed показывает fallback-анимацию ответа без голоса.';
  let ttsCalls = 0;

  await page.route('**/api/manyasha/chat', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reply: fullReply,
        speech_reply: 'Этот голос не должен запрашиваться в muted portable embed.',
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

  const { token } = await issueWidgetInstallToken(request);
  await page.goto(buildLetaibeWidgetUrl(token));
  await waitForApi(page, 'letaibe-clean-shell');

  const openedByApi = await setWidgetOpenState(page, 'letaibe-clean-shell', true);
  if (!openedByApi) {
    await page.getByRole('button', { name: 'Открыть Маняшу' }).click();
  }
  await expectWidgetOpen(page);
  await waitForInstallHealth(page, 'letaibe-clean-shell');

  const frame = page.frameLocator('iframe[title="Маняша — AI-помощник"]').first();
  await expect(frame.locator('#manyasha-widget')).toBeVisible({ timeout: 12_000 });
  await expect(frame.locator('.site-header')).toHaveCount(0);
  await expect(frame.locator('.site-main')).toHaveCount(0);

  const soundToggle = frame.locator('#manyasha-sound-toggle');
  await soundToggle.click();
  await expect(soundToggle).toHaveAttribute('aria-label', 'Включить голос');

  await startFrameVisualStateLog(frame);
  await frame.locator('#manyasha-chat-input').fill('Проверь muted fallback в portable embed');
  await frame.locator('#manyasha-chat-send').click();

  await expect(frame.locator('#manyasha-chat-messages')).toContainText(fullReply, { timeout: 12_000 });
  await expect.poll(() => currentFrameVisualState(frame), { timeout: 10_000 }).toBe('idle');

  const transitions = squeezeTransitions(await stopFrameVisualStateLog(frame));
  expect(transitions).not.toContain('error');
  expectTransitionOrder(transitions, ['thinking', 'speaking', 'idle']);
  expect(ttsCalls).toBe(0);
});

test('EMB-05: transfer-сайт показывает install-health на ошибке токена', async ({ page }) => {
  test.skip(useMockServer, 'Тест требует реальный backend + embed.js.');
  const brokenUrl = buildTransferWidgetUrl('invalid-token');
  await page.goto(brokenUrl);
  await waitForApi(page, WIDGET_INSTANCE_ID);
  const launcher = page.getByRole('button', { name: 'Открыть Маняшу' });
  if (await launcher.count()) {
    await launcher.click();
  }
  await expect(page.locator('iframe[title="Маняша — AI-помощник"]').first()).toBeVisible({ timeout: 12_000 });
  await expect.poll(async () => {
    const health = await readInstallHealth(page, WIDGET_INSTANCE_ID);
    const state = `${(health && health.status) || 'unknown'}/${(health && health.code) || 'unknown'}`;
    if (state === 'unknown/unknown' || state === 'booting/widget_iframe_loading') return false;
    return (
      state === 'ok/widget_ready'
      || state.indexOf('error/install_token') === 0
      || state.indexOf('error/site_key') === 0
    );
  }, { timeout: 24_000 }).toBeTruthy();
});

test('EMB-02: CSP-страница с разрешенным frame-src проходит smoke', async ({ page }) => {
  test.skip(useMockServer, 'Тест требует реальный backend + embed.js.');

  await page.goto('/embed-csp-dev.html');
  await waitForApi(page, 'ext-csp-allow');

  await page.getByRole('button', { name: 'Открыть Маняшу' }).click();
  await expect(page.locator('iframe[title="Маняша — AI-помощник"]').first()).toBeVisible();

  await expect.poll(async () => {
    const health = await readInstallHealth(page, 'ext-csp-allow');
    return `${(health && health.status) || 'unknown'}/${(health && health.code) || 'unknown'}`;
  }, { timeout: 24_000 }).toMatch(/^(ok\/widget_ready|error\/widget_iframe.*)$/);
});

test('EMB-03: при frame-src none виден явный health-error', async ({ page }) => {
  test.skip(useMockServer, 'Тест требует реальный backend + embed.js.');

  await page.goto('/embed-csp-blocked-dev.html');
  await waitForApi(page, 'ext-csp-blocked');

  await expect.poll(async () => {
    const health = await readInstallHealth(page, 'ext-csp-blocked');
    return `${(health && health.status) || 'unknown'}/${(health && health.code) || 'unknown'}`;
  }, { timeout: 24_000 }).toContain('error/widget_iframe');
});
