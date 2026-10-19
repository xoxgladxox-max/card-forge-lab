// tests/tags.test.mjs — 标签规范（P18a–e）、三明治护栏（P19）、世界书排序（P20）与自动编号
// 依据：docs/spec/node-protocol.md「标签与标题」「世界书排序」
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { scanCard, bookNodesOf, assignOrders } from '../src/lib/nodes.mjs';
import { validateNodes } from '../src/lib/protocol.mjs';
import { buildCmd } from '../src/cmd/build.mjs';
import { checkCmd } from '../src/cmd/check.mjs';
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

const fm = (type, id, title, extra = '') => `type: ${type}\nid: ${id}\nkeys: [占位关键词${id}]\ntarget: character_book\ntitle: "${title}"${extra}`;
const at = (ws, rule, name) => ws.filter(w => w.rule === rule && w.node.includes(name));

test('示例卡：新规则下零警告，build 通过', async () => {
  const tmp = await copyProject(EXAMPLE);
  const { errors, warnings } = validateNodes(await scanCard(tmp));
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  const r = await buildCmd(tmp);
  assert.ok(r.ok, r.report);
  const e = (await readCard(tmp)).data.character_book.entries;
  assert.equal(e[0].insertion_order, 101);
}, { timeout: 90000 });

test('P18a：标签名要和节点类型对上；module 用 character 不报', async () => {
  const tmp = await copyProject(EXAMPLE);
  await addNode(tmp, 'location/旧写法', fm('location', 'loc-a', '温泉街'), '<Onsen name="温泉街">\ncore: 占位\n</Onsen>');
  await addNode(tmp, 'style/名字进标签', fm('style', 'sty-a', '基底文风'), '<基底文风_style>\n占位散文。\n</基底文风_style>');
  await addNode(tmp, 'character/甲/模块', fm('module', 'mod-a', '甲压力下', ''), '<character name="甲" part="压力下">\ncore: 占位\n</character>');
  const ws = validateNodes(await scanCard(tmp)).warnings;
  assert.match(at(ws, 'P18a', '旧写法').map(w => w.message).join(), /应为 <location>/);
  assert.match(at(ws, 'P18a', '名字进标签').map(w => w.message).join(), /应为 <style>/);
  assert.equal(at(ws, 'P18a', '模块').length, 0, JSON.stringify(ws));
}, { timeout: 90000 });

test('P18b：没有 name 报；module / corpus 没有 part 报；output 不要求 name', async () => {
  const tmp = await copyProject(EXAMPLE);
  await addNode(tmp, 'lore/无名', fm('lore', 'lore-a', '设定'), '<lore>\ncore: 占位\n</lore>');
  await addNode(tmp, 'character/甲/无部分', fm('module', 'mod-b', '甲模块'), '<character name="甲">\ncore: 占位\n</character>');
  await addNode(tmp, 'output/规范', 'type: output\nid: out-a\nkeys: [占位关键词out]\ntarget: character_book\ntitle: "输出规范"', '<output>\n占位。\n</output>');
  const ws = validateNodes(await scanCard(tmp)).warnings;
  assert.match(at(ws, 'P18b', '无名').map(w => w.message).join(), /没有 name/);
  assert.match(at(ws, 'P18b', '无部分').map(w => w.message).join(), /没有 part/);
  assert.equal(at(ws, 'P18b', '规范').length, 0, JSON.stringify(ws));
}, { timeout: 90000 });

test('P18c 不再检查：标题不含 name/part 不报；路径分隔符仍报 P18', async () => {
  const tmp = await copyProject(EXAMPLE);
  await addNode(tmp, 'character/乙语料', fm('module', 'mod-c', '乙语料'), '<character name="乙" part="憎恨与颜色">\ncore: 占位\n</character>');
  await addNode(tmp, 'lore/短标题', fm('lore', 'lore-s', '短名'), '<lore name="某角色全名">\ncore: 占位\n</lore>');
  const ws = validateNodes(await scanCard(tmp)).warnings;
  assert.equal(ws.filter(w => w.rule === 'P18c').length, 0, JSON.stringify(ws));
}, { timeout: 90000 });

