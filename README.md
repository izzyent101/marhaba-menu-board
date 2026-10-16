# Marhaba Grill — Menu Board 2.0

A fullscreen digital menu board for the shop TV. The background is a looping
video; the sign artwork sits on top of it; every price is live text you can
change from a dashboard on the screen — no Photoshop, no re-export.

## What's on screen

| Layer | Where it comes from |
| --- | --- |
| Looping video | `src/assets/background.mp4` (swap it any time from the dashboard) |
| Heading artwork | `src/assets/headings.png` — the two chrome headings lifted out of `pricing_Sign.psd`, transparent so the video shows through |
| All text | Item names, prices, hours and notices, drawn live at the coordinates measured from the PSD |
| Clock bar | Strip across the top: date and animated weather on the left, logo centred, time right |

Takeout lines are drawn as two fixed slots, exactly as they sit on the sign: the
amount right-aligned ending at x=1608, and `per Pound` always filling 1624–1914.

The logo has moved from the bottom-left of the sign into the middle of the clock
bar. Put it back on the sign any time with **Also keep logo on the sign**.

## Running it

**On the shop PC (what you want):**

1. Copy this folder to the Windows PC.
2. Install Node.js if it isn't there yet: <https://nodejs.org> (LTS).
3. Double-click `build_exe.bat` — it installs everything and builds the installer.
4. The installer lands in `release\`. Run it, then launch **Marhaba Menu Board**.

The packaged app opens fullscreen, blocks all network access, and keeps the
display from sleeping.

**Just to look at it quickly:** `start_app.bat` runs it as a desktop window
without packaging.

**On any computer, in a browser:** `npm install` then `npm run dev`, open the
address it prints.

## Editing the board

- Move the mouse — the **Edit board** button appears in the corner.
- Or press **D** (or **E**) at any time.
- Change any price, any item name, any line of the hours or the notice; the sign
  updates as you type and saves automatically.
- The sign shrinks beside the panel while it's open, so you can see the change.
- **Esc** closes the panel. **F** toggles fullscreen.

Everything saves to the app's local storage on that PC. Use **Export** in the
dashboard to keep a backup of your prices, **Import** to restore them.

## Swapping the background video

Drag any `.mp4` onto the screen, or use **Choose video…** in the dashboard.
The desktop app copies the file into its own folder, so it keeps playing after
a restart. "Use bundled video" puts the original clip back.

Best results: 1920×1080, H.264, no audio, and a clip that loops cleanly.

## Fine-tuning

Each section has a **Type & placement** drawer: item and price sizes, letter
spacing, colours, and nudges for the whole block. Useful if you ever redraw the
heading artwork and the columns need to move with it.

## Everything on screen is live text

Only two things on the board are still images: the chrome **"All You Can Eat
Buffet"** and **"Take out (By Weight)"** headings, and the logo. Every other
mark — item names, prices, `per Pound`, the hours, the payment notice, the
red Gyro/Kabob note — is type drawn by the app from `src/config.ts`, and every
line of it is editable in the dashboard.

That means the whole board changes typeface together, sits on one shared
baseline grid, and can never go stale the way a flattened PNG does.

Typographic decisions baked into the defaults:

- **Small caps.** The sign was set in Copperplate and Bodoni Small Caps, where
  lowercase letters are drawn as capitals at about 72% height. That is what
  keeps the hours column narrow enough to live in the far-left margin. The app
  reproduces it for whatever font you pick — without it, all-caps type runs
  nearly three times wider and the left column bloats toward the middle.
- **Lanes.** Every line carries the width it occupied in the PSD. A wide font is
  condensed into that lane rather than pushed into its neighbour, so the
  composition — hours hard left, prices hard right — holds for every typeface.

- **One shared baseline per row.** On the printed sign the item names sat 3px
  off the prices. They now sit on exactly the same line.
- **Cap heights, not font sizes.** Each line specifies how tall its capitals
  should be; the app measures the installed font and scales to hit it. Swap the
  typeface and the layout does not move.
- **Hierarchy in the hours block.** Day ranges are small and widely tracked so
  they read as headers, meal names carry the weight, times stay in the accent
  red.
- **Tracking.** Small caps and short all-cap lines are letter-spaced; large
  display lines are not.
- **Hard lanes.** Every slot has a left limit, so a wide typeface condenses
  slightly instead of colliding with its neighbour.

## Fonts

Pick one in the dashboard under **Typeface** — each option shows a live
`$22.70` sample. All are bundled inside the app, so they render identically on
any machine with no internet.

| Font | Character |
| --- | --- |
| **Cinzel** *(default)* | Roman inscription caps — the classic upmarket menu look |
| **Copperplate Light** | The original sign font, using whatever Copperplate the machine has |
| **Cormorant Small Caps** | Fine and high-contrast, very elegant |
| **Playfair Display** | Bold editorial contrast — reads best from across the room |
| **Bodoni Moda** | Matches the Bodoni that was in your hours block |
| **Marcellus Small Caps** | Warm carved-stone feel, softer than Cinzel |
| **Georgia** | Plain and dependable |

## Finishes

Set separately for the prices and for everything else:

- **Clean** — flat ink with a soft halo
- **Engraved** — a bright edge below and a dark edge above, so the letters read
  as cut into the surface. Strongest over bright video. *(default for text)*
- **Chrome** — polished-silver gradient with a thin dark keyline, matching the
  heading artwork. *(default for prices)*

Two switches sit alongside them:

- **Dark halo** — a soft shadow under all type. Leave it on unless the video is
  very dark.
- **Dotted leaders** — a faint dotted line running from each item name to its
  price. Off by default; a classic menu touch if you want it.

## Weather

The info bar shows live conditions with a hand-drawn animated icon — the sun's
rays turn, clouds drift, rain falls, the lightning bolt flashes, stars twinkle
at night. Eight conditions: clear (day and night), partly cloudy, overcast, fog,
drizzle, rain, snow and thunderstorm.

Set the location in the dashboard under **Weather**: type a city, area or ZIP,
press Search, pick from the matches. Defaults to Minneapolis. °F or °C, and
today's high/low can be hidden.

Data comes from [Open-Meteo](https://open-meteo.com) — free, no API key, no
account. It refreshes every 15 minutes and caches the last reading, so if the
shop's internet drops the board keeps showing the last known conditions instead
of a gap.

**Note on the offline lockdown:** the desktop app still blocks all network
traffic except two hosts, `api.open-meteo.com` and `geocoding-api.open-meteo.com`
(see `electron/main.cjs`). Turn the weather off in the dashboard and the board is
fully offline again.

## The video

Plays on a plain loop. Nothing is done to it — no fades, no zoom, no filters.
Drag any `.mp4` onto the screen or use **Choose video…**. The desktop app copies
the file into its own folder so it keeps playing after a restart.

Best results: 1920×1080, H.264, no audio, and a clip that loops cleanly.

## Project layout

```
src/
  App.tsx                 board shell: video, stage scaling, keyboard, drag & drop
  config.ts               every word on the board + the coordinates from the PSD
  useFontMetrics.ts       measures the installed font so digit height is exact
  components/
    BoardCanvas.tsx       draws all board type on the PSD baselines
    ClockBar.tsx          date, weather, logo and time strip
    WeatherIcon.tsx       animated SVG weather icons
    Dashboard.tsx         the editor panel
  fonts.ts                bundled display fonts
  weather.ts              Open-Meteo forecast + place search, with caching
  assets/
    background.mp4        looping background
    headings.png          the two chrome headings, transparent
    logo.png              Marhaba Grill logo cut out of the PSD
