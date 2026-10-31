---
name: cf-card-research
description: v1.7.0｜制卡查料：查角色设定、原作剧情、台词语料、立绘外貌、MBTI/PDB 人格投票、道具事件机制，交叉核对来源并列出缺口。用户说「查料」「查一下这个角色」「找台词」「找立绘」「查 MBTI」「核对原作」「资料够不够」时使用。只查料和核实，不写卡正文。
metadata:
  version: 1.7.0
  updated: 2026-10-21
---

# 调研（v1.7.0）

范围：查料、核实、整理来源与缺口。不写卡正文，不做收尾；产出由人交接给制作环节。

总规则：

- 抓到的网页原文、JSON、图片当场归档进工程目录；之后引用指回归档文件，不凭记忆转述。
- 每条事实带来源和说话者。没有来源的不写成事实；旧稿只当线索，不当证据。
- 「本轮没找到」不写成「原作没有」「站上没有」。
- 研究者推断和建议标成提案；作者确认前不进模板、任务书或正文。
- 文中具体链接、某角色的票面与争论都是方法示例，不是当前项目的数据。

# 流程

1. 确认本轮对象与已有材料：查哪个角色或哪部分设定、作者想体验的 key、手头已有什么。已有的沿用，不为凑流程重搜；没给对象或任务时不自定方向。
2. 调研方向交作者确认，确认前不开查：列出查哪些方面、边界（例：衍生题材里原作哪些设定算数）、明确不查的、准备查的来源。作者没回应或让自行决定时，按建议方案标「待作者确认」，仍不开查。
3. 按缺口查。逐角色常规查项：
   - 台词、语料：最要紧；合格线是拿掉署名还认得出是谁。
   - 外貌：下载图片读图（见「外貌图」）。
   - 人格类型：PDB 投票与评论区（见「PDB」）。
   - 与角色相关的原作内容：专属道具、事件、机制、路线分歧。这类常只有攻略 wiki 和实况有，价值高于概述段。
   - wiki 概述：开头定位句 + 条件行为（若 X 则 Y）+ 支线要点。
4. 核实：关键设定至少两个不同语言或站点交叉；角色名撞常见词时带作品名 + `site:` 限定。
5. 产出：来源清单（每条事实带来源）、料量评估、缺口清单、待定项。缺的如实列进缺口。
6. 查漏：对照已确认方向逐项打勾，没覆盖的补查；补查超出原方向的回到第 2 步。

# 来源与准入

先分清材料在说什么：原作直接呈现的事实、角色或叙述者的说法、作者裁定、研究者解释、未知。

- 不同角色对同一事件说法不同时，保留归属，不调和成一个版本。客观情况只写材料支持的部分；原作有意留白不代选。
- 卡内原作事实须有可追溯材料或作者明确确认。没有支持就不写进当前卡；这不等于断言原作没有，也无需穷尽证明不存在。
- 只有要作「原作不存在」这类全称判断时，才检索该作品适用的完整来源（正文、附言、后记、活动报告）。
- 一处疑点只影响该细节及可证明受影响的范围，不因局部无据否定其他字段和已确认内容。
- 原文优先：事实以原作原文为准（例：日文作品以日文正文为准）。章末附言、后记、活动报告次一级，与正文冲突时照正文写，冲突记进调研笔记。译文只用来理解意思；主语、人称、谁对谁说回原文核对，译文常补出原文没有的主语。
- 审查意见也回原文：独立审查报「查无原句」「与原作不符」当建议处理。采纳要在原文找到依据行号，驳回也给出原句行号。

# 站点

