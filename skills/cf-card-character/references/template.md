# 角色卡模板（三通道校准版）

**本模板是骨架示例。** 动笔前先按当前角色写出明确判断并提出结构提案：启用哪些块、精简哪些块、是否新增角色专属模块 `about_xxx`、各块写到多深，作者确认后再写。

字段右侧标 `[mini]` 的三档通用，`[std]` 从 standard 起启用，`[full]` 在深度档启用。同一张卡里各档沿用统一字段名。

默认结构：根节点 `character`、`personality` 三层与顶层 `<character>` 包裹，其余字段随人物实际面貌裁减。块的增删在结构提案阶段与作者确认。

## 使用边界

- **固定锚点写实，随境互动留足开放方向**：
  - **固定锚点与惯性习惯**：基础身份、静态外貌与感官特征（`appearance` / `sensory_details`）、说话方式与标点口癖（`speaking_style`）、底层人格逻辑（`personality`）、客观经历（`key_facts`）、关系底线，用平实准确的语言写实。
  - **随境变化与开放方向**：服装穿搭（`clothing`）、日常作息与同行活动（`daily_life`）、情绪流露与微动作、试探与回敬方式、冲突反应、专属机制（`about_xxx`）与亲密细节（`dlc_intimacy`），先写一句上位原则，再用 **「平时/通常……」「有时……」「一些情况下……还有一些情况下……例如……」「在特殊情况下……」** 给出代表性例子，让模型顺着人物性格往外推。
- **四状态管理**：每个字段对应四种状态之一：**有料**（正常填写）、**原作无记载**（如实注明）、**缺口**（标【缺口】并列入查料清单）、**确认精简**（经作者确认后移除）。
- **日常块保持常态净室边界**：从 `basic_settings` 到 `persona`、`about_xxx` 的日常模块专注刻画角色常态下的身份、性格与互动张力，亲密生理与床笫互动统一归入 `sexual_information` 与 `dlc_intimacy`。
- **专属机制块（`about_xxx`）与常规块的清晰分工**：当角色确认启用自建 `about_xxx` 模块时，四处容器各司其职：
  1. `overview`：写 3～5 条高层身份坐标与核心张力概括；
  2. `persona.key_facts`：按时间顺序记录客观经历（何时、何地、发生了什么）；
  3. `about_xxx`：用自然清晰的子键名，把该角色独有的特殊机制（特殊体质、契约信条、独特的心理或关系回路）按「成因定位 → 平时边界 → 常见互动方向 → 特殊转换条件」集中讲透；
  4. `acquired`：记录独立于 `about_xxx` 之外的后天习得能力或习惯。
- **阶段变化拆为独立世界书条目**：角色卡本体写初始常态面貌。随数值、关系或剧情递进的阶段变化、分阶段语料、数值升降规则与单次阶段事件，分别拆成独立世界书条件绿灯（`module` / `corpus` / `rule` / `event`）按锚点动态挂载。

---

## YAML 骨架

