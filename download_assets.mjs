import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const packs = [
  { name: 'toy-car-kit', pageUrl: 'https://kenney.nl/assets/toy-car-kit' },
  { name: 'car-kit', pageUrl: 'https://kenney.nl/assets/car-kit' },
  { name: 'racing-kit', pageUrl: 'https://kenney.nl/assets/racing-kit' },
  { name: 'city-kit-suburban', pageUrl: 'https://kenney.nl/assets/city-kit-suburban' },
  { name: 'furniture-kit', pageUrl: 'https://kenney.nl/assets/furniture-kit' },
];

const baseDir = path.resolve('public/assets/packs');
if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

async function downloadPack({ name, pageUrl }) {
  console.log(`\n=== Procesando pack: ${name} ===`);
  console.log(`Consultando página: ${pageUrl}`);

  const htmlResponse = await fetch(pageUrl);
  if (!htmlResponse.ok) {
    throw new Error(`Error al obtener HTML de ${pageUrl}: ${htmlResponse.statusText}`);
  }
  const html = await htmlResponse.text();

  const regex = /https:\/\/kenney\.nl\/media\/pages\/assets\/[^"'\s>]+\.zip/;
  const match = html.match(regex);
  if (!match) {
    throw new Error(`No se encontró enlace .zip en ${pageUrl}`);
  }

  const zipUrl = match[0];
  console.log(`Enlace de descarga encontrado: ${zipUrl}`);

  const destDir = path.join(baseDir, name);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const tempZipPath = path.join(baseDir, `${name}.zip`);

  console.log(`Descargando ${name}.zip...`);
  const zipResponse = await fetch(zipUrl);
  if (!zipResponse.ok) {
    throw new Error(`Error al descargar ZIP desde ${zipUrl}: ${zipResponse.statusText}`);
  }

  const arrayBuffer = await zipResponse.arrayBuffer();
  fs.writeFileSync(tempZipPath, Buffer.from(arrayBuffer));
  console.log(`Descarga completada (${(arrayBuffer.byteLength / (1024 * 1024)).toFixed(2)} MB). Descomprimiendo en ${destDir}...`);

  execSync(`unzip -o -q "${tempZipPath}" -d "${destDir}"`);
  console.log(`Descompresión completada para ${name}.`);

  fs.unlinkSync(tempZipPath);
}

async function main() {
  for (const pack of packs) {
    await downloadPack(pack);
  }
  console.log('\nTodos los packs han sido descargados y descomprimidos exitosamente.');
}

main().catch((err) => {
  console.error('Error durante la descarga de assets:', err);
  process.exit(1);
});
