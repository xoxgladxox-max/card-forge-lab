---
name: cf-card-xiaobaix
description: v1.2.0｜小白X（LittleWhiteBox）角色卡前端与循环任务构建：纯小白X架构（零酒馆助手依赖）、<<taskjs>> 循环任务挂载、LWB_StateV2 与 variables.local 状态同步、楼层胶囊条与隐藏状态容器、终端内剧情正文阅读框、无图期 CG 折叠槽、桌面双栏与手机四 Tab 自适应、游戏化展示与叙事行动分层、前端随机与保底、三层场景状态机、属性阈值解锁，以及本地美术素材 Base64 打包与独立 HTML 预览。用户说「做小白X前端」「写 taskjs」「小白X任务」「做交互终端」「养成前端」「状态栏 HUD」「打包前端素材」时使用。
metadata:
  version: 1.2.0
  updated: 2026-10-21
---

# 小白X角色卡前端与任务构建（v1.2.0）

范围：角色卡内嵌的小白X（LittleWhiteBox）循环任务（`xiaobaix-tasks`）、全屏交互终端、楼层状态栏 HUD 正则、状态变量读写（`LWB_StateV2` 与 `variables.local`）、场景与属性养成状态机，以及本地美术素材的分离打包与独立预览。

总规则：

- 纯小白X架构（不混入酒馆助手）：卡工程 `scripts/` 目录下只放 `xiaobaix-tasks.json`（对应卡内 `data.extensions['xiaobaix-tasks']`）。不要在 `scripts/` 下放置 `<序号>-<名>.json` + `.js` 或 `variables.json`，否则构建工具会同时装配出 `extensions.tavern_helper`。
- 源码与素材分离：前端源码（`terminal.src.js`，约 20~30KB）只写逻辑、配置与样式，用 `var ASSETS = __ASSETS__;` 占位；图片转为 WebP/PNG/JPG Base64 并注入 `xiaobaix-tasks.json` 的步骤由本技能自带的 `scripts/pack-xiaobaix.mjs` 完成，避免源码因内嵌数 MB 图片无法编辑或版本比对。
- 不破坏原卡状态栏与世界书触发：正文末尾的 `<status>[...]</status>`（及隐藏锚点注释）保持原卡约定格式一字不改；前端通过聊天记录与 DOM `innerHTML` 双通道解析 `<status>`，并同步给小白X的 `LWB_StateV2.applyText` 与 `SillyTavern.getContext().variables.local`。
- 顶层窗口穿透与幂等热清理：小白X的 `<<taskjs>>` 运行在异步函数作用域或子 iframe 中，挂载全屏终端与悬浮按钮时需穿透到 `window.parent`，并在每次重跑时自动卸载旧 DOM 节点、样式表、事件监听与定时器。

# 一、卡工程槽位与小白X数据结构

在角色卡工程目录中，小白X前端由 `regex/` 与 `scripts/xiaobaix-tasks.json` 两个槽位组成；源码、素材和预览放在 `前端源码/`，不进卡：

```
D:\cards\<卡名>\
├── regex/
│   ├── 01-状态栏HUD.json         # 楼层内 <status> 美化正则配置
│   └── 01-状态栏HUD.html         # replaceString：一行胶囊条 + 隐藏状态容器
├── scripts/
│   └── xiaobaix-tasks.json       # 小白X循环任务（构建时自动写入 data.extensions['xiaobaix-tasks']）
└── 前端源码/                     # terminal.src.js、assets/、preview.html；装卡和同步都不读这里
```

- 装卡和同步只读 `regex/`、`scripts/` 下一层的 `.json`/`.html`/`.js`。源码、图片、`preview.html` 不要放进这两个目录，也不要放在 `world_book/`、`message/` 里。
- 同一作品要在酒馆里同时保留文字版和前端版时，做成两个并排的卡工程：只有前端版带 `regex/`、`scripts/`、`前端源码/`；两张卡的世界书名分开，避免推送一张覆盖另一张在用的世界书。

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

## 2. `regex/01-状态栏HUD.json` + `.html`：楼层胶囊条与隐藏状态容器

楼层里不渲染大面板，也不保留 `[▓▓▓░░░]` 这类 ASCII 进度条。每个楼层只显示一行 32~36px 高的胶囊条，完整状态放在终端里看。

