---
name: cf-card-xiaobaix
description: v1.0.0｜小白X（LittleWhiteBox）角色卡前端与循环任务构建：纯小白X架构（零酒馆助手依赖）、<<taskjs>> 循环任务挂载、LWB_StateV2 与 variables.local 状态同步、<status> 楼层 HUD 正则联动、三层场景状态机、属性阈值解锁，以及本地美术素材 Base64 打包与独立 HTML 预览。用户说「做小白X前端」「写 taskjs」「小白X任务」「做交互终端」「养成前端」「状态栏 HUD」「打包前端素材」时使用。
metadata:
  version: 1.0.0
  updated: 2026-10-21
---

# 小白X角色卡前端与任务构建（v1.0.0）

范围：角色卡内嵌的小白X（LittleWhiteBox）循环任务（`xiaobaix-tasks`）、全屏交互终端、楼层状态栏 HUD 正则、状态变量读写（`LWB_StateV2` 与 `variables.local`）、场景与属性养成状态机，以及本地美术素材的分离打包与独立预览。

总规则：

- 纯小白X架构（不混入酒馆助手）：卡工程 `scripts/` 目录下只放 `xiaobaix-tasks.json`（对应卡内 `data.extensions['xiaobaix-tasks']`）。不要在 `scripts/` 下放置 `<序号>-<名>.json` + `.js` 或 `variables.json`，否则构建工具会同时装配出 `extensions.tavern_helper`。
- 源码与素材分离：前端源码（`terminal.src.js`，约 20~30KB）只写逻辑、配置与样式，用 `var ASSETS = __ASSETS__;` 占位；图片转为 WebP/PNG/JPG Base64 并注入 `xiaobaix-tasks.json` 的步骤由本技能自带的 `scripts/pack-xiaobaix.mjs` 完成，避免源码因内嵌数 MB 图片无法编辑或版本比对。
- 不破坏原卡状态栏与世界书触发：正文末尾的 `<status>[...]</status>`（及隐藏锚点注释）保持原卡约定格式一字不改；前端通过聊天记录与 DOM `innerHTML` 双通道解析 `<status>`，并同步给小白X的 `LWB_StateV2.applyText` 与 `SillyTavern.getContext().variables.local`。
- 顶层窗口穿透与幂等热清理：小白X的 `<<taskjs>>` 运行在异步函数作用域或子 iframe 中，挂载全屏终端与悬浮按钮时需穿透到 `window.parent`，并在每次重跑时自动卸载旧 DOM 节点、样式表、事件监听与定时器。

# 一、卡工程槽位与小白X数据结构

在角色卡工程目录中，小白X前端由 `regex/` 与 `scripts/xiaobaix-tasks.json` 两个槽位组成：

```
D:\cards\<卡名>\
├── regex/
│   ├── 01-状态栏HUD.json         # 楼层内 <status> 美化正则配置
│   └── 01-状态栏HUD.html         # replaceString：渲染成内嵌 HUD 条 + 隐藏原 <status>
└── scripts/
    └── xiaobaix-tasks.json       # 小白X循环任务（构建时自动写入 data.extensions['xiaobaix-tasks']）
```

## 1. `scripts/xiaobaix-tasks.json` 规范结构

小白X在读取角色卡内嵌任务时读取 `data.extensions['xiaobaix-tasks'].tasks`（数组）；而在小白X面板手动导入任务文件时检查 `type: "character"` 与 `tasks` 数组。为同时兼容随卡自动挂载、面板手动导入与旧版字段，统一采用以下结构：

```json
{
  "type": "character",
  "tasks": [
    {
      "id": "card_terminal_init",
      "name": "[角色卡] 交互终端挂载",
      "commands": "<<taskjs>>\n/* 编译后的完整单文件 IIFE 脚本 */\n<</taskjs>>",
      "interval": 0,
      "floorType": "all",
      "triggerTiming": "chat_changed",
      "disabled": false,
      "buttonActivated": true,
      "createdAt": "2026-10-21T00:00:00.000Z",
      "x": {}
    },
    {
      "id": "card_terminal_after_ai",
      "name": "[角色卡] 状态栏同步刷新",
      "commands": "<<taskjs>>\nif (window.parent && typeof window.parent.__cardTerminalSync === 'function') { window.parent.__cardTerminalSync(); }\n<</taskjs>>",
      "interval": 1,
      "floorType": "llm",
      "triggerTiming": "after_ai",
      "disabled": false,
      "buttonActivated": false,
      "createdAt": "2026-10-21T00:00:00.000Z",
      "x": {}
    }
  ],
  "character_tasks": [
    /* 与 tasks 保持一致，供兼容读取 */
  ],
  "exportDate": "2026-10-21T00:00:00.000Z"
}
```