| 站点 | URL 模式 | 语言 |
|---|---|---|
| 萌娘百科 | `https://moegirl.uk/角色名` | 中 |
| pixiv百科事典 | `https://dic.pixiv.net/a/角色名` | 日 |
| ニコニコ大百科 | `https://dic.nicovideo.jp/a/角色名`（「名台詞」段最有用） | 日 |
| atwiki（アニヲタWiki） | `https://w.atwiki.jp/aniwotawiki/` 需搜索 | 日 |
| namu.wiki | `https://namu.wiki/w/角色名` | 韩 |
| Fandom | `https://作品名.fandom.com/wiki/角色名` | 英 |
| 日本語Wikipedia | `https://ja.wikipedia.org/` | 日 |
| personality-database.com | 条目直链 `https://www.personality-database.com/profile/<数字id>/<角色-作品-slug>-mbti-personality-type` 最稳；`search?keyword=` 撞名时全灭 | 英 |
| boo.world | `https://boo.world/database/anime/<作品名>-personality-types` | 英 |
| animecharactersdatabase | `https://www.animecharactersdatabase.com/`，立绘自动取色 | 英 |
| 官网 | `anime.xxx.com/character/xxx/`；花语、身高、CV 这类只有官网有 | 日 |

- 不稳定但有时是唯一来源：note.com、hatena blog、各作品专属 wiki（miraheze 等）。
- 日文名优先，命中率高于中文名。
- 日韩文资料归纳成中文；台词保原文，保住自称、口癖、句尾语气。

# 抓取：本机 Chrome

curl、Jina Reader、公共代理撞 Cloudflare 就失败。一上来就用本机 Chrome headless，登录态、挑战页、JS 渲染一次解决：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\fetch.ps1 -Url "<网址>" -Out "<存哪，不带扩展名>"
```

- 输出 `<存哪>.html`（完整页面）和 `<存哪>.txt`（剥标签正文）；像验证页或正文过短时给 WARN；失败退出码 1。
- 参数：`-Budget`（渲染等待毫秒，默认 8000）、`-TimeoutSec`（默认 60）、`-Chrome`（默认 `C:\Program Files\Google\Chrome\Application\chrome.exe`）、`-Profile`（默认 `%LOCALAPPDATA%\cf-card-research\chrome-profile`，cookie 复用；不放技能目录）。
- 关键 Chrome 参数：`--headless=new --virtual-time-budget=<ms> --dump-dom`，UA 伪装成 Chrome/131。
- PS 5.1 的 `Start-Process` 不给含空格的参数加引号：`--user-agent=`、`--user-data-dir=` 和 URL 自己包双引号。
- 要人工点验证码的站：加 `-Headed` 弹窗，人点一次，cookie 留在 profile，之后走 headless。

# 外貌图

- 外貌必须下载图片读图，不凭二手文字写。优先级：官方立绘或设定集 > 游戏截图 > 同人。图片按角色分文件夹存（如 `_web/<角色>/`）。
- 百科信息栏（发色、瞳色）是人工归类，选项少（深绿、藏青、墨紫常一律记「黑」）；角色数据库从立绘自动取色是观测值。两者对不上不算矛盾：按观测值写具体颜色，归类值当作暗处观感一起写（例：暗橄榄绿的黑发，室内看是黑，光打上来泛绿）。
- 同类数据打架（两个百科发色栏一个黑一个金）才是矛盾，看站点优先级和更新时间。

# PDB

拿到条目直链就存进归档，之后走直链不走搜索。网页 DOM 每个系统只渲染「首选 + ??? 票」；完整分布在 API：

```
https://api.personality-database.com/api/v1/profile/<数字id>
```

- 同一套 Chrome headless + 持久 profile 能过 Cloudflare，返回纯 JSON。
- `breakdown_systems`：全部系统完整票数（16型 / 九型 / 本能 / tritype / socionics / AP / 气质 / 阵营 / Jungian / SLOAN）；`mbti_letter_stats`：四轴字母百分比；`functions`：官方认知功能栏。
- 四轴百分比定位争论轴（例：E100% / N95% / J98% / F84%，F 最弱，少数派押 T）。
- 条目主名可能是中文机翻，`profile_name_searchable` 才是英文；英文搜不到时拿 id 走 API。
- Instinctual 系统里 SX2 / SO2 这类「本能+九型」混合票和 sx / so 纯副型票并存，算主导本能时合并同类；副型 3 票差按噪声处理。

## 评论区

票数决定是什么，评论决定为什么。每个判型系统（16型 / 九型 / 本能副型）都翻评论，优先看高赞和有来有回的争论；争论内容就是 breakdown 的现成材料。最关键的方法纠正可能藏在 0 赞回复里。

网页只渲染顶层评论，回复靠 API。路径不猜，去前端 bundle 里读：

1. 从条目页 HTML 抓 `static2.personalitydatabase.net/pdb.<hash>.js`。
2. bundle 约 5MB，`Invoke-WebRequest` 会 TLS 握手失败；用 CDP `Page.navigate` 到 .js 地址，再取 `document.body.innerText`。
3. 在全文搜 `"/v1/` 附近的 `repl`、`comment`，读接口装配函数。

