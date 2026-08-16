import React, { useEffect, useState } from 'react';
import { ClockConfig } from '../config';
import { WeatherConfig, useWeather } from '../weather';
import WeatherIcon from './WeatherIcon';
import LOGO from '../assets/logo.png';

interface Props {
  clock: ClockConfig;
  weather: WeatherConfig;
}

/**
 * The infotainment bar: date and live weather on the night side, the logo
 * centred on a soft glow, the time on the day side. The background sweeps
 * night-to-day left-to-right - the same idea as the original board's header.
 */
export default function ClockBar({ clock, weather: weatherConfig }: Props) {
  const weather = useWeather(weatherConfig);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const monthDay = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toUpperCase();

  const hourMin = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const [clockDigits, meridiem] = hourMin.split(' ');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const h = clock.height;

  return (
    <div className="clock-bar" style={{ height: h }}>
      <div className="bar-night" />
      <div className="bar-day" />

      <div className="clock-left">
        <div className="clock-date-stack">
          <span className="clock-weekday" style={{ fontSize: h * 0.19, letterSpacing: '0.3em' }}>
            {weekday}
          </span>
          <span className="clock-date" style={{ color: clock.dateColor, fontSize: h * 0.3 }}>
            {monthDay}
          </span>
        </div>

        {weather && (
          <div className="weather" style={{ marginLeft: h * 0.42, height: h * 0.78, padding: `0 ${h * 0.22}px` }}>
            <WeatherIcon condition={weather.condition} isDay={weather.isDay} size={h * 0.58} />
            <span className="weather-temp" style={{ fontSize: h * 0.38 }}>
              {weather.temperature}
              <sup>°</sup>
            </span>
            <span className="weather-divider" style={{ height: h * 0.42 }} />
            <span className="weather-meta">
              <span className="weather-desc" style={{ fontSize: h * 0.15 }}>
                {weather.description}
              </span>
              {weatherConfig.showRange && (
                <span className="weather-range" style={{ fontSize: h * 0.145 }}>
                  <i className="hi">▲</i> {weather.high}°&ensp;<i className="lo">▼</i> {weather.low}°
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
            style={{ height: h * (clock.logoScale || 0.8) }}
            draggable={false}
          />
        </span>
      )}

      <div className="clock-time-stack" style={{ color: clock.timeColor }}>
        <span className="clock-time" style={{ fontSize: h * 0.44 }}>
          {clockDigits}
        </span>
        {clock.seconds && (
          <span className="clock-seconds" style={{ fontSize: h * 0.2 }}>
            :{seconds}
          </span>
        )}
        <span className="clock-meridiem" style={{ fontSize: h * 0.2 }}>
          {meridiem}
        </span>
      </div>
    </div>
  );
}
