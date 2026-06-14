#!/usr/bin/env python3
"""
API 线路 SSE 流式测试工具

用法:
    export NEWAPI_TOKEN="sk-..."
    export DEEPSEEK_TOKEN="sk-..."
    python3 test_sse.py

测试所有 routes 和 prompts.json 中配置的测试场景，全部使用 SSE 流式。
"""

import json
import os
import ssl
import time
import urllib.request

CONFIG_FILE = os.path.join(os.path.dirname(__file__), "prompts.json")
UA = "testspeed/1.0"
ssl_ctx = ssl.create_default_context()


def load_config():
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def get_token(env_name):
    token = os.getenv(env_name, "")
    if not token:
        raise RuntimeError(f"环境变量 {env_name} 未设置")
    return token


def health_check(name, url, timeout=10):
    """健康检查（非流式 GET）"""
    req = urllib.request.Request(
        f"{url}/api/status",
        headers={"User-Agent": UA},
        method="GET",
    )
    start = time.time()
    try:
        resp = urllib.request.urlopen(req, context=ssl_ctx, timeout=timeout)
        code = resp.status
        body = resp.read(512).decode("utf-8", "ignore")
        elapsed = time.time() - start
        return {
            "name": name,
            "code": code,
            "time": elapsed,
            "body": body[:60],
            "ok": True,
        }
    except Exception as e:
        elapsed = time.time() - start
        return {
            "name": name,
            "code": str(e),
            "time": elapsed,
            "body": "",
            "ok": False,
        }


def sse_chat(name, url, token, model, messages, max_tokens, timeout):
    """SSE 流式 Chat Completion 测试"""
    payload = json.dumps({
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "stream": True,
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{url}/v1/chat/completions",
        data=payload,
        headers={
            "User-Agent": UA,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        },
        method="POST",
    )

    start = time.time()
    first_byte_time = None
    content = ""
    reasoning = ""
    chunks = 0

    try:
        resp = urllib.request.urlopen(req, context=ssl_ctx, timeout=timeout)
        code = resp.status

        # 逐行读取 SSE 流
        for raw in resp:
            line = raw.decode("utf-8", "ignore").strip()
            if not line.startswith("data:"):
                continue

            data = line[5:].strip()
            if data == "[DONE]":
                break

            if first_byte_time is None:
                first_byte_time = time.time()
                chunks = 1
            else:
                chunks += 1

            try:
                obj = json.loads(data)
                for choice in obj.get("choices", []):
                    delta = choice.get("delta", {})
                    content += delta.get("content", "") or ""
                    reasoning += delta.get("reasoning_content", "") or ""
            except json.JSONDecodeError:
                pass

        elapsed = time.time() - start
        ttft = (first_byte_time - start) if first_byte_time else 0

        # 估算 token 数（中文字符 ≈ 1 token，英文 ≈ 4 chars/token）
        est_tokens = max(len(content), len(reasoning))  # 粗略估计

        return {
            "name": name,
            "code": code,
            "ok": True,
            "ttft": ttft,
            "total": elapsed,
            "chunks": chunks,
            "content_len": len(content),
            "reasoning_len": len(reasoning),
            "est_tokens": est_tokens,
            "speed": est_tokens / elapsed if elapsed > 0 else 0,
            "content_preview": content[:100],
            "error": "",
        }

    except Exception as e:
        elapsed = time.time() - start
        return {
            "name": name,
            "code": str(e),
            "ok": False,
            "ttft": 0,
            "total": elapsed,
            "chunks": 0,
            "content_len": 0,
            "reasoning_len": 0,
            "est_tokens": 0,
            "speed": 0,
            "content_preview": "",
            "error": str(e),
        }


def print_header(text):
    print("=" * 90)
    print(text)
    print("=" * 90)


def print_health(results):
    print_header("HEALTH CHECK (/api/status)")
    for r in results:
        status = "OK" if r["ok"] else "FAIL"
        print(f"  {r['name']:<40} | {status:<6} | {r['time']:.3f}s | {r['body']}")
    print()


def print_sse_results(test_name, results):
    print_header(f"SSE STREAM TEST: {test_name}")
    print(f"  {'线路':<40} {'Code':<8} {'TTFT':<8} {'Total':<8} {'Chunks':<8} {'Tokens':<8} {'Speed':<10} {'Status'}")
    print("-" * 90)
    for r in results:
        status = "OK" if r["ok"] else "FAIL"
        print(
            f"  {r['name']:<40} "
            f"{str(r['code']):<8} "
            f"{r['ttft']:.3f}s  "
            f"{r['total']:.3f}s  "
            f"{r['chunks']:<8} "
            f"{r['est_tokens']:<8} "
            f"{r['speed']:.1f} t/s   "
            f"{status}"
        )
        if r["reasoning_len"] > 0:
            print(f"    reasoning={r['reasoning_len']} chars")
        if r["content_preview"]:
            print(f"    preview: {r['content_preview'][:80]}...")
        if r["error"]:
            print(f"    error: {r['error'][:80]}")
    print()


def main():
    cfg = load_config()
    routes = cfg["routes"]
    tests = cfg["tests"]

    # 加载 token
    tokens = {}
    for r in routes:
        env = r["token_env"]
        if env not in tokens:
            tokens[env] = get_token(env)

    # 健康检查
    health_results = []
    for r in routes:
        if "deepseek.com" in r["url"]:
            continue  # DeepSeek 没有 /api/status
        hr = health_check(r["name"], r["url"])
        health_results.append(hr)
    print_health(health_results)

    # SSE 流式测试
    for test in tests:
        results = []
        for r in routes:
            token = tokens[r["token_env"]]
            model = r.get("model", cfg.get("model_default", "deepseek-v4-flash"))
            sr = sse_chat(
                r["name"],
                r["url"],
                token,
                model,
                test["messages"],
                test["max_tokens"],
                test["timeout"],
            )
            results.append(sr)
        print_sse_results(test["name"], results)

    print("=" * 90)
    print("所有测试完成")
    print("=" * 90)
    return 0


if __name__ == "__main__":
    exit(main())
