// migrate.mjs — 旧版节点树 → 标准卡工程（确定性迁移，不改原目录）
// 旧版：index.md（卡根）+ world/ character/ greeting/ output/ style/ 下的 <节点>/index.md（可多层）
// 标准：card.md + <字段>.md + message/<n>.md + world_book/**/<条目>.md（见 src/lib/nodes.mjs LAYOUT）
//
// 保留原则：
// - 正文、工序说明块逐字搬运；正文边界有 <!-- body --> 用它，没有时按旧构建脚本口径找
//   （跳过 frontmatter 后的 <!-- … --> 注释与「## 工序」列表，第一行非列表内容起为正文）。
// - frontmatter 原文逐行保留，只做三件事：补 id；把旧写法 position: first_mes / description 等改成 target；
//   build 读不到的设置（enabled、scan_depth、probability、exclude_recursion、prevent_recursion）另抄进 tavern 段。
// - 非节点资料（调研、决策记录、note/、archive/、export/、tools/ 等）原样复制到 记录/。
// - 原目录里有导出成品（export/*.json）时，拿它补缺失的 order 和卡级设置，并逐条比对正文，差异写进报告，不自动改。
import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { quoteBarePosition, BODY_MARK, LEGACY_NODE_DIRS, scanCard } from '../lib/nodes.mjs';
import { validateNodes } from '../lib/protocol.mjs';
import { readCardFile } from './unpack.mjs';

// 构建派生物：不复制（原目录里照旧保留）
const ARTIFACT_DIRS = new Set(['backups', 'dist', '.card-forge', 'node_modules', '.git']);
// 节点目录里的资料子目录：整个当资料复制
const MATERIAL_SUBDIRS = new Set(['note', 'handoff', 'archive', '_web']);
// 旧卡把导出去处写在 position 里的值
const PSEUDO_POSITION = new Set(['description', 'personality', 'scenario', 'mes_example', 'system_prompt', 'post_history_instructions', 'first_mes', 'alternate_greetings']);
const SINGLE_FIELDS = new Set(['description', 'personality', 'scenario', 'mes_example', 'system_prompt', 'post_history_instructions']);
// build 不认识、需要抄进 tavern 段才能生效的旧设置
const EXT_KEYS = ['scan_depth', 'probability', 'exclude_recursion', 'prevent_recursion'];

const toPosix = p => p.split(path.sep).join('/');

// 拆旧节点：frontmatter 原文、工序块原文、正文
export function splitLegacyNode(raw) {
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  raw = raw.replaceAll('\r\n', '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { error: '没有 frontmatter' };
  const fmText = m[1];
  let fm;
  try { fm = YAML.parse(quoteBarePosition(fmText)) ?? {}; }
  catch (e) { return { error: `frontmatter 解析失败：${e.message.split('\n')[0]}` }; }
  if (typeof fm !== 'object' || Array.isArray(fm)) return { error: 'frontmatter 不是键值表' };
  const rest = raw.slice(m[0].length);

  const marks = rest.split(BODY_MARK).length - 1;
  if (marks > 1) return { error: `${BODY_MARK} 出现 ${marks} 次` };
  let head, body;
  if (marks === 1) {
    const i = rest.indexOf(BODY_MARK);
    head = rest.slice(0, i);
    body = rest.slice(i + BODY_MARK.length);
  } else {
    const lines = rest.split('\n');
    let idx = -1, inComment = false, inProc = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (inComment) { if (l.includes('-->')) inComment = false; continue; }
      if (/^\s*<!--/.test(l)) { if (!l.includes('-->')) inComment = true; continue; }
      if (/^\s*$/.test(l)) continue;
      if (/^##\s*工序/.test(l)) { inProc = true; continue; }
      if (inProc && /^(\s*[-*]\s|\s+\S)/.test(l) && !/^\s*<[A-Za-z]/.test(l)) continue;
      idx = i; break;
    }
    head = idx >= 0 ? lines.slice(0, idx).join('\n') : rest;
    body = idx >= 0 ? lines.slice(idx).join('\n') : '';
  }
  return { fmText, fm, head: head.trim(), body: body.trim(), hadMark: marks === 1 };
}

// frontmatter 原文逐行保留；去掉旧写法的 position 行，末尾追加补充字段
function rewriteFm(fmText, { dropPosition, add }) {
  let lines = fmText.split('\n');
  if (dropPosition) lines = lines.filter(l => !/^position[ \t]*:/.test(l));
  const extra = Object.keys(add).length ? YAML.stringify(add, { lineWidth: 0 }).trimEnd() : '';
  return [lines.join('\n').trimEnd(), extra].filter(Boolean).join('\n');
}

function nodeText(fmText, head, body) {
  return `---\n${fmText}\n---\n\n${head ? head + '\n\n' : ''}${BODY_MARK}\n${body}${body ? '\n' : ''}`;
}

// 收集旧节点与资料
async function collect(src) {
  const nodes = [];      // { abs, rel(源相对路径), dir(节点目录相对路径，卡根为 '') }
  const materials = [];  // { abs, rel }
  const skipped = [];
  let placeholderCard = null;
  for (const e of (await fs.readdir(src, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))) {
    const abs = path.join(src, e.name);
    if (e.isDirectory() && ARTIFACT_DIRS.has(e.name)) { skipped.push(e.name + '/'); continue; }
    if (e.isFile() && e.name === 'index.md') { nodes.push({ abs, rel: 'index.md', dir: '' }); continue; }
    if (e.isFile() && e.name === 'card.md') { placeholderCard = abs; continue; }
    if (e.isDirectory() && LEGACY_NODE_DIRS.has(e.name)) { await walkNodeDir(src, abs, nodes, materials); continue; }
    materials.push({ abs, rel: e.name });
  }
  return { nodes, materials, skipped, placeholderCard };
}

async function walkNodeDir(src, dir, nodes, materials) {
  for (const e of (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))) {
    const abs = path.join(dir, e.name);
    const rel = toPosix(path.relative(src, abs));
    if (e.isDirectory()) {
      if (MATERIAL_SUBDIRS.has(e.name)) materials.push({ abs, rel });
      else await walkNodeDir(src, abs, nodes, materials);
    } else if (e.name === 'index.md') nodes.push({ abs, rel, dir: toPosix(path.relative(src, dir)) });
    else materials.push({ abs, rel });
  }
}