- `.json` 设置 `"placement": [2]`（只处理 AI 楼层；用户楼层也写状态时改 `[1, 2]`）、`"markdownOnly": true`、`"promptOnly": false`，只改网页显示，不改发给模型的上下文。
- `.html`（即 `replaceString`）结构：
  ```html
  <div class="card-floor-bar"><span>✦ $1 · $2</span><button type="button" data-ct-open="1">打开终端</button></div>
  <div class="card-raw-status" style="display:none;">$0</div>
  ```
- 隐藏容器用 `$0`（或 `{{match}}`，酒馆会换成 `$0`）放回整段原始匹配。不要把捕获组 `$1`、`$2` 拼回一个手写的 `<status>` 标签，捕获内容里有未闭合标签或特殊符号时会弄坏楼层 DOM。
- 酒馆渲染楼层 HTML 时会经过 DOMPurify 净化（`MESSAGE_SANITIZE`），有三点影响：
  - `onclick` 等内联事件属性会被删掉。胶囊按钮只写 `data-ct-open`，由终端脚本在顶层文档上用事件委托接管点击。
  - `class="x"` 会被改写成 `class="custom-x"`（`fa-`、`note-` 开头的除外）。脚本查节点时两种写法都要认，例如 `.card-raw-status, .custom-card-raw-status`。正则 `.html` 里自带的 `<style>` 选择器也会被自动加 `.custom-` 前缀，写样式时按原名写即可。
  - `<status>` 属于未知标签，内部换行会被转成 `<br>`。所以从 DOM 读状态时读隐藏容器的 `textContent`，不靠 `innerHTML` 匹配 `<status>` 字样。
- 终端脚本分两路取数据：
  - 结构化状态：先读 `SillyTavern.getContext().chat` 最近几条消息原文里的 `<status>`（不受显示正则影响），没有再读 `.card-raw-status` 的 `textContent`。
  - 楼层纯正文：克隆最后一个 AI 楼层的 `.mes_text` 节点，删掉胶囊条、隐藏状态容器、`style`、`script` 后取文本。克隆节点不在文档里，`innerText` 不会分行，需要先把 `<br>` 和块级元素换成换行再取 `textContent`。

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

## 3. 楼层状态与正文的提取

状态先读聊天记录原文，再读隐藏容器；正文先读最后一个 AI 楼层的 `.mes_text` 克隆，再回退聊天记录原文（完整实现见模板第 4 节）：

```javascript
var STATUS_RE = /<status>\s*\[?([\s\S]*?)\]?\s*<\/status>/i;
function classSel(name) { return '.' + name + ', .custom-' + name; }

function readLatestStatus() {
  var msgs = chatMessages().slice(-6);
  for (var i = msgs.length - 1; i >= 0; i--) {
    var m = rawText(msgs[i]).match(STATUS_RE);
    if (m) return parseStatusBody(m[1]);
  }
  var raws = topDoc.querySelectorAll(classSel('card-raw-status'));
  for (var j = raws.length - 1; j >= 0; j--) {
    var t = String(raws[j].textContent || '');
    var m2 = t.match(STATUS_RE);
    var body = m2 ? m2[1] : t.trim().replace(/^\[/, '').replace(/\]$/, '');
    if (body.trim()) return parseStatusBody(body);
  }
  return null;
}

function readLatestNarrative() {
  var nodes = topDoc.querySelectorAll('#chat .mes[is_user="false"] .mes_text');
  if (!nodes.length) return '';
  var clone = nodes[nodes.length - 1].cloneNode(true);
  clone.querySelectorAll(classSel('card-floor-bar') + ', ' + classSel('card-raw-status') + ', style, script')
    .forEach(function (n) { n.remove(); });
  return nodeToText(clone); // 先把 <br> 与块级元素换成换行，再取 textContent
}
```

## 4. 行动文本「填入输入框」与「直接发送」双按钮

底栏同时提供两个按钮，不替玩家自动发出：

- 填入输入框：写入 `#send_textarea` 并触发 `input`、`change`，关闭终端，让玩家在酒馆输入框里继续改。
- 直接发送：写入后延迟约 60ms 点击 `#send_but`，终端保持打开，玩家留在终端里等下一轮正文。

