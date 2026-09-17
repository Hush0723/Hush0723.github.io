import { writeFile } from "node:fs/promises";
import path from "node:path";
import { projectRoot, readKnowledge } from "./vault-store.mjs";

const snapshot = await readKnowledge();
await writeFile(path.join(projectRoot, "public", "knowledge.json"), JSON.stringify({ ...snapshot, editable: false }, null, 2), "utf8");
process.stdout.write("Generated public/knowledge.json\n");
