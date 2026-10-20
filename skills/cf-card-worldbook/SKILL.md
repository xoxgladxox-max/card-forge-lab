---
name: cf-card-worldbook
description: v4.1.0｜世界观与世界书：写世界观设定（原作基底、IF 分歧、世界规则，世界与角色的分界）和 SillyTavern 世界书条目（关键词触发、插入位置、递归、常驻、分组、预算、内嵌或独立世界书）。用户说「写世界观」「做世界书」「加条目」「把设定拆成条目」「条目不触发」「关键词怎么写」时使用。
metadata:
  version: 4.1.0
  updated: 2026-10-21
---

# 世界书（v4.1.0）

范围：世界观写什么（世界节点），以及设定怎样变成按需加载的世界书条目。卡文件装配和导出校验不在本技能。

总规则：

- world 在任何 character 节点之前确认。
- 先提结构提案（用哪几层、留哪些子模块、删哪些、要不要新增），作者确认后再写。`references/worldview-template.md` 是示例，不是必填表。
- 正文用结构化 key，不写散文段落。条目名作 key，下一层用条目自己的方面名，值写机制（条件、结果、数值、限度、例外）。不套 `name / definition / description`。骨架和示例见模版文件；表达精炼按 `cf-card-refine`。
- 每个条目激活时单独注入，必须独立完整；「如前所述」式写法删掉。

# 一、世界节点

## 用几层

题材来源在分诊时判定，先在对话 key 清单里确认；作者批准落盘后才按指定位置登记。

| 题材来源 | 层 |
|---|---|
| 原创世界 | `world_foundation` + `base_world`，必要时加 `core_rules` |
| 已知作品正传 | `world_foundation` + `base_world`（熟悉部分压缩，决定世界运转的项不省） |
| 衍生 / IF / 特异二创 | `world_foundation` + `base_world` → `if_divergence` → `core_rules`，三层缺一不可，按此顺序写 |

各层写什么：

- `base_world`：原作世界本来的样子，对象是整个原作世界，不是分支用到的一小块。子模块 `world_history`、`world_location`、`core_systems`、`special_groups`、`social_structure`；环境偏离常识时加 `environment_features`。
- `if_divergence`：同一套子模块，只写分叉后和原作不同的部分：分歧点与大势、社会变迁、新势力、新据点。
- `core_rules`：本分支独有、全线生效的世界级规则。法则名作 key，下面分方面写触发、效果、限度、能否逆转。
- 不归 world 的字段：`narrative_rules`、`style_tags` 归 style；`core_gameplay`、`core_drive`、`core_experience`、`protagonist_focus`、`key_characters` 归规划与 character / output。

## 挂树

- 合一形态：一个 world 节点放完整的 `worldview_profile`。
- 拆分形态：基底世界节点放 `world_foundation` + `base_world`；分支世界节点与基底平铺，正文写明从基底分出，放 `if_divergence` + `core_rules`；只在特定场景触发的法则可再拆成 rule 节点。
- 衍生题材优先拆分，让基底有自己的节点。其余按拆分三问。

## 世界与角色的分界

- world 管 Where / When / What：地理、历史、法则、物种、大势、全线机制。
- world 不写具体角色的身世、面板、性格、好恶、私密互动。角色在 world 里只以势力或事件主导者的身份出现，一句客观带过；这个人是谁，留给 character 节点。
- character 不复述世界法则。Do / Don't 对照见模版文件。

分界判断：

- 料源对不上，先问「这是谁的说法」。某人的说法归那张角色卡，照写，不调和。world 只写客观实际情况，不写「某某说」；原作故意不给答案的，不替原作选。
- 撤节点前拆开看：事实本身有没有答案？有答案的留在 world，谁怎么讲归 character。不要把有答案的事实跟着视角一起撤掉。
- 秘密不贴标签：常加载的条目只写表面那一层；真相只写一处，放默认关闭的条目（`揭晓/`，`enabled: false`），剧情到了由作者手动打开。角色卡不写「隐瞒」「另有身份」这类暗示，她不知道的事卡里就不出现。
- 结局只写有哪些结局、世界变成什么样；达成条件只留在料源索引备查，写进正文会被模型当成必经路线。

## 节点元信息头

`world_book/**/<条目>.md` 头部，导出时翻译成条目触发配置（字段含义见第二部分和 `references/entry-spec.md`）：

