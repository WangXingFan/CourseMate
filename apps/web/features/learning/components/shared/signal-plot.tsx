"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/shared/hooks/use-mobile";

export type PlotPoint = readonly [number, number];

export type PlotSeries = {
  id: string;
  label?: string;
  points: readonly PlotPoint[];
  color?: string;
  dashed?: boolean;
  width?: number;
  fill?: boolean;
};

export type PlotMarker = {
  x: number;
  y: number;
  color?: string;
  label?: string;
};

export type PlotXMarker = {
  x: number;
  color?: string;
  label?: string;
};

// Mobile uses a narrower viewBox so 14-unit labels stay ~13px on screen (DESIGN.md §3.3).
const WIDTH = 720;
const MOBILE_WIDTH = 420;
const HEIGHT = 280;
const PADDING = { left: 56, right: 20, top: 24, bottom: 40 };
const TICK_FONT = 14;
const LABEL_FONT = 14;

export function SignalPlot({
  xDomain,
  yDomain,
  series,
  markers = [],
  verticalMarkers = [],
  xTicks,
  yTicks,
  xLabel,
  yLabel,
  height = HEIGHT,
  className,
  legend = true,
}: {
  xDomain: readonly [number, number];
  yDomain: readonly [number, number];
  series: readonly PlotSeries[];
  markers?: readonly PlotMarker[];
  verticalMarkers?: readonly PlotXMarker[];
  xTicks?: readonly number[];
  yTicks?: readonly number[];
  xLabel?: string;
  yLabel?: string;
  height?: number;
  className?: string;
  legend?: boolean;
}) {
  const mobile = useIsMobile();
  const width = mobile ? MOBILE_WIDTH : WIDTH;
  const [xMin, xMax] = xDomain;
  const [yMin, yMax] = yDomain;
  const innerWidth = width - PADDING.left - PADDING.right;
  const innerHeight = height - PADDING.top - PADDING.bottom;

  const xScale = React.useCallback(
    (value: number) => PADDING.left + ((value - xMin) / (xMax - xMin)) * innerWidth,
    [innerWidth, xMax, xMin],
  );
  const yScale = React.useCallback(
    (value: number) => PADDING.top + (1 - (value - yMin) / (yMax - yMin)) * innerHeight,
    [innerHeight, yMax, yMin],
  );

  const resolvedXTicks = React.useMemo(() => (xTicks ? (mobile ? thinTicks(xTicks) : xTicks) : buildTicks(xMin, xMax, mobile ? 5 : 7)), [mobile, xMin, xMax, xTicks]);
  const resolvedYTicks = React.useMemo(() => yTicks ?? buildTicks(yMin, yMax, 5), [yMax, yMin, yTicks]);
  const zeroY = yMin <= 0 && yMax >= 0 ? yScale(0) : null;
  const zeroX = xMin <= 0 && xMax >= 0 ? xScale(0) : null;

  return (
    <div className={cn("space-y-2", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={xLabel && yLabel ? `${yLabel} / ${xLabel}` : undefined}
        className="h-auto w-full overflow-visible"
      >
        {resolvedYTicks.map((tick) => (
          <line
            key={`gy-${tick}`}
            x1={PADDING.left}
            x2={width - PADDING.right}
            y1={yScale(tick)}
            y2={yScale(tick)}
            stroke="var(--border)"
            strokeOpacity={0.7}
            strokeDasharray="2 4"
            strokeWidth={1}
          />
        ))}
        {resolvedXTicks.map((tick) => (
          <line
            key={`gx-${tick}`}
            x1={xScale(tick)}
            x2={xScale(tick)}
            y1={PADDING.top}
            y2={height - PADDING.bottom}
            stroke="var(--border)"
            strokeOpacity={0.7}
            strokeDasharray="2 4"
            strokeWidth={1}
          />
        ))}

        {/* Plot frame: baseline and left spine, like a printed figure */}
        <line x1={PADDING.left} x2={width - PADDING.right} y1={height - PADDING.bottom} y2={height - PADDING.bottom} stroke="var(--foreground)" strokeOpacity={0.35} strokeWidth={1} />
        <line x1={PADDING.left} x2={PADDING.left} y1={PADDING.top} y2={height - PADDING.bottom} stroke="var(--foreground)" strokeOpacity={0.35} strokeWidth={1} />

        {zeroY !== null ? (
          <line
            x1={PADDING.left}
            x2={width - PADDING.right}
            y1={zeroY}
            y2={zeroY}
            stroke="var(--foreground)"
            strokeOpacity={0.45}
            strokeWidth={1.2}
          />
        ) : null}
        {zeroX !== null ? (
          <line
            x1={zeroX}
            x2={zeroX}
            y1={PADDING.top}
            y2={height - PADDING.bottom}
            stroke="var(--foreground)"
            strokeOpacity={0.45}
            strokeWidth={1.2}
          />
        ) : null}

        {verticalMarkers.map((marker) => (
          <g key={`vm-${marker.x}-${marker.label ?? ""}`}>
            <line
              x1={xScale(marker.x)}
              x2={xScale(marker.x)}
              y1={PADDING.top}
              y2={height - PADDING.bottom}
              stroke={marker.color ?? "var(--chart-2)"}
              strokeDasharray="4 4"
              strokeOpacity={0.8}
              strokeWidth={1.2}
            />
            {marker.label ? (
              <text
                x={xScale(marker.x) + 4}
                y={PADDING.top + 14}
                fontSize={LABEL_FONT}
                fill={marker.color ?? "var(--chart-2)"}
              >
                {marker.label}
              </text>
            ) : null}
          </g>
        ))}

        {series.map((item) => {
          const path = buildPath(item.points, xScale, yScale);
          const area = item.fill
            ? buildAreaPath(item.points, xScale, yScale, yScale(Math.max(yMin, Math.min(0, yMax))))
            : "";
          const color = item.color ?? "var(--chart-1)";
          return (
            <g key={item.id}>
              {item.fill && area ? <path d={area} fill={color} fillOpacity={0.12} stroke="none" /> : null}
              <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={item.width ?? 2.25}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={item.dashed ? "6 5" : undefined}
              />
            </g>
          );
        })}

        {markers.map((marker) => (
          <g key={`mk-${marker.x}-${marker.y}-${marker.label ?? ""}`}>
            <circle
              cx={xScale(marker.x)}
              cy={yScale(marker.y)}
              r={4.5}
              fill={marker.color ?? "var(--chart-1)"}
              stroke="var(--background)"
              strokeWidth={1.5}
            />
            {marker.label ? (
              <text
                x={xScale(marker.x) + 7}
                y={yScale(marker.y) - 8}
                fontSize={LABEL_FONT}
                fill={marker.color ?? "var(--chart-1)"}
              >
                {marker.label}
              </text>
            ) : null}
          </g>
        ))}

        {resolvedXTicks.map((tick) => (
          <text
            key={`tx-${tick}`}
            x={xScale(tick)}
            y={height - PADDING.bottom + 20}
            textAnchor="middle"
            fontSize={TICK_FONT}
            fontFamily="var(--font-mono)"
            fill="var(--muted-foreground)"
          >
            {formatTick(tick)}
          </text>
        ))}
        {resolvedYTicks.map((tick) => (
          <text
            key={`ty-${tick}`}
            x={PADDING.left - 9}
            y={yScale(tick) + 5}
            textAnchor="end"
            fontSize={TICK_FONT}
            fontFamily="var(--font-mono)"
            fill="var(--muted-foreground)"
          >
            {formatTick(tick)}
          </text>
        ))}
        {xLabel ? (
          <text
            x={width - PADDING.right}
            y={height - 4}
            textAnchor="end"
            fontSize={LABEL_FONT}
            fontStyle={/[\u3400-\u9fff]/u.test(xLabel) ? "normal" : "italic"}
            fontFamily="var(--font-display)"
            fill="var(--foreground)"
            fillOpacity={0.75}
          >
            {xLabel}
          </text>
        ) : null}
        {yLabel ? (
          <text x={PADDING.left} y={14} fontSize={LABEL_FONT} fontStyle={/[\u3400-\u9fff]/u.test(yLabel) ? "normal" : "italic"} fontFamily="var(--font-display)" fill="var(--foreground)" fillOpacity={0.75}>
            {yLabel}
          </text>
        ) : null}
      </svg>

      {legend && series.some((item) => item.label) ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pl-1 text-sm text-muted-foreground">
          {series.map((item) =>
            item.label ? (
              <span key={`legend-${item.id}`} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-block h-0.5 w-5 rounded-full"
                  style={{
                    background: item.color ?? "var(--chart-1)",
                    opacity: item.dashed ? 0.75 : 1,
                  }}
                />
                {item.label}
              </span>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}

function buildPath(
  points: readonly PlotPoint[],
  xScale: (value: number) => number,
  yScale: (value: number) => number,
): string {
  if (points.length === 0) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${xScale(point[0]).toFixed(2)},${yScale(point[1]).toFixed(2)}`)
    .join(" ");
}

function buildAreaPath(
  points: readonly PlotPoint[],
  xScale: (value: number) => number,
  yScale: (value: number) => number,
  baseline: number,
): string {
  if (points.length === 0) return "";
  const first = points[0];
  const last = points[points.length - 1];
  const line = points
    .map((point) => `L${xScale(point[0]).toFixed(2)},${yScale(point[1]).toFixed(2)}`)
    .join(" ");
  return `M${xScale(first[0]).toFixed(2)},${baseline.toFixed(2)} ${line} L${xScale(last[0]).toFixed(2)},${baseline.toFixed(2)} Z`;
}

// Hand-picked tick lists are tuned for desktop; on mobile keep every other one (zero included when present).
function thinTicks(ticks: readonly number[]): readonly number[] {
  if (ticks.length <= 5) return ticks;
  const offset = Math.max(0, ticks.indexOf(0)) % 2;
  return ticks.filter((_, index) => index % 2 === offset);
}

// Round-number ticks (1·2·5 × 10ⁿ steps) inside the domain, so axes read like a textbook figure.
function buildTicks(min: number, max: number, count: number): number[] {
  if (!(max > min) || count < 2) return [min];
  const rough = (max - min) / (count - 1);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const factor = [1, 2, 2.5, 5, 10].reduce((best, item) => (Math.abs(Math.log(item * magnitude / rough)) < Math.abs(Math.log(best * magnitude / rough)) ? item : best));
  const step = factor * magnitude;
  const first = Math.ceil(min / step - 1e-9);
  const last = Math.floor(max / step + 1e-9);
  // toPrecision strips float noise such as 0.30000000000000004.
  return Array.from({ length: last - first + 1 }, (_, index) => Number(((first + index) * step).toPrecision(12)));
}

function formatTick(value: number): string {
  if (Math.abs(value) < 1e-9) return "0";
  return String(Math.round(value * 1000) / 1000);
}
