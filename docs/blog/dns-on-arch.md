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

> [!INFO]
> 本文记录一次在 Arch Linux 上排查 `ssh` reset 的过程。问题表面看起来在 SSH，最后实际和 `systemd-resolved`、sing-box TUN、路由规则、DNS 转发链路有关。

## 问题

我一开始只是想从 macOS 连到一台 Arch Linux：

```bash
ssh honahec@10.x.x.x
```

然后得到了这个输出：

```text
kex_exchange_identification: read: Connection reset by peer
Connection reset by 10.x.x.x port 22
```

第一反应自然是 SSH 服务端出问题了。比如：

- `sshd` 没启动；
- `authorized_keys` 写错了；
- 目标机防火墙拦了 22 端口；
- 用户名不对；
- host key 又出了什么问题。

于是打开 debug：

```bash
ssh -vvv honahec@10.x.x.x
```

关键部分是：

```text
debug1: Connecting to 10.x.x.x [10.x.x.x] port 22.
debug1: Connection established.
debug1: Local version string SSH-2.0-OpenSSH_10.2
kex_exchange_identification: read: Connection reset by peer
```

这里其实已经能看出一点东西：`Connection established` 出现了，说明 TCP 连接已经建立。

如果是 `authorized_keys` 配置有问题，通常会继续走到认证阶段，然后出现类似 `Permission denied`。这里连服务端的 SSH banner 都没正常拿到，连接在更早的位置就断了。

> [!TIP]
>
> `kex_exchange_identification` 这个报错不一定和 SSH key 有关。
>
> 它只说明连接在 SSH 握手早期断了。这个位置前面还有 TCP、路由、TUN、透明代理、防火墙、DNS 等一堆东西。

## Linux 上的 DNS

后面真正暴露问题的是 DNS。

在 Linux 上，如果启用了 `systemd-resolved`，很多程序看到的 DNS 服务器会是：

```text
nameserver 127.0.0.53
```

这个地址不是一个外部 DNS，而是本机的 DNS stub listener。应用程序先把 DNS 查询发给本机的 `127.0.0.53`，再由 `systemd-resolved` 按当前网卡、搜索域、split DNS 等配置转发到真正的上游 DNS。

实际链路大概是：

```text
应用程序
→ /etc/resolv.conf
→ 127.0.0.53
→ systemd-resolved
→ 当前网卡 DNS / split DNS / 上游 DNS
```

这和 macOS 上的体验有点不一样。macOS 里通过 `scutil --dns` 或网络设置看到的往往更接近系统正在使用的 DNS 配置；Linux 这里很多程序只知道 `127.0.0.53`，真正的出口由 `systemd-resolved` 再决定。

这套设计本身没什么问题。问题出现在我的系统里还有 sing-box TUN。

## TUN 加进来以后

sing-box 的 TUN 模式会创建一个虚拟网卡，然后把系统流量接进 sing-box。之后 sing-box 再根据规则路由。

这类透明代理配置里最麻烦的地方一般不是“怎么把流量接进来”，而是这些问题：

```text
代理自己的连接要不要进 TUN？
loopback 流量要不要进 TUN？
局域网地址要不要直连？
DNS 查询由 systemd-resolved 处理，还是由 sing-box 处理？
被标记的包从哪里回来？
```

我当时有一条规则，大意是：

```text
127.0.0.0/8 不进入 TUN
```

这个规则看起来很正常。`127.0.0.0/8` 是 loopback，通常不应该被透明代理接管，否则很容易出现环路。

但这里有一个细节：`systemd-resolved` 的 stub 地址也是 loopback：

```text
127.0.0.53
```

于是 DNS 链路就变成了一个比较容易误判的状态：

```text
应用程序
→ 127.0.0.53
→ systemd-resolved
→ 上游 DNS / sing-box DNS / 网卡 DNS
```

与此同时，TUN 又在处理系统流量，路由规则还排除了 `127.0.0.0/8`。