// 原目录 export/ 下唯一的成品 JSON 当参照；PNG 唯一时当封面
async function findReference(src) {
  const dir = path.join(src, 'export');
  let files;
  try { files = await fs.readdir(dir); } catch { return { card: null, cover: null, note: null }; }
  const jsons = files.filter(f => f.toLowerCase().endsWith('.json'));
  const pngs = files.filter(f => f.toLowerCase().endsWith('.png'));
  let card = null, note = null;
  if (jsons.length === 1) {
    try { card = readCardFile(await fs.readFile(path.join(dir, jsons[0]))); }
    catch (e) { note = `export/${jsons[0]} 读不出：${e.message}`; }
  } else if (jsons.length > 1) note = `export/ 下有 ${jsons.length} 个 JSON，不确定哪个是参照，未用`;
  return { card, cover: pngs.length === 1 ? path.join(dir, pngs[0]) : null, refName: jsons.length === 1 ? `export/${jsons[0]}` : null, note };
}

const posOfEntry = e => {
  const p = e.extensions?.position;
  if (p === 4) return `@D${e.extensions?.depth ?? 4}`;
  if (p === 1 || (p === undefined && e.position === 'after_char')) return 'after_char';
  return 'before_char';
};

export async function migrateLegacyProject(srcDir, opts = {}) {
  if (!opts.out) return { ok: false, report: 'migrate 需要 --out <新标准卡目录>' };
  const src = path.resolve(srcDir);
  const out = path.resolve(opts.out);
  const relOut = path.relative(src, out);
  if (!relOut || (!relOut.startsWith('..') && !path.isAbsolute(relOut))) return { ok: false, report: `输出目录不能是旧卡目录本身或在它里面：${out}` };
  try { if ((await fs.readdir(out)).length) return { ok: false, report: `输出目录不为空，拒绝覆盖：${out}` }; }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  try { await fs.access(src); } catch { return { ok: false, report: `旧卡目录不存在：${src}` }; }

  const { nodes, materials, skipped, placeholderCard } = await collect(src);
  if (!nodes.some(n => n.dir)) return { ok: false, report: `没找到旧版节点（world/、character/、greeting/、output/、style/ 下的 index.md）：${src}` };

  const ref = await findReference(src);
  const refEntries = new Map((ref.card?.data?.character_book?.entries ?? []).map(e => [String(e.comment ?? ''), e]));
  const files = new Map();     // 输出相对路径 → 文本
  const copies = [];           // [源绝对路径, 输出相对路径]
  const notes = [], gaps = [], diffs = [];
  const mapping = [];          // [源, 去处]
  let posDiff = 0, sameBody = 0;

  // 1. 解析全部节点
  const parsed = [];
  for (const n of nodes) {
    const p = splitLegacyNode(await fs.readFile(n.abs, 'utf8'));
    if (p.error) { copies.push([n.abs, `待归位/${n.rel}`]); gaps.push(`${n.rel}：${p.error}，原样放进 待归位/，请人工处理`); continue; }
    parsed.push({ ...n, ...p });
  }

  // 2. 卡根
  const root = parsed.find(n => n.dir === '');
  const refData = ref.card?.data ?? null;
  {
    const add = {};
    const fm = root?.fm ?? {};
    if (fm.type !== 'card') add.type = 'card';
    if (!fm.id) add.id = 'card-root';
    if (!fm.name) add.name = String(refData?.name ?? path.basename(src));
    if (refData) {
      if (!fm.creator && refData.creator) add.creator = String(refData.creator);
      if (fm.version === undefined && refData.character_version) add.version = String(refData.character_version);
      const tav = {};
      if (refData.extensions && Object.keys(refData.extensions).length) tav.data = { extensions: refData.extensions };
      const { entries: _e, ...bookRest } = refData.character_book ?? {};
      if (Object.keys(bookRest).length) tav.book = bookRest;
      if (Object.keys(tav).length && !fm.tavern) add.tavern = tav;
    }
    const fmText = rewriteFm(root?.fmText ?? '', { dropPosition: false, add });
    files.set('card.md', nodeText(fmText, root?.head ?? '', root?.body ?? ''));
    mapping.push([root ? 'index.md' : '（无，按参照成品/目录名生成）', 'card.md']);
  }
  if (placeholderCard) { copies.push([placeholderCard, '记录/原card.md']); notes.push('原目录顶层已有 card.md（可能是同步工具误生成的占位），未当卡根，复制到 记录/原card.md'); }

  // 3. 其余节点分去处
  const firstMes = [], alts = [], fields = new Map(), book = [];
  for (const n of parsed) {
    if (n.dir === '') continue;
    if (n.fm.type === 'card') { copies.push([n.abs, `待归位/${n.rel}`]); gaps.push(`${n.rel}：子目录里的 card 节点，放进 待归位/`); continue; }
    const pseudo = PSEUDO_POSITION.has(n.fm.position) ? n.fm.position : null;
    const target = n.fm.target ?? pseudo;
    n.pseudo = pseudo; n.target = target;
    if (n.fm.type === 'greeting' || target === 'first_mes' || target === 'alternate_greetings') {
      if (target === 'first_mes') firstMes.push(n);
      else { if (!target) notes.push(`${n.rel}：开场白没写去处，按备选开场白处理`); alts.push(n); }
    } else if (SINGLE_FIELDS.has(target)) {
      if (fields.has(target)) { copies.push([n.abs, `候选/${n.rel}`]); gaps.push(`${n.rel}：${target} 已由 ${fields.get(target).rel} 占用，放进 候选/`); }
      else fields.set(target, n);
    } else book.push(n);
  }
  if (firstMes.length > 1) {
    for (const n of firstMes.slice(1)) { copies.push([n.abs, `候选/${n.rel}`]); gaps.push(`${n.rel}：first_mes 已由 ${firstMes[0].rel} 占用，放进 候选/`); }
  }

  const emit = (n, outRel, add) => {
    if (n.fm.id) delete add.id;
    if (n.fm.target) delete add.target;
    files.set(outRel, nodeText(rewriteFm(n.fmText, { dropPosition: !!n.pseudo, add }), n.head, n.body));
    mapping.push([n.rel, outRel]);
  };

  if (firstMes[0]) {
    emit(firstMes[0], 'message/0.md', { id: 'fld-first_mes', target: 'first_mes' });
    if (refData && refData.first_mes?.trim() !== firstMes[0].body) diffs.push(`${firstMes[0].rel}：正文与参照成品 first_mes 不同`);
  }
  alts.sort((a, b) => (a.fm.order ?? Infinity) - (b.fm.order ?? Infinity) || a.rel.localeCompare(b.rel, 'zh-CN'));
  alts.forEach((n, i) => {
    const num = String(i + 1).padStart(2, '0');
    emit(n, `message/${i + 1}.md`, { id: `greet-alt-${num}`, target: 'alternate_greetings' });
    const r = refData?.alternate_greetings?.[i];
    if (refData && r?.trim() !== n.body) diffs.push(`${n.rel}：正文与参照成品第 ${i + 1} 条备选开场白不同`);
  });
  for (const [field, n] of fields) {
    emit(n, `${field}.md`, { id: `fld-${field}`, target: field });
    if (refData && String(refData[field] ?? '').trim() !== n.body) diffs.push(`${n.rel}：正文与参照成品 ${field} 不同`);
  }

  for (const n of book) {
    const outRel = `world_book/${n.dir}.md`;
    const add = { id: `wb-${n.dir.replace(/[\\/]+/g, '-')}` };
    if (n.target && !n.fm.target) add.target = n.target;
    const tav = {}, ext = {};
    if (n.fm.enabled === false) tav.enabled = false;
    for (const k of EXT_KEYS) if (n.fm[k] !== undefined) ext[k] = n.fm[k];
    const title = String(n.fm.title ?? path.posix.basename(n.dir));
    const r = refEntries.get(title);
    if (ref.card) {
      if (r) {
        if (n.fm.order === undefined && typeof r.insertion_order === 'number') add.order = r.insertion_order;
        if (r.enabled === false) tav.enabled = false;
        if (String(r.content ?? '').trim() === n.body) sameBody++;
        else diffs.push(`${n.rel}：正文与参照成品条目「${title}」不同`);
        const mine = n.pseudo ? 'before_char' : (n.fm.position ?? 'before_char');
        if (posOfEntry(r) !== mine) { posDiff++; diffs.push(`${n.rel}：position 节点为 ${mine}，参照成品为 ${posOfEntry(r)}（按节点写法迁移，未改）`); }
      } else if (n.fm.enabled !== false) {
        tav.enabled = false;
        gaps.push(`${n.rel}：参照成品里没有这一条（旧导出没收它），迁移后先设为停用（tavern.enabled: false），要启用请删掉这行`);
      }
    }
    if (Object.keys(ext).length) tav.extensions = ext;
    if (Object.keys(tav).length) {
      if (n.fm.tavern) gaps.push(`${n.rel}：原来已有 tavern 段，未追加 ${JSON.stringify(tav)}，请人工合并`);
      else add.tavern = tav;
    }
    if (!n.fm.target && ['character', 'corpus', 'output'].includes(n.fm.type)) notes.push(`${n.rel}：${n.fm.type} 节点没写 target，放进 world_book/ 后按世界书条目导出`);
    emit(n, outRel, add);
  }
  if (ref.card) {
    const used = new Set(book.map(n => String(n.fm.title ?? path.posix.basename(n.dir))));
    const missing = [...refEntries.keys()].filter(k => !used.has(k));
    if (missing.length) gaps.push(`参照成品里有、节点里找不到的条目 ${missing.length} 条：${missing.join('、')}`);
  }

  // 4. 资料与封面
  for (const m of materials) copies.push([m.abs, `记录/${m.rel}`]);
  if (ref.cover) copies.push([ref.cover, 'character.png']);

  // 5. 写出
  await fs.mkdir(out, { recursive: true });
  for (const [rel, text] of files) {
    const abs = path.join(out, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, text, 'utf8');
  }
  for (const [from, rel] of copies) {
    const abs = path.join(out, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.cp(from, abs, { recursive: true, errorOnExist: true, force: false });
  }

  // 6. 用标准协议检查迁移结果
  const scan = await scanCard(out);
  const { errors, warnings } = validateNodes(scan);

  const lines = [];
  lines.push(`migrate：${src}`);
  lines.push(`输出：${out}`);
  lines.push(`节点：${parsed.length} 个 → 卡根 1、开场白 ${(firstMes[0] ? 1 : 0) + alts.length}、单槽字段 ${fields.size}、世界书条目 ${book.length}`);
  lines.push(`资料：${materials.length} 项复制到 记录/${ref.cover ? `；封面 ${path.relative(src, ref.cover)} → character.png` : ''}`);
  if (skipped.length) lines.push(`未复制的构建派生物（原目录里仍在）：${skipped.join('、')}`);
  if (ref.card) lines.push(`参照成品：${ref.refName}，世界书条目正文一致 ${sameBody}/${book.length}，position 不同 ${posDiff} 处`);
  else if (ref.note) lines.push(`参照成品：${ref.note}`);
  else lines.push('参照成品：原目录没有 export/*.json，未比对');
  for (const n of notes) lines.push(`说明：${n}`);
  for (const g of gaps) lines.push(`【缺口】${g}`);
  if (diffs.length) { lines.push(`与参照成品的差异 ${diffs.length} 处（按节点内容迁移，未改）：`); diffs.forEach(d => lines.push(`  ${d}`)); }
  lines.push(`协议检查：error ${errors.length}、warning ${warnings.length}`);
  for (const e of errors) lines.push(`  [X] ${e.node} [${e.rule}] ${e.message}`);
  lines.push('原目录未改动。');
  lines.push(errors.length ? 'RESULT : FAIL' : 'RESULT : PASS');
  return { ok: errors.length === 0, report: lines.join('\n'), outDir: out, mapping, gaps, diffs };
}