```yaml
---
type: character
keys: [本名, 译名, 绰号]   # 触发词，覆盖聊天里实际会出现的叫法；常驻节点留空
secondary: []              # 二级过滤词（如 module 限 NSFW 语境）
position: before_char      # 或 @D 深度写法
title: 小满                # 酒馆列表标题：自然名称，不重复作品名
constant: false
---
```

order 一般不写，导出时按组自动编号；写了就是手动覆盖。

# 二、世界书条目机制

世界书是动态字典：最近 N 条消息里扫到关键词，对应条目的 content 注入提示词。用处是大体量设定不占永久 context。依据：SillyTavern 源码枚举、官方文档、实卡范本（158 条 entry 的多作品世界卡）逐字段核对。

## 核心规则

- 只有 content 进提示词；keys、comment 不注入。comment 是酒馆列表标题，用最短自然叫法，只有不加范围会混淆时才补范围，不按目录层级拼标题。
- 世界基底（世界观、时代、规则）用 constant 常驻；角色、地点、事件用关键词触发。
- 角色条目的 content 是一段独立完整的人物文本，外层用带名字的 XML 包裹。本节只管它怎么装进 entry、怎么触发。
- 中日文卡必须关 `match_whole_words`（全局设置）：中日文不按空格分词。
- 关键词覆盖聊天里实际会出现的叫法：本名、译名、绰号、称呼（如 `["ナナ", "娜娜", "1-B"]`）。
- 多角色卡默认双向关递归（`exclude_recursion` + `prevent_recursion` 都为 true）。范本 158 条中 122 条如此：角色条里必然提到别人的名字，不关会连锁触发半本书。只给真正需要链式带出的（地点 → 驻地角色）开递归。
- 本节不判定事实来源和角色说法的归属，那由上游查料和节点规划确定。

## 内容设计

- 先审逻辑再选格式：每个概念要有作用、适用范围或限制；没有实际影响的名词、同义重复和只为显得专业的字段删掉。
- 世界书不是特殊文法，只是按需注入的容器。Markdown / XML / 风味 YAML 用于维护和分层；只有机器导入、校验或严格输出的部分要求合法 JSON / YAML。
- 按功能分层：世界基底、时代、地点、组织、角色、事件、机制、场景规则。高频底层规则常驻，低频内容按关键词加载。
- 结构壳不承载核心语义：开闭 XML 标签或分组标题只帮模块化，条目不能依赖另一个可能未触发的条目才读得懂。
- 宏先确认来源：官方宏、预设宏、扩展宏、自定义脚本不混称。用 `{{random}}`、`{{roll}}` 等非核心宏前，标明来源并确认目标环境支持；宏失效时整条设定仍要有意义。

## 流程

1. 判断形态：附属某张卡 → 内嵌 `character_book`；跨卡复用或独立世界 → 独立世界书 JSON。
2. 列条目清单：世界基底、地点、角色、组织、事件、剧情、设定百科，各定关键词和 type（事件 `event`、剧情 `plot`、设定百科 `wiki`，归「其余」5xx；机制本身用 `rule`）。
3. 逐条定：触发方式（constant / 关键词 / 正则）、插入位置、递归属性。
4. 填 content：每条独立完整，外层 XML 包裹。
5. 按 `references/entry-spec.md` 组装 JSON。
6. 交装配环节跑世界书机器校验。机器校验只管 JSON 字段、触发、递归、组、位置、深度和预算，不判断事实依据、人物性格或文体。

排查「不触发」「触发过多」「设定打架」时，文本表达和机制配置分开查。

## 触发方式

| 需求 | 做法 |
|---|---|
| 始终在场（世界基底） | `constant: true`，不需要 keys |
| 提到才出现（默认） | keys 数组，多写别名 |
| 两类词同时出现 | keys + `secondary_keys` + `selectiveLogic`。拿不准用 0。源码枚举：0 = AND ANY，1 = NOT ALL，2 = NOT ANY，3 = AND ALL；1 和 3 容易写反 |
| 条目存着暂不启用 | keys 清空（比 `enabled: false` 温和，填回即恢复） |
| 强制激活 / 强制不激活 | content 首行写 `@@activate` / `@@dont_activate`（会被剪掉，不进提示词） |
| 模糊匹配、变体 | 把那个 key 本身写成 `/pattern/flags`（如 `/娜娜|ナナ/i`）。`use_regex` 前端不读，只是兼容位，照写 true |
| 限定使用条件的块（特化文风、成人模块等） | keys 写主关键词，`secondary_keys` 写场景词，`selectiveLogic: 0`，两组各命中一个才加载。只挂一组会被日常戏带进来 |
| 随机氛围事件 | `probability` < 100 |
| 条目 A 提及 B 时也触发 B | 递归（默认开）；不想被连锁触发的设 `exclude_recursion: true` |

