// Fails the build when a vendored file isn't byte for byte the pinned one (PLAN Phase 3).
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../vendor/', import.meta.url);
const pins = JSON.parse(readFileSync(new URL('VENDOR.json', root), 'utf8'));
const pinned = new Set();
let failed = false;
for (const pkg of pins.packages) {
  for (const [path, want] of Object.entries(pkg.files)) {
    pinned.add(path);
    const got = createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex');
    if (got !== want) {
      console.error(`check-vendor: ${path} has SHA-256 ${got}, pinned ${want} (${pkg.name}@${pkg.version})`);
      failed = true;
    }
  }
}
for (const dir of readdirSync(root, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  for (const file of readdirSync(new URL(`${dir.name}/`, root))) {
    if (!pinned.has(`${dir.name}/${file}`)) {
      console.error(`check-vendor: ${dir.name}/${file} isn't pinned in VENDOR.json`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);
console.log(`check-vendor: ${pinned.size} vendored files match their pins`);
