import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const vaultRoot = path.join(projectRoot, "vault");

const directions = new Set(["north", "east", "south", "west"]);
const colors = ["#e05a47", "#0f8b8d", "#3976c5", "#c58a13", "#7a5caf", "#41845b"];

async function collectIndexFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== ".obsidian") files.push(...await collectIndexFiles(target));
    if (entry.isFile() && entry.name === "index.md") files.push(target);
  }
  return files;
}

function safeId(value) {
  if (typeof value !== "string" || !/^[a-z0-9\u4e00-\u9fff][a-z0-9\u4e00-\u9fff/_-]*$/i.test(value) || value.includes("..")) throw new Error("节点 ID 不合法");
  return value;
}

function safeDocumentSlug(value) {
  if (typeof value !== "string" || !value.trim() || value !== path.basename(value) || value.includes("..") || /[<>:"/\\|?*\u0000-\u001f]/.test(value)) {
    throw new Error("文档文件名不合法");
  }
  return value;
}

function slugify(title) {
  const value = title.trim().toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "");
  return value || "node-" + Date.now().toString(36);
}

async function readDocument(file) {
  const parsed = matter(await fs.readFile(file, "utf8"));
  return {
    slug: path.basename(file, ".md"),
    title: String(parsed.data.document_title || parsed.data.title || path.basename(file, ".md")),
    content: parsed.content.trim(),
  };
}

export async function readKnowledge() {
  await fs.mkdir(vaultRoot, { recursive: true });
  const files = await collectIndexFiles(vaultRoot);
  const nodes = await Promise.all(files.map(async (file) => {
    const parsed = matter(await fs.readFile(file, "utf8"));
    const directory = path.dirname(file);
    const documentFiles = (await fs.readdir(directory)).filter((name) => name.endsWith(".md"))
      .sort((a, b) => a === "index.md" ? -1 : b === "index.md" ? 1 : a.localeCompare(b));
    return {
      id: String(parsed.data.id),
      title: String(parsed.data.title || parsed.data.id),
      parentId: parsed.data.parent ? String(parsed.data.parent) : null,
      domain: String(parsed.data.domain || "未分类"),
      direction: directions.has(parsed.data.direction) ? parsed.data.direction : null,
      color: String(parsed.data.color || "#64748b"),
      summary: String(parsed.data.summary || ""),
      order: Number(parsed.data.order || 999),
      relations: Array.isArray(parsed.data.relations)
        ? parsed.data.relations.map((relation) => ({ target: String(relation.target), type: String(relation.type || "相关") }))
        : [],
      documents: await Promise.all(documentFiles.map((name) => readDocument(path.join(directory, name)))),
    };
  }));
  nodes.sort((a, b) => a.id === "root" ? -1 : b.id === "root" ? 1 : a.order - b.order || a.title.localeCompare(b.title, "zh-CN"));
  return { nodes };
}

async function nodeDirectory(id) {
  const directory = path.resolve(vaultRoot, ...safeId(id).split("/"));
  if (!directory.startsWith(path.resolve(vaultRoot))) throw new Error("节点路径越界");
  return directory;
}

export async function createNode(input) {
  const snapshot = await readKnowledge();
  const parent = snapshot.nodes.find((node) => node.id === input.parentId);
  if (!parent) throw new Error("请选择有效的父节点");
  const segment = slugify(String(input.title || ""));
  let id = parent.id + "/" + segment;
  let suffix = 2;
  while (snapshot.nodes.some((node) => node.id === id)) id = parent.id + "/" + segment + "-" + suffix++;
  const directory = await nodeDirectory(id);
  await fs.mkdir(directory, { recursive: false });
  const data = {
    id,
    title: String(input.title).trim(),
    parent: parent.id,
    domain: parent.id === "root" ? String(input.domain || input.title).trim() : parent.domain,
    color: parent.id === "root" ? String(input.color || colors[snapshot.nodes.length % colors.length]) : parent.color,
    summary: String(input.summary || "").trim(),
    order: snapshot.nodes.filter((node) => node.parentId === parent.id).length + 1,
    relations: [],
    updated: new Date().toISOString(),
  };
  await fs.writeFile(path.join(directory, "index.md"), matter.stringify(String(input.content || "# 新知识\n\n从这里开始记录。\n"), data), "utf8");
  return id;
}

