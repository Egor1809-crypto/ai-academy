import http from 'node:http';
import { URL } from 'node:url';

const port = Number(process.env.PORT || 4173);

function renderPage(pathname) {
  const active = (path) => pathname === path ? 'active' : '';
  return `<!doctype html>
  <html lang="ru">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Partner Dashboard</title>
      <style>
        body { margin: 0; font-family: system-ui, sans-serif; background: #eef4f6; color: #203040; }
        .shell { display: grid; grid-template-columns: 280px 1fr; min-height: 100vh; }
        .sidebar { padding: 20px; background: #fffaf2; border-right: 1px solid rgba(0,0,0,.08); }
        .sidebar a { display: block; padding: 12px 14px; border-radius: 16px; text-decoration: none; color: #203040; margin-bottom: 8px; }
        .sidebar a.active { background: #173c5a; color: white; }
        .main { padding: 20px; }
        .hero { background: white; border-radius: 24px; padding: 24px; box-shadow: 0 16px 36px rgba(0,0,0,.06); }
        .prompt-card { margin-top: 18px; background: white; border-radius: 24px; padding: 20px; }
        textarea { width: 100%; min-height: 150px; border-radius: 14px; padding: 12px; border: 1px solid #c9d3db; }
        button { margin-top: 12px; border: 0; border-radius: 999px; padding: 12px 16px; background: #cf8b14; color: white; font-weight: 700; cursor: pointer; }
        [role="alert"] { margin-top: 12px; border-radius: 14px; background: #fff1ed; border: 1px solid #f1b7ad; color: #8a311d; padding: 12px 14px; }
        @media (max-width: 390px) { .shell { grid-template-columns: 1fr; } }
      </style>
    </head>
    <body>
      <div class="shell">
        <aside class="sidebar">
          <a class="${active('/partner/mascot')}" href="/partner/mascot">Маскот</a>
          <a class="${active('/partner/rpg')}" href="/partner/rpg">RPG</a>
          <a class="${active('/partner/analytics')}" href="/partner/analytics">Аналитика</a>
        </aside>
        <main class="main">
          <section class="hero" data-testid="hero-block">
            <p style="margin:0; text-transform:uppercase; letter-spacing:.14em; color:#7b5b33; font-size:12px;">First screen</p>
            <h1 data-testid="hero-title" style="margin:10px 0 0;">Маняша и уровень партнёра без скролла</h1>
            <p style="margin:10px 0 0; color:#597182;">Текущий уровень: Эксперт · Weighted score: 312</p>
          </section>
          <section class="prompt-card">
            <label for="prompt">Промпт партнёра</label>
            <textarea id="prompt" data-testid="prompt-textarea" placeholder="Введите prompt"></textarea>
            <button id="save-prompt" type="button">Сохранить промпт</button>
            <div id="alert-root"></div>
          </section>
        </main>
      </div>
      <script>
        const forbidden = ['ignore previous', 'you are now', 'pretend you', 'disregard'];
        const textarea = document.getElementById('prompt');
        const button = document.getElementById('save-prompt');
        const alertRoot = document.getElementById('alert-root');
        button.addEventListener('click', async () => {
          const value = textarea.value.trim();
          alertRoot.innerHTML = '';
          const found = forbidden.find((pattern) => value.toLowerCase().includes(pattern));
          if (found) {
            alertRoot.innerHTML = '<div role="alert">Найден запрещённый паттерн \'' + found + '\'. Удалите override-инструкцию и повторите сохранение.</div>';
            return;
          }
          if (Math.ceil(value.length / 4) > 1800) {
            alertRoot.innerHTML = '<div role="alert">Промпт слишком длинный. Сократите текст и повторите сохранение.</div>';
            return;
          }
          const response = await fetch('/api/v1/partner/prompt', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'X-Partner-Id': 'partner-a' },
            body: JSON.stringify({ prompt_text: value || 'safe prompt' })
          });
          if (!response.ok) {
            const payload = await response.json();
            alertRoot.innerHTML = '<div role="alert">' + payload.detail + '</div>';
            return;
          }
          alertRoot.innerHTML = '<div role="status">Промпт сохранён.</div>';
        });
      </script>
    </body>
  </html>`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);

  if (url.pathname.startsWith('/partner/')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderPage(url.pathname));
    return;
  }

  if (url.pathname === '/api/v1/partner/prompt' && req.method === 'PATCH') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      const payload = JSON.parse(body || '{}');
      const promptText = String(payload.prompt_text || '');
      if (promptText.toLowerCase().includes('ignore previous')) {
        res.writeHead(422, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'В промпте найден запрещённый паттерн.' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        asset_id: null,
        object_key: null,
        preview_url: null,
        content_type: null,
        prompt_version: 2,
        prompt_token_count: Math.ceil(promptText.length / 4),
        prompt_kms_key_id: 'kms-demo',
      }));
    });
    return;
  }

  if (url.pathname === '/api/v1/partner/mascot/preview' && req.method === 'GET') {
    const owner = url.searchParams.get('owner') || 'partner-a';
    const requester = req.headers['x-partner-id'] || 'partner-a';
    if (requester !== owner) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ detail: 'Партнёр не имеет доступа к ассетам другого white-label кабинета.' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      asset_id: 'asset-1',
      object_key: 'partners/partner-a/mascot/demo.glb',
      preview_url: 'https://example.invalid/preview/demo',
      content_type: 'model/gltf-binary',
      prompt_version: 1,
      prompt_token_count: 120,
      prompt_kms_key_id: 'kms-demo',
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ detail: 'Not found' }));
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`mock partner dashboard server listening on ${port}\n`);
});