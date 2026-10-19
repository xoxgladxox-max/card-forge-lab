import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { scanCard } from '../src/lib/nodes.mjs';
import { validateNodes } from '../src/lib/protocol.mjs';
import { migrateLegacyProject, splitLegacyNode } from '../src/cmd/migrate.mjs';
import { assemble } from '../src/cmd/build.mjs';
import { checkCmd } from '../src/cmd/check.mjs';

const tmpDir = p => fs.mkdtemp(path.join(os.tmpdir(), p));
async function write(root, rel, text) {
  const abs = path.join(root, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, text, 'utf8');
}

test('P10：没有 card.md 报 error；有旧版节点树时提示先运行 migrate', async () => {
  const tmp = await tmpDir('cf-p10-');
  await write(tmp, 'world/世界/index.md', '---\ntype: world\nid: w1\n---\n\n<!-- body -->\n正文\n');
  const { errors } = validateNodes(await scanCard(tmp));
  const p10 = errors.find(e => e.rule === 'P10');
  assert.ok(p10, JSON.stringify(errors));
  assert.match(p10.message, /migrate/);
  await fs.rm(tmp, { recursive: true, force: true });
});

test('splitLegacyNode：没有 body 标记时跳过工序列表与注释，正文从第一行非列表内容起', () => {
  const raw = '---\ntype: lore\nposition: @D2\n---\n\n## 工序\n\n- 来源：x\n  - 子项\n- 状态：草稿\n\n<lore name="a">\n正文\n</lore>\n';
  const p = splitLegacyNode(raw);
  assert.equal(p.fm.position, '@D2');
  assert.equal(p.body, '<lore name="a">\n正文\n</lore>');
  assert.match(p.head, /子项/);
  const g = splitLegacyNode('---\ntype: greeting\n---\n\n<!-- 工序\n- 状态：草稿\n-->\n\n你好。\n');
  assert.equal(g.body, '你好。');
});

test('migrate：旧版节点树转标准卡工程，正文、工序、设置都保留，原目录不变', async () => {
  const src = await tmpDir('cf-legacy-src-');
  await write(src, 'index.md', '---\ntype: card\nid: card-test\nname: 测试老卡\ncreator: 测试作者\n---\n\n## 槽位对照\n- 说明\n\n<!-- body -->\n');
  await write(src, 'world/测试世界/index.md', '---\ntype: world\nid: wld-test\nkeys: [测试]\nposition: before_char\ntitle: 测试世界观\norder: 101\n---\n\n## 工序\n- 状态：草稿\n\n<!-- body -->\n<world name="测试世界观">\n这是世界正文。\n</world>\n');
  await write(src, 'world/测试世界/子条目/index.md', '---\ntype: lore\nkeys: [子]\nposition: @D2\nscan_depth: 1\nprobability: 20\nenabled: false\n---\n\n## 工序\n- 状态：草稿\n\n<lore name="子">\n子正文\n</lore>\n');
  await write(src, 'greeting/首条/index.md', '---\ntype: greeting\nposition: first_mes\ntitle: 开场白\n---\n\n## 工序\n- 状态：草稿\n\n你好，{{user}}。\n');
  await write(src, 'greeting/备选/index.md', '---\ntype: greeting\nposition: alternate_greetings\n---\n\n<!-- body -->\n备选。\n');
  await write(src, 'output/index.md', '---\ntype: output\nposition: description\n---\n\n<!-- body -->\n描述正文\n');
  await write(src, '调研.md', '调研资料\n');
  await write(src, 'note/a.md', '笔记\n');
  await write(src, 'backups/x.json', '{}');
  const before = await fs.readFile(path.join(src, 'world/测试世界/子条目/index.md'), 'utf8');

  const out = path.join(await tmpDir('cf-legacy-out-'), 'card');
  const res = await migrateLegacyProject(src, { out });
  assert.ok(res.ok, res.report);

  const card = await fs.readFile(path.join(out, 'card.md'), 'utf8');
  assert.match(card, /name: 测试老卡/);
  assert.match(card, /## 槽位对照/);
  assert.match(await fs.readFile(path.join(out, 'message/0.md'), 'utf8'), /<!-- body -->\n你好，\{\{user\}\}。/);
  assert.match(await fs.readFile(path.join(out, 'message/1.md'), 'utf8'), /备选。/);
  const world = await fs.readFile(path.join(out, 'world_book/world/测试世界.md'), 'utf8');
  assert.match(world, /id: wld-test/);
  assert.match(world, /order: 101/);
  const sub = await fs.readFile(path.join(out, 'world_book/world/测试世界/子条目.md'), 'utf8');
  assert.match(sub, /## 工序\n- 状态：草稿\n\n<!-- body -->\n<lore name="子">/);
  assert.match(sub, /id: wb-world-测试世界-子条目/);
  assert.equal(await fs.readFile(path.join(out, '记录/调研.md'), 'utf8'), '调研资料\n');
  assert.equal(await fs.readFile(path.join(out, '记录/note/a.md'), 'utf8'), '笔记\n');
  await assert.rejects(fs.access(path.join(out, '记录/backups')));
  assert.equal(await fs.readFile(path.join(src, 'world/测试世界/子条目/index.md'), 'utf8'), before);

  const checkRes = await checkCmd(out);
  assert.equal(checkRes.ok, true, checkRes.report);
  const scan = await scanCard(out);
  assert.deepEqual(validateNodes(scan).errors, []);
  const { card: built } = assemble(scan);
  const d = built.data;
  assert.equal(d.description, '描述正文');
  assert.equal(d.first_mes, '你好，{{user}}。');
  assert.deepEqual(d.alternate_greetings, ['备选。']);
  const e = d.character_book.entries.find(x => x.content.includes('子正文'));
  assert.equal(e.enabled, false);
  assert.equal(e.extensions.scan_depth, 1);
  assert.equal(e.extensions.probability, 20);
  assert.equal(e.extensions.position, 4);
  assert.equal(e.extensions.depth, 2);

  await fs.rm(src, { recursive: true, force: true });
  await fs.rm(path.dirname(out), { recursive: true, force: true });
});

test('migrate：输出目录不为空或在旧卡目录里面时拒绝', async () => {
  const src = await tmpDir('cf-legacy-src-');
  await write(src, 'world/a/index.md', '---\ntype: world\n---\n\n<!-- body -->\nx\n');
  const out = await tmpDir('cf-legacy-out-');
  await write(out, 'x.txt', 'x');
  assert.equal((await migrateLegacyProject(src, { out })).ok, false);
  assert.equal((await migrateLegacyProject(src, { out: path.join(src, 'new') })).ok, false);
  assert.equal((await migrateLegacyProject(src, {})).ok, false);
  await fs.rm(src, { recursive: true, force: true });
  await fs.rm(out, { recursive: true, force: true });
});