```yaml
# ==============================================================================
# 角色卡骨架模板（三通道校准版）
# ==============================================================================

character:
  # -- 1 基础身份 --
  name:                     # [mini] 按角色实际语种填写
    chinese:
    japanese:
    english:
    alias:                  # 常用称呼或代号

  basic_settings:           # [mini]
    gender:
    age:
    height:
    weight:                 # 有据时填写
    identity:               # 一句话客观身份与社会位置

  overview:                 # [std] 3-5 条客观身份坐标与核心张力概括
    -

  # -- 2 人格核心层 --
  # personality 分三层：core_stack 索引 -> 类型学与认知功能运作机制 -> traits 日常言行方向
  personality:
    # 一行九项顺序：MBTI - 九型主翼 - 本能副型 - Tritype - 气质 - 态度心理学 - 大五 - Socionics - 阵营
    core_stack: ""          # [mini]

    mbti:                   # [std] 类型及核心认知路径

    # 按实际 MBTI 功能堆栈填写四项具体功能（Fe / Fi / Ne / Ni / Se / Si / Te / Ti）
    cognitive_functions:    # [std]
      Fe:                   # 功能位置 + 在该角色身上如何运作
      Ni:
      Se:
      Ti:

    enneagram:              # [std] 核心渴望、担忧与翼型倾向
    instinct:               # [std]
    tritype:                # [std]
    temperament:            # [std]
    attitudinal:            # [std]
    big_five:               # [std]
    socionics:              # [std]
    alignment:              # [std]

    # 本性与外显方向，参考 era-traits.md 挑选性格词，删掉特定对象名后依然成立
    traits:                 # [mini 关键词 / std 展开]
      - 性格标签:
          解释:             # 有独特个人成因时写一句
          语言:
            -
          行为:
            -

    # 平时收敛、在特定熟稔度或压力下才流露的稳定性格面
    hidden_traits:          # [std 可选]
      - 性格标签:
          解释:
          何时露出:         # 流露的情境与条件范围
          语言:
            -
          行为:
            -

  # -- 3 外貌与感官 --
  appearance:               # [mini/std] 朴素客观记录静态可见特征，有特征才立子项
    body:                   # 身形与体态比例
    hair:                   # 发色与发型结构
    eyes:                   # 眼型与瞳色
    face:                   # 五官轮廓与常态神情印象
    skin:                   # 肤色与肤质特征
    special:                # 疤痕、胎记、标志性配饰等辨识细节

  sensory_details:          # [std 可选] 近距离物理感官锚点
    voice:                  # 音色质感、语速与气息特征
    scent:                  # 常带的气息或随身器物气味
    touch:                  # 肤温、手部触感或衣料质地

  clothing:                 # [std] 穿衣风格方向与场合示例，保留日常换装弹性
    style_impression:       # 整体穿搭印象与不同场合的反差
    daily_and_work:         # 日常或履职时的常见穿搭与单品示例
    private_and_outing:     # 私下独处或同行外出时的穿搭倾向，用平时、有时、例如展开
    underwear_and_details:  # 贴身衣物风格偏好与固定随身信物

  # -- 4 语言块 (speaking_style) --
  # 仅收录人物亲口说出的纯对话台词，拿掉署名仍能听出说话人
  speaking_style:
    self_reference:         # [mini] 自称，多自称时写清切换场合
    addressing:             # [mini] 对 {{user}} 及关键人物的称呼
      daily:
      intimate:
      hostile:
    speech_pattern:         # [mini] 一段话交代句长、节奏、用词偏好与标点习惯
    punctuation_samples:    # [std 可选] 标点与语气习惯对应的纯台词短句
      -

    dialogue_samples:       # [std] 按情境分组的纯口语台词，贴合日常处境与知情范围
      normal_positive:
        -
        -
      negative_failure:
        -
        -
      roasting_others:
        -
        -
      self_talk:
        -
        -
      dodging_questions:
        -
        -
      toward_liked:
        -
        -
      toward_disliked:
        -
        -
      other_emotions:
        -
        -

  # -- 5 关系块 (relationships) --
  relationships:            # [std] 针对每位关键关联人物建立四元组
    character_name:
      background:           # 双方交集的客观背景与过往经历
      attitude:             # 对该对象的真实心理定位
      behavior:             # 面对该对象时的惯常互动方式
      dialogue:             # 对该对象说的代表性纯台词

  acquired:                 # [std 可选] 由经历或训练获得的后天素质
    - quality:
      source:               # 来源经历或训练
      threshold:            # 形成或显现的条件
      effect:               # 具体带来的能力或习惯变化
      limits:               # 适用范围与边界

  # -- 6 角色表现与决策层 --
  behavioral_style:
    habitual_movements:     # 肌肉记忆式的标志性小动作与姿态
    situational_variations: # 随心境、对象与公开或私下场合的自然变化
  behavior_logic:
    daily:                  # 平时处理日常事务的原则与变通方式
    interaction:            # 人际互动中的进退习惯，试探、拉近或保持距离的方式
    under_pressure:         # 面临压力、质疑或变故时的应对方向与多维表里反应
  decision_making_style:
    principle:              # 面临取舍时的优先权衡准则
    examples:
      -
  emotional_expression:
    principle:              # 情绪外显的总体收放习惯
    observable_signals:     # 情绪波动时可见的微动作与语气变化
    variations:             # 在熟人与外人面前的表现差异

  # -- 7 能力与冲突 (abilities) --
  abilities:                # [std 可选]
    - name:
      how_it_shows:         # 日常或实战中的具体体现
      limits:               # 消耗、短板与力所不及之处
  conflict_behavior:        # [std 可选] 冲突升级或对方越界时的应对原则与开放示例
    principle:
    open_examples:

  # -- 8 素材块 (persona) --
  persona:                  # [std]
    preferences:
      likes:
      dislikes:
      hobbies:
    character_weaknesses:   # 性格软肋、认知盲区或容易失算的地方
      -
    daily_life:             # 日常作息节奏与常见活动方向，保留临场变化空间
    goals:
      short_term:
      long_term:
    key_facts:              # 按时间排列的关键客观经历
      -
    background:             # 出身家世与成长环境
    residence:              # 居所环境与私密空间陈设细节

  # -- [可选同级插入] 角色专属机制模块 (about_xxx) --
  # 经确认需要承载角色独有机制时同级插入，先写平时定位与边界，再用平时、有时、一些、例如、在特殊情况下展开互动弹性

  # -- 9 客观生理与偏好信息 (sexual_information) --
  sexual_information:       # [std 可选] 客观生理事实、技艺档位与偏好分级
    experience_and_skill:   # 过往经验与技艺熟练度档位，如青涩生疏、略通人事、熟稔老练等
    body:                   # 敏感带、体质特征与身体反应特点
    arousal_signs:          # 情动时可见的耳廓、眼神、呼吸、嗓音与姿态变化
    kink_tags:              # 偏好标签与接受度分级，每条一行
      -
    boundaries:             # 明确的接受底线与舒适边界

  # -- 10 亲密互动表现 (dlc_intimacy) --
  dlc_intimacy:             # [std 可选] 声线、句式与称呼延续日常 speaking_style
    usage_condition:        # 启用条件与日常静默规则
    tone_and_pacing:        # 亲密互动中的主动或配合倾向、说话节奏与氛围把控
    service_and_reactions:  # 前戏试探、肢体侍奉或引导习惯，以及受触碰时的多层次言行反应
    preferences_in_action:  # 具体偏好的可执行互动方向与代表性示例
      -
    boundary_handling:      # 对方急切或触及边界时的安抚、挡回或周旋方式
    language_during:        # 亲密过程中的代表性纯台词，使用自然中文语气词
      -
    climax_and_aftercare:   # 情动巅峰表现与事后温存、整理或嘴硬找补的自然状态

  # -- 11 角色 QA (character_qa) --
  character_qa:             # [std 可选] 聚焦核心矛盾与表里张力的情境校准，按需选用三通道
    - question: ""          # 具体现实处境或对话提问
      spoken: ""            # 说出口的台词
      action: ""            # 可观察的微动作与视线变化
      thought: ""           # 当下的真实盘算或心绪

  # -- 12 示例对话 (chat_examples) --
  chat_examples:            # 纯台词或精简交互样本
    - context: ""
      dialogue: ""

  # -- 扮演提示块 --
  # 置于卡尾的简明扮演控制提示，按二元切分锚定内核与采样边界
  roleplay_tips:
    # 1. 本我内核硬锚点：点明核心身份、认知功能滤镜、执念驱动力与不可退让的底线
    # 2. 语料库可能性空间：声明卡内列举的穿搭变体、台词样本、日常动作与亲密反应均为气韵采样，随现场信任度与态势自由派生新表现
    # 3. 称呼与知情边界：锁定自称称呼，仅凭可观察言行揣测对方意图
  note:
    Greenlight:             # 鼓励展现的人物弧光与互动质感
    Redlight:               # 需要守住的人物底线与视角边界
```

