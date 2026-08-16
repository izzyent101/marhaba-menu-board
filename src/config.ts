/**
 * Layout + content for the Marhaba Grill menu board.
 *
 * Everything on screen except the two chrome heading graphics is live text,
 * drawn from this file. All coordinates are in "design space": the original
 * sign is 1920 x 1080, and every position here was measured from
 * pricing_Sign.psd, so the board keeps the composition of the printed sign
 * while the type itself is set properly.
 *
 *   baseline  = y the text sits on
 *   capPx     = cap height in design px; the app measures the chosen font at
 *               runtime and scales it so caps are exactly this tall, whatever
 *               font is installed
 *   tracking  = letter-spacing in em
 */

import { DEFAULT_WEATHER, WeatherConfig } from './weather';

export const DESIGN_WIDTH = 1920;
export const DESIGN_HEIGHT = 1080;

export type TextFinish = 'plain' | 'engraved' | 'chrome';
export type Align = 'left' | 'right' | 'center';

/** Over-the-air update status reported by the Electron shell. */
export interface UpdateState {
  status: 'idle' | 'checking' | 'current' | 'downloading' | 'ready' | 'error';
  version?: string;
  info?: { version?: string } | null;
  percent?: number;
  message?: string;
}

/** The ink palette, kept in one place so the whole board stays consistent. */
export const INK = {
  ivory: '#f4f7fb',
  ivoryDim: '#e8edf4',
  /** the charcoal the sign used for item names */
  charcoal: '#2c2c2c',
  red: '#eb351e',
  price: '#f5f5f5'
};

/** 'small' draws lowercase as capitals at smallCapScale; 'normal' leaves it as typed. */
export type CaseStyle = 'small' | 'normal';

export interface TextLine {
  id: string;
  text: string;
  caps?: CaseStyle;
  x: number;
  baseline: number;
  capPx: number;
  color: string;
  align: Align;
  tracking: number;
  finish?: TextFinish;
  maxWidth?: number;
}

export interface TextBlock {
  id: string;
  title: string;
  /** shifts the whole block without touching each line */
  offsetX: number;
  offsetY: number;
  /** draw a soft luminous panel behind the block so it stands out clearly */
  highlight?: boolean;
  lines: TextLine[];
}

export interface PriceRow {
  id: string;
  label: string;
  value: number;
  /** shared by the label and the amount, so they sit on one line */
  baseline: number;
}

export interface PriceGroupConfig {
  id: string;
  title: string;
  // --- item labels ---
  labelX: number;
  labelCapPx: number;
  labelColor: string;
  labelTracking: number;
  labelMaxWidth: number;
  /** the sign set item names in mixed-case calligraphic, not small caps */
  labelCaps: CaseStyle;
  // --- amounts ---
  rightX: number;
  minLeftX: number;
  digitPx: number;
  color: string;
  tracking: number;
  // --- "per Pound" slot ---
  suffix: string;
  suffixRightX: number;
  suffixLeftX: number;
  suffixCapPx: number;
  suffixColor: string;
  suffixTracking: number;
  /** on the sign "per Pound" starts at suffixLeftX on every line */
  suffixAlign: Align;
  // --- nudge ---
  offsetX: number;
  offsetY: number;
  rows: PriceRow[];
}

export interface ClockConfig {
  enabled: boolean;
  height: number;
  dateColor: string;
  timeColor: string;
  barColor: string;
  seconds: boolean;
  tracking: number;
  logo: boolean;
  logoScale: number;
}

export interface BoardConfig {
  version: number;
  /** face for numbers, hours, notices - everything set in small caps */
  fontFamily: string;
  fontWeight: number;
  /** face for item names and other mixed-case text, like the sign's calligraphic lettering */
  labelFontFamily: string;
  labelFontWeight: number;
  /** finish for the amounts */
  priceFinish: TextFinish;
  /** finish for item labels, hours and notices */
  textFinish: TextFinish;
  /** soft dark halo under all type, for legibility over bright video */
  halo: boolean;
  /** lowercase drawn as capitals at smallCapScale, the way the sign was set */
  smallCaps: boolean;
  smallCapScale: number;
  /** faint dotted line from each item to its price */
  leaders: boolean;
  /**
   * 'fill' stretches the sign across the whole screen under the clock bar, the
   * way the printed sign fills the frame - hours hard against the left edge,
   * prices hard against the right. 'fit' keeps the 16:9 proportions and
   * letterboxes instead.
   */
  signFit: 'fill' | 'fit';
  videoFit: 'cover' | 'contain';
  videoSrc: string | null;
  overlaySrc: string | null;
  clock: ClockConfig;
  weather: WeatherConfig;
  logoOnSign: boolean;
  groups: PriceGroupConfig[];
  blocks: TextBlock[];
}