test('P22：同一触发词挂在多条上报；常驻节点与正则词不查', async () => {
  const tmp = await copyProject(EXAMPLE);
  await addNode(tmp, 'lore/茶会一', fm('lore', 'lore-t1', '三人茶会'), '<lore name="三人茶会">\ncore: 占位\n</lore>');
  await addNode(tmp, 'lore/茶会二', fm('lore', 'lore-t2', '永不终焉的茶会'), '<lore name="永不终焉的茶会">\ncore: 占位\n</lore>');
  let ws = validateNodes(await scanCard(tmp)).warnings.filter(w => w.rule === 'P22');
  assert.equal(ws.length, 0, JSON.stringify(ws));
  await addNode(tmp, 'lore/茶会二', 'type: lore\nid: lore-t2\nkeys: [占位关键词lore-t1]\ntarget: character_book\ntitle: "永不终焉的茶会"', '<lore name="永不终焉的茶会">\ncore: 占位\n</lore>');
  ws = validateNodes(await scanCard(tmp)).warnings.filter(w => w.rule === 'P22');
  assert.ok(ws.some(w => /占位关键词lore-t1/.test(w.message) && /茶会一/.test(w.message) && /茶会二/.test(w.message)), JSON.stringify(ws));
}, { timeout: 90000 });

test('P18d：标题重复、同标签同 name 重复各报；不同 part 不算重复', async () => {
  const tmp = await copyProject(EXAMPLE);
  await addNode(tmp, 'location/甲地', fm('location', 'loc-b', '王都'), '<location name="王都">\ncore: 占位\n</location>');
  await addNode(tmp, 'location/乙地', fm('location', 'loc-c', '王都'), '<location name="王都">\ncore: 占位\n</location>');
  await addNode(tmp, 'character/丙/一', fm('module', 'mod-e', '丙一'), '<character name="丙" part="一">\ncore: 占位\n</character>');
  await addNode(tmp, 'character/丙/二', fm('module', 'mod-f', '丙二'), '<character name="丙" part="二">\ncore: 占位\n</character>');
  const ws = validateNodes(await scanCard(tmp)).warnings;
  const d = ws.filter(w => w.rule === 'P18d');
  assert.ok(d.some(w => /标题「王都」/.test(w.message)), JSON.stringify(d));
  assert.ok(d.some(w => /同时加载时模型分不清/.test(w.message)), JSON.stringify(d));
  assert.equal(d.filter(w => w.node.includes('丙')).length, 0, JSON.stringify(d));
}, { timeout: 90000 });

test('P18e：YAML 第一层没顶格报；顶格不报', async () => {
  const tmp = await copyProject(EXAMPLE);
  await addNode(tmp, 'lore/缩进', fm('lore', 'lore-b', '缩进'), '<lore name="缩进">\n  core: 占位\n  more: 占位\n</lore>');
  await addNode(tmp, 'lore/顶格', fm('lore', 'lore-c', '顶格'), '<lore name="顶格">\ncore: 占位\n</lore>');
  const ws = validateNodes(await scanCard(tmp)).warnings;
  assert.equal(at(ws, 'P18e', '缩进').length, 1, JSON.stringify(ws));
  assert.equal(at(ws, 'P18e', '顶格').length, 0);
}, { timeout: 90000 });

test('自动编号：世界 1xx、人物 2xx、文风 3xx，组内连续不重复；角色的模块紧跟角色；build 照写 insertion_order', async () => {
  const tmp = await copyProject(EXAMPLE);
  await addNode(tmp, 'world/子世界', fm('world', 'wld-b', '子世界'), '<world name="子世界">\ncore: 占位\n</world>');
  await addNode(tmp, 'world/子世界时间线', fm('lore', 'lore-d', '子世界时间线'), '<lore name="子世界时间线">\ncore: 占位\n</lore>');
  await addNode(tmp, 'world/阿地', fm('location', 'loc-d', '阿地'), '<location name="阿地">\ncore: 占位\n</location>');
  await addNode(tmp, 'character/丁', fm('character', 'chr-d', '丁'), '<character name="丁">\nname: 丁\n</character>');
  await addNode(tmp, 'character/丁语料', fm('corpus', 'cor-d', '丁语料'), '<character name="丁" part="语料">\nlines: 占位\n</character>');
  await addNode(tmp, 'character/戊', fm('character', 'chr-g', '戊'), '<character name="戊">\nname: 戊\n</character>');
  await addNode(tmp, 'style/基底', fm('style', 'sty-b', '基底文风'), '<style name="基底文风">\n占位。\n</style>');
  const scan = await scanCard(tmp);
  const { errors, warnings } = validateNodes(scan);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings.filter(w => w.rule === 'P20' || w.rule === 'P21'), []);
  const r = await buildCmd(tmp);
  assert.ok(r.ok, r.report);
  const e = (await readCard(tmp)).data.character_book.entries.map(x => [x.comment, x.insertion_order]);
  const titles = e.map(x => x[0]);
  assert.deepEqual(e.map(x => x[1]), [101, 102, 103, 104, 201, 202, 203, 301], JSON.stringify(e));
  // 平铺后按名字排：角色的语料（名字带前缀）紧跟角色，再到下一个角色
  assert.equal(titles.indexOf('丁语料'), titles.indexOf('丁') + 1, JSON.stringify(titles));
  assert.ok(titles.indexOf('戊') > titles.indexOf('丁语料'), JSON.stringify(titles));
}, { timeout: 90000 });

