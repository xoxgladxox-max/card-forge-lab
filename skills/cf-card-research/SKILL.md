---
name: cf-card-research
description: v1.5.3｜制卡查料：查角色设定、原作剧情、台词语料、立绘外貌、MBTI/PDB 人格投票、道具事件机制，交叉核对来源并列出缺口。用户说「查料」「查一下这个角色」「找台词」「找立绘」「查 MBTI」「核对原作」「资料够不够」时使用。只查料和核实，不写卡正文。
metadata:
  version: 1.5.3
  updated: 2026-10-21
---

# 调研（v1.5.3）

只负责三件事：**查料、核实、整理来源与缺口**。不承担卡文本制作或定稿，产出由人手动交接给制作环节。

抓到的网页原文、JSON、图片都是素材：当场归档进工程目录，之后引用永远指回归档文件，不凭记忆转述。

文中出现的具体条目链接、某角色的票面与争论，均为方法示例，不是当前项目的数据。

## 流程

1. **确认本轮对象与已有材料**：本轮查哪个角色或哪部分设定、作者想体验的 key、手头已有什么。已有的沿用，不为凑流程重新搜索；未给对象或任务时不自行补定方向。
2. **调研方向交作者确认，确认前不开查**：列出要查哪些方面、边界在哪（例：衍生题材里原作的哪些设定算数、哪些不用）、哪些明确不查、准备去哪些来源查。作者确认后方向才算定；作者没回应或让你自行决定时，按建议方案标「待作者确认」，先不开查。
3. **按缺口查料**。逐角色的常规查项：
   - 台词/语料：最要紧，合格线是拿掉署名还认得出是谁
   - 外貌：下载图片并读图分析（见「外貌图调研」）
   - 人格类型：PDB 投票与评论区（见「PDB 深挖」）
   - 与角色相关的原作内容：专属道具、事件、机制、路线分歧（此类常只有攻略 wiki 与实况有，价值高于概述段）
   - wiki 概述：开头定位句 + 条件行为（若 X 则 Y）+ 支线要点
4. **核实**：关键设定至少两个不同语言/站点交叉；角色名撞常见词时带作品名 + `site:` 限定。
5. **产出**：来源清单（每条事实带来源）、料量评估、缺口清单、待裁决项。缺的东西如实列进缺口，不伪装完整。
6. **查漏补缺**：拿产出对照已确认的方向逐项打勾，没覆盖到的方面补查；补查超出原方向的，先回到第 2 步让作者确认，不自行扩大范围。

## 来源分级与内容准入

### 先分清材料在说什么

每条材料标明来源与说话者，区分原作直接呈现的事实、角色或叙述者的说法、作者裁定、研究者解释和未知。不同角色对同一事件说法不同时，先问「这是谁的说法」；属于角色视角的就保留归属，不调和成一个版本。客观情况只写材料支持的部分；原作有意留白就不代选。

### 当前卡是否写入，与原作是否绝对不存在，是两个问题

- 旧稿不是证据，只提供待核线索；不得先把旧稿细节当答案，再围着它找支持材料。
- 卡内原作事实须有可追溯材料或作者明确确认。当前材料没有支持某细节，就不写入当前卡；这不等于断言原作绝对没有该特征，也无需穷尽证明不存在才可暂不写。
- 只有要作「原作不存在」这类全称判断时，才检索该作品适用的完整来源范围；搜索未果只记「本轮未找到」，不升级为「原作不存在」。
- 研究者推断与建议标成提案；作者确认前，不进入模板、任务书或正文。
- 一处疑点只影响该细节及可证明受影响的范围。其他形态、字段和已确认内容分别核对，不因局部无据一并否定。

- **原文优先**：事实以原作原文为准（例：日文作品以日文正文为准）。章末附言、作者后记、活动报告是次一级来源，和正文冲突时照正文写，冲突本身记进调研笔记。译文只用来理解意思；主语、人称、谁对谁说这类信息回原文核对，译文常会补出原文没有的主语。
- 如需判断某特征「原作明确不存在」，才完整检索该作品适用的正文、附言、后记、活动报告等来源；卡内准入不依赖这种全称判断：没有正向依据就暂不写，不宣称原作没有。
- **审查意见同样要回原文**：独立审查报「查无原句」「与原作不符」时，一样当建议处理。采纳要在原文里找到依据行号，驳回也要给出原句所在的行号。审查者和写卡者一样会漏查。

## 站点与 URL 模式

