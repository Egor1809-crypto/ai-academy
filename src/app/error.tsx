"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary. Catches render/runtime errors in any page or
 * client component below the root layout and shows a recovery screen instead
 * of a blank white page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for diagnostics (server logs / monitoring).
    console.error("Route error boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 px-6 text-center">
      <div className="max-w-md">
        <div className="font-mono text-gold text-sm tracking-widest mb-4">ОШИБКА</div>
        <h1 className="font-heading font-bold text-3xl md:text-4xl text-white mb-4">
          Что-то пошло не так
        </h1>
        <p className="text-gray-400 mb-8">
          Произошла непредвиденная ошибка. Попробуйте обновить страницу — если
          проблема повторяется, мы уже работаем над ней.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="px-8 py-3 bg-gold text-navy-900 font-heading font-bold uppercase tracking-wide text-sm hover:bg-gold-light transition-colors cursor-pointer"
          >
            Попробовать снова
          </button>
          <Link
            href="/"
            className="px-8 py-3 border border-white/20 text-white font-heading font-bold uppercase tracking-wide text-sm hover:border-gold hover:text-gold transition-colors"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
