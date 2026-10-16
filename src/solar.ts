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

const smooth = (a:number,b:number,x:number) => { const t=clamp((x-a)/(b-a));return t*t*(3-2*t) };
export function celestialDirection(altitude:number,azimuth:number): [number,number,number] {
  return [Math.sin(azimuth)*Math.cos(altitude),Math.sin(altitude),Math.cos(azimuth)*Math.cos(altitude)];
}
/** Direct-beam transmission through the same spherical atmosphere as the sky pass.
 * RGB values are relative daylight transmittance, not a color-temperature preset. */
export function sunTransmittance(altitude:number): [number,number,number] {
  if(altitude<=-.012)return [0,0,0];
  const radius=6360.005,top=6420,sine=Math.sin(Math.max(0,altitude));
  const distance=-radius*sine+Math.sqrt(radius*radius*sine*sine+top*top-radius*radius);
  let air=0,aerosol=0,ozone=0;
  for(let i=0;i<24;i++) {
    const a=i/24,b=(i+1)/24,t=(a*a+b*b)*.5*distance,ds=(b*b-a*a)*distance;
    const h=Math.max(0,Math.sqrt(radius*radius+t*t+2*radius*t*sine)-6360);
    air+=Math.exp(-h/8)*ds;aerosol+=Math.exp(-h/1.2)*ds;
    ozone+=Math.max(0,1-Math.abs(h-25)/15)*ds;
  }
  return [.005802,.013558,.033100].map((beta,index)=>
    Math.exp(-(beta*air+.001500*1.1*aerosol+[.000650,.001881,.000085][index]*ozone))) as [number,number,number];
}
export function sceneLighting(scene:SolarScene) {
  const transmission=sunTransmittance(scene.altitude),peak=Math.max(...transmission,.00001);
  return {
    sun:celestialDirection(scene.altitude,scene.azimuth),
    moon:celestialDirection(scene.moonAltitude,scene.moonAzimuth),
    sunColor:transmission.map(value=>value/peak) as [number,number,number],
    direct:smooth(-.012,.025,scene.altitude)*Math.pow(Math.max(.001,Math.sin(scene.altitude)),.32)*Math.pow(peak,.20),
    ambient:smooth(-.16,.23,scene.altitude)*(.72+.28*smooth(.03,.28,scene.altitude)),
    moonLight:.18*scene.moonPhase*smooth(-.01,.16,scene.moonAltitude)*(1-smooth(-.12,.06,scene.altitude))
  };
}

/** A review clock spans one local solar day, including seasonal/DST offsets.
 * It never changes the system clock, saved settings, or the normal live clock. */
export function solarPreviewWindow(now=new Date()) {
  const noon=SunCalc.getTimes(now,44.9778,-93.265).solarNoon.getTime();
  return {start:noon-9*3600000,end:noon+10*3600000};
}
