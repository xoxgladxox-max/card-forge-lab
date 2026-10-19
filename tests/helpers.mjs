// tests/helpers.mjs — 测试工具：最小合法 PNG、临时工程复制
import zlib from 'node:zlib';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { crc32 } from '../src/lib/png.mjs';

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

// 1x1 红色 PNG，可附带自定义 tEXt 块（验证无关块保留）
export function makeTestPng(extraChunks = []) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8bit RGB
  const idat = zlib.deflateSync(Buffer.from([0, 255, 0, 0]));
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    ...extraChunks.map(c => chunk(c.type, c.data)),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export function textChunk(keyword, text) {
  return { type: 'tEXt', data: Buffer.concat([Buffer.from(keyword, 'latin1'), Buffer.from([0]), Buffer.from(text, 'latin1')]) };
}

export async function copyProject(srcDir) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'cardforge-test-'));
  await fs.cp(srcDir, tmp, { recursive: true });
  return tmp;
}