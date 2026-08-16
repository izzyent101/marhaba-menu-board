import { useEffect, useState } from 'react';

export interface FontMetrics {
  /** cap height per 1px of font-size */
  capRatio: number;
  /** digit height per 1px of font-size */
  digitRatio: number;
}

const cache = new Map<string, FontMetrics>();

function ink(ctx: CanvasRenderingContext2D, sample: string, probe: number) {
  const m = ctx.measureText(sample);
  const ascent = m.actualBoundingBoxAscent;
  const descent = m.actualBoundingBoxDescent;
  if (!Number.isFinite(ascent) || ascent <= 0) return null;
  return (ascent + Math.max(0, descent)) / probe;
}

function measure(fontFamily: string, fontWeight: number): FontMetrics {
  const key = `${fontWeight}|${fontFamily}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const ctx = document.createElement('canvas').getContext('2d');
  let capRatio = 0.7;
  let digitRatio = 0.66;

  if (ctx) {
    const probe = 200;
    ctx.font = `${fontWeight} ${probe}px ${fontFamily}`;
    capRatio = ink(ctx, 'H', probe) ?? capRatio;
    digitRatio = ink(ctx, '0', probe) ?? digitRatio;
  }

  const metrics = { capRatio, digitRatio };
  cache.set(key, metrics);
  return metrics;
}

/**
 * Measures the installed font so caps and digits are scaled to the exact
 * heights the sign was drawn at, whatever font the machine actually has.
 */
export function useFontMetrics(fontFamily: string, fontWeight = 400): FontMetrics {
  const [metrics, setMetrics] = useState<FontMetrics>(() => measure(fontFamily, fontWeight));

  useEffect(() => {
    let cancelled = false;
    const apply = () => {
      if (cancelled) return;
      cache.delete(`${fontWeight}|${fontFamily}`);
      setMetrics(measure(fontFamily, fontWeight));
    };
    apply();
    if (document.fonts?.ready) {
      document.fonts.ready.then(apply).catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [fontFamily, fontWeight]);

  return metrics;
}

/** Non-hook variant for measuring a second face inside a render effect. */
export function measureFont(fontFamily: string, fontWeight = 400): FontMetrics {
  return measure(fontFamily, fontWeight);
}
