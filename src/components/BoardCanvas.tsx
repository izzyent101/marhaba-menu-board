import React, { useEffect, useRef } from 'react';
import { BoardConfig, CaseStyle, DESIGN_HEIGHT, DESIGN_WIDTH, TextFinish, formatMoney } from '../config';
import { measureFont, useFontMetrics } from '../useFontMetrics';

interface Props {
  config: BoardConfig;
  scale: number;
}

interface DrawOptions {
  text: string;
  x: number;
  baseline: number;
  capPx: number;
  color: string;
  align: 'left' | 'right' | 'center';
  tracking: number;
  finish: TextFinish;
  /** small caps, or leave the text cased as typed */
  caps: CaseStyle;
  /** the line's lane on the original sign - text is condensed rather than exceed it */
  maxWidth?: number;
  /** paint a luminous halo around the letters so they pop off a busy background */
  glow?: boolean;
}

interface Segment {
  text: string;
  size: number;
  width: number;
}

/**
 * Draws the whole board - item names, prices, hours, notices - onto one canvas
 * the size of the original sign.
 *
 * Two things make it match the printed sign rather than merely resemble it:
 *
 * 1. SMALL CAPS. The sign was set in Copperplate and Bodoni Small Caps, where
 *    lowercase letters are drawn as capitals at about 72% height. That is why
 *    the hours column is narrow enough to sit in the far-left margin. We
 *    reproduce it: capitals at full height, lowercase raised to capitals at
 *    smallCapScale. Without this, all-caps type runs nearly three times wider
 *    and the left column bloats toward the middle of the screen.
 *
 * 2. LANES. Every line carries the width it occupied in the PSD. If the chosen
 *    font still runs wide, the line is condensed into that lane instead of
 *    pushing into its neighbour.
 */
