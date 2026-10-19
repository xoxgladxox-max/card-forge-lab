# -*- coding: utf-8 -*-
"""grok_search.py — xAI Grok 实时搜索 CLI（REST 直连，无需 xai_sdk）

用法示例：
  python grok_search.py "<作品名> 世界观 <角色名>是谁"
  python grok_search.py "<角色名> 最新情报" --tool x --from YYYY-MM-DD
  python grok_search.py "查 pixiv 上的标签" --tool web --domains dic.pixiv.net
  python grok_search.py "..." --tool both --model grok-4.5 --json

依赖：requests（pip install requests）
环境变量：XAI_API_KEY（必需）；HTTPS_PROXY（可选，x.ai 部分地区需代理）
"""
import argparse
import json
import os
import sys

import requests

API_URL = "https://api.x.ai/v1/responses"
DEFAULT_MODEL = "grok-4.3"  # 性价比最优；最强推理用 grok-4.5；省钱用 grok-4.1-fast

SYSTEM_PROMPT = (
    "你是一个会主动使用搜索工具获取最新信息的研究助手。\n"
    "遇到以下情况必须优先搜索：新作品/新角色/新设定、『是谁』『世界观』"
    "『最近怎么样』类问题、你自己的知识可能过时或不准时。\n"
    "搜索时使用精准关键词组合（含原文名/日文名/中文名），从多角度拆分搜索词。\n"
    "回答用中文，结构化整理，注明信息来源。不确定的信息要标注。"
)


def build_tools(args):
    tools = []
    if args.tool in ("web", "both"):
        t = {"type": "web_search"}
        if args.domains:
            t["allowed_domains"] = args.domains
        if args.exclude_domains:
            t["excluded_domains"] = args.exclude_domains
        tools.append(t)
    if args.tool in ("x", "both"):
        t = {"type": "x_search"}
        if args.handles:
            t["allowed_x_handles"] = args.handles
        if args.exclude_handles:
            t["excluded_x_handles"] = args.exclude_handles
        if args.from_date:
            t["from_date"] = args.from_date
        if args.to_date:
            t["to_date"] = args.to_date
        tools.append(t)
    return tools


def extract_output(data):
    """兼容解析 Responses API 返回：正文 + citations"""
    texts, citations = [], []
    for c in data.get("citations") or []:
        citations.append(c if isinstance(c, str) else json.dumps(c, ensure_ascii=False))
    for item in data.get("output") or []:
        if item.get("type") == "message":
            for part in item.get("content") or []:
                if part.get("type") in ("output_text", "text"):
                    texts.append(part.get("text", ""))
                    for ann in part.get("annotations") or []:
                        url = ann.get("url") or ann.get("uri")
                        if url:
                            citations.append(url)
    if not texts and data.get("output_text"):
        texts.append(data["output_text"])
    seen, uniq = set(), []
    for c in citations:
        if c not in seen:
            seen.add(c)
            uniq.append(c)
    return "\n".join(texts), uniq


def main():
    ap = argparse.ArgumentParser(description="xAI Grok 实时搜索（web_search / x_search）")
    ap.add_argument("query", help="要搜索/提问的内容")
    ap.add_argument("--tool", choices=["web", "x", "both"], default="web",
                    help="启用哪种搜索（默认 web）")
    ap.add_argument("--model", default=DEFAULT_MODEL,
                    help=f"模型（默认 {DEFAULT_MODEL}；可选 grok-4.5 / grok-4.1-fast）")
    ap.add_argument("--domains", nargs="*", help="web_search 只搜这些域名（≤5）")
    ap.add_argument("--exclude-domains", nargs="*", help="web_search 排除域名（≤5）")
    ap.add_argument("--handles", nargs="*", help="x_search 只搜这些账号（≤20，不带@）")
    ap.add_argument("--exclude-handles", nargs="*", help="x_search 排除账号（≤20）")
    ap.add_argument("--from", dest="from_date", help="x_search 起始日期 YYYY-MM-DD")
    ap.add_argument("--to", dest="to_date", help="x_search 截止日期 YYYY-MM-DD")
    ap.add_argument("--system", default=SYSTEM_PROMPT, help="自定义 system prompt")
    ap.add_argument("--json", action="store_true", help="输出原始 JSON 响应")
    ap.add_argument("--timeout", type=int, default=300, help="请求超时秒数（默认300）")
    args = ap.parse_args()

    api_key = os.environ.get("XAI_API_KEY")
    if not api_key:
        print("错误：未设置环境变量 XAI_API_KEY", file=sys.stderr)
        sys.exit(1)

    payload = {
        "model": args.model,
        "input": [
            {"role": "system", "content": args.system},
            {"role": "user", "content": args.query},
        ],
        "tools": build_tools(args),
    }

    try:
        resp = requests.post(
            API_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=args.timeout,
        )
    except requests.RequestException as e:
        print(f"请求失败：{e}", file=sys.stderr)
        print("提示：x.ai 部分地区需代理，可设置 HTTPS_PROXY 环境变量", file=sys.stderr)
        sys.exit(2)

    if resp.status_code != 200:
        print(f"HTTP {resp.status_code}: {resp.text[:2000]}", file=sys.stderr)
        if resp.status_code == 403 or "Blocked" in resp.text[:500]:
            print("提示：疑似 IP 被区域封锁，请挂代理后重试（HTTPS_PROXY）", file=sys.stderr)
        sys.exit(3)

    data = resp.json()
    if args.json:
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return

    text, citations = extract_output(data)
    print(text if text.strip() else "[未能解析出正文，加 --json 查看原始响应]")
    if citations:
        print("\n--- 引用来源 ---")
        for i, c in enumerate(citations, 1):
            print(f"[{i}] {c}")
    usage = data.get("usage") or {}
    if usage:
        print(f"\n--- tokens: in={usage.get('input_tokens', '?')} "
              f"out={usage.get('output_tokens', '?')} ---", file=sys.stderr)


if __name__ == "__main__":
    if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    main()
