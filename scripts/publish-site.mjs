#!/usr/bin/env node
import { spawn } from "node:child_process";
import { buildStaticSite } from "./build-static.mjs";

await buildStaticSite();
await run("git", ["add", "--", "dist"]);

const changed = await run("git", ["diff", "--cached", "--quiet", "--", "dist"], { allowFailure: true });
if (changed.code === 0) {
  console.log("Published site is already current.");
  process.exit(0);
}

const date = new Date().toISOString().slice(0, 10);
await run("git", ["commit", "--only", "-m", `Publish daily digest ${date}`, "--", "dist"]);
await run("git", ["push", "origin", "main"]);
console.log("Published site update pushed to GitHub.");

function run(command, args, { allowFailure = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: process.cwd(), stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0 || allowFailure) resolve({ code });
      else reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}
