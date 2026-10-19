// inspect.mjs — 只读检查成品 JSON / PNG；不覆盖主源，不写任何文件
import fs from 'node:fs/promises';
import { extractChara } from '../lib/png.mjs';
import { sha256Hex } from '../lib/fingerprint.mjs';

function summarize(card) {
  const d = card.data ?? card;
  const lines = [];
  lines.push(`spec        : ${card.spec ?? '(无)'} ${card.spec_version ?? ''}`);
  lines.push(`name        : ${d.name ?? '(空)'}`);
  lines.push(`description : ${(d.description ?? '').length} 字  ${sha256Hex(d.description ?? '').slice(0, 12)}`);
  lines.push(`first_mes   : ${(d.first_mes ?? '').length} 字  ${sha256Hex(d.first_mes ?? '').slice(0, 12)}`);
  lines.push(`alt_greet   : ${(d.alternate_greetings ?? []).length} 条`);
  lines.push(`system_prompt: ${(d.system_prompt ?? '').length} 字`);
  const book = d.character_book;
  if (book?.entries?.length) {
    lines.push(`chara_book  : ${book.entries.length} 条（constant ${book.entries.filter(e => e.constant).length} 条）`);
    for (const e of book.entries) {
      lines.push(`  [${e.id}] keys=${(e.keys ?? []).join('/') || '(无)'} const=${!!e.constant} ${(e.comment ?? '').slice(0, 40)}`);
    }
  } else {
    lines.push('chara_book  : 无');
  }
  lines.push(`extensions  : ${Object.keys(d.extensions ?? {}).length} 个键`);
  return lines.join('\n');
}

function normalize(obj) {
  if (Array.isArray(obj)) return obj.map(normalize);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(Object.keys(obj).sort().map(k => [k, normalize(obj[k])]));
  }
  return obj;
}

export async function inspectCmd(file, opts = {}) {
  const buf = await fs.readFile(file);
  const isPng = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50;
  const lines = [];
  lines.push(`inspect：${file}`);
  lines.push(`大小：${buf.length} 字节`);

  let card;
  if (isPng) {
    const found = extractChara(buf);
    if (!found) return { ok: false, report: lines.join('\n') + '\nPNG 中未找到 chara/ccv3 负载' };
    card = found.card;
    lines.push(`负载：${found.keyword} 块（base64）`);
  } else {
    try { card = JSON.parse(buf.toString('utf8')); }
    catch (e) { return { ok: false, report: lines.join('\n') + `\nJSON 解析失败：${e.message}` } };
  }

  if (card.spec && card.spec !== 'chara_card_v2' && card.spec !== 'chara_card_v3') {
    lines.push(`未支持的 spec "${card.spec}"：按方案明确停止，不静默降级`);
    return { ok: false, report: lines.join('\n') };
  }

  lines.push(summarize(card));

  if (opts.compare) {
    const otherRaw = await fs.readFile(opts.compare);
    const otherBuf = Buffer.from(otherRaw);
    const other = (otherBuf[0] === 0x89) ? extractChara(otherBuf)?.card : JSON.parse(otherBuf.toString('utf8'));
    if (!other) return { ok: false, report: lines.join('\n') + '\n对比文件无法解析' };
    // 世界书条目按 id 比对：酒馆里的卡条目数组顺序可能与装配结果不同（例如按 0,1,10,11… 的字符串顺序），激活顺序由 insertion_order 决定
    const byId = c => { const d = structuredClone(c.data ?? c); d.character_book?.entries?.sort((x, y) => String(x.id).localeCompare(String(y.id), 'en', { numeric: true })); return d; };
    const a = JSON.stringify(normalize(byId(card)));
    const b = JSON.stringify(normalize(byId(other)));
    lines.push('');
    lines.push(a === b ? '对比：与 ' + opts.compare + ' 语义一致 ✓' : '对比：与 ' + opts.compare + ' 不一致 ✗');
    return { ok: a === b, report: lines.join('\n') };
  }
  return { ok: true, report: lines.join('\n') };
}