### `triggerTiming` 与 `floorType` 合法枚举值

| 字段 | 枚举值 | 触发条件与用途 |
|---|---|---|
| `triggerTiming` | `chat_changed` | **切换聊天或打开角色卡时立即触发**（无需 `interval > 0`），最适合作为全屏终端与悬浮按钮的主挂载入口 |
| `triggerTiming` | `after_ai` | AI 回复结束后触发（需配合 `interval >= 1`，如 `interval: 1, floorType: "llm"`），适合每轮回复后自动刷新前端状态 |
| `triggerTiming` | `before_user` | 用户发送消息后、AI 生成前触发（需 `interval >= 1`） |
| `triggerTiming` | `any_message` | 任意楼层消息渲染后按 `interval` 取模触发 |
| `triggerTiming` | `only_this_floor` | 仅当楼层数严格等于 `interval` 时触发一次 |
| `triggerTiming` | `character_init` / `initialization` | 新建聊天（`chat_created`）时触发一次 |
| `triggerTiming` | `plugin_init` | 酒馆刚启动、小白X插件初始化那一刻触发一次（切卡时不重跑，不可单独作为角色卡挂载唯一入口） |
| `floorType` | `all` / `user` / `llm` | 按全部楼层、用户楼层或 AI 楼层计数 |
| `buttonActivated` | `true` / `false` | 设为 `true` 时，小白X会在输入框上方任务栏自动生成一枚以 `name` 命名的快捷触发按钮，玩家点击即可随时重跑该任务 |

### `<<taskjs>>` 沙箱内置注入参数

小白X执行 `<<taskjs>>...<</taskjs>>` 时，会将代码包裹在 `async` 函数中并注入以下 11 个形参，脚本内可直接调用：

- `taskContext`（别名 `ctx`）：含 `{ taskName, stableKey, codeSig, log(msg, extra), warn(msg, extra), error(msg, err, extra) }`，日志直接输出到小白X监控台。
- `STscript(command)`：异步执行酒馆斜杠命令（如 `await STscript('/xbsetvar 路径 值')` 或 `await STscript('/ echo 已就绪')`）。
- `addFloorListener(callback, { interval, timing, floorType })`：动态注册楼层监听回调，任务重跑或卸载时自动随 `abortSignal` 清理。
- `addListener(target, type, handler, opts)` / `removeListener(...)`：受托管的 DOM 事件绑定，任务重跑时自动解绑，防止内存泄漏。
- `setTimeoutSafe(fn, ms)` / `clearTimeoutSafe(id)` / `setIntervalSafe(fn, ms)` / `clearIntervalSafe(id)`：受托管定时器，任务中止时自动清理。
- `abortSignal`：当前任务实例的 `AbortSignal`；同名任务再次触发时，小白X会先 `abort` 旧实例再启动新实例（若任务名以 `[x]` 开头则视为轻量任务，不等待旧 Promise 结束）。

## 2. `regex/01-状态栏HUD.json` + `.html` 配合规范

- `.json` 配置中设置 `"placement": [1, 2]`（作用于用户与 AI 消息）、`"markdownOnly": true`、`"promptOnly": false`（只美化网页显示，不改动发给模型的上下文）。
- `.html`（即 `replaceString`）末尾**必须原样保留隐藏的原始 `<status>` 标签**：
  ```html
  <div class="ct-hud-bar" onclick="if(window.parent&&window.parent.openCardTerminal){window.parent.openCardTerminal();}else if(window.openCardTerminal){window.openCardTerminal();}">
    <span>位置：$1</span><span>阶段：$2</span><span>好感：$3</span>
    <button type="button">打开终端</button>
  </div>
  <span style="display:none;"><status>[位置: $1 | 阶段: $2 | 好感: $3]</status></span>
  ```
