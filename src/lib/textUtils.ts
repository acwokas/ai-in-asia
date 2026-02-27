export const decodeHtml = (s: string) =>
  s?.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'") || '';

/**
 * Fix mojibake / double-encoded UTF-8 sequences that appear as garbled characters.
 * Common when content was saved in one encoding and read in another.
 * Apply BEFORE rendering on article body, title, excerpt, and meta fields.
 */
export const fixEncoding = (text: string): string => {
  if (!text) return text;

  return text
    // Em dash variations
    .replace(/â€"/g, '\u2014')
    .replace(/\u00e2\u20ac\u201c/g, '\u2014')
    // En dash variations
    .replace(/â€"/g, '\u2013')
    .replace(/\u00e2\u20ac\u201d/g, '\u2013')
    // Left double quote
    .replace(/â€œ/g, '\u201c')
    .replace(/\u00e2\u20ac\u0153/g, '\u201c')
    // Right double quote
    .replace(/â€\u009d/g, '\u201d')
    .replace(/â€(?![a-zA-Z0-9œ˜™¦¢])/g, '\u201d')
    // Left single quote / apostrophe
    .replace(/â€˜/g, '\u2018')
    .replace(/\u00e2\u20ac\u02dc/g, '\u2018')
    // Right single quote / apostrophe
    .replace(/â€™/g, '\u2019')
    .replace(/\u00e2\u20ac\u2122/g, '\u2019')
    // Ellipsis
    .replace(/â€¦/g, '\u2026')
    .replace(/\u00e2\u20ac\u00a6/g, '\u2026')
    // Bullet
    .replace(/â€¢/g, '\u2022')
    // Standalone â€ that didn't match above (usually broken em dash)
    .replace(/â€\s/g, '\u2014 ')
    .replace(/â€$/g, '\u2014')
    // Double-encoded UTF-8 nbsp and other common artifacts
    .replace(/Â /g, ' ')
    .replace(/Â·/g, '\u00b7')
    .replace(/Ã©/g, '\u00e9')
    .replace(/Ã¨/g, '\u00e8')
    .replace(/Ã¼/g, '\u00fc')
    .replace(/Ã¶/g, '\u00f6')
    .replace(/Ã¤/g, '\u00e4')
    .replace(/Ã±/g, '\u00f1');
};
