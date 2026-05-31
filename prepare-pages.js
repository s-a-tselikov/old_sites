const fs = require('fs');
const path = require('path');

const root = __dirname;
const routes = [
  ['index.html', 'ru/index.html'],
  ['english.html', 'eng/index.html'],
  ['georgian.html', 'geo/index.html'],
  ['404.html', 'error404/index.html'],
];

for (const [src, dst] of routes) {
  const srcPath = path.join(root, src);
  const dstPath = path.join(root, dst);
  fs.mkdirSync(path.dirname(dstPath), { recursive: true });
  fs.copyFileSync(srcPath, dstPath);
  console.log('Prepared', dst);
}
