# xAI Grok REST API 参考（脚本兜底用）

> 适用场景：服务 `scripts/grok_search.py` 的 REST 直连调用与排障；常规检索可直接调用 xai-search MCP。

## 模型速查

| 模型 | Input/1M | Output/1M | Context | 用途 |
| --- | --- | --- | --- | --- |
| grok-4-1-fast | $0.20 | $0.50 | 2M | 搜索默认（工具调用费固定，选用轻量模型控制 token 开销） |
| grok-4.3 | $1.25 | $2.50 | 1M | 通用旗舰 |
| grok-4.5 | $2.00 | $6.00 | 500K | 深度推理 |

- 工具调用费：`x_search` / `web_search` 均 **$0.005/次**（固定单价，按调用次数计费）。
- ≥200K prompt tokens 单价翻倍。

## Responses API 要点

- 端点：`POST https://api.x.ai/v1/responses`，认证头 `Authorization: Bearer $XAI_API_KEY`。
- `web_search` 与 `x_search` 属于服务端工具（server-side tools），在请求体 `tools=[...]` 中显式声明后由服务端直接执行检索。
- 引用链接位于响应顶层 `citations` 字段与输出消息的 `annotations` 数组内。

```bash
curl.exe https://api.x.ai/v1/responses -H "Authorization: Bearer %XAI_API_KEY%" -H "Content-Type: application/json" -d '{"model":"grok-4.3","input":"...","tools":[{"type":"x_search"}]}'
```

## 工具参数全集

- **x_search**：`allowed_x_handles` / `excluded_x_handles`（单次上限 10 个，二选一；MCP 与脚本统一按 ≤10 控制）、`from_date` / `to_date`（ISO 8601 `YYYY-MM-DD`，含起止日）、`enable_image_understanding`、`enable_video_understanding`。
- **web_search**：`allowed_domains` / `excluded_domains`（单次上限 5 个，二选一）、`enable_image_understanding`、`enable_image_search`。

## 排障对照

| 症状 | 原因与处理 |
| --- | --- |
| `disabled` | 密钥处于停用状态 → 前往 `console.x.ai` 对应 team 的 `api-keys` 页面启用或重建 |
| `used all available credits` | 该 team 额度耗尽 → 在 `console.x.ai` 的 `Billing` 页面查看余额并充值或切换 team |
| SSL EOF / 浏览器 Blocked 页 | 网络链路受阻 → 设置环境变量 `HTTPS_PROXY` 指向可用代理 |
| 401 no-credentials | 请求未携带有效密钥，网络通路本身正常 |
| 密钥状态查询 | 请求 `GET /v1/api-key` 查看返回的 `team_id` / `blocked` / `disabled` 字段 |
