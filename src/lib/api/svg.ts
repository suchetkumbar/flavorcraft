import { TASTES, describeProfile, type TasteVector } from '../flavor/tastes';

/**
 * Standalone SVG drawings of a flavor profile. Unlike the React chart these
 * carry their own colors and need no stylesheet, so they work as an <img> on
 * someone else's site and can be turned into a PNG on the server.
 */

const INK = '#231B33';
const PAPER = '#F1F3EE';
const CARD = '#F8F8F4';
const RULE = '#D3D8CE';
const MUTED = '#6B6478';
const FONT = "'Bricolage Grotesque', 'Segoe UI', system-ui, -apple-system, sans-serif";

/** Characters XML allows: tab, newline, and everything printable. Control characters are not allowed at all. */
const xmlSafe = (ch: string) => {
  const c = ch.codePointAt(0) ?? 0;
  return c === 9 || c === 10 || c === 13 || (c >= 32 && c <= 0xd7ff) || (c >= 0xe000 && c <= 0xfffd) || c >= 0x10000;
};

/** Text from recipes and remixes is user-written: escape it before it goes into markup. */
export const escapeXml = (text: string): string =>
  [...text]
    .filter(xmlSafe)
    .join('')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const ELLIPSIS = String.fromCharCode(8230);

const N = TASTES.length;
const at = (i: number, value: number, radius: number): [number, number] => {
  const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
  const r = (Math.max(0.4, Math.min(10, value)) / 10) * radius;
  return [Math.cos(angle) * r, Math.sin(angle) * r];
};
const fmt = (n: number) => (Math.round(n * 10) / 10).toString();
const points = (v: number[], radius: number) => v.map((value, i) => at(i, value, radius).map(fmt).join(',')).join(' ');

interface RadarParts {
  vector: TasteVector;
  compare?: TasteVector;
  radius: number;
  labelSize: number;
  showValues?: boolean;
}

/** The chart itself, centered on 0,0. */
const radarGroup = ({ vector, compare, radius, labelSize, showValues }: RadarParts): string => {
  const rings = [0.25, 0.5, 0.75, 1]
    .map((f) => `<polygon points="${points(TASTES.map(() => f * 10), radius)}" fill="none" stroke="${RULE}" stroke-width="${f === 1 ? 1.5 : 1}"/>`)
    .join('');
  const spokes = TASTES.map((_, i) => {
    const [x, y] = at(i, 10, radius);
    return `<line x1="0" y1="0" x2="${fmt(x)}" y2="${fmt(y)}" stroke="${RULE}" stroke-width="1"/>`;
  }).join('');
  const outline = compare
    ? `<polygon points="${points(compare, radius)}" fill="none" stroke="${INK}" stroke-opacity="0.55" stroke-width="1.5" stroke-dasharray="5 4"/>`
    : '';
  const shape = `<polygon points="${points(vector, radius)}" fill="${INK}" fill-opacity="0.1" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
  const dots = TASTES.map((t, i) => {
    const [x, y] = at(i, vector[i], radius);
    return `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(radius * 0.035)}" fill="${t.color}"/>`;
  }).join('');
  const labels = TASTES.map((t, i) => {
    const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
    const x = Math.cos(angle) * (radius + labelSize * 1.5);
    const y = Math.sin(angle) * (radius + labelSize * 1.5);
    const anchor = Math.abs(x) < 1 ? 'middle' : x > 0 ? 'start' : 'end';
    const value = showValues ? ` <tspan fill="${MUTED}" font-weight="400">${fmt(vector[i])}</tspan>` : '';
    return `<text x="${fmt(x)}" y="${fmt(y + labelSize * 0.35)}" text-anchor="${anchor}" font-size="${labelSize}" font-weight="600" fill="${INK}">${t.label}${value}</text>`;
  }).join('');
  return `${rings}${spokes}${outline}${shape}${dots}${labels}`;
};

export interface ChartOptions {
  /** Shown under the chart, e.g. the recipe's name. */
  title?: string;
  /** Pixel width; the height follows. Clamped to 240–900. */
  size?: number;
}

