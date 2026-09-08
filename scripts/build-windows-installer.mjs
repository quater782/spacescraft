import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import verifier from './verify-package.cjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const { version, productName } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const appDir = path.join(root, 'out', `${productName}-win32-x64`);
if (!fs.existsSync(path.join(appDir, 'SPACECRAFT.exe'))) {
  throw new Error('Build the Windows application first: npm run package:win');
}
verifier.verifyPackage(path.join(appDir, 'resources', 'app.asar'));
const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
const revision = process.env.SPACECRAFT_BUILD_REVISION || '';
if (revision && !/^[a-zA-Z0-9-]+$/.test(revision)) throw new Error('Invalid build revision');
const output = path.join(root, 'dist', `SPACECRAFT-${version}-snapshot-${stamp}${revision ? `-${revision}` : ''}-windows-x64-Setup.exe`);
fs.mkdirSync(path.dirname(output), { recursive: true });
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'spacecraft-nsis-'));
const manifest = path.join(temporary, 'uninstall-files.nsh');
const escape = (value) => value.replaceAll('$', '$$').replaceAll('"', '$\\"');
const lines = [];
function inventory(directory, relative = '') {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const child = path.join(directory, entry.name);
    const target = relative ? `${relative}\\${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      inventory(child, target);
      lines.push(`RMDir "$INSTDIR\\${escape(target)}"`);
    } else if (entry.isFile()) {
      lines.push(`Delete "$INSTDIR\\${escape(target)}"`);
    } else {
      throw new Error(`Unexpected package entry: ${child}`);
    }
  }
}
try {
  inventory(appDir);
  fs.writeFileSync(manifest, lines.join('\n'));
  const result = spawnSync('makensis', [
    '-V2', `-DAPP_DIR=${appDir}`, `-DOUTPUT_FILE=${output}`,
    `-DAPP_VERSION=${version}`, `-DUNINSTALL_FILES=${manifest}`,
    'windows-installer.nsi',
  ].map((argument) => process.platform === 'win32' && argument.startsWith('-') ? `/${argument.slice(1)}` : argument),
  { cwd: path.join(root, 'scripts'), stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`NSIS failed: ${result.status}`);
  console.log(output);
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
