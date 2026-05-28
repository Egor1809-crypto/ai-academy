import { TICKER_ITEMS } from "@/data/content";

const items = TICKER_ITEMS;

export default function Ticker() {
  const row = items.map((item, i) => (
    <span key={i} className="mx-8 flex items-center gap-3 shrink-0">
      <span className="w-2 h-2 bg-navy-900/60 rotate-45" />
      {item}
    </span>
  ));

  return (
    <div className="w-full bg-gold py-3.5 overflow-hidden relative z-20">
      <div className="ticker-track flex font-heading font-bold text-navy-900 text-sm tracking-widest uppercase">
        <div className="ticker-slide flex shrink-0">{row}</div>
        <div className="ticker-slide flex shrink-0" aria-hidden="true">{row}</div>
      </div>
    </div>
  );
}
