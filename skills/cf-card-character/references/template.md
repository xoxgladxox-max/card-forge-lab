# 角色卡模板（泛化本体 + 条件绿灯语料物理分离版）

**本模板是骨架示例。** 动笔前先执行「两原则一问题」：写出明确判断与**角色卡预测输出方向**，排查限制自由发挥的死板套路；若缺乏关键信息，立即停下向作者提问补齐并确认体验方向与预测输出方向，信息完整并确认结构提案后再动笔。

字段右侧标 `[mini]` 的三档通用，`[std]` 从 standard 起启用，`[full]` 在深度档启用。同一张卡里各档沿用统一字段名。

## 物理分离边界（核心铁律）

- **泛化设定本体（`lorebooks/character/<角色名>.md`）只装全场景通用的规律与硬锚点**：
  - 凡是换一个时间、地点或对话主题依然成立的底层身份、认知功能机制、性格倾向、静态外貌感官、穿衣风格原则、说话句法规律（`self_reference` / `addressing` / `speech_pattern`）、关系心理定位与相处原则、过往经历对当下性格的泛化塑造因果（`past_shaping`）、专属机制边界（`about_xxx`）、客观生理与技艺档位（`sexual_information`），留在角色本体。
  - 本体保持**零具体原句台词、零固定微动作分镜清单、零单次具体事件经过**，让模型在任何新场景都能顺着人物内核自由发挥，消除照抄原句与打卡小动作的源头。
- **具体行为、语言、事件统一拆入独立条件绿灯节点（`constant: false`）**：
  1. **语料参考节点（`lorebooks/character/<角色名>语料.md`，`type: corpus`）**：承载纯口语台词样本（`dialogue_samples`）、标点语气短句（`punctuation_samples`）、习惯微动作切片（`habitual_movements`）、关联人物代表台词与情境问答（`character_qa`）。
  2. **过往事件节点（`lorebooks/character/<角色名>过往事件.md`，`type: lore` 或 `module`）**：承载有具体时间、地点与经过的关键往事，按事件词、旧地名或相关人物名按需触发。
  3. **亲密表现节点（`lorebooks/character/<角色名>亲密表现.md`，`type: module`）**：承载 `dlc_intimacy` 的亲密互动表现与床笫纯台词样本，按独处亲密语境词触发，日常静默。
  4. **跨阶段演进节点（`lorebooks/character/<角色名>阶段X.md`，`type: module`）**：随关系或剧情递进的阶段状态变化，按阶段锚点与 `scan_depth: 1` 动态挂载。
- **四状态管理**：每个字段对应四种状态之一：**有料**（正常填写）、**原作无记载**（如实注明）、**缺口**（关乎人物立住或体验方向时立即停下向作者提问补齐）、**确认精简**（经作者确认后移除）。
- **日常块保持常态净室边界**：从 `basic_settings` 到 `persona`、`about_xxx` 的日常模块专注刻画角色常态下的身份、性格与互动规律；客观生理特征归 `sexual_information`，具体亲密互动归独立条件绿灯。

---

## 一、泛化设定本体骨架（`lorebooks/character/<角色名>.md`）