这样一来，DNS、TUN、路由、mark、回包路径就不再是互相独立的几件事了。某一段看起来只是 DNS stub 的本机流量，后面可能会影响到真实出口；某一段看起来只是局域网直连的连接，也可能被 TUN 或 nftables 规则改写。

最后表现出来的错误就不一定是：

```text
DNS failed
```

修改任何配置的结果此时都很随机了）

## 这次实际发生了什么

我最后梳理出的链路大概是这样：

```text
macOS 发起 SSH
→ 目标是 10.x.x.x:22
→ 目标机 / 网络环境中启用了 sing-box TUN
→ Linux DNS 由 systemd-resolved 统一管理
→ 应用侧看到的 DNS 是 127.0.0.53
→ TUN 规则中排除了 127.0.0.0/8
→ DNS 转发、TUN 接管、局域网直连、回包路径之间出现不一致
→ 部分连接在握手阶段被 reset
→ SSH 显示 kex_exchange_identification reset
```

这里需要单独说一下：命令里写的是 IP：

```bash
ssh honahec@10.x.x.x
```

所以 SSH 客户端本身不需要解析 `10.x.x.x` 这个目标。

但是在启用系统级 TUN / 透明代理之后，DNS、路由、mark、回包路径经常会被放进同一个系统里处，此时 DNS 配置就不只是“域名能不能解析”的问题了。

## 怎么排查

这类问题只看 `ssh -vvv` 不够。`ssh -vvv` 能告诉我们 SSH 卡在哪一层，但不能告诉我们 Linux 内核把包送到了哪里。

我后面用到的排查顺序大概是这样。

先确认 SSH 断在哪里：

```bash
ssh -vvv honahec@10.x.x.x
```

如果看到：

```text
Connection established.
Local version string SSH-2.0-OpenSSH_10.2
```

说明 TCP 已经连上了。

再看 22 端口有没有正常返回 SSH banner：

```bash
nc -v 10.x.x.x 22
```

正常情况下应该能看到类似：

```text
SSH-2.0-OpenSSH_...
```

如果这里也直接断，就说明问题还在 SSH 协议握手之前。

然后检查 DNS 到底由谁管理：

```bash
resolvectl status
cat /etc/resolv.conf
readlink -f /etc/resolv.conf
```

如果 `/etc/resolv.conf` 里是：

```text
nameserver 127.0.0.53
```

说明应用程序看到的是 systemd-resolved 的本机入口。

继续看路由：

```bash
ip route
ip rule
ip route get 10.x.x.x
```

看 nftables：

```bash
sudo nft list ruleset
```

如果用了 TUN / TProxy，直接 trace 会更有效：

```bash
sudo nft monitor trace
```

然后配合抓包：

```bash
sudo tcpdump -ni any port 53
sudo tcpdump -ni any host 10.x.x.x
```

`nft monitor trace` 很有用，因为它可以看到包实际命中了哪条 chain、哪条 rule，最后是 `accept`、`drop`、`return`、`mark`，还是被 tproxy 处理。

> [!WARNING]
>
> 透明代理问题不能凭空修复。
>
> 以为某个网段被直连了，实际可能先进了某条 chain，又被 mark，然后走了另一个路由表。trace 一下会快很多。

<LinkCard
  title="Configuring transparent proxy with nftables"
  href="https://prince213.top/blog/2026/01/05/tproxy/"
  description="这篇文章对 TProxy、nftables trace、policy routing 的排查思路很有帮助。"
/>

## 参考资料

- [systemd-resolved.service(8)](https://man.archlinux.org/man/systemd-resolved.service.8.en)
- [sing-box Tun](https://sing-box.sagernet.org/configuration/inbound/tun/)
- [sing-box Route](https://sing-box.sagernet.org/configuration/route/)
- [sing-box Resolved](https://sing-box.sagernet.org/configuration/service/resolved/)
- [Transparent proxy support - Linux Kernel Documentation](https://docs.kernel.org/networking/tproxy.html)
- [Configuring transparent proxy with nftables](https://prince213.top/blog/2026/01/05/tproxy/)
