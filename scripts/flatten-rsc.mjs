/**
 * Post-build fix for static export: Next writes per-segment prefetch payloads
 * as   <route>/__next.<a>/<b>/__PAGE__.txt
 * but the client router requests the flattened form
 *      <route>/__next.<a>.<b>.__PAGE__.txt
 * This copies every nested segment payload to its flattened name so link
 * prefetching works on any static host (Netlify, nginx, S3, …).
 */
import fs from "node:fs";
import path from "node:path";

const out = path.resolve(process.argv[2] ?? "out");
let count = 0;

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (!e.isDirectory()) continue;
    if (e.name.startsWith("__next.")) flatten(p, dir, e.name);
    else if (e.name !== "_next") walk(p);
  }
}

function flatten(segDir, parent, prefix) {
  const stack = [[segDir, prefix]];
  while (stack.length) {
    const [d, name] = stack.pop();
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      const flat = `${name}.${e.name}`;
      if (e.isDirectory()) stack.push([p, flat]);
      else {
        const target = path.join(parent, flat);
        if (!fs.existsSync(target)) {
          fs.copyFileSync(p, target);
          count++;
        }
      }
    }
  }
}

if (!fs.existsSync(out)) {
  console.error(`flatten-rsc: ${out} not found`);
  process.exit(1);
}
walk(out);
console.log(`flatten-rsc: wrote ${count} flattened segment payloads`);
