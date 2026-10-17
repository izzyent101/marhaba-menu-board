import React from 'react';

// Bevelled LED bars, with a physical gap between adjoining segments.
const bars = [
  '6,1 38,1 42,5 38,9 6,9 2,5',
  '39,7 43,11 43,35 39,39 35,35 35,11',
  '39,41 43,45 43,69 39,73 35,69 35,45',
  '6,71 38,71 42,75 38,79 6,79 2,75',
  '5,41 9,45 9,69 5,73 1,69 1,45',
  '5,7 9,11 9,35 5,39 1,35 1,11',
  '6,36 38,36 42,40 38,44 6,44 2,40'
];
const segments = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];

/** Vector clock digits stay sharp offline, at every TV resolution. */
export default function SegmentDigits({ value, height, className = '' }: { value:string; height:number; className?:string }) {
  const width = value.length * 50 - 6;
  return <svg className={`segment-digits ${className}`} viewBox={`0 0 ${width} 80`} width={height * width / 80} height={height} aria-hidden="true" data-value={value}>
    {Array.from(value, (digit, index) => <g key={index} transform={`translate(${index * 50} 0)`}>
      {bars.map((points, segment) => <polygon key={segment} points={points} className={segments[Number(digit)].includes('abcdefg'[segment]) ? 'segment-on' : 'segment-off'} />)}
    </g>)}
  </svg>;
}