export interface FontChoice {
  id: string;
  label: string;
  note: string;
  stack: string;
  weight: number;
}

/**
 * Fonts offered for the board. The first uses whatever Copperplate the machine
 * has (the true match for the printed sign); the rest are bundled with the app,
 * so they render identically everywhere with no internet.
 */
export const FONT_CHOICES: FontChoice[] = [
  {
    id: 'cormorant',
    label: 'Cormorant Garamond',
    note: 'Closest to the sign — calligraphic, with true lowercase for item names',
    stack: '"Cormorant Garamond", "Cormorant SC", Garamond, Georgia, serif',
    weight: 600
  },
  {
    id: 'cinzel',
    label: 'Cinzel',
    note: 'Roman inscription caps — the classic upmarket menu look',
    stack: 'Cinzel, "Trajan Pro", Copperplate, Georgia, serif',
    weight: 600
  },
  {
    id: 'copperplate-light',
    label: 'Copperplate Light',
    note: 'The original sign font',
    stack: '"Copperplate Gothic Light", Copperplate, "Copperplate Gothic", Cinzel, Georgia, serif',
    weight: 300
  },
  {
    id: 'cormorant-sc',
    label: 'Cormorant Small Caps',
    note: 'Fine, high-contrast, very elegant',
    stack: '"Cormorant SC", "Cormorant Garamond", Garamond, Georgia, serif',
    weight: 600
  },
  {
    id: 'playfair',
    label: 'Playfair Display',
    note: 'Bold editorial contrast — reads best from across the room',
    stack: '"Playfair Display", Georgia, serif',
    weight: 600
  },
  {
    id: 'bodoni',
    label: 'Bodoni Moda',
    note: 'Matches the Bodoni in your hours block',
    stack: '"Bodoni Moda", "Bodoni MT", Didot, Georgia, serif',
    weight: 600
  },
  {
    id: 'marcellus',
    label: 'Marcellus Small Caps',
    note: 'Warm carved-stone feel, softer than Cinzel',
    stack: '"Marcellus SC", Copperplate, Georgia, serif',
    weight: 400
  },
  {
    id: 'georgia',
    label: 'Georgia',
    note: 'Plain and dependable',
    stack: 'Georgia, "Times New Roman", serif',
    weight: 400
  }
];

export const FINISHES: { id: TextFinish; label: string; note: string }[] = [
  { id: 'plain', label: 'Clean', note: 'Flat ink with a soft halo' },
  { id: 'engraved', label: 'Engraved', note: 'Cut-in edge — strongest over bright video' },
  { id: 'chrome', label: 'Chrome', note: 'Polished silver, matching the headings' }
];

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

/**
 * Hours block, at the original sign's geometry: hard against the left margin
 * at x=14, on the same baselines, and inside the same line widths. `lane` is
 * the width that line occupied in the PSD - the renderer condenses into it
 * rather than letting a wide font push the column toward the middle.
 */
/**
 * Hours block: right of the far-left canopy (tree tops sit at y≈474 for x<160;
 * from x≈180 the canopy starts at y≈612+). Each line is centred on the block's
 * own axis, sized up ~15% from the sign.
 */
const HOURS_CENTER = 310;
const hoursLine = (
  id: string,
  text: string,
  baseline: number,
  lane: number,
  kind: 'label' | 'time'
): TextLine => ({
  id,
  text,
  x: HOURS_CENTER,
  baseline,
  capPx: kind === 'time' ? 31 : 39,
  color: kind === 'time' ? INK.red : INK.ivory,
  align: 'center',
  tracking: kind === 'time' ? 0.04 : 0.02,
  maxWidth: Math.round(lane * 1.15)
});

