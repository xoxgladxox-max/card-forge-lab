// tests/roundtrip.test.mjs — 五组验收的自动化部分
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { scanCard } from '../src/lib/nodes.mjs';
import { validateNodes } from '../src/lib/protocol.mjs';
import { assemble, buildCmd } from '../src/cmd/build.mjs';
import { checkCmd } from '../src/cmd/check.mjs';
import { statusCmd } from '../src/cmd/status.mjs';
import { inspectCmd } from '../src/cmd/inspect.mjs';
import { extractChara, parseChunks } from '../src/lib/png.mjs';
import { makeTestPng, textChunk, copyProject } from './helpers.mjs';

const EXAMPLE = path.resolve('examples/meta-template');

test('扫描：示例卡 4 节点，body 提取正确', async () => {
  const scan = await scanCard(EXAMPLE);
  assert.equal(scan.nodes.length, 4);
  const chr = scan.nodes.find(n => n.type === 'character');
  assert.ok(chr.body.includes('占位锚点甲'));
  assert.ok(!chr.body.includes('工序'));
  assert.ok(!chr.body.includes('<!-- body'));
});

test('协议：示例卡无 error', async () => {
  const scan = await scanCard(EXAMPLE);
  const { errors } = validateNodes(scan);
  assert.deepEqual(errors, []);
});

test('装配：V2 结构、正文入槽、工序内容不泄漏', async () => {
  const scan = await scanCard(EXAMPLE);
  const { card } = assemble(scan);
  assert.equal(card.spec, 'chara_card_v2');
  assert.equal(card.spec_version, '2.0');
  assert.equal(card.data.name, '元提示词模板');
  assert.ok(card.data.description.includes('占位锚点甲'));
  assert.ok(card.data.first_mes.includes('占位开场标记'));
  const raw = JSON.stringify(card);
  for (const bad of ['工序', '进入前要有', '<!-- body', '验收：']) {
    assert.ok(!raw.includes(bad), `泄漏：${bad}`);
  }
  assert.equal(card.name, card.data.name); // 顶层 V1 镜像
});

