// The photo rule of Spec §15.8 r2 step 3 (ported from the server's JpegCheck): a walk over the JPEG's
// markers, never a decode. At most 100 KB; SOI first; then only APP0 (plain JFIF, no thumbnail), DQT,
// DHT, DRI, exactly one SOF0 or SOF2 before the first SOS (precision 8, 1 or 3 components, length
// exactly 8 + 3 × components, width and height 1..1024), SOS with entropy-coded data in which 0xFF is
// followed only by 0x00 or RST0–RST7; EOI last, nothing after it.
export const MAX_PHOTO_BYTES = 100 * 1024;

const SOI = 0xd8;
const EOI = 0xd9;
const SOF0 = 0xc0;
const SOF2 = 0xc2;
const DHT = 0xc4;
const DQT = 0xdb;
const DRI = 0xdd;
const SOS = 0xda;
const APP0 = 0xe0;
const JFIF = [0x4a, 0x46, 0x49, 0x46, 0x00];

export interface JpegSize {
  width: number;
  height: number;
}

/** The frame's size, or undefined when [b] breaks the rule. */
export function checkJpeg(b: Uint8Array): JpegSize | undefined {
  if (b.length > MAX_PHOTO_BYTES || b.length < 4 || b[0] !== 0xff || b[1] !== SOI) return undefined;
  let pos = 2;
  let size: JpegSize | undefined;
  let sawApp0 = false;
  let sawScan = false;
  const u8 = (i: number): number => b[i] as number;
  const u16 = (i: number): number => (u8(i) << 8) | u8(i + 1);
  /** Skips one length-prefixed segment at pos; its length field, or -1 when it doesn't fit. */
  const segment = (): number => {
    if (pos + 4 > b.length) return -1;
    const len = u16(pos + 2);
    if (len < 2 || pos + 2 + len > b.length) return -1;
    pos += 2 + len;
    return len;
  };
  for (;;) {
    if (pos + 2 > b.length || u8(pos) !== 0xff) return undefined;
    const marker = u8(pos + 1);
    const start = pos;
    if (marker === EOI) return size && sawScan && pos + 2 === b.length ? size : undefined;
    if (marker === SOF0 || marker === SOF2) {
      if (size) return undefined;
      const len = segment();
      if (len < 8) return undefined;
      const components = u8(start + 9);
      if ((components !== 1 && components !== 3) || len !== 8 + 3 * components || u8(start + 4) !== 8) return undefined;
      const height = u16(start + 5);
      const width = u16(start + 7);
      if (width < 1 || width > 1024 || height < 1 || height > 1024) return undefined;
      size = { width, height };
    } else if (marker === DHT || marker === DQT) {
      if (segment() < 0) return undefined;
    } else if (marker === DRI) {
      if (segment() !== 4) return undefined;
    } else if (marker === APP0) {
      if (sawApp0 || size) return undefined;
      sawApp0 = true;
      // JFIF: identifier, version (2), units, density (2 + 2), thumbnail width and height.
      if (segment() !== 16) return undefined;
      for (let i = 0; i < 5; i++) if (u8(start + 4 + i) !== JFIF[i]) return undefined;
      if (u8(start + 16) !== 0 || u8(start + 17) !== 0) return undefined;
    } else if (marker === SOS) {
      if (!size || segment() < 0) return undefined;
      sawScan = true;
      for (;;) {
        if (pos >= b.length) return undefined;
        if (u8(pos) !== 0xff) {
          pos++;
          continue;
        }
        if (pos + 1 >= b.length) return undefined;
        const next = u8(pos + 1);
        if (next !== 0x00 && (next < 0xd0 || next > 0xd7)) break;
        pos += 2;
      }
    } else {
      return undefined;
    }
  }
}
