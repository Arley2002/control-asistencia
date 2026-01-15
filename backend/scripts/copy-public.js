import fs from 'fs';
import path from 'path';

const src = path.join(process.cwd(), 'public');
const dest = path.join(process.cwd(), 'dist', 'public');

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from)) {
    const srcPath = path.join(from, entry);
    const destPath = path.join(to, entry);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(src, dest);
console.log(`Public assets copied to ${dest}`);
