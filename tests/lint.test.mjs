// tests/lint.test.mjs — lint 命令：命中、禁令句豁免、行号、strict、与 cf-card-review 的 S 组编号同步
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { lintCmd, BANNED_WORDS_PATH } from '../src/cmd/lint.mjs';
import { AUTOMATED_S, NOT_AUTOMATED, parseBannedWords } from '../src/lib/lint-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function node(fm, body) {
  return `---\n${fm}\n---\n- 状态：草稿\n<!-- body -->\n${body}\n`;
}

async function makeCard() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cardforge-lint-'));
  const w = async (rel, text) => {
    await fs.mkdir(path.dirname(path.join(dir, rel)), { recursive: true });
    await fs.writeFile(path.join(dir, rel), text, 'utf8');
  };
  await w('card.md', node('id: card\ntype: card', '总纲里写机械也不查'));
  await w('description.md', node('id: chr-a\ntype: character\nname: 小满\ntarget: description', '角色正文'));
  await w('world_book/王都.md', node('id: wld\ntype: world', '王都的地理。\n小满喜欢在这里散步。'));
  await w('message/0.md', node('id: greet\ntype: greeting\ntarget: first_mes',
    '严禁机械照抄。\n她的动作很机械。\n\n截然相反。\n\n瞳孔骤缩的一瞬。'));
  await w('world_book/基底文风.md', node('id: sty\ntype: style', '微微一笑，微微点头，微微侧身。\n她戴着面具说话。'));
  await w('note/key清单.md', '机械 瞳孔骤缩');
  return dir;
}

test('lint：各规则命中、禁令句跳过、note 与卡根不查', async () => {
  const dir = await makeCard();
  const { hits, ok } = await lintCmd(dir);
  assert.equal(ok, true);
  const has = (rule, node, word) => hits.some(h => h.rule === rule && h.node.includes(node) && h.words.some(x => x.includes(word)));
  assert.ok(has('S2', 'message', '机械'));
  assert.equal(hits.filter(h => h.rule === 'S2').length, 1, '禁令句「严禁机械照抄」不该报');
  assert.ok(has('S3', 'message', '截然相反'));
  assert.ok(has('S6', 'message', '瞳孔骤缩'));
  assert.ok(has('S7', '基底文风', '微微 ×3'));
  assert.ok(has('S12', '王都', '小满'));
  assert.ok(has('S12', '王都', '喜欢'));
  assert.ok(has('BW', '基底文风', '面具'));
  assert.ok(!hits.some(h => h.node === 'card.md' || h.node.startsWith('note')));
});

test('lint：报告行号等于文件真实行号', async () => {
  const dir = await makeCard();
  const { hits } = await lintCmd(dir);
  const h = hits.find(x => x.rule === 'S6');
  const lines = (await fs.readFile(path.join(dir, 'message/0.md'), 'utf8')).split('\n');
  assert.ok(lines[h.line - 1].includes('瞳孔骤缩'));
});

test('lint：--strict 有命中返回失败；黑名单文件缺失时照常跑并说明', async () => {
  const dir = await makeCard();
  assert.equal((await lintCmd(dir, { strict: true })).ok, false);
  const r = await lintCmd(dir, { bannedWordsPath: path.join(dir, '不存在.md') });
  assert.match(r.report, /这部分没查/);
  assert.ok(!r.hits.some(h => h.rule === 'BW'));
});

test('lint：工具覆盖的 S 编号与 cf-card-review 的 S 组一致', async () => {
  const md = await fs.readFile(path.join(ROOT, 'skills/cf-card-review/SKILL.md'), 'utf8');
  const inSkill = [...md.matchAll(/^\|\s*(S\d+)\s*\|/gm)].map(m => m[1]).sort();
  const inTool = [...AUTOMATED_S, ...Object.keys(NOT_AUTOMATED)].sort();
  assert.deepEqual(inTool, inSkill);
  const groups = parseBannedWords(await fs.readFile(BANNED_WORDS_PATH, 'utf8'));
  assert.ok(groups.length >= 5, '行当黑名单至少解析出 5 组');
});
