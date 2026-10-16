export type AmbienceMode = 'auto' | 'dawn' | 'day' | 'sunset' | 'night' | 'original';
export interface Atmosphere {
  brightness: number;
  saturation: number;
  night: number;
  warmth: number;
  daylight: number;
}
const night: Atmosphere = { brightness: 0.42, saturation: 0.65, night: 1, warmth: 0, daylight: 0 };
const dawn: Atmosphere = { brightness: 0.88, saturation: 0.9, night: 0.18, warmth: 0.65, daylight: 0.2 };
const day: Atmosphere = { brightness: 1.05, saturation: 1.08, night: 0, warmth: 0, daylight: 1 };
const sunset: Atmosphere = { brightness: 0.8, saturation: 1.12, night: 0.1, warmth: 1, daylight: 0 };
const stops = [
  { hour: 0, scene: night }, { hour: 5, scene: night }, { hour: 6.5, scene: dawn },
  { hour: 9, scene: day }, { hour: 16, scene: day }, { hour: 18, scene: sunset },
  { hour: 20.5, scene: night }, { hour: 24, scene: night }
];
const restaurantClock = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});
export function restaurantHour(now: Date): number {
  const parts = restaurantClock.formatToParts(now);
  const part = (type: string) => Number(parts.find(p => p.type === type)?.value || 0);
  return part('hour') + part('minute') / 60 + part('second') / 3600;
}
export function atmosphereAtHour(hour: number): Atmosphere {
  const h = ((hour % 24) + 24) % 24;
  const index = stops.findIndex(stop => stop.hour > h);
  const a = stops[index - 1], b = stops[index];
  const progress = (h - a.hour) / (b.hour - a.hour);
  const t = progress * progress * (3 - 2 * progress);
  return Object.fromEntries(Object.keys(a.scene).map(key => {
    const k = key as keyof Atmosphere;
    return [key, a.scene[k] + (b.scene[k] - a.scene[k]) * t];
  })) as unknown as Atmosphere;
}
export function getAtmosphere(mode: AmbienceMode, now = new Date()): Atmosphere {
  if (mode === 'auto') return atmosphereAtHour(restaurantHour(now));
  return { dawn, day, sunset, night, original: { ...day, brightness: 1, saturation: 1, daylight: 0 } }[mode];
}
export function nightInk(color: string, amount: number): string {
  // Lift only the original charcoal ink; retain any custom colors from the editor.
  if (color.toLowerCase() !== '#2c2c2c') return color;
  const t = Math.max(0, Math.min(1, (amount - 0.25) / 0.5));
  return `rgb(${[244, 239, 225].map(c => Math.round(44 + (c - 44) * t)).join(',')})`;
}
