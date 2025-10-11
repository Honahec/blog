---
title: pnpm 教程
createTime: 2024/11/16 19:32:56
permalink: /blog/0evtkteq/
tags:
  - 项目管理
---

## 与 npm、yarn 的比较

pnpm 是一款磁盘空间高效的软件包管理器。

> Fast, disk space efficient package manager

当使用 npm 或 yarn 时，如果你有 1000 个项目，并且所有项目都有一个相同的依赖包，那么， 你在硬盘上就需要保存 1000 份该相同依赖包的副本。

然而，如果是使用 pnpm，依赖包将被存放在一个统一的位置，因此以项目和依赖包的比例来看，使用 pnpm 将节省大量的硬盘空间，并且安装速度也能大大提高。

## pnpm 的优势

- **快速** —— pnpm 比替代方案快 2 倍

- **高效** —— node_modules 中的文件是从一个单一的可内容寻址的存储中软链接过来的

- **支持 monorepos** —— pnpm 内置支持了单仓多包

- **严格** —— pnpm 默认创建了一个非平铺的 node_modules，因此代码无法访问任意包

## 安装

首先你需要安装 nodejs

由于 apt 源的 nodejs 版本较低，推荐使用 nvm 进行安装和管理

> 以下为 20250929 版本，需根据 [nodejs 官网](https://nodejs.org/en/download/current) 查看最新

```bash
# Download and install nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
# in lieu of restarting the shell
\. "$HOME/.nvm/nvm.sh"
# Download and install Node.js:
nvm install 24
# Verify the Node.js version:
node -v # Should print "v24.9.0".
```

在安装好 node 后，便可以使用 npm 了

若使用国内服务器，推荐使用淘宝镜像源

```bash
npm config set registry https://registry.npmmirror.com
```

安装 pnpm

```bash
# Download and install pnpm:
corepack enable pnpm
# Verify pnpm version:
pnpm -v
```

pnpm 无需再次换源，默认使用 npm 的源

## 常用命令

```bash
pnpm add <package> # 安装指定包
pnpm add <package> -g # 全局安装指定包
pnpm remove <package> # 移除指定包
pnpm remove <package> -g # 全局移除指定包
pnpm upgrade <package> # 升级指定包
pnpm upgrade <package> -g # 全局升级指定包
pnpm install # 安装项目依赖
pnpm dev # 运行开发环境
pnpm build # 构建项目
```

## 更细节的事情

pnpm 从命令行、环境变量和 .npmrc 文件中获取其配置。

`pnpm config` 命令可用于更新和编辑 用户和全局 .npmrc 文件的内容。

四个相关文件分别为：

- 每个项目的配置文件（`/path/to/your/project/.npmrc`）

- 每个工作区的配置文件（包含 `pnpm-workspace.yaml` 文件的目录）

- 每位用户的配置文件（`~/.npmrc`）

- 全局配置文件（`/etc/npmrc`）

所有 .npmrc 文件都遵循 INI-formatted 列表，包含 key = value 参数。
