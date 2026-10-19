# card-forge-lab 使用说明

写卡在支持技能的 AI 工具（编辑器插件或命令行 Agent）里写，玩卡在 SillyTavern 或 TauriTavern 里玩。两边的双向同步由另一个项目 tt-card-bridge 负责。

## 各部分管什么

| 位置 | 作用 |
|---|---|
| `skills/` | 制卡技能原件，清单见 `skills/README.md` |
| `projects/` | 本地卡工程（不进 git） |
| `src/` | 命令行工具：校验、用词检查、装配成卡、拆卡、迁移 |
| `examples/meta-template/` | 可复制的空白卡工程模板 |

## 日常怎么用

1. **出一张新卡**：对 AI 说「一键出卡：……」。AI 读 `cf-card-oneclick`，先给出一张出卡单，确认后按流程写完，中途不再询问。需要作者决定的事标「提案」或「缺口」，交付时一起列出。
2. **只做一部分**：直接说要做什么（查资料、写世界书、写角色、检查、文风/开场白/导出），AI 读对应领域的技能。
3. **放进酒馆玩**：用 `build` 出 JSON / PNG 后导入；或用 tt-card-bridge 把卡工程和酒馆里的卡关联，之后两边的改动互相同步。
4. **改了技能**：先把 SKILL.md 里的版本号涨一下，再按所用 AI 工具的方式重新加载技能。

## 环境要求

- Node.js ≥ 22
- PowerShell 5.1+（世界书和角色卡校验脚本需要）
- 主要在 Windows 上使用；其他平台未作保证

## 命令行工具（在 card-forge-lab 目录运行）

```powershell
node src/cli.mjs status  <卡目录>                # 看进度、缺失、过期检查、下一步
node src/cli.mjs status  <卡目录> --write        # 顺手把节点表写进卡根生成区
node src/cli.mjs check   <卡目录>                # 协议校验 + 记录内容指纹
node src/cli.mjs lint    <卡目录>                # 用词检查：S 组与行当黑名单的文字命中
node src/cli.mjs lint    <卡目录> --strict       # 同上，有命中就返回 1
node src/cli.mjs build   <卡目录>                # 装配 dist/<名>.json + 文字镜像
node src/cli.mjs build   <卡目录> --png 封面.png # 再嵌入 PNG
node src/cli.mjs inspect <成品.json 或 .png>     # 只读查看成品内容摘要
node src/cli.mjs inspect <A> --compare <B>       # 对比两份成品语义是否一致
node src/cli.mjs unpack  <卡.png 或 .json> --out <新目录>      # 酒馆卡拆成标准卡工程
node src/cli.mjs migrate <旧卡目录> --out <新标准卡目录>   # 旧版节点树转标准卡工程
```

退出码：0 成功 / 1 失败 / 2 用法错。

**migrate 说明**：输入是旧版节点树（根 `index.md`，`world/`、`character/`、`greeting/`、`output/`、`style/` 下任意层的 `<节点>/index.md`）。不改旧目录；输出目录须不存在或为空，且不能在旧目录里。

- 去处：根 `index.md` → `card.md`；`target` 或旧写法 `position` 为 first_mes → `message/0.md`，其余 greeting → `message/<n>.md`（按 order、再按路径排）；description 等单槽字段 → `<字段>.md`；其余 → `world_book/<原路径>.md`，如 `world/设定百科/港口研究所/index.md` → `world_book/world/设定百科/港口研究所.md`。
- 保留：frontmatter 原文逐行保留，只补 id（已有不动），旧写法 `position: first_mes` 等改成 target；`enabled: false`、`scan_depth`、`probability`、`exclude_recursion`、`prevent_recursion` 另抄进 tavern 段，保证装卡生效。工序说明与正文逐字搬运；没有 `<!-- body -->` 时跳过开头的 `<!-- … -->` 注释和「## 工序」列表，第一行非列表内容起为正文，并补上标记。
- 资料：顶层其他文件与目录（调研、决策记录、`note/`、`export/` 等）和节点目录里的 `note/`、非 index 文件，原样复制到 `记录/`；`backups/`、`dist/`、`.card-forge/` 不复制。顶层已有的 `card.md` 不当卡根，复制为 `记录/原card.md`。解析不了的节点进 `待归位/`，去处撞车的进 `候选/`。
- 参照成品：`export/` 下只有一个 JSON 时拿它补缺失的 order、卡名、版本、卡级 extensions 和世界书名，并逐条比正文；成品里没有的条目迁移后设为停用。差异只报告不改。`export/` 下只有一个 PNG 时复制为 `character.png`。
- 迁移完自动跑协议检查，有 error 返回 1。可调用函数：`migrateLegacyProject(srcDir, { out })`（`src/cmd/migrate.mjs`），返回 `{ ok, report, outDir, mapping, gaps, diffs }`。

**lint 说明**：只扫节点正文（不含 note 和卡根），报的是候选，要看上下文再定；含 严禁 / 禁止 / 不要 等禁令词的句子自动跳过。词表来自 `skills/cf-card-review`：S 组规则写在工具里（测试会核对编号与技能一致），行当黑名单运行时直接读 `references/banned-words.md`。S9、S10 和 C 组全部不自动判定。`check` 管格式，`lint` 管用词，两个都过也不等于内容对。

## 验收分层