| 站点 | URL 模式 | 语言 |
|---|---|---|
| 萌娘百科 | `https://moegirl.uk/角色名` | 中 |
| pixiv百科事典 | `https://dic.pixiv.net/a/角色名` | 日 |
| ニコニコ大百科 | `https://dic.nicovideo.jp/a/角色名`（「名台詞」段最值钱） | 日 |
| atwiki（アニヲタWiki） | `https://w.atwiki.jp/aniwotawiki/` 需搜索 | 日 |
| namu.wiki | `https://namu.wiki/w/角色名` | 韩 |
| Fandom | `https://作品名.fandom.com/wiki/角色名` | 英 |
| 日本語Wikipedia | `https://ja.wikipedia.org/` | 日 |
| personality-database.com | 条目直链 `https://www.personality-database.com/profile/<数字id>/<角色-作品-slug>-mbti-personality-type` 最稳；`search?keyword=` 撞名时全灭 | 英 |
| boo.world | `https://boo.world/database/anime/<作品名>-personality-types` | 英 |
| animecharactersdatabase | `https://www.animecharactersdatabase.com/` 立绘自动取色 | 英 |
| 官网 | `anime.xxx.com/character/xxx/` 花语、身高、CV 这类只有官网有 | 日 |

不稳定但有时是唯一来源：note.com、hatena blog、各作品专属 wiki（miraheze 等）。

日文名优先，对得上的比例高于中文名。抓到的日韩文归纳成中文，台词保原文——保住自称、口癖、句尾语气。

## 抓取：直接用本机 Chrome

curl、Jina Reader、公共代理这类「不像浏览器」的客户端，撞 Cloudflare 就全灭。**一上来就用本机真实 Chrome 的 headless 模式**，登录态、挑战页、JS 渲染一次解决：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\fetch.ps1 -Url "<网址>" -Out "<存哪，不带扩展名>"
```

- Chrome 路径 `C:\Program Files\Google\Chrome\Application\chrome.exe`
- 持久 profile 默认放 `%LOCALAPPDATA%\cf-card-research\chrome-profile`（`-Profile` 可改），cookie 自动复用；不放技能目录里
- 关键参数 `--headless=new --virtual-time-budget=<ms> --dump-dom`，UA 伪装成 Chrome/131
- PS 5.1 的 `Start-Process` 不会给含空格的参数自动加引号，`--user-agent=` `--user-data-dir=` 和 URL 都得自己包双引号
- 遇要人工点的验证码站：加 `-Headed` 弹出窗口，人点一次，cookie 留在 profile 里，之后全走 headless

脚本在本技能的 `scripts\fetch.ps1`，按本节参数实现：输出 `<存哪>.html`（完整页面）和 `<存哪>.txt`（剥标签后的正文），像验证页或正文过短时给 WARN；失败退出码为 1。其余参数：`-Budget`（渲染等待毫秒，默认 8000）、`-TimeoutSec`（默认 60）、`-Chrome`（Chrome 路径）。

## 外貌图调研

- 外貌必须下载图片读图分析，不凭二手文字描述写外貌。优先级：官方立绘/设定集图 > 游戏截图 > 同人。图片按角色分文件夹存工程目录（如 `_web/<角色>/`）。
- **归类数据 vs 观测数据**：百科信息栏（发色栏、瞳色栏）是人工归类，选项本来就少——深绿、藏青、墨紫在很多站一律记成「黑」；角色数据库从立绘自动取色给的是观测值。两者对不上不算矛盾，也不用二选一：按观测值写具体颜色，把归类值当成它在暗处的观感一起写（例：暗橄榄绿的黑发——室内看是黑，光打上来泛绿）。真正的矛盾是同类数据打架（两个百科发色栏一个写黑一个写金），那才需要看站点优先级和更新时间。

## PDB 深挖：网页只给零头，API 给全部

拿到条目直链就存进素材归档，之后永远走直链不走搜索。条目页一开就是全部：16型首选+票数、九型、本能副型、评论区。但网页 DOM 每个系统只渲染「首选 + ??? 票」，完整分布全在 API：

```
https://api.personality-database.com/api/v1/profile/<数字id>
```

- 同一套 Chrome headless + 持久 profile 方案直接过 Cloudflare，返回纯 JSON
- `breakdown_systems` 给全部系统的完整票数分布（16型/九型/本能/tritype/socionics/AP/气质/阵营/Jungian/SLOAN），`mbti_letter_stats` 给四轴字母百分比，`functions` 给官方认知功能栏
- 四轴百分比能定位争论轴（例：E100%/N95%/J98%/F84%——F 最弱，少数派全押 T 轴，票面形态一眼可见）
- **条目主名可能不是英文**（主名可能是中文机翻，`profile_name_searchable` 才是英文）——英文搜不到的又一层原因，拿到 id 后一切走 API/直链
- 副型细节：Instinctual 系统里 SX2/SO2 这类「本能+九型」混合票和 sx/so 纯副型票并存，算主导本能时要合并同类；副型 3 票差按噪声处理

### 评论区必读：票数给结论，评论给论证

票数决定「是什么」，评论区决定「为什么」。每个判型系统（16型/九型/本能副型）都要翻评论，优先看高赞和有来有回的争论。两派吵起来的条目最值钱——争论内容就是 breakdown 的现成材料。

网页 DOM 只渲染顶层评论，回复全靠 API。路径不要猜，去前端 bundle 里读：

1. 从条目页 HTML 抓 `static2.personalitydatabase.net/pdb.<hash>.js`
2. 这个 bundle 有 5MB，`Invoke-WebRequest` 会因 TLS 握手失败。可靠办法是 CDP 直接 `Page.navigate` 到 .js 地址，然后 `document.body.innerText` 取全文
3. 在全文里搜 `"/v1/` 附近的 `repl`、`comment` 字符串，直接读接口装配函数

