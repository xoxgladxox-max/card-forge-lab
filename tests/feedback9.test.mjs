// tests/feedback9.test.mjs — P17 酒馆旧字段、P18 条目形状、title 标题
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { scanCard } from '../src/lib/nodes.mjs';
import { validateNodes } from '../src/lib/protocol.mjs';
import { buildCmd } from '../src/cmd/build.mjs';
import { copyProject } from './helpers.mjs';

const EXAMPLE = path.resolve('examples/meta-template');

async function addNode(root, rel, fm, body) {
  const f = path.join(root, 'world_book', `${rel}.md`);
  await fs.mkdir(path.dirname(f), { recursive: true });
  await fs.writeFile(f, `---\n${fm}\n---\n\n## 工序\n\n- 状态：草稿\n\n<!-- body -->\n${body}\n`, 'utf8');
}

async function readCard(root) {
  const dist = path.join(root, 'dist');
  const f = (await fs.readdir(dist)).find(x => x.endsWith('.json'));
  return JSON.parse(await fs.readFile(path.join(dist, f), 'utf8'));
}

const rules = (ws, rule) => ws.filter(w => w.rule === rule);

test('P17：output 写 post_history_instructions、卡根写 creator_notes 或 tags，都只报警告，照常 build', async () => {
  const tmp = await copyProject(EXAMPLE);
  const scan0 = await scanCard(tmp);
  const card = scan0.nodes.find(n => n.type === 'card');
  const cardFile = path.join(tmp, card.relPath);
  const raw = await fs.readFile(cardFile, 'utf8');
  await fs.writeFile(cardFile, raw.replace(/type: card\r?\n/, 'type: card\ncreator_notes: 占位说明\ntags: [占位标签]\n'), 'utf8');
  await addNode(tmp, 'output/历史指令', 'type: output\nid: out-phi\ntarget: post_history_instructions', '占位：输出规范。');
  const { errors, warnings } = validateNodes(await scanCard(tmp));
  assert.deepEqual(errors, []);
  const w = rules(warnings, 'P17');
  assert.equal(w.length, 3, JSON.stringify(w));
  assert.ok(w.some(x => /历史指令/.test(x.message) && /历史指令/.test(x.node)));
  assert.ok(w.some(x => /creator_notes/.test(x.message)));
  assert.ok(w.some(x => /tags/.test(x.message)));
  const r = await buildCmd(tmp);
  assert.ok(r.ok, r.report);
}, { timeout: 90000 });

test('P18：没有包裹、包裹内 YAML 写坏、没写 title，各报一条；三样都对时不报', async () => {
  const tmp = await copyProject(EXAMPLE);
  const fm = (id, extra = '') => `type: lore\nid: ${id}\nkeys: [占位关键词${id}]\ntarget: character_book${extra}`;
  await addNode(tmp, 'lore/无包裹', fm('lore-a', '\ntitle: 无包裹'), '# 占位标题\n- 占位内容');
  await addNode(tmp, 'lore/坏YAML', fm('lore-b', '\ntitle: 坏YAML'), '<lore name="坏YAML">\ncore: 占位\n  broken: [\n</lore>');
  await addNode(tmp, 'lore/无标题', fm('lore-c'), '<lore name="占位">\ncore: 占位\n</lore>');
  await addNode(tmp, 'lore/合格', fm('lore-d', '\ntitle: 占位条目'), '<lore name="占位条目">\ncore: 占位\nlist:\n  - 甲\n</lore>');
  await addNode(tmp, 'lore/散文包裹', fm('lore-e', '\ntitle: 散文'), '<lore name="散文">\n这是一段散文，不是 YAML：所以不解析。\n</lore>');
  const { errors, warnings } = validateNodes(await scanCard(tmp));
  assert.deepEqual(errors, []);
  const w = rules(warnings, 'P18');
  const at = name => w.filter(x => x.node.includes(name));
  assert.equal(at('无包裹').length, 1); assert.match(at('无包裹')[0].message, /配对的顶层标签/);
  assert.equal(at('坏YAML').length, 1); assert.match(at('坏YAML')[0].message, /YAML 解析失败/);
  assert.equal(at('无标题').length, 0, '没写 title 时用文件名当标题，不报');
  assert.equal(at('合格').length, 0, JSON.stringify(at('合格')));
  assert.equal(at('散文包裹').length, 0, JSON.stringify(at('散文包裹')));
}, { timeout: 90000 });

test('title：条目标题用 title；没写时用目录末级名，不再写整条路径', async () => {
  const tmp = await copyProject(EXAMPLE);
  await addNode(tmp, 'lore/分组/有标题', 'type: lore\nid: lore-t1\nkeys: [占位甲]\ntarget: character_book\ntitle: 人看得懂的名字', '<lore name="人看得懂的名字">\ncore: 占位\n</lore>');
  await addNode(tmp, 'lore/分组/末级目录', 'type: lore\nid: lore-t2\nkeys: [占位乙]\ntarget: character_book', '<lore name="乙">\ncore: 占位\n</lore>');
  const r = await buildCmd(tmp);
  assert.ok(r.ok, r.report);
  const comments = (await readCard(tmp)).data.character_book.entries.map(e => e.comment);
  assert.ok(comments.includes('人看得懂的名字'), JSON.stringify(comments));
  assert.ok(comments.includes('末级目录'), JSON.stringify(comments));
  assert.ok(comments.every(c => !/[\\/]/.test(c)), JSON.stringify(comments));
}, { timeout: 90000 });

test('P18：标题写路径、标题没包含 name、结尾标签写错各报；多块并列的配角群不误报', async () => {
  const tmp = await copyProject(EXAMPLE);
  const fm = (id, title) => `type: lore\nid: ${id}\nkeys: [占位关键词${id}]\ntarget: character_book\ntitle: "${title}"`;
  await addNode(tmp, 'lore/路径标题', fm('lore-p', 'world\\\\甲\\\\乙'), '<lore name="world\\甲\\乙">\ncore: 占位\n</lore>');
  await addNode(tmp, 'lore/名不符', fm('lore-q', '某分支世界时间线'), '<lore name="三年时间线">\ncore: 占位\n</lore>');
  await addNode(tmp, 'lore/未闭合', fm('lore-r', '未闭合'), '<lore name="未闭合">\ncore: 占位\n</lor>');
  await addNode(tmp, 'character/多块', 'type: character\nid: chr-s\nkeys: [占位关键词chr-s]\ntarget: character_book\ntitle: "多块"', '<character name="甲">\nname: 甲\n</character>\n\n<character name="乙">\nname: 乙\n</character>');
  const ws = validateNodes(await scanCard(tmp)).warnings;
  const w = ws.filter(x => /^P18/.test(x.rule));
  const at = name => w.filter(x => x.node.includes(name));
  assert.match(at('路径标题').map(x => x.message).join(), /路径分隔符/);
  assert.equal(at('名不符').filter(x => x.rule === 'P18c').length, 0, 'P18c 不再检查（标题用最短自然叫法）');
  assert.match(at('未闭合').map(x => x.message).join(), /配对的顶层标签/);
  assert.equal(at('多块').length, 0, JSON.stringify(at('多块')));
}, { timeout: 90000 });
