---
giscus: 3
title: Git 对象
createTime: 2025/9/29 19:32:56
permalink: /blog/9msarmy4/
tags:
  - 底层原理
  - 项目管理
---

> [!TIP]
> 本段内容为 Git 较为底层的实现，并非 Git 教程，请确保你有足够的好奇并基本掌握 Git 用法后再看

## Git 对象模型总览（Git Object Model）

Git 的核心是一个 **内容寻址文件系统**（Content-Addressable Filesystem）：

- 一切数据都以 **对象（Object）** 存储；
- 每个对象都通过其内容的 **SHA-1 哈希**（40 个十六进制字符）来唯一标识；
- 所有对象都放在 .git/objects/ 目录（或打包为 .pack 文件）。

Git 有 **四种对象类型**：

| 类型   | 作用                                  | 内容结构                                       | 典型命令                       |
| ------ | ------------------------------------- | ---------------------------------------------- | ------------------------------ |
| blob   | 存储文件内容                          | 文件原始内容                                   | `git cat-file -p <sha>`        |
| tree   | 表示目录（含文件名、权限、blob 引用） | 目录项列表                                     | `git cat-file -p <tree-sha>`   |
| commit | 表示一次提交                          | 指向一个 tree + 元数据（作者、时间、父提交等） | `git cat-file -p <commit-sha>` |
| tag    | 可读标签对象，指向其他对象            | 指向 commit/blob/tree/tag，含签名信息          | `git cat-file -p <tag-sha>`    |

### Git 对象的存储形式

对象保存于 .git/objects/xx/yyyy...：

- 其中 xx 是哈希前两位（目录名），yyyy... 是后 38 位（文件名）。
- 内容是 **zlib 压缩后的二进制数据**，Git 通过 git cat-file 自动解压。

例如：

```
.git/
 └─ objects/
    ├─ 22/
    │  └─ 88acb0c1d3ddea...   ← blob/tree/commit 压缩文件
    ├─ 4b/
    │  └─ 825dc642cb6e...     ← 空树对象（固定）
```

### 对象间的关系（Git 的 DAG）

Git 通过对象间引用构建出 **有向无环图 (DAG)**：

```
[commit] ──→ [tree] ──┬─→ [blob] (file1)
                      ├─→ [blob] (file2)
                      └─→ [tree] (subdir)
```

- commit 指向一个 tree，表示该提交时的目录结构；
- tree 包含若干 blob（文件内容）；
- commit 还可以引用一个或多个 parent commit（形成历史链条）。

### 查看与操作对象的常用命令

| 命令                                        | 功能                                             |
| ------------------------------------------- | ------------------------------------------------ |
| `git hash-object <file>`                    | 计算文件内容对应的对象哈希                       |
| `git cat-file -p <sha>`                     | 解压并显示对象内容                               |
| `git cat-file -t <sha>`                     | 显示对象类型                                     |
| `git rev-list --all --objects`              | 列出所有对象及其文件路径                         |
| `git fsck --full --no-reflogs --lost-found` | 扫描丢失的对象（dangling）并放入 .git/lost-found |
| `git show <sha>`                            | 智能展示对象内容（根据类型）                     |

### Dangling / Lost Object（孤儿对象）

当提交被删除、分支被清空、HEAD 丢失时，对象还在 .git/objects 中，但不再被引用：

- git fsck 会提示 dangling blob 或 dangling commit；
- 这些对象通常可通过 .git/lost-found 找回。

恢复流程：

```bash
git fsck --full --no-reflogs --lost-found
ls .git/lost-found/other
git cat-file -p <sha>
```

### packfile（对象打包）

当仓库历史多时，Git 会将松散对象打包：

```
.git/objects/pack/pack-xxxx.pack
.git/objects/pack/pack-xxxx.idx
```

查看其中对象：

```bash
git verify-pack -v .git/objects/pack/pack-xxxx.pack
```

或用 `git cat-file -p <sha>`（Git 会自动从 pack 中解压）。

### 一些特殊对象

| 名称     | SHA                                      | 说明             |
| -------- | ---------------------------------------- | ---------------- |
| 空树对象 | 4b825dc642cb6eb9a060e54bf8d69288fbee4904 | 所有空目录都是它 |
| 空 blob  | e69de29bb2d1d6434b8b29ae775ad8c2e48c5391 | 空文件内容       |

## Git 对象结构图

```
+---------------------+
|  commit object      |
|---------------------|
| tree: <sha1>        | → 指向目录结构
| parent: <sha1>      | → 指向上一个 commit
| author/committer    |
| message             |
+---------------------+
          |
          v
+---------------------+
| tree object         |
|---------------------|
| mode blob <sha1> f1 | → 文件内容
| mode blob <sha1> f2 |
| mode tree <sha1> d1 |
+---------------------+
          |
          v
+---------------------+
| blob object         |
|---------------------|
| (file content...)   |
+---------------------+
```