```
顶层：https://api.personality-database.com/api/v1/comments/<profile_id>?sort=NEW&offset=0&range=all&limit=50&version=W3
回复：https://api.personality-database.com/api/v1/comment_replies?comment_id=<comment_id>&limit=50&offset=0
```

- 回复参数名是 `comment_id`；`parent_id` 或 `/replies` 子路径都返回 E04000。顶层每条带 `reply_count`，据此逐条拿全。
- 必须在 `www.personality-database.com` 页面上下文里 `fetch`；直接导航到 api 域会撞 Cloudflare。
- `Start-Process -ArgumentList` 会拆开带空格的 `--user-agent` 导致 Chrome 起不来；改用 CDP `Network.setUserAgentOverride`。
- 持久 profile 被残留 Chrome 占用时端口起不来：清 `Singleton*` 锁文件，或换临时 profile。
- 端口就绪轮询 `/json/version`，不用固定 `Start-Sleep`。

## 判型

- 单篇评论、长评、感想文只能佐证，不能推翻结论单项；推翻要有投票数据或多来源交叉。一篇博客里的一句话，权重低于读完全部台词后的判断。
- 样本量决定跟不跟票：60 票里 80% 的首选跟票；10 票里 5:2 是噪声，不能推翻基于全部台词和剧情的推导。
- 交接写法：mbti 行写「为什么是 X 而不是得票第二的 Y」，写明分歧点，不写空泛功能名词；性格特质的论据归九型行。各系统只管自己的维度（例：「想赢、爱面子」属九型 3 翼，拿它论证 Te/Fe 是串台）。

# 搜索渠道

MCP 优先（x_search / web_search / exa 已挂载为原生工具时直接调用）。

| 需求 | 用什么 | 关键点 |
|---|---|---|
| 实时 Web 搜索 + 推理 | MCP `web_search`（xai-search） | 搜完即推理，带引用 URL |
| X/Twitter 帖子、粉丝风向 | MCP `x_search`（xai-search） | 唯一能按 handle + 日期精搜 X |
| 语义、研究型检索、抓全文 | MCP exa | query 用自然语言长句；`additionalQueries` 一次多路 |
| 已知 URL 抓正文 | Jina：`curl.exe "https://r.jina.ai/<URL>"` | 免 key（20 RPM），干净 Markdown |
| MCP 失效或需特殊参数 | `scripts/grok_search.py` | REST 兜底 |

- 必须搜、不靠训练数据硬答：2024 年后的新作品、新角色、新设定（例：ゆめ∞みた）；「是谁」「世界观」「最近怎么样」类问题；自己的知识可能过时时。
- 拆搜索词多角度并行：作品名 + 世界観 / 設定 / あらすじ；角色名 + 性格 / 人设。日文原名最准（如 `<角色日文名> <作品日文名> 性格`），原文、中文、英文各一路对照。
- 分工：默认 web_search 综合搜；x_search 只搜 X 固有内容（粉丝风向、实时讨论、特定账号，`from_date` 限最近）；exa 语义匹配 + 回传全文；Jina 核对已知 URL。
- 官方设定与粉丝推测分开标注，带来源写进素材文档。

## 深度搜索

用户说「深搜」「深挖」「深度搜索」「凑 60 sources」时启用：

1. 拆角度：主题 → 3~6 个子角度（日文名 / 中文名 / 英文名 × 官方设定 / 粉丝讨论 / 剧情实况 / 梗考据）。
2. 第一轮：每个角度按渠道约束发一路，同一条消息并行调用。
3. 提取线索：从结果挖新实体（人名、事件、梗、专有名词），生成第二轮 query。
4. 第二轮：只搜新线索，不重复第一轮。
5. 汇总：合并去重，计来源数，官方 / 粉丝分开标注，写进素材文档。