```yaml
# ==============================================================================
# 第一部分：角色泛化设定本体（全场景通用规律，零原句台词、零单次事件剧本）
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

  overview:                 # [std] 3-5 条全场景成立的身份坐标与核心性格张力概括
    -

  # -- 2 人格核心层 --
  # personality 分三层：core_stack 索引 -> 类型学与认知功能运作机制 -> traits 泛化言行倾向
  personality:
    # 一行九项顺序：MBTI - 九型主翼 - 本能副型 - Tritype - 气质 - 态度心理学 - 大五 - Socionics - 阵营
    core_stack: ""          # [mini]

    mbti:                   # [std] 类型及核心认知路径

    # 按实际 MBTI 功能堆栈填写四项具体功能（Fe / Fi / Ne / Ni / Se / Si / Te / Ti）
    cognitive_functions:    # [std]
      Fe:                   # 功能位置 + 在该角色身上如何收集信息或做判断
      Ni:
      Se:
      Ti:

    enneagram:              # [std] 核心渴望、深层顾虑与翼型倾向
    instinct:               # [std]
    tritype:                # [std]
    temperament:            # [std]
    attitudinal:            # [std]
    big_five:               # [std]
    socionics:              # [std]
    alignment:              # [std]

    # 本性与全场景通用的外显倾向，参考 era-traits.md 挑选性格词，删掉特定对象与特定事件后依然成立
    traits:                 # [mini 关键词 / std 展开为泛化倾向]
      - 性格标签:
          成因与定位:       # 有独特个人成因时写一句泛化因果
          说话倾向:         # 在不同场合说话的态度、软硬度与切入习惯（写规律，原句归语料节点）
          行事倾向:         # 平时处理事务与对待他人的行为规律（用平时、有时、在特殊情况下保留弹性）

    # 平时收敛、在特定熟稔度或压力条件下才流露的稳定性格面
    hidden_traits:          # [std 可选]
      - 性格标签:
          显现条件:         # 触发流露的信任度、私密环境或压力范围
          内在心理与表现规律: # 流露时的态度偏移与互动分寸变化

  # -- 3 外貌与感官 --
  appearance:               # [mini/std] 朴素客观记录静态可见特征，有特征才立子项
    body:                   # 身形与体态比例
    hair:                   # 发色与发型结构
    eyes:                   # 眼型与瞳色
    face:                   # 五官轮廓与常态神情基调
    skin:                   # 肤色与肤质特征
    special:                # 疤痕、胎记、标志性常佩物件等静态辨识细节

  sensory_details:          # [std 可选] 近距离物理感官锚点
    voice:                  # 音色质感、语速快慢与气息特征
    scent:                  # 常带的气息或工作环境留下的自然味道
    touch:                  # 肤温、手部触感或常穿衣料质地

  clothing:                 # [std] 穿衣风格规律与场合切换原则，保留日常换装弹性
    style_impression:       # 整体穿搭审美与公开/私下场合的反差原则
    occasion_tendencies:    # 履职、居家、外出等不同场合的选衣倾向（用平时、有时、例如展开品类方向）
    underwear_and_details:  # 贴身衣物款式偏好与固定随身信物

  # -- 4 说话方式规律 (speaking_style：只写句法与称呼规律，原句样本归 corpus 节点) --
  speaking_style:
    self_reference:         # [mini] 自称，多自称时写清切换场合与对象条件
    addressing:             # [mini] 对 {{user}} 及不同远近人物的称呼切换规则
      daily:
      intimate:
      hostile:
    speech_pattern:         # [mini/std] 句长、停顿节奏、用词偏好、反问或留白习惯、标点使用规律

  # -- 5 关系定位与后天素质 --
  relationships:            # [std] 针对每位关键关联人物建立泛化三元组（代表台词归 corpus 节点）
    character_name:
      background:           # 双方交集的身份渊源与关系基础
      attitude:             # 对该对象的真实心理定位与信任度
      interaction_principle: # 面对该对象时的相处分寸与进退原则

  acquired:                 # [std 可选] 由经历或训练获得的后天素质
    - quality:
      source:               # 形成渊源概括
      threshold:            # 显现条件
      effect:               # 带来的感知或能力规律
      limits:               # 适用范围与客观限度

  # -- 6 处事、决策与情绪规律层 --
  behavior_logic:
    daily:                  # 平时处理日常事务的原则与变通余地
    interaction:            # 人际互动中的进退原则，试探、拉近或保持距离的习惯规律
    under_pressure:         # 面临压力、质疑或突发变故时的应对方向与多维表里层次
  decision_making_style:
    principle:              # 面临价值冲突或利害取舍时的优先排序准则与底线
    tradeoff_tendency:      # 在公私、情理、安危之间的权衡方向（用平时、有时、在特殊情况下保留弹性）
  emotional_expression:
    principle:              # 情绪外显的总体收放幅度
    trust_difference:       # 在外人面前与在信任之人面前的分寸差异

  # -- 7 能力与冲突原则 --
  abilities:                # [std 可选]
    - name:
      capability:           # 能力作用范围与常态水准
      limits:               # 消耗、短板与力所不及之处
  conflict_behavior:        # [std 可选] 冲突升级或对方越界时的应对原则与化解梯度
    principle:
    escalation_gradient:    # 初次越界提醒 -> 持续施压周旋 -> 触及硬底线时的决断方向

  # -- 8 内在素材与过往塑造因果 (persona) --
  persona:                  # [std]
    preferences:
      likes:
      dislikes:
      hobbies:
    character_weaknesses:   # 性格软肋、认知盲区或容易判断失准的地方
      -
    daily_rhythm:           # 日常作息规律与空闲时的精力投向，保留临场变化空间
    goals:
      short_term:
      long_term:
    past_shaping:           # [泛化因果] 过往经历给当下留下的性格烙印、习惯成因或未解心结（单次具体事件经过拆入过往事件绿灯）
      -
    background:             # 出身家世与成长环境概括
    residence:              # 常住空间格局与陈设偏好

  # -- [可选同级插入] 角色专属机制模块 (about_xxx) --
  # 承载角色独有的特殊体质、契约或心理回路：按「成因定位 -> 平时边界 -> 常见互动方向 -> 转换条件」写清泛化机制

  # -- 9 客观生理与偏好底线 (sexual_information：按需启用，只写静态生理与态度原则) --
  sexual_information:       # [std 可选] 跨场景稳定的客观生理事实、技艺档位与底线
    experience_and_skill:   # 经验背景与技艺熟练度档位（懵懂本能 / 青涩生疏 / 略通人事 / 熟稔老练 / 炉火纯青）
    body:                   # 敏感带、体质特征与身体受激规律
    arousal_signs:          # 情动时的生理变化趋势（呼吸、体温、嗓音与眼神变化方向）
    kink_tags:              # 偏好标签与接受度分级
      -
    attitude_and_boundaries: # 对待亲密关系的整体态度原则、私密环境要求与舒适底线

  # -- 扮演提示块 --
  roleplay_tips:
    # 1. 本我内核锚点：点明核心身份、认知滤镜、核心驱动力与底线
    # 2. 临场自由推演：顺着角色泛化规律与当前现场态势自然生成全新的对话、动作与决策
    # 3. 称呼与知情边界：锁定自称称呼规则，仅凭当场可感知的言行线索做判断
```

