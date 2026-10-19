# 出处

酒馆源码取自 SillyTavern `release` 分支，行号会随版本漂移，以函数名为准。

## 规范
- V2：malfoyslastname/character-card-spec-v2 `spec_v2.md`：字段表、`system_prompt` / `post_history_instructions` 替换与 `{{original}}`、`creator_notes` 不进提示词、`alternate_greetings` 为滑动切换、`extensions` 必须默认 `{}` 且不删未知键。
- V3：kwaroran/character-card-spec-v3 `SPEC_V3.md`：PNG `ccv3` 数据块、两块并存时用 `ccv3`、CHARX 结构、V3 新字段。

## 酒馆源码
| 结论 | 位置 |
|---|---|
| PNG 读取 ccv3 优先、写出时两块都写 | `src/character-card-parser.js` `read` / `write` |
| 写 PNG 时先删原有 `chara` / `ccv3` 块，在结尾块前插入 `chara`，再插一份只改了 `spec` / `spec_version` 的 `ccv3`（`embed-png.ps1` 照此实现） | `src/character-card-parser.js` `write`（第 15–39 行） |
| JSON 导入分三路（spec / name / char_name） | `src/endpoints/characters.js` `importFromJson` |
| 导入后以 `data.*` 为准、`talkativeness` 默认 0.5、`fav` 默认 false | `src/endpoints/characters.js` `readFromV2` |
| 酒馆内部存 V2、`alternate_greetings` 字符串会被包成数组、`depth_prompt` 默认 4 / system | `src/endpoints/characters.js` `charaFormatData` |
| 各字段进提示词的取值、`system_prompt` / 历史后指令受开关控制 | `public/script.js` `getCharacterCardFieldsLazy` |
| 两个开关默认开 | `public/scripts/power-user.js` `prefer_character_prompt` / `prefer_character_jailbreak` |
| 对话补全里「禁止覆盖」挡住角色卡替换 | `public/scripts/openai.js` `preparePromptsForChatCompletion`（`forbid_overrides`） |
| 首条为空时第一条备选顶上、开场白过 AI 输出正则 | `public/script.js` `getFirstMessage` |

## 实物对照
- 参考成品卡：任选一张公开发布、带内嵌世界书和多条备选开场白的 V2 卡（外层带 `name`）。
