#!/usr/bin/env node
// cli.mjs — card-forge 命令入口
// 用法：node src/cli.mjs <status|check|lint|build|inspect> <路径> [选项]
import { statusCmd } from './cmd/status.mjs';
import { checkCmd } from './cmd/check.mjs';
import { lintCmd } from './cmd/lint.mjs';
import { buildCmd } from './cmd/build.mjs';
import { inspectCmd } from './cmd/inspect.mjs';
import { unpackCmd } from './cmd/unpack.mjs';
import { migrateLegacyProject } from './cmd/migrate.mjs';

const USAGE = `card-forge-lab 0.1.0

用法：
  node src/cli.mjs status  <卡目录> [--write]     项目状态；--write 更新卡根生成区
  node src/cli.mjs check   <卡目录>               协议校验 + 检查记录落盘
  node src/cli.mjs lint    <卡目录> [--strict]    用词检查：S 组与行当黑名单的文字命中（候选）；--strict 有命中即失败
  node src/cli.mjs build   <卡目录> [--name 名] [--png 封面.png]   装配 V2 JSON（可选 PNG）
  node src/cli.mjs inspect <卡.json|png> [--compare 另一文件]      只读检查成品
  node src/cli.mjs unpack  <卡.json|png> --out <新目录>        把酒馆里的卡拆成节点工程，并做装配往返比对（不改原卡）
  node src/cli.mjs migrate <旧卡目录> [--out <新标准目录>] [--force]  将旧版节点树无损迁移为标准卡工程格式

退出码：0 成功 / 1 检查或构建失败 / 2 用法错误
`;

function opt(args, name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

async function main() {
  const [cmd, target, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === '--help' || cmd === '-h') { console.log(USAGE); process.exit(target ? 2 : 0); }
  if (!target) { console.error(USAGE); process.exit(2); }

  let result;
  switch (cmd) {
    case 'status':
      result = { ok: true, report: await statusCmd(target, { write: rest.includes('--write') }) };
      break;
    case 'check':
      result = await checkCmd(target);
      break;
    case 'lint':
      result = await lintCmd(target, { strict: rest.includes('--strict') });
      break;
    case 'build':
      result = await buildCmd(target, { name: opt(rest, '--name') ?? undefined, png: opt(rest, '--png') ?? undefined });
      break;
    case 'inspect':
      result = await inspectCmd(target, { compare: opt(rest, '--compare') ?? undefined });
      break;
    case 'unpack':
      result = await unpackCmd(target, { out: opt(rest, '--out') ?? undefined });
      break;
    case 'migrate':
      result = await migrateLegacyProject(target, { out: opt(rest, '--out') ?? undefined, force: rest.includes('--force') });
      break;
    default:
      console.error(`未知命令：${cmd}\n\n${USAGE}`);
      process.exit(2);
  }
  console.log(result.report);
  process.exit(result.ok ? 0 : 1);
}

main().catch(e => { console.error(`执行失败：${e.message}`); process.exit(1); });