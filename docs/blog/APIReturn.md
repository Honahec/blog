---
title: API 返回值
createTime: 2025/9/30 18:10:23
permalink: /blog/yabt7ynj/
tags:
  - debug
---

> 这是一次 debug 经历

## 事件经过

我正在部署一个本地测试通过的小项目，其当时只存在三个 API，分别为 /login /sign /links，其中 /links 会返回一个列表

我本地可以正常对改列表增删，返回其最新值，可云端请求 /links 永远返回一个 json 套空列表，使用另外两个 API 又都正常

## debug 经过

在看到这一现象时我已经很蒙了，首先怀疑了一下 nginx 配置

```nginx
location ~ ^/(sign|login|links) {
    proxy_pass http://127.0.0.1:xxxx;
    ...
}
```

这看起来很正常，起码要炸也是三个一起炸

随后我怀疑难道是没有数据库写入权限？但很快排除了这一点

我很无力，因为本地一切正常，于是常规添加了部分调试代码，不出所料地毫无发现

我认为问题还是出现在服务器上，于是去查询了 nginx 监听日志 `tail -f /var/log/nginx/access.log`

初见端倪，仅有 /sign 和 /login 请求经过了 nginx，那 /links 去哪了呢？

## 结论

答案是我配置了 cdn 而忘记它有 API 接口保留了缓存，所以 /links 请求直接被 cdn 返回了最开始的记录

综上，在有 API 服务的情况下务必检查 cdn 配置

> 虽然这是一次很蠢的经历，但当忘记修改 cdn 而在这上面 debug 是极其痛苦且不解的，故记录