- 原因：开启美化正则后，楼层 DOM 的 `.textContent` 会丢失 `<status>` 标签字样；保留 `<span style="display:none;"><status>...</status></span>` 后，前端脚本扫描 `.innerHTML` 时仍能无损提取完整状态。

## 3. 小白X角色模板（`xiaobaix-template`）与 `<<taskjs>>` 选型边界

| 方式 | 存储位置 | 适用场景 |
|---|---|---|
| `<<taskjs>>` 循环任务（主力推荐） | `scripts/xiaobaix-tasks.json`（`data.extensions['xiaobaix-tasks']`） | 需要跨楼层常驻悬浮球、全屏交互终端、房间热点点击、自由外出状态机、自动读写变量与填入输入框 |
| `xiaobaix-template` 角色绑定模板 | `card.md` 的 `extensions.xiaobaix-template`（`{ enabled: true, template: "<html>...", customRegex: "..." }`） | 仅需将每楼固定格式文本渲染为楼层内嵌 iframe 卡片，无需跨楼层全屏交互终端 |

# 二、小白X底层接口与平台适配模板

前端脚本统一使用单文件 IIFE 包裹（完整可运行骨架见 `references/terminal-template.src.js`），核心包含以下四个模块：

## 1. 穿透顶层窗口与幂等清理（防重复挂载）

```javascript
var MOUNT = '__cardTerminalUnmount';
var topWin = window, topDoc = document;
try {
  if (window.parent && window.parent !== window && window.parent.document) {
    topWin = window.parent;
    topDoc = window.parent.document;
  }
} catch (e) { topWin = window; topDoc = document; }

if (typeof topDoc[MOUNT] === 'function') {
  try { topDoc[MOUNT](); } catch (e) {}
}
['ct-root', 'ct-style', 'ct-launcher', 'ct-toast'].forEach(function (id) {
  var old = topDoc.getElementById(id);
  if (old && old.parentNode) old.parentNode.removeChild(old);
});
```

## 2. 小白X变量读写与四通道持久化回退

小白X 3.x 变量系统（Variables Core）将本地变量存储在 `SillyTavern.getContext().variables.local`（底层映射 `chatMetadata.variables`），并提供全局 `LWB_StateV2.applyText('<state>...</state>', { floor, silent })` 与 `{{xbgetvar::路径}}` 宏。前端脚本应按以下四级顺序读写，确保在任何环境（含双击打开的离线 `preview.html`）下都能正常工作：

1. **小白X State V2 引擎**：调用 `topWin.LWB_StateV2.applyText('<state>\nkey: value\n</state>', { silent: true })`，自动触发小白X变量面板与规则校验（`LWB_Guard`）。
2. **SillyTavern / 小白X本地变量 API**：通过 `stCtx().variables.local.get(k)` 与 `stCtx().variables.local.set(k, val)` 读写。
3. **`chatMetadata.variables` 与旧版 `xbgetvar`/`xbsetvar` 兜底**：读写 `stCtx().chatMetadata.variables[k]`，或调用 `topWin.xbgetvar` / `topWin.xbsetvar`。
4. **浏览器 `localStorage` 离线兜底**：供脱离酒馆的 `preview.html` 独立调试使用。

