interface SvgProps {
  size?: number;
  className?: string;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24' as const,
  fill: 'none' as const,
  stroke: 'currentColor' as const,
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function SignalIcon({ size = 18, className }: SvgProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4.93 19.07a10 10 0 1 1 14.14 0" />
      <path d="M7.76 16.24a6 6 0 1 1 8.49 0" />
      <path d="M10.59 13.41a2 2 0 1 1 2.83 0" />
      <line x1="12" y1="22" x2="12" y2="13.5" />
    </svg>
  );
}

export function LayersIcon({ size = 18, className }: SvgProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

export function CpuIcon({ size = 18, className }: SvgProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 1v3m6-3v3M9 20v3m6-3v3M20 9h3m-3 5h3M1 9h3m-3 5h3" />
    </svg>
  );
}

export function DatabaseIcon({ size = 18, className }: SvgProps) {
  return (
    <svg {...base(size)} className={className}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12" />
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

export function StopSquareIcon({ size = 16, className }: SvgProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <rect x="8" y="8" width="8" height="8" />
    </svg>
  );
}

export function HourglassIcon({ size = 16, className }: SvgProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M5 22h14" />
      <path d="M5 2h14" />
      <path d="M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22" />
      <path d="M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2" />
    </svg>
  );
}

export function AlertTriangleIcon({ size = 16, className }: SvgProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function PlayIcon({ size = 16, className }: SvgProps) {
  return (
    <svg {...base(size)} className={className}>
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

export function SkipForwardIcon({ size = 16, className }: SvgProps) {
  return (
    <svg {...base(size)} className={className}>
      <polygon points="13,19 22,12 13,5" />
      <polygon points="2,19 11,12 2,5" />
    </svg>
  );
}

export function PowerIcon({ size = 16, className }: SvgProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  );
}

export function RefreshIcon({ size = 16, className }: SvgProps) {
  return (
    <svg {...base(size)} className={className}>
      <polyline points="23,4 23,11 16,11" />
      <polyline points="1,20 1,13 8,13" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 11M1 13l4.64 5.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

export function SunIcon({ size = 16, className }: SvgProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

export function MoonIcon({ size = 16, className }: SvgProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function InfoIcon({ size = 16, className }: SvgProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export function XIcon({ size = 14, className }: SvgProps) {
  return (
    <svg {...base(size)} className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function ClockIcon({ size = 16, className }: SvgProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12,6 12,12 16,14" />
    </svg>
  );
}

export function ActivityIcon({ size = 16, className }: SvgProps) {
  return (
    <svg {...base(size)} className={className}>
      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
    </svg>
  );
}

export function ShieldIcon({ size = 16, className }: SvgProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function BoltIcon({ size = 16, className }: SvgProps) {
  return (
    <svg {...base(size)} className={className}>
      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" />
    </svg>
  );
}
