# 模板（高阶去路径化 · 三通道校准版）

**本模板是示例。** 动笔前先按这个角色提出结构提案：用哪些块、去掉哪些、新增哪些（如角色独有机制的 `about_xxx`）、各块写到多深，作者确认后再写。下面的字段、档位和顺序只是起点。

字段右边标 `[mini]` 的三档都写，`[std]` 从 standard 起写，`[full]` 只有 full 写。同一张卡里，同一件事各档用同一个字段名，不在低档另起一个名字。

默认内容：根节点 `character`、`personality` 三层、XML 包裹。其余字段跟着角色调——只有中文名就只写 `chinese`；角色独有的机制自建 `about_xxx` 块同级插入。
**块的删除只由作者执行**（四状态约定，见下）：无 R18 需求时 `sexual_information` 与 `dlc_intimacy` 是否整块删、没有隐藏面时 `hidden_traits` 是否删、没有能力／冲突戏时 `abilities` 是否删，都由作者定；Agent 不自行删块，缺料时保留骨架并标状态。

## 使用边界

- **模板不是填空题。** 只提醒有哪些方向可考虑；作者只想给范围就停在上位概念，说不清细节可写参照锚点（`傲娇：像某作品某知名角色那样`），不替作者补细节。
- 这是字段形状和三档起始骨架，不是事实清单、证据清单或补全许可。进入模板前先过上游规划与素材准入；缺料时按四状态标【缺口】并回到查料，不用模板把内容填得像完整答案。
- 每个字段只按自己的职责检查：`traits` 写稳定性格及有据表现；外貌写可观察形态；关系写对象特定的互动；语料写可核对的原句和口调；`roleplay_tips` 写扮演指令；亲密模块写自己的条件与素材。不要把一个字段的禁令推广成全卡规则。
- `[mini]`、`[std]`、`[full]` 只决定骨架起始范围，不决定资料真假，也不因档位强行增加设定。每个字段只有四种状态：**有料**（正常写）／**原作没有答案**（写明此句）／**缺口**（标【缺口】并列入查料清单）／**作者已删**（只有作者能删字段或块）。Agent 不把旧稿或推断当事实，也不自行删字段；缺料时保留骨架并标【缺口】，不留空值，不写「未知」。
- **专属机制块（`about_xxx`）与常规块的四方职责切分**：当角色经确认包含自建 `about_xxx`（角色专属机制模块）时，必须严格切分四处容器的主归属，禁止同一段内容在多处换句复述：
  1. `overview`：只写 3–5 条高层身份坐标与核心反差概括，不展开事件经过与底层心理推演；
  2. `persona.key_facts`：只按时间顺序列客观发生的事件（何时、何地、发生了什么），不夹带心理剖析与机制解释；
  3. `about_xxx`（角色专属机制模块）：全卡唯一负责将该角色独有的特殊机制（如特殊体质、契约诅咒、独特的恋爱/防卫心理回路等）按「前因 → 运作条件 → 行为方向 → 转换/解除边界」集中讲透的容器；子键名使用平实、清楚的自然语言或通用概念，不拼造生硬口号；
  4. `acquired`：只保留独立于 `about_xxx` 之外的后天习得能力或习惯，不把已在 `about_xxx` 写透的核心机制换个名字在 `acquired` 重复建条。
  精修去重时，只清理其他块中越界复述的句子，严禁擅自删除已确认的 `about_xxx` 块。
- **阶段变化、分阶段语料与阶段事件一律拆成独立世界书条目，不塞进角色卡本体**：角色卡本体（`character`）只写角色在开局或常态下的基准面貌。凡涉及随数值、关系或剧情递进的阶段变化（各阶段的内在心理、外在表现、语言与态度转变、对特定对象的做法变化、本阶段绝不越界的底线）、分阶段语料、数值升降规则及阶段触发事件，全部拆为独立的世界书条目（按阶段锚点触发的条件绿灯），禁止整块塞在角色卡本体内常驻发送，防止模型在初期就读到中后期阶段设定而提前剧透或串台。

---

## YAML 骨架

