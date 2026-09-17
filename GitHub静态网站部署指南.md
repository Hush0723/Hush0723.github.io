# HushTree GitHub 静态网站部署指南

本指南用于把 HushTree 源码上传到 GitHub，并使用 GitHub Pages 自动发布静态网站。

## 1. 先理解本地版和网络版

- 本地版可以在网页中新建、编辑、删除和排序节点，也会自动读取 Obsidian 的文件变化。
- GitHub Pages 是只读的静态网站，可用于公开浏览、搜索和阅读，不能直接在网站上修改文件。
- 更新网络版时，先在本地或 Obsidian 中修改 `vault/`，然后把变更推送到 GitHub。GitHub Actions 会自动重新构建和发布。

> 注意：GitHub Pages 上的内容将可被网络访问。上传前请检查 `vault/` 中是否包含个人信息、私密日记、密钥或其他不应公开的内容。

## 2. 准备工作

1. 注册并登录 [GitHub](https://github.com/)。
2. 安装 [Git](https://git-scm.com/downloads)。
3. 安装 [Visual Studio Code](https://code.visualstudio.com/)（可选）。
4. 记住自己的 GitHub 用户名，下文用 `YOUR_NAME` 代表它。

## 3. 在 GitHub 创建仓库

为了让当前 HushTree 直接在根网址运行，推荐创建“用户站点”仓库。

1. 打开 GitHub，点击右上角 `+`，选择 **New repository**。
2. Repository name 填写 `YOUR_NAME.github.io`。例如用户名是 `hush123`，就填写 `hush123.github.io`。
3. GitHub Free 用户建议选择 **Public**。
4. 不要勾选创建 README、`.gitignore` 或 License，保持远程仓库为空。
5. 点击 **Create repository**。

完成后，网站地址将是：

```text
https://YOUR_NAME.github.io/
```

## 4. 方法 A：使用终端首次上传

在 PowerShell 或 VS Code 终端中执行。路径有空格，因此必须保留引号。

```powershell
Set-Location "D:\Hush文件管理\Vibe coding\ex\ProjectE\knowledge-tree"
```

第一次使用 Git 时设置姓名和邮箱：

```powershell
git config --global user.name "你的名字"
git config --global user.email "你的 GitHub 邮箱"
```

初始化并检查将要上传的文件：

```powershell
git init
git branch -M main
git add .
git status
```

请仔细阅读 `git status`。确认没有隐私文件后再提交：

```powershell
git commit -m "Initial HushTree website"
```

将下面的 `YOUR_NAME` 换成 GitHub 用户名，然后连接并推送：

```powershell
git remote add origin https://github.com/YOUR_NAME/YOUR_NAME.github.io.git
git push -u origin main
```

首次推送可能会弹出浏览器要求登录 GitHub。GitHub 不再接受账户密码作为 Git 的网络验证密码；优先使用浏览器授权，或者使用 Personal Access Token。

## 5. 方法 B：使用 VS Code 首次上传

1. 在 VS Code 中选择 **File > Open Folder**，打开 `knowledge-tree` 文件夹。
2. 点击左侧的 **Source Control** 图标。
3. 点击 **Initialize Repository**。
4. 检查 Changes 列表，点击顶部的 `+` 将文件加入 Staged Changes。
5. 在消息框输入 `Initial HushTree website`，点击 **Commit**。
6. 按 `Ctrl+Shift+P`，运行 **GitHub: Publish to GitHub**。
7. 登录 GitHub，将仓库名设为 `YOUR_NAME.github.io`，并选择公开仓库。

如果你已经按第 3 节在 GitHub 建好空仓库，使用 VS Code 内置终端执行第 4 节的 `git remote add` 和 `git push` 通常更直接。

## 6. 开启 GitHub Pages

项目已包含 `.github/workflows/deploy-pages.yml`，因此推送后 GitHub 可以自动构建网站。

1. 打开 GitHub 仓库。
2. 进入 **Settings > Pages**。
3. 在 **Build and deployment** 中，将 Source 设为 **GitHub Actions**。
4. 进入仓库的 **Actions** 页面。
5. 打开 **Deploy HushTree to GitHub Pages**，等待流程变为绿色。
6. 打开 `https://YOUR_NAME.github.io/`。

第一次发布通常需要几分钟。之后每次推送 `main` 分支，工作流都会自动重新发布。

## 7. 日常更新：终端方式

在 Obsidian 或 HushTree 本地网页中修改完成后：

```powershell
Set-Location "D:\Hush文件管理\Vibe coding\ex\ProjectE\knowledge-tree"
git status
git add .
git commit -m "Update machine learning notes"
git push
```

提交消息应简单说明本次修改，例如：

```powershell
git commit -m "Add lecture 3 notes"
git commit -m "Reorganize computer science topics"
git commit -m "Fix probability formulas"
```

## 8. 日常更新：VS Code 方式

1. 打开 Source Control。
2. 查看每个变更，确认不含隐私或临时文件。
3. 将需要上传的变更 Stage。
4. 填写提交消息并 Commit。
5. 点击 **Sync Changes** 或 **Push**。
6. 到 GitHub 的 Actions 页面查看发布进度。

## 9. 更新前先同步

如果你在另一台电脑上也修改了仓库，当前电脑开始工作前先执行：

```powershell
git pull --rebase
```

然后再编辑、提交和推送。如果 Git 报告冲突，不要随意删除文件；先在 VS Code 的 Merge Editor 中比较两边内容。

## 10. 常用检查命令

```powershell
# 查看当前变更
git status

# 查看远程仓库地址
git remote -v

# 查看最近的提交
git log --oneline -10

# 取消某个文件的 Stage，不删除文件内容
git restore --staged "文件路径"
```

## 11. 常见问题

### Actions 构建成功，网站却是 404

- 确认仓库名是小写的 `YOUR_NAME.github.io`。
- 确认 **Settings > Pages > Source** 是 **GitHub Actions**。
- 等待几分钟后再访问。

### 首页打开了，但样式或数据丢失

如果仓库叫 `HushTree`，网址会是 `https://YOUR_NAME.github.io/HushTree/`。当前项目使用根路径资源，因此请优先使用 `YOUR_NAME.github.io` 作为仓库名。

### Git 提示 `remote origin already exists`

先查看现有地址：

```powershell
git remote -v
```

如果地址错误，修正它：

```powershell
git remote set-url origin https://github.com/YOUR_NAME/YOUR_NAME.github.io.git
```

### 推送时要求登录

按照弹出的浏览器页面授权 Git Credential Manager。不要把 GitHub 账户密码、Token 或 SSH 私钥写进项目文件。

## 12. 参考文档

- [GitHub Pages 快速入门](https://docs.github.com/pages/quickstart)
- [配置 GitHub Pages 发布源](https://docs.github.com/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [创建 GitHub Pages 站点](https://docs.github.com/pages/getting-started-with-github-pages/creating-a-github-pages-site)
