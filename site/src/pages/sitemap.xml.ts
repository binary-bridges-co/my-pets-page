// The sitemap: the homepage, /press and the Help, Privacy and Terms pages in both languages, the only
// indexable pages (the card page is noindex).
import type { APIRoute } from 'astro';
import { LEGAL_PAGES, legalPath } from '../content/legal';

export const GET: APIRoute = ({ site }) => {
  const base = site?.origin ?? 'https://pets.binarybridges.co';
  const urls = ['/', '/press', ...LEGAL_PAGES.flatMap((page) => [legalPath(page, 'en'), legalPath(page, 'es')])].map((path) => `  <url><loc>${base}${path}</loc></url>`).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
