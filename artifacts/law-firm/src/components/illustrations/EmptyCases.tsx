export function EmptyCasesIllustration() {
  return (
    <svg viewBox="0 0 160 140" fill="none" className="w-full h-full text-primary" aria-hidden>
      {/* Briefcase body */}
      <rect x="20" y="58" width="120" height="76" rx="10" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Handle */}
      <path d="M56 58V46a8 8 0 0 1 8-8h32a8 8 0 0 1 8 8v12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Center divider */}
      <line x1="20" y1="80" x2="140" y2="80" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
      {/* Latch */}
      <rect x="68" y="88" width="24" height="16" rx="4" stroke="currentColor" strokeWidth="2" />
      {/* Scales of justice above */}
      <line x1="80" y1="8" x2="80" y2="34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="18" x2="110" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Left pan chain + pan */}
      <line x1="50" y1="18" x2="50" y2="34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M36 34 Q50 42 64 34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Right pan chain + pan */}
      <line x1="110" y1="18" x2="110" y2="34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M96 34 Q110 42 124 34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Decorative dot */}
      <circle cx="80" cy="8" r="3" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}
