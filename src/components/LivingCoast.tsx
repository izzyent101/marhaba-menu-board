import React, { useEffect, useRef } from 'react';
import { atmosphereShader, fragmentShader, vertexShader } from '../coastShader';
import { sceneLighting, SolarScene } from '../solar';
import FILM from '../assets/background.mp4';
import DAY_SKY from '../assets/original-beach-day-v1.png';
import NIGHT_SKY from '../assets/original-beach-night-v1.png';

interface Props { scene:SolarScene; motion:boolean; previewing?:boolean; onUnavailable:()=>void }
const SKY_WIDTH=128,SKY_HEIGHT=64;

export default function LivingCoast({scene,motion,previewing=false,onUnavailable}:Props) {
  const canvasRef=useRef<HTMLCanvasElement>(null),videoRef=useRef<HTMLVideoElement>(null);
  const latest=useRef({scene,motion,previewing,onUnavailable});latest.current={scene,motion,previewing,onUnavailable};
  useEffect(()=>{
    const canvas=canvasRef.current,video=videoRef.current;
    if(!canvas||!video)return;
    const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,powerPreference:'low-power'});
    if(!gl){latest.current.onUnavailable();return}
    let frame=0,disposed=false,previous=0,lastDraw=0,elapsed=0,uploadedTime=-1,skiesReady=0;
    let lastSky=0,skyAltitude=Infinity,skyAzimuth=Infinity;
    const live={...latest.current.scene};
    const shaders:WebGLShader[]=[],programs:WebGLProgram[]=[],textures:WebGLTexture[]=[],images:HTMLImageElement[]=[];
    let buffer:WebGLBuffer|null=null,framebuffer:WebGLFramebuffer|null=null;
    let main:WebGLProgram,atmosphere:WebGLProgram;
    const destroy=()=>{
      disposed=true;cancelAnimationFrame(frame);video.pause();
      images.forEach(image=>{image.onload=null;image.onerror=null});
      textures.forEach(texture=>gl.deleteTexture(texture));programs.forEach(program=>gl.deleteProgram(program));
      shaders.forEach(shader=>gl.deleteShader(shader));gl.deleteBuffer(buffer);gl.deleteFramebuffer(framebuffer);
    };
    try {
      const compile=(kind:number,source:string)=>{
        const shader=gl.createShader(kind);if(!shader)throw new Error('Beach shader allocation failed');
        shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader)||'Beach shader failed');
        return shader;
      };
      const vertex=compile(gl.VERTEX_SHADER,vertexShader);
      const program=(source:string)=>{
        const value=gl.createProgram();if(!value)throw new Error('Beach program allocation failed');
        programs.push(value);gl.attachShader(value,vertex);gl.attachShader(value,compile(gl.FRAGMENT_SHADER,source));
        gl.bindAttribLocation(value,0,'aPosition');gl.linkProgram(value);
        if(!gl.getProgramParameter(value,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(value)||'Beach link failed');
        return value;
      };
      main=program(fragmentShader);atmosphere=program(atmosphereShader);
      buffer=gl.createBuffer();if(!buffer)throw new Error('Beach geometry allocation failed');
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
      gl.useProgram(main);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      for(const [unit,name] of ['uFootage','uDaySky','uNightSky','uAtmosphere'].entries()) {
        const texture=gl.createTexture();if(!texture)throw new Error('Beach texture allocation failed');
        textures.push(texture);gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.uniform1i(gl.getUniformLocation(main,name),unit);
        if(unit===1||unit===2) {
          const image=new Image();images.push(image);
          image.onload=()=>{
            if(disposed)return;
            gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);
            gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);skiesReady++;
          };
          image.onerror=()=>{if(!disposed)latest.current.onUnavailable()};
          image.src=unit===1?DAY_SKY:NIGHT_SKY;
        } else if(unit===3) gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,SKY_WIDTH,SKY_HEIGHT,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      }
      framebuffer=gl.createFramebuffer();if(!framebuffer)throw new Error('Sky buffer allocation failed');
      gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,textures[3],0);
      if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Sky buffer unavailable');
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    } catch(error) {
      console.warn('Beach lighting unavailable; keeping original video.',error);
      destroy();latest.current.onUnavailable();return;
    }
    const names=['uTime','uAltitude','uSun','uMoon','uSunColor','uMoonPhase','uDirect','uAmbient','uMoonLight'];
    const uniforms=Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(main,name)]));
    const skySun=gl.getUniformLocation(atmosphere,'uSun');
    const resize=()=>{
      const ratio=Math.min(1,1920/Math.max(1,canvas.clientWidth));
      canvas.width=Math.max(1,Math.round(canvas.clientWidth*ratio));canvas.height=Math.max(1,Math.round(canvas.clientHeight*ratio));
    };
    const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPlayback=()=>{
      const playing=latest.current.motion&&!reduced.matches&&!document.hidden;
      if(playing&&video.paused)video.play().catch(()=>undefined);else if(!playing&&!video.paused)video.pause();
    };
    const draw=(stamp:number)=>{
      frame=0;if(disposed||document.hidden||gl.isContextLost()){previous=0;return}
      if(stamp-lastDraw<1000/30){frame=requestAnimationFrame(draw);return}
      const dt=previous?Math.min(.15,(stamp-previous)/1000):1/30;previous=stamp;lastDraw=stamp;
      syncPlayback();if(latest.current.motion&&!reduced.matches)elapsed+=dt;
      // Interpolate the solar directions, never photographs. A preview samples
      // the actual solar clock directly so sunrise agrees with its displayed time.
      const blend=latest.current.previewing?1:1-Math.exp(-dt/.35);
      for(const key of Object.keys(live) as (keyof SolarScene)[]) {
        let delta=latest.current.scene[key]-live[key];
        if(key==='azimuth'||key==='moonAzimuth')delta=Math.atan2(Math.sin(delta),Math.cos(delta));
        live[key]+=delta*blend;
      }
      if(video.readyState>=2&&skiesReady===2) {
        const lighting=sceneLighting(live);
        const changed=Math.abs(live.altitude-skyAltitude)+Math.abs(live.azimuth-skyAzimuth)>1e-5;
        if((changed&&stamp-lastSky>=100)||stamp-lastSky>5000) {
          gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.viewport(0,0,SKY_WIDTH,SKY_HEIGHT);
          gl.useProgram(atmosphere);gl.uniform3fv(skySun,lighting.sun);gl.drawArrays(gl.TRIANGLES,0,6);
          gl.bindFramebuffer(gl.FRAMEBUFFER,null);lastSky=stamp;skyAltitude=live.altitude;skyAzimuth=live.azimuth;
        }
        gl.useProgram(main);gl.viewport(0,0,canvas.width,canvas.height);
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,textures[0]);
        if(video.currentTime!==uploadedTime){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,video);uploadedTime=video.currentTime}
        gl.uniform1f(uniforms.uTime,elapsed);gl.uniform1f(uniforms.uAltitude,live.altitude);
        gl.uniform3fv(uniforms.uSun,lighting.sun);gl.uniform3fv(uniforms.uMoon,lighting.moon);gl.uniform3fv(uniforms.uSunColor,lighting.sunColor);
        gl.uniform1f(uniforms.uMoonPhase,live.moonPhase);gl.uniform1f(uniforms.uDirect,lighting.direct);
        gl.uniform1f(uniforms.uAmbient,lighting.ambient);gl.uniform1f(uniforms.uMoonLight,lighting.moonLight);
        gl.drawArrays(gl.TRIANGLES,0,6);canvas.dataset.ready='true';
      }
      frame=requestAnimationFrame(draw);
    };
    const visibility=()=>{syncPlayback();if(!frame&&!document.hidden)frame=requestAnimationFrame(draw)};
    const lost=(event:Event)=>{event.preventDefault();latest.current.onUnavailable()};
    const failed=()=>latest.current.onUnavailable();
    document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',syncPlayback);
    canvas.addEventListener('webglcontextlost',lost);video.addEventListener('error',failed);
    syncPlayback();frame=requestAnimationFrame(draw);
    return()=>{
      observer.disconnect();document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',syncPlayback);
      canvas.removeEventListener('webglcontextlost',lost);video.removeEventListener('error',failed);destroy();
    };
  },[]);
  return <div className="living-coast">
    <video ref={videoRef} className="original-beach-source" src={FILM} autoPlay muted loop playsInline preload="auto" aria-hidden="true" />
    <canvas ref={canvasRef} className="original-beach-lighting" aria-label="Original Marhaba beach with continuous solar lighting and moving surf" />
  </div>;
}
