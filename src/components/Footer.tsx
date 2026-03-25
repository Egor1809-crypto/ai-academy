export default function Footer() {
  return (
    <footer className="bg-black py-12 border-t border-white/10 text-sm text-gray-500 text-center md:text-left">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
            <div className="w-6 h-6 bg-gray-500 flex items-center justify-center font-heading font-bold text-black text-xs">
              L
            </div>
            <span className="font-heading font-bold text-lg tracking-wider text-gray-400">
              AI<span className="text-gray-500">LEGAL</span>
            </span>
          </div>
          <p className="max-w-sm mx-auto md:mx-0">
            Образовательная платформа для юристов нового поколения. Интеграция технологий в юридическую
            практику.
          </p>
        </div>
        <div>
          <h4 className="text-gray-300 font-bold mb-4 uppercase tracking-wider text-xs">Документы</h4>
          <ul className="space-y-2">
            <li><a href="#" className="hover:text-gold transition-colors">Договор оферты</a></li>
            <li><a href="#" className="hover:text-gold transition-colors">Политика конфиденциальности</a></li>
            <li><a href="#" className="hover:text-gold transition-colors">Лицензия на обр. деятельность</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-gray-300 font-bold mb-4 uppercase tracking-wider text-xs">Контакты</h4>
          <ul className="space-y-2">
            <li>hello@ailegal.ru</li>
            <li>+7 (495) 123-45-67</li>
            <li>Москва, Пресненская наб. 12</li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-white/10 text-center text-xs">
        &copy; 2024 AI LEGAL. Все права защищены.
      </div>
    </footer>
  );
}
