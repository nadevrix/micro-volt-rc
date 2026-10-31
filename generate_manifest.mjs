import fs from 'node:fs';
import path from 'node:path';

const baseDir = path.resolve('public/assets/packs');
const outputDir = path.resolve('src');
const outputFile = path.join(outputDir, 'asset-manifest.json');

function findGlbFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findGlbFiles(fullPath));
    } else if (file.toLowerCase().endsWith('.glb')) {
      results.push(fullPath);
    }
  }
  return results;
}

const glbFiles = findGlbFiles(baseDir).sort();

const packs = {};
const files = [];
const paths = [];

for (const filePath of glbFiles) {
  // relative to project root
  const relativeToProject = path.relative(process.cwd(), filePath);
  // web path served by Vite from public/
  const relativeToPublic = path.relative(path.resolve('public'), filePath);
  const webPath = '/' + relativeToPublic.split(path.sep).join('/');
  
  // Extract pack name
  const parts = relativeToPublic.split(path.sep);
  // parts[0] is 'assets', parts[1] is 'packs', parts[2] is pack name
  const packName = parts[2] || 'unknown';
  const fileName = path.basename(filePath, path.extname(filePath));

  if (!packs[packName]) {
    packs[packName] = [];
  }
  packs[packName].push(webPath);

  files.push({
    name: fileName,
    pack: packName,
    relativePath: relativeToProject,
    path: webPath
  });

  paths.push(webPath);
}

const manifest = {
  total: files.length,
  packs,
  paths,
  files
};

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputFile, JSON.stringify(manifest, null, 2), 'utf-8');
console.log(`Manifest generado exitosamente en ${outputFile}`);
console.log(`Total archivos .glb encontrados: ${files.length}`);
for (const [pack, list] of Object.entries(packs)) {
  console.log(` - ${pack}: ${list.length} modelos`);
}
