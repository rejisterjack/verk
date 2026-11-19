import type { BurnPoint, ScopeChange, VelocityPoint } from "@/lib/cycle-stats";

type Series = { x: number; y: number }[];

function path(series: Series) {
  return series
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
}

const W = 320;
const H = 120;
const PAD = { l: 28, r: 8, t: 8, b: 18 };

/**
 * Burndown: remaining work per day against the ideal straight line. Future days are not drawn
 * as data. Plain SVG, so it works in server components with no chart library.
 */
export function BurndownChart({
  data,
  unit,
}: {
  data: BurnPoint[];
  unit: "pts" | "issues";
}) {
  if (data.length < 2) {
    return <p className="text-[12px] text-muted">Not enough days to chart.</p>;
  }
  const max = Math.max(
    1,
    ...data.map((p) => Math.max(p.scope, p.ideal, p.remaining)),
  );
  const x = (i: number) =>
    PAD.l + (i / (data.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const real = data.map((p, i) => ({ p, i })).filter(({ p }) => !p.future);
  const ideal: Series = data.map((p, i) => ({ x: x(i), y: y(p.ideal) }));
  const remaining: Series = real.map(({ p, i }) => ({
    x: x(i),
    y: y(p.remaining),
  }));
  const scope: Series = real.map(({ p, i }) => ({ x: x(i), y: y(p.scope) }));
  const last = real[real.length - 1]?.p;

  return (
    <figure>
      <svg
        aria-label={`Burndown in ${unit}`}
        className="h-32 w-full"
        role="img"
        viewBox={`0 0 ${W} ${H}`}
      >
        <title>{`Burndown (${unit}): ${last ? `${last.remaining} remaining` : "no data"}`}</title>
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line
              stroke="currentColor"
              strokeOpacity={0.12}
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(max * t)}
              y2={y(max * t)}
            />
            <text
              fill="currentColor"
              fillOpacity={0.55}
              fontSize={8}
              textAnchor="end"
              x={PAD.l - 4}
              y={y(max * t) + 3}
            >
              {Math.round(max * t)}
            </text>
          </g>
        ))}
        <path
          d={path(ideal)}
          fill="none"
          stroke="currentColor"
          strokeDasharray="3 3"
          strokeOpacity={0.4}
        />
        <path
          d={path(scope)}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.35}
          strokeWidth={1}
        />
        <path
          d={path(remaining)}
          fill="none"
          stroke="var(--color-accent, #6366f1)"
          strokeWidth={2}
        />
        <text
          fill="currentColor"
          fillOpacity={0.55}
          fontSize={8}
          x={PAD.l}
          y={H - 4}
        >
          {data[0]!.day.slice(5)}
        </text>
        <text
          fill="currentColor"
          fillOpacity={0.55}
          fontSize={8}
          textAnchor="end"
          x={W - PAD.r}
          y={H - 4}
        >
          {data[data.length - 1]!.day.slice(5)}
        </text>
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted">
        <span>
          <span className="mr-1 inline-block h-0.5 w-3 bg-accent align-middle" />
          Remaining
        </span>
        <span>
          <span className="mr-1 inline-block h-0.5 w-3 bg-current opacity-40 align-middle" />
          Scope
        </span>
        <span>- - Ideal</span>
        {last ? (
          <span className="ml-auto text-foreground">
            {last.remaining} of {last.scope} {unit} left
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}

/** Planned vs completed per cycle, as paired bars, with the average completed per cycle. */
export function VelocityChart({
  points,
  average,
  unit,
}: {
  points: VelocityPoint[];
  average: number;
  unit: "pts" | "issues";
}) {
  if (!points.length) {
    return <p className="text-[12px] text-muted">No cycles yet.</p>;
  }
  const max = Math.max(1, ...points.flatMap((p) => [p.planned, p.completed]));
  const slot = (W - PAD.l - PAD.r) / points.length;
  const bar = Math.min(18, slot / 2 - 2);
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);

  return (
    <figure>
      <svg
        aria-label={`Velocity in ${unit}`}
        className="h-32 w-full"
        role="img"
        viewBox={`0 0 ${W} ${H}`}
      >
        <title>{`Velocity (${unit}): average ${average} per cycle`}</title>
        {points.map((p, i) => {
          const cx = PAD.l + slot * i + slot / 2;

          return (
            <g key={`${p.name}-${i}`}>
              <rect
                fill="currentColor"
                fillOpacity={0.25}
                height={H - PAD.b - y(p.planned)}
                width={bar}
                x={cx - bar - 1}
                y={y(p.planned)}
              />
              <rect
                fill="var(--color-accent, #6366f1)"
                height={H - PAD.b - y(p.completed)}
                width={bar}
                x={cx + 1}
                y={y(p.completed)}
              />
              <text
                fill="currentColor"
                fillOpacity={0.55}
                fontSize={7}
                textAnchor="middle"
                x={cx}
                y={H - 6}
              >
                {p.name.length > 9 ? `${p.name.slice(0, 8)}…` : p.name}
              </text>
            </g>
          );
        })}
        {average > 0 ? (
          <line
            stroke="currentColor"
            strokeDasharray="3 3"
            strokeOpacity={0.5}
            x1={PAD.l}
            x2={W - PAD.r}
            y1={y(average)}
            y2={y(average)}
          />
        ) : null}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted">
        <span>
          <span className="mr-1 inline-block size-2 bg-current opacity-25" />
          Planned
        </span>
        <span>
          <span className="mr-1 inline-block size-2 bg-accent" />
          Completed
        </span>
        <span className="ml-auto text-foreground">
          Average {average} {unit}/cycle
        </span>
      </figcaption>
    </figure>
  );
}

export function ScopeSummary({ scope }: { scope: ScopeChange }) {
  return (
    <dl className="grid grid-cols-3 gap-2 text-[12px]">
      <div>
        <dt className="text-muted">Added after start</dt>
        <dd className="text-[15px] font-semibold">{scope.added}</dd>
      </div>
      <div>
        <dt className="text-muted">Cancelled</dt>
        <dd className="text-[15px] font-semibold">{scope.removed}</dd>
      </div>
      <div>
        <dt className="text-muted">Scope creep</dt>
        <dd
          className={`text-[15px] font-semibold ${scope.creepPercent > 25 ? "text-danger" : ""}`}
        >
          {scope.creepPercent}%
        </dd>
      </div>
    </dl>
  );
}
