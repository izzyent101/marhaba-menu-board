import { useEffect, useState } from 'react';

/**
 * Weather comes from Open-Meteo: free, no API key, no account, and it allows
 * browser requests directly. The desktop app blocks all other network traffic
 * (see electron/main.cjs), so these two hosts are the only ones it can reach.
 */
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

export type Condition =
  | 'clear'
  | 'partly'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'thunder';

export interface WeatherPlace {
  name: string;
  latitude: number;
  longitude: number;
  admin?: string;
  country?: string;
}

export interface WeatherReading {
  temperature: number;
  high: number;
  low: number;
  condition: Condition;
  description: string;
  isDay: boolean;
  fetchedAt: number;
}

export interface WeatherConfig {
  enabled: boolean;
  place: WeatherPlace;
  units: 'fahrenheit' | 'celsius';
  showRange: boolean;
}

export const DEFAULT_WEATHER: WeatherConfig = {
  enabled: true,
  place: { name: 'Minneapolis', admin: 'Minnesota', country: 'United States', latitude: 44.9778, longitude: -93.265 },
  units: 'fahrenheit',
  showRange: true
};

/** WMO weather codes → the icon we draw and a short label. */
const CODES: Record<number, { condition: Condition; description: string }> = {
  0: { condition: 'clear', description: 'Clear' },
  1: { condition: 'clear', description: 'Mostly Clear' },
  2: { condition: 'partly', description: 'Partly Cloudy' },
  3: { condition: 'cloudy', description: 'Cloudy' },
  45: { condition: 'fog', description: 'Fog' },
  48: { condition: 'fog', description: 'Icy Fog' },
  51: { condition: 'drizzle', description: 'Light Drizzle' },
  53: { condition: 'drizzle', description: 'Drizzle' },
  55: { condition: 'drizzle', description: 'Heavy Drizzle' },
  56: { condition: 'drizzle', description: 'Freezing Drizzle' },
  57: { condition: 'drizzle', description: 'Freezing Drizzle' },
  61: { condition: 'rain', description: 'Light Rain' },
  63: { condition: 'rain', description: 'Rain' },
  65: { condition: 'rain', description: 'Heavy Rain' },
  66: { condition: 'rain', description: 'Freezing Rain' },
  67: { condition: 'rain', description: 'Freezing Rain' },
  71: { condition: 'snow', description: 'Light Snow' },
  73: { condition: 'snow', description: 'Snow' },
  75: { condition: 'snow', description: 'Heavy Snow' },
  77: { condition: 'snow', description: 'Snow Grains' },
  80: { condition: 'rain', description: 'Showers' },
  81: { condition: 'rain', description: 'Showers' },
  82: { condition: 'rain', description: 'Heavy Showers' },
  85: { condition: 'snow', description: 'Snow Showers' },
  86: { condition: 'snow', description: 'Snow Showers' },
  95: { condition: 'thunder', description: 'Thunderstorm' },
  96: { condition: 'thunder', description: 'Thunderstorm' },
  99: { condition: 'thunder', description: 'Thunderstorm' }
};

const describe = (code: number) => CODES[code] || { condition: 'cloudy' as Condition, description: '—' };

export async function searchPlaces(query: string): Promise<WeatherPlace[]> {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Search failed');
  const data = await response.json();
  return (data.results || []).map((r: Record<string, unknown>) => ({
    name: String(r.name),
    admin: r.admin1 ? String(r.admin1) : undefined,
    country: r.country ? String(r.country) : undefined,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude)
  }));
}

export async function fetchWeather(place: WeatherPlace, units: WeatherConfig['units']): Promise<WeatherReading> {
  const url =
    `${FORECAST_URL}?latitude=${place.latitude}&longitude=${place.longitude}` +
    '&current=temperature_2m,is_day,weather_code' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min' +
    `&temperature_unit=${units}&timezone=auto&forecast_days=1`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Weather request failed');
  const data = await response.json();

  const code = Number(data.current?.weather_code ?? data.daily?.weather_code?.[0] ?? 3);
  const { condition, description } = describe(code);

  return {
    temperature: Math.round(Number(data.current?.temperature_2m ?? 0)),
    high: Math.round(Number(data.daily?.temperature_2m_max?.[0] ?? 0)),
    low: Math.round(Number(data.daily?.temperature_2m_min?.[0] ?? 0)),
    condition,
    description,
    isDay: Number(data.current?.is_day ?? 1) === 1,
    fetchedAt: Date.now()
  };
}

const CACHE_KEY = 'marhaba_weather_cache';
const REFRESH_MS = 15 * 60 * 1000;

/**
 * Keeps a current reading, refreshing every 15 minutes. The last good reading
 * is cached, so a dropped connection leaves the board showing the last known
 * conditions rather than an empty gap.
 */
export function useWeather(config: WeatherConfig): WeatherReading | null {
  const [reading, setReading] = useState<WeatherReading | null>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? (JSON.parse(raw) as WeatherReading) : null;
    } catch {
      return null;
    }
  });

  const { enabled, units } = config;
  const { latitude, longitude } = config.place;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const load = async () => {
      try {
        const next = await fetchWeather({ ...config.place, latitude, longitude }, units);
        if (cancelled) return;
        setReading(next);
        localStorage.setItem(CACHE_KEY, JSON.stringify(next));
      } catch {
        /* keep whatever we had - the board should never show a hole */
      }
    };

    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, latitude, longitude, units]);

  return enabled ? reading : null;
}
