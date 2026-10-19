// extras.mjs：正则、脚本、角色变量、小白X任务的拆分与合回。只用系统临时目录
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as ex from '../src/lib/extras.mjs';

const sampleExt = () => ({
  regex_scripts: [
    { id: 'a', scriptName: 'A', findRegex: '/x/g', replaceString: '<b>x</b>\n' },
    { id: 'b', scriptName: 'B', disabled: true, findRegex: '/y/', replaceString: 'y' },
    { id: 'c', scriptName: 'C/有斜杠', findRegex: '/z/', replaceString: '' },
  ],
  tavern_helper: {
    scripts: [{ id: 's1', name: '[MVU]var_update', enabled: true, content: "import 'https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate@beta/artifact/bundle.js';\n" }],
    variables: { start_presets: { hp: 1 } },
  },
  'xiaobaix-tasks': { tasks: [] },
  depth_prompt: { prompt: 'p', depth: 4 },
});

async function writeSplit(dir, ext, keep) {
  for (const item of ex.listExtras({ data: { extensions: ext } })) {
    if (keep.has(item.key)) continue;
    const base = (item.kind === 'regex' || item.kind === 'script') ? ex.extraBase(item.kind, item.index + 1, item.label) : null;
    for (const [rel, text] of Object.entries(ex.extraFiles(item.kind, item.value, base))) {
      await fs.mkdir(path.join(dir, path.dirname(rel)), { recursive: true });
      await fs.writeFile(path.join(dir, rel), text, 'utf8');
    }
  }
}

test('listExtras 列出可拆项，空的小白X任务不算；已停用正则默认留卡', () => {
  const card = { data: { extensions: sampleExt() } };
  assert.deepEqual(ex.listExtras(card).map(i => i.key), ['regex:a', 'regex:b', 'regex:c', 'script:s1', 'vars']);
  assert.deepEqual(ex.defaultKeep(card), ['regex:b']);
});

test('按默认勾选拆开再合回，extensions 与原卡一致且顺序不变', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cf-extras-'));
  try {
    const ext = sampleExt();
    const keep = new Set(ex.defaultKeep({ data: { extensions: ext } }));
    await writeSplit(dir, ext, keep);
    const kept = ex.keptExtensions(ext, keep);
    assert.deepEqual(kept.regex_scripts.map(r => r.id), ['b']);
    assert.equal(kept.tavern_helper, undefined);
    assert.deepEqual(kept.depth_prompt, ext.depth_prompt);
    // 斜杠被换掉，替换内容单独成 .html
    const files = (await fs.readdir(path.join(dir, 'regex'))).sort();
    assert.deepEqual(files, ['01-A.html', '01-A.json', '03-C_有斜杠.html', '03-C_有斜杠.json']);
    assert.equal(await fs.readFile(path.join(dir, 'regex/01-A.html'), 'utf8'), '<b>x</b>\n');
    const data = ex.applyExtras({ extensions: kept }, await ex.readExtras(dir));
    assert.deepEqual(data.extensions, ext);
    assert.deepEqual(data.extensions.regex_scripts.map(r => r.id), ['a', 'b', 'c']);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('全部留卡时 card.md 原样保留，合回不变', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cf-extras-'));
  try {
    const ext = sampleExt();
    const keep = new Set(ex.listExtras({ data: { extensions: ext } }).map(i => i.key));
    assert.deepEqual(ex.keptExtensions(ext, keep), ext);
    await writeSplit(dir, ext, keep);
    assert.deepEqual(ex.applyExtras({ extensions: ex.keptExtensions(ext, keep) }, await ex.readExtras(dir)).extensions, ext);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('readExtras：只有 .html 没有同名 .json 时报错', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cf-extras-'));
  try {
    await fs.mkdir(path.join(dir, 'regex'));
    await fs.writeFile(path.join(dir, 'regex/01-孤儿.html'), 'x');
    await assert.rejects(ex.readExtras(dir), /缺少同名的 \.json/);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('mergeOrdered：留卡项补进空序号', () => {
  assert.deepEqual(ex.mergeOrdered([{ n: 1, value: 'a' }, { n: 3, value: 'c' }], ['b', 'd']), ['a', 'b', 'c', 'd']);
});

test('setKeptItem：改、删、新增留在卡里的项', () => {
  const ext = sampleExt();
  let x = ex.setKeptItem(ext, 'regex:b', { id: 'b', scriptName: 'B2' });
  assert.equal(x.regex_scripts[1].scriptName, 'B2');
  x = ex.setKeptItem(x, 'regex:a', null);
  assert.deepEqual(x.regex_scripts.map(r => r.id), ['b', 'c']);
  x = ex.setKeptItem(x, 'vars', null);
  assert.deepEqual(x.tavern_helper.variables, {});
  assert.equal(ext.regex_scripts.length, 3, '不改原对象');
});

test('detectFrameworks：MVU beta / master、小白X、仅酒馆助手、没有', () => {
  assert.deepEqual(ex.detectFrameworks({ data: { extensions: sampleExt() } }).map(f => f.label), ['MVU（beta）']);
  const master = { data: { extensions: { tavern_helper: { scripts: [{ content: 'gh/MagicalAstrogy/MagVarUpdate/artifact/bundle.js' }] } } } };
  assert.equal(ex.detectFrameworks(master)[0].label, 'MVU（master）');
  const xb = { data: { first_mes: '<state>hp</state>', extensions: {} } };
  assert.deepEqual(ex.detectFrameworks(xb).map(f => f.id), ['xiaobaix']);
  assert.deepEqual(ex.detectFrameworks({ data: { extensions: {} } }, '[InitVar]').map(f => f.id), ['mvu']);
  assert.equal(ex.detectFrameworks({ data: { extensions: { tavern_helper: { scripts: [{ content: '1' }] } } } })[0].id, 'tavern_helper');
  assert.equal(ex.detectFrameworks({ data: {} })[0].id, 'none');
});
