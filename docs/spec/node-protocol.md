# 节点文件协议 v0.1

本协议约束卡工程里的节点文件，让工具不用猜就能找到正文、识别节点、决定导出去处。节点树怎么规划见 cf-card-oneclick，本协议只规定机器接口。

## 0. 标准卡工程布局

一张卡一个文件夹，工具只认以下位置：

| 位置 | 是什么 |
|---|---|
| `card.md` | 卡根（type: card），全卡只允许一个 |
| `<字段>.md` | 单槽字段：description、personality、scenario、mes_example、system_prompt、post_history_instructions |
| `message/0.md`、`message/<n>.md` | first_mes；alternate_greetings（按 n 排序） |
| `world_book/**/<条目>.md` | 世界书条目，一条一个文件；子目录只用于分组，装配不看目录层级 |
| `regex/`、`scripts/` | 拆出的正则与脚本 |
| `character.png` | 封面 |

`记录/`、`候选/`、`待归位/`、`note/` 等不进卡。每个节点文件都是下面的三段式。

旧版节点树（根 `index.md` 当卡根，`world/`、`character/`、`greeting/`、`output/`、`style/` 下的 `<节点>/index.md`）不被扫描。没有 `card.md` 报 P10 error；检测到旧版结构时提示先运行 `node src/cli.mjs migrate <旧卡目录> --out <新标准卡目录>`。迁移不改旧目录；不迁移就不能 build，避免静默拼出空卡。

## 1. 节点文件三段式结构

```text
---
<frontmatter：机器解析的元信息>
---

## 工序
<进入条件 / 产出 / 加载 / 验收 / 状态 —— 给人和 Agent 看，不导出>

<!-- body -->
<正文：唯一会进入卡的内容，到文件尾>
```

- frontmatter：`--- ... ---` 包住的 YAML。
- 工序段：从 `## 工序` 到 `<!-- body -->` 之前。
- 正文：从 `<!-- body -->` 之后开始，这是唯一的硬标记。

规则：
- 缺 `<!-- body -->` → 报错并列出节点，由人补标记；工具不猜正文从哪开始。
- 出现多个 `<!-- body -->` → 报错。
- 正文为空但节点不是 note → 警告。
- `state.md`、`note/*.md` 不导出，无标记要求。

## 2. frontmatter 字段

| 字段 | 必填 | 含义 |
|---|---|---|
| id | 是 | 稳定身份，如 `chr-main`、`wld-harbor`。文件改名、移动都不变；条目 ID 由它生成 |
| type | 是 | 节点类型（card/world/location/rule/item/lore/character/module/corpus/style/output/greeting/plot/event/wiki/note） |
| target | 否 | 导出归属，缺省按类型默认表（见第 3 节） |
| title | 否 | 世界书条目标题，见「标签与标题」 |
| keys / secondary | 否 | 触发词 / 二级过滤词 |
| position / order / constant | 否 | 插入位置 / 排序 / 常驻 |
| ignore_budget | 否 | 布尔，导出为 `extensions.ignore_budget`，不写为 false |

id 建节点时一次性确定；工具发现缺 id 的节点只报告，不静默改写文件。

## 3. 导出归属（target）

默认表与 cf-card-format-export 的「节点类型 → 导出去处」一致：

| type | 默认 target |
|---|---|
| world / location / rule / item / lore / module / style / plot / wiki / event | character_book 条目 |
| character（主角） | description（单角色卡）或 character_book（多角色，默认每条自包含；三明治为可选，见「标签与标题」） |
| corpus | description 或 character_book（节点上写明；不用 mes_example，写了报 P16 警告） |
| output | description、system_prompt，或 character_book 配 @D 低深度（节点上写明；不写历史指令，写了报 P17 警告） |
| greeting | first_mes / alternate_greetings |
| card / note | 不导出正文（card 只出卡元信息） |

