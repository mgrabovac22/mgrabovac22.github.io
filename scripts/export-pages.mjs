import { copyFile, mkdir, readdir, realpath, rmdir, unlink } from 'node:fs/promises';
import { isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const dist = join(root, 'dist');

async function syncDirectory(source, destination) {
  await mkdir(destination, { recursive: true });
  const location = relative(root, await realpath(destination));
  if (!location || isAbsolute(location) || location.startsWith('..' + sep) || location === '..') {
    throw new Error('Expected an output directory inside the repository: ' + destination);
  }

  const files = await readdir(source, { recursive: true, withFileTypes: true });
  const previous = await readdir(destination, { recursive: true, withFileTypes: true });
  if ([...files, ...previous].some(file => file.isSymbolicLink())) {
    throw new Error('Symbolic links are unsupported in generated site assets: ' + destination);
  }

  const expected = new Map(files.map(file => [relative(source, join(file.parentPath, file.name)), file.isDirectory()]));
  for (const file of previous.reverse()) {
    const path = join(file.parentPath, file.name);
    if (expected.get(relative(destination, path)) === file.isDirectory()) continue;
    if (file.isDirectory()) await rmdir(path);
    else await unlink(path);
  }

  for (const [path, directory] of expected) {
    const output = join(destination, path);
    if (directory) await mkdir(output, { recursive: true });
    else await copyFile(join(source, path), output);
  }
}

for (const directory of ['site-assets', 'art', 'files', 'legal']) {
  await syncDirectory(join(dist, directory), join(root, directory));
}
for (const page of ['index.html', 'hr.html']) {
  await copyFile(join(dist, page), join(root, page));
}
