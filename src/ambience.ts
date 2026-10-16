export type AmbienceMode = 'auto' | 'dawn' | 'day' | 'sunset' | 'night' | 'original';

export function nightInk(color: string, amount: number): string {
  // Lift only the original charcoal ink; retain custom colors from the editor.
  if (color.toLowerCase() !== '#2c2c2c') return color;
  // Avoid low-contrast gray ink during twilight.
  const t = amount >= 0.18 ? 1 : 0;
  return `rgb(${[244, 239, 225].map(c => Math.round(44 + (c - 44) * t)).join(',')})`;
}
