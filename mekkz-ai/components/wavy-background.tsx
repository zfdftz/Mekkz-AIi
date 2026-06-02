export function WavyBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="wavy-page relative min-h-screen overflow-hidden">
      <div className="wavy-glow wavy-glow-purple" />
      <div className="wavy-glow wavy-glow-blue" />
      <svg
        className="wavy-svg wavy-svg-1"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          fill="url(#waveGrad1)"
          d="M0,192L48,197.3C96,203,192,213,288,197.3C384,181,480,139,576,128C672,117,768,139,864,154.7C960,171,1056,181,1152,181.3C1248,181,1344,171,1392,165.3L1440,160L1440,320L0,320Z"
        />
        <defs>
          <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(124,58,237,0.42)" />
            <stop offset="50%" stopColor="rgba(109,40,217,0.32)" />
            <stop offset="100%" stopColor="rgba(15,5,32,0.55)" />
          </linearGradient>
        </defs>
      </svg>
      <svg
        className="wavy-svg wavy-svg-2"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          fill="url(#waveGrad2)"
          d="M0,224L60,213.3C120,203,240,181,360,181.3C480,181,600,203,720,218.7C840,235,960,245,1080,234.7C1200,224,1320,192,1380,176L1440,160L1440,320L0,320Z"
        />
        <defs>
          <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(139,92,246,0.28)" />
            <stop offset="100%" stopColor="rgba(91,33,182,0.32)" />
          </linearGradient>
        </defs>
      </svg>
      <svg
        className="wavy-svg wavy-svg-3"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          fill="url(#waveGrad3)"
          d="M0,256L80,245.3C160,235,320,213,480,208C640,203,800,213,960,224C1120,235,1280,245,1360,250.7L1440,256L1440,320L0,320Z"
        />
        <defs>
          <linearGradient id="waveGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(167,139,250,0.22)" />
            <stop offset="100%" stopColor="rgba(46,16,101,0.5)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
