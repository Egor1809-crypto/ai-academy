"use client";

import { useEffect } from "react";

/**
 * Root-level error boundary. Catches errors thrown in the root layout itself.
 * It REPLACES the layout (including <html>/<body>), so it must render its own
 * document shell and cannot rely on the app's global CSS — styles are inline.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary:", error);
  }, [error]);

  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0e1a",
          color: "#fff",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "28rem" }}>
          <div
            style={{
              color: "#FFD700",
              fontSize: "14px",
              letterSpacing: "0.2em",
              marginBottom: "16px",
            }}
          >
            ОШИБКА
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 16px" }}>
            Что-то пошло не так
          </h1>
          <p style={{ color: "#9aa3b2", margin: "0 0 32px", lineHeight: 1.6 }}>
            Произошла непредвиденная ошибка. Попробуйте обновить страницу.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "12px 32px",
              background: "#FFD700",
              color: "#0a0e1a",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              border: "none",
              cursor: "pointer",
            }}
          >
            Попробовать снова
          </button>
        </div>
      </body>
    </html>
  );
}
