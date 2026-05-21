---
title: 如何在 GitHub 贡献你的代码？
createTime: 2026/05/22 00:28:08
permalink: /blog/0tfhksf3/
tags:
  - 项目管理
---

> [!NOTE]
> 本文旨在帮助没有太多协作开发项目经验小白快速适应 GitHub 贡献代码的 ==默认规则==。
>
> 注：阅读本文前，请确保你已掌握 git 的基础用法，可参考我参与编写的教程：[一个只包含必要知识的教程](https://docs.yxzl.dev/git/)

## fork 仓库

对于一个你并没有写权限的仓库，你需要先将其 fork 到个人仓库中：

![](https://image.honahec.cc/20260522004605884.png)

将其 clone 下来后，就可以正式开始参与贡献啦～

## 分支管理

无论什么情况，我们都不建议在 main 分支中直接开发。

所以，你需要先创建一个分支，目前较为主流的分支命名方法为：

1. `dev/{description}`

2. `feat/{desc}`, `fix/{desc}`, etc.

可以参考上游仓库的分支命名方法，或其实你都可以用（x

使用此命令创建并切换 ==(checkout)== 分支：

```bash
git checkout -b dev/{desc}
```

`-b` 意为新建，故若你想切换到一个已有分支，删掉此 flag 即可。

## 开始编写你的代码

终于，你可以开始干活了！

另外，我们建议每完成一小部分任务后就进行阶段 commit，这有助于你最后 review 你写过的代码且可以随时重置到任何一个 commit。

## 提交 PR

终于，你干完活了，你像个人开发一样 push 到了远端，也就是个人仓库。

现在打开 GitHub，你应该可以看到一个名为 `dev/{desc}` 的新分支，且 GitHub 会提示你是否要创建 PR：

![](https://image.honahec.cc/20260522010623787.png)

在 PR 中尽可能清晰的描述你做了什么（稍大型项目会给 PR 模版，填写即可）。

如果你的工作是解决了某个 issue，可以在描述中添加如下关键词：

```md
resolves #<issue_id> / fixes #<issue_id>
```

GitHub 会自动识别关键词，当 PR 被合并时自动关闭 issue。

创建，等待 Review，发现一切良好没有问题，没有冲突产生，修改被 approve 了，然后愉快地合并到了上游仓库，成功完成了贡献（理想情况下）。

接下来我们来说说没那么理想的情况：

## 被要求修改

Reviewer 可能要求你对某些部分进行修改，此时你只需要在原本的分支继续 commit & push 即可，无需再提 PR 等操作。

可以理解：GitHub 本身管理了这个 git 仓库，PR 本质是对分支的引用，所以你修改分支会同步到 PR 中。

## 出现冲突

你在修改代码时也有其他人在同步工作，所以合并时的 main 分支可能已不是你 checkout 时的样子了，很多时候，上游仓库会有人去处理冲突，但如果被要求进行处理：

1. GitHub 网页进行处理：较为简单的冲突，只能对每段代码选择保留上游 main 还是自己的分支

2. 先将个人 fork 仓库的 main 同步，本地执行：

```bash
git merge origin/main
```

此时 vscode 会打开冲突编辑器，处理冲突后提交一个 merge commit & push 即可