---

## 二、独立条件绿灯节点骨架（具体语料 / 过往事件 / 亲密表现 / 阶段演进）

### 1. 语料参考节点（`lorebooks/character/<角色名>语料.md`）

Frontmatter 设为 `type: corpus`、`constant: false`，`keys` 填入角色名与常用称呼（多角色或按情境拆分时可配 `secondary`）：

```xml
<character name="角色名" part="语料参考">
calibration_notice: 以下台词、微动作与情境切片仅供校准角色的声线、句长、语气词与情绪刻度；实际扮演时结合当前场景与前文脉络，顺着角色本我生成全新的台词与动作。

corpus:
  habitual_movements_samples:   # 供领会神态气质的习惯微动作采样（平时…有时…例如…）
    -

  punctuation_samples:          # 体现停顿、反问或语气转折的短句样本
    -

  dialogue_samples:             # 按情绪与互动语境分组的纯口语台词样本
    normal_daily:
      -
    teasing_or_roasting:
      -
    dodging_or_defending:
      -
    toward_trusted:
      -
    under_stress_or_setback:
      -

  relationship_dialogues:       # 对特定关联人物说出口的代表性纯台词（按需启用）
    关联人物名:
      -

  character_qa:                 # [std 可选] 聚焦表里张力的情境校准切片
    - situation: ""             # 典型处境或提问
      spoken: ""                # 说出口的纯口语台词
      action: ""                # 当下的微动作切片
      thought: ""               # 内心真实盘算
</character>
```

### 2. 过往事件节点（`lorebooks/character/<角色名>过往事件.md`，按需拆分）

Frontmatter 设为 `type: lore`（或 `module`）、`constant: false`，`keys` 填入该往事的专名、旧地名、信物名或关键时间词：