```yaml
# ==============================================================================
# 角色卡骨架模板（高阶去路径化 · 三通道校准版）
# ==============================================================================

character:
  # -- 1 基础身份 --
  # identity 一句话不可省，只放客观身份与社会定位，禁止写性格词，外貌不写这里。
  name:                     # [mini] 按角色实际写，不强制三语
    english:
    chinese:
    japanese:
    alias:                  # 别名/代号，无则留空或删

  basic_settings:           # [mini] identity 一句话不可省
    gender:
    age:
    height:
    weight:                 # 有资料才写
    identity:               # 客观身份定义

  overview:                 # [std] 角色概括，3-5 条客观事实与核心矛盾，禁止文学抒情
    -

  # -- 2 人格核心层 --
  # personality 分三层：core_stack 索引 -> 类型学与 cognitive_functions 机制分析 -> traits 具象化。
  # 前两层是抽象的，traits 是把它们具体写出来的部分。
  # 类型学字段只写机制（认知路径、评判标准、情绪阈值、防御方式），不写剧情、道具、原句。
  personality:
    # [core_stack] 一行九项，顺序固定：
    # MBTI - 九型主翼 - 本能副型 - Tritype - 气质 - 态度心理学 - 大五 - Socionics - 阵营
    core_stack: ""          # [mini]

    # [mbti] MBTI 类型及其认知路径，不只写四个字母。
    mbti:                   # [std]

    # [cognitive_functions] 按 MBTI 的实际功能堆栈填写四项。
    # key 使用具体功能：Fe / Fi / Ne / Ni / Se / Si / Te / Ti。
    # value 写「功能位置 + 在角色身上怎么运作」，例如 Fe: "Fe主。……"。
    # 不要使用 dominant / auxiliary / tertiary / inferior 作为 key。
    cognitive_functions:    # [std]
      Fe:                   # 按实际 MBTI 替换；ENFJ 示例为 Fe / Ni / Se / Ti
      Ni:
      Se:
      Ti:

    enneagram:              # [std]
    instinct:               # [std]
    tritype:                # [std]
    temperament:            # [std]
    attitudinal:            # [std]
    big_five:               # [std]
    socionics:              # [std]
    alignment:              # [std]
    # [traits] 本性与方向，参考 3-5 条；不堆台词，原句放 dialogue_samples。
    # 受挫期角色：写本性被压住时缩到哪、为什么不发作。
    # 性格标签参考 era-traits.md。
    # 判据：删掉所有人名之后依然成立；是性格词而非功能/称号（温柔✓ 腹黑✓ 计划者✗）。
    traits:                 # [mini 关键词形态 / std 起展开]
      - 性格标签:
          解释:             # 可选，有专属逻辑才写一句
          语言:
            -
          行为:
            -

    # [hidden_traits] 可选。只放确实存在、平时不外显、但稳定的性格面；与 traits 同形，多一项「何时露出」。
    # 判据同 traits。没有隐藏面时是否整块删由作者定（四状态约定）；性事中的主导欲、技巧、台词不放这里，进 dlc_intimacy。
    hidden_traits:          # [std 可选]
      - 性格标签:
          解释:
          何时露出:         # 露出的方向与条件范围，不写成触发流程
          语言:
            -
          行为:
            -

  # -- 3 外貌与感官 --
  # 外貌是高辨识度信息：重要特征可以在 overview、traits 或 clothing 中短暂呼应，重复时必须增加观察角度。
  appearance:               # [mini/std]
    # 外貌主体写完整可用的稳定特征；删掉同义复述，不删独有细节。
    # 有特征才立字段，没特征不占位。
    # 用最朴素的语言，禁止抽象氛围和气质描写。
    body:                   # 体态
    hair:                   # 发色与发型合写
    eyes:
    face:                   # 整体感觉，禁止单独描写眼神目光
    skin:
    special:                # 疤痕/纹身/胎记/特殊配饰等标记
    # 有辨识度的局部按角色实际立字段（如 ears / lips / hands / legs），只写静态样子。
    # 情动、羞耻等状态下的生理反应不写这里：与性相关的进 sexual_information.arousal_signs，其余进 emotional_expression。

  sensory_details:          # [std 可选] 沉浸感三件套。建立物理层面的空气感
    voice:                  # 声音质感、音色与说话时的喉音/气息
    scent:                  # 体味/洗发水/香水/随身物品气味
    touch:                  # 皮肤触感/手指温度/衣料质感

  clothing:                 # [std]
    # 按角色实际衣着立字段，不预设内外层级。
    style_impression:       # 穿着风格给人的第一印象
    category:               # 喜好的大类（如：名门女校制服、oversize 私服）
    # 以下按角色实际常服/特殊场景自拟字段
    uniform:
    casual:
    underwear:              # 衣着事实，有资料才写；不写穿着它时的心理
    shoes:
    accessories:            # 耳钉/项链/手表等，数量与位置写死，别处引用时不得改数

  # -- 4 语言块 (speaking_style) --
  # 台词库是心脏。每条台词同时锚定语感、性格、身份。
  # 语言风格写方向和高辨识度特征；台词样本负责提供密度，不把每种情绪的固定句式列满。
  # 判据：拿掉署名还能认出是谁说的，才算合格。
  # 强制要求：只填写纯对话台词，禁止在台词内夹带动作或神态描写！
  speaking_style:
    self_reference:         # [mini] 自称（多情境自称必须写明触发条件）
    addressing:             # [mini] 称呼 User / 关键对象，按场合分
      daily:
      intimate:
      hostile:
    speech_pattern:         # [mini] 一段话写清说话节奏、用词习惯、标点癖好（如 ～、……、♡）
    punctuation_samples:    # [std 可选] 标点癖好各配一条纯台词，让上面那段话有耳朵能听的样子
      -

    dialogue_samples:       # [std] 按场合分组，每组二到四条纯台词
      normal_positive:      # 常规与正面
        -
        -
      negative_failure:     # 负面与挫败
        -
        -
      roasting_others:      # 吐槽/挑衅/施压他人
        -
        -
      self_talk:            # 独白/自言自语/喃喃自语
        -
        -
      dodging_questions:    # 面对逼问/不愿回答时的太极与转移
        -
        -
      toward_liked:         # 面对喜欢/认可的人或物
        -
        -
      toward_disliked:      # 面对厌恶/蔑视的人或物
        -
        -
      other_emotions:       # 特定情境下的专属语料
        -
        -

    # 注：分阶段变化的台词与语气覆写不放卡本体，拆入对应阶段的独立世界书条目，防止跨阶段串台。

  # -- 5 关系块 (relationships) --
  # 对每个关键人物一条。没有关键人物时是否删块由作者定（四状态约定）。
  # 统一工整四元组，禁止在关系里混入全局性格描述。
  relationships:            # [std]
    character_name:
      background:           # 两人产生交集的客观背景/共同经历
      attitude:             # 对该角色的核心态度/心理定位
      behavior:             # 面对该角色时的惯常互动手段与特定行为
      dialogue:             # 面对该角色的代表性专属台词

  # 可选的后天素质。由经历、训练、关系或事件获得；不是先天性格标签，也不专属于关系。
  # 每条写素质名、获得依据与当前表现；没有可靠内容就删掉。
  acquired:
    - quality:
      source:                # 经历、训练、关系或事件
      threshold:             # 何时算获得或发生变化
      effect:                # 现在能做到什么、会改变什么
      limits:                # 适用范围与失效边界

  # -- 6 角色表现与决策层 --
  # 独立表现维度，不是 traits 的重复，也不是必须全部填写。
  # 注：角色的多阶段演进（内在心理、外在表现、语言转变、本阶段不会做的事）不放卡本体，每个阶段单独建一条世界书条件绿灯（见下方「角色阶段条目怎么写」）。
  behavioral_style:         # 可观察的动作习惯、姿态、节奏与场合差异
    core_movements:
    specific_movements:
    under_pressure:
    with_user:
  behavior_logic:            # 稳定原则与应对方向；写倾向和变化余地，不写固定触发流程
    daily:
      principle:
      range:
    interaction:
      principle:
      range:
    pressure:
      principle:
      range:
  decision_making_style:     # 选择时的原则、取舍顺序与少量高价值例子
    principle:
    characteristics:
      efficiency:
      intuition:
      independence:
      flexibility:
    examples:
      - situation:
        process:
  emotional_expression:      # 情绪如何外显；写总体方向与可观察信号，不列满固定情绪表
    principle:
    observable_signals:
    variations:

  # -- 7 能力与冲突 (abilities) --
  # 身体条件、技能、特长带来的「能做到什么」，以及冲突／暴力场面里的行动方式。
  # 服务于角色辨识点（例如腿长就写腿能做到的事），不写战力数值；没有此类戏份时是否删块由作者定（四状态约定）。
  # 性方面的技巧不放这里，进 dlc_intimacy。
  abilities:                # [std 可选]
    - name:
      how_it_shows:         # 日常里怎么看得出来
      limits:               # 做不到／会失手的地方
  conflict_behavior:        # [std 可选] 冲突升级时的方向：先动嘴还是先动手、退让点、下手轻重范围
    principle:
    range:

  # -- 8 素材块 (persona) --
  # 纯列表，不含指令动词。角色没有的子项直接删；不知道的内容不填。
  persona:                   # [std]
    preferences:             # 喜好、厌恶、习惯和兴趣
      likes:
      dislikes:
      hobbies:
    character_weaknesses:     # 已确认的限制、短板与容易失手之处
      -
    daily_life:               # 日常生活节奏和反复出现的生活事实
      morning:
      daytime:
      evening:
      night:
    goals:                    # 驱动目标
      short_term:
      long_term:
    key_facts:                # 关键经历，客观事实（只写发生了什么）
      -
    background:               # 出身背景与家庭环境
    residence:                # 居住场所与私密空间细节

  # -- [可选同级插入] 角色专属机制模块 (about_xxx) --
  # 当角色存在普通字段装不下的独有核心机制（特殊体质/刻印/契约/独特心理运作回路）且经确认后，在此同级插入（此时形成 12+1 结构）。
  # 子键名用平实短语，值写清「来源/前因 → 触发与运作条件 → 行为选择方向 → 转换或失效边界」。
  # 已放进 about_xxx 的机制，不在 overview、acquired、persona.key_facts 中重复解释。

  # -- 9 性信息 (sexual_information) --
  # 只放事实与倾向：经验、身体、情动时看得见的反应、性癖标签与好恶。不放动作流程，不放台词。
  # 标签体系参考 era-traits.md「五、性癖」与「四、身体」。词汇直白通俗，不用文学遮羞布。
  # 无 R18 需求时是否整块删由作者定（四状态约定）。日常场景不会读到这里的内容，卡本体其他块不引用它。
  sexual_information:       # [std 可选]
    experience:             # 经验与自我认知定位，一两句事实
    body:                   # 敏感带、体质、体型与敏感度；有资料才写
    arousal_signs:          # 情动时可观察的生理信号：耳、唇、声音、呼吸、姿势的变化
    kink_tags:              # 标签 + 好恶分级（喜欢／可以／不要），每条一行
      -
    boundaries:             # 明确不做的事，有资料才写

  # -- 10 官能特化 (dlc_intimacy) --
  # 写法见 nsfw.md。开头必写 usage_condition：什么场景下读、其余时候完全静默、一个词不往日常漏。
  # 按动作拆块，每块是一个能演的动作，块里直接给台词。下面的块名只是形状，块名跟着角色走：她不是主导方就换别的块。
  # 口调、句式、节奏、称呼与 speech_pattern 保持同一套，变的只有内容；她独有的东西（道具、身体特征、习惯）要进来。
  # kinks 每条必须是动作，不是名词。没有资料的块不硬写，记进补录清单。
  dlc_intimacy:             # [std 可选]
    usage_condition:        # 使用条件与静默规则
    Dominance_Submission:   # 位置 + 风格 + dynamic_balance（主导权在什么情况下倒过来，必写）
    before_touching:        # 开始之前她做什么
    telling_him_what_he_does:  # 她怎么描述对方
    praise_and_belittle:    # 夸和贬怎么放一起
    refusing:               # 拒绝的时候
    kinks:                  # 每条一个可执行动作，可附一句纯台词
      -
    language_during:        # 行为中的话，纯台词
      -
    own_orgasm:             # 她自己失控的样子
    post_scene:             # 结束之后
    breaking_condition:     # 什么情况下她的手段全部失效

  # -- 11 角色 QA (character_qa) --
  # 可选的高密度校准容器（5至8条）。只用于核心矛盾、表里落差或其他 traits 无法单独承载的重点，不为普通场景凑题。
  # 按需使用 spoken / action / thought 三个通道，不要求每条都齐。
  character_qa:             # [std 5-8条]
    - question: ""          # 极具针对性的情境提问或施压场景
      spoken: ""            # 嘴上说的台词（表象/伪装）
      action: ""            # 身体的微动作/视线流动/生理隐秘反应
      thought: ""           # 角色在该问题下的真实想法

  # -- 12 示例对话 (chat_examples) --
  chat_examples:            # 参考量 mini 6-8 / std 20 / full 30+，不设上下限，认得出是谁才算够。纯台词或标准交互样本
    - context: ""
      dialogue: ""

  # ── 扮演提示块 ──
  # 写给AI的元指令，与角色素材彻底分离，永远放卡尾。
  # 严禁将外貌细节、服饰搭配、关键经历时间线、原句台词或心理机制复述进 roleplay_tips 或 note！角色素材必须全部归位到上方对应字段。
  # 如果没有需要补充的元指令就不写。
  roleplay_tips:
    # 二到四条祈使句，只写从上面素材推断不出来的扮演控制要点（如：称呼锁定、阶段防串台锁、知情边界与禁读心）。
  note:
    Greenlight:             # 仅写简明的扮演方向许可，不复述剧情流水账
    Redlight:               # 仅写简明的扮演禁令边界，不复述设定说明
```

