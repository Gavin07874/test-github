import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const from = path.resolve("src/main/preload.cjs");
const to = path.resolve("dist-electron/main/preload.cjs");

await mkdir(path.dirname(to), { recursive: true });
await copyFile(from, to);
