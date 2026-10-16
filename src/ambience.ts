export type AmbienceMode = 'auto' | 'dawn' | 'day' | 'sunset' | 'night' | 'original';

export function nightInk(color: string, amount: number): string {
  // Lift only the original charcoal ink; retain custom colors from the editor.
  if (color.toLowerCase() !== '#2c2c2c') return color;
  // Follow the dimming sky continuously rather than flashing to a new color.
  const progress = Math.max(0,Math.min(1,(amount-.10)/.17));
  const t = progress*progress*(3-2*progress);
  return `rgb(${[244, 239, 225].map(c => Math.round(44 + (c - 44) * t)).join(',')})`;
}
