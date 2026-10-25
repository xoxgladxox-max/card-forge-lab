/* terminal-template.src.js：小白X（LittleWhiteBox）角色卡全屏交互终端通用模板
 * 用法：
 *   1. 复制本文件为 terminal.src.js，按当前角色卡设定修改 CARD_CONFIG；
 *   2. 准备 assets/ 目录后运行 pack-xiaobaix.mjs 生成 scripts/xiaobaix-tasks.json 与 preview.html。
 * 布局：桌面 > 820px 为左栏（CG 预留槽 + 剧情正文阅读框）+ 右栏（行动 / 场景 / 档案）；
 *       手机 <= 820px 为 100dvh 单屏四 Tab（剧情正文 / 行动 / 场景 / 档案）。
 */
(function () {
  'use strict';

  var ASSETS = __ASSETS__;

  // ==================== 1. 角色卡可定制配置区 ====================
  var CARD_CONFIG = {
    storagePrefix: 'ct_card_v1_',
    title: '据点日常终端',
    subtitle: 'SCENE & PROGRESS TERMINAL',
    launcherLabel: '✦ 终端',
    avatarKey: 'av_main',
    avatarFallback: '✦',
    // 楼层正则 .html 里使用的两个 class（酒馆渲染楼层时会自动加 custom- 前缀，脚本两种写法都认）
    floorBarClass: 'card-floor-bar',
    rawStatusClass: 'card-raw-status',
    mobileBreakpoint: 820,
    narrative: {
      title: '本轮剧情正文',
      emptyText: '暂无 AI 正文。发送第一条消息后，这里会显示最新一轮剧情。',
      highlights: [
        { re: /「[^」\n]*」/g, cls: 'ct-q' },
        { re: /（[^）\n]*）/g, cls: 'ct-aside' }
      ]
    },
    cgSlot: { defaultOpen: false, height: 250 },
    statusDefaults: {
      location: '主房间·昼',
      stage: '阶段一',
      favor: 20,
      attrA: 15,
      attrB: 10,
      attrC: 10
    },
    statusFieldMap: {
      '位置': 'location',
      '地点': 'location',
      '阶段': 'stage',
      '好感': 'favor',
      '好感度': 'favor',
      '属性A': 'attrA',
      '属性B': 'attrB',
      '属性C': 'attrC'
    },
    textFields: ['location', 'stage'],
    statsDisplay: [
      { key: 'favor', label: '好感', max: 100 },
      { key: 'attrA', label: '属性A', max: 100 },
      { key: 'attrB', label: '属性B', max: 100 },
      { key: 'attrC', label: '属性C', max: 100 }
    ],
    mainScenes: {
      day: { id: 'room_day', name: '主房间·昼', bgKey: 'bg_main_day', fallbackBg: 'linear-gradient(135deg,#1d2432,#2e384d)' },
      night: { id: 'room_night', name: '主房间·夜', bgKey: 'bg_main_night', fallbackBg: 'linear-gradient(135deg,#0f131d,#1b2234)' }
    },
    roomHotspots: [
      { id: 'hs_desk', label: '书案', x: 28, y: 56, prompt: '走近书案整理日常记录，向角色询问今日的安排。', gain: '属性A+' },
      { id: 'hs_bed', label: '床铺', x: 66, y: 62, prompt: '在床铺旁坐下稍作休整，观察角色的反应。', gain: '好感+' },
      { id: 'hs_window', label: '窗台', x: 46, y: 38, prompt: '站在窗台边向外眺望，与角色聊起外面的动静。', gain: '属性B+' }
    ],
    freeOutingScenes: [
      {
        id: 'scene_1',
        name: '外部场景一',
        bgKey: 'bg_scene_1',
        fallbackBg: 'linear-gradient(135deg,#1f2d2b,#2b413e)',
        desc: '每日自由活动时段可前往的相邻区域。',
        actions: [
          { title: '在外部场景一观察环境', gain: '属性B+', prompt: '前往外部场景一，仔细观察周遭布置并做记录。' },
          { title: '在外部场景一搜集日常物资', gain: '属性A+', prompt: '在外部场景一驻足停留，搜集可用的日常物品后准备返回。' }
        ]
      },
      {
        id: 'scene_2',
        name: '外部场景二',
        bgKey: 'bg_scene_2',
        fallbackBg: 'linear-gradient(135deg,#2b2233,#3d2f47)',
        desc: '需要留意通行时间的公共区域。',
        actions: [
          { title: '在外部场景二练习基础配合', gain: '属性C+', prompt: '前往外部场景二活动筋骨，熟悉周边的通行路线。' }
        ]
      }
    ],
    forcedScenes: [
      {
        id: 'forced_check',
        matchKeywords: ['外部场景二', '例行检查', '强制事件'],
        name: '外部场景二（强制事件）',
        bgKey: 'bg_scene_2',
        fallbackBg: 'linear-gradient(135deg,#3a1c24,#241319)',
        bannerText: '⚠ 强制事件进行中 · 当前位置受限，不可自选离开',
        actions: [
          { title: '按要求配合完成当前流程', gain: '属性B+', prompt: '保持平稳神态，按当前场合的要求配合完成流程。' },
          { title: '借机观察角色的细微反应', gain: '属性C+', prompt: '在不引起旁人注意的前提下，留意身旁角色的眼神与动作示意。' }
        ]
      }
    ],
    // title / gain / reqText 只在前端显示；prompt 是填进输入框发给 AI 的行动，只写角色场景内的自然行动
    roomActions: [
      { id: 'act_daily_a', title: '日常互动一：基础练习', gain: '属性A+', prompt: '在主房间内进行日常基础练习，请角色在旁纠正细节。' },
      { id: 'act_daily_b', title: '日常互动二：常识问答', gain: '属性B+', prompt: '向角色请教日常通识与规矩，认真记住对方的提醒。' },
      { id: 'act_daily_c', title: '日常互动三：默契配合', gain: '属性C+ / 好感+', prompt: '与角色一起分担房间里的日常事务。' },
      {
        id: 'act_ms_1',
        title: '进阶突破一：达成初步默契',
        badgeId: 'badge_1',
        reqText: '需 属性A ≥ 30 · 好感 ≥ 40',
        check: function (s) { return s.attrA >= 30 && s.favor >= 40; },
        gain: '解锁里程碑一',
        prompt: '主动向角色展示这段时间的练习成果，请对方亲眼看一看。'
      },
      {
        id: 'act_ms_2',
        title: '进阶突破二：深层信任建立',
        badgeId: 'badge_2',
        reqText: '需 属性B ≥ 50 · 属性C ≥ 45 · 好感 ≥ 65',
        check: function (s) { return s.attrB >= 50 && s.attrC >= 45 && s.favor >= 65; },
        gain: '解锁里程碑二',
        prompt: '趁夜里安静，与角色坦诚交流彼此真正的想法与底线。'
      }
    ],
    badges: [
      { id: 'badge_1', name: '里程碑一', iconKey: 'badge_1', desc: '属性A ≥ 30 且 好感 ≥ 40 时点亮' },
      { id: 'badge_2', name: '里程碑二', iconKey: 'badge_2', desc: '属性B ≥ 50、属性C ≥ 45 且 好感 ≥ 65 时点亮' }
    ]
  };

  // ==================== 2. 顶层窗口穿透与幂等清理 ====================
  var MOUNT_KEY = '__cardTerminalUnmount';
  var NODE_IDS = ['ct-root', 'ct-style', 'ct-launcher', 'ct-toast'];
  var topWin = window, topDoc = document;
  try {
    if (window.parent && window.parent !== window && window.parent.document) {
      topWin = window.parent;
      topDoc = window.parent.document;
    }
  } catch (e) { topWin = window; topDoc = document; }

  if (typeof topDoc[MOUNT_KEY] === 'function') {
    try { topDoc[MOUNT_KEY](); } catch (e) {}
  }
  NODE_IDS.forEach(function (id) {
    var old = topDoc.getElementById(id);
    if (old && old.parentNode) old.parentNode.removeChild(old);
  });

  // ==================== 3. 小白X变量四通道读写 ====================
  function stCtx() {
    try { return (topWin.SillyTavern && topWin.SillyTavern.getContext && topWin.SillyTavern.getContext()) || null; }
    catch (e) { return null; }
  }
  function varGet(k, fallback) {
    var fullKey = CARD_CONFIG.storagePrefix + k;
    var c = stCtx();
    try {
      if (c && c.variables && c.variables.local && typeof c.variables.local.get === 'function') {
        var v1 = c.variables.local.get(fullKey);
        if (v1 !== undefined && v1 !== null && v1 !== '') return v1;
      }
    } catch (e) {}
    try {
      if (c && c.chatMetadata && c.chatMetadata.variables && c.chatMetadata.variables[fullKey] !== undefined) {
        return c.chatMetadata.variables[fullKey];
      }
    } catch (e) {}
    try { if (typeof topWin.xbgetvar === 'function') { var v2 = topWin.xbgetvar(fullKey); if (v2 != null && v2 !== '') return v2; } } catch (e) {}
    try {
      var raw = topWin.localStorage.getItem(fullKey);
      if (raw !== null) return JSON.parse(raw);
    } catch (e) {}
    return fallback;
  }
  function varSet(k, val) {
    var fullKey = CARD_CONFIG.storagePrefix + k;
    var c = stCtx();
    try {
      if (c && c.variables && c.variables.local && typeof c.variables.local.set === 'function') {
        c.variables.local.set(fullKey, val);
      } else if (c && c.chatMetadata) {
        c.chatMetadata.variables = c.chatMetadata.variables || {};
        c.chatMetadata.variables[fullKey] = val;
      }
    } catch (e) {}
    try { if (typeof topWin.xbsetvar === 'function') topWin.xbsetvar(fullKey, val); } catch (e) {}
    try { topWin.localStorage.setItem(fullKey, JSON.stringify(val)); } catch (e) {}
  }
  function syncLWB(stateObj) {
    try {
      var lines = Object.keys(stateObj).map(function (k) { return k + ': ' + JSON.stringify(stateObj[k]); });
      var block = '<state>\n' + lines.join('\n') + '\n</state>';
      if (topWin.LWB_StateV2 && typeof topWin.LWB_StateV2.applyText === 'function') {
        topWin.LWB_StateV2.applyText(block, { silent: true });
      }
      Object.keys(stateObj).forEach(function (k) { varSet(k, stateObj[k]); });
    } catch (e) {}
  }

  // ==================== 4. 楼层状态与正文提取 ====================
  var STATUS_RE = /<status>\s*\[?([\s\S]*?)\]?\s*<\/status>/i;

  // 酒馆渲染楼层时把 class="x" 改写为 class="custom-x"，离线预览不改写，两种都要认
  function classSel(name) { return '.' + name + ', .custom-' + name; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function parseStatusBody(body) {
    var out = {};
    String(body || '').split(/[|\n；;]/).forEach(function (seg) {
      var idx = seg.indexOf(':');
      if (idx < 0) idx = seg.indexOf('：');
      if (idx < 0) return;
      var k = seg.slice(0, idx).trim();
      var v = seg.slice(idx + 1).trim();
      var mapped = CARD_CONFIG.statusFieldMap[k];
      if (!mapped) return;
      var num = parseFloat(v.replace(/[^0-9.-]/g, ''));
      out[mapped] = (CARD_CONFIG.textFields.indexOf(mapped) !== -1 || isNaN(num)) ? v : num;
    });
    return out;
  }

  function chatMessages() {
    var c = stCtx();
    return (c && Array.isArray(c.chat)) ? c.chat : [];
  }
  function rawText(msg) {
    return String((msg && (msg.mes || msg.message || msg.content)) || '');
  }

  // 状态：先读聊天记录原文（不受显示正则影响），再读楼层隐藏容器 .card-raw-status 的 textContent
  function readLatestStatus() {
    var msgs = chatMessages().slice(-6);
    for (var i = msgs.length - 1; i >= 0; i--) {
      var m = rawText(msgs[i]).match(STATUS_RE);
      if (m) return parseStatusBody(m[1]);
    }
    try {
      var raws = topDoc.querySelectorAll(classSel(CARD_CONFIG.rawStatusClass));
      for (var j = raws.length - 1; j >= 0; j--) {
        var t = String(raws[j].textContent || '');
        var m2 = t.match(STATUS_RE);
        var body = m2 ? m2[1] : t.trim().replace(/^\[/, '').replace(/\]$/, '');
        if (body.trim()) return parseStatusBody(body);
      }
    } catch (e) {}
    return null;
  }

  // 脱离文档的克隆节点 innerText 不分行，这里手动把 <br> 与块级元素换成换行
  function nodeToText(node) {
    Array.prototype.forEach.call(node.querySelectorAll('br'), function (br) {
      br.parentNode.replaceChild(topDoc.createTextNode('\n'), br);
    });
    Array.prototype.forEach.call(node.querySelectorAll('p, div, li, blockquote, h1, h2, h3, h4'), function (el) {
      el.appendChild(topDoc.createTextNode('\n'));
    });
    return String(node.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  }

  // 正文：先读最后一个 AI 楼层的 .mes_text 克隆（去掉胶囊条与隐藏状态），再回退聊天记录原文
  function readLatestNarrative() {
    try {
      var nodes = topDoc.querySelectorAll('#chat .mes[is_user="false"] .mes_text');
      if (!nodes.length) nodes = topDoc.querySelectorAll('.mes_text');
      if (nodes.length) {
        var clone = nodes[nodes.length - 1].cloneNode(true);
        var junk = clone.querySelectorAll(classSel(CARD_CONFIG.floorBarClass) + ', ' + classSel(CARD_CONFIG.rawStatusClass) + ', style, script');
        Array.prototype.forEach.call(junk, function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
        var t = nodeToText(clone);
        if (t) return t;
      }
    } catch (e) {}
    var msgs = chatMessages();
    for (var i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i] && !msgs[i].is_user && !msgs[i].is_system) {
        return rawText(msgs[i]).replace(STATUS_RE, '').replace(/<[^>]+>/g, '').trim();
      }
    }
    return '';
  }

  function narrativeHtml(text) {
    if (!text) return '<div class="ct-empty">' + esc(CARD_CONFIG.narrative.emptyText) + '</div>';
    var html = esc(text);
    CARD_CONFIG.narrative.highlights.forEach(function (h) {
      html = html.replace(h.re, function (m) { return '<span class="' + h.cls + '">' + m + '</span>'; });
    });
    return html.replace(/\n/g, '<br>');
  }

  // ==================== 5. 运行时状态与三层场景状态机 ====================
  var runtime = {
    status: Object.assign({}, CARD_CONFIG.statusDefaults),
    timeOfDay: varGet('timeOfDay', 'day'),
    freeRemaining: Number(varGet('freeRemaining', 1)),
    activeFreeSceneId: null,
    freePopupOpen: false,
    spriteMode: varGet('spriteMode', 'main'),
    cgOpen: !!varGet('cgOpen', CARD_CONFIG.cgSlot.defaultOpen),
    tab: 'actions',
    unlockedBadges: varGet('unlockedBadges', {}),
    lastNarrative: null
  };

  function isMobile() {
    try { return topWin.matchMedia('(max-width: ' + CARD_CONFIG.mobileBreakpoint + 'px)').matches; }
    catch (e) { return false; }
  }

  function detectForcedScene(locText) {
    var loc = String(locText || '');
    for (var i = 0; i < CARD_CONFIG.forcedScenes.length; i++) {
      var fs = CARD_CONFIG.forcedScenes[i];
      for (var j = 0; j < fs.matchKeywords.length; j++) {
        if (loc.indexOf(fs.matchKeywords[j]) !== -1) return fs;
      }
    }
    return null;
  }

  function refreshFromStatus() {
    var parsed = readLatestStatus();
    if (parsed) {
      Object.keys(parsed).forEach(function (k) { runtime.status[k] = parsed[k]; });
    }
    CARD_CONFIG.roomActions.forEach(function (act) {
      if (act.badgeId && typeof act.check === 'function' && act.check(runtime.status)) {
        runtime.unlockedBadges[act.badgeId] = true;
      }
    });
    varSet('unlockedBadges', runtime.unlockedBadges);
    syncLWB(runtime.status);
  }

  // ==================== 6. 样式（桌面双栏 / 手机 100dvh 四 Tab） ====================
  var BP = CARD_CONFIG.mobileBreakpoint;
  var styleEl = topDoc.createElement('style');
  styleEl.id = 'ct-style';
  styleEl.textContent = [
    '#ct-launcher{position:fixed;right:18px;bottom:82px;z-index:9998;background:#1e2638;color:#e5e9f0;border:1px solid rgba(136,192,208,.45);border-radius:999px;padding:8px 16px;font-size:13px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.45);}',
    '#ct-root{position:fixed;inset:0;z-index:9999;height:100vh;height:100dvh;background:#0d111a;color:#e5e9f0;font-family:system-ui,sans-serif;display:none;flex-direction:column;overflow:hidden;}',
    '#ct-root.open{display:flex;}',
    '#ct-root *{box-sizing:border-box;}',
    '#ct-top{flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:8px 14px;background:rgba(13,17,26,.94);border-bottom:1px solid rgba(255,255,255,.12);}',
    '.ct-avatar{flex:0 0 44px;width:44px;height:44px;border-radius:50%;object-fit:cover;border:1px solid rgba(136,192,208,.5);background:#1e2638;display:flex;align-items:center;justify-content:center;font-size:18px;}',
    '.ct-title{flex:0 0 auto;line-height:1.25;}',
    '.ct-title small{display:block;opacity:.6;font-size:10px;}',
    '.ct-stats{flex:1 1 auto;min-width:0;display:flex;gap:8px;flex-wrap:wrap;font-size:12px;}',
    '.ct-stat-pill{background:rgba(255,255,255,.07);padding:4px 10px;border-radius:999px;white-space:nowrap;}',
    '.ct-top-btns{flex:0 0 auto;display:flex;gap:6px;}',
    '#ct-forced-banner{flex:0 0 auto;display:none;background:rgba(160,35,45,.92);color:#fff;text-align:center;padding:6px 12px;font-size:13px;}',
    '#ct-main{flex:1 1 auto;min-height:0;display:flex;gap:12px;padding:12px;}',
    '#ct-left{flex:1 1 auto;min-width:0;min-height:0;display:flex;flex-direction:column;gap:10px;}',
    /* CG 预留槽：默认高度 0 折叠；背景直接替换 backgroundImage，不加 transition: background-image */
    '#cg-layer{position:relative;flex:0 0 auto;height:0;overflow:hidden;border-radius:10px;transition:height .25s ease;}',
    '#cg-layer.open{height:' + CARD_CONFIG.cgSlot.height + 'px;border:1px solid rgba(255,255,255,.14);}',
    '#ct-stage{position:absolute;inset:0;background-size:cover;background-position:center;background-repeat:no-repeat;}',
    '#ct-sprites{position:absolute;inset:0;pointer-events:none;display:flex;align-items:flex-end;justify-content:center;gap:24px;}',
    '.ct-sp-main{height:88%;max-width:46%;object-fit:contain;}',
    '.ct-sp-sub{height:46%;max-width:30%;object-fit:contain;}',
    '#ct-hotspots{position:absolute;inset:0;}',
    '.ct-hs{position:absolute;transform:translate(-50%,-50%);background:rgba(20,28,44,.86);border:1px solid #88c0d0;color:#e5e9f0;padding:4px 10px;border-radius:999px;font-size:12px;cursor:pointer;}',
    '#ct-story{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;background:rgba(16,21,32,.92);border:1px solid rgba(255,255,255,.14);border-radius:10px;}',
    '#ct-story-head{flex:0 0 auto;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.1);font-size:12px;}',
    '#ct-narrative{flex:1 1 auto;min-height:0;overflow-y:auto;padding:14px 18px;font-size:15px;line-height:1.9;user-select:text;word-break:break-word;}',
    '.ct-q{color:#f0c987;}',
    '.ct-aside{color:#8fbcbb;opacity:.85;}',
    '.ct-empty{opacity:.55;font-size:13px;}',
    '#ct-right{flex:0 0 340px;min-height:0;display:flex;flex-direction:column;background:rgba(16,21,32,.92);border:1px solid rgba(255,255,255,.14);border-radius:10px;overflow:hidden;}',
    '#ct-tabs{flex:0 0 auto;display:flex;border-bottom:1px solid rgba(255,255,255,.1);}',
    '.ct-tab{flex:1 1 0;padding:9px 4px;background:none;border:none;border-bottom:2px solid transparent;color:#cbd2dc;font-size:12px;cursor:pointer;}',
    '.ct-tab.on{color:#fff;border-bottom-color:#88c0d0;}',
    '.ct-tab.mob-only{display:none;}',
    '.ct-pane{flex:1 1 auto;min-height:0;overflow-y:auto;padding:12px;display:none;flex-direction:column;gap:8px;}',
    '.ct-pane.on{display:flex;}',
    '.ct-sec{font-weight:600;font-size:12px;opacity:.8;margin-top:4px;}',
    '.ct-chips{display:flex;flex-wrap:wrap;gap:6px;}',
    '.ct-act{padding:10px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);cursor:pointer;font-size:12px;}',
    '.ct-act.lock{opacity:.55;border:1px dashed rgba(255,255,255,.35);cursor:not-allowed;}',
    '.ct-act.open{border:1px solid #ebcb8b;background:rgba(235,203,139,.12);}',
    '.ct-sub{margin-top:4px;opacity:.75;}',
    '.ct-req{margin-top:4px;color:#ebcb8b;}',
    '.ct-badge{padding:6px 8px;border-radius:6px;border:1px dashed rgba(255,255,255,.25);font-size:12px;opacity:.5;}',
    '.ct-badge.lit{border:1px solid #ebcb8b;background:rgba(235,203,139,.14);opacity:1;}',
    '.ct-lock-tip{font-size:12px;color:#ff8080;}',
    '#ct-foot{flex:0 0 auto;display:flex;gap:6px;padding:8px 12px;background:rgba(13,17,26,.94);border-top:1px solid rgba(255,255,255,.12);}',
    '#ct-draft{flex:1 1 auto;min-width:0;background:#0f1420;color:#e5e9f0;border:1px solid rgba(255,255,255,.18);border-radius:6px;padding:7px 9px;font-size:13px;}',
    '.ct-btn{background:#2e384d;color:#e5e9f0;border:1px solid rgba(255,255,255,.18);border-radius:6px;padding:6px 10px;font-size:12px;cursor:pointer;white-space:nowrap;}',
    '.ct-btn.primary{background:#5e81ac;border-color:#81a1c1;color:#fff;}',
    '.ct-btn:disabled{opacity:.5;cursor:not-allowed;}',
    '@media (max-width:' + BP + 'px){',
    '  #ct-top{flex-wrap:wrap;padding:6px 10px;gap:8px;}',
    '  .ct-title small{display:none;}',
    '  .ct-top-btns{margin-left:auto;}',
    '  .ct-stats{order:3;flex:1 0 100%;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;}',
    '  .ct-stats::-webkit-scrollbar{display:none;}',
    '  #ct-main{flex-direction:column;padding:8px;gap:8px;}',
    '  #ct-right{order:-1;flex:0 0 auto;}',
    '  .ct-tab.mob-only{display:block;}',
    '  #ct-root.tab-story .ct-pane{display:none !important;}',
    '  #ct-root:not(.tab-story) #ct-left{display:none;}',
    '  #ct-root:not(.tab-story) #ct-right{flex:1 1 auto;}',
    '  #ct-foot{flex-wrap:wrap;}',
    '  #ct-draft{flex:1 0 100%;}',
    '  #ct-foot .ct-btn{flex:1 1 0;}',
    '}'
  ].join('\n');
  topDoc.head.appendChild(styleEl);

  // ==================== 7. DOM 骨架 ====================
  var launcher = topDoc.createElement('button');
  launcher.id = 'ct-launcher';
  launcher.type = 'button';
  launcher.textContent = CARD_CONFIG.launcherLabel;

  var avatarHtml = ASSETS[CARD_CONFIG.avatarKey]
    ? '<img class="ct-avatar" alt="" src="' + ASSETS[CARD_CONFIG.avatarKey] + '" />'
    : '<div class="ct-avatar">' + esc(CARD_CONFIG.avatarFallback) + '</div>';

  var root = topDoc.createElement('div');
  root.id = 'ct-root';
  root.innerHTML = [
    '<div id="ct-top">',
    avatarHtml,
    '  <div class="ct-title"><strong>' + esc(CARD_CONFIG.title) + '</strong><small>' + esc(CARD_CONFIG.subtitle) + '</small></div>',
    '  <div class="ct-stats" id="ct-stats-bar"></div>',
    '  <div class="ct-top-btns">',
    '    <button type="button" class="ct-btn" data-ct="cg"></button>',
    '    <button type="button" class="ct-btn" data-ct="close">✕ 关闭</button>',
    '  </div>',
    '</div>',
    '<div id="ct-forced-banner"></div>',
    '<div id="ct-main">',
    '  <div id="ct-left">',
    '    <div id="cg-layer"><div id="ct-stage"></div><div id="ct-sprites"></div><div id="ct-hotspots"></div></div>',
    '    <div id="ct-story">',
    '      <div id="ct-story-head"><strong>' + esc(CARD_CONFIG.narrative.title) + '</strong>',
    '        <span style="display:flex;gap:6px;"><button type="button" class="ct-btn" data-ct="sprite">立绘切换</button><button type="button" class="ct-btn" data-ct="cg"></button></span>',
    '      </div>',
    '      <div id="ct-narrative"></div>',
    '    </div>',
    '  </div>',
    '  <div id="ct-right">',
    '    <div id="ct-tabs">',
    '      <button type="button" class="ct-tab mob-only" data-tab="story">✦ 剧情正文</button>',
    '      <button type="button" class="ct-tab" data-tab="actions">行动</button>',
    '      <button type="button" class="ct-tab" data-tab="scene">场景</button>',
    '      <button type="button" class="ct-tab" data-tab="archive">档案</button>',
    '    </div>',
    '    <div class="ct-pane" data-pane="actions" id="ct-pane-actions"></div>',
    '    <div class="ct-pane" data-pane="scene" id="ct-pane-scene"></div>',
    '    <div class="ct-pane" data-pane="archive" id="ct-pane-archive"></div>',
    '  </div>',
    '</div>',
    '<div id="ct-foot">',
    '  <input id="ct-draft" type="text" placeholder="选择行动或画面热点生成行动草稿，可直接修改..." />',
    '  <button type="button" class="ct-btn" data-ct="fill">填入输入框</button>',
    '  <button type="button" class="ct-btn primary" data-ct="send">直接发送</button>',
    '</div>'
  ].join('');

  topDoc.body.appendChild(launcher);
  topDoc.body.appendChild(root);

  function $(id) { return topDoc.getElementById(id); }

  function setDraft(txt) {
    var input = $('ct-draft');
    if (input) input.value = txt || '';
  }
  // 填入：交给酒馆输入框继续编辑，关闭终端
  function fillInput(txt) {
    if (!txt) return false;
    var ta = topDoc.querySelector('#send_textarea');
    if (!ta) return false;
    ta.value = txt;
    ta.dispatchEvent(new topWin.Event('input', { bubbles: true }));
    ta.dispatchEvent(new topWin.Event('change', { bubbles: true }));
    root.classList.remove('open');
    try { ta.focus(); } catch (e) {}
    return true;
  }
  // 发送：终端保持打开，玩家留在终端里等下一轮正文
  function sendInput(txt) {
    if (!txt) return false;
    var ta = topDoc.querySelector('#send_textarea');
    var btn = topDoc.querySelector('#send_but');
    if (!ta || !btn) return false;
    ta.value = txt;
    ta.dispatchEvent(new topWin.Event('input', { bubbles: true }));
    topWin.setTimeout(function () { btn.click(); }, 60);
    setDraft('');
    return true;
  }

  function actItem(act, opts) {
    var item = topDoc.createElement('div');
    var hasReq = typeof act.check === 'function';
    var unlocked = !hasReq || act.check(runtime.status);
    item.className = 'ct-act' + (hasReq ? (unlocked ? ' open' : ' lock') : '');
    if (hasReq && !unlocked) {
      item.innerHTML = '<div>■ ' + esc(act.title) + '</div><div class="ct-req">解锁条件：' + esc(act.reqText) + '</div>';
    } else {
      item.innerHTML = '<div>' + (hasReq ? '✦ ' : '• ') + esc(act.title) + '</div><div class="ct-sub">收益：' + esc(act.gain || '日常推进') + '</div>';
      item.onclick = function () {
        setDraft(act.prompt);
        if (opts && opts.consumeFree) {
          runtime.freeRemaining = 0;
          varSet('freeRemaining', 0);
          render();
        }
      };
    }
    return item;
  }

  function renderNarrative() {
    var text = readLatestNarrative();
    if (text === runtime.lastNarrative) return;
    runtime.lastNarrative = text;
    var box = $('ct-narrative');
    if (!box) return;
    box.innerHTML = narrativeHtml(text);
    box.scrollTop = 0;
  }

  function render() {
    refreshFromStatus();
    if (!isMobile() && runtime.tab === 'story') runtime.tab = 'actions';
    var forced = detectForcedScene(runtime.status.location);

    // 1. 顶栏状态药丸
    var statHtml = '<span class="ct-stat-pill">位置：' + esc(runtime.status.location) + '</span>' +
                   '<span class="ct-stat-pill">阶段：' + esc(runtime.status.stage) + '</span>';
    CARD_CONFIG.statsDisplay.forEach(function (sd) {
      var val = runtime.status[sd.key] != null ? runtime.status[sd.key] : 0;
      statHtml += '<span class="ct-stat-pill">' + esc(sd.label) + '：' + esc(val) + '/' + sd.max + '</span>';
    });
    $('ct-stats-bar').innerHTML = statHtml;

    // 2. 强制事件横幅与当前场景
    var bannerEl = $('ct-forced-banner');
    var scene = CARD_CONFIG.mainScenes[runtime.timeOfDay] || CARD_CONFIG.mainScenes.day;
    var freeScene = null;
    if (forced) {
      scene = forced;
      bannerEl.style.display = 'block';
      bannerEl.textContent = forced.bannerText;
    } else {
      bannerEl.style.display = 'none';
      if (runtime.activeFreeSceneId) {
        CARD_CONFIG.freeOutingScenes.forEach(function (sc) { if (sc.id === runtime.activeFreeSceneId) freeScene = sc; });
        if (freeScene) scene = freeScene;
      }
    }
    var inMain = !forced && !freeScene;

    // 3. CG 预留槽（折叠时不渲染立绘与热点）
    var cgLabel = '▣ CG预留: ' + (runtime.cgOpen ? '开' : '关');
    Array.prototype.forEach.call(root.querySelectorAll('[data-ct="cg"]'), function (b) { b.textContent = cgLabel; });
    $('cg-layer').className = runtime.cgOpen ? 'open' : '';
    var spritesEl = $('ct-sprites');
    var hsEl = $('ct-hotspots');
    spritesEl.innerHTML = '';
    hsEl.innerHTML = '';
    if (runtime.cgOpen) {
      var bgData = ASSETS[scene.bgKey];
      $('ct-stage').style.backgroundImage = bgData ? 'url("' + bgData + '")' : (scene.fallbackBg || 'none');
      if (runtime.spriteMode !== 'pure' && ASSETS.sp_main) {
        var imgMain = topDoc.createElement('img');
        imgMain.className = 'ct-sp-main';
        imgMain.src = ASSETS.sp_main;
        spritesEl.appendChild(imgMain);
        if (runtime.spriteMode === 'dual' && ASSETS.sp_sub) {
          var imgSub = topDoc.createElement('img');
          imgSub.className = 'ct-sp-sub';
          imgSub.src = ASSETS.sp_sub;
          spritesEl.appendChild(imgSub);
        }
      }
      if (inMain) {
        CARD_CONFIG.roomHotspots.forEach(function (hs) {
          var b = topDoc.createElement('button');
          b.type = 'button';
          b.className = 'ct-hs';
          b.style.left = hs.x + '%';
          b.style.top = hs.y + '%';
          b.textContent = '✦ ' + hs.label;
          b.onclick = function () { setDraft(hs.prompt); };
          hsEl.appendChild(b);
        });
      }
    }

    // 4. 剧情正文
    renderNarrative();

    // 5. 行动 Tab（热点在无图期以按钮组出现，保证 CG 折叠时也能用）
    var pa = $('ct-pane-actions');
    pa.innerHTML = '<div class="ct-sec">当前场景：' + esc(scene.name) + '</div>';
    if (inMain && CARD_CONFIG.roomHotspots.length) {
      var chips = topDoc.createElement('div');
      chips.className = 'ct-chips';
      CARD_CONFIG.roomHotspots.forEach(function (hs) {
        var b = topDoc.createElement('button');
        b.type = 'button';
        b.className = 'ct-btn';
        b.textContent = '✦ ' + hs.label + ' (' + hs.gain + ')';
        b.onclick = function () { setDraft(hs.prompt); };
        chips.appendChild(b);
      });
      pa.appendChild(chips);
    }
    var list = forced ? forced.actions : (freeScene ? (freeScene.actions || []) : CARD_CONFIG.roomActions);
    list.forEach(function (act) { pa.appendChild(actItem(act, { consumeFree: !!freeScene })); });

    // 6. 场景 Tab（主舞台昼夜 / 每日 1 次外出 / 强制事件锁定）
    var ps = $('ct-pane-scene');
    ps.innerHTML = '';
    if (forced) {
      ps.innerHTML = '<div class="ct-lock-tip">⚠ 强制事件锁定中：位置回到主舞台前不可切换场景或外出。</div>';
    } else {
      var row = topDoc.createElement('div');
      row.className = 'ct-chips';
      var mk = function (label, primary, fn, disabled) {
        var b = topDoc.createElement('button');
        b.type = 'button';
        b.className = 'ct-btn' + (primary ? ' primary' : '');
        b.textContent = label;
        b.disabled = !!disabled;
        b.onclick = fn;
        row.appendChild(b);
      };
      mk('☀ ' + CARD_CONFIG.mainScenes.day.name, inMain && runtime.timeOfDay === 'day', function () {
        runtime.activeFreeSceneId = null; runtime.timeOfDay = 'day'; varSet('timeOfDay', 'day'); render();
      });
      mk('☽ ' + CARD_CONFIG.mainScenes.night.name, inMain && runtime.timeOfDay === 'night', function () {
        runtime.activeFreeSceneId = null; runtime.timeOfDay = 'night'; varSet('timeOfDay', 'night'); render();
      });
      mk(runtime.freeRemaining > 0 ? ('✦ 自由外出 (' + runtime.freeRemaining + '/1)') : '■ 今日外出已用 (0/1)', false, function () {
        runtime.freePopupOpen = !runtime.freePopupOpen; render();
      }, runtime.freeRemaining <= 0);
      if (runtime.timeOfDay === 'night') {
        mk('↻ 入眠进入次日', true, function () {
          runtime.freeRemaining = 1;
          runtime.activeFreeSceneId = null;
          runtime.timeOfDay = 'day';
          varSet('freeRemaining', 1);
          varSet('timeOfDay', 'day');
          setDraft('结束今天的安排，在主房间入眠休息，等待次日清晨。');
          render();
        });
      }
      ps.appendChild(row);
      if (runtime.freePopupOpen && runtime.freeRemaining > 0) {
        var sec = topDoc.createElement('div');
        sec.className = 'ct-sec';
        sec.textContent = '选择今日外出目的地 (1/1)';
        ps.appendChild(sec);
        CARD_CONFIG.freeOutingScenes.forEach(function (sc) {
          var b = topDoc.createElement('div');
          b.className = 'ct-act';
          b.innerHTML = '<div><strong>' + esc(sc.name) + '</strong></div><div class="ct-sub">' + esc(sc.desc) + '</div>';
          b.onclick = function () {
            runtime.activeFreeSceneId = sc.id;
            runtime.freePopupOpen = false;
            runtime.tab = 'actions';
            render();
          };
          ps.appendChild(b);
        });
      }
    }

    // 7. 档案 Tab
    var pr = $('ct-pane-archive');
    pr.innerHTML = '<div class="ct-sec">阶段里程碑徽章</div>';
    CARD_CONFIG.badges.forEach(function (bg) {
      var isLit = !!runtime.unlockedBadges[bg.id];
      var d = topDoc.createElement('div');
      d.className = 'ct-badge' + (isLit ? ' lit' : '');
      d.innerHTML = '<div>' + (isLit ? '✦ ' : '🔒 ') + esc(bg.name) + '</div><div class="ct-sub">' + esc(bg.desc) + '</div>';
      pr.appendChild(d);
    });

    // 8. Tab 状态
    ['story', 'actions', 'scene', 'archive'].forEach(function (t) { root.classList.toggle('tab-' + t, runtime.tab === t); });
    Array.prototype.forEach.call(root.querySelectorAll('.ct-tab'), function (b) {
      b.classList.toggle('on', b.getAttribute('data-tab') === runtime.tab);
    });
    Array.prototype.forEach.call(root.querySelectorAll('.ct-pane'), function (p) {
      p.classList.toggle('on', p.getAttribute('data-pane') === runtime.tab);
    });
  }

  function openTerminal() {
    root.classList.add('open');
    if (isMobile()) runtime.tab = 'story';
    runtime.lastNarrative = null;
    render();
  }

  // ==================== 8. 事件绑定 ====================
  launcher.onclick = openTerminal;
  root.addEventListener('click', function (ev) {
    var tabBtn = ev.target.closest('[data-tab]');
    if (tabBtn) { runtime.tab = tabBtn.getAttribute('data-tab'); render(); return; }
    var b = ev.target.closest('[data-ct]');
    if (!b) return;
    var cmd = b.getAttribute('data-ct');
    if (cmd === 'close') root.classList.remove('open');
    else if (cmd === 'cg') { runtime.cgOpen = !runtime.cgOpen; varSet('cgOpen', runtime.cgOpen); render(); }
    else if (cmd === 'sprite') {
      var order = ['main', 'dual', 'pure'];
      runtime.spriteMode = order[(order.indexOf(runtime.spriteMode) + 1) % order.length];
      varSet('spriteMode', runtime.spriteMode);
      if (!runtime.cgOpen) { runtime.cgOpen = true; varSet('cgOpen', true); }
      render();
    }
    else if (cmd === 'fill') fillInput($('ct-draft').value);
    else if (cmd === 'send') sendInput($('ct-draft').value);
  });

  // 楼层胶囊条的「打开终端」：酒馆净化楼层 HTML 时会去掉 onclick，这里用事件委托接管 data-ct-open
  function onFloorClick(ev) {
    var t = ev.target && ev.target.closest ? ev.target.closest('[data-ct-open]') : null;
    if (!t) return;
    ev.preventDefault();
    openTerminal();
  }
  topDoc.addEventListener('click', onFloorClick, true);

  function onResize() { if (root.classList.contains('open')) render(); }
  topWin.addEventListener('resize', onResize);

  // 终端打开期间每 2 秒只刷新正文，跟上流式输出与重新生成
  var narrativeTimer = topWin.setInterval(function () {
    if (root.classList.contains('open')) renderNarrative();
  }, 2000);

  topWin.openCardTerminal = openTerminal;
  topWin.__cardTerminalSync = function () {
    runtime.lastNarrative = null;
    render();
  };
  topDoc[MOUNT_KEY] = function () {
    topDoc.removeEventListener('click', onFloorClick, true);
    topWin.removeEventListener('resize', onResize);
    topWin.clearInterval(narrativeTimer);
    NODE_IDS.forEach(function (id) {
      var el = topDoc.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    if (topWin.openCardTerminal === openTerminal) topWin.openCardTerminal = null;
    topDoc[MOUNT_KEY] = null;
  };

  // ==================== 9. 离线预览参数 ====================
  // ?mid=1 / ?freepop=1 / ?forced=1 / ?cg=1 / ?tab=story|actions|scene|archive
  try {
    var qs = new URLSearchParams(topWin.location.search);
    if (qs.get('cg') === '1') runtime.cgOpen = true;
    if (qs.get('freepop') === '1') { runtime.freePopupOpen = true; runtime.tab = 'scene'; }
    if (qs.get('tab')) runtime.tab = qs.get('tab');
    if (topDoc.getElementById('mock-mes')) {
      root.classList.add('open');
      if (isMobile() && !qs.get('tab') && qs.get('freepop') !== '1') runtime.tab = 'story';
    }
  } catch (e) {}

  render();
})();
