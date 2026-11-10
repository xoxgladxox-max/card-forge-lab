# 世界书 Entry 字段规范

组装 JSON 前必读。依据：**SillyTavern 源码**（`public/scripts/world-info.js`、`constants.js`、`script.js`）+ 158 条 entry 实卡范本核对。

> ⚠️ 网上流传的 `position` 与 `selectiveLogic` 数值表**大量是错的**。第四节的表直接取自源码枚举，以它为准。

## 一、内嵌 vs 独立文件

**内嵌（character_book）**：挂在角色卡 `data.character_book` 下，随卡导出。

```json
"character_book": {
  "name": "世界书名称",
  "entries": [ … ]
}
```

**独立世界书文件**：`entries` 是**对象**（key = uid 字符串）而非数组，字段名全部换成驼峰：

```json
{
  "entries": {
    "0": {
      "uid": 0,
      "key": ["关键词"],
      "keysecondary": [],
      "comment": "",
      "content": "",
      "constant": false,
      "selective": true,
      "order": 100,
      "position": 0,
      "disable": false,
      "excludeRecursion": false,
      "preventRecursion": false,
      "delayUntilRecursion": 0,
      "probability": 100,
      "useProbability": true,
      "depth": 4,
      "selectiveLogic": 0,
      "group": "",
      "groupOverride": false,
      "groupWeight": 100,
      "scanDepth": null,
      "caseSensitive": null,
      "matchWholeWords": null,
      "useGroupScoring": null,
      "automationId": "",
      "role": 0,
      "vectorized": false,
      "sticky": null,
      "cooldown": null,
      "delay": null,
      "outletName": "",
      "triggers": [],
      "ignoreBudget": false,
      "addMemo": false,
      "displayIndex": 0
    }
  }
}
```

**两种格式字段对应表**（源码 `convertCharacterBook()` 的真实映射）：

| 内嵌 character_book | 独立文件 | 坑 |
|---|---|---|
| `id` | `uid` | |
| `keys` | `key` | |
| `secondary_keys` | `keysecondary` | |
| `insertion_order` | `order` | |
| `enabled: true` | `disable: false` | **含义取反** |
| `extensions.position`（优先）/ 顶层 `position` 字符串 | `position`（数值） | |
| `extensions.exclude_recursion` | `excludeRecursion` | 下面全部下划线→驼峰 |
| `extensions.prevent_recursion` | `preventRecursion` | |
| `extensions.delay_until_recursion` | `delayUntilRecursion` | **源码里是数字（递归层级），不是布尔**，0=不延迟 |
| `extensions.group_override` | `groupOverride` | |
| `extensions.group_weight` | `groupWeight` | |
| `extensions.scan_depth` | `scanDepth` | |
| `extensions.case_sensitive` | `caseSensitive` | |
| `extensions.match_whole_words` | `matchWholeWords` | |
| `extensions.use_group_scoring` | `useGroupScoring` | |
| `extensions.automation_id` | `automationId` | |
| `extensions.outlet_name` | `outletName` | |
| `extensions.ignore_budget` | `ignoreBudget` | |
| `extensions.display_index` | `displayIndex` | |
| `comment` 非空 | `addMemo: true` | 导入时自动推导 |

其余同名字段（`content`/`constant`/`selective`/`selectiveLogic`/`probability`/`useProbability`/`depth`/`group`/`role`/`vectorized`/`sticky`/`cooldown`/`delay`/`triggers`）直接对应；`match_*` 系列同样下划线转驼峰（`matchPersonaDescription` 等）。

> 注意两个**不转驼峰的例外**：`extensions.selectiveLogic` 和 `extensions.useProbability` 在内嵌格式里就是驼峰写法（源码里就这么读），写成 `selective_logic` / `use_probability` 会被当不存在而回退默认值。
>
> 反向验证（导出侧 `convertWorldInfoToCharacterBook()`）：酒馆把独立世界书写回卡内嵌书时，**顶层只写 11 个字段**（id/keys/secondary_keys/comment/content/constant/selective/insertion_order/enabled/position/use_regex），其余全部进 `extensions`，与本文二/三节的结构一致。双向转换都对得上，说明结构无误。

> 导入内嵌书时酒馆自动跑这个转换，**所以默认就写内嵌格式**；只有用户要可单独导入的 World Info 文件时，才按上表转成驼峰格式。

以下为**内嵌格式**（实证过的，优先用）。

