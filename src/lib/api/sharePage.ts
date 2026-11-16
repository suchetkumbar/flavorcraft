import { escapeXml } from './svg';

/**
 * The page link-preview crawlers get for a remix. They don't run JavaScript,
 * so the app's own page would show them the same title and picture for every
 * link. This one names the remix and points at its share image.
 */

export interface SharedRemix {
  title: string;
  note: string | null;
  removed: string[];
  added: string[];
}

const list = (words: string[]) => (words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`);

/** One sentence on what the remix changed, for the preview's description. */
export const describeRemix = (remix: SharedRemix): string => {
  const parts = [
    remix.added.length ? `adds ${list(remix.added.slice(0, 4).map((n) => n.toLowerCase()))}` : '',
    remix.removed.length ? `leaves out ${list(remix.removed.slice(0, 4).map((n) => n.toLowerCase()))}` : '',
  ].filter(Boolean);
  const changes = parts.length ? `This remix ${parts.join(' and ')}.` : 'A remix with its own flavor chart.';
  const note = remix.note?.trim().replace(/\s+/g, ' ');
  return (note ? `${note.slice(0, 140)}${note.length > 140 ? '…' : ''} ${changes}` : changes).slice(0, 300);
};

export const isRemixId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

interface SharePageInput {
  /** The site's origin, e.g. https://flavorcraft.example */
  origin: string;
  id: string;
  /** Null when the remix is private, deleted or not found. */
  remix: SharedRemix | null;
  /** Where the 1200×630 image for this remix is served. */
  imageUrl: string | null;
}

export const sharePage = ({ origin, id, remix, imageUrl }: SharePageInput): string => {
  const e = escapeXml;
  const pageUrl = remix ? `${origin}/remixes/${id}` : origin;
  const title = remix ? `${remix.title}, a FlavorCraft remix` : 'FlavorCraft: cook by taste';
  const description = remix ? describeRemix(remix) : "Find recipes by how they taste, see why, and fix a dish that isn't working.";
  const image = remix && imageUrl ? imageUrl : `${origin}/og-image.png`;
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    `<title>${e(title)}</title>`,
    `<meta name="description" content="${e(description)}">`,
    `<link rel="canonical" href="${e(pageUrl)}">`,
    '<meta property="og:site_name" content="FlavorCraft">',
    '<meta property="og:type" content="article">',
    `<meta property="og:url" content="${e(pageUrl)}">`,
    `<meta property="og:title" content="${e(title)}">`,
    `<meta property="og:description" content="${e(description)}">`,
    `<meta property="og:image" content="${e(image)}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${e(remix ? `Flavor chart for ${remix.title}` : 'FlavorCraft')}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:image" content="${e(image)}">`,
    '</head>',
    '<body>',
    `<h1>${e(remix ? remix.title : 'FlavorCraft')}</h1>`,
    `<p>${e(description)}</p>`,
    `<p><a href="${e(pageUrl)}">Open it on FlavorCraft</a></p>`,
    '</body>',
    '</html>',
  ].join('\n');
};