export default function BoardCanvas({ config, scale }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const metrics = useFontMetrics(config.fontFamily, config.fontWeight);
  const labelMetrics = useFontMetrics(config.labelFontFamily, config.labelFontWeight);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const renderScale = Math.max(scale, 0.1) * dpr;

    canvas.width = Math.round(DESIGN_WIDTH * renderScale);
    canvas.height = Math.round(DESIGN_HEIGHT * renderScale);
    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    ctx.clearRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    /**
     * Two faces, as on the printed sign: a caps face for numbers, hours and
     * notices (Copperplate there, Cinzel here - clean lining figures), and a
     * calligraphic face with true lowercase for item names. Any normal-case
     * text renders in the label face; small-caps text renders in the caps face.
     */
    const CAPS = {
      family: config.fontFamily,
      weight: config.fontWeight || 400,
      capRatio: metrics.capRatio || 0.7,
      digitRatio: metrics.digitRatio || 0.66
    };
    const labelMeasured = measureFont(config.labelFontFamily, config.labelFontWeight);
    const LABEL = {
      family: config.labelFontFamily,
      weight: config.labelFontWeight || 400,
      capRatio: labelMetrics.capRatio || labelMeasured.capRatio || 0.7,
      digitRatio: labelMetrics.digitRatio || labelMeasured.digitRatio || 0.66
    };
    type Face = typeof CAPS;
    const smallScale = config.smallCapScale || 0.72;

    const setFont = (face: Face, sizePx: number, tracking: number) => {
      ctx.font = `${face.weight} ${sizePx}px ${face.family}`;
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${(
        tracking * sizePx
      ).toFixed(2)}px`;
    };

    /** Split a line into full-size and small-cap runs and measure each. */
    const layout = (face: Face, text: string, capPx: number, tracking: number, caps: CaseStyle): Segment[] => {
      const useSmall = config.smallCaps && caps === 'small';
      const fullSize = capPx / face.capRatio;
      const smallSize = fullSize * smallScale;
      const segments: Segment[] = [];

      let buffer = '';
      let bufferIsSmall = false;

      const flush = () => {
        if (!buffer) return;
        const size = bufferIsSmall ? smallSize : fullSize;
        setFont(face, size, tracking);
        segments.push({ text: buffer, size, width: ctx.measureText(buffer).width });
        buffer = '';
      };

      for (const char of text) {
        // lowercase letters become small capitals; everything else stays full size
        const isSmall = useSmall && char !== char.toUpperCase() && char === char.toLowerCase();
        if (buffer && isSmall !== bufferIsSmall) flush();
        bufferIsSmall = isSmall;
        buffer += isSmall ? char.toUpperCase() : char;
      }
      flush();
      return segments;
    };

    const totalWidth = (segments: Segment[]) => segments.reduce((sum, s) => sum + s.width, 0);

    const draw = ({ text, x, baseline, capPx, color, align, tracking, finish, caps, maxWidth, glow }: DrawOptions) => {
      if (!text) return;

      // normal-case text takes the calligraphic label face, small caps the caps face
      const face = caps === 'normal' ? LABEL : CAPS;
      const segments = layout(face, text, capPx, tracking, caps);
      const natural = totalWidth(segments);
      if (natural <= 0) return;

      // condense into the lane if the installed font runs wide
      const squeeze = maxWidth && natural > maxWidth ? maxWidth / natural : 1;
      const drawn = natural * squeeze;
      const startX = align === 'right' ? x - drawn : align === 'center' ? x - drawn / 2 : x;

      /** paint every run once, with whatever style is currently set */
      const stroke = (offsetY = 0, mode: 'fill' | 'stroke' = 'fill') => {
        ctx.save();
        ctx.translate(startX, baseline + offsetY);
        if (squeeze !== 1) ctx.scale(squeeze, 1);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        let cursor = 0;
        for (const segment of segments) {
          setFont(face, segment.size, tracking);
          if (mode === 'fill') ctx.fillText(segment.text, cursor, 0);
          else ctx.strokeText(segment.text, cursor, 0);
          cursor += segment.width;
        }
        ctx.restore();
      };

      const size = capPx / face.capRatio;

      // Glow halo: several soft dark aura passes painted around the letters.
      // On a bright, busy background (the sand) a dark aura is what actually
      // makes light text pop - it softly deepens only the area right around
      // each letter, so the video still shows through and there is no panel.
      if (glow) {
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        for (const blur of [size * 0.22, size * 0.5, size * 0.9, size * 1.3]) {
          ctx.shadowBlur = blur;
          stroke();
        }
        ctx.restore();
      } else if (config.halo) {
        // Optional dark halo: a single soft shadow pass, for light ink over video.
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = Math.max(3, size * 0.1);
        ctx.shadowOffsetY = Math.max(1, size * 0.02);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        stroke();
        ctx.restore();
      }

      if (finish === 'engraved') {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        stroke(Math.max(1, size * 0.016));
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        stroke(-Math.max(1, size * 0.012));
        ctx.restore();

        ctx.fillStyle = color;
        stroke();
        return;
      }

      if (finish === 'chrome') {
        const top = baseline - capPx;
        const gradient = ctx.createLinearGradient(0, top, 0, baseline + capPx * 0.1);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.45, '#eef3f9');
        gradient.addColorStop(0.58, '#c9d4e0');
        gradient.addColorStop(0.72, '#f3f8fd');
        gradient.addColorStop(1, '#ffffff');

        // one soft shadow, then the metal - no outline
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = Math.max(2, size * 0.06);
        ctx.shadowOffsetY = Math.max(1, size * 0.03);
        ctx.fillStyle = gradient;
        stroke();
        ctx.restore();

        ctx.fillStyle = gradient;
        stroke();
        return;
      }

      // plain: the original sign's treatment - clean fill over one soft shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = Math.max(2, size * 0.07);
      ctx.shadowOffsetY = Math.max(1, size * 0.035);
      ctx.fillStyle = color;
      stroke();
      ctx.restore();
    };

    const measuredWidth = (text: string, capPx: number, tracking: number, caps: CaseStyle, maxWidth?: number) => {
      const face = caps === 'normal' ? LABEL : CAPS;
      const natural = totalWidth(layout(face, text, capPx, tracking, caps));
      return maxWidth ? Math.min(natural, maxWidth) : natural;
    };

    /* ---------- item names, amounts, "per Pound" ---------- */

    for (const group of config.groups) {
      const dx = group.offsetX;
      const dy = group.offsetY;

      for (const row of group.rows) {
        const y = row.baseline + dy;

        draw({
          text: row.label,
          x: group.labelX + dx,
          baseline: y,
          capPx: group.labelCapPx,
          color: group.labelColor,
          align: 'left',
          tracking: group.labelTracking,
          finish: config.textFinish,
          caps: group.labelCaps,
          maxWidth: group.labelMaxWidth
        });

        if (config.leaders) {
          const labelEnd =
            group.labelX +
            dx +
            measuredWidth(row.label, group.labelCapPx, group.labelTracking, group.labelCaps, group.labelMaxWidth);
          const amountCapForWidth = group.digitPx * (CAPS.capRatio / CAPS.digitRatio);
          const amountStart =
            group.rightX + dx - measuredWidth(formatMoney(row.value), amountCapForWidth, group.tracking, 'small');
          const from = labelEnd + 24;
          const to = amountStart - 24;
          if (to - from > 40) {
            ctx.save();
            ctx.strokeStyle = 'rgba(244, 247, 251, 0.26)';
            ctx.lineWidth = Math.max(1, group.digitPx * 0.045);
            ctx.setLineDash([2, 14]);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(from, y - group.digitPx * 0.22);
            ctx.lineTo(to, y - group.digitPx * 0.22);
            ctx.stroke();
            ctx.restore();
          }
        }

        // amounts are measured on digits, not caps, so numerals match the sign
        const amountCap = group.digitPx * (CAPS.capRatio / CAPS.digitRatio);
        draw({
          text: formatMoney(row.value),
          x: group.rightX + dx,
          baseline: y,
          capPx: amountCap,
          color: group.color,
          align: 'right',
          tracking: group.tracking,
          finish: config.priceFinish,
          caps: 'small',
          maxWidth: Math.max(40, group.rightX - group.minLeftX)
        });

        if (group.suffix.trim() && group.suffixRightX > 0) {
          const alignLeft = group.suffixAlign !== 'right';
          draw({
            text: group.suffix,
            x: (alignLeft ? group.suffixLeftX : group.suffixRightX) + dx,
            baseline: y,
            capPx: group.suffixCapPx || group.digitPx,
            color: group.suffixColor,
            align: alignLeft ? 'left' : 'right',
            tracking: group.suffixTracking,
            finish: config.textFinish,
            caps: 'small',
            maxWidth: Math.max(40, group.suffixRightX - group.suffixLeftX)
          });
        }
      }
    }

    /* ---------- hours, notice, annotation ---------- */

    for (const block of config.blocks) {
      for (const line of block.lines) {
        draw({
          text: line.text,
          x: line.x + block.offsetX,
          baseline: line.baseline + block.offsetY,
          capPx: line.capPx,
          color: line.color,
          align: line.align,
          tracking: line.tracking,
          finish: line.finish || config.textFinish,
          caps: line.caps || 'small',
          maxWidth: line.maxWidth,
          // the payment notice glows so it pops off the sand without a panel
          glow: block.highlight
        });
      }
    }
  }, [config, scale, metrics.capRatio, metrics.digitRatio, labelMetrics.capRatio, labelMetrics.digitRatio]);

  return (
    <canvas
      ref={canvasRef}
      className="board-canvas"
      style={{ width: DESIGN_WIDTH, height: DESIGN_HEIGHT }}
    />
  );
}
