export function EmptyInvoicesIllustration() {
  return (
    <svg viewBox="0 0 160 140" fill="none" className="w-full h-full text-primary" aria-hidden>
      {/* Shadow doc (behind) */}
      <path d="M44 22h72l20 20v88H44z" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
      {/* Main document body */}
      <path d="M24 12h72l20 20v88H24z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Folded corner */}
      <path d="M96 12v20h20" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {/* Text lines */}
      <line x1="40" y1="56" x2="96" y2="56" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="72" x2="96" y2="72" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="88" x2="80" y2="88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Amount box */}
      <rect x="40" y="104" width="60" height="16" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <line x1="50" y1="112" x2="70" y2="112" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
      {/* DT badge */}
      <text x="82" y="116" fontSize="9" fill="currentColor" fontFamily="sans-serif" opacity="0.8">د.ت</text>
    </svg>
  );
}
