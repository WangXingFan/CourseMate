"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type ComplexPoint = {
  re: number;
  im: number;
  label?: string;
};

export type RocRegion = {
  kind: "right" | "left";
  boundary: number;
  label?: string;
};

const WIDTH = 640;
const HEIGHT = 380;
const PADDING = { left: 52, right: 18, top: 22, bottom: 40 };

export function PoleZeroPlot({
  poles,
  zeros = [],
  roc,
  xDomain = [-6, 6],
  yDomain = [-5, 5],
  height = HEIGHT,
  className,
}: {
  poles: readonly ComplexPoint[];
  zeros?: readonly ComplexPoint[];
  roc: RocRegion;
  xDomain?: readonly [number, number];
  yDomain?: readonly [number, number];
  height?: number;
  className?: string;
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

  const xTicks = buildTicks(xMin, xMax);
  const yTicks = buildTicks(yMin, yMax);
  const rocLeft = roc.kind === "right" ? xScale(roc.boundary) : PADDING.left;
  const rocRight = roc.kind === "right" ? WIDTH - PADDING.right : xScale(roc.boundary);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      role="img"
      aria-label="s-plane pole-zero plot"
      className={cn("h-auto w-full overflow-visible", className)}
    >
      <rect
        x={rocLeft}
        y={PADDING.top}
        width={Math.max(0, rocRight - rocLeft)}
        height={innerHeight}
        fill="var(--chart-1)"
        fillOpacity={0.08}
      />
      <line
        x1={xScale(roc.boundary)}
        x2={xScale(roc.boundary)}
        y1={PADDING.top}
        y2={height - PADDING.bottom}
        stroke="var(--chart-1)"
        strokeDasharray="5 4"
        strokeWidth={1.4}
      />
      {roc.label ? (
        <text
          x={roc.kind === "right" ? WIDTH - PADDING.right - 6 : PADDING.left + 6}
          y={PADDING.top + 16}
          textAnchor={roc.kind === "right" ? "end" : "start"}
          fontSize={14}
          fill="var(--chart-1)"
        >
          {roc.label}
        </text>
      ) : null}

      {yTicks.map((tick) => (
        <line
          key={`gy-${tick}`}
          x1={PADDING.left}
          x2={WIDTH - PADDING.right}
          y1={yScale(tick)}
          y2={yScale(tick)}
          stroke="var(--border)"
          strokeOpacity={0.45}
          strokeWidth={1}
        />
      ))}
      {xTicks.map((tick) => (
        <line
          key={`gx-${tick}`}
          x1={xScale(tick)}
          x2={xScale(tick)}
          y1={PADDING.top}
          y2={height - PADDING.bottom}
          stroke="var(--border)"
          strokeOpacity={0.45}
          strokeWidth={1}
        />
      ))}

      <line
        x1={PADDING.left}
        x2={WIDTH - PADDING.right}
        y1={yScale(0)}
        y2={yScale(0)}
        stroke="var(--border)"
        strokeWidth={1.3}
      />
      <line
        x1={xScale(0)}
        x2={xScale(0)}
        y1={PADDING.top}
        y2={height - PADDING.bottom}
        stroke="var(--border)"
        strokeWidth={1.3}
      />

      {zeros.map((zero) => (
        <g key={`zero-${zero.re}-${zero.im}`}>
          <circle
            cx={xScale(zero.re)}
            cy={yScale(zero.im)}
            r={5}
            fill="var(--background)"
            stroke="var(--chart-2)"
            strokeWidth={1.8}
          />
          {zero.label ? (
            <text x={xScale(zero.re) + 8} y={yScale(zero.im) - 7} fontSize={14} fill="var(--chart-2)">
              {zero.label}
            </text>
          ) : null}
        </g>
      ))}

      {poles.map((pole) => (
        <g key={`pole-${pole.re}-${pole.im}`}>
          <line
            x1={xScale(pole.re) - 5}
            y1={yScale(pole.im) - 5}
            x2={xScale(pole.re) + 5}
            y2={yScale(pole.im) + 5}
            stroke="var(--chart-4)"
            strokeWidth={2}
          />
          <line
            x1={xScale(pole.re) - 5}
            y1={yScale(pole.im) + 5}
            x2={xScale(pole.re) + 5}
            y2={yScale(pole.im) - 5}
            stroke="var(--chart-4)"
            strokeWidth={2}
          />
          {pole.label ? (
            <text x={xScale(pole.re) + 8} y={yScale(pole.im) - 7} fontSize={14} fill="var(--chart-4)">
              {pole.label}
            </text>
          ) : null}
        </g>
      ))}

      {xTicks.map((tick) => (
        <text
          key={`tx-${tick}`}
          x={xScale(tick)}
          y={height - PADDING.bottom + 20}
          textAnchor="middle"
          fontSize={14}
          fontFamily="var(--font-mono)"
          fill="var(--muted-foreground)"
        >
          {formatTick(tick)}
        </text>
      ))}
      {yTicks.map((tick) => (
        <text
          key={`ty-${tick}`}
          x={PADDING.left - 9}
          y={yScale(tick) + 5}
          textAnchor="end"
          fontSize={14}
          fontFamily="var(--font-mono)"
          fill="var(--muted-foreground)"
        >
          {formatTick(tick)}
        </text>
      ))}
      <text x={WIDTH - PADDING.right} y={height - 4} textAnchor="end" fontSize={14} fontStyle="italic" fontFamily="var(--font-display)" fill="var(--muted-foreground)">
        Re(s)
      </text>
      <text x={PADDING.left} y={15} fontSize={14} fontStyle="italic" fontFamily="var(--font-display)" fill="var(--muted-foreground)">
        Im(jω)
      </text>
    </svg>
  );
}

function buildTicks(min: number, max: number): number[] {
  const ticks: number[] = [];
  const start = Math.ceil(min);
  const end = Math.floor(max);
  const step = end - start > 10 ? 2 : 1;
  for (let value = start; value <= end; value += step) ticks.push(value);
  return ticks;
}

function formatTick(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
