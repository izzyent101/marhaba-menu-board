export const vertexShader = `
attribute vec2 aPosition;
varying vec2 vUV;
void main() { vUV = aPosition * 0.5 + 0.5; gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

// One fixed camera and one cloud field for every hour. SunCalc azimuth is measured
// from south: east is left, west is right in this south-facing coastal panorama.
const viewProjection = `
const float PI=3.14159265359;
const float HORIZON=.258;
vec3 viewRay(vec2 uv) {
  float az=(uv.x-.5)*3.2;
  float el=atan((uv.y-HORIZON)*2.2);
  return vec3(sin(az)*cos(el),sin(el),cos(az)*cos(el));
}
float luminance(vec3 c) { return dot(c,vec3(.2126,.7152,.0722)); }
`;

/** Single scattering, evaluated into a small lighting texture, never per display pixel.
 * Kilometres throughout: spherical Earth, exponential air/aerosols, ozone absorption,
 * and planet occlusion of direct sunlight. Multiple scattering is approximated in
 * the final pass. References and model limits are documented in ATMOSPHERE.md. */
export const atmosphereShader = `
precision highp float;
varying vec2 vUV;
uniform vec3 uSun;
${viewProjection}
const float EARTH=6360.0;
const float TOP=6420.0;
const vec3 BETA_R=vec3(.005802,.013558,.033100);
const vec3 BETA_M=vec3(.001500);
const vec3 BETA_O=vec3(.000650,.001881,.000085);
float outerDistance(vec3 p,vec3 ray) {
  float b=dot(p,ray);
  return -b+sqrt(max(0.0,b*b-dot(p,p)+TOP*TOP));
}
vec3 density(vec3 p) {
  float h=max(0.0,length(p)-EARTH);
  return vec3(exp(-h/8.0),exp(-h/1.2),max(0.0,1.0-abs(h-25.0)/15.0));
}
vec3 extinction(vec3 depth) {
  return BETA_R*depth.x+BETA_M*1.1*depth.y+BETA_O*depth.z;
}
void main() {
  if(uSun.y<-.31){gl_FragColor=vec4(0.0,0.0,0.0,1.0);return;}
  vec3 ray=viewRay(vec2(vUV.x,max(HORIZON+.0003,vUV.y)));
  vec3 origin=vec3(0.0,EARTH+.005,0.0);
  float distance=outerDistance(origin,ray);
  vec3 optical=vec3(0.0),sumR=vec3(0.0),sumM=vec3(0.0);
  for(int i=0;i<16;i++) {
    float a=float(i)/16.0,b=float(i+1)/16.0;
    float ds=(b*b-a*a)*distance;
    vec3 p=origin+ray*((a*a+b*b)*.5*distance);
    vec3 local=density(p)*ds;
    optical+=local*.5;
    float toSun=dot(p,uSun);
    float groundHit=toSun*toSun-dot(p,p)+EARTH*EARTH;
    bool shadow=groundHit>0.0&&toSun<0.0&&-toSun-sqrt(max(0.0,groundHit))>0.0;
    if(!shadow) {
      float sunDistance=outerDistance(p,uSun);
      vec3 sunDepth=vec3(0.0);
      for(int j=0;j<6;j++) {
        float c=float(j)/6.0,d=float(j+1)/6.0;
        sunDepth+=density(p+uSun*((c*c+d*d)*.5*sunDistance))*((d*d-c*c)*sunDistance);
      }
      vec3 transmission=exp(-extinction(optical+sunDepth));
      sumR+=transmission*local.x;
      sumM+=transmission*local.y;
    }
    optical+=local*.5;
  }
  float mu=dot(ray,uSun),g=.76;
  float phaseR=3.0/(16.0*PI)*(1.0+mu*mu);
  float phaseM=(1.0-g*g)/(4.0*PI*pow(max(.001,1.0+g*g-2.0*g*mu),1.5));
  vec3 radiance=22.0*(BETA_R*phaseR*sumR+BETA_M*phaseM*sumM);
  // Store display-linear sky radiance in an ordinary RGBA8 texture; interpolation
  // stays linear. No half-float extension or extra runtime dependency is required.
  gl_FragColor=vec4(1.0-exp(-radiance*1.9),1.0);
}
`;

/** Composite light onto the owner's original moving surf and a single photographic
 * cloud/foliage plate. No day/sunset/night picture dissolves or cloud morphing. */
export const fragmentShader = `
precision highp float;
varying vec2 vUV;
uniform sampler2D uFootage;
uniform sampler2D uDaySky;
uniform sampler2D uNightSky;
uniform sampler2D uAtmosphere;
uniform vec3 uSun;
uniform vec3 uMoon;
uniform vec3 uSunColor;
uniform float uTime;
uniform float uAltitude;
uniform float uMoonPhase;
uniform float uDirect;
uniform float uAmbient;
uniform float uMoonLight;
${viewProjection}
vec3 linearColor(vec3 rgb) { return pow(max(rgb,vec3(0.0)),vec3(2.2)); }
float angleDifference(float a,float b) { return atan(sin(a-b),cos(a-b)); }
void main() {
  vec2 uv=vUV;
  vec3 ray=viewRay(uv);
  float canopy=(1.0-smoothstep(.23,.34,uv.x))*smoothstep(HORIZON+.02,.60,uv.y);
  vec2 wind=vec2((sin(uTime*.51+uv.y*19.0)+.35*sin(uTime*.83+uv.x*31.0))*.0012,
    sin(uTime*.44+uv.x*23.0)*.00035)*canopy;
  float canopyTop=HORIZON+.36*exp(-uv.x*6.5);
  float clearSky=smoothstep(canopyTop+.025,canopyTop+.11,uv.y);
  float height=smoothstep(HORIZON,HORIZON+.55,uv.y);
  vec2 drift=vec2(sin(uTime*.014)*.014,sin(uTime*.011)*.0018)*height*clearSky;
  vec2 skyUV=clamp(uv+drift+wind,vec2(.001),vec2(.999));
  vec3 photograph=texture2D(uDaySky,skyUV).rgb;

  // Cloud density and foliage silhouettes come from the same photograph all day.
  float skyKey=max(smoothstep(.015,.10,photograph.b-max(photograph.r,photograph.g)),smoothstep(.48,.72,photograph.b));
  float treeEnvelope=(1.0-smoothstep(.30,.37,uv.x))*(1.0-smoothstep(canopyTop,canopyTop+.025,uv.y));
  float foliage=treeEnvelope*(1.0-skyKey);
  float skyMask=smoothstep(HORIZON-.003,HORIZON+.005,uv.y)*(1.0-foliage);
  float cloudRatio=photograph.r/max(.01,photograph.b);
  float cloudDensity=smoothstep(.23,.92,cloudRatio)*(1.0-treeEnvelope);
  float cloudAlpha=(1.0-exp(-cloudDensity*2.0))*skyMask;
  vec3 sky=texture2D(uAtmosphere,vec2(uv.x,max(uv.y,HORIZON+.002))).rgb;

  // A restrained multiple-scattering/airglow approximation carries blue hour
  // through civil and nautical twilight after the direct sun is below the sea.
  float sunAz=atan(uSun.x,uSun.z),viewAz=(uv.x-.5)*3.2;
  float sunward=exp(-pow(angleDifference(viewAz,sunAz)/.95,2.0));
  float afterglow=exp(-pow((uAltitude+.055)/.085,2.0))*(1.0-smoothstep(.0,.15,uAltitude));
  float horizonGlow=exp(-max(0.0,ray.y)*6.0);
  float highSun=smoothstep(.08,.40,uAltitude);
  vec3 clearDay=max(vec3(0.0),mix(vec3(luminance(sky)),sky,1.25));
  clearDay*=mix(vec3(.48,.78,1.12),vec3(.92,.98,1.0),horizonGlow);
  sky=mix(sky*vec3(.46,.58,.96),clearDay,highSun);
  sky+=afterglow*exp(-max(0.0,ray.y)*4.0)*mix(vec3(.004,.007,.023),vec3(.19,.044,.007),sunward);
  sky+=vec3(.0018,.0040,.012)+horizonGlow*vec3(.001,.002,.004);

  float starsVisible=1.0-smoothstep(-.24,-.075,uAltitude);
  if(starsVisible>.001){
  vec3 night=texture2D(uNightSky,uv).rgb;
  float starLuma=luminance(night);
  float starBackground=(luminance(texture2D(uNightSky,uv+vec2(.002,0.0)).rgb)+
    luminance(texture2D(uNightSky,uv-vec2(.002,0.0)).rgb)+
    luminance(texture2D(uNightSky,uv+vec2(0.0,.003)).rgb)+
    luminance(texture2D(uNightSky,uv-vec2(0.0,.003)).rgb))*.25;
  // Only celestial detail is sampled from the old night artwork, never its clouds,
  // trees or baked-in moon. It remains behind the moving photographic cloud field.
  float removeBakedMoon=smoothstep(.026,.046,length((uv-vec2(.897,.570))*vec2(1.0,.5625)));
  float stars=pow(max(0.0,starLuma-starBackground),1.5)*removeBakedMoon;
  float galaxyBand=exp(-pow((uv.x-(.38-.37*uv.y))/.12,2.0));
  float galaxy=smoothstep(.025,.19,starBackground)*galaxyBand*(1.0-smoothstep(-.26,-.14,uAltitude));
  sky+=(stars*vec3(.14,.19,.29)+galaxy*vec3(.014,.017,.033))*starsVisible;
  }

  vec3 cloudAmbient=vec3(.003,.006,.013)+uAmbient*vec3(.34,.42,.55)+uMoonLight*vec3(.13,.17,.26);
  float warmClouds=exp(-pow(uAltitude/.18,2.0))*sunward;
  vec3 cloudSun=mix(uSunColor,vec3(1.0,.34,.10),warmClouds*.48)*uDirect;
  cloudSun+=warmClouds*exp(-pow((uAltitude+.01)/.10,2.0))*vec3(.19,.058,.012);
  vec3 cloudColor=(cloudAmbient+cloudSun*.72)*mix(.70,1.0,cloudDensity);
  sky=mix(sky,cloudColor,cloudAlpha);

  // Direct solar disc and lunar phase follow the same directions as their water
  // reflections. Cloud opacity hides them naturally; neither is baked into a frame.
  float sunDot=dot(ray,uSun);
  float sunDisc=smoothstep(cos(.0063),cos(.0045),sunDot)*smoothstep(-.012,.004,uAltitude);
  sky+=(sunDisc*uSunColor*3.2+exp((sunDot-1.0)*4000.0)*uSunColor*uDirect*.18)*(1.0-cloudAlpha);
  vec3 moonRight=normalize(cross(vec3(0.0,1.0,0.0),uMoon));
  vec3 moonUp=cross(uMoon,moonRight);
  vec2 moonUV=vec2(dot(ray,moonRight),dot(ray,moonUp))/.006;
  float moonRadius=dot(moonUV,moonUV);
  if(dot(ray,uMoon)>.99&&moonRadius<1.0) {
    vec2 litDirection=vec2(dot(uSun,moonRight),dot(uSun,moonUp));
    litDirection=litDirection/max(.001,length(litDirection));
    float phaseZ=2.0*uMoonPhase-1.0;
    vec3 lightDirection=vec3(litDirection*sqrt(max(0.0,1.0-phaseZ*phaseZ)),phaseZ);
    vec3 normal=vec3(moonUV,sqrt(1.0-moonRadius));
    float illuminated=smoothstep(-.05,.08,dot(normal,lightDirection));
    float moonDisc=(1.0-smoothstep(.86,1.0,moonRadius))*illuminated;
    float lunarDetail=.35+.65*texture2D(uNightSky,vec2(.897,.570)+moonUV*vec2(.0078,.0138)).r;
    sky+=moonDisc*lunarDetail*vec3(.46,.49,.54)*(1.0-cloudAlpha);
  }

  vec3 film=texture2D(uFootage,uv+wind).rgb;
  float luma=luminance(film);
  float depth=clamp(1.0-uv.y/HORIZON,0.0,1.0);
  float shoreX=.16+.43*pow(depth,1.4);
  float sea=smoothstep(shoreX-.03,shoreX+.03,uv.x);
  float amber=smoothstep(.025,.23,film.r-film.b);
  vec3 neutral=mix(film,luma*vec3(.94,1.035,1.10),amber*sea*.9);
  vec3 albedo=mix(linearColor(neutral),linearColor(photograph),smoothstep(HORIZON-.003,HORIZON+.005,uv.y));
  float nightAdaptation=1.0-smoothstep(-.17,.02,uAltitude);
  albedo=mix(albedo,vec3(luminance(albedo)),nightAdaptation*.55);
  vec3 illumination=vec3(.004,.008,.018)+uAmbient*vec3(.31,.41,.56)+uSunColor*uDirect*.92+
    uMoonLight*vec3(.17,.23,.34);
  vec3 landAndSea=albedo*illumination;
  float sunWidth=.045+depth*.19,moonWidth=.035+depth*.13;
  float sunPath=exp(-pow(angleDifference(viewAz,sunAz)/sunWidth,2.0));
  float moonPath=exp(-pow(angleDifference(viewAz,atan(uMoon.x,uMoon.z))/moonWidth,2.0));
  float movingFoam=smoothstep(.25,.82,luma);
  float reflectionMask=sea*(1.0-smoothstep(HORIZON-.004,HORIZON+.002,uv.y));
  landAndSea+=reflectionMask*movingFoam*(sunPath*uSunColor*uDirect*.30+
    moonPath*uMoonLight*vec3(.13,.18,.27));
  vec3 color=mix(landAndSea,sky,skyMask);
  gl_FragColor=vec4(pow(clamp(color,0.0,1.0),vec3(1.0/2.2)),1.0);
}
`;
