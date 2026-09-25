import { useLayoutEffect, useMemo, useRef, useState } from 'react';

export interface ChartSeries {
  id: string;
  label: string;
  color: string;
  kind: 'line' | 'dots';
  points: { x: number; y: number }[];
}

interface Props {
  series: ChartSeries[];
  height?: number;
  formatY: (v: number) => string;
  formatX: (x: number) => string;
  /** Series whose last value is labelled at the right edge. */
  endLabel?: string;
  ariaLabel: string;
}

const M = { top: 12, right: 14, bottom: 24, left: 40 };

function niceStep(range: number, target: number): number {
  const raw = range / Math.max(1, target);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return step * mag;
}

export function LineChart({ series, height = 200, formatY, formatX, endLabel, ariaLabel }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(200, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const all = series.flatMap((s) => s.points);
  const geo = useMemo(() => {
    if (all.length === 0) return null;
    let xMin = Math.min(...all.map((p) => p.x));
    let xMax = Math.max(...all.map((p) => p.x));
    if (xMin === xMax) {
      xMin -= 86400000;
      xMax += 86400000;
    }
    let yMin = Math.min(...all.map((p) => p.y));
    let yMax = Math.max(...all.map((p) => p.y));
    const span = Math.max(yMax - yMin, Math.abs(yMax) * 0.02, 1);
    const step = niceStep(span * 1.2, 4);
    yMin = Math.floor((yMin - span * 0.1) / step) * step;
    yMax = Math.ceil((yMax + span * 0.1) / step) * step;
    const ticks: number[] = [];
    for (let v = yMin; v <= yMax + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
    const iw = width - M.left - M.right;
    const ih = height - M.top - M.bottom;
    const sx = (x: number) => M.left + ((x - xMin) / (xMax - xMin)) * iw;
    const sy = (y: number) => M.top + (1 - (y - yMin) / (yMax - yMin)) * ih;
    const xs = [...new Set(all.map((p) => p.x))].sort((a, b) => a - b);
    return { xMin, xMax, ticks, sx, sy, xs, iw, ih };
  }, [all, width, height]);

  if (!geo) return null;
  const { ticks, sx, sy, xs, xMin, xMax } = geo;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left + M.left;
    let best = 0;
    let bestD = Infinity;
    xs.forEach((x, i) => {
      const d = Math.abs(sx(x) - px);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setHover(best);
  };

  const hx = hover != null ? xs[hover] : null;
  const rows =
    hx != null
      ? series
          .map((s) => ({ s, p: s.points.find((p) => p.x === hx) }))
          .filter((r): r is { s: ChartSeries; p: { x: number; y: number } } => !!r.p)
      : [];
  const end = endLabel ? series.find((s) => s.id === endLabel)?.points.at(-1) : undefined;
  const tipLeft = hx != null ? Math.min(Math.max(sx(hx) - 70, 0), width - 140) : 0;

  return (
    <div className="chart" ref={wrap}>
      {series.length > 1 && (
        <div className="chart-legend">
          {series.map((s) => (
            <span key={s.id}>
              <i className={s.kind === 'line' ? 'key-line' : 'key-dot'} style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <svg width={width} height={height} role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={width - M.right} y1={sy(t)} y2={sy(t)} className="grid" />
            <text x={M.left - 8} y={sy(t)} className="tick" textAnchor="end" dominantBaseline="central">
              {formatY(t)}
            </text>
          </g>
        ))}
        <text x={M.left} y={height - 6} className="tick">
          {formatX(xMin)}
        </text>
        <text x={width - M.right} y={height - 6} className="tick" textAnchor="end">
          {formatX(xMax)}
        </text>
        {hx != null && <line x1={sx(hx)} x2={sx(hx)} y1={M.top} y2={height - M.bottom} className="crosshair" />}
        {series.map((s) =>
          s.kind === 'line' ? (
            <polyline
              key={s.id}
              points={s.points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : (
            <g key={s.id}>
              {s.points.map((p) => (
                <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={4} fill={s.color} className="dot" />
              ))}
            </g>
          ),
        )}
        {series
          .filter((s) => s.kind === 'line')
          .map((s) => {
            const last = s.points.at(-1);
            return last ? <circle key={s.id} cx={sx(last.x)} cy={sy(last.y)} r={4} fill={s.color} className="dot" /> : null;
          })}
        {rows.map(({ s, p }) => (
          <circle key={s.id} cx={sx(p.x)} cy={sy(p.y)} r={5} fill={s.color} className="dot" />
        ))}
        {end && hover == null && (
          <text x={Math.min(sx(end.x), width - M.right)} y={sy(end.y) - 12} className="end-label" textAnchor="end">
            {formatY(end.y)}
          </text>
        )}
        <rect
          x={M.left}
          y={0}
          width={Math.max(0, width - M.left - M.right)}
          height={height}
          fill="transparent"
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
          style={{ touchAction: 'pan-y' }}
        />
      </svg>
      {hx != null && rows.length > 0 && (
        <div className="chart-tip" style={{ left: tipLeft }}>
          <div className="tip-date">{formatX(hx)}</div>
          {rows.map(({ s, p }) => (
            <div key={s.id} className="tip-row">
              <i className="key-line" style={{ background: s.color }} />
              <strong>{formatY(p.y)}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