---

## 核心层写作指南

### personality 三层怎么写

1. **core_stack**：
   一行九项，顺序固定：`MBTI - 九型主翼 - 本能副型 - Tritype - 气质 - 态度心理学 - 大五 - Socionics - 阵营`。
   例：`"ENFJ - 2w3 - sx/so - 278 - Sanguine-Choleric - VEFL - SLOEN - EIE - Neutral Evil"`。
2. **类型学字段与 cognitive_functions**：只写机制；cognitive_functions 四位各一行，「术语 + 怎么运作」。**劣势位最要紧**：`persona.character_weaknesses` 与 `dlc_intimacy.breaking_condition` 主要从这里长出来。
3. **traits**：把上面的抽象内容写成本性和方向，读完不用回头看术语也知道这人是谁。性格标签参考 `era-traits.md`。

### 成人两块怎么分（sexual_information / dlc_intimacy）

1. **事实归 `sexual_information`**：经验、敏感带、情动生理信号、性癖标签与好恶。它是素材，不含动作流程、不含台词。
2. **动作归 `dlc_intimacy`**：每块一个能演的动作，块里直接给台词；开头 `usage_condition` 写清什么时候读、其余时候静默。
3. **散在别处的性内容全部搬进来**：外貌块只留静态样子，情动反应进 `arousal_signs`；`behavioral_style`、`emotional_expression`、`hidden_traits`、`abilities` 不留亲密子键；`speaking_style.addressing.intimate` 只留称呼一行做索引。
4. **同一套口调**：床上和平时的句式、节奏、称呼是一个人；如果读起来像换了个人，回去对 `speech_pattern`。
5. 取样、检查清单见 `nsfw.md`。

