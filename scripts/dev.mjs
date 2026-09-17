import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const services = [];

async function isReachable(url) {
  return new Promise((resolve) => {
    const request = http.get(url, { headers: { Connection: "close" } }, (response) => {
      response.resume();
      response.on("end", () => resolve(Boolean(response.statusCode && response.statusCode < 500)));
    });
    request.setTimeout(800, () => request.destroy());
    request.on("error", () => resolve(false));
  });
}

const apiRunning = await isReachable("http://127.0.0.1:4174/api/knowledge");
const webRunning = await isReachable("http://localhost:5173/");

if (apiRunning) process.stdout.write("Vault API 已在运行，直接复用。\n");
else services.push(spawn(process.execPath, [path.join(root, "scripts", "vault-server.mjs")], { cwd: root, stdio: "inherit" }));

if (webRunning) process.stdout.write("知识树网页已在运行：http://localhost:5173\n");
else services.push(spawn(process.execPath, [path.join(root, "node_modules", "vinext", "dist", "cli.js"), "dev", "--port", "5173"], { cwd: root, stdio: "inherit" }));

if (services.length === 0) {
  process.stdout.write("无需重复启动，可以直接使用现有服务。\n");
}

function stop() {
  services.forEach((service) => service.kill());
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
services.forEach((service) => {
  service.on("error", (error) => {
    process.stderr.write("启动服务失败：" + error.message + "\n");
    process.exitCode = 1;
    stop();
  });
  service.on("exit", (code) => {
    if (code) process.exitCode = code;
    stop();
  });
});
