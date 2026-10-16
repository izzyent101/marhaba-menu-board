import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './fonts';
import BoardCanvas from './components/BoardCanvas';
import ClockBar from './components/ClockBar';
import Dashboard from './components/Dashboard';
import {
  BoardConfig,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  DEFAULT_CONFIG,
  STORAGE_KEY,
  UpdateState,
  normalizeConfig
} from './config';
import BUNDLED_VIDEO from './assets/background.mp4';
import HEADINGS from './assets/headings.png';
import LOGO from './assets/logo.png';
import LivingCoast from './components/LivingCoast';
import { solarScene } from './solar';
import { nightInk } from './ambience';

declare global {
  interface Window {
    menuBoard?: {
      isDesktop?: boolean;
      platform?: string;
      saveVideo?: (name: string, buffer: ArrayBuffer) => Promise<string>;
      clearVideo?: () => Promise<boolean>;
      minimizeWindow?: () => Promise<void>;
      toggleFullscreen?: () => Promise<boolean>;
      quitApp?: () => Promise<void>;
      getUpdateState?: () => Promise<UpdateState>;
      checkForUpdate?: () => Promise<void>;
      applyUpdate?: () => Promise<void>;
      onUpdateState?: (cb: (state: UpdateState) => void) => () => void;
    };
  }
}

function loadConfig(): BoardConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const config = normalizeConfig(JSON.parse(raw));
      // blob: URLs do not survive a restart - fall back to the bundled video.
      if (config.videoSrc?.startsWith('blob:')) config.videoSrc = null;
      return config;
    }
  } catch {
    /* fall through to defaults */
  }
  return structuredClone(DEFAULT_CONFIG);
}

export default function App() {
  const [sceneUnavailable, setSceneUnavailable] = useState(false);
  const [sceneTime, setSceneTime] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setSceneTime(new Date()), 10000);
    return () => window.clearInterval(timer);
  }, []);
  const [config, setConfig] = useState<BoardConfig>(loadConfig);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [dragActive, setDragActive] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      /* storage full - the board keeps running with the in-memory config */
    }
  }, [config]);

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Idle: hide the cursor and the button after 4s of no input
  useEffect(() => {
    let timer = 0;
    const wake = () => {
      setUiVisible(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!dashboardOpen) setUiVisible(false);
      }, 4000);
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, wake));
    wake();
    return () => {
      events.forEach((e) => window.removeEventListener(e, wake));
      window.clearTimeout(timer);
    };
  }, [dashboardOpen]);

  // Keyboard: D or E opens the dashboard, Esc closes, F fullscreen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches('input, textarea, select') || target.isContentEditable) return;
      const key = e.key.toLowerCase();
      if (key === 'escape') setDashboardOpen(false);
      if (key === 'd' || key === 'e') setDashboardOpen((v) => !v);
      if (key === 'f' || e.key === 'F11') {
        e.preventDefault();
        // In the desktop app, toggle the real OS window; in a browser use the web API.
        if (window.menuBoard?.toggleFullscreen) {
          window.menuBoard.toggleFullscreen();
        } else if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => undefined);
        } else {
          document.exitFullscreen().catch(() => undefined);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const useVideoFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) {
      window.alert('Please choose a video file (.mp4 works best).');
      return;
    }

    // In the desktop app the file is copied into the app's own folder so it
    // survives a restart. In a plain browser we fall back to a session-only URL.
    const bridge = window.menuBoard;
    if (bridge?.saveVideo) {
      try {
        const buffer = await file.arrayBuffer();
        const savedUrl = await bridge.saveVideo(file.name, buffer);
        setConfig((c) => ({ ...c, videoSrc: savedUrl }));
        return;
      } catch {
        /* fall through to the blob URL */
      }
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setConfig((c) => ({ ...c, videoSrc: url }));
  }, []);

  useEffect(() => {
    const over = (e: DragEvent) => {
      e.preventDefault();
      setDragActive(true);
    };
    const leave = () => setDragActive(false);
    const drop = (e: DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) useVideoFile(file);
    };
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
    };
  }, [useVideoFile]);

  // The bar height is in design px, scaled with the screen so proportions match a 1920-wide layout.
  const barScale = viewport.w / DESIGN_WIDTH;
  const clockHeight = config.clock.enabled ? Math.round(config.clock.height * barScale) : 0;
  // While the dashboard is open the sign shrinks beside it, so the board stays visible.
  const panelWidth = dashboardOpen ? Math.min(420, viewport.w * 0.4) : 0;

  // The sign fills the screen under the clock bar, so the hours sit hard against
  // the left edge and the prices against the right, exactly as on the printed
  // sign. 'fit' keeps 16:9 and letterboxes instead.
  const { scaleX, scaleY } = useMemo(() => {
    const availableH = Math.max(1, viewport.h - clockHeight);
    const availableW = Math.max(1, viewport.w - panelWidth);
    if (config.signFit === 'fit') {
      const uniform = Math.min(availableW / DESIGN_WIDTH, availableH / DESIGN_HEIGHT);
      return { scaleX: uniform, scaleY: uniform };
    }
    return { scaleX: availableW / DESIGN_WIDTH, scaleY: availableH / DESIGN_HEIGHT };
  }, [viewport, clockHeight, panelWidth, config.signFit]);

  const stageStyle: React.CSSProperties = {
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
    transform: `scale(${scaleX}, ${scaleY})`,
    transformOrigin: 'top left',
    left: (viewport.w - panelWidth - DESIGN_WIDTH * scaleX) / 2,
    top: clockHeight + (viewport.h - clockHeight - DESIGN_HEIGHT * scaleY) / 2
  };

  const scene = solarScene(config.ambience, sceneTime);
  const enhanced = config.ambience !== 'original' && !config.videoSrc && !sceneUnavailable;
  const displayConfig = useMemo(() => enhanced ? {
    ...config,
    groups: config.groups.map(group => ({ ...group, labelColor: nightInk(group.labelColor, scene.night) }))
  } : config, [config, enhanced, scene.night]);

  return (
    <div className={`board ${uiVisible ? '' : 'idle'}`}>
      {!enhanced && <video
        className="bg-video"
        style={{ objectFit: config.videoFit }}
        src={config.videoSrc || BUNDLED_VIDEO}
        autoPlay
        loop
        muted
        playsInline
      />}

      {enhanced && (
        <LivingCoast scene={scene} motion={config.ambienceMotion} onUnavailable={() => setSceneUnavailable(true)} />
      )}

      {config.clock.enabled && (
        <ClockBar clock={{ ...config.clock, height: clockHeight }} weather={config.weather} />
      )}

      <div className="stage" style={stageStyle}>
        <img className="overlay" src={config.overlaySrc || HEADINGS} alt="" draggable={false} />
        {config.logoOnSign && <img className="sign-logo" src={LOGO} alt="" draggable={false} />}
        <BoardCanvas config={displayConfig} scale={Math.max(scaleX, scaleY)} />
      </div>

      {dragActive && <div className="drop-hint">Drop a video to use as the background</div>}

      {!dashboardOpen && (
        <button className={`open-dash ${uiVisible ? '' : 'hidden'}`} onClick={() => setDashboardOpen(true)}>
          Edit board
        </button>
      )}

      {dashboardOpen && (
        <Dashboard
          config={config}
          onChange={setConfig}
          onClose={() => setDashboardOpen(false)}
          onPickVideo={() => videoInputRef.current?.click()}
          sceneUnavailable={sceneUnavailable}
          onRetryScene={() => setSceneUnavailable(false)}
        />
      )}

      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) useVideoFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