/**
 * Payment notice - placed on the open sand in the bottom-left of the wave
 * video, in charcoal so it reads on the bright sand. Foliage ends by y=830
 * there, so the block sits fully clear of the trees.
 */
const noticeLine = (id: string, text: string, baseline: number, lane: number): TextLine => ({
  id,
  text,
  x: 50,
  baseline,
  capPx: 18,
  color: '#fdf6e6', // warm cream, floated on a dark glow so it pops off the sand

  align: 'left',
  tracking: 0.03,
  maxWidth: lane
});

export const DEFAULT_CONFIG: BoardConfig = {
  version: 17,
  // numbers + small caps in Cinzel (clean lining figures, like the sign's Copperplate);
  // item names in Cormorant Garamond (calligraphic, true lowercase)
  fontFamily: FONT_CHOICES[1].stack,
  fontWeight: FONT_CHOICES[1].weight,
  labelFontFamily: FONT_CHOICES[0].stack,
  labelFontWeight: FONT_CHOICES[0].weight,
  priceFinish: 'plain',
  textFinish: 'plain',
  halo: false,
  smallCaps: true,
  smallCapScale: 0.72,
  leaders: false,
  signFit: 'fill',
  videoFit: 'cover',
  videoSrc: null,
  overlaySrc: null,
  clock: {
    enabled: true,
    height: 96,
    dateColor: INK.ivory,
    timeColor: INK.ivory,
    barColor: 'rgba(0,0,0,0.45)',
    seconds: true,
    tracking: 0.12,
    logo: true,
    logoScale: 0.82
  },
  weather: DEFAULT_WEATHER,
  logoOnSign: false,
  groups: [
    {
      id: 'buffet',
      title: 'All You Can Eat Buffet',
      labelX: 1093,
      labelCapPx: 58,
      labelColor: INK.charcoal,
      labelTracking: 0.015,
      labelMaxWidth: 478,
      labelCaps: 'normal',
      rightX: 1913,
      minLeftX: 1640,
      digitPx: 46,
      color: INK.price,
      tracking: 0.01,
      suffix: '',
      suffixRightX: 0,
      suffixLeftX: 0,
      suffixCapPx: 0,
      suffixColor: INK.price,
      suffixTracking: 0,
      suffixAlign: 'right',
      offsetX: 0,
      offsetY: 0,
      rows: [
        { id: 'lunch', label: 'Lunch', value: 22.7, baseline: 229 },
        { id: 'dinner', label: 'Dinner', value: 26.01, baseline: 312 },
        { id: 'kids24', label: 'Kids (Aged 2-4)', value: 9.0, baseline: 395 },
        { id: 'kids57', label: 'Kids (Aged 5-7)', value: 11.97, baseline: 478 },
        { id: 'kids810', label: 'Kids (Aged 8-10)', value: 15.94, baseline: 561 }
      ]
    },
    {
      id: 'takeout',
      title: 'Take Out (By Weight)',
      labelX: 975,
      labelCapPx: 43,
      labelColor: INK.charcoal,
      labelTracking: 0.015,
      labelMaxWidth: 310,
      labelCaps: 'normal',
      // amounts end at 1608; "per Pound" always occupies 1624-1914
      rightX: 1608,
      minLeftX: 1420,
      digitPx: 36,
      color: INK.price,
      tracking: 0.01,
      suffix: 'per Pound',
      suffixRightX: 1914,
      suffixLeftX: 1624,
      suffixCapPx: 34,
      suffixColor: INK.price,
      suffixTracking: 0.03,
      suffixAlign: 'left',
      offsetX: 0,
      offsetY: 0,
      rows: [
        { id: 'salad', label: 'Salad', value: 7.49, baseline: 744 },
        { id: 'comboMix', label: 'Combo Mix', value: 8.49, baseline: 809 },
        { id: 'mainlyMeat', label: 'Mainly Meat', value: 10.49, baseline: 874 },
        { id: 'meatOnly', label: 'Meat Only', value: 12.99, baseline: 940 },
        { id: 'dessert', label: 'Dessert', value: 13.25, baseline: 1005 },
        { id: 'seafood', label: 'Seafood', value: 13.99, baseline: 1070 }
      ]
    }
  ],
  blocks: [
    {
      id: 'hours',
      title: 'Hours',
      offsetX: 0,
      offsetY: 0,
      lines: [
        // compacted so the whole block clears the tree line in the wave video
        // (canopy tops: y=474 at the far left, y=641 under the notice)
        hoursLine('h1', 'Mon - Thurs', 54, 222, 'label'),
        hoursLine('h2', 'Lunch', 112, 121, 'label'),
        hoursLine('h3', '11am-2pm', 170, 215, 'time'),
        hoursLine('h4', 'Dinner', 228, 142, 'label'),
        hoursLine('h5', '2pm-Close', 286, 250, 'time'),
        hoursLine('h6', 'Fri - Sun', 344, 161, 'label'),
        hoursLine('h7', 'Dinner', 402, 142, 'label'),
        hoursLine('h8', 'All Day', 460, 186, 'time')
      ]
    },
    {
      id: 'notice',
      title: 'Payment notice',
      offsetX: 0,
      offsetY: 0,
      highlight: true,
      lines: [
        noticeLine('n1', 'All transactions', 898, 158),
        noticeLine('n2', 'include a built-in', 926, 161),
        noticeLine('n3', 'non-cash adjustment.', 954, 196),
        noticeLine('n4', 'Pay with cash', 982, 126),
        noticeLine('n5', 'to receive', 1010, 93),
        noticeLine('n6', 'a discount of 3.15%', 1038, 180)
      ]
    },
    {
      id: 'annotation',
      title: 'Mainly Meat note',
      offsetX: 0,
      offsetY: 0,
      lines: [
        {
          id: 'a1',
          text: '(Gyro, Kabob,',
          x: 1296,
          baseline: 845,
          capPx: 17,
          color: INK.red,
          align: 'left',
          tracking: 0.02,
          maxWidth: 118
        },
        {
          id: 'a2',
          text: 'Lamb Shank)',
          x: 1296,
          baseline: 867,
          capPx: 17,
          color: INK.red,
          align: 'left',
          tracking: 0.02,
          maxWidth: 118
        }
      ]
    }
  ]
};

