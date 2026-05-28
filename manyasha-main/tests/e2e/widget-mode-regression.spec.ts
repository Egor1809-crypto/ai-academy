import { expect, test, type Page } from '@playwright/test';

const useMockServer = process.env.E2E_USE_MOCK === '1';
const API_ORIGIN = process.env.PLAYWRIGHT_API_URL
  || process.env.E2E_API_URL
  || 'http://127.0.0.1:8000';
const PREVIEW_URL = `/mascot-design-preview.html?api_origin=${encodeURIComponent(API_ORIGIN)}&embed_contract_version=1`;

async function openPreview(page: Page, mode: 'normal' | 'demo'): Promise<void> {
  const instance = `mode-regression-${mode}-${Date.now()}`;
  const url = `${PREVIEW_URL}&instance=${encodeURIComponent(instance)}${mode === 'demo' ? '&demo_mode=1' : ''}`;
  await page.goto(url);
  await expect(page.locator('#manyasha-widget')).toBeVisible();
  await expect.poll(async () => {
    return page.locator('#manyasha-widget').getAttribute('data-visual-state');
  }, { timeout: 12_000 }).toBe('idle');
}

async function sendMessage(page: Page, text: string): Promise<void> {
  await page.locator('#manyasha-chat-input').fill(text);
  await page.locator('#manyasha-chat-send').click();
}