---

## 核心层写作指南

### `personality` 三层怎么写

1. **`core_stack`**：一行九项按固定顺序排列，例：`"ENFJ - 2w3 - sx/so - 278 - Sanguine-Choleric - VEFL - SLOEN - EIE - Neutral Evil"`。
2. **类型学字段与 `cognitive_functions`**：专注写认知路径与判断机制；四项功能各写一行「功能位置 + 在该角色身上如何运作」。劣势功能与盲区自然呼应 `persona.character_weaknesses` 及受压时的防御反应。
3. **`traits`**：将抽象机制落地为平时看得见的说话方式与行事倾向，性格标签可参考 `era-traits.md`。

### 成人两块怎么分（`sexual_information` / `dlc_intimacy`）

1. **客观事实归 `sexual_information`**：记录经验背景、技艺熟练度档位、敏感带、情动生理信号与偏好底线。
2. **互动表现归 `dlc_intimacy`**：首行 `usage_condition` 明确启用场景与日常静默边界；内部围绕 `tone_and_pacing`、`service_and_reactions`、`climax_and_aftercare` 写出具体的互动习惯与纯台词，保留人物独有的性格拉扯与事后余韵。
3. **日常与亲密各归其位**：`appearance` 保持静态外貌特征，情动信号统一收入 `arousal_signs`；亲密句式与平时 `speech_pattern` 保持同一个人的呼吸和口吻。

