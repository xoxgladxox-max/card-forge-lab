// tests/position.test.mjs — position 三种取值（before_char / after_char / @D<n>）与 order 类型校验
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseNodeFile, scanCard, parsePosition } from '../src/lib/nodes.mjs';
import { validateNodes } from '../src/lib/protocol.mjs';
import { buildCmd } from '../src/cmd/build.mjs';
import { copyProject } from './helpers.mjs';

const EXAMPLE = path.resolve('examples/meta-template');

function nodeText({ id, position, order = 'order: 50', extra = '' }) {
  return `---
type: world
id: ${id}
keys: [占位触发词]
${position}
${order}
constant: true
${extra}---

## 工序

- 状态：已确认

<!-- body -->
占位：${id} 的正文。
`;
}

async function addNode(root, dir, text) {
  const f = path.join(root, 'world_book', `${dir}.md`);
  await fs.mkdir(path.dirname(f), { recursive: true });
  await fs.writeFile(f, text, 'utf8');
}

test('position：@D 不带引号、双引号、单引号都能解析', () => {
  for (const line of ['position: @D2', 'position: "@D2"', "position: '@D2'", 'position: @D2   # 行尾注释']) {
    const { frontmatter, problems } = parseNodeFile(nodeText({ id: 'x', position: line }), 'x/index.md');
    assert.deepEqual(problems, [], line);
    assert.equal(frontmatter.position, '@D2', line);
  }
  assert.deepEqual(parsePosition('@D0'), { kind: 'depth', depth: 0 });
  assert.deepEqual(parsePosition('@D4'), { kind: 'depth', depth: 4 });
  assert.deepEqual(parsePosition('after_char'), { kind: 'after_char' });
});

test('position：@D0 / @D4 导出为 extensions.position=4 + depth，顶层 before_char，role=0', async () => {
  const tmp = await copyProject(EXAMPLE);
  await addNode(tmp, '深度零', nodeText({ id: 'wld-d0', position: 'position: @D0', order: 'order: 10' }));
  await addNode(tmp, '深度四', nodeText({ id: 'wld-d4', position: 'position: "@D4"', order: 'order: 20' }));
  const r = await buildCmd(tmp);
  assert.ok(r.ok, r.report);
  assert.match(r.report, /世界书校验：PASS/);
  const card = JSON.parse(await fs.readFile(r.jsonPath, 'utf8'));
  const byText = t => card.data.character_book.entries.find(e => e.content.includes(t));
  const d0 = byText('wld-d0'), d4 = byText('wld-d4');
  for (const [e, depth] of [[d0, 0], [d4, 4]]) {
    assert.equal(e.position, 'before_char');
    assert.equal(e.extensions.position, 4);
    assert.equal(e.extensions.depth, depth);
    assert.equal(e.extensions.role, 0);
  }
}, { timeout: 90000 });

test('position：before_char / after_char 行为不变（0 / 1，depth 4）', async () => {
  const tmp = await copyProject(EXAMPLE);
  await addNode(tmp, '角色前', nodeText({ id: 'wld-bc', position: 'position: before_char', order: 'order: 10' }));
  await addNode(tmp, '角色后', nodeText({ id: 'wld-ac', position: 'position: after_char', order: 'order: 20' }));
  const r = await buildCmd(tmp);
  assert.ok(r.ok, r.report);
  const card = JSON.parse(await fs.readFile(r.jsonPath, 'utf8'));
  const byText = t => card.data.character_book.entries.find(e => e.content.includes(t));
  const bc = byText('wld-bc'), ac = byText('wld-ac');
  assert.equal(bc.position, 'before_char');
  assert.equal(bc.extensions.position, 0);
  assert.equal(bc.extensions.depth, 4);
  assert.equal(ac.position, 'after_char');
  assert.equal(ac.extensions.position, 1);
  assert.equal(ac.extensions.depth, 4);
}, { timeout: 90000 });

test('position：非法值报 P12 error，写明节点与原值，拒绝构建', async () => {
  for (const bad of ['in_chat', '@d2', '@D-1', '@D2.5', '@D', '4']) {
    const tmp = await copyProject(EXAMPLE);
    await addNode(tmp, '坏位置', nodeText({ id: 'wld-bad', position: `position: ${bad}` }));
    const scan = await scanCard(tmp);
    const { errors } = validateNodes(scan);
    const e = errors.find(x => x.rule === 'P12');
    assert.ok(e, `${bad} 应报 P12；实际 ${JSON.stringify(errors)}`);
    assert.match(e.node, /坏位置/);
    assert.ok(e.message.includes(JSON.stringify(scan.nodes.find(n => n.id === 'wld-bad').frontmatter.position)), e.message);
    const r = await buildCmd(tmp);
    assert.equal(r.ok, false);
    assert.match(r.report, /P12/);
  }
});

test('order：非数字报 P13 error（提示拆三明治）；没写 order 不报错，由 build 按组自动编号', async () => {
  const tmp = await copyProject(EXAMPLE);
  await addNode(tmp, '三明治', nodeText({ id: 'wld-sw', position: 'position: @D2', order: 'order: 300 / 304' }));
  let { errors } = validateNodes(await scanCard(tmp));
  const e = errors.find(x => x.rule === 'P13');
  assert.ok(e, JSON.stringify(errors));
  assert.match(e.node, /三明治/);
  assert.match(e.message, /"300 \/ 304"/);
  assert.match(e.message, /一个节点只出一个条目；头尾两段（三明治）请拆成两个节点，各写一个数字 order/);
  assert.equal((await buildCmd(tmp)).ok, false);

  await addNode(tmp, '三明治', nodeText({ id: 'wld-sw', position: 'position: @D2', order: '' }));
  const scan = await scanCard(tmp);
  ({ errors } = validateNodes(scan));
  assert.deepEqual(errors, []);
  assert.equal(scan.nodes.find(n => n.id === 'wld-sw').order, null);
});
