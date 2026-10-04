import { memo } from "react";
import { valueAt, type Drink, type Point } from "./engine";
import { clock } from "./time";
interface Props {
  points: Point[];
  drinks: Drink[];
  threshold: number;
  conservative: number;
  below: number;
  now: number;
}
export default memo(function Chart({
  points,
  drinks,
  threshold,
  conservative,
  below,
  now,
}: Props) {
  const left = 44,
    right = 716,
    top = 24,
    bottom = 194;
  const start = points[0].time,
    end = points.at(-1)!.time;
  const max = Math.max(0.08, ...points.map((p) => p.bac)) * 1.15;
  const x = (t: number) =>
    left + ((t - start) / (end - start)) * (right - left);
  const y = (bac: number) => bottom - (bac / max) * (bottom - top);
  const path = points
    .map(
      (p, i) =>
        `${i ? "L" : "M"}${x(p.time).toFixed(1)},${y(p.bac).toFixed(1)}`,
    )
    .join(" ");
  const marker = (t: number) => Math.min(right, Math.max(left, x(t)));
  return (
    <div
      className="chart-wrap"
      tabIndex={0}
      role="region"
      aria-label="BAC chart, scroll horizontally on a small screen"
    >
      <svg
        viewBox="0 0 760 250"
        role="img"
        aria-label={`Estimated BAC timeline. Selected threshold ${threshold.toFixed(2)} percent. ${drinks.length} drink entries. The curve is an estimate, not a measurement.`}
      >
        <defs>
          <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dce9b7" stopOpacity=".18" />
            <stop offset="1" stopColor="#dce9b7" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((n) => (
          <g key={n}>
            <line
              x1={left}
              x2={right}
              y1={y(max * n)}
              y2={y(max * n)}
              stroke="#303a35"
              strokeDasharray="2 6"
            />
            <text x="3" y={y(max * n) + 5} fill="#a4ada8" fontSize="15">
              {(max * n).toFixed(2)}
            </text>
          </g>
        ))}
        {threshold > 0 ? (
          <>
            <line
              x1={left}
              x2={right}
              y1={y(threshold)}
              y2={y(threshold)}
              stroke="#e7b578"
              strokeDasharray="6 5"
            />
            <text
              x={right}
              y={y(threshold) - 8}
              textAnchor="end"
              fill="#e7b578"
              fontSize="15"
            >
              {threshold.toFixed(2)}% threshold
            </text>
          </>
        ) : (
          <text
            x={right}
            y={bottom - 10}
            textAnchor="end"
            fill="#e7b578"
            fontSize="15"
          >
            Zero BAC required
          </text>
        )}
        <path
          d={`${path} L${right},${bottom} L${left},${bottom} Z`}
          fill="url(#fill)"
        />
        <path
          d={path}
          fill="none"
          stroke="#dce9b7"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {drinks.map((d) => (
          <circle key={d.id} cx={x(d.time)} cy={bottom} r="4" fill="#dce9b7">
            <title>
              {clock(d.time)} · {d.standardDrinks.toFixed(1)} standard drinks
            </title>
          </circle>
        ))}
        {now >= start && now <= end ? (
          <>
            <line
              x1={x(now)}
              x2={x(now)}
              y1={top}
              y2={bottom}
              stroke="#bbc5bb"
              strokeDasharray="3 5"
            />
            <text
              x={x(now)}
              y={top - 8}
              textAnchor="middle"
              fontSize="15"
              fill="#e8ece6"
            >
              NOW
            </text>
          </>
        ) : null}
        {threshold > 0 && below <= end ? (
          <circle
            cx={marker(below)}
            cy={y(valueAt(points, below))}
            r="5"
            fill="#e7b578"
          >
            <title>
              Estimated below threshold after absorption: {clock(below)}
            </title>
          </circle>
        ) : null}
        {drinks.length ? (
          <>
            <line
              x1={marker(conservative)}
              x2={marker(conservative)}
              y1={top}
              y2={bottom}
              stroke="#dce9b7"
              strokeDasharray="3 5"
            />
            <circle cx={marker(conservative)} cy={bottom} r="5" fill="#dce9b7">
              <title>Conservative estimate: {clock(conservative)}</title>
            </circle>
          </>
        ) : null}
        {[0, 0.25, 0.5, 0.75, 1].map((n) => (
          <text
            key={n}
            x={left + n * (right - left)}
            y="224"
            textAnchor="middle"
            fontSize="15"
            fill="#a4ada8"
          >
            {clock(start + n * (end - start))}
          </text>
        ))}
      </svg>
    </div>
  );
});
