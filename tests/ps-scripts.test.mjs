// tests/ps-scripts.test.mjs — cf-card-format-export 两个 PowerShell 脚本（validate-card、embed-png）的回归测试
// 样本卡在临时目录里现场生成，不带任何私人卡内容。只在 Windows 上跑（CI 为 windows-latest）。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { makeTestPng, textChunk } from './helpers.mjs';
import { parseChunks } from '../src/lib/png.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPTS = path.join(ROOT, 'skills', 'cf-card-format-export', 'scripts');
const skip = process.platform !== 'win32' ? '只在 Windows 上跑' : false;

function ps(script, args) {
  const r = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(SCRIPTS, script), ...args], { encoding: 'utf8', timeout: 120000 });
  const out = (r.stdout || '') + (r.stderr || '');
  return { code: r.status, out, pass: /RESULT : PASS/.test(out), fail: /RESULT : FAIL/.test(out) };
}

function sampleCard(over = {}) {
  return {
    spec: 'chara_card_v2', spec_version: '2.0',
    data: {
      name: '样本角色', description: '<character>\n占位：回归测试用角色设定。\n</character>', personality: '', scenario: '',
      first_mes: '占位开场白。', mes_example: '', creator_notes: '', system_prompt: '', post_history_instructions: '',
      alternate_greetings: ['占位备选开场白。'], character_book: { entries: [], extensions: {} },
      tags: [], creator: '', character_version: '', extensions: {},
      ...over,
    },
  };
}

async function tmpdir() { return fs.mkdtemp(path.join(os.tmpdir(), 'cardforge-ps-')); }
async function writeJson(dir, name, obj) { const p = path.join(dir, name); await fs.writeFile(p, JSON.stringify(obj, null, 2), 'utf8'); return p; }
function tExt(buf, keyword) {
  const c = parseChunks(buf).find(ch => ch.type === 'tEXt' && ch.data.subarray(0, ch.data.indexOf(0)).toString('latin1').toLowerCase() === keyword);
  return c ? c.data.subarray(c.data.indexOf(0) + 1).toString('latin1') : null;
}

test('validate-card：合格卡 PASS；写坏的 JSON、缺 data.name 都 FAIL 且退出码 1', { skip }, async () => {
  const d = await tmpdir();
  assert.ok(ps('validate-card.ps1', ['-Path', await writeJson(d, 'good.json', sampleCard())]).pass);
  const broken = path.join(d, 'broken.json');
  await fs.writeFile(broken, '{"spec":"chara_card_v2","data":{"name":"x",}', 'utf8');
  const r1 = ps('validate-card.ps1', ['-Path', broken]);
  assert.ok(r1.fail); assert.equal(r1.code, 1);
  const noName = sampleCard(); delete noName.data.name;
  const r2 = ps('validate-card.ps1', ['-Path', await writeJson(d, 'noname.json', noName)]);
  assert.ok(r2.fail); assert.equal(r2.code, 1);
});

test('validate-card：mes_example 有内容只报 WARN，不判失败', { skip }, async () => {
  const d = await tmpdir();
  const r = ps('validate-card.ps1', ['-Path', await writeJson(d, 'mes.json', sampleCard({ mes_example: '<START>\n占位示例。' }))]);
  assert.ok(r.pass); assert.match(r.out, /WARN/);
});

test('validate-card：creator_notes、post_history_instructions、tags 有内容只报 WARN，不判失败', { skip }, async () => {
  const d = await tmpdir();
  const r = ps('validate-card.ps1', ['-Path', await writeJson(d, 'old.json', sampleCard({ creator_notes: '占位', post_history_instructions: '占位', tags: ['占位'] }))]);
  assert.ok(r.pass, r.out);
  assert.equal((r.out.match(/WARN/g) || []).length, 3, r.out);
  const clean = ps('validate-card.ps1', ['-Path', await writeJson(d, 'clean.json', sampleCard())]);
  assert.doesNotMatch(clean.out, /WARN/);
});

test('embed-png：删掉封面旧卡数据、保留其余块，读回的卡与输入逐字相同，并过 validate-card', { skip }, async () => {
  const d = await tmpdir();
  const cardPath = await writeJson(d, 'card.json', sampleCard());
  const cardText = await fs.readFile(cardPath, 'utf8');
  const old = Buffer.from(JSON.stringify(sampleCard({ name: '旧卡' })), 'utf8').toString('base64');
  const cover = path.join(d, 'cover.png');
  await fs.writeFile(cover, makeTestPng([textChunk('chara', old), textChunk('Comment', 'keep-me')]));
  const out = path.join(d, 'out.png');
  const r = ps('embed-png.ps1', ['-Card', cardPath, '-Image', cover, '-Out', out]);
  assert.ok(r.pass, r.out);
  const buf = await fs.readFile(out);
  assert.equal(Buffer.from(tExt(buf, 'chara'), 'base64').toString('utf8'), cardText);
  assert.equal(tExt(buf, 'comment'), 'keep-me');
  assert.equal(parseChunks(buf).filter(c => c.type === 'tEXt' && c.data.subarray(0, 5).toString('latin1') === 'chara').length, 1);
  assert.equal(tExt(buf, 'ccv3'), null);
  const orig = parseChunks(await fs.readFile(cover)).filter(c => c.type === 'IDAT')[0].data;
  assert.deepEqual(parseChunks(buf).filter(c => c.type === 'IDAT')[0].data, orig);
  assert.ok(ps('validate-card.ps1', ['-Path', out]).pass);
});

test('embed-png -WithV3：另写 ccv3，只改 spec / spec_version，data 不变', { skip }, async () => {
  const d = await tmpdir();
  const card = sampleCard();
  const cardPath = await writeJson(d, 'card.json', card);
  const cover = path.join(d, 'cover.png');
  await fs.writeFile(cover, makeTestPng());
  const out = path.join(d, 'v3.png');
  assert.ok(ps('embed-png.ps1', ['-Card', cardPath, '-Image', cover, '-Out', out, '-WithV3']).pass);
  const v3 = JSON.parse(Buffer.from(tExt(await fs.readFile(out), 'ccv3'), 'base64').toString('utf8'));
  assert.equal(v3.spec, 'chara_card_v3'); assert.equal(v3.spec_version, '3.0');
  assert.deepEqual(v3.data, card.data);
});

test('embed-png：封面不存在、卡 JSON 写坏、输出已存在未加 -Force，都 FAIL 且退出码 1', { skip }, async () => {
  const d = await tmpdir();
  const cardPath = await writeJson(d, 'card.json', sampleCard());
  const cover = path.join(d, 'cover.png');
  await fs.writeFile(cover, makeTestPng());
  const broken = path.join(d, 'broken.json');
  await fs.writeFile(broken, '{"spec":', 'utf8');
  const exists = path.join(d, 'exists.png');
  await fs.writeFile(exists, 'x');
  for (const args of [
    ['-Card', cardPath, '-Image', path.join(d, 'missing.png'), '-Out', path.join(d, 'a.png')],
    ['-Card', broken, '-Image', cover, '-Out', path.join(d, 'b.png')],
    ['-Card', cardPath, '-Image', cover, '-Out', exists],
  ]) {
    const r = ps('embed-png.ps1', args);
    assert.ok(r.fail, r.out); assert.equal(r.code, 1);
  }
  assert.equal(await fs.readFile(exists, 'utf8'), 'x');
});
