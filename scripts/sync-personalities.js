const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '..', 'personalities');
const TARGET_DIRS = [
  path.join(__dirname, '..', 'chrome-extension', 'personalities'),
  path.join(__dirname, '..', 'firefox-extension', 'personalities')
];

function parseFrontMatter(text) {
  if (!text || !text.startsWith('---')) return { label: '' };
  const match = text.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---/);
  if (!match) return { label: '' };
  const frontMatter = match[1].trim();
  const data = { label: '' };
  frontMatter.split(/\r?\n/).forEach((line) => {
    const [key, ...rest] = line.split(':');
    if (!key || rest.length === 0) return;
    const value = rest.join(':').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (key.trim().toLowerCase() === 'label') {
      data.label = value;
    }
  });
  return data;
}

function collectPersonalityFiles() {
  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error(`Source directory does not exist: ${SOURCE_DIR}`);
  }
  const entries = fs.readdirSync(SOURCE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => {
      const key = path.basename(entry.name, '.md');
      const file = entry.name;
      const fullPath = path.join(SOURCE_DIR, entry.name);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const { label } = parseFrontMatter(content);
      return {
        key,
        file,
        label: label || key,
        content
      };
    });
  if (!entries.length) {
    throw new Error('No markdown personalities found in ' + SOURCE_DIR);
  }
  return entries;
}

function writeIndex(dir, entries) {
  const indexPath = path.join(dir, 'index.json');
  const payload = entries.map(({ key, file, label }) => ({ key, file, label }));
  fs.writeFileSync(indexPath, JSON.stringify(payload, null, 2) + '\n', 'utf-8');
}

function syncToTarget(targetDir, entries) {
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });
  entries.forEach(({ file, content }) => {
    fs.writeFileSync(path.join(targetDir, file), content, 'utf-8');
  });
  writeIndex(targetDir, entries);
}

function main() {
  const entries = collectPersonalityFiles();
  writeIndex(SOURCE_DIR, entries);
  TARGET_DIRS.forEach((target) => syncToTarget(target, entries));
}

main();