冲突规则：
- `description` / `first_mes` / `system_prompt` 这类单槽字段：只允许一个节点指向它，多个 → 报冲突。
- `alternate_greetings`：允许多个 greeting 节点，按 order 合并。
- character_book 条目：一节点一条目，id 即条目身份，重复 id → 报错。

## 4. 状态与检查记录

- 状态主记录：节点工序段的「状态」行（调研中 → 草稿 → 已确认 → 已落盘）。
- 卡根总纲的节点一览表由工具从各节点汇总；手写的决策、范围、key 放在生成区块之外，工具只更新它生成的区块：
  `<!-- forge:status begin --> ... <!-- forge:status end -->`
- 检查记录：`.card-forge/checks/<node-id>.json`，存正文指纹（sha256）、规则版本、结果、时间。
- 正文变了 → 指纹对不上 → status 显示「检查过期，待复查」；没有记录 → 显示「未记录」，不假装通过。
- 状态栏只记录已经发生的事：没跑过检查不写「已通过」，没确认不写「已确认」。

## 5. 派生视图（工具生成，不手改）

| 文件 | 内容 |
|---|---|
| `.card-forge/build-manifest.json` | 本次构建的条目清单：id、源文件、target、指纹 |
| `.card-forge/checks/` | 每节点检查记录 |
| `.card-forge/reports/` | status / check / build / inspect 的报告 |
| `dist/` | 成品 JSON / PNG / 文字镜像 |
| `backups/` | 覆盖前备份 |

这些都不是主源；丢了能重建，重建结果必须与节点内容一致，不一致报错。

## 6. 不做的事

- 不解析正文内部结构（XML / Markdown / YAML 原样搬运）。
- 不从正文推断触发词或导出去处。
- 不把 state.md 当成 MVU 实时状态源。

## 7. 酒馆旧字段与条目形状

- 本工作流不写 creator_notes、post_history_instructions、tags、mes_example：这几个字段在现行酒馆用法里作用很小，内容改放进描述或世界书。
- P16（警告）：节点 target 为 mes_example。
- P17（警告）：节点 target 为 post_history_instructions；卡根写了 creator_notes 或非空 tags。
- P18（警告）：进世界书的条目首尾不是配对的顶层标签；包裹内首行形如 `key:` 时按 YAML 解析失败；没写 title；title 里含路径分隔符。
- 以上都只警告，照常 build。

## 8. 标签与标题

1. 标签名按节点类型取固定的英文小写词（见下表），不自造，不带作品名或人物名。
2. 属性只用两个：`name` 写这段说的是谁、哪儿、哪套文风，用作品里的叫法；`part` 写这段是那个人的哪一部分。属性值用英文双引号，值里不含英文双引号。
3. title 用最短的自然叫法，不写路径，全卡不重复。范围词只在名字单看分不清归属时加，判据见下文「标题去重复」。
4. 正文首行是开头标签，尾行是对应的结尾标签；多块并列（配角群）每块各自成对，块与块之间只有空行。
5. 包裹内的 YAML 顶格写；散文块可用 `##` 小标题。包裹内部不再套标签。
6. 输出侧标签（状态栏、思维链）不在本表，由输出规范自己定，同样用英文小写、成对。

| 节点类型 | 包裹 | 必填属性 | title 例 |
|---|---|---|---|
| world / location / lore / rule / item | `<world name="…">`，其余类型同形，标签名即类型名 | name | 临海市世界观（顶层）、临海市世界时间线 |
| character | `<character name="人物名">` | name | 绫音 |
| module / corpus | `<character name="人物名" part="模块名">` | name、part | 绫音口癖语料 |
| 配角群（一条多人） | 每人一个 `<character name="…">` | name | 配角群 |
| style | `<style name="文风名">` | name | 雨季文风 |
| plot（剧情） | `<plot name="…">` | name | 初次见面 |
| wiki（设定百科） | `<lore name="…">`（沿用 lore 标签） | name | 港口研究所 |
| event（事件） | `<event name="…">`，可加其他属性（如 level） | name | 补给被截 |
| output（进 description） | 不加包裹 | — | — |
| output（进世界书） | `<output>` | — | 输出规范 |
| greeting | 不加包裹（开场白是回复的样板） | — | — |

