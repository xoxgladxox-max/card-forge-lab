// check.mjs — 协议校验 + 检查记录落盘
// 通过只代表“结构与协议过检”；用词看 lint 命令，语境仍归 cf-card-review 的 Agent 审查。
import { scanCard } from '../lib/nodes.mjs';
import { validateNodes, formatReport } from '../lib/protocol.mjs';
import { sha256Hex, writeCheckRecord, RULES_VERSION } from '../lib/fingerprint.mjs';

export async function checkCmd(rootDir) {
  const scan = await scanCard(rootDir);
  const { errors, warnings } = validateNodes(scan);

  const lines = [];
  lines.push(`check：${scan.rootDir}`);
  lines.push(`规则版本：${RULES_VERSION}`);
  lines.push(`节点：${scan.nodes.length} 个`);
  lines.push('');

  const badNodes = new Set(errors.map(e => e.node));
  let recorded = 0;
  for (const n of scan.nodes) {
    if (!n.id || n.type === 'card' || n.type === 'note') continue;
    if (badNodes.has(n.relPath)) continue;
    await writeCheckRecord(scan.rootDir, {
      nodeId: n.id,
      source: n.relPath,
      sha256: sha256Hex(n.body),
      rulesVersion: RULES_VERSION,
      result: 'pass',
      checkedAt: new Date().toISOString(),
    });
    recorded++;
  }

  if (errors.length) { lines.push(`ERRORS : ${errors.length}`); lines.push(formatReport({ errors, warnings: [] })); }
  else lines.push('ERRORS : none');
  if (warnings.length) { lines.push(`WARNINGS: ${warnings.length}`); lines.push(formatReport({ errors: [], warnings })); }
  else lines.push('WARNINGS: none');
  // 格式适配提醒：check 只看 type，判断不了内容时，提醒按内容确认 type
  // check 只看 type 字段不看内容；迁移、拆卡来的 type 可能不对，跨组 order（P20）或标签与类型不符（P18a）时集中提醒
  const adapt = [...new Set(warnings.filter(w => w.node && (w.rule === 'P18a' || (w.rule === 'P20' && w.message.includes('不在')))).map(w => w.node))];
  if (adapt.length) {
    lines.push('');
    lines.push(`格式适配提醒：${adapt.length} 个条目的 type 与 order 号段或包裹标签对不上。check 只看 type 字段，不看内容，判断不了它们实际属于哪组。`);
    lines.push('  请逐条按内容确认 type（世界 1xx：world/location/lore/rule/item；人物 2xx：character/module/corpus；文风 3xx：style；输出 4xx：output；其余 5xx：plot 剧情、event 事件、wiki 设定百科、greeting），');
    lines.push('  再把包裹标签和 order 一并适配。涉及的条目：');
    for (const p of adapt) lines.push(`    - ${p}`);
  }
  lines.push('');
  lines.push(`检查记录：${recorded} 个节点已记录指纹`);
  lines.push(errors.length ? 'RESULT : FAIL' : 'RESULT : PASS');
  return { report: lines.join('\n'), ok: errors.length === 0 };
}