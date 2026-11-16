// Generates the PWA icons in public/ (no image tooling needed). Run: npm run icons
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0, 0, 0], FG = [240, 240, 240];
type P = [number, number];
type Box = [x0: number, y0: number, x1: number, y1: number];
// Dumbbell: bar + two plates per side.
const boxes: Box[] = [[0.12, 0.46, 0.88, 0.54], [0.2, 0.3, 0.28, 0.7], [0.3, 0.36, 0.36, 0.64], [0.72, 0.3, 0.8, 0.7], [0.64, 0.36, 0.7, 0.64]];
const color = ([x, y]: P) => (boxes.some(([a, b, c, d]) => x >= a && x <= c && y >= b && y <= d) ? FG : BG);

function png(size: number): Buffer {
  const ss = 4, raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0];
      for (let i = 0; i < ss * ss; i++) {
        const c = color([(x + ((i % ss) + 0.5) / ss) / size, (y + (Math.floor(i / ss) + 0.5) / ss) / size]);
        c.forEach((v, k) => (acc[k] += v));
      }
      acc.forEach((v, k) => (raw[y * (size * 3 + 1) + 1 + x * 3 + k] = Math.round(v / (ss * ss))));
    }
  const crcT = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b: Buffer) => { let c = ~0; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return ~c >>> 0; };
  const chunk = (t: string, d: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
    const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const out = new URL('../public/', import.meta.url).pathname;
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]] as const)
  writeFileSync(out + name, png(size));
writeFileSync(out + 'icon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="18" fill="rgb(${BG})"/>${boxes.map(([a, b, c, d]) => `<rect x="${a * 100}" y="${b * 100}" width="${(c - a) * 100}" height="${(d - b) * 100}" fill="rgb(${FG})"/>`).join('')}</svg>\n`);
console.log('icons written');
