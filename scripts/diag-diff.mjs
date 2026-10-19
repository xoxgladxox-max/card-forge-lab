// diag-diff.mjs — 诊断用：定位两份成品卡 JSON 正文差异的首个偏移位置
// 用法：node scripts/diag-diff.mjs <新成品.json> <旧成品.json>
// 输出 CRLF 行数对比与逐字段/逐条目 LF 归一后的一致性，差异处给出上下文片段。
import fs from 'node:fs/promises';
const n = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const o = JSON.parse(await fs.readFile(process.argv[3], 'utf8'));
const d = n.data.description, od = o.data.description;
console.log('新 description 开头 charCode:', [...d.slice(0, 4)].map(c => c.charCodeAt(0)).join(','));
console.log('CRLF 行数 新:', (d.match(/\r\n/g) || []).length, ' 旧:', (od.match(/\r\n/g) || []).length);

const lf = s => (s ?? '').replaceAll('\r\n', '\n');
const eq = (a, b) => lf(a) === lf(b);
for (const f of ['description', 'first_mes', 'mes_example', 'system_prompt']) {
  console.log(`${eq(n.data[f], o.data[f]) ? '✓' : '✗'} ${f}（LF 归一后）`);
}
const na = n.data.alternate_greetings, oa = o.data.alternate_greetings;
na.forEach((g, i) => console.log(`${eq(g, oa[i]) ? '✓' : '✗'} alt[${i}]（LF 归一后）`));
for (const e of n.data.character_book.entries) {
  const hit = o.data.character_book.entries.find(x => JSON.stringify(x.keys) === JSON.stringify(e.keys));
  if (!hit) continue;
  const a = lf(e.content), b = lf(hit.content);
  if (a === b) { console.log(`✓ 条目 ${e.comment.slice(0, 12)}（LF 归一后）`); continue; }
  let i = 0; while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
  console.log(`✗ 条目 ${e.comment.slice(0, 12)}：首个差异在 ${i} 字`);
  console.log(`   新[…${a.slice(Math.max(0, i - 20), i + 40).replaceAll('\n', '\\n')}…]`);
  console.log(`   旧[…${b.slice(Math.max(0, i - 20), i + 40).replaceAll('\n', '\\n')}…]`);
}