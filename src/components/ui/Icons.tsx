/**
 * Custom icon components – drop-in replacements for lucide-react.
 * All icons accept: size (default 24), className, color, style.
 * Stroke-based, 2px stroke-width, round caps/joins to match lucide style.
 */

import type { CSSProperties } from 'react';

interface IconProps {
  size?: number;
  className?: string;
  color?: string;
  style?: CSSProperties;
}

const base = (size: number, className?: string, color?: string, style?: CSSProperties) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: color ?? 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
  style,
  'aria-hidden': true,
});

export function ArrowLeft({ size = 24, className, color, style }: IconProps) {
  return (
    <svg {...base(size, className, color, style)}>
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}

export function X({ size = 24, className, color, style }: IconProps) {
  return (
    <svg {...base(size, className, color, style)}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function AlertTriangle({ size = 24, className, color, style }: IconProps) {
  return (
    <svg {...base(size, className, color, style)}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function MapPin({ size = 24, className, color, style }: IconProps) {
  return (
    <svg {...base(size, className, color, style)}>
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function Locate({ size = 24, className, color, style }: IconProps) {
  return (
    <svg {...base(size, className, color, style)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <path d="M12 5a7 7 0 100 14A7 7 0 0012 5z" />
    </svg>
  );
}

export function Plus({ size = 24, className, color, style }: IconProps) {
  return (
    <svg {...base(size, className, color, style)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function Camera({ size = 24, className, color, style }: IconProps) {
  return (
    <svg {...base(size, className, color, style)}>
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export function AlertCircle({ size = 24, className, color, style }: IconProps) {
  return (
    <svg {...base(size, className, color, style)}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export function ChevronLeft({ size = 24, className, color, style }: IconProps) {
  return (
    <svg {...base(size, className, color, style)}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function ChevronRight({ size = 24, className, color, style }: IconProps) {
  return (
    <svg {...base(size, className, color, style)}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function ChevronDown({ size = 24, className, color, style }: IconProps) {
  return (
    <svg {...base(size, className, color, style)}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function ChevronUp({ size = 24, className, color, style }: IconProps) {
  return (
    <svg {...base(size, className, color, style)}>
      <path d="M18 15l-6-6-6 6" />
    </svg>
  );
}

export function Check({ size = 24, className, color, style }: IconProps) {
  return (
    <svg {...base(size, className, color, style)}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function CheckCircle({ size = 24, className, color, style }: IconProps) {
  return (
    <svg {...base(size, className, color, style)}>
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <path d="M22 4L12 14.01l-3-3" />
    </svg>
  );
}

export function Gamepad2({ size = 24, className, color, style }: IconProps) {
  return (
    <svg {...base(size, className, color, style)}>
      <path d="M6 12h4M8 10v4" />
      <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="17" cy="13" r="1" fill="currentColor" stroke="none" />
      <rect x="2" y="6" width="20" height="12" rx="4" />
    </svg>
  );
}

export function Shuffle({ size = 24, className, color, style }: IconProps) {
  return (
    <svg {...base(size, className, color, style)}>
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" />
      <line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  );
}

export function Swords({ size = 24, className, color, style }: IconProps) {
  return (
    <svg {...base(size, className, color, style)}>
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" y1="19" x2="19" y2="13" />
      <line x1="16" y1="16" x2="20" y2="20" />
      <line x1="19" y1="21" x2="21" y2="19" />
      <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
      <line x1="5" y1="14" x2="9" y2="18" />
      <line x1="7" y1="17" x2="3" y2="21" />
      <line x1="9" y1="19" x2="11" y2="21" />
    </svg>
  );
}