### character_qa 怎么写（三通道校准）

1. **按需使用三个通道**：
   - `question`：客观的现实情境或对话施压；
   - `spoken`：角色的公开台词；
   - `action`：可观察的反应；
   - `thought`：角色在该问题下的真实想法。
2. 不为凑数量制造 QA，不把 `thought` 写成模型思维链。

### 角色阶段条目怎么写（独立世界书条目，不放卡本体）

当角色存在随数值、关系或剧情递进的多阶段转变（如防备破冰、黑化、态度软化、价值观重塑等）时，**角色卡本体只写初始阶段常态**；每个阶段单独拆成一条 `module` 类型的世界书条件绿灯（仅在当前阶段激活），声明「当前阶段特征与语气优先于基础人设」，内部按以下结构编写：

```xml
<character name="角色名" part="阶段二">
阶段二（对应区间与阶段名）:
  阶段概述: 一句话写清本阶段的核心状态与驱动力（从什么转向什么）。
  心理与性格变化:
    内在变化: 自我认知、对 {{user}} 的真实想法、内心矛盾或动摇点怎么变。
    外在表现: 姿态、物理距离、眼神、说话语气与动作习惯怎么变（写具体可观察行为，不堆形容词）。
  关系与核心行为:
    - 行为方向一: 本阶段面对 {{user}} 或其他关键人物时的具体试探、施压、退让或亲近方式。
    - 行为方向二: 对日常事务、自身阵营或周遭环境的态度变化。
  语言与台词参考:
    语气变化: 本阶段称呼、句式、口癖的调整（如不再使用命令口吻，或嘴硬后立刻小声找补）。
    示例台词:
      - "纯台词样本（不夹动作描写）"
  行为界限（本阶段不会做的事）:
    - 明确列出本阶段尚未解锁、绝不提前越界的行为底线（例：本阶段只停留在言语试探，不会进行肢体强迫；不会直接表白；不会对第三方动手）。
</character>
```

