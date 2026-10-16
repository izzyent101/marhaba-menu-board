import React, { useEffect, useRef, useState } from 'react';
import {
  BoardConfig,
  DEFAULT_CONFIG,
  FINISHES,
  FONT_CHOICES,
  PriceGroupConfig,
  TextBlock,
  TextFinish,
  UpdateState
} from '../config';
import { WeatherPlace, searchPlaces } from '../weather';

interface Props {
  config: BoardConfig;
  onChange: (next: BoardConfig) => void;
  onClose: () => void;
  onPickVideo: () => void;
  sceneUnavailable?: boolean;
  onRetryScene?: () => void;
  dayPreview?: {time:string;progress:number;running:boolean}|null;
  onPreviewDay?: ()=>void;
  onFinishPreview?: ()=>void;
  onPreviewSeek?: (progress:number)=>void;
  onPreviewPlay?: ()=>void;
}

const UPDATE_LABEL: Record<UpdateState['status'], string> = {
  idle: 'Up to date',
  checking: 'Checking for updates…',
  current: 'You have the latest version',
  downloading: 'Downloading update…',
  ready: 'Update ready — restart to apply',
  error: "Couldn't check for updates"
};

export default function Dashboard({ config, onChange, onClose, onPickVideo, sceneUnavailable, onRetryScene,dayPreview,onPreviewDay,onFinishPreview,onPreviewSeek,onPreviewPlay }: Props) {
  const bridge = typeof window !== 'undefined' ? window.menuBoard : undefined;
  const [update, setUpdate] = useState<UpdateState | null>(null);

  useEffect(() => {
    if (!bridge?.getUpdateState) return;
    bridge.getUpdateState().then(setUpdate).catch(() => undefined);
    return bridge.onUpdateState?.(setUpdate);
  }, [bridge]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<WeatherPlace[] | null>(null);
  const [placeStatus, setPlaceStatus] = useState<string>('');

  const runPlaceSearch = async () => {
    if (!placeQuery.trim()) return;
    setPlaceStatus('Searching…');
    setPlaceResults(null);
    try {
      const results = await searchPlaces(placeQuery.trim());
      setPlaceResults(results);
      setPlaceStatus(results.length ? '' : 'No places matched that name.');
    } catch {
      setPlaceStatus('Could not reach the weather service. Check the connection.');
    }
  };

  const patch = (partial: Partial<BoardConfig>) => onChange({ ...config, ...partial });

  const patchGroup = (groupId: string, partial: Partial<PriceGroupConfig>) =>
    onChange({
      ...config,
      groups: config.groups.map((g) => (g.id === groupId ? { ...g, ...partial } : g))
    });

  const setRow = (groupId: string, rowId: string, partial: { value?: number; label?: string }) =>
    onChange({
      ...config,
      groups: config.groups.map((g) =>
        g.id === groupId
          ? { ...g, rows: g.rows.map((r) => (r.id === rowId ? { ...r, ...partial } : r)) }
          : g
      )
    });

  const setBlockLine = (blockId: string, lineId: string, text: string) =>
    onChange({
      ...config,
      blocks: config.blocks.map((b) =>
        b.id === blockId
          ? { ...b, lines: b.lines.map((l) => (l.id === lineId ? { ...l, text } : l)) }
          : b
      )
    });

  const patchBlock = (blockId: string, partial: Partial<TextBlock>) =>
    onChange({
      ...config,
      blocks: config.blocks.map((b) => (b.id === blockId ? { ...b, ...partial } : b))
    });

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'marhaba-menu-board-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onChange(JSON.parse(String(reader.result)));
      } catch {
        window.alert('That file could not be read as menu board settings.');
      }
    };
    reader.readAsText(file);
  };

  const finishPicker = (value: TextFinish, onPick: (next: TextFinish) => void) => (
    <div className="picker">
      {FINISHES.map((finish) => (
        <button
          key={finish.id}
          className={value === finish.id ? 'active' : ''}
          onClick={() => onPick(finish.id)}
        >
          <span className="meta">
            <span className="name">{finish.label}</span>
            <span className="note">{finish.note}</span>
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <aside className="dashboard" onMouseDown={(e) => e.stopPropagation()}>
      <header className="dash-head">
        <h2>Menu Board</h2>
        <button className="ghost" onClick={onClose}>
          Close
        </button>
      </header>

      <div className="dash-body">
        {bridge?.minimizeWindow && (
          <section>
            <h3>Window</h3>
            <div className="row">
              <button onClick={() => bridge.toggleFullscreen?.()}>Fullscreen on/off</button>
              <button onClick={() => bridge.minimizeWindow?.()}>Minimize</button>
              <button
                className="danger"
                onClick={() => {
                  if (window.confirm('Close the menu board app?')) bridge.quitApp?.();
                }}
              >
                Quit app
              </button>
            </div>
            <p className="hint">
              Also from the keyboard anytime: <strong>F11</strong> fullscreen, <strong>Esc</strong> leaves
              fullscreen, <strong>Ctrl+M</strong> minimize, <strong>Ctrl+Shift+Q</strong> quit.
            </p>
          </section>
        )}

        {config.groups.map((group) => (
          <section key={group.id}>
            <h3>{group.title}</h3>
            {group.rows.map((row) => (
              <div key={row.id} className="item-row">
                <input
                  className="item-name"
                  type="text"
                  value={row.label}
                  onChange={(e) => setRow(group.id, row.id, { label: e.target.value })}
                />
                <div className="money">
                  <span>$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.value}
                    onChange={(e) => setRow(group.id, row.id, { value: Number(e.target.value) })}
                  />
                </div>
              </div>
            ))}

            <details className="tuning">
              <summary>Type &amp; placement</summary>
              <label className="field">
                <span>Item name size</span>
                <input
                  type="range"
                  min={20}
                  max={80}
                  value={group.labelCapPx}
                  onChange={(e) => patchGroup(group.id, { labelCapPx: Number(e.target.value) })}
                />
                <em>{group.labelCapPx}</em>
              </label>
              <label className="field">
                <span>Item letter-spacing</span>
                <input
                  type="range"
                  min={-2}
                  max={16}
                  value={Math.round(group.labelTracking * 100)}
                  onChange={(e) => patchGroup(group.id, { labelTracking: Number(e.target.value) / 100 })}
                />
                <em>{group.labelTracking.toFixed(2)}</em>
              </label>
              <label className="field">
                <span>Price size</span>
                <input
                  type="range"
                  min={20}
                  max={80}
                  value={group.digitPx}
                  onChange={(e) => patchGroup(group.id, { digitPx: Number(e.target.value) })}
                />
                <em>{group.digitPx}</em>
              </label>
              {group.suffix.trim() && (
                <>
                  <label className="field">
                    <span>Text after price</span>
                    <input
                      type="text"
                      value={group.suffix}
                      onChange={(e) => patchGroup(group.id, { suffix: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Its size</span>
                    <input
                      type="range"
                      min={14}
                      max={60}
                      value={group.suffixCapPx}
                      onChange={(e) => patchGroup(group.id, { suffixCapPx: Number(e.target.value) })}
                    />
                    <em>{group.suffixCapPx}</em>
                  </label>
                </>
              )}
              <label className="field">
                <span>Nudge left / right</span>
                <input
                  type="range"
                  min={-120}
                  max={120}
                  value={group.offsetX}
                  onChange={(e) => patchGroup(group.id, { offsetX: Number(e.target.value) })}
                />
                <em>{group.offsetX}</em>
              </label>
              <label className="field">
                <span>Nudge up / down</span>
                <input
                  type="range"
                  min={-120}
                  max={120}
                  value={group.offsetY}
                  onChange={(e) => patchGroup(group.id, { offsetY: Number(e.target.value) })}
                />
                <em>{group.offsetY}</em>
              </label>
              <label className="field">
                <span>Item colour</span>
                <input
                  type="color"
                  value={group.labelColor}
                  onChange={(e) => patchGroup(group.id, { labelColor: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Price colour</span>
                <input
                  type="color"
                  value={group.color}
                  onChange={(e) => patchGroup(group.id, { color: e.target.value })}
                />
              </label>
            </details>
          </section>
        ))}

        {config.blocks.map((block) => (
          <section key={block.id}>
            <h3>{block.title}</h3>
            {block.lines.map((line) => (
              <input
                key={line.id}
                className="line-input"
                type="text"
                value={line.text}
                onChange={(e) => setBlockLine(block.id, line.id, e.target.value)}
              />
            ))}
            <details className="tuning">
              <summary>Placement</summary>
              <label className="field">
                <span>Nudge left / right</span>
                <input
                  type="range"
                  min={-160}
                  max={160}
                  value={block.offsetX}
                  onChange={(e) => patchBlock(block.id, { offsetX: Number(e.target.value) })}
                />
                <em>{block.offsetX}</em>
              </label>
              <label className="field">
                <span>Nudge up / down</span>
                <input
                  type="range"
                  min={-160}
                  max={160}
                  value={block.offsetY}
                  onChange={(e) => patchBlock(block.id, { offsetY: Number(e.target.value) })}
                />
                <em>{block.offsetY}</em>
              </label>
            </details>
          </section>
        ))}

        <section>
          <h3>Numbers &amp; caps font</h3>
          <p className="hint">Prices, hours and notices. Every font is built into the app.</p>
          <div className="picker">
            {FONT_CHOICES.map((f) => (
              <button
                key={f.id}
                className={config.fontFamily === f.stack ? 'active' : ''}
                onClick={() => patch({ fontFamily: f.stack, fontWeight: f.weight })}
              >
                <span className="meta">
                  <span className="name">{f.label}</span>
                  <span className="note">{f.note}</span>
                </span>
                <span className="sample" style={{ fontFamily: f.stack, fontWeight: f.weight }}>
                  $22.70
                </span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3>Item name font</h3>
          <p className="hint">The calligraphic face for dish names, like the printed sign.</p>
          <div className="picker">
            {FONT_CHOICES.map((f) => (
              <button
                key={`label-${f.id}`}
                className={config.labelFontFamily === f.stack ? 'active' : ''}
                onClick={() => patch({ labelFontFamily: f.stack, labelFontWeight: f.weight })}
              >
                <span className="meta">
                  <span className="name">{f.label}</span>
                </span>
                <span className="sample" style={{ fontFamily: f.stack, fontWeight: f.weight }}>
                  Combo Mix
                </span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3>Price finish</h3>
          {finishPicker(config.priceFinish, (next) => patch({ priceFinish: next }))}
        </section>

        <section>
          <h3>Everything-else finish</h3>
          <p className="hint">Item names, hours and the payment notice.</p>
          {finishPicker(config.textFinish, (next) => patch({ textFinish: next }))}
          <label className="field">
            <span>Dark halo for legibility</span>
            <input type="checkbox" checked={config.halo} onChange={(e) => patch({ halo: e.target.checked })} />
          </label>
          <label className="field">
            <span>Small caps (as the sign was set)</span>
            <input
              type="checkbox"
              checked={config.smallCaps}
              onChange={(e) => patch({ smallCaps: e.target.checked })}
            />
          </label>
          <label className="field">
            <span>Small cap height</span>
            <input
              type="range"
              min={55}
              max={100}
              value={Math.round(config.smallCapScale * 100)}
              onChange={(e) => patch({ smallCapScale: Number(e.target.value) / 100 })}
            />
            <em>{Math.round(config.smallCapScale * 100)}%</em>
          </label>
          <label className="field">
            <span>Dotted leaders to prices</span>
            <input type="checkbox" checked={config.leaders} onChange={(e) => patch({ leaders: e.target.checked })} />
          </label>
        </section>

        <section>
          <h3>Clock bar</h3>
          <label className="field">
            <span>Show clock bar</span>
            <input
              type="checkbox"
              checked={config.clock.enabled}
              onChange={(e) => patch({ clock: { ...config.clock, enabled: e.target.checked } })}
            />
          </label>
          <label className="field">
            <span>Show seconds</span>
            <input
              type="checkbox"
              checked={config.clock.seconds}
              onChange={(e) => patch({ clock: { ...config.clock, seconds: e.target.checked } })}
            />
          </label>
          <label className="field">
            <span>Logo in the bar</span>
            <input
              type="checkbox"
              checked={config.clock.logo}
              onChange={(e) => patch({ clock: { ...config.clock, logo: e.target.checked } })}
            />
          </label>
          <label className="field">
            <span>Logo size</span>
            <input
              type="range"
              min={30}
              max={100}
              value={Math.round(config.clock.logoScale * 100)}
              onChange={(e) => patch({ clock: { ...config.clock, logoScale: Number(e.target.value) / 100 } })}
            />
            <em>{Math.round(config.clock.logoScale * 100)}%</em>
          </label>
          <label className="field">
            <span>Bar height</span>
            <input
              type="range"
              min={0}
              max={200}
              value={config.clock.height}
              onChange={(e) => patch({ clock: { ...config.clock, height: Number(e.target.value) } })}
            />
            <em>{config.clock.height}</em>
          </label>
          <label className="field">
            <span>Also keep logo on the sign</span>
            <input
              type="checkbox"
              checked={config.logoOnSign}
              onChange={(e) => patch({ logoOnSign: e.target.checked })}
            />
          </label>
        </section>

        <section>
          <h3>Weather</h3>
          <label className="field">
            <span>Show weather in the bar</span>
            <input
              type="checkbox"
              checked={config.weather.enabled}
              onChange={(e) => patch({ weather: { ...config.weather, enabled: e.target.checked } })}
            />
          </label>
          <label className="field">
            <span>Show today's high / low</span>
            <input
              type="checkbox"
              checked={config.weather.showRange}
              onChange={(e) => patch({ weather: { ...config.weather, showRange: e.target.checked } })}
            />
          </label>
          <label className="field">
            <span>Units</span>
            <select
              value={config.weather.units}
              onChange={(e) =>
                patch({
                  weather: { ...config.weather, units: e.target.value as 'fahrenheit' | 'celsius' }
                })
              }
            >
              <option value="fahrenheit">°F</option>
              <option value="celsius">°C</option>
            </select>
          </label>

          <p className="hint">
            Showing <strong>{config.weather.place.name}</strong>
            {config.weather.place.admin ? `, ${config.weather.place.admin}` : ''}. Type a city or ZIP to
            change it.
          </p>
          <div className="search-row">
            <input
              type="text"
              placeholder="City, ZIP or area"
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runPlaceSearch();
              }}
            />
            <button onClick={runPlaceSearch}>Search</button>
          </div>
          {placeStatus && <p className="hint">{placeStatus}</p>}
          {placeResults && placeResults.length > 0 && (
            <div className="place-results">
              {placeResults.map((place) => (
                <button
                  key={`${place.latitude},${place.longitude}`}
                  onClick={() => {
                    patch({ weather: { ...config.weather, place } });
                    setPlaceResults(null);
                    setPlaceQuery('');
                  }}
                >
                  {place.name}
                  {place.admin ? `, ${place.admin}` : ''}
                  {place.country ? ` · ${place.country}` : ''}
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3>Living beach</h3>
          {sceneUnavailable && <p className="hint">Sky lighting could not start. Your original beach is playing with basic lighting so your board stays visible. <button onClick={onRetryScene}>Try live scene again</button></p>}
          <p className="hint">Your original beach follows the real Minneapolis sun: gradual dawn, daylight, golden hour, blue hour and night. The same clouds remain in place as sunlight and reflections change.</p>
          <label className="field">
            <span>Lighting</span>
            <select aria-label="Background lighting" value={config.ambience} onChange={e => patch({ ambience: e.target.value as BoardConfig['ambience'] })}>
              <option value="auto">Automatic · Minneapolis</option>
              <option value="dawn">Dawn</option>
              <option value="day">Daylight</option>
              <option value="sunset">Sunset</option>
              <option value="night">Moonlight</option>
              <option value="original">Original video</option>
            </select>
          </label>
          {!config.videoSrc&&config.ambience!=='original'&&<div className="solar-preview-controls">
            {dayPreview?<>
              <label className="field"><span>Preview · {dayPreview.time}</span>
                <input aria-label="Preview time of day" type="range" min="0" max="1" step="0.001" value={dayPreview.progress} onChange={e=>onPreviewSeek?.(Number(e.target.value))}/>
              </label>
              <div className="row"><button onClick={onPreviewPlay}>{dayPreview.running?'Pause preview':'Play preview'}</button><button className="ghost" onClick={onFinishPreview}>Finish preview</button></div>
            </>:<button className="ghost" onClick={onPreviewDay}>Preview a day</button>}
            <p className="hint">Preview compresses today's sunlight into 90 seconds. Automatic lighting follows the actual time throughout the day.</p>
          </div>}
          <label className="field">
            <span>Cloud-like headings</span>
            <input type="checkbox" checked={config.cloudHeadings} onChange={e => patch({ cloudHeadings: e.target.checked })} />
          </label>
          <label className="field">
            <span>Animate the scene</span>
            <input type="checkbox" checked={config.ambienceMotion} onChange={e => patch({ ambienceMotion: e.target.checked })} />
          </label>
          <p className="hint">Custom videos play as uploaded. Choose the living scene to restore the animated coast.</p>
          <div className="row">
            <button onClick={onPickVideo}>Choose video…</button>
            <button className="ghost" onClick={() => patch({ videoSrc: null, ambience: 'auto' })}>
              Use living scene
            </button>
          </div>
          <label className="field">
            <span>Sign fills the screen</span>
            <select
              value={config.signFit}
              onChange={(e) => patch({ signFit: e.target.value as 'fill' | 'fit' })}
            >
              <option value="fill">Fill (edge to edge)</option>
              <option value="fit">Fit (keep 16:9)</option>
            </select>
          </label>
          <label className="field">
            <span>Video fill mode</span>
            <select
              value={config.videoFit}
              onChange={(e) => patch({ videoFit: e.target.value as 'cover' | 'contain' })}
            >
              <option value="cover">Fill screen (crop)</option>
              <option value="contain">Fit whole video</option>
            </select>
          </label>
        </section>

        {bridge?.getUpdateState && (
          <section>
            <h3>Software updates</h3>
            <p className="hint">
              Version {update?.version || ''} · updates arrive automatically over the internet and install
              overnight while the restaurant is closed.
            </p>
            <div className="update-status">
              <span className={`dot dot-${update?.status || 'idle'}`} />
              <span>
                {update ? UPDATE_LABEL[update.status] : 'Up to date'}
                {update?.status === 'downloading' && typeof update.percent === 'number'
                  ? ` ${update.percent}%`
                  : ''}
              </span>
            </div>
            <div className="row">
              <button onClick={() => bridge.checkForUpdate?.()}>Check now</button>
              {update?.status === 'ready' && (
                <button className="apply" onClick={() => bridge.applyUpdate?.()}>
                  Restart &amp; update
                </button>
              )}
            </div>
          </section>
        )}

        <section>
          <h3>Settings file</h3>
          <div className="row">
            <button onClick={exportConfig}>Export</button>
            <button onClick={() => fileRef.current?.click()}>Import</button>
            <button
              className="danger"
              onClick={() => {
                if (window.confirm('Reset the whole board back to the original sign?')) {
                  onChange(structuredClone(DEFAULT_CONFIG));
                }
              }}
            >
              Reset all
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importConfig(file);
              e.target.value = '';
            }}
          />
        </section>
      </div>

      <footer className="dash-foot">Saves automatically · Esc closes · F fullscreen</footer>
    </aside>
  );
}