export const STORAGE_KEY = 'marhaba_board_config_v17';

export const formatMoney = (value: number) =>
  `$${(Number.isFinite(value) ? value : 0).toFixed(2)}`;

/** Merge a stored config over the defaults so new fields always exist. */
export function normalizeConfig(input: unknown): BoardConfig {
  if (!input || typeof input !== 'object') return structuredClone(DEFAULT_CONFIG);
  const raw = input as Partial<BoardConfig>;
  const base = structuredClone(DEFAULT_CONFIG);

  return {
    ...base,
    ...raw,
    clock: { ...base.clock, ...(raw.clock || {}) },
    weather: {
      ...base.weather,
      ...(raw.weather || {}),
      place: { ...base.weather.place, ...(raw.weather?.place || {}) }
    },
    groups: base.groups.map((group) => {
      const saved = raw.groups?.find((g) => g?.id === group.id);
      if (!saved) return group;
      return {
        ...group,
        ...saved,
        rows: group.rows.map((row) => {
          const savedRow = saved.rows?.find((r) => r?.id === row.id);
          if (!savedRow) return row;
          return {
            ...row,
            label: typeof savedRow.label === 'string' ? savedRow.label : row.label,
            value:
              typeof savedRow.value === 'number' && Number.isFinite(savedRow.value)
                ? savedRow.value
                : row.value,
            baseline:
              typeof savedRow.baseline === 'number' && Number.isFinite(savedRow.baseline)
                ? savedRow.baseline
                : row.baseline
          };
        })
      };
    }),
    blocks: base.blocks.map((block) => {
      const saved = raw.blocks?.find((b) => b?.id === block.id);
      if (!saved) return block;
      return {
        ...block,
        ...saved,
        highlight: block.highlight,
        lines: block.lines.map((line) => {
          const savedLine = saved.lines?.find((l) => l?.id === line.id);
          if (!savedLine) return line;
          return { ...line, ...savedLine };
        })
      };
    })
  };
}
