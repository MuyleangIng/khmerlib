import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const OUT_DIR = new URL("../public/icons/", import.meta.url);

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function drawRect(pixels, size, x, y, width, height, color) {
  const x0 = Math.max(0, Math.round(x));
  const y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(size, Math.round(x + width));
  const y1 = Math.min(size, Math.round(y + height));

  for (let yy = y0; yy < y1; yy += 1) {
    for (let xx = x0; xx < x1; xx += 1) {
      const index = (yy * size + xx) * 4;
      pixels[index] = color[0];
      pixels[index + 1] = color[1];
      pixels[index + 2] = color[2];
      pixels[index + 3] = color[3];
    }
  }
}

function drawBook(pixels, size) {
  const white = [255, 255, 255, 255];
  const accent = [200, 80, 42, 255];
  const stroke = Math.max(6, Math.round(size * 0.045));
  const top = size * 0.255;
  const height = size * 0.49;
  const leftX = size * 0.18;
  const rightX = size * 0.515;
  const pageWidth = size * 0.305;

  drawRect(pixels, size, leftX, top, pageWidth, height, white);
  drawRect(pixels, size, rightX, top, pageWidth, height, white);
  drawRect(pixels, size, leftX + stroke, top + stroke, pageWidth - stroke, height - stroke * 2, accent);
  drawRect(pixels, size, rightX, top + stroke, pageWidth - stroke, height - stroke * 2, accent);
  drawRect(pixels, size, size * 0.475, top, stroke, height + size * 0.04, white);
  drawRect(pixels, size, size * 0.235, top + height + size * 0.06, size * 0.53, stroke, white);
}

function makePng(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const background = [200, 80, 42, 255];

  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = background[0];
    pixels[i + 1] = background[1];
    pixels[i + 2] = background[2];
    pixels[i + 3] = background[3];
  }

  drawBook(pixels, size);

  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(new URL("icon-192.png", OUT_DIR), makePng(192));
writeFileSync(new URL("icon-512.png", OUT_DIR), makePng(512));
writeFileSync(new URL("maskable-512.png", OUT_DIR), makePng(512));
writeFileSync(new URL("../apple-touch-icon.png", OUT_DIR), makePng(180));
