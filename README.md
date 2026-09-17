# 知识树

一个以 Obsidian Markdown 仓库为数据源的本地知识地图。

## 启动

在 Windows 中双击 `启动知识树.cmd`，然后打开：

`http://localhost:5173`

本地运行时可以新增节点、补充 Markdown 文档、编辑内容和建立跨节点关联。所有修改都会直接保存到 `vault/`。

## 在 Obsidian 中使用

用 Obsidian 打开项目中的 `vault` 文件夹即可。每个节点是一个文件夹：

- `index.md` 保存节点信息和主文档。
- 同目录下的其他 `.md` 文件是该节点的补充文档。
- `parent` 表示唯一的主父节点。
- `relations` 保存跨节点关联。
- 正文支持普通 Obsidian WikiLink，例如 `[[root/technology/web|Web 开发]]`。

请保留 `index.md` 的 frontmatter 字段。正文可直接在 Obsidian 中修改；本地服务会监听 `vault` 中的变化，网页会自动更新，无需手动刷新。

## 只读构建

运行构建前，脚本会把当前 Markdown 仓库生成到 `public/knowledge.json`。构建后的网页自动隐藏编辑入口，只保留浏览、搜索、折叠、缩放和关联跳转。