test.describe('Widget normal/demo mode regression', () => {
  test.beforeEach(async () => {
    test.skip(useMockServer, 'Mode regression requires the real preview widget runtime.');
  });

  test('MR-01: normal starter and contextual quick replies use chat API', async ({ page }) => {
    const normalReply = 'Нормальный режим получил ответ через chat API про долги, имущество и суд.';
    let chatRequests = 0;
    let legacyEmailCaptureRequests = 0;
    const chatMessages = page.locator('#manyasha-chat-messages');

    await page.route('**/api/manyasha/chat', async (route) => {
      chatRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: normalReply,
          speech_reply: 'Короткий ответ нормального режима.',
          suggest_consultation: false,
          mood: 'neutral',
        }),
      });
    });
    await page.route('**/api/email-capture', async (route) => {
      legacyEmailCaptureRequests += 1;
      await route.fulfill({
        status: 410,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'legacy email capture must stay disabled' }),
      });
    });

    await openPreview(page, 'normal');
    await expect(page.getByRole('button', { name: 'У меня 2 млн долгов, что делать?' })).toHaveCount(0);
    const normalStarter = page.getByRole('button', { name: 'У меня долги' });
    await expect(normalStarter).toBeVisible({ timeout: 6_000 });

    await normalStarter.click();
    await expect(chatMessages).toContainText('У меня долги', { timeout: 4_000 });
    await expect(chatMessages).toContainText(normalReply, { timeout: 12_000 });
    await expect(chatMessages).not.toContainText('При долге около 2 млн рублей');
    expect(chatRequests).toBe(1);

    const contextualReply = page.getByRole('button', { name: 'Какие долги учитываются?' });
    await expect(contextualReply).toBeVisible({ timeout: 6_000 });
    await expect(page.getByRole('button', { name: 'Что с имуществом?' })).toBeVisible();
    await expect(page.locator('#manyasha-quick-replies .quick-reply-btn')).toHaveCount(3);

    await contextualReply.click();
    await expect(chatMessages).toContainText('Какие долги учитываются при банкротстве?', { timeout: 4_000 });
    await expect.poll(() => chatRequests, { timeout: 6_000 }).toBe(2);
    await expect(page.locator('#manyasha-email-panel')).toHaveCount(0);
    await expect(page.getByText('Получить полный разбор на почту?')).toHaveCount(0);
    expect(legacyEmailCaptureRequests).toBe(0);
  });

  test('MR-02: demo mode shows prepared questions and bypasses chat API', async ({ page }) => {
    let chatRequests = 0;
    await page.route('**/api/manyasha/chat', async (route) => {
      chatRequests += 1;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'demo mode must not call chat API' }),
      });
    });

    await openPreview(page, 'demo');
    const demoQuestion = page.getByRole('button', { name: 'У меня 2 млн долгов, что делать?' });
    await expect(demoQuestion).toBeVisible({ timeout: 6_000 });

    await demoQuestion.click();
    await expect(page.locator('#manyasha-chat-messages')).toContainText('При долге около 2 млн рублей', { timeout: 8_000 });
    expect(chatRequests).toBe(0);
  });

  test('MR-03: 320px viewport has no page-level horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });

    for (const mode of ['normal', 'demo'] as const) {
      await openPreview(page, mode);
      const metrics = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
      }));

      expect(metrics.documentScrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
      expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
    }
  });

  test('MR-03b: preview site tabs use separate tab panels and feeds', async ({ page }) => {
    await openPreview(page, 'normal');
    await page.locator('#manyasha-hide-btn').click();

    const tabs = page.locator('[role="tab"][data-tab]');
    const panels = page.locator('[role="tabpanel"]');
    const widgets = page.locator('[role="tabpanel"] > .tab-widget');
    const feeds = page.locator('.tab-feed');

    await expect(tabs).toHaveCount(5);
    expect(await page.locator('[role="tab"][href]').count()).toBe(0);
    await expect(page.locator('.site-tab-shell .site-tabs__nav')).toHaveCount(0);
    expect(await panels.count()).toBeGreaterThanOrEqual(5);
    expect(await widgets.count()).toBeGreaterThanOrEqual(5);
    expect(await feeds.count()).toBeGreaterThanOrEqual(5);
    await expect(page.locator('#panel-risks > .tab-widget--risks > .tab-feed--risks')).toHaveCount(1);
    await expect(page.locator('#panel-cost > .tab-widget--cost > .tab-feed--cost')).toHaveCount(1);
    await expect(page.locator('#panel-quiz > .tab-widget--quiz > .tab-feed--quiz')).toHaveCount(1);
    await expect(page.locator('#panel-manyasha > .tab-widget--manyasha > .tab-feed--manyasha')).toHaveCount(1);
    await expect(page.locator('#panel-faq > .tab-widget--faq > .tab-feed--faq')).toHaveCount(1);
    await expect(page.locator('#panel-path')).toHaveCount(0);

    await expect(page.locator('[role="tabpanel"]:visible')).toHaveCount(1);
    await expect(page.locator('#panel-risks')).toBeVisible();
    await expect(page.locator('#panel-cost')).toBeHidden();
    await expect(page.locator('#panel-quiz')).toBeHidden();
    await expect(page.locator('#panel-faq')).toBeHidden();

    await page.getByRole('tab', { name: 'Квиз' }).click();
    await expect(page.locator('[role="tabpanel"]:visible')).toHaveCount(1);
    await expect(page.locator('#panel-quiz')).toBeVisible();
    await expect(page.locator('#panel-risks')).toBeHidden();
    await expect(page.locator('#panel-quiz .tab-feed--quiz')).toContainText('Сумма долга');
    await expect(page.locator('#panel-quiz .tab-feed--quiz')).not.toContainText('Квартира и доли');

    await page.getByRole('tab', { name: 'Стоимость' }).click();
    await expect(page.locator('[role="tabpanel"]:visible')).toHaveCount(1);
    await expect(page.locator('#panel-cost')).toBeVisible();
    await expect(page.locator('#panel-risks')).toBeHidden();
    await expect(page.locator('#panel-quiz')).toBeHidden();
    await expect(page.locator('#panel-cost .tab-feed--cost')).toContainText('300 000–600 000');
    await expect(page.locator('#panel-cost .tab-feed--cost')).not.toContainText('Квартира и доли');
    await expect(page.locator('#panel-risks')).not.toContainText('300 000–600 000');

    await page.getByRole('tab', { name: 'FAQ' }).click();
    await expect(page.locator('[role="tabpanel"]:visible')).toHaveCount(1);
    await expect(page.locator('#panel-faq')).toBeVisible();
    await expect(page.locator('#panel-cost')).toBeHidden();
    await expect(page.locator('#panel-faq .tab-feed--faq')).toContainText('единственное жильё');
    await expect(page.locator('#panel-faq .tab-feed--faq')).not.toContainText('300 000–600 000');
    await expect(page.locator('#panel-risks')).not.toContainText('единственное жильё?');

    await page.setViewportSize({ width: 390, height: 720 });
    const metrics = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }));
    expect(metrics.documentScrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  });

  test('MR-04: normal diagnostics builds summary and sends profile addon', async ({ page }) => {
    const bodies: any[] = [];
    let chatRequests = 0;
    let reportEmailPayload: any = null;
    const chatMessages = page.locator('#manyasha-chat-messages');

    await page.route('**/api/manyasha/chat', async (route) => {
      chatRequests += 1;
      const body = route.request().postDataJSON();
      bodies.push(body);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: `Диагностический ответ ${chatRequests}: уточняю ситуацию без обещаний списания.`,
          speech_reply: `Коротко фиксирую шаг ${chatRequests}.`,
          suggest_consultation: false,
          mood: 'neutral',
        }),
      });
    });
    await page.route('**/api/client-report-email', async (route) => {
      reportEmailPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'sent' }),
      });
    });

    await openPreview(page, 'normal');
    await sendMessage(page, 'У меня 2 млн долгов');
    await expect(chatMessages).toContainText('Диагностический ответ 1', { timeout: 12_000 });
    await sendMessage(page, 'Приставы списывают');
    await expect(chatMessages).toContainText('Диагностический ответ 2', { timeout: 12_000 });
    await sendMessage(page, 'Работаю официально');
    await expect(chatMessages).toContainText('Диагностический ответ 3', { timeout: 12_000 });

    const card = page.locator('.manyasha-diagnostic-card');
    await expect(card).toBeVisible({ timeout: 8_000 });
    await expect(card).toContainText('Маршрут ситуации');
    await expect(card.locator('.manyasha-diagnostic-progress')).toContainText(/Диагностика: \d+ из 7 пунктов/);
    await expect(card).toContainText('Что уже понятно');
    await expect(card).toContainText('2 000 000 рублей');
    await expect(card).toContainText('приставы');
    await expect(card).toContainText('официальный доход');
    await expect(card.locator('.manyasha-diagnostic-pill')).toHaveCount(2);
    await expect(card.locator('.manyasha-diagnostic-action:not(.manyasha-diagnostic-report-btn)')).toHaveCount(2);
    await expect(card).toContainText('Это не юридическое заключение');
    await expect(card).not.toContainText(/гарантир|спишем|точно спиш/i);

    await card.getByRole('button', { name: 'Показать итог' }).click();
    const report = page.locator('.manyasha-client-report-card').last();
    await expect(report).toBeVisible({ timeout: 4_000 });
    await expect(report).toContainText('Предварительный итог');
    await expect(report).toContainText('Что уже понятно');
    await expect(report).toContainText('2 000 000 рублей');
    await expect(report).toContainText('Что важно проверить');
    await expect(report).toContainText('Следующий безопасный шаг');
    await expect(report).toContainText('Что подготовить');
    await expect(report).toContainText('не юридическое заключение');
    await expect(report).not.toContainText(/гарантир|спишем|точно спиш/i);
    await expect(report.getByRole('button', { name: /Скопировать итог/ })).toBeVisible();
    await expect(report.getByRole('button', { name: 'Отправить на email' })).toBeVisible();

    await report.getByRole('button', { name: 'Отправить на email' }).click();
    await report.locator('.manyasha-client-report-email-input').fill('client@example.test');
    await report.getByRole('button', { name: 'Отправить итог' }).click();
    await expect(report).toContainText('Итог отправлен', { timeout: 6_000 });
    expect(reportEmailPayload.email).toBe('client@example.test');
    expect(reportEmailPayload.session_id).toBeTruthy();
    expect(reportEmailPayload.consent).toBe(true);
    expect(reportEmailPayload.report_text).toContain('Предварительный итог Маняши');
    expect(reportEmailPayload.report_text).toContain('не юридическое заключение');
    expect(reportEmailPayload.diagnostics.debt_amount).toContain('2 000 000');
    expect(String(reportEmailPayload.diagnostics.bailiffs || '').toLowerCase()).toContain('спис');
    expect(JSON.stringify(reportEmailPayload)).not.toContain('chatHistory');
    expect(JSON.stringify(reportEmailPayload)).not.toContain('localStorage');

    expect(chatRequests).toBe(3);
    expect(bodies[0]?.profile?.diagnostics).toBeTruthy();
    expect(bodies[2]?.profile?.diagnostics?.debt_amount).toContain('2 000 000');
    expect(String(bodies[2]?.profile?.diagnostics?.bailiffs || '').toLowerCase()).toContain('спис');
    expect(String(bodies[2]?.profile?.diagnostics?.income || '').toLowerCase()).toContain('официаль');

    await card.getByRole('button', { name: 'Есть квартира' }).click();
    await expect(chatMessages).toContainText('Есть квартира', { timeout: 4_000 });
    await expect(chatMessages).toContainText('Диагностический ответ 4', { timeout: 12_000 });
    expect(chatRequests).toBe(4);
    expect(String(bodies[3]?.profile?.diagnostics?.property?.join(' ') || '').toLowerCase()).toContain('квартир');
  });

  test('MR-05: diagnostics high risk does not inject post-message consult offer', async ({ page }) => {
    const chatMessages = page.locator('#manyasha-chat-messages');
    let chatRequests = 0;
    let consultPayload: any = null;

    await page.route('**/api/manyasha/escalation/evaluate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          should_handoff: false,
          risk_level: 'low',
          priority: 'normal',
          category: 'general',
          reasons: [],
        }),
      });
    });
    await page.route('**/api/manyasha/chat', async (route) => {
      chatRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: `Ответ по диагностике ${chatRequests}: сначала фиксируем риски и документы без обещаний результата.`,
          speech_reply: `Коротко фиксирую риск ${chatRequests}.`,
          suggest_consultation: false,
          mood: 'neutral',
        }),
      });
    });
    await page.route('**/api/consultation-request', async (route) => {
      consultPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'accepted' }),
      });
    });

    await openPreview(page, 'normal');
    await sendMessage(page, 'У меня 2 млн долгов');
    await expect(chatMessages).toContainText('Ответ по диагностике 1', { timeout: 12_000 });
    await expect(page.locator('.consult-offer-card')).toHaveCount(0);

    await sendMessage(page, 'Приставы списывают');
    await expect(chatMessages).toContainText('Ответ по диагностике 2', { timeout: 12_000 });
    await expect(page.locator('.consult-offer-card')).toHaveCount(0);

    await sendMessage(page, 'Есть квартира в ипотеке');
    await expect(chatMessages).toContainText('Ответ по диагностике 3', { timeout: 12_000 });

    await expect(page.locator('.consult-offer-card')).toHaveCount(0);
    await expect(chatMessages).not.toContainText('По ответам видны признаки повышенного риска');

    await page.locator('#manyasha-consult-cta').click();
    await expect(page.locator('#manyasha-consult-modal')).toHaveClass(/open/);
    await page.locator('#cp-name').fill('Тестовый пользователь');
    await page.locator('#cp-phone').fill('+70000000000');
    await expect(page.locator('#cp-phone')).toHaveValue('+70000000000');
    await expect(page.locator('#manyasha-chat-input')).not.toHaveValue('+70000000000');
    await page.locator('#cp-email').fill('lead@example.com');
    await page.locator('#cp-submit-btn').click();
    await expect.poll(() => consultPayload, { timeout: 6_000 }).not.toBeNull();
    expect(consultPayload.diagnostics.debt_amount).toContain('2 000 000');
    expect(String(consultPayload.diagnostics.bailiffs || '').toLowerCase()).toContain('спис');
    expect(String(consultPayload.diagnostics.property?.join(' ') || '').toLowerCase()).toContain('ипотек');
    expect(consultPayload.diagnostics.risk_level).toBe('high');
    expect(consultPayload.diagnostic_summary).toEqual(consultPayload.diagnostics);
    expect(consultPayload.diagnostics.summary_shown).toBeUndefined();
    expect(consultPayload.diagnostics.updated_at).toBeUndefined();
    expect(consultPayload.diagnostics.debt_amount_value).toBeUndefined();
    expect(JSON.stringify(consultPayload)).not.toContain('localStorage');
  });

  test('MR-06: low risk does not auto-consult and manual consult still opens', async ({ page }) => {
    const chatMessages = page.locator('#manyasha-chat-messages');
    let chatRequests = 0;

    await page.route('**/api/manyasha/escalation/evaluate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          should_handoff: false,
          risk_level: 'low',
          priority: 'normal',
          category: 'general',
          reasons: [],
        }),
      });
    });
    await page.route('**/api/manyasha/chat', async (route) => {
      chatRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: `Информационный ответ ${chatRequests}: продолжаем уточнять без консультационного давления.`,
          speech_reply: `Информационный ответ ${chatRequests}.`,
          suggest_consultation: false,
          mood: 'neutral',
        }),
      });
    });

    await openPreview(page, 'normal');
    await sendMessage(page, 'Что ты умеешь?');
    await expect(chatMessages).toContainText('Информационный ответ 1', { timeout: 12_000 });
    await sendMessage(page, 'Какие документы нужны?');
    await expect(chatMessages).toContainText('Информационный ответ 2', { timeout: 12_000 });
    await sendMessage(page, 'Сколько длится банкротство?');
    await expect(chatMessages).toContainText('Информационный ответ 3', { timeout: 12_000 });

    await expect(page.locator('.consult-offer-card')).toHaveCount(0);
    await page.locator('#manyasha-consult-cta').click();
    await expect(page.locator('#manyasha-consult-modal')).toHaveClass(/open/);
  });

  test('MR-07: low-risk diagnostic route stays question-first and 320px safe', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    const chatMessages = page.locator('#manyasha-chat-messages');
    let chatRequests = 0;

    await page.route('**/api/manyasha/escalation/evaluate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          should_handoff: false,
          risk_level: 'low',
          priority: 'normal',
          category: 'general',
          reasons: [],
        }),
      });
    });
    await page.route('**/api/manyasha/chat', async (route) => {
      chatRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: `Низкорисковый ответ ${chatRequests}: сначала уточняем недостающие данные.`,
          speech_reply: `Короткий ответ ${chatRequests}.`,
          suggest_consultation: false,
          mood: 'neutral',
        }),
      });
    });

    await openPreview(page, 'normal');
    await sendMessage(page, 'У меня 200 тысяч долгов');
    await expect(chatMessages).toContainText('Низкорисковый ответ 1', { timeout: 12_000 });
    await sendMessage(page, 'Это кредиты');
    await expect(chatMessages).toContainText('Низкорисковый ответ 2', { timeout: 12_000 });
    await sendMessage(page, 'Работаю официально');
    await expect(chatMessages).toContainText('Низкорисковый ответ 3', { timeout: 12_000 });

    const card = page.locator('.manyasha-diagnostic-card');
    await expect(card).toBeVisible({ timeout: 8_000 });
    await expect(card.locator('.manyasha-diagnostic-section-next')).not.toContainText(/юрист|консультац/i);
    await expect(card.locator('.manyasha-diagnostic-pill')).toHaveCount(2);
    await expect(page.locator('.consult-offer-card')).toHaveCount(0);

    const metrics = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }));
    expect(metrics.documentScrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  });

  test('MR-08: client report with insufficient data asks for missing fields locally', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    const chatMessages = page.locator('#manyasha-chat-messages');
    let chatRequests = 0;
    let reportEmailRequests = 0;

    await page.route('**/api/manyasha/chat', async (route) => {
      chatRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: 'Я помогу разобраться, но сначала нужно чуть больше вводных.',
          speech_reply: 'Сначала уточним вводные.',
          suggest_consultation: false,
          mood: 'neutral',
        }),
      });
    });
    await page.route('**/api/client-report-email', async (route) => {
      reportEmailRequests += 1;
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Email delivery не настроен для этого окружения.' }),
      });
    });

    await openPreview(page, 'normal');
    await sendMessage(page, 'Здравствуйте');
    await expect(chatMessages).toContainText('Я помогу разобраться', { timeout: 12_000 });
    const reportAction = page.locator('#manyasha-suggested .manyasha-report-action');
    await expect(reportAction).toBeVisible({ timeout: 6_000 });
    await reportAction.click();

    const report = page.locator('.manyasha-client-report-card').last();
    await expect(report).toBeVisible({ timeout: 4_000 });
    await expect(report).toContainText('Чтобы сделать итог точнее');
    await expect(report).toContainText('не юридическое заключение');
    await expect(report.getByRole('button', { name: /Скопировать итог/ })).toBeVisible();
    await report.getByRole('button', { name: 'Отправить на email' }).click();
    await report.locator('.manyasha-client-report-email-input').fill('client@example.test');
    await report.getByRole('button', { name: 'Отправить итог' }).click();
    await expect(report).toContainText('Email delivery не настроен', { timeout: 6_000 });
    expect(chatRequests).toBe(1);
    expect(reportEmailRequests).toBe(1);

    const metrics = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }));
    expect(metrics.documentScrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  });
});
