import React, { useEffect, useRef } from 'react';
import { fragmentShader, vertexShader } from '../coastShader';
import { SolarScene } from '../solar';
import GROVE from '../assets/coastal-grove.png';

interface Props { scene: SolarScene; motion: boolean; onUnavailable: () => void }

export default function LivingCoast({ scene, motion, onUnavailable }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetRef = useRef(scene);
  targetRef.current = scene;
  const motionRef = useRef(motion);
  motionRef.current = motion;
  const unavailableRef = useRef(onUnavailable);
  unavailableRef.current = onUnavailable;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
    if (!gl) { unavailableRef.current(); return; }
    let disposed = false, frame = 0, previous = 0, lastDraw = 0, elapsed = 0;
    let pixels = 1280;
    const live = { ...targetRef.current };
    const shaders: WebGLShader[] = [];
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Unable to allocate scene shader');
      shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'Scene shader failed');
      return shader;
    };
    let program: WebGLProgram | null = null, buffer: WebGLBuffer | null = null;
    try {
      program = gl.createProgram(); if (!program) throw new Error('Scene program unavailable');
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexShader));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentShader));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Scene link failed');
      gl.useProgram(program);
      buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'aPosition');
      gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    } catch (error) {
      console.warn('Living coast unavailable; using bundled beach.', error);
      shaders.forEach(shader => gl.deleteShader(shader));
      if (program) gl.deleteProgram(program); if (buffer) gl.deleteBuffer(buffer);
      unavailableRef.current(); return;
    }
    const uniforms = Object.fromEntries(['uResolution','uTime','uAltitude','uAzimuth','uMoonAltitude','uMoonAzimuth','uMoonPhase','uGrove','uGroveReady'].map(name => [name,gl.getUniformLocation(program!,name)]));
    const texture=gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.uniform1i(uniforms.uGrove,0);
    const grove=new Image();
    grove.onload=()=>{
      if(disposed)return;
      gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,grove);
      gl.uniform1f(uniforms.uGroveReady,1);
    };
    grove.src=GROVE;
    const resize = () => {
      const ratio = Math.min(1, pixels / Math.max(1, canvas.clientWidth));
      canvas.width = Math.max(1,Math.round(canvas.clientWidth*ratio));
      canvas.height = Math.max(1,Math.round(canvas.clientHeight*ratio));
      gl.viewport(0,0,canvas.width,canvas.height);
    };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let slowFrames = 0;
    const draw = (stamp: number) => {
      frame = 0;
      if (disposed || document.hidden || gl.isContextLost()) { previous=0; return; }
      if (stamp-lastDraw < 1000/30) { frame=requestAnimationFrame(draw); return; }
      const dt = previous ? Math.min(0.1,(stamp-previous)/1000) : 1/30;
      // Reduce fill rate on older integrated GPUs without changing wave speed.
      if (previous && stamp-previous > 65) slowFrames++; else slowFrames=Math.max(0,slowFrames-1);
      if (slowFrames > 45 && pixels>800) { pixels=800; resize(); slowFrames=0; }
      previous=stamp; lastDraw=stamp;
      if (motionRef.current && !reduced.matches) elapsed+=dt;
      const blend=1-Math.exp(-dt/2.4);
      for (const key of Object.keys(live) as (keyof SolarScene)[]) {
        let delta=targetRef.current[key]-live[key];
        if(key==='azimuth'||key==='moonAzimuth') delta=Math.atan2(Math.sin(delta),Math.cos(delta));
        live[key]+=delta*blend;
      }
      gl.uniform2f(uniforms.uResolution,canvas.width,canvas.height);
      gl.uniform1f(uniforms.uTime,elapsed);
      gl.uniform1f(uniforms.uAltitude,live.altitude); gl.uniform1f(uniforms.uAzimuth,live.azimuth);
      gl.uniform1f(uniforms.uMoonAltitude,live.moonAltitude); gl.uniform1f(uniforms.uMoonAzimuth,live.moonAzimuth);
      gl.uniform1f(uniforms.uMoonPhase,live.moonPhase);
      gl.drawArrays(gl.TRIANGLES,0,6);
      canvas.dataset.ready='true';
      frame=requestAnimationFrame(draw);
    };
    const resume = () => { if (!frame && !document.hidden) frame=requestAnimationFrame(draw); };
    const lost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(frame); frame=0; unavailableRef.current(); };
    canvas.addEventListener('webglcontextlost',lost);
    document.addEventListener('visibilitychange',resume);
    frame=requestAnimationFrame(draw);
    return () => {
      disposed=true; cancelAnimationFrame(frame); observer.disconnect();
      canvas.removeEventListener('webglcontextlost',lost);
      document.removeEventListener('visibilitychange',resume);
      grove.onload=null;gl.deleteTexture(texture);
      gl.deleteBuffer(buffer); gl.deleteProgram(program); shaders.forEach(shader=>gl.deleteShader(shader));
    };
  }, []);
  return <canvas ref={canvasRef} className="living-coast" aria-label="Animated coastal landscape" />;
}
