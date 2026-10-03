import fs from 'fs';
import zlib from 'zlib';

function crc32(buf: Buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crc ^ buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
    }
  }
  return ~crc >>> 0;
}

function writeChunk(type: string, data: Buffer) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

const width = 1200;
const height = 630;

const rowSize = width * 4 + 1;
const rawData = Buffer.alloc(rowSize * height);

for (let y = 0; y < height; y++) {
  const rowOffset = y * rowSize;
  rawData[rowOffset] = 0;
  for (let x = 0; x < width; x++) {
    const idx = rowOffset + 1 + x * 4;
    const dx = x - width / 2;
    const dy = y - height / 2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    let r = 9;
    let g = 13;
    let b = 22;
    
    if (dist < 500) {
      const factor = (1 - dist / 500);
      r = Math.min(255, Math.round(9 + factor * 80));
      g = Math.min(255, Math.round(13 + factor * 40));
      b = Math.min(255, Math.round(22 + factor * 160));
    }
    
    rawData[idx] = r;
    rawData[idx + 1] = g;
    rawData[idx + 2] = b;
    rawData[idx + 3] = 255;
  }
}

const compressed = zlib.deflateSync(rawData);
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const ihdrData = Buffer.alloc(13);
ihdrData.writeUInt32BE(width, 0);
ihdrData.writeUInt32BE(height, 4);
ihdrData[8] = 8;
ihdrData[9] = 6;
ihdrData[10] = 0;
ihdrData[11] = 0;
ihdrData[12] = 0;
const ihdrChunk = writeChunk('IHDR', ihdrData);

const idatChunk = writeChunk('IDAT', compressed);
const iendChunk = writeChunk('IEND', Buffer.alloc(0));

const png = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
fs.writeFileSync('public/og-image.png', png);
console.log('Successfully generated public/og-image.png (1200x630)');
