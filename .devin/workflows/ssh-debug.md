---
description: 通过 SSH MCP 工具直接在远程节点上联调和配置，适用于排查服务故障、手动推送配置、验证变更
---

## 适用场景

- 节点上某个服务启动失败，需要查日志
- 需要临时修改配置文件并验证效果
- 向节点推送证书、密钥等文件内容
- 在变更 Terraform/Nomad Job 前先在节点上手动验证可行性

## 工具选择

| 场景 | 工具 |
|------|------|
| 执行命令、查看状态 | `mcp9_remote-ssh` |
| 精确替换文件中某段内容 | `mcp9_ssh-edit-block` |
| 完整覆写/追加文件 | `mcp9_ssh-write-chunk` |
| 读取大文件指定行 | `mcp9_ssh-read-lines` |
| 在远程目录 grep | `mcp9_ssh-search-code` |

私钥路径统一用 `/Users/zhangdi/.ssh/sshone`。

## 节点信息

| 节点 | IP | user |
|------|-----|------|
| 杭州（控制节点） | 114.55.97.84 | root |
| 西班牙 | 65.20.111.92 | root |
| 圣何塞（手动节点） | 104.168.94.122 | root |

## 标准联调步骤

### 1. 先读现状

```
# 查看配置文件
mcp9_remote-ssh: cat /etc/nomad.d/nomad.hcl

# 查看服务状态
mcp9_remote-ssh: systemctl is-active nomad && systemctl status nomad --no-pager -n 20
```

### 2. 查日志定位问题

```
# 最近 30 条，只看 ERROR/WARN
mcp9_remote-ssh: journalctl -u nomad -n 30 --no-pager | grep -E "ERROR|WARN|error|failed"
```

### 3. 修改配置

小改动用 `mcp9_ssh-edit-block`（精确替换，不破坏其他内容）：
```
oldText: 原有内容（需完全匹配）
newText: 新内容
```

整块覆写用 `mcp9_ssh-write-chunk`（mode=rewrite）。

追加内容用 `mcp9_ssh-write-chunk`（mode=append）。

### 4. 验证后再重启

先做 dry-run 或 validate，再重启服务：
```
# Nomad 配置检查
mcp9_remote-ssh: nomad agent -config /etc/nomad.d/nomad.hcl -dev 2>&1 | head -5

# 重启并观察
mcp9_remote-ssh: systemctl restart nomad && sleep 5 && systemctl is-active nomad
```

### 5. 跨节点传文件

节点间不一定互通 SSH 私钥，推荐做法：

1. 在来源节点生成内容（如 Vault 签发证书）
2. 若内容是 JSON/文本，用 `mcp9_remote-ssh` 读出后，再用 `mcp9_ssh-write-chunk` 写入目标节点
3. 若内容有特殊字符（证书 PEM），用 `base64 -w0` 编码后传输，目标节点 `base64 -d` 还原
4. **更好的做法**：在目标节点上直接调 API（curl Vault）自己签发，避免传输私钥

```bash
# 目标节点上直接向 Vault API 申请证书（推荐）
curl -sf \
  -H "X-Vault-Token: <token>" \
  -X POST \
  -d '{"common_name":"...", "ip_sans":"...", "ttl":"8760h"}' \
  http://114.55.97.84:8200/v1/pki/nomad/issue/nomad-client > /tmp/cert.json
```

### 6. 多节点并行操作

独立操作可以并行调用多个 `mcp9_remote-ssh`，节省时间：
- 同时在两台节点重启服务
- 同时读取多台节点的配置文件对比

有依赖关系的（如先改 server 再改 client）必须串行。

## 注意事项

- 修改服务配置前先备份：`cp /etc/nomad.d/nomad.hcl /etc/nomad.d/nomad.hcl.bak`
- 配置变更要同步更新 cloud-init 模板，保证新节点一致
- 所有手动变更最终要落回 git（terraform/nomad job 文件），避免配置漂移
