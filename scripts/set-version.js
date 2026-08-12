#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const versionFilePath = path.join(rootDir, 'VERSION');

// Get version from command line argument or read from VERSION file
let targetVersion = process.argv[2];

if (!targetVersion) {
  if (fs.existsSync(versionFilePath)) {
    targetVersion = fs.readFileSync(versionFilePath, 'utf8').trim();
  } else {
    targetVersion = '1.0.0';
  }
} else {
  // Update the VERSION file if a new version was passed
  fs.writeFileSync(versionFilePath, targetVersion.trim() + '\n', 'utf8');

  // Also sync package.json if it exists
  const pkgPath = path.join(rootDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      pkg.version = targetVersion.trim();
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    } catch (e) {}
  }
}

targetVersion = targetVersion.trim();
console.log(`Setting global asset version to: v=${targetVersion}`);

function findHtmlFiles(dir, fileList = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (item === 'node_modules' || item === '.git' || item === 'dist') continue;
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findHtmlFiles(fullPath, fileList);
    } else if (item.endsWith('.html')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const htmlFiles = findHtmlFiles(rootDir);
let updatedCount = 0;

for (const file of htmlFiles) {
  let content = fs.readFileSync(file, 'utf8');
  const relativePath = path.relative(rootDir, file);

  // Match any asset with ?v=...
  const updatedContent = content.replace(
    /(\.(?:css|js|png|svg|ico|webp|woff2|woff)\?v=)[a-zA-Z0-9._-]+/g,
    `$1${targetVersion}`
  );

  if (content !== updatedContent) {
    fs.writeFileSync(file, updatedContent, 'utf8');
    console.log(`  ✓ Updated assets in: ${relativePath}`);
    updatedCount++;
  } else {
    console.log(`  - No versioned assets changed in: ${relativePath}`);
  }
}

console.log(`\nSuccessfully updated ${updatedCount} file(s) to version ${targetVersion}.`);
