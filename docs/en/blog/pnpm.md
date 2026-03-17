---
title: pnpm Tutorial
createTime: 2024/11/16 19:32:56
permalink: /en/blog/0evtkteq/
tags:
  - Project Management
---

## Comparison with npm and yarn

pnpm is a disk space efficient package manager.

> Fast, disk space efficient package manager

When using npm or yarn, if you have 1000 projects and all projects have the same dependency package, then you need to save 1000 copies of that same dependency package on your hard disk.

However, if you use pnpm, dependency packages will be stored in a unified location. Therefore, in terms of the ratio of projects to dependency packages, using pnpm will save a significant amount of hard disk space and greatly improve installation speed.

## Advantages of pnpm

- **Fast** — pnpm is 2x faster than alternatives

- **Efficient** — Files in node_modules are soft-linked from a single content-addressable storage

- **Supports monorepos** — pnpm has built-in support for single repository with multiple packages

- **Strict** — pnpm creates a non-flat node_modules by default, so code cannot access arbitrary packages

## Installation

First, you need to install nodejs

Since the nodejs version in apt sources is relatively low, it's recommended to use nvm for installation and management

> The following is for version 20250929, please check the [nodejs official website](https://nodejs.org/en/download/current) for the latest version

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

After installing node, you can use npm

If using a domestic server, it's recommended to use the Taobao mirror source

```bash
npm config set registry https://registry.npmmirror.com
```

Install pnpm

```bash
# Download and install pnpm:
corepack enable pnpm
# Verify pnpm version:
pnpm -v
```

pnpm doesn't need to change sources again, it uses npm's source by default

## Common Commands

```bash
pnpm add <package> # Install specified package
pnpm add <package> -g # Globally install specified package
pnpm remove <package> # Remove specified package
pnpm remove <package> -g # Globally remove specified package
pnpm upgrade <package> # Upgrade specified package
pnpm upgrade <package> -g # Globally upgrade specified package
pnpm install # Install project dependencies
pnpm dev # Run development environment
pnpm build # Build project
```

## More Details

pnpm gets its configuration from the command line, environment variables, and .npmrc files.

The `pnpm config` command can be used to update and edit the contents of user and global .npmrc files.

The four related files are:

- Per-project configuration file (`/path/to/your/project/.npmrc`)

- Per-workspace configuration file (directory containing `pnpm-workspace.yaml` file)

- Per-user configuration file (`~/.npmrc`)

- Global configuration file (`/etc/npmrc`)

All .npmrc files follow INI-formatted lists containing key = value parameters.