检查（都只警告，不拦 build）：

- P18a：标签名要和节点类型对上（module、corpus 用 `character`）。
- P18b：除 output、greeting 外开头标签要有 name；module、corpus 要有 part。
- P18c：编号保留不用。标题不要求包含 name / part 全称。
- P18d：标题全卡唯一；同一标签下 name（加 part）唯一。
- P18e：包裹内 YAML 第一层 key 从第 1 列写起。

例子用 `<example>` 子标签的写法未启用：它和「XML 只包大模块」的规则冲突。

### 三明治（可选）

默认每条自包含。要用三明治时开头、收尾各一个节点，放在同一分组下，头字段写 `wrap: head` / `wrap: tail`，这两条免查首尾成对。P19 检查拼得起来的条件（依据酒馆 world-info.js 的装配与预算逻辑）：

- 首尾都要 `constant: true`；
- 首尾都要 `ignore_budget: true`，否则超预算时 order 小的开头先被截掉；
- 首尾与组内条目 position（含深度）相同；
- 开头 order 小于组内所有条目，收尾大于组内所有条目（自动编号时已保证）；
- 有开头就要有收尾。

即使护栏齐全，用户自己挂的全局世界书里 order 落在区间内的条目也会被包进来，卡这边控制不了。

### 标题去重复

- 作品名、分支名只加在世界观顶层条目上，写成「作品名世界观」「分支名世界观」。
- 其余条目写自然名称，不重复范围词：地点写地名，人物写人名，模块写「人名＋模块名」，文风写文风名，输出写「输出规范」。
- 判据是名字单看能不能认出归属：专名（地名、人名、组织名、专有物件）自带归属，不加；通用名（时间线、历史、势力格局、魔法体系等每个世界都有的东西）要加所属层的范围词。
- 例：一张卡同时有原作基底和一条 IF 分支时，分支独有的时间线写「某分支世界时间线」，否则读者会以为是原作时间线。

## 9. 世界书排序

条目 order 按组连续编号、不重复，同一类内容排在一起：

- 组号：世界（world / location / lore / rule / item）1、人物（character / module / corpus）2、文风 3、输出 4、开场白及其他（greeting / plot / event / wiki）5。
- 分工：lore 写历史、时间线、背景设定；plot 写按场次推进的剧情；event 写可能发生或已经发生、会改变当前局面的事件和事件池；wiki 写词条式的设定百科；rule 写机制本身（如压力档位怎么推进）。
- 不写 order 时由 build 自动编号：按组从 101、201……连续递增，组内按节点树先父后子，同级按文件名排；三明治开头在同级最前、收尾在最后。
- 写了数字 order 就是手动覆盖，原样保留；自动编号跳过已被手写占用的号。
- 任一组超过 99 条时全卡改用四位编号（1001、2001……）。
- P20（警告）：order 重复；order 不在节点类型对应的组；组内不连续。删掉手写的 order 即可改为自动编号。
- P22（警告）：同一个普通关键词挂在多个进世界书的节点上（常驻节点、正则词不查）：一喊全响，常用词改专名。定 keys 前先查重名。
- check 只看 type 字段，不看内容。条目 order 跨组（P20）或包裹标签与类型不符（P18a）时，check 末尾集中列出「格式适配提醒」，请按内容确认 type；未知 type（P5）列出可用类型。迁移、拆卡按目录填的 type 不一定对。
- 代价：超过世界书 token 预算时酒馆先保留 order 大的条目，世界组最先被挤掉；大世界书里重要的世界条目可设 `ignore_budget: true`。
