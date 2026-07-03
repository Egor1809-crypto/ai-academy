/**
 * Фон экрана входа — фирменная «гжель + схемотехника» по мотивам постеров бренда:
 * плотные сине-белые флораль-завитки по четырём углам + неоновые схемо-линии с
 * узлами по бокам. Чистый SVG (без интерактива), цианово-магентовая палитра сайта.
 * Собрано «по образу» референсов (файла-ассета нет).
 */

/* Один угловой гжель-флориаль: пион + бутон + листья + завитки + «капли».
   Нарисован в углу viewBox, открывается внутрь. Разворачивается по 4 углам. */
function GzhelCorner() {
  // 6 внешних лепестков + 6 внутренних вокруг центра пиона (cx,cy = 78,78)
  const petal = "M0,0 C -13,-16 -8,-40 0,-48 C 8,-40 13,-16 0,0 Z";
  const petalInner = "M0,0 C -8,-10 -5,-25 0,-31 C 5,-25 8,-10 0,0 Z";
  return (
    <svg viewBox="0 0 240 240" fill="none" className="w-full h-full" aria-hidden>
      <defs>
        <linearGradient id="gz-line" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9df4ff" />
          <stop offset="55%" stopColor="#00CFFF" />
          <stop offset="100%" stopColor="#2f7fff" />
        </linearGradient>
      </defs>

      <g stroke="url(#gz-line)" strokeLinecap="round" strokeLinejoin="round">
        {/* Главный стебель-дуга из угла */}
        <path d="M6 6 C 40 34, 60 40, 78 78" strokeWidth="1.6" opacity="0.7" fill="none" />
        {/* Побеги вдоль краёв */}
        <path d="M78 78 C 120 66, 170 62, 216 70" strokeWidth="1.3" opacity="0.5" fill="none" />
        <path d="M78 78 C 66 120, 62 170, 70 216" strokeWidth="1.3" opacity="0.5" fill="none" />

        {/* Листья-завитки */}
        <g opacity="0.6" strokeWidth="1.3">
          <path d="M78 78 C 108 74, 128 92, 132 120 C 108 116, 86 104, 78 78 Z" fill="rgba(0,207,255,0.05)" />
          <path d="M78 78 C 74 108, 92 128, 120 132 C 116 108, 104 86, 78 78 Z" fill="rgba(0,207,255,0.05)" />
          <path d="M92 108 C 104 112, 114 122, 120 134" strokeWidth="0.9" opacity="0.7" />
          <path d="M108 92 C 112 104, 122 114, 134 120" strokeWidth="0.9" opacity="0.7" />
        </g>

        {/* Пион (два ряда лепестков) */}
        <g transform="translate(78 78)" opacity="0.85">
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <path key={`o${a}`} d={petal} transform={`rotate(${a})`} strokeWidth="1.5" fill="rgba(0,207,255,0.06)" />
          ))}
          {[30, 90, 150, 210, 270, 330].map((a) => (
            <path key={`i${a}`} d={petalInner} transform={`rotate(${a})`} strokeWidth="1.2" fill="rgba(0,207,255,0.09)" />
          ))}
          {/* Центр — спираль + капля */}
          <circle r="8" strokeWidth="1.4" fill="rgba(0,207,255,0.12)" />
          <path d="M0 -4 C 3 -3, 4 1, 1 3 C -2 4, -3 0, -1 -2" strokeWidth="1.1" fill="none" opacity="0.9" />
        </g>

        {/* Бутон-спутник */}
        <g transform="translate(150 60)" opacity="0.6">
          <path d="M0 12 C -10 4, -10 -10, 0 -16 C 10 -10, 10 4, 0 12 Z" strokeWidth="1.3" fill="rgba(0,207,255,0.05)" />
          <path d="M0 -16 L0 -28" strokeWidth="1.1" />
        </g>

        {/* «Капли» гжели */}
        <g fill="url(#gz-line)" stroke="none" opacity="0.85">
          <circle cx="132" cy="120" r="2.4" />
          <circle cx="120" cy="132" r="2.4" />
          <circle cx="150" cy="44" r="2.2" />
          <circle cx="44" cy="150" r="2.2" />
          <circle cx="200" cy="66" r="1.8" />
          <circle cx="66" cy="200" r="1.8" />
        </g>
      </g>
    </svg>
  );
}

/* Неоновые схемо-линии по вертикальному краю (как на постере). */
function CircuitEdge() {
  return (
    <svg viewBox="0 0 120 600" fill="none" className="w-full h-full" preserveAspectRatio="none" aria-hidden>
      <g stroke="#00CFFF" strokeWidth="1" opacity="0.28" fill="none">
        <path d="M0 80 H60 V150 H30 V240" />
        <path d="M0 200 H40 V320 H80" />
        <path d="M0 360 H70 V300" />
        <path d="M0 440 H35 V520 H95" />
        <path d="M0 560 H55 V500 H90" />
      </g>
      <g fill="#FF007A" opacity="0.5">
        <circle cx="60" cy="150" r="2.4" />
        <circle cx="80" cy="320" r="2.4" />
        <circle cx="95" cy="520" r="2.4" />
      </g>
      <g fill="#00CFFF" opacity="0.5">
        <circle cx="30" cy="240" r="2" />
        <circle cx="70" cy="300" r="2" />
        <circle cx="90" cy="500" r="2" />
      </g>
    </svg>
  );
}

export default function AuthDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* схемо-линии по бокам */}
      <div className="absolute inset-y-0 left-0 w-24 md:w-40 opacity-60 hidden sm:block">
        <CircuitEdge />
      </div>
      <div className="absolute inset-y-0 right-0 w-24 md:w-40 opacity-60 hidden sm:block" style={{ transform: "scaleX(-1)" }}>
        <CircuitEdge />
      </div>

      {/* гжель по 4 углам */}
      <div className="absolute top-0 left-0 w-40 h-40 md:w-64 md:h-64 opacity-80">
        <GzhelCorner />
      </div>
      <div className="absolute top-0 right-0 w-40 h-40 md:w-64 md:h-64 opacity-80" style={{ transform: "scaleX(-1)" }}>
        <GzhelCorner />
      </div>
      <div className="absolute bottom-0 left-0 w-40 h-40 md:w-64 md:h-64 opacity-80" style={{ transform: "scaleY(-1)" }}>
        <GzhelCorner />
      </div>
      <div className="absolute bottom-0 right-0 w-40 h-40 md:w-64 md:h-64 opacity-80" style={{ transform: "scale(-1,-1)" }}>
        <GzhelCorner />
      </div>
    </div>
  );
}