- **操作验收**：确认文件确实写入、回读内容一致、哈希/同步一致、JSON/PNG 能被工具读取、世界书机制校验通过。它只回答「操作完成了吗」。
- **逻辑验收**：另查规则优先级、阶段是否允许、对象和字段是否归位、事实是否有来源或作者确认、角色说法是否保留归属、纠错是否越界，以及正文是否与已确认内容一致。它回答「这样写对吗」。
- 操作验收通过不能代替逻辑验收；`check`、世界书校验、PNG 往返和 MVU schema 校验都不能单独证明事实或运行时行为正确。上游逻辑关未过时，停止下游润色与出货。

## 节点怎么写

按 docs/spec/node-protocol.md。最小骨架：

```markdown
---
type: character
id: chr-main           # 稳定身份，目录改名不变
keys: [占位关键词]
position: before_char
target: description    # 可选；world 等类型默认进世界书
---

## 工序
（给人和 Agent 看的工序，不导出）

<!-- body -->
（这行标记之后的内容才会进卡）
```

- 没有 `<!-- body -->` → check 报 P1，build 拒绝。工具不猜正文从哪开始。
- `id` 重复 → P4 报错。
- 单槽字段（description/first_mes 等）被多个节点指向 → P6 报错。
- `position` 只接受三种值：`before_char`、`after_char`、`@D<n>`（n 为不小于 0 的整数，按深度插入；分层约定见 cf-card-format-export「导出规则」：世界 @D4 → 机制 @D3 → 角色 @D2 → 文风 @D1 → 输出 @D0）。`@D2` 带不带引号都行。不写默认 `before_char`；写了别的值 → P12 报错，build 拒绝，不退回默认。
- `order` 一般不写：build 按组自动编号（世界 1xx、人物 2xx、文风 3xx、输出 4xx、开场白及其他 5xx），组内按节点树先父后子，连续不重复；一组超过 99 条全卡改四位编号。写了数字就是手动覆盖，重复、跨组、组内不连续 → P20 警告。写成 `300 / 304` 这类非数字 → P13 报错：一个节点只出一个条目。
- 关键词只有一个字（如「色」）→ P14 警告，不阻断：几乎每轮都会误触发，换成词，或写成 `/…/` 正则。
- 导出去处定不下来 → P15 报错，build 拒绝：多角色卡的 character 节点要显式写 `target`（主角 description，其余 character_book）；corpus、output、greeting 也要写明。
- 节点 target 写了 mes_example → P16 警告；写了 post_history_instructions，或卡根写了 creator_notes / tags → P17 警告。本工作流不写这几个酒馆旧字段，旧工程照常 build。
- 进世界书的条目首尾不是配对的顶层标签、包裹里的 YAML 解析不了、没写 `title` → P18 警告。条目标题取 `title`，没写就用目录末级名。
- 标签名与类型对不上（P18a）、缺 name / part（P18b）、标题或 name 重复（P18d）、YAML 第一层没顶格（P18e）→ 警告。对照表见 node-protocol「标签与标题」。
- 三明治是可选的：开头、收尾节点写 `wrap: head` / `wrap: tail`，P19 查常驻、`ignore_budget: true`、position 一致、首尾 order 在组内最小和最大。
- 一个节点只出一个条目。要出多条（例：配角群里每人一条），建父节点加每人一个子节点，不要导出后另跑脚本拆，否则构建记录里的指纹对不上。
- 世界书条目放在 `world_book/` 下，一条一个 `.md`；子目录只用于分组（如 `world_book/character/绫音口癖语料.md`）。旧版 `world/节点名/index.md` 写法不被读取，先用 `migrate` 迁移；直接对旧版目录跑 check / build 会报 P10 error。
- 同一个关键词挂在多个节点 → P22 警告：一喊全响，常用词改更具体的专名。
- `note/`、`state.md` 不导出。

## 断点续接

新会话：先跑 `status <卡目录>`。

- 节点状态以各节点工序段的「状态」行为准（调研中 → 草稿 → 已确认 → 已落盘）。
- 已确认的节点在状态行下写一行 `- 确认方式：作者确认` 或 `- 确认方式：作者委托（……）`，status 表里显示为「已确认（作者委托）」，委托的具体内容留在节点里。
- build 没给 `--png` 时，报告里会提示本次只出了 JSON。
- 「检查过期」= 正文在 check 之后被改过，重跑 check 复查。
- 「未记录」= 没跑过 check，不等于已通过。

## 恢复与备份

- build 覆盖旧成品前，旧文件自动移入 `backups/<时间戳>/`。
- 恢复 = 从 backups 复制回来，先跑 `inspect --compare` 确认差异再覆盖。
- 未经快照的外部编辑器修改不保证能找回；重要节点建议本地 Git。

## 酒馆验收清单（离线通过后）

离线 PASS ≠ 酒馆能用。导入目标 SillyTavern 后核对：

- [ ] JSON / PNG 能导入，卡片出现在角色列表
- [ ] 开场白按预期显示（first_mes / 滑动备选）
- [ ] 世界书条目：常驻条目在提示词里；触发条目用关键词试触发
- [ ] 中日文卡确认全局设置关闭 match whole words
- [ ] 多角色卡确认递归设置符合预期（本工具默认双向关）
- [ ] 实际聊几轮，观察人设与文风

无法实测时，成品标注「实机未验证」，只按离线候选交付。

## 边界（不做的）

- 不解析正文内部结构，不自动改卡内容
- MVU / EJS / 前端 / Live2D：未接入，按需另行立项
- 任意第三方卡的自动无损拆分：未承诺
- 自动提交 / 推送 / 公开发布：不发生