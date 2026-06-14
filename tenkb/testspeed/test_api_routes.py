#!/usr/bin/env python3
"""Test 4 API routes from San Jose server"""
import urllib.request
import urllib.error
import json
import time
import ssl
import os

# Tokens (override with env vars)
NEWAPI_TOKEN = os.getenv("NEWAPI_TOKEN", "")
DEEPSEEK_TOKEN = os.getenv("DEEPSEEK_TOKEN", "")

ssl_ctx = ssl.create_default_context()

UA = "testspeed/1.0"

def health_check(name, url, headers=None):
    h = headers or {}
    h.setdefault("User-Agent", UA)
    req = urllib.request.Request(url, headers=h, method="GET")
    start = time.time()
    try:
        resp = urllib.request.urlopen(req, context=ssl_ctx, timeout=10)
        code = resp.status
        body = resp.read(1024).decode("utf-8", "ignore")
        elapsed = time.time() - start
        return {"name": name, "url": url, "code": code, "time": f"{elapsed:.3f}s", "body": body[:80]}
    except Exception as e:
        elapsed = time.time() - start
        return {"name": name, "url": url, "code": str(e), "time": f"{elapsed:.3f}s", "body": ""}

def chat_test(name, url, token, model, headers=None):
    h = headers or {}
    h.setdefault("User-Agent", UA)
    h["Authorization"] = f"Bearer {token}"
    h["Content-Type"] = "application/json"
    payload = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": "Say hello in one word"}],
        "max_tokens": 10,
        "stream": False
    }).encode()
    req = urllib.request.Request(url, data=payload, headers=h, method="POST")
    start = time.time()
    try:
        resp = urllib.request.urlopen(req, context=ssl_ctx, timeout=30)
        code = resp.status
        body = resp.read().decode("utf-8", "ignore")
        elapsed = time.time() - start
        try:
            parsed = json.loads(body)
            content = parsed.get("choices", [{}])[0].get("message", {}).get("content", "N/A")
        except:
            content = body[:100]
        return {"name": name, "url": url, "code": code, "time": f"{elapsed:.3f}s", "content": content}
    except Exception as e:
        elapsed = time.time() - start
        return {"name": name, "url": url, "code": str(e), "time": f"{elapsed:.3f}s", "content": ""}

def main():
    if not NEWAPI_TOKEN or not DEEPSEEK_TOKEN:
        print("ERROR: Set NEWAPI_TOKEN and DEEPSEEK_TOKEN env vars")
        print("Example:")
        print("  export NEWAPI_TOKEN='sk-...'")
        print("  export DEEPSEEK_TOKEN='sk-...'")
        return 1

    # NOTE: 104.168.94.122 IP 直连不支持 HTTPS 测试
    # Caddy 配置了域名证书，IP 访问时 TLS 握手阶段就被拒绝（alert internal error）
    # 即使 curl -k 也通不过，因为服务器根本不发证书
    routes = [
        ("api-us.tenkb.com", "https://api-us.tenkb.com", NEWAPI_TOKEN, "kimi-k2.5", {}),
        ("newapi.sdkgpt.com", "https://newapi.sdkgpt.com", NEWAPI_TOKEN, "kimi-k2.5", {}),
        ("api.deepseek.com", "https://api.deepseek.com", DEEPSEEK_TOKEN, "deepseek-chat", {}),
    ]

    print("=" * 80)
    print("HEALTH CHECK (/api/status)")
    print("=" * 80)
    for name, url, _, _, hdrs in routes:
        if "deepseek.com" in url:
            continue
        r = health_check(name, url + "/api/status", hdrs)
        print(f"{r['name']:<40} | HTTP {r['code']:<10} | {r['time']} | {r['body']}")

    print()
    print("=" * 80)
    print("CHAT COMPLETION (/v1/chat/completions)")
    print("=" * 80)
    for name, url, token, model, hdrs in routes:
        r = chat_test(name, url + "/v1/chat/completions", token, model, hdrs)
        print(f"{r['name']:<40} | HTTP {r['code']:<10} | {r['time']} | {r['content']}")

    print()
    print("=" * 80)
    print("DONE")
    print("=" * 80)
    return 0

if __name__ == "__main__":
    exit(main())