```javascript
function stCtx() {
  try { return (topWin.SillyTavern && topWin.SillyTavern.getContext && topWin.SillyTavern.getContext()) || null; }
  catch (e) { return null; }
}
function varGet(k, fallback) {
  var c = stCtx();
  try {
    if (c && c.variables && c.variables.local && typeof c.variables.local.get === 'function') {
      var v1 = c.variables.local.get(k);
      if (v1 !== undefined && v1 !== null && v1 !== '') return v1;
    }
  } catch (e) {}
  try {
    if (c && c.chatMetadata && c.chatMetadata.variables && c.chatMetadata.variables[k] !== undefined) {
      return c.chatMetadata.variables[k];
    }
  } catch (e) {}
  try { if (typeof topWin.xbgetvar === 'function') { var v2 = topWin.xbgetvar(k); if (v2 != null) return v2; } } catch (e) {}
  try {
    var raw = topWin.localStorage.getItem('ct_var_' + k);
    if (raw !== null) return JSON.parse(raw);
  } catch (e) {}
  return fallback;
}
function varSet(k, val) {
  var c = stCtx();
  try {
    if (c && c.variables && c.variables.local && typeof c.variables.local.set === 'function') {
      c.variables.local.set(k, val);
    } else if (c && c.chatMetadata) {
      c.chatMetadata.variables = c.chatMetadata.variables || {};
      c.chatMetadata.variables[k] = val;
    }
  } catch (e) {}
  try { if (typeof topWin.xbsetvar === 'function') topWin.xbsetvar(k, val); } catch (e) {}
  try { topWin.localStorage.setItem('ct_var_' + k, JSON.stringify(val)); } catch (e) {}
}
function syncStateBlock(stateObj) {
  try {
    var lines = Object.keys(stateObj).map(function (k) { return k + ': ' + JSON.stringify(stateObj[k]); });
    var block = '<state>\n' + lines.join('\n') + '\n</state>';
    if (topWin.LWB_StateV2 && typeof topWin.LWB_StateV2.applyText === 'function') {
      topWin.LWB_StateV2.applyText(block, { silent: true });
    }
    Object.keys(stateObj).forEach(function (k) { varSet(k, stateObj[k]); });
  } catch (e) {}
}
```

## 3. 从聊天记录与 DOM 双通道提取 `<status>`

先扫描 `SillyTavern.getContext().chat` 最近 6 条消息的原始文本（不受显示正则影响），若未命中再扫描页面 `.mes_text, .mes, .msg` 的 `innerHTML || textContent`：

```javascript
var STATUS_RE = /<status>\s*\[?([\s\S]*?)\]?\s*<\/status>/i;
function readLatestStatus() {
  var c = stCtx();
  var msgs = (c && Array.isArray(c.chat)) ? c.chat.slice(-6) : [];
  for (var i = msgs.length - 1; i >= 0; i--) {
    var raw = String((msgs[i] && (msgs[i].mes || msgs[i].message || msgs[i].content)) || '');
    var m = raw.match(STATUS_RE);
    if (m) return parseStatusBody(m[1]);
  }
  try {
    var nodes = topDoc.querySelectorAll('.mes_text, .mes, .msg');
    for (var j = nodes.length - 1; j >= 0; j--) {
      var m2 = String(nodes[j].innerHTML || nodes[j].textContent || '').match(STATUS_RE);
      if (m2) return parseStatusBody(m2[1]);
    }
  } catch (e) {}
  return null;
}
```

## 4. 行动文本「填入输入框」与「直接发送」双按钮

前端底部操作栏同时提供「填入输入框（允许玩家补充修改后再发）」与「直接发送」两个按钮，不强行替玩家直接发出：

```javascript
function fillInput(txt) {
  var ta = topDoc.querySelector('#send_textarea');
  if (!ta) return false;
  ta.value = txt;
  ta.dispatchEvent(new topWin.Event('input', { bubbles: true }));
  ta.dispatchEvent(new topWin.Event('change', { bubbles: true }));
  try { ta.focus(); } catch (e) {}
  return true;
}
function sendInput(txt) {
  if (!fillInput(txt)) return false;
  var btn = topDoc.querySelector('#send_but');
  topWin.setTimeout(function () { if (btn) btn.click(); }, 60);
  return true;
}
```

# 三、交互终端与场景状态机设计法则

针对带据点日常、多场景切换或属性成长的角色卡，前端交互不应做成无限制随意瞬移的旅游地图，而应根据卡片核心体验采用以下三层状态机与属性阈值机制：

## 1. 三层场景状态机（主舞台 ∥ 每日限次外出窗口 ∥ 强制事件锁定）

