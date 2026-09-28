const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const main = fs.readFileSync(path.join(root, "js/main.js"), "utf8");
const reader = fs.readFileSync(path.join(root, "js/reader.js"), "utf8");

const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
const collectBlock = main.slice(main.indexOf("function collect()"), main.indexOf("function bookProgress"));
const collected = new Set(
  [...collectBlock.matchAll(/"([A-Za-z][\w]*)"/g)].map((m) => m[1])
);
const aliases = new Set(
  [...collectBlock.matchAll(/dom\.(\w+)\s*=\s*dom\.(\w+)/g)].flatMap((m) => [m[1], m[2]])
);

const domRefs = (src) => new Set([...src.matchAll(/\bdom\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]));
const problems = [];

for (const key of collected) {
  if (!ids.has(key)) problems.push(`collected "${key}" but index.html has no id="${key}"`);
}
for (const key of [...aliases]) {
  if (!ids.has(key) && !aliases.has(key)) problems.push(`alias target "${key}" has no id`);
}
for (const key of domRefs(reader)) {
  if (!collected.has(key) && !aliases.has(key)) {
    problems.push(`reader.js uses dom.${key}, which collect() never fills`);
  }
}
for (const key of domRefs(main)) {
  if (!collected.has(key) && !aliases.has(key)) {
    problems.push(`main.js uses dom.${key}, which collect() never fills`);
  }
}

if (problems.length) {
  console.error("DOM contract broken:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`DOM contract ok: ${ids.size} ids, ${collected.size} collected, ` +
            `${domRefs(reader).size + domRefs(main).size} references resolved`);
