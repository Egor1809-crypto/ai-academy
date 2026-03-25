const items = [
  "500+ Выпускников",
  "15+ Готовых промптов",
  "Экономия 40 часов в месяц",
  "Доступ к AI-сервисам",
  "Практика на реальных кейсах",
  "Диплом гос. образца",
];

export default function Ticker() {
  return (
    <div className="w-full bg-gold py-3 overflow-hidden flex items-center border-y border-white/20 relative z-20">
      <div className="whitespace-nowrap flex animate-ticker font-heading font-bold text-navy-900 text-sm tracking-widest uppercase">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="mx-8">
            &bull; {item}
          </span>
        ))}
      </div>
    </div>
  );
}
