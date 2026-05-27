export default function SectionDivider() {
  return (
    <div className="relative w-full h-16 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
      </div>
      <div className="relative flex items-center gap-3">
        <svg width="20" height="20" viewBox="0 0 20 20" className="text-gold/40">
          <path d="M0 10 L10 0 L20 10 L10 20 Z" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
        <div className="w-2 h-2 bg-gold/60 rotate-45 animate-pulse-glow" />
        <svg width="20" height="20" viewBox="0 0 20 20" className="text-gold/40">
          <path d="M0 10 L10 0 L20 10 L10 20 Z" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}