## 插入位置

| 位置 | 用途 |
|---|---|
| `before_char`（↑Char） | 角色资料、地点、背景设定；范本 85% 条目在这 |
| `after_char`（↓Char） | 补充规则、行为指令；影响力比 before 大 |
| `@Depth`（数值 4） | 贴近最新对话的状态类信息；depth 越小越靠近末尾，影响越强 |
| AN 顶部 / 底部（2 / 3） | 配合 Author's Note |
| 示例消息顶 / 底（5 / 6） | 当示例对话块插入 |
| Outlet（数值 7） | 不自动注入，由 `{{outlet::名字}}` 宏引用 |

- 别记反：2 / 3 是 Author's Note，5 / 6 是示例消息。网上很多资料写反。
- 顶层 `position` 字符串只能写 `before_char` / `after_char`；示例前后、@Depth、AN 位置看 `extensions.position` 数值，酒馆实际读的是它。
- 排序：同位置内 `insertion_order` 越大越靠后、影响越大。新卡按组连续编号、不重复：世界 1xx、人物 2xx、文风 3xx、输出 4xx、开场白及其他（greeting / plot / event / wiki）5xx；组内按节点树先父后子。范本 158 条全是 100，是旧卡写法，不照搬。

## 一张卡能带几本书

源码 `getCharacterLore()` 合并多个来源，只有前两个随卡走：

| 来源 | 存在哪 | 随卡导出 |
|---|---|---|
| 内嵌 `data.character_book` | 卡文件内 | 是 |
| `data.extensions.world`（主绑定书名） | 卡内只写名字 | 只带名字，对方没有这本书就失效 |
| `charLore[].extraBooks` | 本地 settings.json | 否 |
| 全局 `selected_world_info`、聊天 lore、persona lore | 本地设置 | 否 |

- 要发给别人的卡，世界书内嵌。extraBooks 挂的书对方收不到，也不报错。
- 同名书已在全局、聊天或 persona 激活时会去重跳过，不会双开。

## 条目上百时

- 分组标题栏：插 content 和 keys 都为空的条目，comment 写 `ーーーー分组名ーーーー`，不注入，只在列表里当分隔线。
- 软禁用：keys 清空、内容留着。
- comment 不超过 100 字（源码 `MAX_COMMENT_LENGTH = 100`，超了截断显示）。

## 常见错误

- 一个条目塞整个世界：触发精度和预算都会崩，拆开。
- 关键词太泛（「学校」「他」）或单字（「色」「角」）：每轮都触发，等于常驻。不用单字关键词。
- 关键词太窄（只写全名）：聊天里用昵称就不触发。
- 递归全开且条目互相引用成环：一次触发半本书。多角色卡默认双向关递归。
- 触发词撞车：同一个词挂在多条上会一起触发（例：「茶会」同时触发两场茶会）。定 keys 前查重名，常用词改成更具体的专名；`check` 的 P22 会报同一关键词挂在多个节点。
- 包裹风格混用（`<Tag>` 与 `[名字]`）或每条自造标签名：标签名用按节点类型固定的英文小写词，名字写进 `name` 属性，同类靠 name 区分（标签表见卡的装配规则）。
- token 预算：总注入量受全局 Budget 限制，超了低优先级条目被挤掉。重要条目 `insertion_order` 给高，或慎用 `ignore_budget`。

## 资源

- `references/worldview-template.md`：世界节点示例模版（worldview_profile）。提结构提案前读。
- `references/entry-spec.md`：条目字段与 JSON 结构。组装条目时读。
- `references/design-guide.md`：世界书内容设计指南。规划条目清单时读。
- `assets/example-embedded-book.json`、`assets/example-standalone-book.json`：内嵌与独立世界书范例。
