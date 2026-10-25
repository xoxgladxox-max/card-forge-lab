/* terminal-template.src.js — 小白X（LittleWhiteBox）角色卡全屏交互终端通用模板
 * 用法：
 *   1. 复制本文件为 terminal.src.js，按当前角色卡设定修改 CARD_CONFIG；
 *   2. 准备 assets/ 目录后运行 pack-xiaobaix.mjs 生成 scripts/xiaobaix-tasks.json 与 preview.html。
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
    statsDisplay: [
      { key: 'favor', label: '好感', max: 100 },
      { key: 'attrA', label: '属性A', max: 100 },
      { key: 'attrB', label: '属性B', max: 100 },
      { key: 'attrC', label: '属性C', max: 100 }
    ],
    mainScenes: {
      day: { id: 'room_day', name: '主房间·昼', matchText: '主房间·昼', bgKey: 'bg_main_day', fallbackBg: 'linear-gradient(135deg,#1d2432,#2e384d)' },
      night: { id: 'room_night', name: '主房间·夜', matchText: '主房间·夜', bgKey: 'bg_main_night', fallbackBg: 'linear-gradient(135deg,#0f131d,#1b2234)' }
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
          { title: '在外部场景一观察环境', gain: '属性B+', prompt: '趁每日自由外出时间前往外部场景一，仔细观察周遭布置并做记录。' },
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
    roomActions: [
      {
        id: 'act_daily_a',
        title: '日常互动一：基础练习',
        gain: '属性A+',
        prompt: '在主房间内进行日常基础练习，请角色在旁纠正细节。'
      },
      {
        id: 'act_daily_b',
        title: '日常互动二：常识问答',
        gain: '属性B+',
        prompt: '向角色请教日常通识与规矩，认真记住对方的提醒。'
      },
      {
        id: 'act_daily_c',
        title: '日常互动三：默契配合',
        gain: '属性C+ / 好感+',
        prompt: '与角色一起分担房间里的日常事务，提升彼此的配合默契。'
      },
      {
        id: 'act_ms_1',
        title: '进阶突破一：达成初步默契',
        badgeId: 'badge_1',
        reqText: '需 属性A ≥ 30 · 好感 ≥ 40',
        check: function (s) { return s.attrA >= 30 && s.favor >= 40; },
        gain: '解锁里程碑一',
        prompt: '【阶段突破】在属性A与好感积累足够后，主动向角色展示这段时间的练习成果。'
      },
      {
        id: 'act_ms_2',
        title: '进阶突破二：深层信任建立',
        badgeId: 'badge_2',
        reqText: '需 属性B ≥ 50 · 属性C ≥ 45 · 好感 ≥ 65',
        check: function (s) { return s.attrB >= 50 && s.attrC >= 45 && s.favor >= 65; },
        gain: '解锁里程碑二',
        prompt: '【阶段突破】在夜间安静时刻，与角色坦诚交流彼此真正的想法与底线。'
      }
    ],
    badges: [
      { id: 'badge_1', name: '里程碑一', iconKey: 'badge_1', desc: '属性A ≥ 30 且 好感 ≥ 40 时点亮' },
      { id: 'badge_2', name: '里程碑二', iconKey: 'badge_2', desc: '属性B ≥ 50、属性C ≥ 45 且 好感 ≥ 65 时点亮' }
    ]
  };

  // ==================== 2. 顶层窗口穿透与幂等清理 ====================
  var MOUNT_KEY = '__cardTerminalUnmount';
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
  ['ct-root', 'ct-style', 'ct-launcher', 'ct-toast'].forEach(function (id) {
    var old = topDoc.getElementById(id);
    if (old && old.parentNode) old.parentNode.removeChild(old);
  });

  // ==================== 3. 小白X变量四通道读写与状态栏解析 ====================
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

  var STATUS_RE = /<status>\s*\[?([\s\S]*?)\]?\s*<\/status>/i;
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
      out[mapped] = (mapped === 'location' || mapped === 'stage' || isNaN(num)) ? v : num;
    });
    return out;
  }
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

  // ==================== 4. 运行时状态与三层场景状态机 ====================
  var runtime = {
    status: Object.assign({}, CARD_CONFIG.statusDefaults),
    timeOfDay: varGet('timeOfDay', 'day'),
    freeRemaining: Number(varGet('freeRemaining', 1)),
    activeFreeSceneId: null,
    freePopupOpen: false,
    drawerOpen: false,
    spriteMode: varGet('spriteMode', 'main'),
    unlockedBadges: varGet('unlockedBadges', {})
  };

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

  // ==================== 5. 样式与 DOM 构建（遵守防踩坑四条规则） ====================
  var styleEl = topDoc.createElement('style');
  styleEl.id = 'ct-style';
  styleEl.textContent = [
    '#ct-launcher{position:fixed;right:18px;bottom:82px;z-index:9998;background:#1e2638;color:#e5e9f0;border:1px solid rgba(136,192,208,.45);border-radius:999px;padding:8px 16px;font-size:13px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.45);}',
    '#ct-root{position:fixed;inset:0;z-index:9999;background:#0d111a;color:#e5e9f0;font-family:system-ui,sans-serif;display:none;overflow:hidden;user-select:none;}',
    '#ct-root.open{display:block;}',
    /* 背景禁用 transition: background-image，防止大图切换卡死 */
    '#ct-stage{position:absolute;inset:0;background-size:cover;background-position:center;background-repeat:no-repeat;}',
    '#ct-forced-banner{position:absolute;top:58px;left:50%;transform:translateX(-50%);z-index:6;background:rgba(160,35,45,.92);border:1px solid #ff8080;color:#fff;padding:6px 18px;border-radius:6px;font-size:13px;display:none;}',
    '#ct-top{position:absolute;top:0;left:0;right:0;height:50px;z-index:5;background:rgba(13,17,26,.84);border-bottom:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:space-between;padding:0 18px;}',
    '.ct-stats{display:flex;gap:14px;align-items:center;font-size:12px;}',
    '.ct-stat-pill{background:rgba(255,255,255,.07);padding:4px 10px;border-radius:6px;}',
    /* 同框立绘比例对齐：主立绘 86%，副立绘 46% */
    '#ct-sprites{position:absolute;inset:50px 340px 76px 0;pointer-events:none;z-index:2;display:flex;align-items:flex-end;justify-content:center;gap:24px;}',
    '.ct-sp-main{height:86%;max-width:46%;object-fit:contain;transition:opacity .25s ease;}',
    '.ct-sp-sub{height:46%;max-width:30%;object-fit:contain;transition:opacity .25s ease;}',
    '#ct-hotspots{position:absolute;inset:50px 340px 76px 0;z-index:3;}',
    '.ct-hs{position:absolute;transform:translate(-50%,-50%);background:rgba(20,28,44,.86);border:1px solid #88c0d0;color:#e5e9f0;padding:5px 12px;border-radius:999px;font-size:12px;cursor:pointer;}',
    '#ct-panel{position:absolute;top:58px;right:16px;bottom:76px;width:320px;z-index:4;background:rgba(16,21,32,.9);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:12px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;}',
    '.ct-act{padding:10px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);cursor:pointer;font-size:12px;}',
    '.ct-act.lock{opacity:.55;border:1px dashed rgba(255,255,255,.35);cursor:not-allowed;}',
    '.ct-act.open{border:1px solid #ebcb8b;background:rgba(235,203,139,.12);}',
    /* 底部栏左右分区防重叠：左下 #ct-foot，右下 #ct-map */
    '#ct-foot{position:absolute;left:18px;bottom:14px;width:min(460px,44vw);z-index:5;display:flex;gap:6px;background:rgba(16,21,32,.92);padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.14);}',
    '#ct-draft{flex:1;background:#0f1420;color:#e5e9f0;border:1px solid rgba(255,255,255,.18);border-radius:6px;padding:6px 8px;font-size:12px;}',
    '.ct-btn{background:#2e384d;color:#e5e9f0;border:1px solid rgba(255,255,255,.18);border-radius:6px;padding:6px 10px;font-size:12px;cursor:pointer;}',
    '.ct-btn.primary{background:#5e81ac;border-color:#81a1c1;color:#fff;}',
    '#ct-map{position:absolute;right:3%;bottom:14px;left:auto;transform:none;z-index:5;display:flex;gap:6px;align-items:center;background:rgba(16,21,32,.92);padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.14);}',
    '#ct-freepop,#ct-drawer{position:absolute;left:24px;top:64px;z-index:7;width:320px;background:rgba(16,21,32,.96);border:1px solid rgba(136,192,208,.4);border-radius:10px;padding:12px;display:none;}',
    '#ct-freepop.open,#ct-drawer.open{display:block;}',
    '.ct-badge{padding:6px 8px;border-radius:6px;border:1px dashed rgba(255,255,255,.25);margin-top:6px;font-size:12px;opacity:.5;}',
    '.ct-badge.lit{border:1px solid #ebcb8b;background:rgba(235,203,139,.14);opacity:1;}'
  ].join('\n');
  topDoc.head.appendChild(styleEl);

  var launcher = topDoc.createElement('button');
  launcher.id = 'ct-launcher';
  launcher.type = 'button';
  launcher.textContent = CARD_CONFIG.launcherLabel;

  var root = topDoc.createElement('div');
  root.id = 'ct-root';
  root.innerHTML = [
    '<div id="ct-stage"></div>',
    '<div id="ct-forced-banner"></div>',
    '<div id="ct-top">',
    '  <div><strong>' + CARD_CONFIG.title + '</strong> <small style="opacity:.65;margin-left:8px;">' + CARD_CONFIG.subtitle + '</small></div>',
    '  <div class="ct-stats" id="ct-stats-bar"></div>',
    '  <div style="display:flex;gap:6px;">',
    '    <button type="button" class="ct-btn" id="ct-btn-drawer">✦ 档案与徽章</button>',
    '    <button type="button" class="ct-btn" id="ct-btn-sprite">立绘切换</button>',
    '    <button type="button" class="ct-btn" id="ct-btn-close">✕ 关闭</button>',
    '  </div>',
    '</div>',
    '<div id="ct-sprites"></div>',
    '<div id="ct-hotspots"></div>',
    '<div id="ct-panel"></div>',
    '<div id="ct-freepop"></div>',
    '<div id="ct-drawer"></div>',
    '<div id="ct-foot">',
    '  <input id="ct-draft" type="text" placeholder="选择右侧行动或画面热点生成行动草稿..." />',
    '  <button type="button" class="ct-btn" id="ct-btn-fill">填入输入框</button>',
    '  <button type="button" class="ct-btn primary" id="ct-btn-send">直接发送</button>',
    '</div>',
    '<div id="ct-map"></div>'
  ].join('');

  topDoc.body.appendChild(launcher);
  topDoc.body.appendChild(root);

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
  function sendInput(txt) {
    if (!fillInput(txt)) return false;
    var btn = topDoc.querySelector('#send_but');
    topWin.setTimeout(function () { if (btn) btn.click(); }, 60);
    return true;
  }

  function setDraft(txt) {
    var input = topDoc.getElementById('ct-draft');
    if (input) input.value = txt || '';
  }

  function render() {
    refreshFromStatus();
    var forced = detectForcedScene(runtime.status.location);
    var stageEl = topDoc.getElementById('ct-stage');
    var bannerEl = topDoc.getElementById('ct-forced-banner');
    var statsBar = topDoc.getElementById('ct-stats-bar');
    var spritesEl = topDoc.getElementById('ct-sprites');
    var hsEl = topDoc.getElementById('ct-hotspots');
    var panelEl = topDoc.getElementById('ct-panel');
    var mapEl = topDoc.getElementById('ct-map');
    var freePopEl = topDoc.getElementById('ct-freepop');
    var drawerEl = topDoc.getElementById('ct-drawer');

    // 1. 顶部状态栏
    var statHtml = '<span class="ct-stat-pill">位置：' + runtime.status.location + '</span>' +
                   '<span class="ct-stat-pill">阶段：' + runtime.status.stage + '</span>';
    CARD_CONFIG.statsDisplay.forEach(function (sd) {
      var val = runtime.status[sd.key] != null ? runtime.status[sd.key] : 0;
      statHtml += '<span class="ct-stat-pill">' + sd.label + '：' + val + '/' + sd.max + '</span>';
    });
    statsBar.innerHTML = statHtml;

    // 2. 场景背景（直接替换 backgroundImage，不加 transition）
    var currentSceneObj = CARD_CONFIG.mainScenes[runtime.timeOfDay] || CARD_CONFIG.mainScenes.day;
    if (forced) {
      currentSceneObj = forced;
      bannerEl.style.display = 'block';
      bannerEl.textContent = forced.bannerText;
    } else if (runtime.activeFreeSceneId) {
      for (var i = 0; i < CARD_CONFIG.freeOutingScenes.length; i++) {
        if (CARD_CONFIG.freeOutingScenes[i].id === runtime.activeFreeSceneId) {
          currentSceneObj = CARD_CONFIG.freeOutingScenes[i];
          break;
        }
      }
      bannerEl.style.display = 'none';
    } else {
      bannerEl.style.display = 'none';
    }
    var bgData = ASSETS[currentSceneObj.bgKey];
    stageEl.style.backgroundImage = bgData ? 'url("' + bgData + '")' : (currentSceneObj.fallbackBg || 'none');

    // 3. 立绘档位渲染
    spritesEl.innerHTML = '';
    if (runtime.spriteMode !== 'pure') {
      if (ASSETS.sp_main) {
        var imgMain = topDoc.createElement('img');
        imgMain.className = 'ct-sp-main';
        imgMain.src = ASSETS.sp_main;
        spritesEl.appendChild(imgMain);
      }
      if (runtime.spriteMode === 'dual' && ASSETS.sp_sub) {
        var imgSub = topDoc.createElement('img');
        imgSub.className = 'ct-sp-sub';
        imgSub.src = ASSETS.sp_sub;
        spritesEl.appendChild(imgSub);
      }
    }

    // 4. 画面中央房间交互热点（仅在常驻主舞台显示）
    hsEl.innerHTML = '';
    if (!forced && !runtime.activeFreeSceneId) {
      CARD_CONFIG.roomHotspots.forEach(function (hs) {
        var b = topDoc.createElement('button');
        b.type = 'button';
        b.className = 'ct-hs';
        b.style.left = hs.x + '%';
        b.style.top = hs.y + '%';
        b.textContent = '✦ ' + hs.label + ' (' + hs.gain + ')';
        b.onclick = function () { setDraft(hs.prompt); };
        hsEl.appendChild(b);
      });
    }

    // 5. 右侧三档行动列表
    panelEl.innerHTML = '<div style="font-weight:600;margin-bottom:4px;">当前场景：' + currentSceneObj.name + '</div>';
    var actionsList = forced
      ? forced.actions
      : (runtime.activeFreeSceneId ? (currentSceneObj.actions || []) : CARD_CONFIG.roomActions);

    actionsList.forEach(function (act) {
      var item = topDoc.createElement('div');
      var hasReq = typeof act.check === 'function';
      var unlocked = !hasReq || act.check(runtime.status);
      item.className = 'ct-act' + (hasReq ? (unlocked ? ' open' : ' lock') : '');
      if (hasReq && !unlocked) {
        item.innerHTML = '<div>■ ' + act.title + '</div><div style="margin-top:4px;color:#ebcb8b;">解锁条件：' + act.reqText + '</div>';
      } else {
        item.innerHTML = '<div>' + (hasReq ? '✦ ' : '• ') + act.title + '</div><div style="margin-top:4px;opacity:.75;">收益：' + (act.gain || '日常推进') + '</div>';
        item.onclick = function () {
          setDraft(act.prompt);
          if (runtime.activeFreeSceneId && !forced) {
            runtime.freeRemaining = 0;
            varSet('freeRemaining', 0);
            render();
          }
        };
      }
      panelEl.appendChild(item);
    });

    // 6. 右下角三层场景控制栏 (#ct-map)
    mapEl.innerHTML = '';
    if (forced) {
      var lockTip = topDoc.createElement('span');
      lockTip.style.fontSize = '12px';
      lockTip.style.color = '#ff8080';
      lockTip.textContent = '⚠ 强制事件锁定中';
      mapEl.appendChild(lockTip);
    } else {
      var btnDay = topDoc.createElement('button');
      btnDay.type = 'button';
      btnDay.className = 'ct-btn' + (!runtime.activeFreeSceneId && runtime.timeOfDay === 'day' ? ' primary' : '');
      btnDay.textContent = '☀ 主房间·昼';
      btnDay.onclick = function () { runtime.activeFreeSceneId = null; runtime.timeOfDay = 'day'; varSet('timeOfDay', 'day'); render(); };

      var btnNight = topDoc.createElement('button');
      btnNight.type = 'button';
      btnNight.className = 'ct-btn' + (!runtime.activeFreeSceneId && runtime.timeOfDay === 'night' ? ' primary' : '');
      btnNight.textContent = '☽ 主房间·夜';
      btnNight.onclick = function () { runtime.activeFreeSceneId = null; runtime.timeOfDay = 'night'; varSet('timeOfDay', 'night'); render(); };

      var btnFree = topDoc.createElement('button');
      btnFree.type = 'button';
      btnFree.className = 'ct-btn';
      btnFree.textContent = runtime.freeRemaining > 0
        ? ('✦ 自由外出 (' + runtime.freeRemaining + '/1)')
        : '■ 今日自由已用 (0/1)';
      btnFree.disabled = runtime.freeRemaining <= 0;
      btnFree.onclick = function () {
        runtime.freePopupOpen = !runtime.freePopupOpen;
        render();
      };

      mapEl.appendChild(btnDay);
      mapEl.appendChild(btnNight);
      mapEl.appendChild(btnFree);

      if (runtime.timeOfDay === 'night') {
        var btnSleep = topDoc.createElement('button');
        btnSleep.type = 'button';
        btnSleep.className = 'ct-btn primary';
        btnSleep.textContent = '↻ 入眠进入次日';
        btnSleep.onclick = function () {
          runtime.freeRemaining = 1;
          runtime.activeFreeSceneId = null;
          runtime.timeOfDay = 'day';
          varSet('freeRemaining', 1);
          varSet('timeOfDay', 'day');
          setDraft('结束今日的安排，在主房间入眠休息，迎接次日清晨。');
          render();
        };
        mapEl.appendChild(btnSleep);
      }
    }

    // 7. 自由外出弹窗 (#ct-freepop)
    freePopEl.className = (runtime.freePopupOpen && !forced) ? 'open' : '';
    freePopEl.innerHTML = '<div style="font-weight:600;margin-bottom:8px;">选择今日自由外出目的地 (1/1)</div>';
    CARD_CONFIG.freeOutingScenes.forEach(function (sc) {
      var b = topDoc.createElement('div');
      b.className = 'ct-act';
      b.style.marginBottom = '6px';
      b.innerHTML = '<div><strong>' + sc.name + '</strong></div><div style="opacity:.75;margin-top:2px;">' + sc.desc + '</div>';
      b.onclick = function () {
        runtime.activeFreeSceneId = sc.id;
        runtime.freePopupOpen = false;
        render();
      };
      freePopEl.appendChild(b);
    });

    // 8. 档案与里程碑徽章抽屉 (#ct-drawer)
    drawerEl.className = runtime.drawerOpen ? 'open' : '';
    drawerEl.innerHTML = '<div style="font-weight:600;margin-bottom:6px;">阶段里程碑徽章</div>';
    CARD_CONFIG.badges.forEach(function (bg) {
      var isLit = !!runtime.unlockedBadges[bg.id];
      var d = topDoc.createElement('div');
      d.className = 'ct-badge' + (isLit ? ' lit' : '');
      d.innerHTML = '<div>' + (isLit ? '✦ ' : '🔒 ') + bg.name + '</div><div style="margin-top:2px;">' + bg.desc + '</div>';
      drawerEl.appendChild(d);
    });
  }

  // ==================== 6. 事件绑定与离线预览参数处理 ====================
  launcher.onclick = function () {
    root.classList.add('open');
    render();
  };
  topDoc.getElementById('ct-btn-close').onclick = function () {
    root.classList.remove('open');
  };
  topDoc.getElementById('ct-btn-drawer').onclick = function () {
    runtime.drawerOpen = !runtime.drawerOpen;
    render();
  };
  topDoc.getElementById('ct-btn-sprite').onclick = function () {
    var order = ['main', 'dual', 'pure'];
    var next = order[(order.indexOf(runtime.spriteMode) + 1) % order.length];
    runtime.spriteMode = next;
    varSet('spriteMode', next);
    render();
  };
  topDoc.getElementById('ct-btn-fill').onclick = function () {
    fillInput(topDoc.getElementById('ct-draft').value);
  };
  topDoc.getElementById('ct-btn-send').onclick = function () {
    sendInput(topDoc.getElementById('ct-draft').value);
  };

  topWin.openCardTerminal = function () {
    root.classList.add('open');
    render();
  };
  topWin.__cardTerminalSync = function () {
    render();
  };
  topDoc[MOUNT_KEY] = function () {
    ['ct-root', 'ct-style', 'ct-launcher', 'ct-toast'].forEach(function (id) {
      var el = topDoc.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
  };

  // 支持 preview.html 的 ?mid=1 / ?freepop=1 / ?forced=1 自动展开验证
  try {
    var qs = new URLSearchParams(topWin.location.search);
    if (qs.get('freepop') === '1') runtime.freePopupOpen = true;
    if (qs.get('mid') === '1' || qs.get('freepop') === '1' || qs.get('forced') === '1' || topDoc.getElementById('mock-mes')) {
      root.classList.add('open');
    }
  } catch (e) {}

  render();
})();
