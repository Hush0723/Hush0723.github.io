"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import "katex/dist/katex.min.css";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { ArrowDown, ArrowUp, ArrowUpDown, BookOpen, ChevronDown, ChevronRight, FilePlus2, FileText, Folder, FolderPlus, Menu, PanelLeftClose, PanelLeftOpen, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type DocumentRecord = { slug: string; title: string; content: string };
type KnowledgeRecord = { id: string; title: string; parentId: string | null; domain: string; summary: string; order: number; documents: DocumentRecord[] };
type Snapshot = { nodes: KnowledgeRecord[]; editable: boolean };
type NodeForm = { title: string; parentId: string; summary: string; content: string };

const emptySnapshot: Snapshot = { nodes: [], editable: false };
const emptyNodeForm: NodeForm = { title: "", parentId: "root", summary: "", content: "# 新节点\n\n从这里开始记录。" };

function wikiMarkdown(content: string, nodeId: string, editable: boolean) {
  const withImages = content.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, attachment, label) => {
    const filename = String(attachment).trim();
    const encodedPath = [...nodeId.split("/"), ...filename.replaceAll("\\", "/").split("/")]
      .filter(Boolean).map(encodeURIComponent).join("/");
    const source = editable
      ? `http://localhost:4174/api/assets/${encodedPath}`
      : `/knowledge-assets/${encodedPath}`;
    const alt = String(label || filename.split("/").at(-1) || "笔记图片").replace(/[\[\]]/g, "");
    return `![${alt}](${source})`;
  });
  return withImages.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => "[" + (label || id) + "](knowledge://" + id + ")");
}

async function fetchSnapshot() {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    try {
      const response = await fetch("http://localhost:4174/api/knowledge");
      if (response.ok) return await response.json() as Snapshot;
    } catch {}
  }
  const response = await fetch("/knowledge.json");
  if (!response.ok) throw new Error("无法读取知识仓库");
  return await response.json() as Snapshot;
}

function pathTo(node: KnowledgeRecord | undefined, nodes: KnowledgeRecord[]) {
  const path: KnowledgeRecord[] = [];
  let current = node;
  while (current) {
    path.unshift(current);
    current = current.parentId ? nodes.find((item) => item.id === current?.parentId) : undefined;
  }
  return path;
}

function scopeFor(node: KnowledgeRecord | undefined, nodes: KnowledgeRecord[]) {
  if (!node || node.id === "root") return nodes.find((item) => item.id === "root");
  const path = pathTo(node, nodes);
  return path.length >= 3 ? path[2] : node;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="form-field"><span>{label}</span>{children}</label>;
}

