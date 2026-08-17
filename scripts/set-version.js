#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '..');

console.log('🔍 Computing asset content hashes (cache-busting by file content)...');

// Cache computed file hashes to avoid re-reading disk for identical assets
const fileHashMap = new Map();

function getFileHash(filePath) {
  if (fileHashMap.has(filePath)) {
    return fileHashMap.get(filePath);
  }
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('md5').update(fileBuffer).digest('hex').slice(0, 8);
    fileHashMap.set(filePath, hash);
    return hash;
  } catch (err) {
    return null;
  }
}

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
let updatedFilesCount = 0;
let totalAssetsVersioned = 0;

for (const htmlFile of htmlFiles) {
  const originalContent = fs.readFileSync(htmlFile, 'utf8');
  const relativeHtmlPath = path.relative(rootDir, htmlFile);
  const htmlDir = path.dirname(htmlFile);
  let fileAssetsCount = 0;

  // Match any asset link with an existing ?v= query parameter
  const updatedContent = originalContent.replace(
    /((?:href|src)=["'])([^"'?#]+\.(?:css|js|png|svg|ico|webp|woff2|woff))\?v=[a-zA-Z0-9._-]+(["'])/g,
    (match, prefix, assetRelativePath, suffix) => {
      // Resolve asset path relative to the current HTML file
      let fullAssetPath;
      if (assetRelativePath.startsWith('/')) {
        fullAssetPath = path.join(rootDir, assetRelativePath);
      } else {
        fullAssetPath = path.resolve(htmlDir, assetRelativePath);
      }

      const hash = getFileHash(fullAssetPath);
      if (!hash) {
        return match; // File not found, keep original match
      }

      fileAssetsCount++;
      return `${prefix}${assetRelativePath}?v=${hash}${suffix}`;
    }
  );

  if (originalContent !== updatedContent) {
    fs.writeFileSync(htmlFile, updatedContent, 'utf8');
    console.log(`  ✓ Updated hashes in: ${relativeHtmlPath} (${fileAssetsCount} asset links)`);
    updatedFilesCount++;
  } else {
    console.log(`  - No hash changes in: ${relativeHtmlPath}`);
  }
  totalAssetsVersioned += fileAssetsCount;
}

console.log('\n📊 Asset Content Hashes:');
for (const [filePath, hash] of fileHashMap.entries()) {
  const relPath = path.relative(rootDir, filePath);
  console.log(`  • ${relPath} -> v=${hash}`);
}

console.log(`\n✅ Completed content hash versioning: ${updatedFilesCount} HTML file(s) updated, ${totalAssetsVersioned} total asset references linked.`);