- **阶段语料切换**：若角色在特定阶段（如情绪崩溃、彻底卸下伪装）完全不再使用平时口头禅，可将日常语料也拆成独立 `corpus` 条目，用二级过滤排除该阶段，避免崩溃期还在复读日常傲娇台词。
- **阶段事件拆独立 `event` 条目**：达到某阶段或数值阈值时触发的关键剧情事件（如摊牌、表白、决裂），单独建 `event` 世界书条目，不混在阶段常态条目里，避免该阶段每一轮都重复触发同一次事件。

---

## 分深度填写约定（写卡循环）

本模版的骨架是最终形状；内容按写卡循环的五轮分深度逐步填到这里。一轮横扫全部节点，每轮只做自己深度的事，不提前写下一轮的内容。

| 轮次 | 在本模版里做什么 |
|---|---|
| 第 1 轮 · 方向 | 定档位；`identity` 一句话、`overview` 方向、`core_stack` 初判；各块只写「要写什么、不写什么」一句话 |
| 第 2 轮 · 事实 | 填可观察事实：外貌、衣着、关系对象与称呼、能力清单、关键经历按先后 |
| 第 3 轮 · 条件 | 补条件与分支：`hidden_traits` 的何时露出、`dlc_intimacy` 的 `usage_condition`、行为逻辑的条件与例外、决策的边界 |
| 第 4 轮 · 证据 | 对照事实矩阵与语料核对：台词原句进语料块、出处存疑改标【缺口】、`character_qa` 校准三通道 |
| 第 5 轮 · 表达 | 逐块改写：`traits` 三项落到嘴上手上、口调与 `speech_pattern` 对齐、删同义复述、过十问终检 |

