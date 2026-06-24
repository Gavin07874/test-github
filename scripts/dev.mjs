import { spawn } from "node:child_process";

const children = [
  spawn("npm", ["run", "dev:main"], { stdio: "inherit", shell: true }),
  spawn("npm", ["run", "dev:renderer"], { stdio: "inherit", shell: true })
];

function stop() {
  for (const child of children) child.kill("SIGINT");
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
