import React, { useEffect, useRef } from 'react';
import { Atmosphere } from '../ambience';

interface Props { atmosphere: Atmosphere; fit: 'cover' | 'contain'; width: number; height: number; motion: boolean }

/** Extra motion is drawn in video coordinates, so reflections never drift onto the beach. */
export default function BeachAtmosphere({ atmosphere, fit, width, height, motion }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const atmosphereRef = useRef(atmosphere);
  atmosphereRef.current = atmosphere;
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, last = -Infinity;
    // Bounded resolution and 30fps keep this suitable for an always-on shop PC.
    const scale = Math.min(1, 1600 / width);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const videoScale = (fit === 'cover' ? Math.max : Math.min)(width / 1920, height / 1080);
    const xOffset = (width - 1920 * videoScale) / 2;
    const yOffset = (height - 1080 * videoScale) / 2;
    const draw = (stamp: number) => {
      frame = 0;
      if (document.hidden) return;
      const animate = motion && !reduced.matches;
      if (stamp - last < (animate ? 1000 / 30 : 1000)) { frame = requestAnimationFrame(draw); return; }
      last = stamp;
      const t = animate ? stamp / 1000 : 0;
      const a = atmosphereRef.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale * videoScale, 0, 0, scale * videoScale, xOffset * scale, yOffset * scale);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, 1920, 1080); ctx.clip();
      // Atmospheric depth without obscuring the original palms and shoreline.
      const sky = ctx.createLinearGradient(0, 0, 0, 820);
      sky.addColorStop(0, `rgba(10,31,78,${a.night * 0.55})`);
      sky.addColorStop(0.72, `rgba(234,119,84,${a.warmth * 0.25})`);
      sky.addColorStop(1, 'rgba(255,191,100,0)');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, 1920, 820);
      const glow = ctx.createRadialGradient(1660, 760, 10, 1660, 760, 790);
      glow.addColorStop(0, `rgba(255,178,87,${a.warmth * 0.38})`);
      glow.addColorStop(1, 'rgba(255,178,87,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, 1920, 1080);
      // Quiet independent twinkling, concentrated in the existing star field.
      for (let i = 0; i < 60; i++) {
        const x = 30 + ((i * 137.508) % 810), y = 105 + ((i * 79.31) % 450);
        const alpha = a.night * (0.22 + 0.25 * (0.5 + Math.sin(t * 0.55 + i * 2.7) * 0.5));
        ctx.fillStyle = `rgba(221,236,255,${alpha})`;
        ctx.beginPath(); ctx.arc(x, y, i % 7 === 0 ? 1.7 : 0.9, 0, Math.PI * 2); ctx.fill();
      }
      // Water-only reflection path: narrower at the horizon, broken by small swells.
      ctx.beginPath();
      ctx.moveTo(620, 805); ctx.lineTo(1920, 805); ctx.lineTo(1920, 1080);
      ctx.lineTo(815, 1080); ctx.bezierCurveTo(620, 980, 215, 870, 620, 805); ctx.clip();
      const tint = a.night > 0.5 ? '176,211,255' : a.warmth > 0.35 ? '255,213,150' : '220,251,255';
      for (let i = 0; i < 100; i++) {
        const p = i / 100;
        const y = 807 + p * p * 285;
        const center = 1630 + Math.sin(i * 73.1) * p * 160 + Math.sin(t * 0.21 + i * 0.8) * (8 + p * 45);
        const span = 12 + p * (70 + (i * 73 % 130));
        const pulse = 0.5 + 0.5 * Math.sin(i * 2.4 + t * (0.7 + p * 0.6));
        ctx.strokeStyle = `rgba(${tint},${(0.015 + pulse * 0.085) * (0.7 + a.warmth * 0.5 + a.night * 0.4)})`;
        ctx.lineWidth = 0.7 + p * 2.1;
        ctx.beginPath();
        ctx.moveTo(center - span * pulse, y);
        ctx.bezierCurveTo(center - span * 0.3, y - 2, center + span * 0.3, y + 2, center + span * pulse, y);
        ctx.stroke();
      }
      ctx.restore();
      // Even with motion off, refresh the time-based lighting at low frequency.
      frame = requestAnimationFrame(draw);
    };
    const resume = () => { if (!frame && !document.hidden) frame = requestAnimationFrame(draw); };
    document.addEventListener('visibilitychange', resume);
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', resume); };
  }, [fit, width, height, motion]);
  return <canvas className="beach-atmosphere" ref={canvasRef} aria-hidden="true" />;
}