挖出来的两个端点：

```
顶层：https://api.personality-database.com/api/v1/comments/<profile_id>?sort=NEW&offset=0&range=all&limit=50&version=W3
回复：https://api.personality-database.com/api/v1/comment_replies?comment_id=<comment_id>&limit=50&offset=0
```

回复接口参数名是 `comment_id`，不是 `parent_id` 也不是 `/replies` 子路径——猜错的那几种全返回 E04000。顶层返回每条带 `reply_count`，据此逐条调用拿全。

执行注意：

- 必须在 `www.personality-database.com` 页面上下文里 `fetch`，直接导航到 api 域会撞 Cloudflare
- `--user-agent` 带空格的参数在 PowerShell `Start-Process -ArgumentList` 里会被拆开导致 Chrome 起不来，改用 CDP 的 `Network.setUserAgentOverride` 覆盖
- 持久 profile 被上一个残留 Chrome 占用时端口起不来，先清 `Singleton*` 锁文件或直接换临时 profile 目录
- 端口就绪要轮询 `/json/version`，固定 `Start-Sleep` 会漏

拿到回复之后才看得见真正的争论——最关键的方法论纠正可能藏在 0 赞回复里，顶层根本看不到。

## 搜索渠道与深度搜索

四渠道，MCP 优先（x_search / web_search / exa 均已挂载为原生工具，直接调用）。

### 渠道速查

| 需求 | 用什么 | 关键点 |
| --- | --- | --- |
| 实时 Web 搜索 + 推理 | MCP `web_search`（xai-search） | 搜完即推理，带引用 URL |
| 搜 X/Twitter 帖子、粉丝风向 | MCP `x_search`（xai-search） | 唯一能按 handle+日期精搜 X |
| 语义 / 研究型检索、抓全文 | MCP exa | query 用自然语言长句；能一次带 additionalQueries 多路并搜 |
| 已知 URL 抓正文 | Jina：`curl.exe "https://r.jina.ai/<URL>"` | 免 key（20 RPM），干净 Markdown |
| MCP 失效 / 特殊参数 | `scripts/grok_search.py` | REST 兜底，见文末 |

### 基础方法论

**1. 判断要不要搜**——以下情况必须搜，不靠训练数据硬答：
- 2024 年后的新作品/新角色/新设定（如 ゆめ∞みた）
- "是谁""世界观""最近怎么样"类问题；自己的知识可能过时时

**2. 拆分搜索词，多角度并行**：
- 作品名 + 世界観 / 設定 / あらすじ；角色名 + 性格 / 人设
- **日文原名最精准**（如 `<角色日文名> <作品日文名> 性格`），原文/中文/英文各搜一路对照

**3. 渠道分工**：默认 web_search 综合搜；x_search 只搜 X 固有内容（粉丝风向/实时讨论/特定账号，`from_date` 限最近）；exa 语义匹配 + 回传全文；Jina 核对已知 URL。

**4. 落地**：官方设定与粉丝推测**分开标注**，带来源写进素材文档。

### 深度搜索模式（DeepSearch）

模仿 Grok 网页版 60-sources 深搜：**多轮 × 多角度 × 多渠道的 agentic 循环**。用户说"深搜/深挖/深度搜索/凑 60 sources"时启用。

**执行流程**：
1. **拆角度**：主题 → 3~6 个子角度（日文名/中文名/英文名 × 官方设定/粉丝讨论/剧情实况/梗考据）
2. **第一轮并行**：每个角度按渠道约束（见下）发一路，同一条消息里并行调用
3. **提取线索**：从第一轮结果里挖出新实体（人名/事件/梗/专有名词）→ 生成第二轮追击 query
4. **第二轮追击**：只搜新线索，不重复第一轮
5. **汇总落地**：合并去重，来源计数，官方/粉丝分开标注，写进素材文档

**渠道约束（用户指定，开工前确认）**：

