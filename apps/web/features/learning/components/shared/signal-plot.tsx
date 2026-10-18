"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

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

const WIDTH = 720;
const HEIGHT = 280;
const PADDING = { left: 48, right: 18, top: 16, bottom: 32 };

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
  const [xMin, xMax] = xDomain;
  const [yMin, yMax] = yDomain;
  const innerWidth = WIDTH - PADDING.left - PADDING.right;
  const innerHeight = height - PADDING.top - PADDING.bottom;

  const xScale = React.useCallback(
    (value: number) => PADDING.left + ((value - xMin) / (xMax - xMin)) * innerWidth,
    [innerWidth, xMax, xMin],
  );
  const yScale = React.useCallback(
    (value: number) => PADDING.top + (1 - (value - yMin) / (yMax - yMin)) * innerHeight,
    [innerHeight, yMax, yMin],
  );

  const resolvedXTicks = React.useMemo(() => xTicks ?? buildTicks(xMin, xMax, 7), [xMin, xMax, xTicks]);
  const resolvedYTicks = React.useMemo(() => yTicks ?? buildTicks(yMin, yMax, 5), [yMax, yMin, yTicks]);
  const zeroY = yMin <= 0 && yMax >= 0 ? yScale(0) : null;
  const zeroX = xMin <= 0 && xMax >= 0 ? xScale(0) : null;

  return (
    <div className={cn("space-y-2", className)}>
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label={xLabel && yLabel ? `${yLabel} / ${xLabel}` : undefined}
        className="h-auto w-full overflow-visible"
      >
        {resolvedYTicks.map((tick) => (
          <line
            key={`gy-${tick}`}
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={yScale(tick)}
            y2={yScale(tick)}
            stroke="var(--border)"
            strokeOpacity={0.55}
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
            strokeOpacity={0.55}
            strokeWidth={1}
          />
        ))}

        {zeroY !== null ? (
          <line
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={zeroY}
            y2={zeroY}
            stroke="var(--border)"
            strokeWidth={1.4}
          />
        ) : null}
        {zeroX !== null ? (
          <line
            x1={zeroX}
            x2={zeroX}
            y1={PADDING.top}
            y2={height - PADDING.bottom}
            stroke="var(--border)"
            strokeWidth={1.4}
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
                y={PADDING.top + 11}
                fontSize={10}
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
              {item.fill && area ? <path d={area} fill={color} fillOpacity={0.16} stroke="none" /> : null}
              <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={item.width ?? 2}
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
              r={3.6}
              fill={marker.color ?? "var(--chart-1)"}
              stroke="var(--background)"
              strokeWidth={1.5}
            />
            {marker.label ? (
              <text
                x={xScale(marker.x) + 7}
                y={yScale(marker.y) - 7}
                fontSize={10}
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
            y={height - PADDING.bottom + 16}
            textAnchor="middle"
            fontSize={10}
            fill="var(--muted-foreground)"
          >
            {formatTick(tick)}
          </text>
        ))}
        {resolvedYTicks.map((tick) => (
          <text
            key={`ty-${tick}`}
            x={PADDING.left - 7}
            y={yScale(tick) + 3}
            textAnchor="end"
            fontSize={10}
            fill="var(--muted-foreground)"
          >
            {formatTick(tick)}
          </text>
        ))}
        {xLabel ? (
          <text
            x={WIDTH - PADDING.right}
            y={height - 4}
            textAnchor="end"
            fontSize={10}
            fill="var(--muted-foreground)"
          >
            {xLabel}
          </text>
        ) : null}
        {yLabel ? (
          <text x={PADDING.left} y={12} fontSize={10} fill="var(--muted-foreground)">
            {yLabel}
          </text>
        ) : null}
      </svg>

      {legend && series.some((item) => item.label) ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-1 text-[11px] text-muted-foreground">
          {series.map((item) =>
            item.label ? (
              <span key={`legend-${item.id}`} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-block h-0.5 w-4 rounded-full"
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

function buildTicks(min: number, max: number, count: number): number[] {
  if (!(max > min) || count < 2) return [min];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, index) => min + step * index);
}

function formatTick(value: number): string {
  if (Math.abs(value) < 1e-9) return "0";
  const rounded = Math.round(value * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}