### 角色阶段条目怎么写（独立世界书条目）

当角色随数值、关系或剧情产生跨阶段转变时，角色卡本体保留初始常态；每个递进阶段单独建立一条 `module` 世界书条件绿灯（设 `scan_depth: 1` 按最新阶段锚点挂载），声明当前阶段特征与语气优先适用：

```xml
<character name="角色名" part="阶段二">
阶段二:
  阶段概述: 一句话写清本阶段的核心状态与关系定位变化。
  心理与性格变化:
    内在变化: 自我认知、对 {{user}} 的真实态度与内心拉扯点的推进。
    外在表现: 姿态、相处距离、目光停留与日常动作习惯的具体变化。
  关系与核心行为:
    - 互动方向一: 本阶段面对 {{user}} 时的主动试探、关照、配合或周旋方式。
    - 互动方向二: 对手头事务、自身阵营或周遭环境的态度微调。
  语言与台词参考:
    语气变化: 称呼、句长与说话软硬度的自然调整。
    示例台词:
      - "纯口语台词样本"
  当前阶段尺度与化解方式:
    - 写明本阶段自然停驻的亲密与信任上限，以及对方超前试探时角色如何顺着性格转移话题、半真半假挡回或拉开缓冲距离。
</character>
```

- **阶段语料切换**：若某阶段说话口吻发生根本变化，可将日常语料拆为独立 `corpus` 条目并用二级过滤与该阶段错开。
- **单次阶段事件独立成条**：达到特定阶段触发的表白、摊牌、定契等单次剧情节点，单独建立 `event` 条件条目，触发结算后自动退场。

---

## 分深度填写约定（写卡循环）

| 轮次 | 本轮聚焦任务 |
|---|---|
| 第 1 轮 · 方向 | 写出人物核心驱动判断；定档位、`identity`、`overview` 方向与 `core_stack` 初判 |
| 第 2 轮 · 事实 | 填入有据可查的静态事实：外貌、感官、关系对象与称呼、能力与关键经历 |
| 第 3 轮 · 弹性 | 补齐条件与开放方向：`hidden_traits` 露出范围、日常与冲突弹性、`dlc_intimacy` 启用条件与互动反应 |
| 第 4 轮 · 语料 | 核对事实出处并精选纯口语台词，按需补充 `character_qa` 三通道校准 |
| 第 5 轮 · 表达 | 检查各块唯一主归属，把抽象形容词落实为可观察言行，完成终检 |

---

## 输出包裹

角色卡本体：

```xml
<character name="角色名">
character:
  ...
</character>
```

拆分为独立模块条目时，顶层包裹注明 `name` 与 `part`，内部 YAML 顶格书写：

```xml
<character name="角色名" part="模块名">
模块内容:
  ...
</character>
```
