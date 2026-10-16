import React, { useEffect, useId, useState } from 'react';
import BUFFET from '../assets/cloud-buffet-v2.png';
import TAKEOUT from '../assets/cloud-takeout-v2.png';
import { SolarScene } from '../solar';
import { sceneAppearance } from '../sceneAppearance';

interface Bounds { x:number; y:number; width:number; height:number; imageWidth:number; imageHeight:number }
function CloudLettering({ src, className, label, motion,scene }: { src:string; className:string; label:string; motion:boolean;scene:SolarScene }) {
  const material=sceneAppearance(scene);
  const id=`cloud-volume-${useId().replace(/:/g,'')}`;
  const [bounds,setBounds]=useState<Bounds>({x:0,y:180,width:2172,height:360,imageWidth:2172,imageHeight:724});
  useEffect(()=>{
    let stopped=false;const image=new Image();
    image.onload=()=>{
      if(stopped)return;
      // Measure the generated alpha; the source asset remains intact, including its margins.
      const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
      const ctx=canvas.getContext('2d');if(!ctx)return;ctx.drawImage(image,0,0);
      const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);
      let left=canvas.width,right=0,top=canvas.height,bottom=0;
      for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]>12){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
      setBounds({x:Math.max(0,left-8),y:Math.max(0,top-10),width:right-left+17,height:bottom-top+21,imageWidth:canvas.width,imageHeight:canvas.height});
    };
    image.src=src;return()=>{stopped=true;image.onload=null};
  },[src]);
  return <svg className={`cloud-lettering ${className} ${motion?'cloud-lettering-moving':''}`} viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`} preserveAspectRatio="none" role="img" aria-label={label}>
    <defs>
      <filter id={id} x="-3%" y="-10%" width="106%" height="120%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".006 .012" numOctaves="2" seed={className==='cloud-buffet'?14:29} result="wind">
          {motion&&<animate attributeName="baseFrequency" values=".006 .012;.008 .009;.006 .012" dur={className==='cloud-buffet'?'26s':'31s'} repeatCount="indefinite"/>}
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" in2="wind" scale="8" xChannelSelector="R" yChannelSelector="G" result="cloudVolume" />
        <feComponentTransfer in="cloudVolume">
          <feFuncR type="table" tableValues={`${material.cloudShadow[0]} ${material.cloudMid[0]} ${material.cloudLight[0]}`} />
          <feFuncG type="table" tableValues={`${material.cloudShadow[1]} ${material.cloudMid[1]} ${material.cloudLight[1]}`} />
          <feFuncB type="table" tableValues={`${material.cloudShadow[2]} ${material.cloudMid[2]} ${material.cloudLight[2]}`} />
        </feComponentTransfer>
      </filter>
    </defs>
    <g filter={`url(#${id})`}>
      <image href={src} width={bounds.imageWidth} height={bounds.imageHeight} />
    </g>
  </svg>;
}
export default function CloudHeadings({motion,scene}:{motion:boolean;scene:SolarScene}){
  const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{const query=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(query.matches);query.addEventListener('change',update);return()=>query.removeEventListener('change',update)},[]);
  return <div className="cloud-headings cloud-headings-volumetric">
    <CloudLettering src={BUFFET} className="cloud-buffet" label="All You Can Eat Buffet" motion={motion&&!reduced} scene={scene}/>
    <CloudLettering src={TAKEOUT} className="cloud-takeout" label="Take Out (by weight)" motion={motion&&!reduced} scene={scene}/>
  </div>;
}
