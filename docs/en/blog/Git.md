---
title: Git Tutorial
createTime: 2024/11/3 11:28:56
permalink: /en/blog/z85xxugf/
tags:
  - Project Management
---

## Some Declarations

You should have a basic understanding of Git

> _Git_ is a free and open source distributed version control system designed to handle everything from small to very large projects with speed and efficiency.

Additionally, you can certainly use very convenient plugins in tools like vscode, such as the built-in repository manager and GitLen plugin, but I still believe you should master the basic usage of Git ~~(and perhaps some advanced usage)~~

## Installing git

```bash
sudo apt update
sudo apt install git

git --version
```

If installation is successful, it will output the git version number

## git Mirror Configuration (Optional)

Please note that the method provided in the example cannot use `git push`, **only use it on cloud servers**

**For local use, it's recommended to enable a virtual network adapter**

When using git in China, connection issues often occur

You can globally change to use mirror sites for downloads

```bash
git config --global url."https://ghproxy.cc/https://github.com/".insteadOf "https://github.com/"
```

Use the `vi ~/.gitconfig` command to view the current configuration file, and you should see the following configuration:

```bash
[url "https://ghproxy.cc/https://github.com/"]
        insteadOf = https://github.com/
```

This means the configuration is successful

## SSH Key for Local Connection to GitHub

### Generate SSH Key

If you haven't generated an ssh key locally, execute the following command in the terminal:

```bash
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

Follow the prompts, usually just press Enter to use the default path and filename

### Add Public Key to GitHub

Copy the public key content to clipboard:

```bash
cat ~/.ssh/id_rsa.pub
```

Then log in to GitHub, go to **Settings** > **SSH and GPG keys**, click **New SSH key**, paste the copied public key into the corresponding box, fill in a title (anything), and save

### Connection Test

Run the following command to test if the connection is successful:

```bash
ssh -T git@github.com
```

If everything is normal, you should see a welcome message.

### Using SSH in Restricted Network Environments

If your environment cannot use port 22

You can configure the `~/.ssh/config` file

```bash
Host github.com
    HostName ssh.github.com
    User git
    Port 443
```

## Uploading Local Files to GitHub

The principle of git is that you have both a local repository and a remote repository

Please note: **local repository is not equal to local folder**

For the simplest case, git can help you synchronize these two repositories

### Create a GitHub Repository

- Log in to your GitHub account.

- Click the "+" button in the upper right corner and select "New repository".

- Fill in the repository name and description, choose whether to make it public or private, then click "Create repository".

### Initialize Git Repository Locally

Open terminal or command prompt, navigate to the folder you want to upload, and run the following command:

```bash
git init
```

This command is equivalent to creating a local repository

### Add Files to Local Repository

First, we generally ignore some local files such as node_modules

Create a `.gitignore` file in the project root directory and add the following content

```bash
node_modules/
```

This tells git to ignore all files in the node_modules folder.

Similarly for most files in .vscode, etc.

You can use `!` to exclude certain files from being ignored, for example:

```bash
.vscode/*
!.vscode/extensions.json
```

This means git will ignore all files in the .vscode folder **except** extensions.json.

Add the files you want to upload to the git staging area:

```bash
git add .
```

`.` means add all files in the current directory, you can also specify a specific filename

For example: `git add README.md` means only upload (overwrite) the README.md file

### Commit Changes

Commit the files you added:

```bash
git commit -m "Your commit"
```

**Try to standardize the format of all your commits as much as possible, it helps with version management and collaboration**

### Associate Remote Repository

Associate the local repository with the GitHub repository:

```bash
git remote add origin https://github.com/your_username/repository_name.git
```

After associating with the remote repository, you can use `git remote -v` to view the currently associated remote repository

Disconnect from remote repository:

```bash
git remote remove origin
```

### Push Local Repository to GitHub

```bash
git push -u origin main
```

Where `main` is your branch name

After completion, your files will appear in the GitHub repository.

## Deleting Files from Local Repository

### Preview Files to be Deleted

```bash
git rm -r -n --cached file/folder_name
```

Adding the `-n` parameter means that when executing the command, no files will be deleted, it only shows a preview list of files this command would delete

### Delete Files After Confirmation

This operation will not delete local files or folders

```bash
git rm -r --cached file/folder_name
```

Then just commit && push normally

## Updating Local Repository

### Pull GitHub Repository on Cloud Server

```bash
git clone https://github.com/username/repository_name.git
```

<img src="https://image.honahec.cc/git-clone.png" alt="链接来源" style="zoom:50%;" />

> Generally recommended to use SSH connection (requires SSH key configuration)

### Update Local Repository from Remote Repository

```bash
git pull
```

## Some Useful Features

### Modify commit

Suppose you updated a feature but forgot to update README.md, and don't want a second commit to pollute your version management

```bash
git add xxx
git commit --amend -m "xxx"
```

At this point, git will automatically create a branch commit for you like

<img src="https://image.honahec.cc/commit%20amend.png" style="zoom:150%;" />

Then, if your current modification has no conflict with its parallel modification, you can synchronize directly. If there is a conflict, you need to do a simple merge (if it's not simple, there's no need to do it this way, right?)

**Additionally, you can also `git commit --amend --no-edit` to create a commit with the same commit message as its parallel modification**

### About merge

When you push or pull, if there are conflicts between the local repository and the remote repository, you need to choose which ones to keep. vscode provides a visual selection solution, which is extremely convenient

After handling all conflicts, synchronize, and it will create a commit like `Merge branch 'xxx' of github.com:xxx/xxx`

## Some Niche Knowledge

#### [Git Objects](./GitObject.md)
