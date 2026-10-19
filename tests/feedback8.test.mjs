// tests/feedback8.test.mjs — P14 单字关键词、P15 导出去处、无 PNG 提示、确认方式
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { scanCard } from '../src/lib/nodes.mjs';
import { validateNodes } from '../src/lib/protocol.mjs';
import { buildCmd } from '../src/cmd/build.mjs';
import { statusCmd } from '../src/cmd/status.mjs';
import { copyProject } from './helpers.mjs';

const EXAMPLE = path.resolve('examples/meta-template');

async function addNode(root, rel, fm, head = '- 状态：草稿') {
  const f = path.join(root, 'world_book', `${rel}.md`);
  await fs.mkdir(path.dirname(f), { recursive: true });
  await fs.writeFile(f, `---\n${fm}\n---\n\n## 工序\n\n${head}\n\n<!-- body -->\n占位：${rel} 的正文。\n`, 'utf8');
}

test('P14：单字关键词报警告，只列单字；正则写法不查；不阻断构建', async () => {
  const tmp = await copyProject(EXAMPLE);
  await addNode(tmp, 'world/单字', 'type: world\nid: wld-one\nkeys: [色, 角色名, "/角/"]\nsecondary: [夜]\norder: 10');
  const { errors, warnings } = validateNodes(await scanCard(tmp));
  assert.deepEqual(errors, []);
  const w = warnings.find(x => x.rule === 'P14');
  assert.ok(w, JSON.stringify(warnings));
  assert.match(w.node, /单字/);
  assert.match(w.message, /「色」「夜」/);
  assert.doesNotMatch(w.message, /角色名|\/角\//);
  const r = await buildCmd(tmp);
  assert.ok(r.ok, r.report);
}, { timeout: 90000 });

test('build：没给 --png 时报告里提示只出了 JSON', async () => {
  const tmp = await copyProject(EXAMPLE);
  const r = await buildCmd(tmp);
  assert.ok(r.ok, r.report);
  assert.equal(r.pngPath, null);
  assert.match(r.report, /封面：未指定 --png，本次只出 JSON/);
}, { timeout: 90000 });

test('status：状态格带上确认方式短名，委托说明不进表', async () => {
  const tmp = await copyProject(EXAMPLE);
  await addNode(tmp, 'world/委托节点', 'type: world\nid: wld-dg\nkeys: [委托测试]',
    '- 状态：已确认\n- 确认方式：作者委托（示例委托说明）');
  const report = await statusCmd(tmp);
  assert.match(report, /\| world_book\\world\\委托节点\.md \| world \| 已确认（作者委托） \|/);
  assert.doesNotMatch(report, /示例委托说明/);
});

test('布局：world_book/ 下的条目不写 target 也进世界书；无开头设置的散文件按文件名当条目', async () => {
  const tmp = await copyProject(EXAMPLE);
  await addNode(tmp, 'character/配角甲', 'type: character\nid: chr-a\nkeys: [配角甲]');
  await fs.writeFile(path.join(tmp, 'world_book', '散条目.md'), '<lore name="散条目">\ncore: 占位\n</lore>\n', 'utf8');
  await fs.writeFile(path.join(tmp, '调研.md'), '不参与装配', 'utf8');
  const scan = await scanCard(tmp);
  assert.deepEqual(validateNodes(scan).errors, []);
  assert.ok(!scan.nodes.some(n => n.relPath === '调研.md'));
  const r = await buildCmd(tmp);
  assert.ok(r.ok, r.report);
  const card = JSON.parse(await fs.readFile(r.jsonPath, 'utf8'));
  const names = card.data.character_book.entries.map(e => e.comment);
  assert.ok(names.includes('配角甲') && names.includes('散条目'), JSON.stringify(names));
  assert.ok(!JSON.stringify(card).includes('不参与装配'));
}, { timeout: 90000 });
