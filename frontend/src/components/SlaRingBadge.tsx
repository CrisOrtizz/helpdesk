import { useReducedMotion } from 'framer-motion';

interface Props {
  createdAt: string;
  slaResolutionDueAt: string | null;
  slaVencido: boolean;
  size?: 'sm' | 'md';
}

const R = 14;
const SW = 3;
const C = 2 * Math.PI * R; // ≈ 87.96

export default function SlaRingBadge({ createdAt, slaResolutionDueAt, slaVencido, size = 'sm' }: Props) {
  const prefersReduced = useReducedMotion();
  const dim = size === 'sm' ? 36 : 44;
  const cx = dim / 2;

  if (!slaResolutionDueAt) {
    return (
      <span className="mono text-xs" style={{ color: 'var(--gray-neutral)' }}>—</span>
    );
  }

  const totalMs = new Date(slaResolutionDueAt).getTime() - new Date(createdAt).getTime();
  const elapsedMs = Date.now() - new Date(createdAt).getTime();
  const progress = Math.max(0, Math.min(1, 1 - elapsedMs / totalMs));

  const diffMs = new Date(slaResolutionDueAt).getTime() - Date.now();
  const diffH = Math.floor(Math.abs(diffMs) / 3_600_000);
  const diffD = Math.floor(diffH / 24);
  const label = slaVencido
    ? `+${diffD > 0 ? `${diffD}d` : `${diffH}h`}`
    : diffD > 0
    ? `${diffD}d ${diffH % 24}h`
    : `${diffH}h`;

  const color = slaVencido
    ? 'var(--orange)'
    : diffMs < 2 * 3_600_000
    ? 'var(--orange)'
    : 'var(--green-muted)';

  const trackColor = 'rgba(0,18,43,0.08)';
  const dashOffset = C * (1 - progress);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full glass${slaVencido && !prefersReduced ? ' sla-expired' : ''}`}
      style={{ minWidth: 0 }}
      title={slaVencido ? 'SLA vencido' : `Vence en ${label}`}
    >
      {/* SVG ring */}
      <svg
        width={dim * 0.6}
        height={dim * 0.6}
        viewBox={`0 0 ${dim} ${dim}`}
        style={{ flexShrink: 0 }}
      >
        {/* Track */}
        <circle
          cx={cx} cy={cx} r={R}
          fill="none"
          stroke={trackColor}
          strokeWidth={SW}
        />
        {/* Progress */}
        <circle
          cx={cx} cy={cx} r={R}
          fill="none"
          stroke={color}
          strokeWidth={SW}
          strokeDasharray={C}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
        />
      </svg>
      <span className="mono text-xs font-medium" style={{ color }}>
        {label}
      </span>
    </span>
  );
}
