import { matchIngredient, normalizeIngredient } from '../flavor/ingredients';
import { canonicalName } from '../flavor/pairings';

/** A photo ready to send to the assistant: small, JPEG, base64. */
export interface PreparedPhoto {
  /** Base64 without the "data:" prefix. */
  data: string;
  mimeType: 'image/jpeg';
  /** For showing the photo on the page. */
  dataUrl: string;
}

/** The longest side sent to the assistant. Enough to recognise food, small enough to upload on a phone. */
export const MAX_SIDE = 1024;

/** Scales a size down to fit within `max` on its longest side, never up. */
export const fitWithin = (width: number, height: number, max = MAX_SIDE): { width: number; height: number } => {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
};

/**
 * Shrinks a photo in the browser before it goes anywhere. Throws a readable
 * message when the browser can't open the file (some can't read HEIC).
 */
export const preparePhoto = async (file: File): Promise<PreparedPhoto> => {
  if (!file.type.startsWith('image/')) throw new Error('That file isn’t a photo. Choose a JPEG or PNG.');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('This browser can’t open that photo. Try a JPEG or PNG, or take a new photo.');
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser can’t prepare the photo.');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
  return { data: dataUrl.slice(dataUrl.indexOf(',') + 1), mimeType: 'image/jpeg', dataUrl };
};

/**
 * Tidies ingredient names that came back from the assistant: plain words only,
 * no repeats, nothing absurdly long. The assistant read them off a photo, so
 * they are treated as untrusted text.
 */
export const cleanNames = (names: unknown, max = 40): string[] => {
  if (!Array.isArray(names)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    if (typeof raw !== 'string') continue;
    const name = normalizeIngredient(raw);
    if (name.length < 2 || name.length > 40 || name.split(' ').length > 4) continue;
    const key = canonicalName(name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= max) break;
  }
  return out;
};

export interface SpottedItem {
  name: string;
  /** False when FlavorCraft has no taste profile for it, so it can't affect a chart. */
  known: boolean;
}

export const spotted = (names: unknown, max = 40): SpottedItem[] =>
  cleanNames(names, max).map((name) => ({ name, known: matchIngredient(name) !== null }));
