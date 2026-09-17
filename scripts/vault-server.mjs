import http from "node:http";
import { watch } from "node:fs";
import { mkdir } from "node:fs/promises";
import { addDocument, addRelation, createNode, deleteNode, readKnowledge, reorderNode, updateDocument, updateNode, vaultRoot } from "./vault-store.mjs";

const port = Number(process.env.KT_API_PORT || 4174);
const headers = {
  "Access-Control-Allow-Origin": "http://localhost:5173",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const eventClients = new Set();
let changeTimer;

function respond(response, status, data) {
  response.writeHead(status, headers);
  response.end(JSON.stringify(data));
}

async function bodyOf(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new Error("请求内容过大");
  }
  return JSON.parse(raw || "{}");
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") return respond(response, 204, {});
  if (request.method === "GET" && request.url === "/api/events") {
    response.writeHead(200, {
      "Access-Control-Allow-Origin": "http://localhost:5173",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
    });
    response.write("event: ready\ndata: connected\n\n");
    eventClients.add(response);
    const heartbeat = setInterval(() => response.write(": keep-alive\n\n"), 20_000);
    request.on("close", () => {
      clearInterval(heartbeat);
      eventClients.delete(response);
    });
    return;
  }
  if (request.url !== "/api/knowledge") return respond(response, 404, { error: "Not found" });
  try {
    if (request.method === "GET") return respond(response, 200, { ...await readKnowledge(), editable: true });
    if (request.method !== "POST") return respond(response, 405, { error: "Method not allowed" });
    const input = await bodyOf(request);
    if (input.action === "createNode") await createNode(input);
    else if (input.action === "deleteNode") await deleteNode(input);
    else if (input.action === "updateNode") await updateNode(input);
    else if (input.action === "reorderNode") await reorderNode(input);
    else if (input.action === "addRelation") await addRelation(input);
    else if (input.action === "addDocument") await addDocument(input);
    else if (input.action === "updateDocument") await updateDocument(input);
    else throw new Error("未知操作");
    return respond(response, 200, { ...await readKnowledge(), editable: true });
  } catch (error) {
    return respond(response, 400, { error: error instanceof Error ? error.message : "操作失败" });
  }
});

await mkdir(vaultRoot, { recursive: true });
watch(vaultRoot, { recursive: true }, (_eventType, filename) => {
  const changedPath = String(filename || "").replaceAll("\\", "/");
  if (changedPath.includes("/.obsidian/") || changedPath.startsWith(".obsidian/")) return;
  clearTimeout(changeTimer);
  changeTimer = setTimeout(() => {
    const message = `event: knowledge-change\ndata: ${Date.now()}\n\n`;
    eventClients.forEach((client) => client.write(message));
  }, 120);
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write("Vault API: http://localhost:" + port + "\n");
});
