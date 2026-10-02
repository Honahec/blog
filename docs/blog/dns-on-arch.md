---
title: 一次 SSH reset 背后的 Linux DNS 与 TUN 排查
createTime: 2026/06/08 19:31:00
permalink: /blog/9qj8a54e/
tags:
  - Linux
  - DNS
  - Network
  - Sing-box
  - Infra
---

## SSH 连上后被 reset

从 macOS 连接 Arch Linux 时，SSH 报错：

```text
kex_exchange_identification: read: Connection reset by peer
Connection reset by 10.x.x.x port 22
```

我先用 `ssh -vvv honahec@10.x.x.x` 看连接断在哪里：

```text
debug1: Connecting to 10.x.x.x [10.x.x.x] port 22.
debug1: Connection established.
debug1: Local version string SSH-2.0-OpenSSH_10.2
kex_exchange_identification: read: Connection reset by peer
```

TCP 已经建立，但还没收到服务端的 SSH banner，连接就断了。此时还没进入认证阶段，先查网络路径比改 `authorized_keys` 更有意义。

也可以用 `nc -v 10.x.x.x 22` 检查服务端是否返回 `SSH-2.0-OpenSSH_...`。

## systemd-resolved 与 TUN

后续排查转向了 DNS 和 sing-box TUN。当时 Arch 上启用了 `systemd-resolved`，`/etc/resolv.conf` 里是：

```text
nameserver 127.0.0.53
```

`127.0.0.53` 是本机的 DNS stub listener。使用这个入口的查询先交给 `systemd-resolved`，再由它按网卡和域的配置选择上游。

我的 TUN 规则里排除了 `127.0.0.0/8`，其中也包括 `127.0.0.53`。不过，本机 stub 和 `systemd-resolved` 发往上游的请求是两段不同的流量：排除了前者，不代表后者也绕过 TUN。排查时需要分别确认它们走了哪条路径。

这次 SSH 命令用的是 IP，客户端无需解析目标地址。仅凭 DNS 配置和 loopback 排除规则，还不能解释连接为什么被 reset；具体原因仍要结合路由、规则命中和抓包结果判断。

## 排查命令

在 macOS 上用 `ssh -vvv` 和 `nc` 确认现象后，下面这些检查在 Arch 上进行。

先看 DNS 入口和上游配置：

```bash
cat /etc/resolv.conf
readlink -f /etc/resolv.conf
resolvectl status
```

再看路由、策略路由和 nftables 规则：

```bash
ip route
ip rule
ip route get <macOS 的 IP>
sudo nft list ruleset
```

这里查的是 Arch 回到 macOS 的路径。配合抓包，可以观察 DNS 请求和 SSH 流量：

```bash
sudo tcpdump -ni any port 53
sudo tcpdump -ni any 'host <macOS 的 IP> and tcp port 22'
```

需要追踪 nftables 规则命中时，先用匹配目标流量的规则设置 `meta nftrace set 1`，再运行：

```bash
sudo nft monitor trace
```

它能显示包经过的 chain、命中的规则和 verdict。只运行 monitor，不会自动启用 tracing；排查结束后也要移除临时 trace 规则。

<LinkCard
  title="Configuring transparent proxy with nftables"
  href="https://prince213.top/blog/2026/01/05/tproxy/"
  description="TProxy、nftables trace 和策略路由的配置与排查。"
/>

## 参考资料

- [systemd-resolved.service(8)](https://man.archlinux.org/man/systemd-resolved.service.8.en)
- [sing-box Tun](https://sing-box.sagernet.org/configuration/inbound/tun/)
- [sing-box Route](https://sing-box.sagernet.org/configuration/route/)
- [sing-box Resolved](https://sing-box.sagernet.org/configuration/service/resolved/)
- [Transparent proxy support - Linux Kernel Documentation](https://docs.kernel.org/networking/tproxy.html)
- [nftables tracing](https://wiki.nftables.org/wiki-nftables/index.php/Ruleset_debug/tracing)
