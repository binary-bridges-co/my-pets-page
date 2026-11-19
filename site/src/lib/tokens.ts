// Reads values out of the pinned token file, so no colour is written outside it (bb-context DESIGN.md
// rule 1). theme-color is the page colour, `paper`, of each theme.

function paper(block: string, where: string): string {
  const m = /--color-paper:\s*(#[0-9a-fA-F]{6})\s*;/.exec(block);
  if (!m?.[1]) throw new Error(`tokens.css: no --color-paper in the ${where} block`);
  return m[1];
}

export function themeColors(css: string): { light: string; dark: string } {
  const theme = /@theme\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? css;
  const darkAt = css.indexOf('@media (prefers-color-scheme: dark)');
  const light = paper(theme, 'light');
  if (darkAt < 0) throw new Error('tokens.css: no dark block for --color-paper');
  return { light, dark: paper(css.slice(darkAt), 'dark') };
}
