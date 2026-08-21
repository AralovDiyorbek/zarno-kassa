const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building Vite frontend...');
execSync('npm run build', { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });

const srcDir = path.join(__dirname, 'frontend', 'dist');
const destDir = path.join(__dirname, 'dist');

console.log('Copying frontend/dist to root dist...');
if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}

fs.cpSync(srcDir, destDir, { recursive: true });
console.log('Web build completed successfully!');
