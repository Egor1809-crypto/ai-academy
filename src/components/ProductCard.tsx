import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Карточка продукта (каталог /products).
 * PATTERN(7): Presentational; CONCEPT(8): EqualHeightCard.
 * Ключевое: `flex flex-col h-full` + `mt-auto` на футере → цена/стрелка прижаты
 * к низу одинаково у всех карточек (иначе при разной длине описания стрелки
 * оказываются на разной высоте). Иерархия: бейдж → крупный заголовок → описание
 * → разделитель → цена/CTA.
 */
export interface ProductCardProps {
  title: string;
  href: string;
  tag: string;
  tagColor: string;
  description: string;
  price: string;
  icon: ReactNode;
}

export default function ProductCard({
  title,
  href,
  tag,
  tagColor,
  description,
  price,
  icon,
}: ProductCardProps) {
  return (
    <Link href={href} className="group block h-full">
      <div className="relative flex flex-col h-full bg-white/[0.03] border border-white/10 p-6 md:p-8 transition-all duration-500 hover:border-gold/30 hover:bg-white/[0.05] hover:shadow-[0_0_40px_rgba(0,207,255,0.08)] hover:-translate-y-1">
        {/* Угловые засечки */}
        <svg
          className="absolute top-0 left-0 w-5 h-5 text-gold/0 group-hover:text-gold/30 transition-colors duration-500"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path d="M0 20V0h20" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <svg
          className="absolute bottom-0 right-0 w-5 h-5 text-gold/0 group-hover:text-gold/30 transition-colors duration-500"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path d="M20 0v20H0" stroke="currentColor" strokeWidth="1.5" />
        </svg>

        {/* Бейдж + иконка */}
        <div className="flex items-center justify-between mb-5">
          <span
            className={`text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 border ${tagColor}`}
          >
            {tag}
          </span>
          <div className="w-10 h-10 flex items-center justify-center text-gold/60 group-hover:text-gold transition-colors duration-300">
            {icon}
          </div>
        </div>

        {/* Заголовок — крупнее для иерархии */}
        <h3 className="font-heading font-bold text-xl md:text-2xl leading-tight mb-3 text-white group-hover:text-gold transition-colors duration-300">
          {title}
        </h3>

        {/* Описание */}
        <p className="text-gray-400 text-sm leading-relaxed mb-6">{description}</p>

        {/* Футер прижат к низу → стрелки всех карточек на одной линии */}
        <div className="mt-auto pt-5 border-t border-white/[0.07] flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-0.5">
              Стоимость
            </span>
            <span className="text-gold font-heading font-bold text-lg leading-none">
              {price}
            </span>
          </div>
          <span className="w-9 h-9 shrink-0 flex items-center justify-center border border-white/10 group-hover:border-gold/40 group-hover:bg-gold/10 transition-all duration-300">
            <svg
              className="w-4 h-4 text-gray-500 group-hover:text-gold group-hover:translate-x-0.5 transition-all duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