| 层级 | 触发条件 | 玩家权限与前端表现 |
|---|---|---|
| 常驻主舞台（主场景昼/夜） | 默认常驻（`<status>` 的 `位置` 处于主舞台内） | 右下角常驻开放 `☀ 主场景·昼` 与 `☽ 主场景·夜`；画面中央渲染场景物件交互热点（桌案、床铺、书架、器物等），右侧面板列出日常互动与修习行动 |
| 每日限次外出窗口 | 每日限 `1/1` 次（对应自由活动时段或看护空档） | 点击 `✦ 自由外出 (1/1)` 弹出外部场景选择面板；进入外部场景选定一次行动后，当日次数立即扣减为 `■ 今日外出已用 (0/1)`，直至切到夜间点击 `↻ 入眠进入次日` 才重置回 `1/1` |
| 强制事件场景（锁定） | 当 `<status>` 的 `位置` 变为特殊外部场所，或触发强制剧情事件 | 自动切入对应场景背景，顶部挂出醒目横幅 `⚠ 强制事件进行中 · 不可自选离开`；期间锁死主舞台切换与自由外出，行动列表只展示该强制事件下的应对选项，直至下一轮 `<status>` 位置回到主舞台才自动解除锁定 |

## 2. 多维属性阈值与三档行动解锁

- 状态栏同步结算：将可成长属性（如 `属性A: X/100 | 属性B: X/100`）与角色关系指标（如 `阶段`、`好感`、`信任`）写进状态栏定义与每轮 `<status>`，前端每次打开或 AI 回复结束后自动解析并更新进度条。
- 行动列表分三档展示，给玩家清晰的目标感：
  1. **基础日常项**：无门槛随时可选，右侧标注属性成长方向（如 `属性A+`、`好感+`）。
  2. **未达标带锁项（`.lock`）**：在列表中以**半透明虚线框**展示，直接写明解锁条件（如 `■ 需 属性A ≥ 25 · 好感 ≥ 60`），不隐藏条目，让玩家明确知道当前该刷哪项日常。
  3. **已解锁突破/里程碑项（`.open`）**：属性达标后自动点亮为高亮边框选项（`✦`），点击后装填对应的突破剧情行动，并在档案抽屉里点亮对应的里程碑徽章（`.lit`）。

## 3. 视觉与布局防踩坑四条规则

- **背景切换禁用 `transition: background-image`**：当背景是数百 KB 的 Base64 Data URL 时，在 Chromium 下给背景容器加 `transition: background-image .5s ease` 会导致切场景时画面卡在旧图不刷新；背景应直接替换 `style.backgroundImage`，靠前景遮罩或立绘 `.fade` 透明度过渡。
- **底部栏左右分区防重叠**：左下角固定放置行动草稿栏 `#ct-foot`（行动预览输入框 + `填入输入框` + `直接发送`，宽 `min(460px, 44vw)`），右下角固定放置场景切换栏 `#ct-map`（`right: 3%; left: auto; transform: none`），两侧严禁同时使用 `bottom: 14px; left: 50%`。
- **同框立绘比例对齐**：主立绘若为全身像（`height: 86%~88%`），副立绘若为半身像，副立绘容器高度必须按头身比缩放到 `height: 44%~48%`，避免副角色头部比主角色大一倍或遮挡画面中央的交互热点。
- **立绘档位聚焦当前玩法**：立绘切换按钮只保留贴合当前玩法的档位（如 `主角色单人` / `双人同框` / `纯实景视野` 或情绪差分），不塞入与当前场景无关的形态。

# 四、本地素材打包与独立预览工作流

当角色卡包含多张立绘、场景背景、CG 与徽章图标时，不要手写巨型 Base64 字符串，直接使用本技能自带的模板与打包脚本：

- 前端骨架模板：`references/terminal-template.src.js`（已内置顶层窗口穿透、幂等卸载、四通道变量同步、`<status>` 双通道解析、三层场景状态机、三档行动列表、档案徽章抽屉、立绘切换与离线调试钩子，留有 `var ASSETS = __ASSETS__;` 占位）。
- 一键打包脚本：`scripts/pack-xiaobaix.mjs`（零第三方依赖，Node.js 原生可跑）。

## 1. 素材目录约定（`assets/`）

在卡工程工作区旁准备一个 `assets/` 文件夹，文件名（不含扩展名）即自动成为前端 `ASSETS.<键名>` 的属性名（支持 `.webp` / `.png` / `.jpg` / `.jpeg` / `.svg` / `.gif`）：

