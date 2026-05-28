import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-tech-grid opacity-30" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[200px] pointer-events-none" />

      <div className="relative z-10 text-center px-6">
        {/* Glitch 404 */}
        <div className="mb-8">
          <h1 className="text-[8rem] md:text-[12rem] font-heading font-bold leading-none text-white/5 select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl md:text-8xl font-heading font-bold text-gradient-gold">
              404
            </span>
          </div>
        </div>

        <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white mt-16">
          Страница не найдена
        </h2>
        <p className="text-gray-400 max-w-md mx-auto mb-8 leading-relaxed">
          Маняша искала эту страницу, но не нашла. Возможно, она была перемещена или удалена.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-8 py-3 bg-gold text-navy-900 font-heading font-bold uppercase tracking-wider text-sm hover:bg-gold-light transition-all duration-300 shadow-[0_0_20px_rgba(0,207,255,0.3)]"
          >
            На главную
          </Link>
          <Link
            href="/products"
            className="px-8 py-3 border border-white/20 text-white font-heading font-bold uppercase tracking-wider text-sm hover:border-gold hover:text-gold transition-all duration-300"
          >
            Наши продукты
          </Link>
        </div>

        <div className="mt-12 flex justify-center gap-6 text-xs text-gray-600 font-mono">
          <Link href="/about" className="hover:text-gold transition-colors">О курсе</Link>
          <span className="text-white/10">|</span>
          <Link href="/tariffs" className="hover:text-gold transition-colors">Тарифы</Link>
          <span className="text-white/10">|</span>
          <Link href="/program" className="hover:text-gold transition-colors">Программа</Link>
        </div>
      </div>
    </div>
  );
}
