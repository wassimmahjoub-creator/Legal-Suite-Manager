export function EmptyDocumentsIllustration() {
  return (
    <svg viewBox="0 0 160 140" fill="none" className="w-full h-full text-primary" aria-hidden>
      {/* Folder back */}
      <path d="M10 50h140v76a8 8 0 0 1-8 8H18a8 8 0 0 1-8-8V50z"
        stroke="currentColor" strokeWidth="2.5" />
      {/* Folder tab */}
      <path d="M10 50V36a6 6 0 0 1 6-6h38l10 12H10z"
        stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="currentColor" fillOpacity="0.08" />
      {/* Divider line */}
      <line x1="10" y1="50" x2="150" y2="50" stroke="currentColor" strokeWidth="2" strokeOpacity="0.5" />
      {/* Empty dashed content lines */}
      <line x1="36" y1="80" x2="124" y2="80"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 5" strokeOpacity="0.5" />
      <line x1="36" y1="100" x2="110" y2="100"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 5" strokeOpacity="0.5" />
      <line x1="36" y1="120" x2="90" y2="120"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 5" strokeOpacity="0.5" />
      {/* Up arrow hint */}
      <circle cx="130" cy="86" r="16" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.5" />
      <line x1="130" y1="94" x2="130" y2="78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M123 85l7-8 7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
