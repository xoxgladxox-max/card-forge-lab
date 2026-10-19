// tests/unpack.test.mjs — 拆卡（unpack）与 tavern 覆盖段
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { unpackCmd, normalizeCard } from '../src/cmd/unpack.mjs';
import { scanCard } from '../src/lib/nodes.mjs';
import { assemble } from '../src/cmd/build.mjs';
import { inspectCmd } from '../src/cmd/inspect.mjs';
import { embedChara } from '../src/lib/png.mjs';
import { makeTestPng } from './helpers.mjs';

function entry(id, over = {}) {
  return {
    id, keys: [`词${id}`], secondary_keys: [], comment: `条目${id}`, content: `<lore name="条目${id}">\n正文${id}\n</lore>`,
    constant: false, selective: true, insertion_order: 100 + id, enabled: true, position: 'before_char', use_regex: true,
    extensions: { position: 0, exclude_recursion: true, display_index: id, probability: 100, useProbability: true, depth: 4, selectiveLogic: 0, group: '', scan_depth: null, ignore_budget: false },
    ...over,
  };
}

function sampleCard() {
  return {
    spec: 'chara_card_v3', spec_version: '3.0',
    data: {
      name: '测试卡', description: '描述正文', personality: '', scenario: '', first_mes: '开场正文', mes_example: '',
      creator_notes: '', system_prompt: '', post_history_instructions: '', alternate_greetings: ['备选一', '备选二'],
      tags: [], creator: '', character_version: '1.0',
      extensions: { world: '测试书', talkativeness: 0.5, tavern_helper: { scripts: [], variables: {} } },
      character_book: {
        name: '测试书', extensions: {},
        // 数组顺序故意打乱；第 10 条停用、第 2 条按深度插入并限扫描深度、第 11 条概率 20
        entries: [entry(0), entry(10, { enabled: false }), entry(2, { position: 'after_char', extensions: { ...entry(2).extensions, position: 4, depth: 2, scan_depth: 1 } }), entry(11, { extensions: { ...entry(11).extensions, probability: 20 } })],
      },
    },
  };
}

async function tmpDir() { return fs.mkdtemp(path.join(os.tmpdir(), 'cardforge-unpack-')); }

test('unpack：PNG 拆成节点后装配回去与原卡一致，原卡不变', async () => {
  const dir = await tmpDir();
  const png = path.join(dir, '[Λs] 测试.png');
  const buf = embedChara(makeTestPng(), sampleCard());
  await fs.writeFile(png, buf);
  const r = await unpackCmd(png, { out: path.join(dir, 'proj') });
  assert.ok(r.ok, r.report);
  assert.match(r.report, /RESULT : PASS/);
  assert.ok((await fs.readFile(png)).equals(buf), '原卡被改动');
  const built = assemble(await scanCard(path.join(dir, 'proj'))).card;
  // 原卡里有的每一项都要原样装回；build 补上的酒馆默认键不算差异
  const sub = (orig, got, p = '') => {
    if (orig && typeof orig === 'object') { for (const k of Object.keys(orig)) sub(orig[k], got?.[k], `${p}.${k}`); return; }
    assert.deepEqual(got, orig, `${p} 不一致`);
  };
  sub(normalizeCard(sampleCard()), normalizeCard(built));
});

test('unpack：正文只在 body 里，tavern 段只有设置', async () => {
  const dir = await tmpDir();
  const json = path.join(dir, 'c.json');
  await fs.writeFile(json, JSON.stringify(sampleCard()));
  await unpackCmd(json, { out: path.join(dir, 'proj') });
  const scan = await scanCard(path.join(dir, 'proj'));
  for (const n of scan.nodes) {
    const tv = JSON.stringify(n.frontmatter.tavern ?? {});
    assert.ok(!tv.includes('正文'), `${n.relPath} 的 tavern 段混进了正文`);
  }
  const off = scan.nodes.find(n => n.frontmatter.title === '条目10');
  assert.equal(off.frontmatter.tavern.enabled, false);
  const deep = scan.nodes.find(n => n.frontmatter.title === '条目2');
  assert.equal(deep.position, '@D2');
  assert.equal(deep.frontmatter.tavern.extensions.scan_depth, 1);
});