export async function updateNode(input) {
  const file = path.join(await nodeDirectory(input.id), "index.md");
  const parsed = matter(await fs.readFile(file, "utf8"));
  parsed.data.title = String(input.title || parsed.data.title).trim();
  parsed.data.summary = String(input.summary ?? parsed.data.summary).trim();
  parsed.data.updated = new Date().toISOString();
  await fs.writeFile(file, matter.stringify(String(input.content ?? parsed.content), parsed.data), "utf8");
}

export async function reorderNode(input) {
  const id = safeId(input.id);
  const direction = Number(input.direction);
  if (direction !== -1 && direction !== 1) throw new Error("排序方向不合法");
  const snapshot = await readKnowledge();
  const node = snapshot.nodes.find((item) => item.id === id);
  if (!node || !node.parentId) throw new Error("根节点不能调整顺序");
  const siblings = snapshot.nodes.filter((item) => item.parentId === node.parentId);
  const currentIndex = siblings.findIndex((item) => item.id === id);
  const targetIndex = currentIndex + direction;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= siblings.length) return;
  [siblings[currentIndex], siblings[targetIndex]] = [siblings[targetIndex], siblings[currentIndex]];
  await Promise.all(siblings.map(async (sibling, index) => {
    const file = path.join(await nodeDirectory(sibling.id), "index.md");
    const parsed = matter(await fs.readFile(file, "utf8"));
    parsed.data.order = index + 1;
    parsed.data.updated = new Date().toISOString();
    await fs.writeFile(file, matter.stringify(parsed.content, parsed.data), "utf8");
  }));
}

export async function deleteNode(input) {
  const id = safeId(input.id);
  if (id === "root") throw new Error("HushTree 根节点不能删除");
  const directory = await nodeDirectory(id);
  await fs.rm(directory, { recursive: true, force: false });
}

export async function addRelation(input) {
  safeId(input.sourceId);
  safeId(input.targetId);
  if (input.sourceId === input.targetId) throw new Error("不能关联节点自身");
  const snapshot = await readKnowledge();
  if (!snapshot.nodes.some((node) => node.id === input.targetId)) throw new Error("目标节点不存在");
  const file = path.join(await nodeDirectory(input.sourceId), "index.md");
  const parsed = matter(await fs.readFile(file, "utf8"));
  const relations = Array.isArray(parsed.data.relations) ? parsed.data.relations : [];
  const type = String(input.type || "相关").trim();
  if (!relations.some((relation) => relation.target === input.targetId && relation.type === type)) relations.push({ target: input.targetId, type });
  parsed.data.relations = relations;
  parsed.data.updated = new Date().toISOString();
  await fs.writeFile(file, matter.stringify(parsed.content, parsed.data), "utf8");
}

export async function addDocument(input) {
  const directory = await nodeDirectory(input.nodeId);
  const base = slugify(String(input.title || "补充笔记"));
  let slug = base === "index" ? "note" : base;
  let suffix = 2;
  while (await fs.access(path.join(directory, slug + ".md")).then(() => true).catch(() => false)) slug = base + "-" + suffix++;
  const data = { document_title: String(input.title).trim(), node: input.nodeId, updated: new Date().toISOString() };
  await fs.writeFile(path.join(directory, slug + ".md"), matter.stringify(String(input.content || "# 补充笔记\n"), data), "utf8");
}

export async function updateDocument(input) {
  const directory = await nodeDirectory(input.nodeId);
  const slug = safeDocumentSlug(input.slug);
  const file = path.join(directory, slug + ".md");
  const parsed = matter(await fs.readFile(file, "utf8"));
  if (slug !== "index") parsed.data.document_title = String(input.title || parsed.data.document_title).trim();
  parsed.data.updated = new Date().toISOString();
  await fs.writeFile(file, matter.stringify(String(input.content ?? parsed.content), parsed.data), "utf8");
}
