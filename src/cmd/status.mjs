// status.mjs — 项目状态：进度、缺失、冲突、过期检查、下一步
// 默认只读；--write 才更新卡根总纲的生成区。
import fs from 'node:fs/promises';
import path from 'node:path';
import { scanCard } from '../lib/nodes.mjs';
import { validateNodes } from '../lib/protocol.mjs';
import { loadCheckRecords, checkState } from '../lib/fingerprint.mjs';
import { defaultTarget } from './build.mjs';

const STATE_LABEL = { fresh: '检查有效', stale: '检查过期', unrecorded: '未记录' };

// 状态格：有「确认方式」行时带上短名（作者确认 / 作者委托），委托说明留在节点里
function statusCell(n) {
  const s = n.nodeStatus ?? '未标注';
  if (!n.nodeConfirm) return s;
  return `${s}（${n.nodeConfirm.split(/[（(]/)[0].trim()}）`;
}

async function countDirFiles(dir) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); }
  catch { return 0; }
  let total = 0;
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) total += await countDirFiles(full);
    else if (e.isFile()) total += 1;
  }
  return total;
}

export async function statusCmd(rootDir, opts = {}) {
  const scan = await scanCard(rootDir);
  const { errors, warnings } = validateNodes(scan);
  const records = await loadCheckRecords(scan.rootDir);
  const candidateCount = await countDirFiles(path.join(scan.rootDir, '候选'));
  const pendingCount = await countDirFiles(path.join(scan.rootDir, '待归位'));

  const lines = [];
  const card = scan.nodes.find(n => n.type === 'card');
  lines.push(`项目：${card?.frontmatter?.name ?? path.basename(scan.rootDir)}`);
  lines.push(`节点：${scan.nodes.length} 个`);
  if (candidateCount > 0 || pendingCount > 0) {
    lines.push(`待处理：候选 ${candidateCount} 项，待归位 ${pendingCount} 项`);
  }
  lines.push('');
  const tableStart = lines.length;
  lines.push('| 节点 | 类型 | 状态 | 导出 | 检查 |');
  lines.push('|---|---|---|---|---|');
  for (const n of scan.nodes) {
    const target = n.target ?? ({ card: '卡元信息', note: '不导出' }[n.type] ?? defaultTarget(n, scan) ?? '未定');
    lines.push(`| ${n.relPath} | ${n.type ?? '?'} | ${statusCell(n)} | ${target} | ${STATE_LABEL[checkState(n, records)]} |`);
  }
  const table = lines.slice(tableStart).join('\n');
  lines.push('');

  if (errors.length) {
    lines.push(`问题 ${errors.length} 处（阻断构建）：`);
    for (const e of errors) lines.push(`  [X] ${e.node} [${e.rule}] ${e.message}`);
  }
  if (warnings.length) {
    lines.push(`警告 ${warnings.length} 处：`);
    for (const w of warnings) lines.push(`  [!] ${w.node} [${w.rule}] ${w.message}`);
  }

  const wip = scan.nodes.find(n =>
    n.type !== 'note' && n.type !== 'card' &&
    ['调研中', '草稿'].includes(n.nodeStatus));
  const stale = scan.nodes.filter(n =>
    n.type !== 'note' && n.type !== 'card' && checkState(n, records) === 'stale');
  lines.push('');
  if (errors.length) lines.push('下一步：先修复上面的协议问题。');
  else if (wip) lines.push(`下一步：继续节点 ${wip.relPath}（当前状态：${wip.nodeStatus}）。`);
  else if (stale.length) lines.push(`下一步：${stale.length} 个节点内容已变、检查过期，重跑 check 复查。`);
  else lines.push('下一步：节点均已确认，可运行 build 导出。');

  const report = lines.join('\n');

  if (opts.write && card) {
    const cardFile = path.join(scan.rootDir, card.relPath);
    const raw = await fs.readFile(cardFile, 'utf8');
    const begin = '<!-- forge:status begin -->';
    const end = '<!-- forge:status end -->';
    if (raw.includes(begin) && raw.includes(end)) {
      const updated = raw.slice(0, raw.indexOf(begin) + begin.length) + '\n' + table + '\n' + raw.slice(raw.indexOf(end));
      await fs.writeFile(cardFile, updated, 'utf8');
      return report + '\n（已更新卡根生成区）';
    }
    return report + '\n（卡根缺少 forge:status 标记，未写入）';
  }
  return report;
}