```javascript
function fillInput(txt) {
  var ta = topDoc.querySelector('#send_textarea');
  if (!txt || !ta) return false;
  ta.value = txt;
  ta.dispatchEvent(new topWin.Event('input', { bubbles: true }));
  ta.dispatchEvent(new topWin.Event('change', { bubbles: true }));
  root.classList.remove('open');
  ta.focus();
  return true;
}
function sendInput(txt) {
  var ta = topDoc.querySelector('#send_textarea');
  var btn = topDoc.querySelector('#send_but');
  if (!txt || !ta || !btn) return false;
  ta.value = txt;
  ta.dispatchEvent(new topWin.Event('input', { bubbles: true }));
  topWin.setTimeout(function () { btn.click(); }, 60);
  return true;
}
```

## 5. 事件与定时器的卸载

终端挂在顶层文档上的监听（楼层胶囊点击委托、`resize`）和定时器（正文轮询），必须在 `topDoc[MOUNT_KEY]` 里逐一移除。否则同名任务重跑一次，就多一份监听，点一次胶囊会打开多次。也可以改用沙箱注入的 `addListener` 与 `setIntervalSafe`，由小白X在任务中止时清理。

# 三、终端布局与阅读体验

## 1. 终端内置剧情正文阅读框

全屏终端会盖住聊天楼层。如果终端里只有数值和按钮，玩家每轮都要关终端看正文、再开终端选行动。做法：

- 左栏主体是「本轮剧情正文」滚动框，占左栏高度的 70%~75% 以上（CG 槽折叠时铺满），字号 14.5~15px，行高 1.85~1.95。
- 用轻量正则给 `「台词」` 与 `（旁白 / 译文）` 各加一种颜色。高亮前先做 HTML 转义，再套 `<span>`。
- 正文在三个时机刷新：打开终端时、`after_ai` 同步任务调用 `__cardTerminalSync` 时、终端打开期间每 2 秒轮询一次（跟上流式输出与重新生成）。内容没变时不重绘，避免滚动位置被重置。

## 2. 无图期的紧凑布局与 CG 折叠槽

制卡初期通常还没有立绘和 CG。按有图布局预留半屏画面，只能放占位图标。做法：

- 顶栏左侧放 44×44 小头像徽章（有 `av_main` 素材用图，没有用一个字符），正文框铺满左栏。
- 场景背景、立绘、画面热点放进一个默认 `height: 0; overflow: hidden;` 的折叠层 `#cg-layer`。顶栏和正文框右上角各放一个 `▣ CG预留: 关/开` 开关，展开后高 240~260px。开关状态写入变量，下次打开保持。
- 折叠时不渲染立绘和热点；画面热点同时以按钮组出现在「行动」页顶部，无图期也能用。
- 后期把 `cg_xxx`、`bg_xxx`、`sp_xxx` 放进 `assets/` 重新打包，打开开关即可，不改布局代码。

## 3. 桌面双栏与手机单屏四 Tab

手机竖屏把双栏简单改成上下堆叠，上下两块各只剩一半高度，两边都不好滚动。做法：

- 根容器写 `height: 100vh; height: 100dvh;`，适配手机浏览器会伸缩的地址栏。根容器用纵向 flex：顶栏 / 主体 / 底栏，主体 `flex: 1; min-height: 0`，内部滚动区也要 `min-height: 0`，否则 flex 子项不会出现滚动条。
- 桌面（大于 820px）：左栏常驻（CG 槽 + 正文），右栏 3 个 Tab（行动 / 场景 / 档案），第一个 `.mob-only` 的「✦ 剧情正文」Tab 隐藏。
- 手机（`@media (max-width: 820px)`）：显示 4 个 Tab。切到「剧情正文」时只显示左栏；切到其余 3 个时隐藏左栏，功能面板占满整屏高度。手机打开终端时默认停在正文 Tab。
- 手机顶栏状态药丸单独占一行，`flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none;` 横向滑动。底栏第一行是全宽输入框，第二行两个按钮对半。
- 从手机宽度变回桌面宽度时，如果当前 Tab 是正文，自动切回「行动」，避免右栏空白。

## 4. 视觉防踩坑

