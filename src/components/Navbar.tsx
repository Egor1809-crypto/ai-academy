"use client";

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-navy-900/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gold flex items-center justify-center font-heading font-bold text-navy-900 text-xl">
            L
          </div>
          <span className="font-heading font-bold text-xl tracking-wider">
            AI<span className="text-gold">LEGAL</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300 uppercase tracking-widest">
          <a href="#about" className="hover:text-gold transition-colors">
            О курсе
          </a>
          <a href="#program" className="hover:text-gold transition-colors">
            Программа
          </a>
          <a href="#experts" className="hover:text-gold transition-colors">
            Эксперты
          </a>
          <a href="#tariffs" className="hover:text-gold transition-colors">
            Тарифы
          </a>
        </div>
        <a
          href="#tariffs"
          className="px-6 py-2.5 bg-transparent border border-gold text-gold font-heading font-bold hover:bg-gold hover:text-navy-900 transition-all duration-300 uppercase tracking-wide text-sm glow-gold-hover"
        >
          Регистрация
        </a>
      </div>
    </nav>
  );
}
