// compare-cards.mjs — 对比两份成品卡 JSON 的字段级差异（新旧构建回归核对用）
// 用法：node scripts/compare-cards.mjs <新成品.json> <旧成品.json>
// 逐字段比对 V2 data 的正文槽位、备选问候与世界书条目，LF/CRLF 归一后比较。
import fs from 'node:fs/promises';
const [,, newPath, oldPath] = process.argv;
const n = JSON.parse(await fs.readFile(newPath, 'utf8'));
const o = JSON.parse(await fs.readFile(oldPath, 'utf8'));
const lf = s => (s ?? '').replaceAll('\r\n', '\n');
const eq = (a, b) => lf(a) === lf(b);
const row = (field, a, b) => console.log(`${eq(a, b) ? '✓' : '✗'} ${field}${eq(a, b) ? '' : `  新 ${lf(a).length}字 / 旧 ${lf(b).length}字`}`);

const nd = n.data, od = o.data;
for (const f of ['description', 'personality', 'scenario', 'first_mes', 'mes_example', 'system_prompt', 'post_history_instructions']) row(f, nd[f], od[f]);
const na = nd.alternate_greetings ?? [], oa = od.alternate_greetings ?? [];
console.log(`${na.length === oa.length ? '✓' : '✗'} alternate_greetings 数量: 新 ${na.length} / 旧 ${oa.length}`);
na.forEach((g, i) => row(`alt[${i}]`, g, oa[i]));

const ne = nd.character_book?.entries ?? [], oe = od.character_book?.entries ?? [];
console.log(`${ne.length === oe.length ? '✓' : '✗'} 世界书条目数: 新 ${ne.length} / 旧 ${oe.length}`);
for (const e of ne) {
  const cand = oe.filter(x => JSON.stringify(x.keys) === JSON.stringify(e.keys) && x.constant === e.constant);
  const hit = cand.find(x => eq(x.content, e.content));
  if (hit) { console.log(`✓ 条目 "${e.comment.slice(0, 14)}" 内容一致`); continue; }
  const near = cand[0];
  if (near) {
    const a = lf(e.content), b = lf(near.content);
    let i = 0; while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
    console.log(`✗ 条目 "${e.comment.slice(0, 14)}" 差异在 ${i} 字：新[…${a.slice(i, i + 30).replaceAll('\n', '\\n')}…] 旧[…${b.slice(i, i + 30).replaceAll('\n', '\\n')}…]`);
  } else console.log(`✗ 条目 "${e.comment.slice(0, 14)}" 旧成品无 keys+constant 对应`);
}