- 背景切换禁用 `transition: background-image`：背景是数百 KB 的 Base64 Data URL 时，Chromium 下会卡在旧图不刷新。直接替换 `style.backgroundImage`，过渡靠前景遮罩或立绘透明度。
- 同框立绘比例：主立绘是全身像（`height: 86%~88%`）、副立绘是半身像时，副立绘高度按头身比缩到 `44%~48%`，避免副角色头部比主角色大一倍。
- 立绘档位只保留当前玩法用得到的（如单人 / 双人同框 / 纯场景，或情绪差分）。
- 终端所有插入 `innerHTML` 的文本（状态值、正文、配置里的标题）先转义。状态值和正文来自 AI 输出，可能带 `<`、`&`。

# 四、游戏化前端与 AI 上下文

## 1. 展示层与叙事行动层分开

前端可以做稀有度徽章、概率公示、十连网格、购物车总价这类游戏化反馈。但发给 AI 的文本如果带着「抽到 SSR」「保底」「商店」这类系统词，AI 会在正文里报系统名、解释规则。做法：

- 每张卡面、商品、行动的数据拆成两层：
  - 展示层：`r`（稀有度）、`title`、`desc`、`gain`、`reqText`，只在前端界面显示。
  - 叙事行动层：`act`（模板里叫 `prompt`），是点击后装填进输入框的文本。
- `act` 只写角色在当前场景里会做的自然行动，不出现稀有度、概率、价格、属性名、「【阶段突破】」一类界面标签。
- 不代写 {{user}} 的心理和连续决定。`act` 写成一个行动的起点，玩家可以在草稿框里继续改。

示例（按当前卡改写）：

```javascript
{ r: 'SSR', title: '糖果券 · 午后特权', desc: '可提出一个小请求', act: '把口袋里那张盖了印的糖果券递过去，提醒她这张券今天还没用。' }
```

## 2. 随机结果由前端决定

LLM 掷骰会偏向固定几项或无视概率。抽卡、掉落、事件抽取等随机结果全部在前端 JS 里算好，再把结果对应的 `act` 发给 AI。

- 用 `crypto.getRandomValues` 取随机数（不可用时回退 `Math.random`）。
- 保底状态 `pity`（距上次最高稀有度的抽数）与 `totalPulls` 用 `varSet` 持久化，切聊天或重载不丢。
- 文字卡一局常见 5~15 轮，保底参数按短局设计。以下是一组参考值，按当前卡节奏调整：
  - 硬保底：25~30 抽必出最高稀有度。
  - 软保底：第 15 抽起，每抽最高稀有度概率 +6%、次高稀有度 +3%。
  - 十连：至少一张 SR 及以上。
- 抽完做三件事：把 `act` 装填进草稿框；把结果写进状态变量（例如角色专属字段「刚抿出的物品」）；用 `varSet` 持久化 `pity`。状态变量里写物品的场景内名称，不写稀有度。

```javascript
function rand01() {
  try { var a = new Uint32Array(1); topWin.crypto.getRandomValues(a); return a[0] / 4294967296; }
  catch (e) { return Math.random(); }
}
function rollOneCard(state, cfg) {
  state.pity += 1; state.totalPulls += 1;
  var soft = Math.max(0, state.pity - cfg.softStart + 1);
  var pTop = state.pity >= cfg.hardPity ? 1 : cfg.base.UR + soft * cfg.softStep.UR;
  var pSSR = cfg.base.SSR + soft * cfg.softStep.SSR;
  var x = rand01();
  var r = x < pTop ? 'UR' : x < pTop + pSSR ? 'SSR' : x < pTop + pSSR + cfg.base.SR ? 'SR' : x < pTop + pSSR + cfg.base.SR + cfg.base.R ? 'R' : 'N';
  if (r === 'UR') state.pity = 0;
  var pool = cfg.pool[r];
  return pool[Math.floor(rand01() * pool.length)];
}
```

# 五、交互终端与场景状态机设计法则

针对带据点日常、多场景切换或属性成长的角色卡，前端交互不应做成无限制随意瞬移的旅游地图，而应根据卡片核心体验采用以下三层状态机与属性阈值机制：

## 1. 三层场景状态机（主舞台 ∥ 每日限次外出窗口 ∥ 强制事件锁定）

