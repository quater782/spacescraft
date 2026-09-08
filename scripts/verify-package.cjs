const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('acorn');
const asar = require('@electron/asar');

// Follow the browser entry points and actual import/export graph, including
// transitive dependencies introduced by a future Three.js update.
function verifyPackage(root, ignore = []) {
  const archived = root.endsWith('.asar');
  const visited = new Set();
  function read(file) {
    const parts = file.split('/');
    for (let n = 1; n <= parts.length; n++) {
      const prefix = `/${parts.slice(0, n).join('/')}`;
      if (ignore.some((rule) => rule.test(prefix))) throw new Error(`Packaging excludes required asset: ${file}`);
    }
    try {
      return archived ? asar.extractFile(root, file).toString() : fs.readFileSync(path.join(root, file), 'utf8');
    } catch {
      throw new Error(`Required packaged asset is missing: ${file}`);
    }
  }
  const html = read('index.html');
  const importMap = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  function resolve(specifier, parent) {
    const mapped = importMap[specifier];
    const value = (mapped || specifier).split(/[?#]/)[0];
    if (!value.startsWith('.')) throw new Error(`Unmapped/nonlocal dependency: ${specifier} in ${parent}`);
    const target = path.posix.normalize(path.posix.join(mapped ? '' : path.posix.dirname(parent), value));
    if (target.startsWith('../')) throw new Error(`Dependency escapes package: ${target}`);
    return target;
  }
  function visit(file) {
    if (visited.has(file)) return;
    visited.add(file);
    const code = read(file);
    if (!file.endsWith('.js')) return;
    const ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
    for (const node of ast.body) {
      if (node.source) visit(resolve(node.source.value, file));
    }
  }
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)="([^"]+)"/g)) {
    visit(resolve(match[1], 'index.html'));
  }
  console.log(`Packaged browser assets verified: ${visited.size} files and their module dependencies.`);
}

module.exports = { verifyPackage };
if (require.main === module) {
  const target = process.argv[2];
  verifyPackage(target ? path.resolve(target) : path.resolve(__dirname, '..'),
    target ? [] : require('../forge.config.cjs').packagerConfig.ignore);
}
