import React, { useEffect, useId, useState } from 'react';
import HEADINGS from '../assets/headings.png';

export default function CloudHeadings({ motion }: { motion: boolean }) {
  const id = `cloud-${useId().replace(/:/g, '')}`;
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const animate = motion && !reduced;
  return <div className={`cloud-headings ${animate ? 'cloud-headings-moving' : ''}`} role="img" aria-label="All You Can Eat Buffet. Take out by weight.">
    <svg width="0" height="0" aria-hidden="true">
      <defs>
        <filter id={id} x="-2%" y="-3%" width="104%" height="106%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency=".012 .028" numOctaves="2" seed="8" result="breeze">
            {animate && <animate attributeName="baseFrequency" values=".012 .028;.016 .022;.012 .028" dur="24s" repeatCount="indefinite" />}
          </feTurbulence>
          <feMorphology in="SourceGraphic" operator="dilate" radius=".6" result="puffs" />
          <feDisplacementMap in="puffs" in2="breeze" scale="5" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation=".35" />
        </filter>
      </defs>
    </svg>
    <div className="cloud-glyphs" style={{ filter: `url(#${id})` }}>
      <div className="cloud-heading-shape" style={{ maskImage: `url(${HEADINGS})`, WebkitMaskImage: `url(${HEADINGS})` }} />
    </div>
  </div>;
}
