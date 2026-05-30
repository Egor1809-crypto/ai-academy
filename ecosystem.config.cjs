/**
 * PM2 process manager config — управляет сайтом и Telegram-ботом как фоновыми
 * сервисами: автозапуск, перезапуск при сбое, запуск после перезагрузки.
 *
 * ── Локально (разработка, с автообновлением кода) ──
 *   pm2 start ecosystem.config.cjs --only ailegal-bot
 *   (сайт при разработке удобнее держать в dev-режиме: pm2 start ecosystem.config.cjs --only ailegal-web-dev)
 *
 * ── На сервере (боевой режим) ──
 *   npm ci && npm run build && npx prisma migrate deploy
 *   pm2 start ecosystem.config.cjs --only ailegal-web,ailegal-bot
 *   pm2 save        # запомнить список процессов
 *   pm2 startup     # вывести команду автозапуска после ребута (выполнить её один раз)
 */
module.exports = {
  apps: [
    {
      // Сайт в БОЕВОМ режиме (после npm run build) — для сервера.
      name: "ailegal-web",
      cwd: __dirname,
      script: "npm",
      args: "run start",
      autorestart: true,
      max_memory_restart: "600M",
      env: { NODE_ENV: "production" },
    },
    {
      // Сайт в режиме РАЗРАБОТКИ (горячая перезагрузка) — для локальной работы.
      name: "ailegal-web-dev",
      cwd: __dirname,
      script: "npm",
      args: "run dev",
      autorestart: true,
      env: { NODE_ENV: "development" },
    },
    {
      // Telegram-бот — один и тот же и локально, и на сервере.
      name: "ailegal-bot",
      cwd: __dirname + "/bot",
      script: "index.js",
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 50,
      env: { NODE_ENV: "production" },
    },
  ],
};
