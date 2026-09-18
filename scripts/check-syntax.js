// Parses every JS file in server/ and public/js/ so a typo fails CI before
// anything is deployed. Browser files are checked as plain scripts.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let failed = 0, checked = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name !== 'node_modules') walk(full); continue; }
    if (!entry.name.endsWith('.js')) continue;
    checked++;
    try {
      new vm.Script(fs.readFileSync(full, 'utf8'), { filename: full });
    } catch (e) {
      failed++;
      console.error(`✗ ${path.relative(process.cwd(), full)}: ${e.message}`);
    }
  }
}
for (const d of ['server', 'public/js', 'scripts', 'test']) if (fs.existsSync(d)) walk(d);
console.log(`${checked} files checked, ${failed} with syntax errors`);
process.exit(failed ? 1 : 0);