攻略式写法（第 5 轮验收标准，前几轮不追求）：写给要用的人——条件、数字、后果、例外、顺序；评价词改事实，改不动标【缺口】；「会怎样」改成「条件 → 结果 → 例外」。

各档写到第几轮算够，由作者在建任务时指定；本模版不预设默认深度。第 5 轮（表达）在导出前统一过。

---

## 输出包裹

```xml
<character name="角色名">
【yaml 卡本体，包含卡尾 roleplay_tips / note 扮演提示块】
</character>
```

单独成条导出时，每条都要有自己的顶层包裹，`name` 写属于谁，`part` 写是哪一部分，里面的 YAML 顶格写，不沿用并进卡本体时的缩进。例：

```xml
<character name="角色名" part="模块名">
【yaml 模块正文】
</character>
```

---

## 十问终检

（名称沿用；第 11 条为四状态检查，第 12 条为补充检查。）

1. 拿掉署名还认得出是谁吗？（台词纯粹度检查）
2. 每条信息的主归属是否清楚？跨容器重复是否承担了不同功能？
3. `behavioral_style`、`behavior_logic`、`decision_making_style`、`emotional_expression` 是否各司其职，同时保留变化余地，没有把未知写成固定流程？
4. `character_qa` 是否只用于核心矛盾或高价值重点，且按需使用 spoken / action / thought？
5. traits 与全局行为描述删掉特定对象名后还成立吗？若内容本来只描述对某人的态度，就应放进关系块；不要为了满足形式强行抹掉关系信息。
6. `cognitive_functions` 的劣势位和 `persona.character_weaknesses` 是否呼应？
7. 成人两块：`sexual_information` 只有事实没有流程？`dlc_intimacy` 开头有 `usage_condition`、每条 kink 是动作、口调与 `speech_pattern` 是同一套？其他块里还有没有散落的性内容？
8. `appearance` 是否只写了偏离默认认知的特征？
9. `roleplay_tips` / `note` 是否只写了推断不出来的要点与红绿灯，而非废话复述？没有可补充的是否直接不写？
10. 全卡是否杜绝了行业腔与生硬的议论文对比句式？
11. 各字段四状态是否标注完整：【缺口】是否都进了查料清单，「原作没有答案」是否确为原作无答案而非没查到，有没有 Agent 自行删掉的字段或块？
12. 有没有为填满模板而编的细节？类型学字段里有没有剧情和原句？
