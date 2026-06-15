import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const source = path.join(process.cwd(), "src", "main", "preload.cjs");
const destination = path.join(process.cwd(), "dist-electron", "main", "preload.cjs");
const staleModulePreload = path.join(process.cwd(), "dist-electron", "main", "preload.js");

fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.copyFileSync(source, destination);
fs.rmSync(staleModulePreload, { force: true });
