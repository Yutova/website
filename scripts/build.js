#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const zipFile = path.join(rootDir, 'yutova-build.zip');

console.log('🚀 Starting production build for yutova.com...\n');

// 1. Run version synchronization
console.log('📦 Step 1: Synchronizing asset content hash versions...');
execSync('node scripts/set-version.js', { stdio: 'inherit', cwd: rootDir });

// 2. Clean/recreate dist folder
console.log('\n🧹 Step 2: Preparing clean dist/ directory...');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// 3. Files & directories to copy to production build
const copyEntries = [
  'index.html',
  'auth-callback-bridge.html',
  'robots.txt',
  'sitemap.xml',
  '.htaccess',
  'favicon.ico',
  'favicon.svg',
  'favicon.png',
  'favicon-48x48.png',
  'apple-touch-icon.png',
  'about',
  'support',
  'privacy-policy',
  'terms-of-use',
  'css',
  'assets',
];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      if (file === '.DS_Store' || file.startsWith('._')) continue;
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    // Exclude unwanted system files
    if (path.basename(src) !== '.DS_Store' && !path.basename(src).startsWith('._')) {
      fs.copyFileSync(src, dest);
    }
  }
}

console.log('📂 Step 3: Copying production website assets...');
for (const entry of copyEntries) {
  const srcPath = path.join(rootDir, entry);
  const destPath = path.join(distDir, entry);
  if (fs.existsSync(srcPath)) {
    copyRecursive(srcPath, destPath);
    console.log(`  ✓ ${entry}`);
  }
}

// 4. Create a deployable zip file for quick Hostinger File Manager upload
console.log('\n🗜️  Step 4: Creating yutova-build.zip archive...');
try {
  if (fs.existsSync(zipFile)) fs.unlinkSync(zipFile);
  execSync(`cd "${distDir}" && zip -r "${zipFile}" . -x "*.DS_Store"`, { stdio: 'pipe' });
  console.log(`  ✓ Created: yutova-build.zip (${(fs.statSync(zipFile).size / 1024).toFixed(1)} KB)`);
} catch (e) {
  console.warn('  ⚠️ Could not create zip archive (zip utility might not be available), dist/ is ready.');
}

console.log('\n🎉 Build complete! Output is available in:');
console.log(`   📁 Folder:  ${distDir}`);
console.log(`   📦 Archive: ${zipFile}`);
console.log('\nYou can upload the contents of dist/ (or extract yutova-build.zip) directly into your Hostinger public_html folder.');
