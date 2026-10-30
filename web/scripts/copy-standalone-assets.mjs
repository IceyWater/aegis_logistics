import { cp, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standaloneRoot = path.join(webRoot, ".next", "standalone");
const staticOutput = path.join(standaloneRoot, ".next", "static");

await mkdir(staticOutput, { recursive: true });
await cp(path.join(webRoot, ".next", "static"), staticOutput, {
  recursive: true,
  force: true,
});

const publicRoot = path.join(webRoot, "public");
if (existsSync(publicRoot)) {
  await cp(publicRoot, path.join(standaloneRoot, "public"), {
    recursive: true,
    force: true,
  });
}
