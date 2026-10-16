import React, { useEffect, useState } from 'react';
import { ClockConfig,INK } from '../config';
import { WeatherConfig, useWeather } from '../weather';
import WeatherIcon from './WeatherIcon';
import LOGO from '../assets/logo.png';
import { SolarScene } from '../solar';
import { sceneAppearance } from '../sceneAppearance';

interface Props {
  clock: ClockConfig;
  weather: WeatherConfig;
  scene:SolarScene;
}

/**
 * A single sheet of smoked glass. Solar lighting changes its tint without
 * changing the actual date, clock or weather during a scene preview.
 */
export default function ClockBar({ clock, weather: weatherConfig,scene }: Props) {
  const weather = useWeather(weatherConfig);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  const hourMin = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const [clockDigits, meridiem] = hourMin.split(' ');
  const [hours, minutes] = clockDigits.split(':');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const h = clock.height;
  const glass=sceneAppearance(scene);
  const glassStyle={height:h,'--bar-height':`${h}px`,
    '--glass-left':glass.barLeft,'--glass-middle':glass.barMiddle,'--glass-right':glass.barRight,
    '--glass-rim':glass.rim,'--glass-accent':glass.accent,'--glass-reflection':glass.reflection,
    '--glass-sun':`${glass.sunX}%`
  } as React.CSSProperties;

  return (
    <div className="clock-bar" style={glassStyle}>

      <div className="clock-left">
        <div className="clock-date-stack">
          <span className="clock-weekday" style={{ fontSize: h * 0.135 }}>
            {weekday}
          </span>
          <span className="clock-date" style={{ color: clock.dateColor===INK.ivory?'#f7f5ee':clock.dateColor, fontSize: h * 0.37 }}>
            {monthDay}
          </span>
        </div>

        {weather && (
          <div className="weather" style={{ marginLeft: h * 0.34, paddingLeft:h * 0.34 }}>
            <WeatherIcon condition={weather.condition} isDay={scene.altitude>-.01} size={h * 0.38} />
            <span className="weather-temp" style={{ fontSize: h * 0.40 }}>
              {weather.temperature}
              <sup>°</sup>
            </span>
            <span className="weather-meta">
              <span className="weather-desc" style={{ fontSize: h * 0.15 }}>
                {weather.description}
              </span>
              {weatherConfig.showRange && (
                <span className="weather-range" style={{ fontSize: h * 0.135 }}>
                  <span>H {weather.high}°</span><span>L {weather.low}°</span>
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {clock.logo && (
        <span className="logo-wrap">
          <img
            className="clock-logo"
            src={LOGO}
            alt="Marhaba Grill"
            style={{ height: h * (clock.logoScale || 0.8) * .96 }}
            draggable={false}
          />
        </span>
      )}

      <time className="clock-time-stack" dateTime={now.toISOString()} aria-label={`${clockDigits}${clock.seconds?`:${seconds}`:''} ${meridiem}`} style={{ color: clock.timeColor===INK.ivory?'#f7f5ee':clock.timeColor }}>
        <span className="clock-time" aria-hidden="true" style={{ fontSize: h * 0.66 }}>
          <span>{hours}</span><span className="clock-colon"><i/><i/></span><span>{minutes}</span>
        </span>
        <span className={`clock-subdial ${clock.seconds?'':'clock-subdial-no-seconds'}`} aria-hidden="true">
          {clock.seconds && <span className="clock-seconds" style={{ fontSize: h * 0.26 }}>
            {seconds}
          </span>}
          <span className="clock-meridiem" style={{ fontSize: h * 0.12 }}>
            {meridiem}
          </span>
        </span>
      </time>
    </div>
  );
}
