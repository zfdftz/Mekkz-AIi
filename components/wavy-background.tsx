export function WavyBackground({
  children,
  enabled = true
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) {
  if (!enabled) {
    return <>{children}</>;
  }
  return (
    <div className="wavy-page ai-canvas relative min-h-[100dvh] overflow-hidden">
      <div className="ai-canvas__base" aria-hidden />
      <div className="ai-canvas__aurora" aria-hidden />
      <div className="ai-canvas__mesh" aria-hidden />
      <div className="ai-canvas__grid" aria-hidden />
      <div className="ai-canvas__nodes" aria-hidden>
        <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
          <defs>
            <linearGradient id="aiLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--ai-line-a)" stopOpacity="0" />
              <stop offset="50%" stopColor="var(--ai-line-b)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--ai-line-a)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g stroke="url(#aiLineGrad)" strokeWidth="0.6" fill="none" opacity="0.5">
            <path d="M120,80 L280,160 L420,90 L620,200" />
            <path d="M80,320 L240,260 L400,340 L560,280 L720,360" />
            <path d="M200,480 L360,420 L520,500 L680,440" />
            <path d="M280,160 L240,260" />
            <path d="M420,90 L400,340" />
            <path d="M620,200 L560,280" />
          </g>
          <g fill="var(--ai-node)" opacity="0.55">
            <circle cx="120" cy="80" r="2.5" />
            <circle cx="280" cy="160" r="2" />
            <circle cx="420" cy="90" r="2.5" />
            <circle cx="620" cy="200" r="2" />
            <circle cx="240" cy="260" r="2" />
            <circle cx="400" cy="340" r="2.5" />
            <circle cx="560" cy="280" r="2" />
            <circle cx="720" cy="360" r="2" />
          </g>
        </svg>
      </div>
      <div className="wavy-glow wavy-glow-purple ai-orb ai-orb--1" aria-hidden />
      <div className="wavy-glow wavy-glow-blue ai-orb ai-orb--2" aria-hidden />
      <div className="wavy-glow ai-orb ai-orb--3" aria-hidden />
      <div className="ai-canvas__vignette" aria-hidden />
      <div className="relative z-10 min-h-[100dvh]">{children}</div>
    </div>
  );
}
