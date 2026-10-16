import SunCalc from 'suncalc';
import { AmbienceMode } from './ambience';

export interface SolarScene {
  altitude: number;
  azimuth: number;
  moonAltitude: number;
  moonAzimuth: number;
  moonPhase: number;
  night: number;
}
const radians = Math.PI / 180;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
export function solarScene(mode: AmbienceMode, now = new Date()): SolarScene {
  const sun = SunCalc.getPosition(now, 44.9778, -93.265);
  const moon = SunCalc.getMoonPosition(now, 44.9778, -93.265);
  let altitude = sun.altitude, azimuth = sun.azimuth;
  let moonAltitude = moon.altitude, moonAzimuth = moon.azimuth;
  let moonPhase = SunCalc.getMoonIllumination(now).fraction;
  if (mode !== 'auto') {
    const preset = {
      dawn: [2, -75], day: [48, -18], sunset: [1, 75], night: [-24, 125], original: [48, -18]
    }[mode];
    altitude = preset[0] * radians; azimuth = preset[1] * radians;
    moonAltitude = 36 * radians; moonAzimuth = -25 * radians; moonPhase = 0.85;
  }
  const t = clamp((altitude + 0.13) / 0.29);
  const night = 1 - t * t * (3 - 2 * t);
  return { altitude, azimuth, moonAltitude, moonAzimuth, moonPhase, night };
}