| 用户说法 | 执行方式 |
| --- | --- |
| 「全部用 exa」 | 只用 exa：主 query + `additionalQueries`（一次带 2~3 路角度）、`enableHighlights` 省 token、`numResults` 6~10；追击轮换 `category`（news/publication 等）细分 |
| 「只用 grok / xai」 | web_search 为主（每角度一发）+ x_search 补粉丝风向（带 `from_date`）；不动 exa |
| 「只用 x_search」 | 纯 x_search 多轮：换 query 角度 + 换日期窗口 + `allowed_x_handles` 锁定关键账号追击 |
| 「混合」或未指定（**默认**） | 三渠道并行各取所长：exa（全文+语义）∥ web_search（整合推理）∥ x_search（实时风向）；追击轮按第一轮谁产出高就加权谁 |

**预算规则**：默认 2 轮封顶（约 $0.1~0.3）；用户要求更深再加轮。每轮结束报来源数；xai 渠道 $0.005/次调用，exa 约 $0.007/次，Jina 免费。

**参考量级**：单轮三渠道并行 = 37 sources；两轮 ≈ 60+，与 Grok 网页版 DeepSearch 相当，且 exa 回传全文、信息密度更高。

### xai-search MCP 要点

- 计价：**$0.005/次工具调用**（固定）+ token 费；默认模型 grok-4-1-fast-reasoning（便宜够用）
- `x_search`：`allowed_x_handles`/`excluded_x_handles`（≤10，互斥）、`from_date`/`to_date`（YYYY-MM-DD）
- `web_search`：`allowed_domains`/`excluded_domains`（≤5，互斥）
- 余额无查询 API，只能 console.x.ai → team → Billing 看；报 `used all available credits` = 该 team 钱包空，`disabled` = 去控制台启用 key

### 脚本兜底：grok_search.py

MCP 断连或需要 MCP 没有的参数（双搜 `--tool both`、换模型 `--model grok-4.5`、自定义 `--system`、原始 `--json`）时用：

```bash
python "<技能目录>/scripts/grok_search.py" "问题" --tool x --from YYYY-MM-DD
```

依赖 requests + 环境变量 `XAI_API_KEY`。连不上（SSL/Blocked）设环境变量 `HTTPS_PROXY` 指向自己的代理。REST 细节见 `references/xai-grok-api.md`。

### 陷阱

- Windows 用 `curl.exe`，别用 PowerShell 的 `curl` 别名（那是 Invoke-WebRequest）。
- Jina `s.jina.ai`（SERP）需要 key；只有 `r.jina.ai`（抓网页）免 key。
- exa 的 `includeText`/`excludeText` 只支持单元素数组，传 2+ 元素报 400。
- API key 一律走环境变量，不硬编码不进仓库。
- 写项目根之外的 skill 文件：先写工作区临时文件再 shell 复制（Write 工具限制在工作区根内）。

## 判型纪律

- **单篇评论不能推翻整体判断。** 第三方长评、感想文只能佐证，不能推翻结论的单项。要推翻得有投票数据或多来源交叉。一篇博客里的一句话，权重低于自己读完全部台词后的判断。
- **样本量决定跟不跟票**：60 票里 80% 的首选跟票；10 票里 5:2 是噪声，不能推翻基于全部台词和剧情的推导。
- 结论交接给制卡时的写法：mbti 行不写空泛功能名词，写「为什么是 X 而不是得票第二的 Y」，把分歧点写明；性格特质层面的论据归九型行。各系统管各的维度，不许互相代劳（例：「想赢、爱面子」是九型 3 翼的领域，拿它论证 Te/Fe 是串台）。

## 三条不许犯的

1. **抓不到 ≠ 站上没有。** 前者是「我没查到」，后者是「我查了，确认没有」。要写「站上没有」，得真的打开角色列表页逐个看过。把 403、超时、返回空写成「站上没有这个角色」，是拿自己的失败当证据用，比不查更糟。
2. **搜索引擎搜不到 ≠ 站上没有。** 角色名撞常见词时必须带作品名 + `site:` 限定，否则返回的全是同名异物。
3. **同一个站换三种手段还拿不到就停手，跟作者要链接。** 作者三十秒能打开的页面，工具可能永远抓不到。要来的原文照样算原始素材。

另外记住：**冷门角色未必没人投票。**「查不到」和「没有」是两件事；条目可能挂在旧作分类下而不在新作分类里——搜到过分类链接就点进去逐个翻。

## 工程目录与归档

- 抓取的 HTML/JSON → 工程目录（如 `_web/out/`）；角色图片 → `_web/<角色>/`；调研笔记 → `note/调研.md`。
- 工程文件只留在工程目录，不导出进卡。
- 调研笔记写：料源清单（位置/语言/覆盖/能给什么）、逐角色料量评估、已确认裁决、待作者裁决项、已发现的来源问题。