```
assets/
├── logo.png                # 左上角终端标题 Logo
├── av_main.png             # 主角色状态栏头像
├── sp_main.png             # 主角色透明底立绘（可追加 sp_main_alt.png 等差分）
├── sp_sub.png              # 副角色或玩家载体透明底立绘（可选）
├── bg_main_day.webp        # 常驻主舞台：昼
├── bg_main_night.webp      # 常驻主舞台：夜
├── bg_scene_1.webp         # 外部场景 1（自由外出或强制事件）
├── bg_scene_2.webp         # 外部场景 2
├── cg_memory_1.webp        # 档案回廊 CG 1
└── badge_1.png ~ badge_8.png # 里程碑徽章图标
```

体积控制建议：透明底立绘压为 `height <= 900px` 的 WebP（`-q:v 82`，约 35~50KB/张），场景背景压为 `1280x720` 的 WebP（`-q:v 78`，约 35~60KB/张），20~25 张图总包体积控制在 600~850KB 以内。

## 2. 从模板定制并执行一键打包

1. 复制本技能的 `references/terminal-template.src.js` 到工作目录（如 `terminal.src.js`），按当前角色卡的实际设定修改顶部的 `CARD_CONFIG`（标题、状态字段映射、主舞台热点、外部场景列表、日常与突破行动表、里程碑徽章表）。
2. 运行本技能自带的打包脚本：

```bash
node "<本技能目录>/scripts/pack-xiaobaix.mjs" \
  --src "./terminal.src.js" \
  --assets "./assets" \
  --card "D:/cards/<卡名>" \
  --name "[角色名] 交互终端"
```

脚本一次运行自动产出三项结果：

1. 将 `./assets` 下所有图片转为 `data:image/...;base64,...` 字典注入 `__ASSETS__`（若传入 `--fallback-assets ./old-assets.json` 则自动补齐未替换的旧图）；
2. 生成标准双兼容结构的 `D:/cards/<卡名>/scripts/xiaobaix-tasks.json`（含 `chat_changed` 挂载任务与 `after_ai` 自动同步任务）；
3. 在源码同目录生成可双击离线运行的 `preview.html`，支持 URL 参数快速验证三态：
   - `preview.html`：默认初始状态（主舞台·昼，自由外出 `1/1`，未达标项带锁）；
   - `preview.html?mid=1`：中后期状态（属性达标，进阶行动 `.open` 与里程碑徽章点亮）；
   - `preview.html?freepop=1`：自动打开每日自由外出场景选择面板；
   - `preview.html?forced=1`：模拟 `<status>` 位置进入强制事件场景，验证顶部锁定横幅与退出限制。

# 五、交付前核查清单

- [ ] `scripts/` 下只有 `xiaobaix-tasks.json`，未混入酒馆助手脚本或 `variables.json`。
- [ ] `xiaobaix-tasks.json` 同时包含 `tasks` 与 `character_tasks`，且主挂载任务的 `triggerTiming` 为 `"chat_changed"`、`buttonActivated` 为 `true`。
- [ ] `regex/` 状态栏美化正则设置 `"markdownOnly": true`、`"promptOnly": false`，且 `.html` 末尾保留了 `<span style="display:none;"><status>...</status></span>`。
- [ ] 前端脚本通过 `topDoc[MOUNT]` 实现了重复执行的幂等卸载，不会叠加多个悬浮球或定时器和监听。
- [ ] 背景切换未使用 `transition: background-image`，左下操作栏与右下场景栏互不重叠。
- [ ] `preview.html` 的默认态、`?mid=1`、`?freepop=1`、`?forced=1` 四个状态均无语法报错。

# 资源

- `scripts/pack-xiaobaix.mjs`：将本地 `assets/` 目录图片打包为 Base64 注入 `terminal.src.js`，并同步生成 `<卡工程>/scripts/xiaobaix-tasks.json` 与离线调试页 `preview.html`。
- `references/terminal-template.src.js`：通用小白X全屏交互终端完整源码骨架（含 `CARD_CONFIG` 配置区、顶层穿透、四通道变量同步、三层场景状态机、三档行动列表、档案抽屉与 `?mid=1`/`?freepop=1`/`?forced=1` 调试支持）。