function NavigationTree({ parentId, nodes, selectedId, editable, sorting, collapsed, onToggle, onSelect, onAdd, onMove }: {
  parentId: string; nodes: KnowledgeRecord[]; selectedId: string; editable: boolean;
  sorting: boolean;
  collapsed: Set<string>; onToggle: (id: string) => void;
  onSelect: (node: KnowledgeRecord) => void; onAdd: (parent: KnowledgeRecord) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  const children = nodes.filter((node) => node.parentId === parentId);
  return children.map((node, index) => {
    const hasChildren = nodes.some((item) => item.parentId === node.id);
    return <div className="nav-branch" key={node.id}>
      <div className={"nav-row " + (node.id === selectedId ? "is-active" : "")}>
        {hasChildren ? <button className="nav-toggle" aria-label={collapsed.has(node.id) ? `展开${node.title}` : `收起${node.title}`} onClick={() => onToggle(node.id)}>{collapsed.has(node.id) ? <ChevronRight /> : <ChevronDown />}</button> : <span className="nav-toggle-spacer" />}
        <button className="nav-link" onClick={() => onSelect(node)}>
          <span className="nav-icon">{hasChildren ? <Folder /> : <FileText />}</span>
          <span className="nav-copy"><strong>{node.title}</strong>{node.summary && <small>{node.summary}</small>}</span>
        </button>
        {editable && sorting ? <div className="nav-order-controls">
          <button aria-label={`上移${node.title}`} disabled={index === 0} onClick={() => onMove(node.id, -1)}><ArrowUp /></button>
          <button aria-label={`下移${node.title}`} disabled={index === children.length - 1} onClick={() => onMove(node.id, 1)}><ArrowDown /></button>
        </div> : editable && <Tooltip><TooltipTrigger asChild><button className="nav-add" aria-label={`在${node.title}下新建节点`} onClick={() => onAdd(node)}><Plus /></button></TooltipTrigger><TooltipContent>新建子节点</TooltipContent></Tooltip>}
      </div>
      {hasChildren && !collapsed.has(node.id) && <div className="nav-children"><NavigationTree parentId={node.id} nodes={nodes} selectedId={selectedId} editable={editable} sorting={sorting} collapsed={collapsed} onToggle={onToggle} onSelect={onSelect} onAdd={onAdd} onMove={onMove} /></div>}
    </div>;
  });
}

export default function Home() {
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("root");
  const [activeDocument, setActiveDocument] = useState("index");
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [directoryHidden, setDirectoryHidden] = useState(false);
  const [sorting, setSorting] = useState(false);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [nodeDialog, setNodeDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [documentDialog, setDocumentDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [nodeForm, setNodeForm] = useState<NodeForm>(emptyNodeForm);
  const [documentForm, setDocumentForm] = useState({ title: "", content: "# 补充笔记\n" });
  const [editForm, setEditForm] = useState({ title: "", summary: "", content: "" });

  useEffect(() => {
    fetchSnapshot().then(setSnapshot).catch((error) => toast.error(error.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") return;
    const events = new EventSource("http://localhost:4174/api/events");
    const refresh = () => {
      fetchSnapshot().then(setSnapshot).catch((error) => toast.error(error.message));
    };
    events.addEventListener("knowledge-change", refresh);
    return () => {
      events.removeEventListener("knowledge-change", refresh);
      events.close();
    };
  }, []);

  const selected = snapshot.nodes.find((node) => node.id === selectedId) || snapshot.nodes[0];
  const activeDoc = selected?.documents.find((doc) => doc.slug === activeDocument) || selected?.documents[0];
  const children = snapshot.nodes.filter((node) => node.parentId === selected?.id);
  const breadcrumbs = pathTo(selected, snapshot.nodes);
  const searchScope = scopeFor(selected, snapshot.nodes);
  const scopedNodes = useMemo(() => {
    if (!searchScope) return snapshot.nodes;
    return snapshot.nodes.filter((node) => node.id === searchScope.id || node.id.startsWith(searchScope.id + "/"));
  }, [snapshot.nodes, searchScope?.id]);
  const matches = query.trim() ? scopedNodes.filter((node) => (node.title + " " + node.summary + " " + node.documents.map((doc) => doc.content).join(" ")).toLowerCase().includes(query.trim().toLowerCase())) : [];
  const descendantCount = selected ? snapshot.nodes.filter((node) => node.id.startsWith(selected.id + "/")).length : 0;

  useEffect(() => {
    if (snapshot.nodes.length > 0 && !snapshot.nodes.some((node) => node.id === selectedId)) {
      setSelectedId(snapshot.nodes[0].id);
    }
  }, [selectedId, snapshot.nodes]);

  useEffect(() => { setActiveDocument(selected?.documents[0]?.slug || "index"); }, [selected?.id]);

  async function mutate(payload: Record<string, unknown>, message: string) {
    const response = await fetch("http://localhost:4174/api/knowledge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json() as Snapshot & { error?: string };
    if (!response.ok) throw new Error(result.error || "保存失败");
    setSnapshot(result);
    toast.success(message);
    return result;
  }

  async function moveNode(id: string, direction: -1 | 1) {
    try { await mutate({ action: "reorderNode", id, direction }, "目录顺序已更新"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "排序失败"); }
  }

  function selectNode(node: KnowledgeRecord) { setSelectedId(node.id); setQuery(""); setSidebarOpen(false); }
  function openNodeDialog(parent: KnowledgeRecord) { setNodeForm({ ...emptyNodeForm, parentId: parent.id }); setNodeDialog(true); }
  function toggleNode(id: string) {
    setCollapsedNodes((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function submitNode(event: FormEvent) {
    event.preventDefault();
    try {
      const result = await mutate({ action: "createNode", ...nodeForm }, "子节点已创建");
      const created = result.nodes.find((node) => node.parentId === nodeForm.parentId && node.title === nodeForm.title);
      if (created) setSelectedId(created.id);
      setNodeDialog(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "创建失败"); }
  }

  function openEditor() {
    if (!selected || !activeDoc) return;
    setEditForm({ title: activeDoc.slug === "index" ? selected.title : activeDoc.title, summary: selected.summary, content: activeDoc.content });
    setEditDialog(true);
  }

  async function submitEdit(event: FormEvent) {
    event.preventDefault();
    if (!selected || !activeDoc) return;
    const payload = activeDoc.slug === "index" ? { action: "updateNode", id: selected.id, title: editForm.title, summary: editForm.summary, content: editForm.content } : { action: "updateDocument", nodeId: selected.id, slug: activeDoc.slug, title: editForm.title, content: editForm.content };
    try { await mutate(payload, "Markdown 已保存"); setEditDialog(false); }
    catch (error) { toast.error(error instanceof Error ? error.message : "保存失败"); }
  }

  async function submitDocument(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    try { await mutate({ action: "addDocument", nodeId: selected.id, ...documentForm }, "文档已添加"); setDocumentDialog(false); setDocumentForm({ title: "", content: "# 补充笔记\n" }); }
    catch (error) { toast.error(error instanceof Error ? error.message : "添加失败"); }
  }

  async function deleteSelected() {
    if (!selected || selected.id === "root") return;
    const parentId = selected.parentId || "root";
    try { await mutate({ action: "deleteNode", id: selected.id }, "节点及其子树已删除"); setSelectedId(parentId); setDeleteDialog(false); }
    catch (error) { toast.error(error instanceof Error ? error.message : "删除失败"); }
  }

  return <TooltipProvider><main className="hush-app">
    <header className={"site-header " + (directoryHidden ? "is-directory-hidden" : "")}>
      <Button className="mobile-menu" variant="ghost" size="icon-sm" aria-label="打开目录" onClick={() => setSidebarOpen(true)}><Menu /></Button>
      <Tooltip><TooltipTrigger asChild><Button className="desktop-directory-toggle" variant="ghost" size="icon-sm" aria-label={directoryHidden ? "显示目录" : "隐藏目录"} onClick={() => setDirectoryHidden((value) => !value)}>{directoryHidden ? <PanelLeftOpen /> : <PanelLeftClose />}</Button></TooltipTrigger><TooltipContent>{directoryHidden ? "显示目录" : "隐藏目录"}</TooltipContent></Tooltip>
      <button className="wordmark" onClick={() => snapshot.nodes[0] && selectNode(snapshot.nodes[0])}>HushTree</button>
      <nav className="breadcrumbs" aria-label="当前位置">{breadcrumbs.map((node, index) => <span key={node.id}>{index > 0 && <ChevronRight />}<button onClick={() => selectNode(node)}>{node.title}</button></span>)}</nav>
      <span className="local-status">{snapshot.editable ? "本地知识库" : "只读预览"}</span>
    </header>

    <div className={"site-body " + (directoryHidden ? "is-directory-hidden" : "")}>
      {sidebarOpen && <button className="sidebar-backdrop" aria-label="关闭目录" onClick={() => setSidebarOpen(false)} />}
      <aside className={"sidebar " + (sidebarOpen ? "is-open " : "") + (directoryHidden ? "is-hidden" : "")}>
        <div className="sidebar-head"><div className="sidebar-heading"><strong>目录</strong><span>{snapshot.nodes.length} 个节点</span></div><div className="sidebar-tools">
          {snapshot.editable && <Tooltip><TooltipTrigger asChild><Button className={sorting ? "is-active" : ""} variant="ghost" size="icon-sm" aria-label={sorting ? "退出排序" : "调整目录顺序"} aria-pressed={sorting} onClick={() => setSorting((value) => !value)}><ArrowUpDown /></Button></TooltipTrigger><TooltipContent>{sorting ? "退出排序" : "调整同级节点顺序"}</TooltipContent></Tooltip>}
          <Button className="sidebar-close" variant="ghost" size="icon-sm" aria-label="关闭目录" onClick={() => setSidebarOpen(false)}><X /></Button>
        </div></div>
        <label className="subtree-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`搜索「${searchScope?.title || "HushTree"}」`} />{query && <button aria-label="清除搜索" onClick={() => setQuery("")}><X /></button>}</label>
        <div className="scope-label">搜索范围：{searchScope?.title || "全部内容"}</div>
        <nav className="tree-navigation" aria-label="知识目录">{loading ? <div className="sidebar-loading">正在读取目录…</div> : <NavigationTree parentId="root" nodes={snapshot.nodes} selectedId={selected?.id || ""} editable={snapshot.editable} sorting={sorting} collapsed={collapsedNodes} onToggle={toggleNode} onSelect={selectNode} onAdd={openNodeDialog} onMove={moveNode} />}</nav>
        {snapshot.editable && selected && <Button className="sidebar-create" variant="outline" onClick={() => openNodeDialog(selected)}><FolderPlus />在“{selected.title}”下新建</Button>}
      </aside>

      <section className="content-pane">
        {query ? <div className="search-page"><div className="page-kicker">{searchScope?.title} · 子树搜索</div><h1>“{query}”的搜索结果</h1><p>{matches.length} 个节点包含相关内容</p><div className="result-list">{matches.map((node) => <button key={node.id} onClick={() => selectNode(node)}><span>{pathTo(node, snapshot.nodes).slice(1).map((item) => item.title).join(" / ")}</span><strong>{node.title}</strong><p>{node.summary || "打开节点查看完整内容"}</p></button>)}</div>{matches.length === 0 && <div className="empty-state">当前子树中没有找到匹配内容。</div>}</div>
        : selected && activeDoc ? <article className="article-shell">
          <header className="article-header"><div className="page-kicker">{selected.domain}</div><div className="title-row"><h1>{selected.title}</h1><div className="article-actions">
            {snapshot.editable && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="新建子节点" onClick={() => openNodeDialog(selected)}><FolderPlus /></Button></TooltipTrigger><TooltipContent>新建子节点</TooltipContent></Tooltip>}
            {snapshot.editable && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="编辑当前文档" onClick={openEditor}><Pencil /></Button></TooltipTrigger><TooltipContent>编辑当前文档</TooltipContent></Tooltip>}
            {snapshot.editable && selected.id !== "root" && <Tooltip><TooltipTrigger asChild><Button className="danger-button" variant="ghost" size="icon-sm" aria-label="删除节点" onClick={() => setDeleteDialog(true)}><Trash2 /></Button></TooltipTrigger><TooltipContent>删除节点</TooltipContent></Tooltip>}
          </div></div>{selected.summary && <p className="article-summary">{selected.summary}</p>}</header>

          {selected.documents.length > 1 && <div className="documents-row"><Tabs value={activeDoc.slug} onValueChange={setActiveDocument}><TabsList variant="line">{selected.documents.map((doc) => <TabsTrigger key={doc.slug} value={doc.slug}><BookOpen />{doc.title}</TabsTrigger>)}</TabsList></Tabs></div>}

          <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} urlTransform={(url) => url.startsWith("knowledge://") ? url : defaultUrlTransform(url)} components={{ a: ({ href, children: linkChildren }) => href?.startsWith("knowledge://") ? <button className="wiki-link" onClick={() => { const node = snapshot.nodes.find((item) => item.id === href.slice(12)); if (node) selectNode(node); }}>{linkChildren}</button> : <a href={href} target="_blank" rel="noreferrer">{linkChildren}</a> }}>{wikiMarkdown(activeDoc.content, selected.id, snapshot.editable)}</ReactMarkdown></div>

          {children.length > 0 && <section className="child-directory"><div className="section-heading"><div><span>继续探索</span><h2>{selected.title}的子节点</h2></div><strong>{children.length}</strong></div><div className="child-list">{children.map((node) => <button key={node.id} onClick={() => selectNode(node)}><span><strong>{node.title}</strong><small>{node.summary || "尚未填写摘要"}</small></span><ChevronRight /></button>)}</div></section>}
          {snapshot.editable && <footer className="article-footer"><Button variant="outline" onClick={() => setDocumentDialog(true)}><FilePlus2 />添加补充文档</Button></footer>}
        </article> : <div className="empty-state">选择一个节点开始阅读。</div>}
      </section>
    </div>

    <Dialog open={nodeDialog} onOpenChange={setNodeDialog}><NodeDialog parent={snapshot.nodes.find((node) => node.id === nodeForm.parentId)} form={nodeForm} setForm={setNodeForm} onSubmit={submitNode} /></Dialog>
    <Dialog open={editDialog} onOpenChange={setEditDialog}><EditDialog form={editForm} setForm={setEditForm} isMain={activeDoc?.slug === "index"} onSubmit={submitEdit} /></Dialog>
    <Dialog open={documentDialog} onOpenChange={setDocumentDialog}><DocumentDialog form={documentForm} setForm={setDocumentForm} onSubmit={submitDocument} /></Dialog>
    <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>删除“{selected?.title}”？</AlertDialogTitle><AlertDialogDescription>这会删除对应文件夹、其中的全部 Markdown 文档{descendantCount > 0 ? `，以及 ${descendantCount} 个后代节点` : ""}。此操作不可撤销。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={deleteSelected}>删除子树</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <Toaster position="bottom-center" />
  </main></TooltipProvider>;
}

function NodeDialog({ parent, form, setForm, onSubmit }: { parent?: KnowledgeRecord; form: NodeForm; setForm: React.Dispatch<React.SetStateAction<NodeForm>>; onSubmit: (event: FormEvent) => void }) {
  return <DialogContent className="editor-dialog"><DialogHeader><DialogTitle>新建子节点</DialogTitle><DialogDescription>将在“{parent?.title || "HushTree"}”文件夹下创建一个新的 index.md。</DialogDescription></DialogHeader><form onSubmit={onSubmit} className="dialog-form"><Field label="节点名称"><Input autoFocus required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="例如：算法" /></Field><Field label="一两句话预览"><Textarea className="summary-editor" value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} placeholder="这个节点介绍什么？" /></Field><Field label="index.md"><Textarea className="markdown-editor" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} /></Field><DialogFooter><Button type="submit"><FolderPlus />创建子节点</Button></DialogFooter></form></DialogContent>;
}

function EditDialog({ form, setForm, isMain, onSubmit }: { form: { title: string; summary: string; content: string }; setForm: React.Dispatch<React.SetStateAction<{ title: string; summary: string; content: string }>>; isMain: boolean; onSubmit: (event: FormEvent) => void }) {
  return <DialogContent className="editor-dialog"><DialogHeader><DialogTitle>编辑 Markdown</DialogTitle><DialogDescription>支持 Markdown、Obsidian 双链和 LaTeX 公式。</DialogDescription></DialogHeader><form onSubmit={onSubmit} className="dialog-form"><Field label="文档标题"><Input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>{isMain && <Field label="一两句话预览"><Textarea className="summary-editor" value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></Field>}<Field label="正文"><Textarea className="markdown-editor tall" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} /></Field><DialogFooter><Button type="submit">保存修改</Button></DialogFooter></form></DialogContent>;
}

function DocumentDialog({ form, setForm, onSubmit }: { form: { title: string; content: string }; setForm: React.Dispatch<React.SetStateAction<{ title: string; content: string }>>; onSubmit: (event: FormEvent) => void }) {
  return <DialogContent><DialogHeader><DialogTitle>添加补充文档</DialogTitle><DialogDescription>文档会保存在当前节点文件夹内。</DialogDescription></DialogHeader><form onSubmit={onSubmit} className="dialog-form"><Field label="文档标题"><Input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="例如：练习与例题" /></Field><Field label="Markdown 正文"><Textarea className="markdown-editor" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} /></Field><DialogFooter><Button type="submit">添加文档</Button></DialogFooter></form></DialogContent>;
}
