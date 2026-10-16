export const vertexShader = `
attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

export const fragmentShader = `
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uAltitude;
uniform float uAzimuth;
uniform float uMoonAltitude;
uniform float uMoonAzimuth;
uniform float uMoonPhase;
uniform sampler2D uGrove;
uniform float uGroveReady;
const float PI = 3.14159265359;
const float HORIZON = 0.34;
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);
}
float fbm(vec2 p) {
  float v=0.0,a=0.5;
  mat2 turn=mat2(0.8,-0.6,0.6,0.8);
  for(int i=0;i<5;i++){ v+=a*noise(p); p=turn*p*2.03+12.7; a*=0.5; }
  return v;
}
float daylight() { return smoothstep(-0.13,0.16,uAltitude); }
float golden() { return (1.0-smoothstep(0.02,0.38,uAltitude))*smoothstep(-0.16,-0.015,uAltitude); }
vec3 sunDirection() {
  float x=sin(uAzimuth)*0.34;
  return normalize(vec3(x*uResolution.x/uResolution.y, sin(uAltitude)*0.67, 1.0));
}
vec3 moonDirection() {
  return normalize(vec3(sin(uMoonAzimuth)*0.34*uResolution.x/uResolution.y, sin(uMoonAltitude)*0.67,1.0));
}
vec3 sky(vec3 rd, bool detail) {
  float day=daylight(), gold=golden();
  float height=max(rd.y,0.0);
  vec3 zenith=mix(vec3(0.008,0.016,0.047),vec3(0.12,0.40,0.68),day);
  zenith=mix(zenith,vec3(0.14,0.20,0.39),gold*0.65);
  vec3 horizon=mix(vec3(0.055,0.092,0.16),vec3(0.67,0.83,0.89),day);
  horizon=mix(horizon,vec3(1.0,0.48,0.21),gold*0.9);
  vec3 col=mix(horizon,zenith,pow(clamp(height*1.65,0.0,1.0),0.46));
  vec3 sd=sunDirection(), md=moonDirection();
  float sunDot=max(dot(rd,sd),0.0);
  vec3 sunColor=mix(vec3(1.0,0.93,0.72),vec3(1.0,0.40,0.10),gold*0.8);
  col+=sunColor*pow(sunDot,14.0)*0.2*day;
  col+=sunColor*pow(sunDot,120.0)*0.28*day;
  float sunDisc=smoothstep(0.99986,0.99994,sunDot)*smoothstep(-0.025,0.015,uAltitude);
  col=mix(col,sunColor*1.8,sunDisc*(detail?1.0:0.12));
  float moonDot=max(dot(rd,md),0.0);
  float moon=smoothstep(0.99980,0.99988,moonDot)*smoothstep(-0.02,0.03,uMoonAltitude)*(1.0-day);
  col+=vec3(0.35,0.48,0.7)*pow(moonDot,180.0)*(1.0-day)*0.25;
  // Lit portion of the moon, with a shaded limb rather than a glowing white dot.
  vec3 moonRight=normalize(cross(md,vec3(0,1,0)));
  vec3 moonUp=normalize(cross(moonRight,md));
  float mx=dot(rd,moonRight)/0.019, my=dot(rd,moonUp)/0.019;
  float mz=sqrt(max(0.0,1.0-mx*mx-my*my));
  float phaseCos=uMoonPhase*2.0-1.0;
  vec3 moonLight=vec3(sqrt(max(0.0,1.0-phaseCos*phaseCos)),0.0,phaseCos);
  float lit=smoothstep(-0.04,0.08,dot(vec3(mx,my,mz),moonLight));
  col=mix(col,vec3(0.66,0.75,0.87)*mix(0.15,1.0,lit),moon);
  if(detail) {
    // Fixed celestial positions; only their intensity changes with twilight and cloud cover.
    vec2 starP=rd.xy/(rd.z+0.2)*850.0;
    vec2 cell=floor(starP), local=fract(starP)-0.5;
    float star=smoothstep(0.986,1.0,hash(cell))*exp(-dot(local,local)*90.0);
    float twinkle=0.75+0.25*sin(uTime*0.65+hash(cell+4.0)*20.0);
    col+=vec3(0.65,0.76,0.95)*star*twinkle*(1.0-smoothstep(-0.16,-0.04,uAltitude))*smoothstep(0.02,0.18,height);
  }
  // Two cloud decks travel independently across the sky and through reflected water.
  vec2 cp=rd.xz/(height+0.22)*1.7;
  cp+=vec2(uTime*0.009,uTime*0.003);
  float cloudBase=fbm(cp);
  float clouds=smoothstep(0.48,0.73,cloudBase);
  float wisps=smoothstep(0.58,0.83,fbm(cp*1.65+vec2(uTime*0.004,18.0)))*0.28;
  clouds=clamp(clouds+wisps,0.0,0.9)*smoothstep(0.0,0.08,height);
  float edges=smoothstep(0.47,0.56,cloudBase)*(1.0-smoothstep(0.56,0.65,cloudBase));
  vec3 cloudColor=mix(vec3(0.065,0.09,0.15),vec3(0.92,0.95,0.96),day);
  cloudColor=mix(cloudColor,vec3(0.78,0.38,0.24)+edges*vec3(0.25,0.22,0.1),gold*0.8);
  cloudColor*=0.8+cloudBase*0.3;
  col=mix(col,cloudColor,clouds);
  return col;
}
// Height and slope share eight dispersive wave trains; long swells carry short wind chop.
vec3 oceanSurface(vec2 p,float distance) {
  vec2 q=p+vec2(sin(p.y*.17+uTime*.09),sin(p.x*.13-uTime*.07))*.65;
  float height=0.0, frequency=0.42, amplitude=0.25;
  vec2 grad=vec2(0.0), direction=normalize(vec2(.25,1.0));
  mat2 turn=mat2(-.737,-.676,.676,-.737);
  for(int i=0;i<8;i++) {
    float phase=dot(q,direction)*frequency-uTime*sqrt(9.81*frequency)+float(i)*2.37;
    // Suppress ripples smaller than a screen pixel to avoid sparkling noise at the horizon.
    float footprint=distance*distance/(max(uResolution.y,1.0)*2.8);
    float attenuation=exp(-min(80.0,footprint*frequency*frequency*.16));
    float envelope=.8+.2*sin(dot(p,vec2(.08,.11))+float(i)*1.9);
    float a=amplitude*attenuation*envelope;
    // The second harmonic sharpens crests and rounds the troughs.
    height+=a*(sin(phase)+.22*sin(phase*2.0));
    vec2 slope=direction*a*frequency*(cos(phase)+.44*cos(phase*2.0));
    grad+=slope;
    q+=direction*cos(phase)*amplitude*.65;
    direction=turn*direction;frequency*=1.79;amplitude*=.54;
  }
  return vec3(height,grad);
}
void main() {
  vec2 uv=gl_FragCoord.xy/uResolution;
  float aspect=uResolution.x/uResolution.y;
  vec3 rd=normalize(vec3((uv.x-0.5)*aspect,(uv.y-HORIZON)*1.2,1.0));
  float day=daylight(),gold=golden();
  vec3 color;
  if(uv.y>=HORIZON) {
    color=sky(rd,true);
  } else {
    float depth=(HORIZON-uv.y)/HORIZON;
    float distance=2.8/max(-rd.y,0.0001);
    // Intersect the displaced surface, so swells occlude and bend the fine ripples.
    float planeDistance=distance;
    for(int i=0;i<2;i++) {
      float height=oceanSurface(rd.xz*distance,planeDistance).x;
      float displaced=(2.8-height)/max(-rd.y,.0001);
      distance=mix(distance,displaced,.65);
    }
    vec2 p=rd.xz*distance;
    vec3 surface=oceanSurface(p,distance);
    vec3 normal=normalize(vec3(-surface.y,1.0,-surface.z));
    vec3 reflected=reflect(rd,normal);
    reflected.y=abs(reflected.y);
    vec3 reflection=sky(reflected,false);
    float fresnel=0.025+0.975*pow(1.0-max(dot(-rd,normal),0.0),4.0);
    vec3 deep=mix(vec3(0.018,0.055,0.087),vec3(0.025,0.32,0.39),day);
    deep=mix(deep,vec3(0.08,0.16,0.19),gold*0.65);
    float shore=0.16+0.22*pow(depth,1.6);
    float coast=uv.x-shore;
    float shallow=1.0-smoothstep(0.0,0.28,coast);
    vec3 shallows=mix(vec3(0.06,0.10,0.13),vec3(0.25,0.63,0.61),day);
    deep=mix(deep,shallows,shallow*0.7);
    float trough=clamp(.5+surface.x*1.4,0.0,1.0);
    deep*=.78+trough*.28;
    // A little transmitted light makes the thin wave crests turquoise.
    deep+=vec3(.025,.13,.10)*smoothstep(.03,.25,surface.x)*day*(1.0-fresnel);
    color=mix(deep,reflection,fresnel*.86);
    vec3 sd=sunDirection(),md=moonDirection();
    float glitter=.35+.65*noise(p*7.0+vec2(uTime*.19,0));
    float sunSpec=(pow(max(dot(reflected,sd),0.0),260.0)*.3+pow(max(dot(reflected,sd),0.0),1100.0)*.5)*day*glitter;
    float moonSpec=pow(max(dot(reflected,md),0.0),550.0)*glitter*(1.0-day)*smoothstep(0.0,0.1,uMoonAltitude);
    color+=mix(vec3(1.0,0.91,0.65),vec3(1.0,0.47,0.15),gold)*sunSpec*0.85;
    color+=vec3(0.45,0.62,0.88)*moonSpec*0.9;
    // Wave packets refract toward the curved shore; foam trails their breaking crests.
    float coastalNoise=fbm(vec2(depth*13.0,coast*16.0)+vec2(0,uTime*.025));
    float breakerPhase=coast*82.0+depth*11.0+uTime*.95+coastalNoise*3.2;
    float crest=pow(.5+.5*sin(breakerPhase),12.0);
    float trail=pow(.5+.5*sin(breakerPhase-.85),3.0)*.28;
    vec2 foamUV=vec2(coast*210.0+uTime*1.3,depth*175.0);
    float foamNoise=fbm(foamUV);
    float bubbles=smoothstep(.25,.57,foamNoise);
    float breakup=smoothstep(.25,.7,fbm(vec2(depth*25.0,coast*30.0)+vec2(uTime*.055,0)));
    float foam=(crest+trail)*bubbles*(.35+.65*breakup)*(1.0-smoothstep(.015,.16,coast));
    float wash=.009*sin(uTime*.74+depth*8.0)+.005*sin(uTime*1.21+depth*19.0)+.004*(coastalNoise-.5);
    float edge=coast-wash;
    float wet=1.0-smoothstep(-0.055,-0.005,edge);
    float grain=noise(uv*uResolution*0.6)*0.06+fbm(uv*70.0)*0.08;
    vec3 sand=mix(vec3(0.14,0.17,0.21),vec3(0.79,0.68,0.48),day);
    sand=mix(sand,vec3(0.67,0.40,0.22),gold*0.5);
    sand*=0.83+grain;
    sand=mix(sand*0.65+reflection*0.2,sand,wet);
    float edgeFoam=(1.0-smoothstep(0.001,0.008,abs(edge)))*bubbles;
    color=mix(sand,color,smoothstep(-0.004,0.004,edge));
    vec3 foamColor=mix(vec3(0.24,0.32,0.40),vec3(0.91,0.96,0.91),day);
    color=mix(color,foamColor,clamp(foam*.88*smoothstep(0.0,0.012,edge)+edgeFoam*.72,0.0,.9));
    float haze=exp(-depth*45.0);
    color=mix(color,sky(normalize(vec3(rd.x,0.005,rd.z)),false)*0.83,haze*0.7);
  }
  // A photographic grove is relit by this same sky and deformed gently by the breeze.
  vec2 groveUV=vec2(uv.x/0.65,(uv.y-0.07)/0.90);
  if(uGroveReady>0.5 && groveUV.x<0.29 && groveUV.y>=0.0 && groveUV.y<=1.0) {
    float canopy=smoothstep(0.25,0.9,groveUV.y);
    groveUV.x+=sin(uTime*.56+groveUV.y*8.0)*.0022*canopy;
    groveUV.y+=sin(uTime*.88+groveUV.x*19.0+groveUV.y*6.0)*.0016*canopy;
    vec4 grove=texture2D(uGrove,groveUV);
    vec3 shade=mix(vec3(.10,.16,.24),vec3(1.0),day);
    shade=mix(shade,vec3(.85,.53,.35),gold*.65);
    color=mix(color,grove.rgb*shade,grove.a);
  }
  color=pow(max(color,vec3(0.0)),vec3(0.95));
  gl_FragColor=vec4(color,1.0);
}
`;
