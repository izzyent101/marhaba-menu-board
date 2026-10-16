import React from 'react';
import { Condition } from '../weather';

interface Props {
  condition: Condition;
  isDay: boolean;
  size: number;
}

/**
 * Animated weather icons, drawn with gradients and soft shading so they sit
 * comfortably next to the chrome sign artwork. Pure SVG + CSS: offline, crisp
 * at any size. Motion is slow and continuous - info-bar weather, not an app.
 */
export default function WeatherIcon({ condition, isDay, size }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 64 64',
    className: `wx wx-${condition}`,
    xmlns: 'http://www.w3.org/2000/svg'
  } as const;

  const defs = (
    <defs>
      <radialGradient id="wxSun" cx="38%" cy="34%" r="75%">
        <stop offset="0%" stopColor="#fff6d8" />
        <stop offset="45%" stopColor="#ffd968" />
        <stop offset="100%" stopColor="#f5a623" />
      </radialGradient>
      <linearGradient id="wxCloud" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="70%" stopColor="#dbe4ef" />
        <stop offset="100%" stopColor="#b9c8dc" />
      </linearGradient>
      <linearGradient id="wxCloudBack" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#cfdae8" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#9fb1c8" />
      </linearGradient>
      <radialGradient id="wxMoon" cx="35%" cy="30%" r="80%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#cdd9ee" />
      </radialGradient>
      <linearGradient id="wxBolt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffe789" />
        <stop offset="100%" stopColor="#ffb02e" />
      </linearGradient>
    </defs>
  );

  const cloud = (opacity = 1, y = 0, back = false) => (
    <g className={back ? 'wx-cloud wx-cloud-back' : 'wx-cloud'} opacity={opacity} transform={`translate(0 ${y})`}>
      <path
        fill={back ? 'url(#wxCloudBack)' : 'url(#wxCloud)'}
        d="M20 44a10 10 0 0 1 .6-19.98A14 14 0 0 1 47 26.5 9 9 0 0 1 46 44z"
      />
      {/* soft under-shadow gives the cloud body */}
      {!back && <path fill="rgba(90,110,140,0.28)" d="M22 44a26 26 0 0 1 24 0z" />}
    </g>
  );

  const drops = (count: number, soft = false) =>
    Array.from({ length: count }, (_, i) => (
      <line
        key={i}
        className={`wx-drop${soft ? ' wx-drop-soft' : ''}`}
        x1={22 + i * 9}
        y1={48}
        x2={19 + i * 9}
        y2={57}
        style={{ animationDelay: `${i * 0.28}s` }}
      />
    ));

  const flakes = (count: number) =>
    Array.from({ length: count }, (_, i) => (
      <circle
        key={i}
        className="wx-flake"
        cx={22 + i * 9}
        cy={50}
        r={2.1}
        style={{ animationDelay: `${i * 0.42}s` }}
      />
    ));

  switch (condition) {
    case 'clear':
      return isDay ? (
        <svg {...common}>
          {defs}
          <g className="wx-rays">
            {Array.from({ length: 8 }, (_, i) => (
              <line key={i} x1="32" y1="5" x2="32" y2="12" transform={`rotate(${i * 45} 32 32)`} />
            ))}
          </g>
          <circle className="wx-sun" cx="32" cy="32" r="13" fill="url(#wxSun)" />
          <circle cx="32" cy="32" r="13" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.8" />
        </svg>
      ) : (
        <svg {...common}>
          {defs}
          <path className="wx-moon" fill="url(#wxMoon)" d="M40 12a21 21 0 1 0 12 34A22 22 0 0 1 40 12z" />
          <circle className="wx-star" cx="20" cy="16" r="1.6" />
          <circle className="wx-star" cx="14" cy="30" r="1.2" style={{ animationDelay: '0.9s' }} />
          <circle className="wx-star" cx="24" cy="45" r="1.1" style={{ animationDelay: '1.7s' }} />
        </svg>
      );

    case 'partly':
      return (
        <svg {...common}>
          {defs}
          {isDay ? <><g className="wx-rays wx-rays-sm">
            {Array.from({ length: 8 }, (_, i) => (
              <line key={i} x1="24" y1="4" x2="24" y2="9" transform={`rotate(${i * 45} 24 22)`} />
            ))}
          </g>
          <circle className="wx-sun" cx="24" cy="22" r="9" fill="url(#wxSun)" /></> :
            <path fill="url(#wxMoon)" d="M29 7a16 16 0 1 0 13 26A17 17 0 0 1 29 7z" />}
          {cloud(1, 6)}
        </svg>
      );

    case 'cloudy':
      return (
        <svg {...common}>
          {defs}
          {cloud(0.7, -4, true)}
          {cloud(1, 4)}
        </svg>
      );

    case 'fog':
      return (
        <svg {...common}>
          {defs}
          {cloud(0.9, -6)}
          <g className="wx-fog">
            <line x1="14" y1="46" x2="50" y2="46" />
            <line x1="18" y1="53" x2="46" y2="53" style={{ animationDelay: '1.1s' }} />
          </g>
        </svg>
      );

    case 'drizzle':
      return (
        <svg {...common}>
          {defs}
          {cloud(1, -4)}
          <g>{drops(3, true)}</g>
        </svg>
      );

    case 'rain':
      return (
        <svg {...common}>
          {defs}
          {cloud(1, -4)}
          <g>{drops(3)}</g>
        </svg>
      );

    case 'snow':
      return (
        <svg {...common}>
          {defs}
          {cloud(1, -4)}
          <g>{flakes(3)}</g>
        </svg>
      );

    case 'thunder':
      return (
        <svg {...common}>
          {defs}
          {cloud(1, -6)}
          <path className="wx-bolt" fill="url(#wxBolt)" d="M34 42l-9 12h7l-3 10 12-14h-7l4-8z" />
          <g>{drops(2)}</g>
        </svg>
      );

    default:
      return null;
  }
}
