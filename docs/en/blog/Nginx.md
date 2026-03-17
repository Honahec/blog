---
title: Nginx Tutorial
createTime: 2024/11/5 14:28:56
permalink: /en/blog/k30z9hdj/
tags:
  - Deployment
  - Backend
---

> nginx ("engine x") is an HTTP web server, reverse proxy, content cache, load balancer, TCP/UDP proxy server, and mail proxy server.

## Installing Nginx

```bash
sudo apt update
sudo apt install nginx
```

## Configuring Nginx

Nginx configuration files are typically located in /etc/nginx/

The nginx.conf is the main configuration file (leave it alone)

First, create a file in sites-available to configure your virtual host

```bash
sudo vi /etc/nginx/sites-available/site.yourdomain.com
```

Here are two examples of sites-available configurations:

### Directly Serving a Frontend Project (using Vue as an example)

> After building a Vue project, a dist folder is generated containing the packaged files

So we just need to configure nginx to point root to the dist folder and index to index.html

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

Just modify `root`, `index`, and `server_name`

### Forwarding a Port to 80

For example, if you have a project running on port 3000, you can configure nginx to forward port 3000 to port 80

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

Just modify `proxy_pass` and `server_name`

### Handling Different Requests
It's worth noting that if you're hosting both static pages and an API under the same domain, you can use nginx to configure handling for different requests:

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

This code means that requests to yourdomain.com/api and yourdomain.com/login will go through the proxy above, while other requests will serve the static pages below.

You should notice the following two conclusions:

1. `location` matches from top to bottom, so you can change the priority
2. `nginx` supports regular expression matching

By this step, you should have a preliminary understanding of its power.

## Enable Configuration File

```bash
sudo ln -s /etc/nginx/sites-available/site.yourdomain.com /etc/nginx/sites-enabled/site.yourdomain.com
```

This command creates a symbolic link.

This means nginx will enable the site.yourdomain.com configuration file.

## Test Configuration

```bash
sudo nginx -t
```

If it displays `syntax is ok`, the configuration is correct.

If there's an error, you can use `sudo systemctl status nginx` to view the error information.

## Restart Nginx

```bash
sudo systemctl restart nginx
```

Now you can access your project through the domain name.