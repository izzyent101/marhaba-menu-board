import { SolarScene } from './solar';

type RGB=[number,number,number];
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(a:number,b:number,v:number)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)};
const blend=(a:RGB,b:RGB,t:number):RGB=>a.map((value,index)=>value+(b[index]-value)*t) as RGB;
const css=(rgb:RGB,alpha?:number)=>alpha===undefined?`rgb(${rgb.map(Math.round).join(',')})`:`rgba(${rgb.map(Math.round).join(',')},${alpha})`;

/** One continuous art direction for the glass header and the cloud material. */
export function sceneAppearance(scene:SolarScene) {
  const night=1-smooth(-.17,-.015,scene.altitude);
  const golden=Math.exp(-Math.pow((scene.altitude-.025)/.14,2))*(1-night);
  const dusk=scene.azimuth>0;
  const tone=(day:RGB,twilight:RGB,moonlit:RGB)=>blend(blend(day,twilight,golden),moonlit,night);
  const left=tone([17,29,38],dusk?[38,29,27]:[35,30,31],[10,17,30]);
  const middle=tone([22,35,45],[40,31,30],[15,22,36]);
  const right=tone([19,31,41],dusk?[47,33,27]:[30,31,38],[17,23,38]);
  return {
    night,golden,
    barLeft:css(left,.72),barMiddle:css(middle,.61),barRight:css(right,.68),
    rim:css(tone([220,240,252],[255,212,165],[182,199,226]),.20),
    accent:css(tone([199,211,219],[225,208,186],[192,203,220])),
    reflection:css(tone([226,244,255],[255,207,151],[173,190,220]),.045),
    sunX:Math.max(0,Math.min(100,50+(scene.azimuth*(1-night)+scene.moonAzimuth*night)/3.2*100)),
    cloudShadow:tone([.13,.20,.29],[.24,.15,.23],[.085,.13,.26]),
    cloudMid:tone([.60,.66,.73],[.75,.55,.48],[.39,.49,.72]),
    cloudLight:tone([.99,1,1],[1,.92,.79],[.83,.91,1])
  };
}