| 层级 | 触发条件 | 玩家权限与前端表现 |
|---|---|---|
| 常驻主舞台（主场景昼/夜） | 默认常驻（`<status>` 的 `位置` 处于主舞台内） | 「场景」页开放 `☀ 主场景·昼` 与 `☽ 主场景·夜`；场景物件热点（桌案、床铺、书架、器物等）在 CG 槽展开时标在画面上，同时以按钮组出现在「行动」页；「行动」页列出日常互动 |
| 每日限次外出窗口 | 每日限 `1/1` 次（对应自由活动时段或看护空档） | 点击 `✦ 自由外出 (1/1)` 弹出外部场景选择面板；进入外部场景选定一次行动后，当日次数立即扣减为 `■ 今日外出已用 (0/1)`，直至切到夜间点击 `↻ 入眠进入次日` 才重置回 `1/1` |
| 强制事件场景（锁定） | 当 `<status>` 的 `位置` 变为特殊外部场所，或触发强制剧情事件 | 自动切入对应场景背景，顶部挂出醒目横幅 `⚠ 强制事件进行中 · 不可自选离开`；期间锁死主舞台切换与自由外出，行动列表只展示该强制事件下的应对选项，直至下一轮 `<status>` 位置回到主舞台才自动解除锁定 |

## 2. 多维属性阈值与三档行动解锁

- 状态栏同步结算：将可成长属性（如 `属性A: X/100 | 属性B: X/100`）与角色关系指标（如 `阶段`、`好感`、`信任`）写进状态栏定义与每轮 `<status>`，前端每次打开或 AI 回复结束后自动解析并更新进度条。
- 行动列表分三档展示，给玩家清晰的目标感：
  1. **基础日常项**：无门槛随时可选，右侧标注属性成长方向（如 `属性A+`、`好感+`）。
  2. **未达标带锁项（`.lock`）**：在列表中以**半透明虚线框**展示，直接写明解锁条件（如 `■ 需 属性A ≥ 25 · 好感 ≥ 60`），不隐藏条目，让玩家明确知道当前该刷哪项日常。
  3. **已解锁突破/里程碑项（`.open`）**：属性达标后自动点亮为高亮边框选项（`✦`），点击后装填对应的突破剧情行动，并在档案抽屉里点亮对应的里程碑徽章（`.lit`）。

## 3. 前端阈值与 AI 状态的关系

属性数值以 AI 每轮输出的 `<status>` 为准，前端只读取和判断阈值，不自行给属性加减。前端自己维护的只有界面状态（昼夜、外出次数、CG 开关、立绘档位、已点亮徽章、抽卡保底）。两类状态不要混在一个字段里。

# 六、本地素材打包与独立预览工作流

当角色卡包含多张立绘、场景背景、CG 与徽章图标时，不要手写巨型 Base64 字符串，直接使用本技能自带的模板与打包脚本：

- 前端骨架模板：`references/terminal-template.src.js`（已内置顶层窗口穿透、幂等卸载、四通道变量同步、状态与正文提取、剧情正文阅读框、CG 折叠槽、桌面双栏与手机四 Tab、楼层胶囊点击委托、三层场景状态机、三档行动列表、档案徽章与离线调试钩子，留有 `var ASSETS = __ASSETS__;` 占位）。模板不含抽卡模块，需要时按第四节加。
- 一键打包脚本：`scripts/pack-xiaobaix.mjs`（零第三方依赖，Node.js 原生可跑）。

## 1. 素材目录约定（`assets/`）

在卡工程工作区旁准备一个 `assets/` 文件夹，文件名（不含扩展名）即自动成为前端 `ASSETS.<键名>` 的属性名（支持 `.webp` / `.png` / `.jpg` / `.jpeg` / `.svg` / `.gif`）：

