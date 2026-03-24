const fs = require('fs');
const path = require('path');

const ROOT_ITEMS_TO_SCAN = ['packages', 'apps', 'registry', 'package.json', 'pnpm-workspace.yaml', 'components.json'];

// Order is critical here to avoid overlapping generic replacements.
const REPLACEMENTS = [
  { from: /usePaulyField/g, to: 'useVoraField' },
  { from: /usePaulyTable/g, to: 'useVoraTable' },
  { from: /PaulyForm/g, to: 'VoraForm' },
  { from: /@pauly\//g, to: '@vora/' },
  { from: /pauly-/g, to: 'vora-' },
  { from: /Pauly/g, to: 'VR' }
];

const VALID_EXTENSIONS = /\.(ts|tsx|js|jsx|json|css|md|html)$/;
const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', '.next', 'build']);

function replaceInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;

  for (const { from, to } of REPLACEMENTS) {
    newContent = newContent.replace(from, to);
  }

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated content: ${filePath}`);
  }
}

function scanAndReplace(itemPath) {
  if (!fs.existsSync(itemPath)) return;
  const stat = fs.statSync(itemPath);

  if (!stat.isDirectory()) {
    if (VALID_EXTENSIONS.test(path.basename(itemPath))) {
      replaceInFile(itemPath);
    }
    return;
  }

  const files = fs.readdirSync(itemPath);
  for (const file of files) {
    if (IGNORE_DIRS.has(file)) continue;
    scanAndReplace(path.join(itemPath, file));
  }
}

function renameFilesInDir(itemPath) {
  if (!fs.existsSync(itemPath)) return;
  const stat = fs.statSync(itemPath);

  if (!stat.isDirectory()) {
    const file = path.basename(itemPath);
    if (file.startsWith('Pauly')) {
      const newFile = file.replace(/^Pauly/, 'VR');
      const newPath = path.join(path.dirname(itemPath), newFile);
      fs.renameSync(itemPath, newPath);
      console.log(`Renamed: ${file} -> ${newFile}`);
    }
    return;
  }

  const files = fs.readdirSync(itemPath);
  for (const file of files) {
    if (IGNORE_DIRS.has(file)) continue;
    
    const fullPath = path.join(itemPath, file);
    // Depth-first rename
    renameFilesInDir(fullPath);
  }

  // Rename directories themselves if applicable
  const file = path.basename(itemPath);
  if (file.startsWith('Pauly')) {
    const newFile = file.replace(/^Pauly/, 'VR');
    const newPath = path.join(path.dirname(itemPath), newFile);
    fs.renameSync(itemPath, newPath);
    console.log(`Renamed directory: ${file} -> ${newFile}`);
  }
}

console.log('=============================================');
console.log('🚀 INITIATING GLOBAL RENAME: PAULY -> VORA');
console.log('=============================================');

console.log('\n[1/2] Replacing string contents across the repository...');
for (const item of ROOT_ITEMS_TO_SCAN) {
  scanAndReplace(path.join(__dirname, item));
}

console.log('\n[2/2] Renaming files and directories from Pauly* to VR*...');
for (const item of ROOT_ITEMS_TO_SCAN) {
  renameFilesInDir(path.join(__dirname, item));
}

console.log('\n✅ Renaming complete!');