test('确定性：两次装配字节一致', async () => {
  const a = assemble(await scanCard(EXAMPLE)).card;
  const b = assemble(await scanCard(EXAMPLE)).card;
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test('构建：临时副本出 JSON，inspect 通过', async () => {
  const tmp = await copyProject(EXAMPLE);
  const r = await buildCmd(tmp);
  assert.ok(r.ok, r.report);
  const insp = await inspectCmd(r.jsonPath);
  assert.ok(insp.ok, insp.report);
  assert.match(insp.report, /chara_card_v2 2\.0/);
});

test('PNG：嵌入后可解出且与 JSON 语义一致，无关块保留', async () => {
  const tmp = await copyProject(EXAMPLE);
  const r = await buildCmd(tmp);
  const cardJson = JSON.parse(await fs.readFile(r.jsonPath, 'utf8'));
  const pngPath = path.join(tmp, 'cover.png');
  await fs.writeFile(pngPath, makeTestPng([textChunk('Comment', 'keep-me')]));
  const r2 = await buildCmd(tmp, { png: pngPath });
  assert.ok(r2.ok && r2.pngPath, r2.report);
  const pngBuf = await fs.readFile(r2.pngPath);
  // 无关块保留
  const types = parseChunks(pngBuf).map(c => c.type);
  assert.ok(types.includes('IHDR') && types.includes('IDAT') && types.includes('IEND'));
  const comment = parseChunks(pngBuf).find(c => c.type === 'tEXt' && c.data.toString('latin1').startsWith('Comment'));
  assert.ok(comment, '自定义 tEXt 块应保留');
  // 解出语义一致
  const cmp = await inspectCmd(r2.pngPath, { compare: r2.jsonPath });
  assert.ok(cmp.ok, cmp.report);
});

test('拦截：缺 body 标记 → check FAIL 且 build 拒绝', async () => {
  const tmp = await copyProject(EXAMPLE);
  const p = path.join(tmp, 'description.md');
  const raw = await fs.readFile(p, 'utf8');
  await fs.writeFile(p, raw.replace('<!-- body -->', ''), 'utf8');
  const c = await checkCmd(tmp);
  assert.equal(c.ok, false);
  assert.match(c.report, /P1/);
  const b = await buildCmd(tmp);
  assert.equal(b.ok, false);
  assert.match(b.report, /构建拒绝/);
});

test('拦截：非四态状态值报 P11 警告，不阻断', async () => {
  const tmp = await copyProject(EXAMPLE);
  const p = path.join(tmp, 'description.md');
  const raw = await fs.readFile(p, 'utf8');
  const changed = raw.replace('- 状态：已确认', '- 状态：待写作');
  assert.notEqual(changed, raw, '示例节点应有状态行');
  await fs.writeFile(p, changed, 'utf8');
  const c = await checkCmd(tmp);
  assert.equal(c.ok, true);
  assert.match(c.report, /P11/);
  const s = await statusCmd(tmp);
  assert.match(s, /待写作/);
});

test('拦截：重复 id 报 P4', async () => {
  const tmp = await copyProject(EXAMPLE);
  const p = path.join(tmp, 'message', '0.md');
  const raw = await fs.readFile(p, 'utf8');
  await fs.writeFile(p, raw.replace('id: greet-main', 'id: chr-main'), 'utf8');
  const c = await checkCmd(tmp);
  assert.equal(c.ok, false);
  assert.match(c.report, /P4/);
});

test('续接：check 后改正文，status 显示检查过期', async () => {
  const tmp = await copyProject(EXAMPLE);
  await checkCmd(tmp);
  const p = path.join(tmp, 'description.md');
  const raw = await fs.readFile(p, 'utf8');
  await fs.writeFile(p, raw.replace('占位锚点甲', '占位锚点乙'), 'utf8');
  const s = await statusCmd(tmp);
  assert.match(s, /检查过期/);
  assert.match(s, /重跑 check/);
});
test('世界书：world 节点装配进 character_book 且过 PowerShell 校验器', async () => {
  const tmp = await copyProject(EXAMPLE);
  await fs.writeFile(path.join(tmp, 'world_book', '世界设定.md'), `---
type: world
id: wld-main
keys: []
position: before_char
order: 50
constant: true
---

## 工序

- 状态：已确认

<!-- body -->
<world>
占位：世界书回归测试正文。占位世界标记。
</world>
`, 'utf8');
  const r = await buildCmd(tmp);
  assert.ok(r.ok, r.report);
  const card = JSON.parse(await fs.readFile(r.jsonPath, 'utf8'));
  const entries = card.data.character_book.entries;
  assert.equal(entries.length, 1);
  assert.equal(entries[0].constant, true);
  assert.equal(entries[0].extensions.position, 0);
  assert.equal(entries[0].extensions.exclude_recursion, true);
  assert.ok(entries[0].content.includes('占位世界标记'));
  assert.match(r.report, /世界书校验：PASS/);
}, { timeout: 90000 });

test('status --write 只更新卡根生成区', async () => {
  const tmp = await copyProject(EXAMPLE);
  const { statusCmd } = await import('../src/cmd/status.mjs');
  const out = await statusCmd(tmp, { write: true });
  assert.match(out, /已更新卡根生成区/);
  const raw = await fs.readFile(path.join(tmp, 'card.md'), 'utf8');
  assert.ok(raw.includes('| description.md | character |'));
  assert.ok(raw.includes('中立模板卡')); // 手工区未被动到
});

test('inspect --compare 不一致时能报 ✗', async () => {
  const tmp = await copyProject(EXAMPLE);
  const r = await buildCmd(tmp);
  const card = JSON.parse(await fs.readFile(r.jsonPath, 'utf8'));
  card.data.description = '被改过的描述';
  const modPath = path.join(tmp, 'dist', 'modified.json');
  await fs.writeFile(modPath, JSON.stringify(card), 'utf8');
  const cmp = await inspectCmd(r.jsonPath, { compare: modPath });
  assert.equal(cmp.ok, false);
  assert.match(cmp.report, /不一致 ✗/);
});
test('备份：连续两次 build 各自保留，不互相覆盖', async () => {
  const tmp = await copyProject(EXAMPLE);
  const backupsRoot = path.join(tmp, 'backups');
  // 先播种一次构建确保 dist/ 存在：此后每次 build 都必须备份，与工程先前状态无关
  const seed = await buildCmd(tmp);
  assert.ok(seed.ok, seed.report);
  const before = await fs.readdir(backupsRoot).catch(() => []);
  const r1 = await buildCmd(tmp);
  assert.ok(r1.ok);
  const r2 = await buildCmd(tmp);
  assert.ok(r2.ok);
  const after = await fs.readdir(backupsRoot);
  const added = after.filter(d => !before.includes(d));
  assert.equal(added.length, 2, `两次 build 应各产生一个独立备份目录，新增实际：${added.join(', ')}`);
  for (const d of added) {
    const files = await fs.readdir(path.join(backupsRoot, d));
    assert.ok(files.length >= 2, `备份 ${d} 应含 json+txt`);
  }
});

test('P1.2/P1.4/P1.5：build 为无 tavern.id 条目分配递增 uid 写回；P23 拦截重复 uid；P24 拦截 U+FFFD；status 显示候选/待归位', async () => {
  const tmp = await copyProject(EXAMPLE);
  const wb2 = path.join(tmp, 'world_book', '第二条.md');
  await fs.writeFile(wb2, `---\ntype: lore\nid: wb-second\ntitle: 第二条\nkeys: [测试词]\nposition: "@D2"\n---\n\n## 工序\n- 状态：已确认\n\n<!-- body -->\n<lore name="第二条">\nkey: val\n</lore>\n`, 'utf8');
  const r = await buildCmd(tmp);
  assert.ok(r.ok, r.report);
  const scanAfter = await scanCard(tmp);
  const uids = scanAfter.nodes.filter(n => n.relPath.startsWith('world_book')).map(n => n.frontmatter?.tavern?.id);
  assert.deepEqual(uids.sort((a, b) => a - b), [0, 1]);

  // 制造重复 tavern.id → P23 error
  const wb1 = path.join(tmp, 'world_book', '世界设定.md');
  const scan1 = await scanCard(tmp);
  const uid1 = scan1.nodes.find(n => n.relPath.endsWith('世界设定.md')).frontmatter.tavern.id;
  const raw2 = await fs.readFile(wb2, 'utf8');
  await fs.writeFile(wb2, raw2.replace(/(\btavern:\r?\n\s+id:\s*)\d+/, `$1${uid1}`), 'utf8');
  const cDup = await checkCmd(tmp);
  assert.equal(cDup.ok, false);
  assert.match(cDup.report, /P23/);

  // 恢复 uid 并写入 U+FFFD → P24 error
  await fs.writeFile(wb2, raw2.replace('key: val', 'key: \uFFFD'), 'utf8');
  const cBadUtf = await checkCmd(tmp);
  assert.equal(cBadUtf.ok, false);
  assert.match(cBadUtf.report, /P24/);

  // 恢复正常并在 候选/ 与 待归位/ 放入文件 → status 显示统计
  await fs.writeFile(wb2, raw2, 'utf8');
  await fs.mkdir(path.join(tmp, '候选'), { recursive: true });
  await fs.writeFile(path.join(tmp, '候选', 'a.md'), 'x', 'utf8');
  const st = await statusCmd(tmp);
  assert.match(st, /待处理：候选 1 项，待归位 0 项/);
});
