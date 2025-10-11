---
title: Nginx 教程
createTime: 2024/11/5 14:28:56
permalink: /blog/k30z9hdj/
tags:
  - 部署
  - 后端
---

> nginx ("engine x") is an HTTP web server, reverse proxy, content cache, load balancer, TCP/UDP proxy server, and mail proxy server.

## 安装 Nginx

```bash
sudo apt update
sudo apt install nginx
```

## 配置 Nginx

Nginx 的配置文件一般位于 /etc/nginx/

其中 nginx.conf 是主配置文件（不管它）

首先在 sites-available 中创建一个文件配置你的虚拟主机

```bash
sudo vi /etc/nginx/sites-available/site.yourdomain.com
```

以下给出两个 sites-available 的示例：

### 直接转发某个前端项目（以 vue 为例）

> vue 项目打包后会生成一个 dist 文件夹，里面包含打包后的文件

所以我们只需要配置 nginx 将 root 指向 dist 文件夹，然后 index 指向 index.html 即可

```nginx
server {
    listen 80;
    server_name site.yourdomain.com www.site.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name site.yourdomain.com www.site.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    root /path/to/your/dist;
    index index.html;
    autoindex off;

    location ~* \.(?:ico|css|js|gif|jpe?g|png|woff2?|ttf|svg)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    error_page 404 /index.html;
}

```

只需要修改 `root` 、 `index` 和 `server_name` 即可

### 转发某个端口到 80

例如你有一个项目跑在 3000 端口，你可以通过配置 nginx 将 3000 端口转发到 80 端口

```nginx
server {
    listen 80;
    server_name site.yourdomain.com www.site.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name site.yourdomain.com www.site.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}

```

只需要修改 `proxy_pass` 和 `server_name` 即可

### 处理不同请求

值得注意的是，如果你在同一域名下搭建了例如静态页面及 api，你可以用 nginx 来配置处理不同的请求

```nginx
location ~ ^/(api|login) {
    proxy_pass http://127.0.0.1:8080;
    ...
}

location / {
    root /path/to/your/dist;
    ...
}
```

这段代码代表着 yourdomain.com/api 和 yourdomain.com/login 的请求会走上面的代理，而其它请求会走下方的静态页面

相信你可以注意到以下两个结论：

1. `location` 为从上到下匹配，所以你可以更改优先级
2. `nginx` 支持正则匹配

相信到这一步，你已经能初步理解其强大之处。

## 启用配置文件

```bash
sudo ln -s /etc/nginx/sites-available/site.yourdomain.com /etc/nginx/sites-enabled/site.yourdomain.com
```

这个命令是创建了一个软连接

意味着 nginx 会启用 site.yourdomain.com 这个配置文件

## 测试配置

```bash
sudo nginx -t
```

如果显示`syntax is ok`，则表示配置无误

如果报错了，可以使用`sudo systemctl status nginx`查看错误信息

## 重启 Nginx

```bash
sudo systemctl restart nginx
```

此时你就可以通过域名访问你的项目了