test('P20：手写 order 重复、跨组、组内不连续各报；删掉手写 order 后不报', async () => {
  const tmp = await copyProject(EXAMPLE);
  await addNode(tmp, 'character/戊', fm('character', 'chr-e', '戊', '\norder: 101'), '<character name="戊">\nname: 戊\n</character>');
  await addNode(tmp, 'character/己', fm('character', 'chr-f', '己', '\norder: 205'), '<character name="己">\nname: 己\n</character>');
  await addNode(tmp, 'character/辛', fm('character', 'chr-x', '辛', '\norder: 205'), '<character name="辛">\nname: 辛\n</character>');
  let ws = validateNodes(await scanCard(tmp)).warnings.filter(w => w.rule === 'P20');
  assert.ok(ws.some(w => /205 与 .*重复/.test(w.message)), JSON.stringify(ws));
  assert.ok(ws.some(w => /order 101 不在人物组/.test(w.message)), JSON.stringify(ws));
  assert.ok(ws.some(w => /人物组 order 不连续/.test(w.message)), JSON.stringify(ws));
  await addNode(tmp, 'character/戊', fm('character', 'chr-e', '戊'), '<character name="戊">\nname: 戊\n</character>');
  await addNode(tmp, 'character/己', fm('character', 'chr-f', '己'), '<character name="己">\nname: 己\n</character>');
  await addNode(tmp, 'character/辛', fm('character', 'chr-x', '辛'), '<character name="辛">\nname: 辛\n</character>');
  ws = validateNodes(await scanCard(tmp)).warnings.filter(w => w.rule === 'P20');
  assert.deepEqual(ws, []);
}, { timeout: 90000 });

test('一组超过 99 条时全卡改用四位编号', async () => {
  const tmp = await copyProject(EXAMPLE);
  for (let i = 0; i < 100; i++) {
    const k = String(i).padStart(3, '0');
    await addNode(tmp, `location/地${k}`, fm('location', `loc-${k}`, `地${k}`), `<location name="地${k}">\ncore: 占位\n</location>`);
  }
  const scan = await scanCard(tmp);
  const { sorted, orders, width } = assignOrders(bookNodesOf(scan));
  assert.equal(width, 1000);
  assert.equal(orders.get(sorted[0]), 1001);
  assert.equal(orders.get(sorted[sorted.length - 1]), 1101);
  assert.deepEqual(validateNodes(scan).warnings.filter(w => w.rule === 'P20'), []);
}, { timeout: 120000 });

