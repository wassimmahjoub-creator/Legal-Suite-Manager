export function EmptyCalendarIllustration() {
  return (
    <svg viewBox="0 0 160 140" fill="none" className="w-full h-full text-primary" aria-hidden>
      {/* Calendar body */}
      <rect x="10" y="22" width="140" height="108" rx="10" stroke="currentColor" strokeWidth="2.5" />
      {/* Header bar */}
      <rect x="10" y="22" width="140" height="34" rx="10" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.08" />
      {/* Month label (line) */}
      <line x1="50" y1="41" x2="110" y2="41" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Binding rings */}
      <line x1="44" y1="12" x2="44" y2="30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="80" y1="12" x2="80" y2="30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="116" y1="12" x2="116" y2="30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* Grid — horizontal */}
      <line x1="10" y1="76" x2="150" y2="76" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
      <line x1="10" y1="102" x2="150" y2="102" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
      {/* Grid — vertical */}
      <line x1="56" y1="56" x2="56" y2="130" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
      <line x1="103" y1="56" x2="103" y2="130" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
      {/* Empty day dots */}
      {[33, 80, 127].map(x =>
        [65, 90, 116].map(y => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="currentColor" fillOpacity="0.15" />
        ))
      )}
    </svg>
  );
}
