import type { LabMeasurement, LabParameters, LabPlot, LabScene, LabSeries, VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";

export type LabRoute = { page: "home" | "help" | "course" | "task" | "records"; id: string };
export function parseLabRoute(hash: string, initialRoute = "home"): LabRoute {
  const [page, id] = (hash.replace(/^#/, "") || initialRoute).split("/");
  if (page === "task" && /^L[123]-[1-4]$/.test(id ?? "")) return { page, id };
  if (page === "course" && /^L[123]$/.test(id ?? "")) return { page, id };
  if (page === "records") return { page, id: /^L[123]$/.test(id ?? "") ? id : "L1" };
  return { page: page === "help" ? "help" : "home", id: "L1" };
}

export function labPresets(id: string): { label: string; params: LabParameters }[] {
  if (id === "L1-1") return [
    { label: "平移", params: { mode: "transform", A: 1, a: 1, shift: 1 } },
    { label: "反转", params: { mode: "transform", A: 1, a: -1, shift: 0 } },
    { label: "压缩", params: { mode: "transform", A: 1, a: 2, shift: 0 } },
    { label: "组合", params: { mode: "transform", A: 2, a: 2, shift: 1 } },
    ...[0.5, 0.2, 0.1].map((delta) => ({ label: `Δ=${delta}`, params: { mode: "impulse", delta } })),
  ];
  if (id === "L1-3") return [0, 0.5, 2].map((initial) => ({ label: `y₀=${initial}`, params: { initial } }));
  if (id === "L1-4") return [-0.5, 0.5, 1, 1.5, 2.5].map((time) => ({ label: `t=${time}`, params: { time } }));
  if (id === "L2-2") return [0.5, 1, 2].map((T) => ({ label: `T=${T} s`, params: { T } }));
  if (id === "L2-3") return [100, 200, 500].map((fc) => ({ label: `${fc} Hz`, params: { fc } }));
  if (id === "L3-4") return [0.5, 1, 2, 3].map((T) => ({ label: `T=${T} s`, params: { T } }));
  return [];
}

export function labParameterText(engine: VirtualLabEngine, id: string, params: LabParameters) {
  return engine.tasks[id].params.filter((p) => p.key !== "speed").map((p) => {
    const value = params[p.key];
    return `${p.label}=${p.type === "select" ? p.options?.find(([key]) => key === value)?.[1] ?? value : `${value}${p.unit ? ` ${p.unit}` : ""}`}`;
  }).join("；");
}

export function labMeasurementText(value: LabMeasurement): string {
  if (value === null) return "不适用";
  if (typeof value === "number") return value !== 0 && Math.abs(value) < 1e-6 ? value.toExponential(3) : Number(value.toFixed(6)).toString();
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(labMeasurementText).join(" | ");
  return Object.entries(value).map(([key, item]) => `${key}=${labMeasurementText(item)}`).join(", ");
}

export function plotGroups(series: LabSeries, breakJump?: number): [number, number][][] {
  const groups: [number, number][][] = [];
  let current: [number, number][] = [];
  for (const [x, y] of series.points) {
    if (y === null || !Number.isFinite(y)) { if (current.length) groups.push(current); current = []; continue; }
    const previous = current.at(-1);
    if (previous && breakJump && Math.abs(y - previous[1]) > breakJump) { groups.push(current); current = []; }
    current.push([x, y]);
  }
  if (current.length) groups.push(current);
  return groups;
}

export function plotGeometry(plot: LabPlot) {
  const values = plot.series.flatMap((s) => s.points.flatMap(([, y]) => y !== null && Number.isFinite(y) ? [y] : []));
  const minimum = Math.min(0, ...values), maximum = Math.max(0, ...values);
  const padding = Math.max((maximum - minimum) * 0.13, 0.15);
  const low = minimum - padding, high = maximum + padding;
  return { height: 305 + Math.max(0, Math.ceil(plot.series.length / 3) - 1) * 19,
    x: (value: number) => 62 + (value - plot.range[0]) / (plot.range[1] - plot.range[0]) * 815,
    y: (value: number) => 46 + (high - value) / (high - low) * 195, low, high };
}

export function downloadLabBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function exportLabPNG(engine: VirtualLabEngine, taskID: string, scene: LabScene, cursor: number | null, cursorChart: string) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  const parameters = labParameterText(engine, taskID, engine.records.data.tasks[taskID].params);
  const lines = parameters.match(/.{1,60}/gu) ?? [];
  const height = 130 + lines.length * 22 + scene.plots.length * 350;
  svg.setAttribute("width", "1200"); svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 1200 ${height}`);
  const background = document.createElementNS(ns, "rect");
  background.setAttribute("width", "1200"); background.setAttribute("height", String(height)); background.setAttribute("fill", "#fffefa"); svg.append(background);
  const text = (value: string, y: number, size = 14) => {
    const element = document.createElementNS(ns, "text");
    element.textContent = value;
    for (const [key, item] of Object.entries({ x: "40", y: String(y), fill: "#29382f", "font-size": String(size), "font-family": "Microsoft YaHei, sans-serif" })) element.setAttribute(key, item);
    svg.append(element);
  };
  text(`${taskID} ${engine.tasks[taskID].title}`, 40, 24);
  text(`CS3017 · v${engine.version} · ${new Date().toLocaleString()}`, 68);
  lines.forEach((line, index) => { text(line, 95 + index * 22, 13); });
  scene.plots.forEach((plot, index) => {
    const element = new DOMParser().parseFromString(engine.plot.svg(plot, taskID, plot.marker ?? (plot.key === cursorChart ? cursor : null), true), "image/svg+xml").documentElement;
    element.setAttribute("x", "25"); element.setAttribute("y", String(120 + lines.length * 22 + index * 350)); element.setAttribute("width", "1150"); element.setAttribute("height", "330");
    svg.append(document.importNode(element, true));
  });
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("图形生成失败，请重试。")); image.src = url; });
    const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器无法生成 PNG。");
    context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("浏览器无法生成 PNG。");
    downloadLabBlob(blob, engine.records.filename(".png", taskID));
  } finally { URL.revokeObjectURL(url); }
}
