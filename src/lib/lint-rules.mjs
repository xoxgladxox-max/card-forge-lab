// lint-rules.mjs — cf-card-review S 组里能靠文字匹配判定的部分，外加 banned-words.md 的行当黑名单。
// 只出候选：命中后要人看上下文再定。含禁令词的句子（「严禁使用糖/蜜/毒」）自动跳过。

export const PROHIBITION = /严禁|禁止|不要|不许|不得|避免|别用|别写|禁用|勿/;

// 不自动判定的 S 组规则及原因（同步测试会核对：SKILL.md 的 S 编号 = 已实现 + 这里）
export const NOT_AUTOMATED = {
  S9: '要先判断是否在官能块里',
  S10: '针对跑卡正文，不查卡文本',
  S15: '「不是 X」要读上下文才知道有没有意义',
};

const WORLD_TYPES = new Set(['world', 'location', 'rule', 'item', 'lore']);
const isGreeting = t => t === 'greeting';
const notGreeting = t => t !== 'greeting';
const any = () => true;

const uniq = a => [...new Set(a)];

// 逐行查词：返回 [{ line, words, text }]
function lineRule(id, name, scope, matchLine, { skipProhibition = true } = {}) {
  return {
    id, name, scope,
    check(lines) {
      const hits = [];
      for (const l of lines) {
        if (!l.text.trim()) continue;
        if (skipProhibition && PROHIBITION.test(l.text)) continue;
        const words = matchLine(l.text);
        if (words.length) hits.push({ line: l.no, words, text: l.text.trim() });
      }
      return hits;
    },
  };
}
const wordsIn = list => text => list.filter(w => text.includes(w));

// S3：独立成段的短句（前后都是空行，去掉标点后不超过 6 个字）
function s3() {
  return {
    id: 'S3', name: '电报体成行', scope: isGreeting,
    check(lines) {
      const hits = [];
      for (let i = 0; i < lines.length; i++) {
        const t = lines[i].text.trim();
        if (!t || /^[#\-*|>`<\d]/.test(t)) continue;
        if (!/[。！？…]$/.test(t)) continue;
        const core = t.replace(/[\s。！？…，、「」『』“”"'（）()]/g, '');
        if (core.length === 0 || core.length > 6) continue;
        const prev = i === 0 ? '' : lines[i - 1].text.trim();
        const next = i === lines.length - 1 ? '' : lines[i + 1].text.trim();
        if (prev === '' && next === '') hits.push({ line: lines[i].no, words: [t], text: t });
      }
      return hits;
    },
  };
}

// S7：同一节点内「微微」≥3 次，报第一次出现的行
function s7() {
  return {
    id: 'S7', name: '口癖复用', scope: any,
    check(lines) {
      let count = 0, first = null;
      for (const l of lines) {
        const n = l.text.split('微微').length - 1;
        if (n && !first) first = l;
        count += n;
      }
      return count >= 3 ? [{ line: first.no, words: [`微微 ×${count}`], text: first.text.trim() }] : [];
    },
  };
}

// S14：开场白里一句话「的」超过两个，或出现「的的」（先去掉「的确」）
function s14() {
  return {
    id: 'S14', name: '「的」字堆叠', scope: isGreeting,
    check(lines) {
      const hits = [];
      for (const l of lines) {
        if (!l.text.trim()) continue;
        const words = [];
        for (const s of l.text.replace(/的确/g, '').split(/[。！？!?；;…]/)) {
          const n = s.split('的').length - 1;
          if (s.includes('的的')) words.push('的的');
          else if (n > 2) words.push(`「的」×${n}`);
        }
        if (words.length) hits.push({ line: l.no, words: uniq(words), text: l.text.trim() });
      }
      return hits;
    },
  };
}

// banned-words.md「按行当分的黑名单」表 → [{ group, words }]
export function parseBannedWords(md) {
  const text = md.replaceAll('\r\n', '\n');
  const start = text.indexOf('## 按行当分的黑名单');
  if (start < 0) return [];
  const rest = text.slice(start + 3);
  const end = rest.indexOf('\n## ');
  const section = end >= 0 ? rest.slice(0, end) : rest;
  const groups = [];
  for (const row of section.split('\n')) {
    const cells = row.split('|').map(s => s.trim());
    if (cells.length < 4 || !cells[1] || cells[1] === '行当' || /^-+$/.test(cells[1])) continue;
    const words = cells[2].split(/[、，,／/]/).map(s => s.trim()).filter(w => w.length >= 2);
    if (words.length) groups.push({ group: cells[1], words });
  }
  return groups;
}

export function buildRules({ banned = [], names = [] } = {}) {
  const rules = [
    lineRule('S1', '外语残留', isGreeting, wordsIn(['ちゃん', 'です', 'ます', 'さん', 'くん']), { skipProhibition: false }),
    lineRule('S2', '机械八股词', any, wordsIn(['机械', '拉扯', '张力', '撕裂'])),
    s3(),
    lineRule('S4', '廉价通感隐喻', isGreeting, text => {
      const t = text.replace(/毒舌|中毒|解毒|毒药|蜂蜜|糖果|砂糖|白糖/g, '');
      return uniq(t.match(/[糖蜜毒]/g) ?? []);
    }),
    lineRule('S5', '心理学后设术语', any, wordsIn(['斯德哥尔摩', 'PUA', '煤气灯', '操纵', '人设面具', '假面'])),
    lineRule('S6', 'AI 八股生理反应', any, wordsIn(['瞳孔收缩', '瞳孔骤缩', '指甲嵌进掌心', '胃袋失重', '喉结滚动'])),
    s7(),
    lineRule('S8', '空洞程度词', notGreeting, text => uniq(text.match(/(很|比较|有点)[\u4e00-\u9fa5]/g) ?? [])),
    lineRule('S11', '财务与说明文腔', any, wordsIn(['账本', '记账', '欠账', '收支', '债务'])),
    {
      ...lineRule('S12', '世界节点角色痕迹', t => WORLD_TYPES.has(t),
        wordsIn([...names, '穿越', '身世', '出身', '性格', '喜欢', '讨厌', '口癖', '战力', '数值', '面板', '好感', '心理']),
        { skipProhibition: false }),
    },
    lineRule('S13', 'AI 套话', any, wordsIn(['不禁', '油然而生', '仿佛', '宛如', '这一刻', '值得注意的是'])),
    s14(),
  ];
  for (const g of banned) {
    rules.push(lineRule('BW', `黑名单·${g.group}`, any, wordsIn(g.words)));
  }
  return rules;
}

export const AUTOMATED_S = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S11', 'S12', 'S13', 'S14'];
