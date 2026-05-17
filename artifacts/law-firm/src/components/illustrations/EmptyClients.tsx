export function EmptyClientsIllustration() {
  return (
    <svg viewBox="0 0 160 140" fill="none" className="w-full h-full text-primary" aria-hidden>
      {/* Person 2 (back, right) */}
      <circle cx="100" cy="48" r="22" stroke="currentColor" strokeWidth="2" strokeOpacity="0.45" />
      <path d="M58 128c0-26 18-40 42-40s42 14 42 40"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.45" fill="none" />
      {/* Person 1 (front, left) */}
      <circle cx="68" cy="52" r="26" stroke="currentColor" strokeWidth="2.5" />
      <path d="M14 132c0-30 22-46 54-46s54 16 54 46"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Plus badge on person 2 */}
      <circle cx="116" cy="30" r="11" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.5" />
      <line x1="116" y1="24" x2="116" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="110" y1="30" x2="122" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
