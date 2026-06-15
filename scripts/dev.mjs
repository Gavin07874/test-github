import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const devUrl = "http://127.0.0.1:5173";
const mainEntry = path.join(root, "dist-electron", "main", "main.js");
const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const electronBin = isWindows
  ? path.join(root, "node_modules", ".bin", "electron.cmd")
  : path.join(root, "node_modules", ".bin", "electron");
const preloadSource = path.join(root, "src", "main", "preload.cjs");
const preloadDestination = path.join(root, "dist-electron", "main", "preload.cjs");

const children = [];
let electronProcess;

function run(name, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    ...options
  });
  children.push(child);
  child.on("exit", (code) => {
    if (code && !shuttingDown) {
      console.error(`${name} exited with code ${code}`);
    }
  });
  return child;
}

let shuttingDown = false;
function shutdown() {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});
process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});

function waitForRenderer() {
  return new Promise((resolve) => {
    const started = Date.now();
    const check = () => {
      http
        .get(devUrl, (response) => {
          response.resume();
          resolve();
        })
        .on("error", () => {
          if (Date.now() - started > 45000) {
            console.error("Timed out waiting for the renderer dev server.");
            shutdown();
            process.exit(1);
          }
          setTimeout(check, 350);
        });
    };
    check();
  });
}

function waitForMainEntry() {
  return new Promise((resolve) => {
    const started = Date.now();
    const check = () => {
      if (fs.existsSync(mainEntry)) {
        resolve();
        return;
      }
      if (Date.now() - started > 45000) {
        console.error("Timed out waiting for Electron main compilation.");
        shutdown();
        process.exit(1);
      }
      setTimeout(check, 350);
    };
    check();
  });
}

run("renderer", npmCommand, ["run", "dev:renderer"]);
run("electron-main", npmCommand, ["run", "dev:main"]);

await Promise.all([waitForRenderer(), waitForMainEntry()]);

fs.mkdirSync(path.dirname(preloadDestination), { recursive: true });
fs.copyFileSync(preloadSource, preloadDestination);

electronProcess = run("electron", electronBin, ["."], {
  env: {
    ...process.env,
    VITE_DEV_SERVER_URL: devUrl
  }
});

electronProcess.on("exit", () => {
  shutdown();
  process.exit(0);
});