electron/
  main.cjs                window, fullscreen, offline lockdown, video storage
  preload.cjs             bridge for saving the chosen video
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server in the browser |
| `npm run start:electron` | Run as a desktop window |
| `npm run dist:win` | Build the Windows installer + portable exe into `release/` |
| `npm run build:preview` | Build the single-file `preview/index.html` (everything inlined) |

## Living coast (v2.2)

The default background is a live coastal environment. A GPU shader renders the moving ocean, reflected sky, clouds, shore foam, sun, moon and stars together; the bundled palm-grove asset responds to wind and scene lighting. Automatic mode uses Minneapolis sun/moon positions calculated locally, including seasonal daylight, without an additional network service.

In **Edit board → Living beach**, choose Automatic, Dawn, Daylight, Sunset or Moonlight. **Animate the scene** pauses environmental movement; reduced-motion preferences are also respected. **Original video** restores the previous bundled loop. A selected custom video plays unchanged; **Use living scene** switches back to the live coast.

Existing saved prices, layout and fonts are retained. Original charcoal item labels switch to cream during twilight for readability; custom label colors remain unchanged. If the graphics renderer is unavailable or loses its context, the bundled video keeps the board visible and the editor offers a retry button.

The renderer caps output resolution and frame rate, pauses while hidden, and reduces resolution on slower hardware. Validation includes solar timing across seasons and daylight saving changes, browser rendering, motion/reduced motion, graphics failure fallback, resize and original-video selection.
