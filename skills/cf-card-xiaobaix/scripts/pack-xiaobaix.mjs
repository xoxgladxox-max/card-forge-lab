#!/usr/bin/env node
// pack-xiaobaix.mjs — 小白X（LittleWhiteBox）前端素材 Base64 注入、xiaobaix-tasks.json 构建与 preview.html 生成器
import fs from 'node:fs/promises';
import path from 'node:path';

const MIME_MAP = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { out[k] = next; i++; }
      else out[k] = true;
    }
  }
  return out;
}

async function loadAssetsDir(assetsDir, fallbackFile) {
  const dict = {};
  if (fallbackFile) {
    try {
      const raw = JSON.parse(await fs.readFile(path.resolve(fallbackFile), 'utf8'));
      if (raw && typeof raw === 'object') Object.assign(dict, raw);
    } catch {}
  }
  if (!assetsDir) return dict;
  let entries = [];
  try {
    entries = await fs.readdir(path.resolve(assetsDir), { withFileTypes: true });
  } catch (e) {
    if (e.code === 'ENOENT') return dict;
    throw e;
  }
  for (const ent of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!ent.isFile()) continue;
    const ext = path.extname(ent.name).toLowerCase();
    const mime = MIME_MAP[ext];
    if (!mime) continue;
    const key = path.basename(ent.name, path.extname(ent.name));
    const buf = await fs.readFile(path.join(path.resolve(assetsDir), ent.name));
    dict[key] = `data:${mime};base64,${buf.toString('base64')}`;
  }
  return dict;
}

function buildTasksJson(compiledJs, taskTitle) {
  const now = new Date().toISOString();
  const cmdBlock = `<<taskjs>>\n${compiledJs.trim()}\n<</taskjs>>`;
  const syncCmdBlock = [
    '<<taskjs>>',
    'var w = (window.parent && window.parent !== window) ? window.parent : window;',
    'if (typeof w.__cardTerminalSync === "function") { w.__cardTerminalSync(); }',
    '<</taskjs>>',
  ].join('\n');

  const mainTask = {
    id: 'card_terminal_init',
    name: `${taskTitle} 挂载`,
    commands: cmdBlock,
    script: cmdBlock,
    triggerTiming: 'chat_changed',
    trigger: 'chat_changed',
    interval: 0,
    floorType: 'all',
    disabled: false,
    enabled: true,
    buttonActivated: true,
    buttonName: `✦ ${taskTitle}`,
    createdAt: now,
    x: {},
  };

  const syncTask = {
    id: 'card_terminal_after_ai',
    name: `${taskTitle} 状态同步`,
    commands: syncCmdBlock,
    script: syncCmdBlock,
    triggerTiming: 'after_ai',
    trigger: 'after_ai',
    interval: 1,
    floorType: 'llm',
    disabled: false,
    enabled: true,
    buttonActivated: false,
    createdAt: now,
    x: {},
  };

  const tasks = [mainTask, syncTask];
  return {
    type: 'character',
    tasks,
    character_tasks: tasks,
    exportDate: now,
  };
}

function buildPreviewHtml(compiledJs, title) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} - 独立离线预览</title>
  <style>
    body { margin: 0; background: #0f1218; color: #e5e9f0; font-family: system-ui, sans-serif; }
    .mock-bar { position: fixed; top: 8px; left: 50%; transform: translateX(-50%); z-index: 999999; display: flex; gap: 8px; background: rgba(15,18,24,.9); border: 1px solid rgba(255,255,255,.18); border-radius: 8px; padding: 6px 12px; font-size: 12px; align-items: center; }
    .mock-bar a { color: #88c0d0; text-decoration: none; padding: 3px 8px; border-radius: 4px; background: rgba(255,255,255,.06); }
    .mock-bar a:hover { background: rgba(136,192,208,.2); }
    .mock-host { padding: 60px 24px 24px; max-width: 760px; margin: 0 auto; }
    .mes_text { background: #181c24; border: 1px solid #2a303c; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
    .mock-input { display: flex; gap: 8px; }
    #send_textarea { flex: 1; min-height: 54px; background: #181c24; color: #e5e9f0; border: 1px solid #2a303c; border-radius: 6px; padding: 8px; }
    #send_but { padding: 0 18px; background: #5e81ac; color: #fff; border: none; border-radius: 6px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="mock-bar">
    <span>预览状态切换：</span>
    <a href="?">默认初始态</a>
    <a href="?mid=1">中后期解锁 (?mid=1)</a>
    <a href="?freepop=1">自由外出弹窗 (?freepop=1)</a>
    <a href="?forced=1">强制事件锁定 (?forced=1)</a>
  </div>
  <div class="mock-host">
    <div class="mes_text" id="mock-mes"></div>
    <div class="mock-input">
      <textarea id="send_textarea" placeholder="酒馆输入框模拟 (#send_textarea)..."></textarea>
      <button id="send_but" type="button" onclick="alert('已触发发送：\\n' + document.getElementById('send_textarea').value)">发送</button>
    </div>
  </div>
  <script>
    (function () {
      var qs = new URLSearchParams(location.search);
      var statusText = '<status>[位置: 主房间·昼 | 阶段: 阶段一 | 好感: 20 | 属性A: 15 | 属性B: 10 | 属性C: 10]</status>';
      if (qs.get('mid') === '1') {
        statusText = '<status>[位置: 主房间·昼 | 阶段: 阶段二 | 好感: 75 | 属性A: 60 | 属性B: 55 | 属性C: 50]</status>';
      } else if (qs.get('forced') === '1') {
        statusText = '<status>[位置: 外部场景二 | 阶段: 阶段一 | 好感: 35 | 属性A: 25 | 属性B: 20 | 属性C: 15]</status>';
      }
      document.getElementById('mock-mes').innerHTML = '<div>模拟楼层消息</div><span style="display:none;">' + statusText + '</span>';
    })();
  </script>
  <script>
${compiledJs}
  </script>
</body>
</html>
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.src) {
    console.error('用法: node pack-xiaobaix.mjs --src <terminal.src.js> [--assets <assetsDir>] [--card <cardDir>] [--out <tasks.json>] [--preview <preview.html>] [--name <终端名称>]');
    process.exit(1);
  }
  const srcPath = path.resolve(String(args.src));
  const rawSrc = await fs.readFile(srcPath, 'utf8');
  const assetsDict = await loadAssetsDir(args.assets, args['fallback-assets']);
  const compiledJs = rawSrc.replace(/__ASSETS__/g, JSON.stringify(assetsDict));
  const taskTitle = String(args.name || '[角色卡] 交互终端');

  const tasksObj = buildTasksJson(compiledJs, taskTitle);
  const outPaths = [];
  if (args.card) {
    outPaths.push(path.join(path.resolve(String(args.card)), 'scripts', 'xiaobaix-tasks.json'));
  }
  if (args.out) {
    outPaths.push(path.resolve(String(args.out)));
  }
  for (const p of outPaths) {
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, JSON.stringify(tasksObj, null, 2) + '\n', 'utf8');
  }

  const previewPath = args.preview
    ? path.resolve(String(args.preview))
    : path.join(path.dirname(srcPath), 'preview.html');
  await fs.writeFile(previewPath, buildPreviewHtml(compiledJs, taskTitle), 'utf8');

  const assetCount = Object.keys(assetsDict).length;
  const sizeKb = (Buffer.byteLength(compiledJs, 'utf8') / 1024).toFixed(1);
  console.log(JSON.stringify({
    ok: true,
    assetsLoaded: assetCount,
    compiledSizeKB: Number(sizeKb),
    outputs: outPaths,
    preview: previewPath,
  }, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
