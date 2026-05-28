import { expect, test, type APIRequestContext } from '@playwright/test';

const useMockServer = process.env.E2E_USE_MOCK === '1';

type WidgetContext = {
  partner_id: string;
  session_id: string;
  widget_token: string;
};

async function issueWidgetContext(request: APIRequestContext, sid: string): Promise<WidgetContext> {
  const response = await request.get(
    `/api/manyasha/widget-context?pid=${encodeURIComponent('default')}&sid=${encodeURIComponent(sid)}`,
  );
  expect(response.status()).toBe(200);
  return (await response.json()) as WidgetContext;
}

test('SEC-04: критичные widget endpoint требуют auth token', async ({ request }) => {
  test.skip(useMockServer, 'Тест требует реальный backend.');

  const sid = `e2e-sec-${Date.now()}`;
  const checks: Array<{
    method: 'GET' | 'POST' | 'PUT';
    path: string;
    data?: Record<string, unknown>;
  }> = [
    { method: 'GET', path: `/api/chat/session/${encodeURIComponent(sid)}` },
    { method: 'PUT', path: `/api/chat/session/${encodeURIComponent(sid)}`, data: { messages: [] } },
    {
      method: 'POST',
      path: '/api/consultation-request',
      data: {
        name: 'E2E User',
        phone: '+70000000000',
        email: 'e2e@example.com',
        question: 'test',
        session_id: sid,
      },
    },
    {
      method: 'POST',
      path: '/api/email-capture',
      data: { email: 'e2e@example.com', question: 'test', session_id: sid },
    },
    {
      method: 'POST',
      path: '/api/analytics/event',
      data: { session_id: sid, event_type: 'e2e_test', data: { ok: true } },
    },
    {
      method: 'POST',
      path: '/api/handoff/request',
      data: { session_id: sid, reason: 'test handoff' },
    },
  ];

  for (const check of checks) {
    const response = check.method === 'GET'
      ? await request.get(check.path)
      : check.method === 'PUT'
        ? await request.put(check.path, { data: check.data })
        : await request.post(check.path, { data: check.data });
    expect(response.status(), `${check.method} ${check.path}`).toBe(401);
  }
});

test('SEC-05: widget token привязан к session_id (403 на mismatch)', async ({ request }) => {
  test.skip(useMockServer, 'Тест требует реальный backend.');

  const sidToken = `e2e-token-${Date.now()}`;
  const sidOther = `${sidToken}-other`;
  const ctx = await issueWidgetContext(request, sidToken);

  const response = await request.get(`/api/chat/session/${encodeURIComponent(sidOther)}`, {
    headers: { Authorization: `Bearer ${ctx.widget_token}` },
  });

  expect(response.status()).toBe(403);
});

test('SEC-06: payload limits активны (413 для oversized analytics)', async ({ request }) => {
  test.skip(useMockServer, 'Тест требует реальный backend.');

  const sid = `e2e-over-${Date.now()}`;
  const ctx = await issueWidgetContext(request, sid);
  const huge = 'x'.repeat(20_000);

  const response = await request.post('/api/analytics/event', {
    headers: { Authorization: `Bearer ${ctx.widget_token}` },
    data: {
      session_id: sid,
      event_type: 'oversized_event',
      data: { huge },
    },
  });

  expect(response.status()).toBe(413);
});

test('SEC-07: rate limit активен для lead endpoint (429)', async ({ request }) => {
  test.skip(useMockServer, 'Тест требует реальный backend.');

  const sid = `e2e-rate-${Date.now()}`;
  const ctx = await issueWidgetContext(request, sid);

  let lastStatus = 0;
  for (let i = 0; i < 9; i += 1) {
    const response = await request.post('/api/consultation-request', {
      headers: { Authorization: `Bearer ${ctx.widget_token}` },
      data: {
        name: `Rate User ${i}`,
        phone: '+70000000000',
        email: `rate${i}@example.com`,
        question: 'rate-limit-check',
        session_id: sid,
      },
    });
    lastStatus = response.status();
  }

  expect(lastStatus).toBe(429);
});

test('SEC-08: handoff status endpoint защищён (401 без widget token)', async ({ request }) => {
  test.skip(useMockServer, 'Тест требует реальный backend.');

  const sid = `e2e-handoff-sec-${Date.now()}`;
  const ctx = await issueWidgetContext(request, sid);
  const createResponse = await request.post('/api/handoff/request', {
    headers: { Authorization: `Bearer ${ctx.widget_token}` },
    data: {
      session_id: sid,
      reason: 'security-check',
      priority: 'normal',
      risk_level: 'medium',
      category: 'general',
    },
  });
  expect(createResponse.status()).toBe(201);
  const ticket = await createResponse.json() as { ticket_id: string };
  expect(ticket.ticket_id).toBeTruthy();

  const statusGetUnauthed = await request.get(`/api/handoff/status/${encodeURIComponent(ticket.ticket_id)}`);
  expect(statusGetUnauthed.status()).toBe(401);

  const statusPostUnauthed = await request.post(`/api/handoff/status/${encodeURIComponent(ticket.ticket_id)}`, {
    data: { status: 'assigned', operator_name: 'Security Bot' },
  });
  expect(statusPostUnauthed.status()).toBe(401);
});