```
assets/
├── av_main.png             # 顶栏 44×44 头像徽章（没有时显示字符）
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

1. 复制本技能的 `references/terminal-template.src.js` 到卡工程的 `前端源码/terminal.src.js`，素材放 `前端源码/assets/`，按当前角色卡的实际设定修改顶部的 `CARD_CONFIG`（标题、楼层 class 名、正文高亮规则、CG 槽高度、状态字段映射、主舞台热点、外部场景列表、日常与突破行动表、里程碑徽章表）。
2. 只改 `.src.js` 这一份源码。打包脚本只做 `__ASSETS__` 词法替换，不剥离注释、不压缩。不要在 Node 或 Python 脚本里用模板字符串拼接前端 JS，也不要对整段 JS 做按行 `#` 或 `//` 的注释剥离，这类处理会误伤颜色值 `#ff4d8d`、URL 和正则字面量。
3. 运行本技能自带的打包脚本：

```bash
node "<本技能目录>/scripts/pack-xiaobaix.mjs" \
  --src "D:/cards/<卡名>/前端源码/terminal.src.js" \
  --assets "D:/cards/<卡名>/前端源码/assets" \
  --card "D:/cards/<卡名>" \
  --name "[角色名] 交互终端"
```

脚本一次运行自动产出三项结果：

1. 将 `前端源码/assets` 下所有图片转为 `data:image/...;base64,...` 字典注入 `__ASSETS__`（若传入 `--fallback-assets ./old-assets.json` 则自动补齐未替换的旧图）；
2. 生成标准双兼容结构的 `D:/cards/<卡名>/scripts/xiaobaix-tasks.json`（含 `chat_changed` 挂载任务与 `after_ai` 自动同步任务）；
3. 在源码同目录生成可双击离线运行的 `preview.html`（内含模拟 AI 楼层、胶囊条与隐藏状态容器），支持 URL 参数：
   - `preview.html`：默认初始状态（主舞台·昼，自由外出 `1/1`，未达标项带锁）；
   - `preview.html?mid=1`：中后期状态（属性达标，进阶行动 `.open` 与里程碑徽章点亮）；
   - `preview.html?freepop=1`：打开「场景」页的外出目的地列表；
   - `preview.html?forced=1`：模拟 `<status>` 位置进入强制事件场景，验证锁定横幅与退出限制；
   - `preview.html?cg=1`：展开 CG 槽；
   - `preview.html?tab=story`：指定初始 Tab（`story` / `actions` / `scene` / `archive`）。手机布局用浏览器开发者工具的设备模式看。

# 七、交付前核查清单

- [ ] `scripts/` 下只有 `xiaobaix-tasks.json`，未混入酒馆助手脚本或 `variables.json`。
- [ ] `xiaobaix-tasks.json` 同时包含 `tasks` 与 `character_tasks`，且主挂载任务的 `triggerTiming` 为 `"chat_changed"`、`buttonActivated` 为 `true`。
- [ ] `regex/` 状态栏正则设置 `"markdownOnly": true`、`"promptOnly": false`；`.html` 只渲染一行胶囊条，隐藏容器用 `$0`；胶囊按钮用 `data-ct-open`，不写 `onclick`。
- [ ] 脚本查楼层节点时同时认 `.x` 与 `.custom-x`。
- [ ] 终端内有剧情正文阅读框，正文里不含胶囊条和状态文本。
- [ ] 插入 `innerHTML` 的状态值与正文已转义。
- [ ] 发给 AI 的 `act` / `prompt` 文本里没有稀有度、概率、价格、属性名等界面词。
- [ ] 有随机结果时由前端计算，保底状态已持久化。
- [ ] `topDoc[MOUNT_KEY]` 卸载时移除了 DOM、样式表、顶层文档与窗口上的监听和定时器。
- [ ] 背景切换未使用 `transition: background-image`。
- [ ] 桌面宽度与 820px 以下两种布局都能滚动正文和功能面板。
- [ ] `preview.html` 的默认态与 `?mid=1`、`?freepop=1`、`?forced=1`、`?cg=1` 无报错。

# 资源

- `scripts/pack-xiaobaix.mjs`：将本地 `assets/` 目录图片打包为 Base64 注入 `terminal.src.js`，并同步生成 `<卡工程>/scripts/xiaobaix-tasks.json` 与离线调试页 `preview.html`。
- `references/terminal-template.src.js`：通用小白X全屏交互终端完整源码骨架（含 `CARD_CONFIG` 配置区、顶层穿透、四通道变量同步、剧情正文框、CG 折叠槽、桌面双栏与手机四 Tab、三层场景状态机、三档行动列表、档案徽章与离线调试参数）。
