// The homepage's Content-Security-Policy (docs/DESIGN.md §8): no script at all; styles, fonts, images and
// media from the site only. src/host/_headers carries the same string for / and /press (checked by
// test/unit/site-build.test.ts); on GitHub Pages the layout emits it as a meta tag without frame-ancestors.
export const HOME_CSP =
  "default-src 'none'; script-src 'none'; style-src 'self'; img-src 'self'; media-src 'self'; font-src 'self'; connect-src 'none'; " +
  "form-action 'none'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; manifest-src 'none'; " +
  "require-trusted-types-for 'script'; trusted-types 'none'";

export const metaCsp = (): string => HOME_CSP.replace("frame-ancestors 'none'; ", '');
