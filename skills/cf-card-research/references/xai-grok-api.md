# xAI Grok REST API 参考（脚本兜底用）

> 日常搜索走 xai-search MCP，不用读本文。本文只服务 `scripts/grok_search.py` 兜底和排障。

## 模型速查

| 模型 | Input/1M | Output/1M | Context | 用途 |
| --- | --- | --- | --- | --- |
| grok-4-1-fast | $0.20 | $0.50 | 2M | 搜索默认（工具费才是大头，token 用便宜的） |
| grok-4.3 | $1.25 | $2.50 | 1M | 通用旗舰 |
| grok-4.5 | $2.00 | $6.00 | 500K | 最强推理 |

- 工具调用费：x_search / web_search 均 **$0.005/次**（固定，与返回帖数无关）。
- ≥200K prompt tokens 价格翻倍。

## Responses API 要点

- 端点：`POST https://api.x.ai/v1/responses`，认证 `Authorization: Bearer $XAI_API_KEY`。
- `web_search` / `x_search` 是 **server-side tools**：必须在请求体 `tools=[...]` 里显式声明才会搜，不是 chat/completions 的 function calling。
- 引用在响应 `citations` 顶层字段 + output message 的 `annotations` 里。

```bash
curl.exe https://api.x.ai/v1/responses -H "Authorization: Bearer %XAI_API_KEY%" -H "Content-Type: application/json" -d "{\"model\":\"grok-4.3\",\"input\":\"...\",\"tools\":[{\"type\":\"x_search\"}]}"
```

## 工具参数全集

**x_search**：`allowed_x_handles` / `excluded_x_handles`（≤20 API 层，互斥）、`from_date` / `to_date`（ISO8601 含当天）、`enable_image_understanding`、`enable_video_understanding`（仅 x_search 有）。

**web_search**：`allowed_domains` / `excluded_domains`（≤5，互斥）、`enable_image_understanding`、`enable_image_search`。

## 排障

| 症状 | 原因/处理 |
| --- | --- |
| `disabled` | key 被禁用 → console.x.ai 该 team 的 api-keys 页启用或重建 |
| `used all available credits` | team 钱包空（余额无 API，网页 Billing 看）→ 充值或换 team |
| SSL EOF / 浏览器 Blocked 页 | 区域拦截 → 设环境变量 `HTTPS_PROXY` 指向自己的代理 |
| 401 no-credentials | 没带 key，通路正常 |
| key 归属查询 | `GET /v1/api-key` 返回 team_id / blocked / disabled 状态 |