test('P19：三明治首尾缺常驻、缺预算豁免、位置不同时报；护栏齐全时不报，开头最小、收尾最大；ignore_budget 写进卡', async () => {
  const tmp = await copyProject(EXAMPLE);
  const head = extra => `type: character\nid: chr-h\ntarget: character_book\ntitle: "庚开头"\nposition: "@D2"\nwrap: head${extra}`;
  const tail = extra => `type: character\nid: chr-t\ntarget: character_book\ntitle: "庚收尾"\nposition: "@D2"\nwrap: tail${extra}`;
  await addNode(tmp, 'character/庚/开头', head(''), '<character name="庚">\n总纲占位。');
  await addNode(tmp, 'character/庚/收尾', tail('\nconstant: true\nignore_budget: true'), '元原则占位。\n</character>');
  await addNode(tmp, 'character/庚/模块', 'type: module\nid: mod-g\nkeys: [占位庚]\ntitle: "庚模块"\nposition: "@D3"', 'core: 占位');
  let ws = validateNodes(await scanCard(tmp)).warnings.filter(w => w.rule === 'P19');
  const msg = ws.map(w => w.message).join('|');
  assert.match(msg, /constant: true/);
  assert.match(msg, /ignore_budget: true/);
  assert.match(msg, /position 不同/);
  await addNode(tmp, 'character/庚/开头', head('\nconstant: true\nignore_budget: true'), '<character name="庚">\n总纲占位。');
  await addNode(tmp, 'character/庚/模块', 'type: module\nid: mod-g\nkeys: [占位庚]\ntitle: "庚模块"\nposition: "@D2"', 'core: 占位');
  ws = validateNodes(await scanCard(tmp)).warnings.filter(w => w.rule === 'P19');
  assert.deepEqual(ws, []);
  const r = await buildCmd(tmp);
  assert.ok(r.ok, r.report);
  const e = (await readCard(tmp)).data.character_book.entries;
  const o = t => e.find(x => x.comment === t).insertion_order;
  assert.ok(o('庚开头') < o('庚模块') && o('庚模块') < o('庚收尾'), JSON.stringify(e.map(x => [x.comment, x.insertion_order])));
  assert.equal(e.find(x => x.comment === '庚开头').extensions.ignore_budget, true);
  assert.equal(e.find(x => x.comment === '世界设定').extensions.ignore_budget, false);
}, { timeout: 90000 });

// 剧情、设定百科、事件归「其余」5xx 组
test('plot / wiki / event 归其余组 5xx', async () => {
  const tmp = await copyProject(EXAMPLE);
  await addNode(tmp, 'plot/第一幕', fm('plot', 'plot-a', '第一幕'), '<plot name="第一幕">\ncore: 占位\n</plot>');
  await addNode(tmp, 'wiki/某组织', fm('wiki', 'wiki-a', '某组织'), '<lore name="某组织">\ncore: 占位\n</lore>');
  await addNode(tmp, 'plot/错标签', fm('plot', 'plot-b', '错标签'), '<lore name="错标签">\ncore: 占位\n</lore>');
  await addNode(tmp, 'event/物资被截', fm('event', 'evt-a', '物资被截'), '<event name="物资被截">\ncore: 占位\n</event>');
  const scan = await scanCard(tmp);
  const { errors, warnings } = validateNodes(scan);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings.filter(w => w.rule === 'P20'), [], JSON.stringify(warnings));
  assert.match(at(warnings, 'P18a', '错标签').map(w => w.message).join(), /应为 <plot>/);
  assert.equal(at(warnings, 'P18a', '某组织').length, 0, JSON.stringify(warnings));
  assert.equal(at(warnings, 'P18a', '物资被截').length, 0, JSON.stringify(warnings));
  const { sorted, orders } = assignOrders(bookNodesOf(scan));
  const of = t => orders.get(sorted.find(n => n.frontmatter.title === t));
  for (const t of ['第一幕', '某组织', '错标签', '物资被截']) assert.equal(Math.floor(of(t) / 100), 5, t);
}, { timeout: 90000 });

test('格式适配提醒：type 与号段对不上时 check 集中列出；未知 type 列出可用类型', async () => {
  const tmp = await copyProject(EXAMPLE);
  await addNode(tmp, 'lore/剧情误标', fm('lore', 'lore-p', '剧情误标', '\norder: 301'), '<lore name="剧情误标">\ncore: 占位\n</lore>');
  let r = await checkCmd(tmp);
  assert.match(r.report, /格式适配提醒：1 个条目/);
  assert.match(r.report, /剧情误标/);
  assert.match(r.report, /type: lore → 应为 101/);
  await addNode(tmp, 'lore/乱写', fm('story', 'x-1', '乱写'), '<story name="乱写">\ncore: 占位\n</story>');
  r = await checkCmd(tmp);
  assert.match(r.report, /未知 type "story"：可用类型为 .*plot.*wiki/);
}, { timeout: 90000 });
