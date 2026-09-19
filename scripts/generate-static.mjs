import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { projectRoot, readKnowledge, vaultRoot } from "./vault-store.mjs";

const imageExtensions = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);

async function copyReferencedAssets(snapshot) {
  const outputRoot = path.join(projectRoot, "public", "knowledge-assets");
  await rm(outputRoot, { recursive: true, force: true });
  const copied = new Set();
  for (const node of snapshot.nodes) {
    for (const document of node.documents) {
      for (const match of document.content.matchAll(/!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
        const attachment = match[1].trim().replaceAll("\\", "/");
        if (!imageExtensions.has(path.extname(attachment).toLowerCase())) continue;
        const relativePath = path.join(...node.id.split("/"), ...attachment.split("/"));
        if (copied.has(relativePath)) continue;
        const source = path.resolve(vaultRoot, relativePath);
        const vaultPrefix = path.resolve(vaultRoot) + path.sep;
        if (!source.toLowerCase().startsWith(vaultPrefix.toLowerCase())) continue;
        const destination = path.join(outputRoot, relativePath);
        try {
          await mkdir(path.dirname(destination), { recursive: true });
          await copyFile(source, destination);
          copied.add(relativePath);
        } catch {
          process.stderr.write(`Missing referenced attachment: ${relativePath}\n`);
        }
      }
    }
  }
  return copied.size;
}

const snapshot = await readKnowledge();
await writeFile(path.join(projectRoot, "public", "knowledge.json"), JSON.stringify({ ...snapshot, editable: false }, null, 2), "utf8");
const assetCount = await copyReferencedAssets(snapshot);
process.stdout.write(`Generated public/knowledge.json and ${assetCount} referenced asset(s)\n`);