## 二、entry 完整结构

```json
{
  "id": 0,
  "keys": ["本名", "译名", "绰号"],
  "secondary_keys": [],
  "comment": "备忘，不进提示词",
  "content": "实际注入的文本",
  "constant": false,
  "selective": true,
  "insertion_order": 100,
  "enabled": true,
  "position": "before_char",
  "use_regex": true,
  "extensions": { … }
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | number | 条目序号，从 0 递增 |
| `keys` | string[] | 主关键词。任一项写成 `/pattern/flags` 就按正则匹配（不需要开关，见下） |
| `secondary_keys` | string[] | 次关键词，配合 selectiveLogic |
| `comment` | string | 标注用 |
| `content` | string | 唯一注入提示词的字段 |
| `constant` | bool | true = 常驻，无视关键词 |
| `selective` | bool | 启用 secondary_keys 过滤（范本默认 true） |
| `insertion_order` | number | 越大越靠后插入 = 影响越大。范本默认 100 |
| `enabled` | bool | 开关 |
| `position` | string | `before_char` / `after_char`（其余位置以 extensions.position 数值为准） |
| `use_regex` | bool | **兼容位字段**。导出时源码固定写 `true`（注释：ST keys are always regex），保持 `true` 即可 |

> 说明：`matchKeys()` 会对每个 key 调用 `parseRegexFromString(needle)`，识别到 `/pattern/flags` 形式即按正则匹配（合法 flags 为 `g i m s u y`，此时大小写与全词选项由 flags 自行决定），普通字符串则按纯文本子串匹配。需要正则变体时直接将 key 写为 `/角色本名|外文名/i`。

## 三、extensions 全字段

范本每条 entry 都带完整 extensions，照抄默认值再改需要的：

```json
"extensions": {
  "position": 0,
  "exclude_recursion": false,
  "display_index": 0,
  "probability": 100,
  "useProbability": true,
  "depth": 4,
  "selectiveLogic": 0,
  "outlet_name": "",
  "group": "",
  "group_override": false,
  "group_weight": 100,
  "prevent_recursion": false,
  "delay_until_recursion": false,
  "scan_depth": null,
  "match_whole_words": null,
  "use_group_scoring": false,
  "case_sensitive": null,
  "automation_id": "",
  "role": 0,
  "vectorized": false,
  "sticky": 0,
  "cooldown": 0,
  "delay": 0,
  "match_persona_description": false,
  "match_character_description": false,
  "match_character_personality": false,
  "match_character_depth_prompt": false,
  "match_scenario": false,
  "match_creator_notes": false,
  "triggers": [],
  "ignore_budget": false
}
```

| 字段 | 说明 |
|---|---|
| `position` | 数值版位置，见下表。**这个才是酒馆实际读的**，顶层字符串只能表达 before/after 两值 |
| `exclude_recursion` | true = 不被其他条目的 content 递归触发 |
| `display_index` | 前端列表显示顺序。不在新建模板定义里，但 `convertCharacterBook()` 与 `originalWIDataKeyMap` 都读它（缺省时取数组下标），合法字段 |
| `probability` / `useProbability` | 触发概率 0-100 / 是否启用 |
| `depth` | @ Depth 位置的深度值（position=4 时生效） |
| `selectiveLogic` | 见下表 |
| `outlet_name` | 位置为 Outlet 时的名字，`{{outlet::名字}}` 调用 |
| `group` / `group_weight` / `group_override` / `use_group_scoring` | Inclusion Group：同组多条同时激活只插一条；默认按 weight 随机；override=按 order 定选；scoring=按关键词命中数定选 |
| `prevent_recursion` | true = 本条内容不再触发别的条目 |
| `delay_until_recursion` | 只能被递归触发，首轮扫描不激活。**源码里是数字（递归层级）**，0/false = 不延迟；写具体层号可指定第几轮递归才入场 |
| `scan_depth` / `match_whole_words` / `case_sensitive` | 条目级覆盖全局设置，null = 跟随全局 |
| `automation_id` | 联动 STscript Quick Reply |
| `role` | @ Depth 的消息角色，见下表 |
| `vectorized` | 允许向量匹配（需向量扩展） |
| `sticky` | 激活后保持 N 条消息（期间免概率检查） |
| `cooldown` | 激活结束后冷却 N 条消息再开放触发 |
| `delay` | 聊天满 N 条消息才允许激活 |
| `match_*` 六项 | 额外扫描源：persona 描述/角色描述/性格/深度提示/场景/创作者笔记 |
| `triggers` | 限定生成类型（normal/continue/impersonate/swipe/regenerate/quiet），空 = 全部 |
| `ignore_budget` | 无视 token 预算强插，慎用 |

## 四、数值编码对照（源码枚举）

### position

```js
// world-info.js：world_info_position
before: 0, after: 1, ANTop: 2, ANBottom: 3, atDepth: 4, EMTop: 5, EMBottom: 6, outlet: 7
```

| 数值 | 常量 | UI 标签 | 含义 |
|---|---|---|---|
| 0 | before | ↑Char | 角色定义**前** |
| 1 | after | ↓Char | 角色定义**后** |
| **2** | ANTop | ↑AT | **Author's Note 顶部** |
| **3** | ANBottom | ↓AT | **Author's Note 底部** |
| 4 | atDepth | @D | @ Depth（配合 depth + role） |
| **5** | EMTop | ↑EM | **示例消息顶部** |
| **6** | EMBottom | ↓EM | **示例消息底部** |
| 7 | outlet | — | Outlet（配 `outlet_name` + `{{outlet::名}}`） |

> 🚨 **2/3 是 Author's Note，5/6 才是示例消息**。很多二手资料把这两组写反了，写错条目会落到完全不同的地方。

顶层 `position` 字符串只有 `before_char`/`after_char`（V3 spec 只定义了两个），**表达不了 2~7**。源码读取逻辑：

```js
position: entry.extensions?.position ?? (entry.position === 'before_char' ? 0 : 1)
```

即 **`extensions.position` 优先，顶层字符串只是没 extensions 时的兑水**。要用 2~7：`extensions.position` 写真值，顶层写 `after_char` 就行，不一致不报错。范本那条 `after_char / 3` 实际落在 **Author's Note 底部**。

### role（position=4 时生效）

```js
// script.js：extension_prompt_roles
SYSTEM: 0, USER: 1, ASSISTANT: 2
```

### selectiveLogic

```js
// world-info.js：world_info_logic
AND_ANY: 0, NOT_ALL: 1, NOT_ANY: 2, AND_ALL: 3
```

| 数值 | 逻辑 | 含义 |
|---|---|---|
| 0 | AND ANY | 主键命中 + **任一**次键命中 |
| **1** | **NOT ALL** | 主键命中 + 次键**不全**出现 |
| **2** | **NOT ANY** | 主键命中 + 次键**一个都没**出现 |
| **3** | **AND ALL** | 主键命中 + **全部**次键命中 |

> 🚨 **1 和 3 极容易写反**。不是直觉的 ANY→ALL→NOT ANY→NOT ALL 顺序，源码是 **ANY → NOT_ALL → NOT_ANY → ALL**。写错会把“必须都出现”变成“不能都出现”，逻辑完全倒过来。拿不准就用 **0**（范本唯一用到的值）。

### triggers（生成类型过滤）

```js
// constants.js：GENERATION_TYPE_TRIGGERS
['normal', 'continue', 'impersonate', 'swipe', 'regenerate', 'quiet']
```

空数组 = 全部生效。只能从这六个里选，写别的会被过滤掉。

### 源码里的真实默认值

`DEFAULT_DEPTH = 4`、`DEFAULT_WEIGHT = 100`、`MAX_SCAN_DEPTH = 1000`、`MAX_COMMENT_LENGTH = 100`（comment 超 100 字会被截断显示）。

新建条目模板默认：`selective: true`、`order: 100`、`position: 0`、`probability: 100`、`useProbability: true`、`depth: 4`、`role: 0`、`groupWeight: 100`；而 `scanDepth`/`caseSensitive`/`matchWholeWords`/`useGroupScoring`/`sticky`/`cooldown`/`delay` 全部默认 **null**（= 跟随全局）。

> 范本内嵌书把 `sticky/cooldown/delay` 写成 `0`、`delay_until_recursion` 写成 `false`，都能正常工作（当假值处理）。照范本抄即可。

### 额外：content 开头的装饰器

源码 `KNOWN_DECORATORS = ['@@activate', '@@dont_activate']`。写在 `content` **最开头的行**，会被剪掉不进提示词：

```
@@activate
这里才是真正的条目内容
```

`@@activate` = 强制激活（无视关键词），`@@dont_activate` = 强制不激活。`@@@` 前缀是 fallback（上一行是未知装饰器时才生效）。看到外部卡条目正文以 `@@` 开头时，按装饰器指令原样保留。

## 五、范本实证参数（多角色世界卡的典型配置）

158 条 entry 的逐字段统计（可直接当默认值照抄）：

**触发与位置**

- constant=true 仅 **1 条**（世界基底），其余 157 条全部关键词触发
- extensions.position：`0`（↑Char）135 条、`1`（↓Char）22 条、`3`（↓AT = Author's Note 底部）1 条
- depth：`4` 共 146 条、`2` 共 11 条、`1` 共 1 条（position 不是 4 时 depth 不生效，但字段仍写）
- role 全部 `0`（system）

**全卡统一的字段**（158/158）

`use_regex: true`、`selective: true`、`enabled: true`、`insertion_order: 100`、`probability: 100`

> 含义：范本卡不靠 insertion_order 排序（全 100 = 不排），靠的是 **position 分层** + **关键词精度**。以上是范本统计；新卡按组连续编号（世界 1xx → 人物 2xx → 文风 3xx → 输出 4xx → 开场白及其他（greeting / plot / event / wiki）5xx，不重复）。

**递归字段（重要发现）**

| 组合 | 条数 | 含义 |
|---|---|---|
| `exclude_recursion: true` + `prevent_recursion: true` | **122**（77%） | 彻底退出递归链 |
| 两者都 false | 35 | 参与递归 |
| 仅 `prevent_recursion: true` | 1 | 能被拉起但不拉别人 |

> **多角色卡 77% 的条目都双向关闭递归**。角色条目中常包含关联人物姓名，双向关闭可防止单次提及连锁拉起半本书。多角色卡与常驻总纲默认双向关递归，只给确需链式带出的绿灯枢纽条目（如地点带出驻地角色）按需放开单向递归。

**几乎没用上的字段**

`secondary_keys` 仅 1 条使用（主键「校長先生」+ 次键「彩南高校」，selectiveLogic=0，用于消歧义）；`group` 全空；`sticky`/`cooldown`/`delay` 全 0。

> 含义：这些是**高级字段，不是必填项**。基础大卡不用它们也跑得好；需要时再查 `design-guide.md`。

**关键词数量分布**

| keys 数 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| 条数 | 5 | 18 | **47** | **37** | **33** | 10 | 5 | 3 |

> **2~4 个关键词是主流（117/158）**。典型角色条：`["外文名", "角色本名", "角色全名", "班级或部门", "身份代称"]` = 外文名 + 中文译名 + 全名 + 所属部门 + 代称。

**content 体量（世界书存在的理由）**

| 项 | 值 |
|---|---|
| 卡本体 description | **51 字符**（只有四行世界观） |
| 世界书总 content | **4,198,343 字符** |
| 单条平均 | 26,572 字符 |
| 单条最大 | 86,691 字符 |

单条长度分档（154 条非空）：<2k 共 12 条、2k~1万 28 条、1万~3万 41 条、3万~6万 **65 条**、>6万 8 条。

> **卡本体 51 字符常驻，419 万字符按需加载**，直观体现了世界书按需注入的优势。注意该范本条目主体为英文（约 4 字符折算 1 token），中文约 1.5 字符折算 1 token，编写中文世界书时按实际 token 预算把控单条篇幅。

**单条 content 格式（实证）**

| 包裹风格 | 条数 |
|---|---|
| `<Tag_Name>` … `</Tag_Name>` XML | 71 |
| `[名字]` … `[/名字]` 方括号 | 82 |
| 无包裹 | 1 |

> 范本两种风格混用（历史遗留）。以上是范本统计；新卡按装配规则里的节点标签表。

**127/154 条内部是 `character:` 开头的 yaml**，把完整的角色设定直接放入条目正文。另有 27 条内嵌台词块（将角色台词收入世界书条目 `content`）。

**空 keys 的两种用法**

范本 5 条 keys 为空，对应两种常见用途：

1. **分组标题栏**（4 条）：`content` 为空，comment 写成 `ーーーーー宇宙人ーーーーー`、`ーーーーーーー東京都ーーーーーー`，在前端列表里充当视觉分隔栏。
2. **暂存备查**（1 条）：`enabled: true` 配合空 `keys`，内容保留在卡内而暂不触发，恢复时填回关键词即可。
