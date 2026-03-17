---
giscus: 3
title: Git Objects
createTime: 2025/9/29 19:32:56
permalink: /en/blog/9msarmy4/
tags:
  - Underlying Principles
---

> [!TIP]
> This section covers Git's lower-level implementation details, not a Git tutorial. Please ensure you have sufficient curiosity and basic mastery of Git usage before reading.

## Git Object Model Overview

Git's core is a **Content-Addressable Filesystem**:

- All data is stored as **Objects**;
- Each object is uniquely identified by its content's **SHA-1 hash** (40 hexadecimal characters);
- All objects are placed in the .git/objects/ directory (or packed into .pack files).

Git has **four object types**:

| Type   | Purpose                                           | Content Structure                                      | Typical Commands               |
| ------ | ------------------------------------------------- | ------------------------------------------------------ | ------------------------------ |
| blob   | Store file content                                | Raw file content                                       | `git cat-file -p <sha>`        |
| tree   | Represent directory (with filenames, permissions, blob references) | List of directory entries                              | `git cat-file -p <tree-sha>`   |
| commit | Represent a commit                                | Points to a tree + metadata (author, time, parent commits, etc.) | `git cat-file -p <commit-sha>` |
| tag    | Readable tag object pointing to other objects     | Points to commit/blob/tree/tag, contains signature info | `git cat-file -p <tag-sha>`    |

### Git Object Storage Format

Objects are saved in .git/objects/xx/yyyy...:

- Where xx is the first two digits of the hash (directory name), yyyy... is the remaining 38 digits (filename).
- Content is **zlib-compressed binary data**, Git automatically decompresses via git cat-file.

For example:

```
.git/
 └─ objects/
    ├─ 22/
    │  └─ 88acb0c1d3ddea...   ← blob/tree/commit compressed file
    ├─ 4b/
    │  └─ 825dc642cb6e...     ← empty tree object (fixed)
```

### Relationships Between Objects (Git's DAG)

Git constructs a **Directed Acyclic Graph (DAG)** through object references:

```
[commit] ──→ [tree] ──┬─→ [blob] (file1)
                      ├─→ [blob] (file2)
                      └─→ [tree] (subdir)
```

- commit points to a tree, representing the directory structure at commit time;
- tree contains multiple blobs (file contents);
- commit can also reference one or more parent commits (forming a history chain).

### Common Commands for Viewing and Manipulating Objects

| Command                                     | Function                                                      |
| ------------------------------------------- | ------------------------------------------------------------- |
| `git hash-object <file>`                    | Calculate the object hash for file content                    |
| `git cat-file -p <sha>`                     | Decompress and display object content                         |
| `git cat-file -t <sha>`                     | Display object type                                           |
| `git rev-list --all --objects`              | List all objects and their file paths                         |
| `git fsck --full --no-reflogs --lost-found` | Scan for lost objects (dangling) and place in .git/lost-found |
| `git show <sha>`                            | Intelligently display object content (based on type)          |

### Dangling / Lost Objects (Orphaned Objects)

When commits are deleted, branches are cleared, or HEAD is lost, objects remain in .git/objects but are no longer referenced:

- git fsck will report dangling blob or dangling commit;
- These objects can usually be recovered via .git/lost-found.

Recovery process:

```bash
git fsck --full --no-reflogs --lost-found
ls .git/lost-found/other
git cat-file -p <sha>
```

### Packfile (Object Packing)

When repository history grows, Git packs loose objects:

```
.git/objects/pack/pack-xxxx.pack
.git/objects/pack/pack-xxxx.idx
```

View objects within:

```bash
git verify-pack -v .git/objects/pack/pack-xxxx.pack
```

Or use `git cat-file -p <sha>` (Git automatically decompresses from pack).

### Some Special Objects

| Name        | SHA                                      | Description                |
| ----------- | ---------------------------------------- | -------------------------- |
| Empty tree  | 4b825dc642cb6eb9a060e54bf8d69288fbee4904 | All empty directories use this |
| Empty blob  | e69de29bb2d1d6434b8b29ae775ad8c2e48c5391 | Empty file content         |

## Git Object Structure Diagram

```
+---------------------+
|  commit object      |
|---------------------|
| tree: <sha1>        | → Points to directory structure
| parent: <sha1>      | → Points to previous commit
| author/committer    |
| message             |
+---------------------+
          |
          v
+---------------------+
| tree object         |
|---------------------|
| mode blob <sha1> f1 | → File content
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