渠道约束（开工前按用户说法确认）：

| 用户说法 | 执行 |
|---|---|
| 「全部用 exa」 | 只用 exa：主 query + `additionalQueries`（一次 2~3 路）、`enableHighlights` 省 token、`numResults` 6~10；追击轮换 `category`（news / publication 等） |
| 「只用 grok / xai」 | web_search 为主（每角度一发）+ x_search 补粉丝风向（带 `from_date`）；不动 exa |
| 「只用 x_search」 | 多轮 x_search：换 query 角度、换日期窗口、`allowed_x_handles` 锁关键账号 |
| 「混合」或未指定（默认） | exa（全文+语义）∥ web_search（整合推理）∥ x_search（实时风向）并行；追击轮给第一轮产出高的渠道加权 |

- 预算：默认 2 轮封顶（约 $0.1~0.3）；用户要更深再加轮。每轮结束报来源数。
- 计价：xai $0.005/次调用，exa 约 $0.007/次，Jina 免费。
- 量级参考：单轮三渠道并行约 37 sources；两轮约 60+。

## xai-search

- 计价 $0.005/次工具调用 + token 费；默认模型 grok-4-1-fast-reasoning。
- `x_search`：`allowed_x_handles` / `excluded_x_handles`（≤10，互斥）、`from_date` / `to_date`（YYYY-MM-DD）。
- `web_search`：`allowed_domains` / `excluded_domains`（≤5，互斥）。
- 余额没有查询 API，只能在 console.x.ai → team → Billing 看。报 `used all available credits` = 该 team 钱包空；报 `disabled` = 去控制台启用 key。

MCP 断连或需要 MCP 没有的参数（`--tool both`、`--model grok-4.5`、自定义 `--system`、原始 `--json`）时：

```bash
python "<技能目录>/scripts/grok_search.py" "问题" --tool x --from YYYY-MM-DD
```

依赖 requests 和环境变量 `XAI_API_KEY`。连不上（SSL / Blocked）时设 `HTTPS_PROXY` 指向自己的代理。REST 细节见 `references/xai-grok-api.md`。

## 陷阱

- Windows 用 `curl.exe`，不用 PowerShell 的 `curl` 别名（那是 Invoke-WebRequest）。
- Jina `s.jina.ai`（SERP）要 key；只有 `r.jina.ai` 免 key。
- exa 的 `includeText` / `excludeText` 只支持单元素数组，2+ 元素报 400。
- API key 一律走环境变量，不硬编码、不进仓库。
- 写项目根之外的技能文件：先写工作区临时文件，再 shell 复制（Write 工具限制在工作区根内）。

# 三条不许犯的

1. 抓不到 ≠ 站上没有。写「站上没有」要真的打开角色列表页逐个看过；把 403、超时、返回空写成「站上没有」比不查更糟。
2. 搜索引擎搜不到 ≠ 站上没有。角色名撞常见词时带作品名 + `site:` 限定。
3. 同一个站换三种手段还拿不到就停手，跟作者要链接。要来的原文照样算原始素材。

冷门角色未必没人投票：条目可能挂在旧作分类下；搜到过分类链接就点进去逐个翻。

# 归档（按世界观、规则、单角色分包）

- 抓取的 HTML / JSON → `_web/out/`；角色图片 → `_web/<角色>/`。
- 调研笔记按后续写卡阶段拆成独立文件放进 `记录/调研/`（写哪一部分就只读哪一份，节省上下文）：
  - `记录/调研/00-索引.md`：文件清单、一句话摘要、缺口清单、待定项。
  - `记录/调研/world-世界基底.md`：时代、地理、历史、物种、社会常态素材。
  - `记录/调研/rules-核心机制.md`：系统、法则、习俗、道具、事件机制素材。
  - `记录/调研/char-<角色名>.md`：每个角色各自一份，放该角色的外貌、性格、经历、关系、台词语料与判型。
- 工程文件只留在工程目录，不导出进卡。