/** A flavor chart for embedding: `<img src=".../chart.svg?ingredients=…">`. */
export const chartSvg = (vector: TasteVector, { title, size = 420 }: ChartOptions = {}): string => {
  const width = Math.max(240, Math.min(900, Math.round(size)));
  // Drawn on a fixed 420-wide canvas and scaled by the viewBox.
  const caption = title?.trim().slice(0, 70);
  const height = caption ? 470 : 430;
  const summary = describeProfile(vector);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 ${height}" width="${width}" height="${Math.round((width * height) / 420)}" role="img" font-family="${FONT}">`,
    `<title>${escapeXml(caption ? `${caption}: ` : '')}${escapeXml(summary)}</title>`,
    `<rect width="420" height="${height}" rx="14" fill="${CARD}" stroke="${RULE}"/>`,
    `<g transform="translate(210 205)">${radarGroup({ vector, radius: 104, labelSize: 13, showValues: true })}</g>`,
    caption ? `<text x="210" y="408" text-anchor="middle" font-size="16" font-weight="700" fill="${INK}">${escapeXml(caption)}</text>` : '',
    `<text x="210" y="${height - 22}" text-anchor="middle" font-size="12" fill="${MUTED}">${escapeXml(summary)}. Flavor chart by FlavorCraft</text>`,
    '</svg>',
  ].join('');
};

/** Breaks a title into lines of roughly `perLine` characters, ending with an ellipsis if it doesn't fit. */
export const wrapTitle = (title: string, perLine: number, maxLines: number): string[] => {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= perLine || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  const cut = lines.slice(0, maxLines).map((l) => (l.length > perLine + 4 ? l.slice(0, perLine + 3) + ELLIPSIS : l));
  if (lines.length > maxLines) cut[maxLines - 1] = cut[maxLines - 1].replace(/[.,;:!?]+$/, '') + ELLIPSIS;
  return cut;
};

export interface ShareCard {
  title: string;
  /** e.g. "A remix of Charred Cabbage with Miso Butter" */
  subtitle: string;
  /** e.g. "More sour, lighter" */
  change?: string;
  vector: TasteVector;
  /** The original recipe, drawn as a dashed outline. */
  compare?: TasteVector;
}

/** The 1200×630 image shown when a remix link is posted somewhere. */
export const shareCardSvg = ({ title, subtitle, change, vector, compare }: ShareCard): string => {
  const lines = wrapTitle(title, 17, 3);
  const titleSize = lines.length === 3 ? 62 : 72;
  const top = 250 - ((lines.length - 1) * titleSize * 1.08) / 2;
  const titleBlock = lines
    .map((l, i) => `<text x="72" y="${fmt(top + i * titleSize * 1.08)}" font-size="${titleSize}" font-weight="700" fill="${INK}">${escapeXml(l)}</text>`)
    .join('');
  const below = top + (lines.length - 1) * titleSize * 1.08;
  const total = vector.reduce((a, b) => a + b, 0) || 1;
  let x = 72;
  const band = TASTES.map((t, i) => {
    const w = (vector[i] / total) * 520;
    const rect = vector[i] > 0.5 ? `<rect x="${fmt(x)}" y="540" width="${fmt(w)}" height="10" fill="${t.color}"/>` : '';
    if (vector[i] > 0.5) x += w;
    return rect;
  }).join('');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" font-family="${FONT}">`,
    `<rect width="1200" height="630" fill="${PAPER}"/>`,
    `<text x="72" y="96" font-size="30" font-weight="700" fill="${INK}">FlavorCraft</text>`,
    titleBlock,
    `<text x="72" y="${fmt(below + 62)}" font-size="30" font-weight="500" fill="${MUTED}">${escapeXml(wrapTitle(subtitle, 40, 1)[0] ?? '')}</text>`,
    change ? `<text x="72" y="${fmt(below + 112)}" font-size="30" font-weight="700" fill="${INK}">${escapeXml(change)}</text>` : '',
    band,
    `<text x="72" y="584" font-size="22" font-weight="500" fill="${MUTED}">${escapeXml(describeProfile(vector))}</text>`,
    `<rect x="672" y="60" width="468" height="510" rx="20" fill="${CARD}" stroke="${RULE}" stroke-width="1.5"/>`,
    `<g transform="translate(906 315)">${radarGroup({ vector, compare, radius: 150, labelSize: 21 })}</g>`,
    '</svg>',
  ].join('');
};
