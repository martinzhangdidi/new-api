# API 线路 SSE 流式测试方案

## 为什么用 SSE（流式）？

AI API 客户端（Hermes、OpenCat 等）**默认全部用 SSE 流式**（`stream=true`）。流式的核心优势：

- **实时显示**：用户逐字看到回答，体验好
- **绕过总超时**：代理层的 `proxy_read_timeout` 只控制**两次 chunk 之间的空闲时间**，不是整个请求总时长
- **长生成无压力**：1000 token 和 10000 token 对代理层来说一样，只要 chunk 不停发就不会超时

## 文件说明

| 文件 | 作用 |
|------|------|
| `prompts.json` | **测试配置**：线路定义 + Prompt 场景，改这里就能自定义测试 |
| `test_sse.py` | **测试脚本**：读取 prompts.json，跑 SSE 流式测试 |

## 配置结构（prompts.json）

```json
{
  "routes": [
    {"name": "api-us.tenkb.com", "url": "...", "token_env": "NEWAPI_TOKEN", "model": "deepseek-v4-flash"},
    ...
  ],
  "tests": [
    {"id": "ping", "name": "连通性测试", "messages": [...], "max_tokens": 10, "timeout": 30},
    {"id": "large", "name": "大 token 测试", "messages": [...], "max_tokens": 8192, "timeout": 300},
    ...
  ]
}
```

### 4 个测试场景

| 测试 | max_tokens | Prompt | 测试目的 |
|------|-----------|--------|---------|
| **连通性** | 10 | `"Say hello"` | 验证线路 HTTP 200，测首 token 延迟 TTFT |
| **短生成** | 256 | 3 句话总结 | 测一般生成速度 |
| **中长生成** | 2048 | 医疗AI 1500字 | 测流式传输稳定性 |
| **大 token** | 8192 | 医疗AI 5000字 | 验证 >60s 长生成不会 504 |

## 运行方式

```bash
# 在圣何塞服务器上
export NEWAPI_TOKEN="sk-..."
export DEEPSEEK_TOKEN="sk-..."
cd /root/testspeed
python3 test_sse.py
```

## 输出示例

```
==========================================================================================
SSE STREAM TEST: 大 token 测试
==========================================================================================
  线路                                       Code     TTFT     Total    Chunks   Tokens   Speed      Status
------------------------------------------------------------------------------------------
  api-us.tenkb.com                         200      1.269s  101.728s 8192     13550    133.2 t/s  OK
  newapi.sdkgpt.com                        200      1.328s  82.496s  5117     8175     99.1 t/s   OK
  api.deepseek.com                         200      0.505s  76.751s  5927     10582    137.9 t/s  OK
```

## 指标说明

| 指标 | 含义 | 正常范围 |
|------|------|---------|
| **TTFT** (Time To First Token) | 发出请求到收到第一个 chunk 的时间 | 0.5-2s |
| **Total** | 整个流式请求总耗时 | 随 token 数变化 |
| **Chunks** | 收到的 SSE chunk 数量 | 越多越流畅 |
| **Speed** | 估算生成速度 tokens/s | 60-140 t/s |
| **Status** | OK = 流式完成，FAIL = 报错/超时 | 全 OK |

## 关键结论

- **SSE 流式下所有线路都能跑大 token**：`api-us.tenkb.com` 101.7s 也 OK，Bunny CDN 300s 配置生效
- **代理层开销极小**：速度和官方直连差距 <30%
- **非流式仍有限制**：`stream=false` 走 Bunny CDN 会踩 300s 总超时（非流式总时长 = 整个响应时间）
- **推流式是正确姿势**：AI API 客户端默认 SSE，也是行业最佳实践
