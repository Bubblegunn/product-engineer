// arm-settings.mjs <arms.json> <arm> <base settings file> <out file>
// Writes the --settings file of one arm: the shared base settings merged with the arm's "settings" object in
// arms.json. An arm without settings gets no file, and a stale file left by an earlier arms.json is removed.
// A file that already holds the wanted content is left alone. Every write goes to a temporary name in the same
// directory and is then renamed over the target, so a run that starts at the same moment reads either the old
// complete file or the new complete file, never a partial one.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";

const [armsFile, arm, baseFile, out] = process.argv.slice(2);
if (!armsFile || !arm || !baseFile || !out) {
  process.stderr.write("usage: node arm-settings.mjs <arms.json> <arm> <base settings file> <out file>\n");
  process.exit(2);
}
const arms = JSON.parse(readFileSync(armsFile, "utf8"));
if (!Object.prototype.hasOwnProperty.call(arms, arm)) {
  process.stderr.write(`arm-settings.mjs: unknown arm: ${arm}\n`);
  process.exit(2);
}
if (arms[arm].settings === undefined) {
  rmSync(out, { force: true });
  process.exit(0);
}
const base = JSON.parse(readFileSync(baseFile, "utf8"));
const wanted = `${JSON.stringify({ ...base, ...arms[arm].settings }, null, 2)}\n`;
if (existsSync(out) && readFileSync(out, "utf8") === wanted) process.exit(0);
const temp = `${out}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
writeFileSync(temp, wanted);
renameSync(temp, out);
