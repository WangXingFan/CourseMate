"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

// Partial sums of the square-wave Fourier series, redrawn as harmonics are
// added one by one. Purely decorative; the canvas is aria-hidden.
function FourierCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const style = getComputedStyle(canvas);
      const ink = style.getPropertyValue("--hero-ink").trim() || "#fff";
      const seal = style.getPropertyValue("--hero-seal").trim() || "#e66";
      ctx.clearRect(0, 0, w, h);

      const mid = h / 2;
      const amp = h * 0.3;
      const t = frame / 60;
      // 1 → 15 odd harmonics, holding briefly at the end of each cycle.
      const cycle = (t % 9) / 9;
      const terms = Math.max(1, Math.min(8, Math.floor(cycle * 10) + 1));
      const phase = t * 0.35;

      // Axis
      ctx.strokeStyle = ink;
      ctx.globalAlpha = 0.14;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(w, mid);
      ctx.stroke();

      // Earlier partial sums as faint ghosts
      for (let k = 1; k <= terms; k++) {
        ctx.globalAlpha = k === terms ? 1 : 0.06 + (k / terms) * 0.12;
        ctx.strokeStyle = k === terms ? seal : ink;
        ctx.lineWidth = k === terms ? 1.75 : 1;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 2) {
          const theta = (x / w) * Math.PI * 6 + phase;
          let y = 0;
          for (let n = 0; n < k; n++) {
            const m = 2 * n + 1;
            y += Math.sin(m * theta) / m;
          }
          const py = mid - y * (4 / Math.PI) * amp;
          if (x === 0) ctx.moveTo(x, py);
          else ctx.lineTo(x, py);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      if (!reduceMotion) {
        frame += 1;
        raf = requestAnimationFrame(draw);
      }
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="h-full w-full [--hero-ink:oklch(0.96_0.01_85)] [--hero-seal:oklch(0.72_0.15_35)]" />;
}

export function LoginHero() {
  const t = useTranslations("login.hero");

  return (
    <section className="relative hidden overflow-hidden bg-[oklch(0.22_0.045_262)] text-[oklch(0.96_0.01_85)] lg:flex lg:flex-col">
      {/* Fine paper grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:48px_48px]"
      />

      <div className="relative flex items-center justify-between px-12 pt-10 text-xs tracking-[0.08em] text-[oklch(0.96_0.01_85/0.6)]">
        <span>{t("eyebrow")}</span>
        <span className="font-mono tabular-nums">f(t) = Σ b&#8345; sin(nω&#8320;t)</span>
      </div>

      <div className="relative mt-auto px-12">
        <h1 className="max-w-[14ch] font-display text-5xl leading-[1.08] font-normal tracking-[-0.015em] xl:text-[4.25rem] xl:leading-[1.04]">
          {t("headline")}
          <em className="block text-[oklch(0.78_0.13_40)] not-italic">{t("headlineAccent")}</em>
        </h1>
        <p className="mt-6 max-w-md text-base leading-7 text-[oklch(0.96_0.01_85/0.72)]">{t("lede")}</p>
      </div>

      <div className="relative mt-10 h-44 xl:h-56">
        <FourierCanvas />
      </div>

      <dl className="relative grid grid-cols-3 border-t border-[oklch(0.96_0.01_85/0.12)] px-12 py-7">
        {(["courses", "classrooms", "assistant"] as const).map((key) => (
          <div key={key} className="pr-6">
            <dt className="text-xs tracking-[0.06em] text-[oklch(0.96_0.01_85/0.55)]">{t(`pillars.${key}.label`)}</dt>
            <dd className="mt-1.5 text-sm leading-6 text-[oklch(0.96_0.01_85/0.88)]">{t(`pillars.${key}.value`)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
