const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

/* A stylesheet whose braces do not balance will make a browser silently drop
 * every rule from the first stray brace onwards. That is how the paper
 * reading ground went missing for a whole verification run. This checks the
 * structure, not the looks. */
const problems = [];
for (const file of ["tokens", "base", "components", "sections", "motion"]) {
  const full = path.join(root, "css", `${file}.css`);
  const text = fs.readFileSync(full, "utf8");
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const body = stripped.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g, '""');

  let depth = 0;
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] === "{") depth += 1;
    else if (body[i] === "}") {
      depth -= 1;
      if (depth < 0) {
        problems.push(`${file}.css: unexpected "}" at offset ${i}`);
        depth = 0;
      }
    }
  }
  if (depth !== 0) problems.push(`${file}.css: ${depth} unclosed "{" at end of file`);

  // Declarations sitting at the top level, outside any block, are dead CSS.
  const topLevelDecl = body.replace(/[^{}]*\{[^{}]*\}/g, "");
  if (/(^|})\s*[-\w]+\s*:/.test(topLevelDecl)) {
    const m = topLevelDecl.match(/(--[\w-]+)\s*:/);
    problems.push(`${file}.css: declaration "${m && m[1]}" is outside any block`);
  }

}

// Every var() must name a property that is actually defined somewhere in the
// project, or set at runtime by the script. A typo here renders as an
// inherited default, which is silent, so it is worth catching.
const FILES = ["tokens", "base", "components", "sections", "motion"];
const defined = new Set();
for (const file of FILES) {
  const text = fs.readFileSync(path.join(root, "css", `${file}.css`), "utf8");
  for (const m of text.matchAll(/(--[\w-]+)\s*:/g)) defined.add(m[1]);
}
// Set by js/reader.js at runtime, never by a stylesheet.
for (const runtime of ["--speech", "--rd-progress"]) defined.add(runtime);

for (const file of FILES) {
  const text = fs.readFileSync(path.join(root, "css", `${file}.css`), "utf8");
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const used = new Set([...stripped.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]));
  const unknown = [...used].filter((u) => !defined.has(u));
  if (unknown.length) {
    problems.push(`${file}.css: undefined custom propert${unknown.length > 1 ? "ies" : "y"} ${unknown.join(", ")}`);
  }
}

if (problems.length) {
  console.error("CSS structure broken:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log("CSS structure ok: 5 stylesheets, braces balanced, no dead declarations, all var() resolved");
