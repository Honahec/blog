---
title: Git 教程
createTime: 2024/11/3 11:28:56
permalink: /blog/z85xxugf/
tags:
  - 项目管理
---

## 一些声明

你理应对 Git 有基本的了解

> _Git_ is a free and open source distributed version control system designed to handle everything from small to very large projects with speed and efficiency.

另外，你大可以使用比如 vscode 中极为方便的插件，比如自带的仓库管理器和 GitLen 插件，但我仍认为应掌握 Git 的基本用法 ~~（也许还有一些进阶用法）~~

## 安装 git

```bash
sudo apt update
sudo apt install git

git --version
```

安装成功将会输出 git 版本号

## git 换源（可选）

请注意，示例提供的方法无法使用`git push`，**只在云服务器上使用**

**本地建议开启虚拟网卡**

国内使用 git 时常发生抽风的现象

可全局更改使用镜像网站下载

```bash
git config --global url."https://ghproxy.cc/https://github.com/".insteadOf "https://github.com/"
```

使用 `vi ~/.gitconfig` 命令即可查看当前的配置文件，看到以下配置：

```bash
[url "https://ghproxy.cc/https://github.com/"]
        insteadOf = https://github.com/
```

即配置成功

## 本地连接 GitHub 的 SSH 密钥

### 生成 SSH 密钥

如果你本地没有生成过 ssh 密钥，在终端执行以下命令：

```bash
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

按照提示操作，通常直接按回车即可使用默认路径和文件名

### 将公钥添加到 GitHub

复制公钥内容到剪贴板：

```bash
cat ~/.ssh/id_rsa.pub
```

然后登录 GitHub，进入 **Settings** > **SSH and GPG keys**，点击 **New SSH key**，将复制的公钥粘贴到对应的框中，填写一个标题（随意），然后保存

### 连接测试

运行以下命令测试连接是否成功：

```bash
ssh -T git@github.com
```

如果一切正常，你应该会看到一条欢迎信息。

### 在受限网络环境下使用 SSH

如你所处环境无法使用 22 端口

可以配置`~/.ssh/config`文件

```bash
Host github.com
    HostName ssh.github.com
    User git
    Port 443
```

## 将本地文件上传到 GitHub

git 的原理是，你同时拥有一个本地仓库和一个远程仓库

请注意：**本地仓库不等于本地文件夹**

对于最简单的情况，git 可以帮你同步这两个仓库

### 创建一个 GitHub 仓库

- 登录你的 GitHub 账号。

- 点击右上角的 “+” 按钮，选择 “New repository”。

- 填写仓库名称和描述，选择是否公开或私有，然后点击 “Create repository”。

### 在本地初始化 Git 仓库

打开终端或命令提示符，进入你想上传的文件夹，运行以下命令：

```bash
git init
```

此命令相当于你创建了一个本地仓库

### 为本地仓库添加文件

首先，我们一般会忽略本地的一些文件例如 node_modules

在项目根目录下创建`.gitignore`文件，并添加以下内容

```bash
node_modules/
```

这会告诉 git 忽略 node_modules 文件夹中的所有文件。

同理还有 .vscode 里的大部分等等

可以使用`!`来排除某些文件被忽略，例如：

```bash
.vscode/*
!.vscode/extensions.json
```

这意味着，git 会忽略 .vscode 文件夹中 **除了** extensions.json 之外的所有文件。

将你要上传的文件添加到 git 暂存区：

```bash
git add .
```

`.`表示添加当前目录下的所有文件，你也可以指定某个文件名

例如：`git add README.md` 代表只上传 README.md 文件（覆盖）

### 提交更改

提交你添加的文件：

```bash
git commit -m "Your commit"
```

**尽可能规范你所有 commit 的格式，有助于版本管理和合作**

### 关联远程仓库

将本地仓库与 GitHub 仓库关联：

```bash
git remote add origin https://github.com/你的用户名/仓库名.git
```

与远程仓库关联后，可以使用`git remote -v`查看当前关联的远程仓库

与远程仓库断开连接：

```bash
git remote remove origin
```

### 将本地仓库推送到 GitHub

```bash
git push -u origin main
```

其中 `main` 为你的分支名

完成后，你的文件就会出现在 GitHub 的仓库中。

## 在本地仓库删除部分文件

### 预览将要删除的文件

```bash
git rm -r -n --cached 文件/文件夹名称
```

加上 `-n` 这个参数，执行命令时，是不会删除任何文件，只是展示此命令要删除的文件列表预览

### 确认无误后删除文件

此操作不会删除本地的文件或文件夹

```bash
git rm -r --cached 文件/文件夹名称
```

之后正常 commit && push 即可

## 更新本地仓库

### 在云服务器上拉取 GitHub 仓库

```bash
git clone https://github.com/用户名/仓库名.git
```

<img src="https://image.honahec.cc/git-clone.png" alt="链接来源" style="zoom:50%;" />

> 一般建议使用 SSH 连接（需要配置 SSH 密钥）

### 从远程仓库更新本地仓库

```bash
git pull
```

## 一些实用功能

### 修改 commit

假设你更新了某个功能，但是忘记更新 README.md 了，又不想二次 commit 污染你的版本管理

```bash
git add xxx
git commit --amend -m "xxx"
```

此时，git 会自动为你创建一个分支提交形如

<img src="https://image.honahec.cc/commit%20amend.png" style="zoom:150%;" />

而后，若你本次修改与它的并行修改无冲突，直接同步即可，若存在冲突则需要简单 merge 一下（如果不简单就没必要这样了对吗）

**另外，你还可以 `git commit --amend --no-edit` 创建一个与它并行修改相同 commit 的提交**

### 关于 merge

在你 push 或者 pull 时，存在本地仓库与远程仓库的冲突，则需要选择保留哪些，在 vscode 中提供了可视化的选择方案，极为方便

处理所有冲突后进行同步，会创建一个 commit 形如 `Merge branch 'xxx' of github.com:xxx/xxx`

## 一些偏门知识

#### [Git 对象](./GitObject.md)
