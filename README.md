# card-forge-lab

面向中文 SillyTavern 制卡的工作流与命令行工具。把世界、角色、文风、输出规范和开场白整理成可编辑的节点，再装配为 **Character Card V2 JSON / PNG**。

**目前没有图形界面，也不会只靠一条命令自动生成角色设定。** 内容由作者与 AI 协作完成，工具负责读取节点、检查格式和导出文件。

## 它能做什么

项目分成两部分：

- **技能与工作流（`skills/`）**：供支持技能的 AI 工具按需读取，指导规划、查料、写作、审查与交接。技能文件不是独立运行的程序。
- **命令行工具（`src/`）**：查看节点状态、检查协议、提示用词问题、装配角色卡、读取成品。不生成新设定，不替作者确认内容。

主要工作方式：

```text
作者需求 → 规划与查料 → 节点正文 → 作者确认 → 导出 JSON / PNG → 在酒馆中使用并验收
```

它不是任意角色卡的无损拆包器，也不是在线制卡网站。

## 安装前需要什么

| 工具 | 用途 |
|---|---|
| [Node.js](https://nodejs.org/) | 运行命令行工具；`package.json` 声明最低版本为 18，首次安装建议选当前受支持的 LTS 版本 |
| [Git](https://git-scm.com/) | 下载和更新源码；也可以在 GitHub 使用 **Code → Download ZIP** |
| 文本编辑器，例如 VS Code | 修改 Markdown、YAML 与节点内容 |
| PowerShell 5.1+ | 内嵌世界书校验使用；其他平台的适配情况不作保证 |

下面以 Windows PowerShell 为例。安装 Node.js 或 Git 后，如果终端还找不到命令，请关闭终端并重新打开。

## 安装到自己的电脑

### 方式一：使用 Git

在你希望存放项目的位置打开终端，逐行执行：

```powershell
git clone https://github.com/xoxgladxox-max/card-forge-lab.git
cd card-forge-lab
npm ci
```

`npm ci` 根据仓库中的锁定文件安装依赖。它不是项目测试，也不代表已经能在酒馆中正常运行。

### 方式二：下载 ZIP

1. 在仓库页面点击 **Code → Download ZIP**，然后解压。
2. 用 VS Code 打开包含 `package.json` 的那一层文件夹。
3. 点击 **终端 → 新建终端**，执行 `npm ci`。

后面的命令都在这个项目根目录中执行，不是在 `src/` 里面执行。

## 第一次使用

### 1. 查看帮助和示例状态

```powershell
node src/cli.mjs --help
node src/cli.mjs status examples/meta-template
```

`examples/meta-template/` 是中立模板，正文是占位内容，不是一张写好的角色卡。

### 2. 需要体验导出时，再手动运行

```powershell
node src/cli.mjs check examples/meta-template
node src/cli.mjs build examples/meta-template
```

`check` 会写入检查记录；`build` 会在卡目录下的 `dist/` 生成文件。这两步是使用动作，不是安装必做步骤。

示例的 JSON 输出位置：

```text
examples/meta-template/dist/元提示词模板.json
```

需要查看成品摘要时：

```powershell
node src/cli.mjs inspect examples/meta-template/dist/元提示词模板.json
```

命令执行成功只说明相应工具步骤完成。导入 SillyTavern 后是否符合预期，仍由使用者验收。

### 3. 开始自己的卡

把 `examples/meta-template/` 复制到 `projects/` 下的新目录，再按节点协议修改。例如：

```powershell
New-Item -ItemType Directory -Force projects | Out-Null
Copy-Item -Recurse examples/meta-template projects/my-first-card
```

如果 `projects/my-first-card` 已存在，请换一个未使用的目录名，不要重复执行复制来覆盖旧卡。

从新目录的 `card.md` 开始阅读。标准卡工程的分区是 `card.md`（卡根）、`<字段>.md`（如 `description.md`）、`message/<n>.md`（开场白）、`world_book/**/<条目>.md`（世界书）、`regex/`、`scripts/`。节点写法见 [节点协议](docs/spec/node-protocol.md)，字段与命令细节见 [使用说明](docs/usage.md)。

手里是旧版节点树（根 `index.md`，或 `world/`、`character/`、`greeting/`、`output/`、`style/` 下的 `<节点>/index.md`）时，先迁移：

```powershell
node src/cli.mjs migrate <旧卡目录> --out <新标准卡目录>
```

迁移不改旧目录；输出目录须不存在或为空。旧版目录直接跑 `check` / `build` 会报 P10 并拒绝构建。

`projects/` 默认被 Git 忽略，私人卡不会因为普通的 Git 暂存操作而自动进入这个工具仓库。不要使用强制添加去绕过忽略规则。

## 常用命令

下表中的 `<卡目录>`、`<成品路径>` 是占位符，请换成实际路径；路径含空格时用引号包住。

| 命令 | 作用与写入行为 |
|---|---|
| `node src/cli.mjs status <卡目录>` | 查看进度、缺失与检查记录状态 |
| `node src/cli.mjs status <卡目录> --write` | 将节点摘要写入卡根生成区 |
| `node src/cli.mjs check <卡目录>` | 检查节点协议，并保存检查记录 |
| `node src/cli.mjs lint <卡目录>` | 提示静态用词命中；是否应改仍需结合上下文判断 |
| `node src/cli.mjs build <卡目录>` | 装配 V2 JSON 与文字镜像 |
| `node src/cli.mjs build <卡目录> --png 封面.png` | 同时生成 PNG 卡；请使用有权使用的封面 |
| `node src/cli.mjs inspect <成品路径>` | 只读查看 JSON 或 PNG 卡片摘要 |
| `node src/cli.mjs inspect <成品路径> --compare <另一成品路径>` | 比较两份成品的数据 |
| `node src/cli.mjs unpack <卡.png 或 卡.json> --out <新目录>` | 把酒馆里的卡拆成标准卡工程，不改原卡 |
| `node src/cli.mjs migrate <旧卡目录> --out <新标准卡目录>` | 把旧版节点树转为标准卡工程，不改旧目录 |

退出码：`0` 表示该命令成功，`1` 表示检查或构建失败，`2` 表示用法错误。它们不表示作者确认或酒馆实机验收结果。

## 目录怎么读

| 位置 | 放什么 | 新手何时需要看 |
|---|---|---|
| `README.md` | 项目首页与入门步骤 | 先看这里 |
| `examples/meta-template/` | 可复制的中立节点模板 | 开第一张卡时 |
| `projects/` | 本地私人卡项目，不随仓库分发 | 制卡时 |
| `skills/` | 给 AI 使用的制卡方法与规则 | 配置 AI 工作流时 |
| `src/` | CLI 与库源码 | 修改工具时 |
| `scripts/` | 辅助脚本 | 按相应文档需要使用 |
| `tests/` | 自动化测试源码 | 开发工具时，按需运行 |
| `docs/spec/` | 节点协议 | 编写节点时 |
| `docs/usage.md` | 详细使用说明 | 查命令和导出流程时 |

**下载源码、安装依赖、让 AI 加载技能、创建原生 Agent、在酒馆中运行卡片，是不同的步骤。**

把卡放进 SillyTavern / TauriTavern、两边双向同步、把技能部署到各 AI 工具，由另一个项目 tt-card-bridge 负责，用法见它自己的 README。

## 开发与测试

只有需要进行开发测试时，才手动运行：

```powershell
npm test
```

测试不是安装前提。离线测试、文件回读、作者确认与真实 SillyTavern 运行验收应分别记录，不能互相代替。

## 当前边界

- 构建目标为 Character Card V2。`inspect` 可以读取 V3 PNG / JSON 负载，但不代表能够构建 V3。
- MVU、EJS、前端界面和 Live2D 未接入；不承诺任意第三方卡的无损拆分。
- 节点结构检查不等于内容正确，用词命中不等于一定违规。
- `build` 遇到协议错误会拒绝构建；已有成品的备份位于卡目录的 `backups/`。备份不等于对所有误操作都能恢复。
- `.card-forge/` 保存工具生成的清单与检查记录；正文变化后，已有检查可能过期。
- 技能依赖宿主 AI 工具的加载方式；本仓库存在技能文件不代表当前会话已经启用它们。
- 私人卡、聊天、未授权素材、凭据和本机配置不应上传。

## 许可

暂未选择开源许可证（`UNLICENSED`）：保留所有权利，公开源码不代表授予使用、修改或再分发授权。后续确定许可证后再更新本说明。