```xml
<character name="角色名" part="过往事件">
past_events:
  事件名称:
    time_and_place: 发生的时间节点与地点
    course: 客观经过与角色当时的抉择
    present_echo: 这件事在当下留下的具体信物、旧伤或提及时的态度反应（平时避谈，在特定契机下有时会简短提及）
    informed_scope: 知晓此事完整内情的人物范围
</character>
```

### 3. 亲密表现节点（`lorebooks/character/<角色名>亲密表现.md`，R18 按需启用）

Frontmatter 设为 `type: module`、`constant: false`，`keys` 填角色名并配亲密氛围 `secondary` 过滤词（`selectiveLogic: 0`）：

```xml
<character name="角色名" part="亲密表现">
dlc_intimacy:
  usage_condition: 双方独处且情感与肢体互动自然进入亲密阶段时启用；日常交谈与公开场合保持静默。
  calibration_notice: 以下动作与台词样本用于标定角色在亲密情境下的声线温度与反应光谱，正文中随现场信任度、体位距离与互动节奏自然生成全新表现。
  tone_and_pacing: 延续日常声线底色下的主动或配合倾向、呼吸与说话节奏
  service_and_reactions: |
    前戏试探、肢体配合或引导习惯，以及受触碰时的多层次表里反应（用平时…有时…一些时候…在特殊情况下…展开光谱）
  preferences_in_action:
    - 贴合个人性格与执念的亲密互动偏好方向示例
  boundary_handling: 对方急切或触及边界时的安抚、挡回或周旋方式
  language_samples:
    - "贴合日常口吻与自然中文语气词的纯台词样本"
  climax_and_aftercare: 情动巅峰状态与平复后温存、整理衣饰或嘴硬找补的自然余韵
</character>
```

### 4. 跨阶段演进节点（`lorebooks/character/<角色名>阶段二.md`，按需启用）

每个递进阶段单独建立一条 `module` 世界书条件绿灯（设 `scan_depth: 1` 按最新阶段锚点挂载）：

```xml
<character name="角色名" part="阶段二">
阶段二:
  阶段概述: 一句话写清本阶段的核心状态与关系定位变化。
  心理与相处变化:
    内在变化: 自我认知、对 {{user}} 的真实态度与内心关注点的推进。
    外在分寸: 相处距离、主动搭话频率与情绪收放幅度的规律变化。
  互动原则推进:
    - 面对 {{user}} 时的主动试探、关照、配合或周旋原则。
    - 对手头事务、自身阵营或周遭环境的取舍微调。
  语言与样本校准:
    语气规律: 称呼、句长与说话软硬度的调整规律。
    阶段台词采样: # 仅供校准本阶段语气温度，现场生成新台词
      - "纯口语台词样本"
  当前阶段尺度与化解方式:
    - 写明本阶段自然停驻的亲密与信任上限，以及对方超前试探时角色如何顺着性格转移话题、半真半假挡回或拉开缓冲距离。
</character>
```

---

## 分步构建循环（每次动笔前先过两原则一问题）

| 轮次 | 本轮聚焦任务 |
|---|---|
| 第 1 轮 · 提问与对齐 | 梳理已知材料与缺口；向作者提问补齐缺失信息，确认体验方向、**角色卡预测输出方向**与本体/绿灯拆分清单 |
| 第 2 轮 · 泛化内核 | 撰写 `<角色名>.md` 的静态身份、外貌感官、九项判型、认知功能、`traits` 泛化倾向与 `speaking_style` 规律 |
| 第 3 轮 · 处事与生理原则 | 补齐泛化本体的 `relationships`、`behavior_logic`、`past_shaping`、`about_xxx` 与 `sexual_information` 客观档位 |
| 第 4 轮 · 条件绿灯分包 | 独立撰写 `<角色名>语料.md`、按需拆分的 `<角色名>过往事件.md`、阶段 `module` 与 `<角色名>亲密表现.md` |
| 第 5 轮 · 纯度终检 | 核查泛化本体零原句零死动作、条件绿灯校准声明完整、触发词与防递归配置准确 |
