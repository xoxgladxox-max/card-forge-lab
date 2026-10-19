// lint.mjs — 成文静态检查：扫节点正文，报 S 组与行当黑名单的文字命中（候选，要人看上下文）
// check 管协议格式，lint 管用词；C 组语境规则不在这里。
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanCard, BODY_MARK } from '../lib/nodes.mjs';
import { buildRules, parseBannedWords, NOT_AUTOMATED } from '../lib/lint-rules.mjs';

const TOOL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const BANNED_WORDS_PATH = path.join(TOOL_ROOT, 'skills', 'cf-card-review', 'references', 'banned-words.md');

function isRegexKey(k) { return /^\/.+\/[a-z]*$/.test(k); }

// 角色名：character 节点的 name、目录名、非正则关键词（两个字以上）
function characterNames(scan) {
  const names = new Set();
  for (const n of scan.nodes) {
    if (n.type !== 'character') continue;
    if (typeof n.frontmatter.name === 'string' && n.frontmatter.name.length >= 2) names.add(n.frontmatter.name);
    const base = n.stem;
    if (base && base !== '.' && base.length >= 2) names.add(base);
    for (const k of n.keys) if (!isRegexKey(k) && k.length >= 2) names.add(k);
  }
  return [...names];
}

export async function lintCmd(rootDir, { strict = false, bannedWordsPath = BANNED_WORDS_PATH } = {}) {
  const scan = await scanCard(rootDir);
  let banned = null;
  try { banned = parseBannedWords(await fs.readFile(bannedWordsPath, 'utf8')); } catch { banned = null; }
  const rules = buildRules({ banned: banned ?? [], names: characterNames(scan) });

  const hits = [];
  let scanned = 0;
  for (const n of scan.nodes) {
    if (!n.type || n.type === 'note' || n.type === 'card') continue;
    const raw = await fs.readFile(path.join(scan.rootDir, n.relPath), 'utf8');
    const idx = raw.indexOf(BODY_MARK);
    if (idx < 0) continue;
    scanned++;
    const markLine = raw.slice(0, idx).split('\n').length;         // 标记所在行
    const tail = raw.slice(idx + BODY_MARK.length).replaceAll('\r\n', '\n').split('\n');
    const lines = tail.map((text, i) => ({ no: markLine + i, text }));
    for (const r of rules) {
      if (!r.scope(n.type)) continue;
      for (const h of r.check(lines)) hits.push({ node: n.relPath, rule: r.id, name: r.name, ...h });
    }
  }
  hits.sort((a, b) => a.node.localeCompare(b.node, 'zh-CN') || a.line - b.line);

  const out = [];
  out.push(`lint：${scan.rootDir}`);
  out.push(`扫描节点：${scanned} 个（不含 note 和卡根）`);
  out.push(banned ? `行当黑名单：${bannedWordsPath}（${banned.length} 组）` : `行当黑名单：没找到 ${bannedWordsPath}，这部分没查`);
  out.push('');
  if (hits.length) {
    out.push(`候选：${hits.length} 条（只是文字命中，要看上下文再定；含禁令词的句子已跳过）`);
    for (const h of hits) {
      const snippet = h.text.length > 60 ? h.text.slice(0, 60) + '…' : h.text;
      out.push(`  [?] ${h.node}:${h.line} [${h.rule} ${h.name}] ${h.words.map(w => `「${w}」`).join('')} ${snippet}`);
    }
  } else {
    out.push('候选：无');
  }
  out.push('');
  out.push(`没查的：${Object.entries(NOT_AUTOMATED).map(([k, v]) => `${k}（${v}）`).join('、')}、C 组全部（要读上下文判断）`);
  out.push(hits.length ? `RESULT : 有候选 ${hits.length} 条` : 'RESULT : 无命中');
  return { report: out.join('\n'), ok: strict ? hits.length === 0 : true, hits };
}