test('unpack：改 body 后装配，只有该条正文变，设置保留', async () => {
  const dir = await tmpDir();
  const json = path.join(dir, 'c.json');
  await fs.writeFile(json, JSON.stringify(sampleCard()));
  const proj = path.join(dir, 'proj');
  await unpackCmd(json, { out: proj });
  const node = (await scanCard(proj)).nodes.find(n => n.frontmatter.title === '条目11');
  const file = path.join(proj, node.relPath);
  await fs.writeFile(file, (await fs.readFile(file, 'utf8')).replace('正文11', '改过的正文'), 'utf8');
  const built = assemble(await scanCard(proj)).card;
  const e = built.data.character_book.entries.find(x => x.comment === '条目11');
  assert.ok(e.content.includes('改过的正文'));
  assert.equal(e.extensions.probability, 20);
  assert.equal(built.data.character_book.entries.find(x => x.comment === '条目0').content, sampleCard().data.character_book.entries[0].content);
});

test('unpack：输出目录不为空时拒绝', async () => {
  const dir = await tmpDir();
  const json = path.join(dir, 'c.json');
  await fs.writeFile(json, JSON.stringify(sampleCard()));
  const r = await unpackCmd(json, { out: dir });
  assert.equal(r.ok, false);
  assert.match(r.report, /不为空/);
});

test('inspect --compare：条目数组顺序不同但内容相同时判一致', async () => {
  const dir = await tmpDir();
  const a = sampleCard();
  const b = structuredClone(a);
  b.data.character_book.entries.reverse();
  await fs.writeFile(path.join(dir, 'a.json'), JSON.stringify(a));
  await fs.writeFile(path.join(dir, 'b.json'), JSON.stringify(b));
  const r = await inspectCmd(path.join(dir, 'a.json'), { compare: path.join(dir, 'b.json') });
  assert.ok(r.ok, r.report);
});

test('unpack：独立世界书文件拆成只有世界书的节点工程，正文首尾空白不算不一致', async () => {
  const dir = await tmpDir();
  const w = { entries: {
    0: { uid: 0, key: ['甐30'], keysecondary: [], comment: '甐30', content: '<lore name="甲">\n甲正文\n</lore>\n', constant: true, selective: true, order: 101, position: 0, disable: false, displayIndex: 0, probability: 100, useProbability: true, depth: 4, excludeRecursion: false },
    7: { uid: 7, key: ['乙'], keysecondary: ['备'], comment: '乙', content: '乙正文', constant: false, selective: true, order: 102, position: 4, disable: true, displayIndex: 1, probability: 20, useProbability: true, depth: 2, scanDepth: 1, characterFilter: { names: ['某卡'], tags: [], isExclude: false } },
  } };
  const file = path.join(dir, '测试书.json');
  await fs.writeFile(file, JSON.stringify(w));
  const r = await unpackCmd(file, { out: path.join(dir, 'proj') });
  assert.ok(r.ok, r.report);
  assert.match(r.report, /独立世界书「测试书」/);
  assert.match(r.report, /只差在正文首尾空白/);
  assert.match(r.report, /characterFilter/);
  const scan = await scanCard(path.join(dir, 'proj'));
  const root = scan.nodes.find(n => n.type === 'card');
  assert.equal(root.frontmatter.book_only, true);
  const built = assemble(scan).card;
  assert.equal(built.data.extensions.world, '测试书');
  const byId = new Map(built.data.character_book.entries.map(e => [e.id, e]));
  assert.equal(byId.get(7).enabled, false);
  assert.equal(byId.get(7).extensions.probability, 20);
  assert.equal(byId.get(7).extensions.scan_depth, 1);
  assert.equal(byId.get(7).insertion_order, 102);
  assert.deepEqual(byId.get(7).secondary_keys, ['备']);
});
