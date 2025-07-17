/**
 * Automated Release Script for New World Chat AI v1.5.4
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🤖 Auto Release Build Starting...');
console.time('Total Build Time');

try {
  // Get current version from package.json
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const version = pkg.version;
  const releaseDir = path.join('release', `v${version}`);

  // Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  if (fs.existsSync('dist')) fs.rmSync('dist', { recursive: true, force: true });
  if (fs.existsSync('dist-electron')) fs.rmSync('dist-electron', { recursive: true, force: true });
  if (fs.existsSync(releaseDir)) fs.rmSync(releaseDir, { recursive: true, force: true });

  // Build frontend
  console.log('⚡ Building Vite frontend...');
  execSync('npm run build', { stdio: 'inherit' });

  // Build Electron distributables
  console.log('📦 Building Windows distributables...');
  execSync('npx electron-builder --win --publish=never', {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });

  // Create release/v{version} folder
  fs.mkdirSync(releaseDir, { recursive: true });

  // Copy all outputs from dist-electron to release/v{version}
  function copyRecursive(src, dest) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      for (const entry of fs.readdirSync(src)) {
        copyRecursive(path.join(src, entry), path.join(dest, entry));
      }
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  if (fs.existsSync('dist-electron')) {
    const files = fs.readdirSync('dist-electron');
    for (const file of files) {
      // Skip hidden/system files
      if (file.startsWith('.')) continue;
      const srcPath = path.join('dist-electron', file);
      const destPath = path.join(releaseDir, file);
      copyRecursive(srcPath, destPath);
    }
    console.log('📁 Built files copied to', releaseDir);
  }

  // Verify PowerShell script inclusion
  const psScript = path.join(releaseDir, 'fokusnewworldscreenshot.ps1');
  if (fs.existsSync(psScript)) {
    console.log('✅ PowerShell screenshot script included:', psScript);
  } else {
    console.warn('⚠️ PowerShell screenshot script NOT found in output!');
  }

  // Copy release notes
  const releaseNotesSrc = `RELEASE_NOTES_v${version}.md`;
  const releaseNotesDest = path.join(releaseDir, `RELEASE_NOTES_v${version}.md`);
  if (fs.existsSync(releaseNotesSrc)) {
    fs.copyFileSync(releaseNotesSrc, releaseNotesDest);
    console.log('📝 Release notes copied to output.');
  }

  // List output files
  const outFiles = fs.readdirSync(releaseDir);
  console.log('📁 Final release files:', outFiles.join(', '));

  // Optional: Sign the portable executable if signtool.exe is available
  const exeName = `New World Chat AI-${version}-portable.exe`;
  const exePath = path.join(releaseDir, exeName);
  const signtoolPath = 'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\x64\\signtool.exe'; // Adjust path as needed

  if (fs.existsSync(signtoolPath) && fs.existsSync(exePath)) {
    try {
      console.log('🔏 Signing executable with signtool...');
      execSync(`"${signtoolPath}" sign /fd SHA256 /a "${exePath}"`, { stdio: 'inherit' });
      console.log('✅ Executable signed.');
    } catch (err) {
      console.warn('⚠️ signtool failed:', err.message);
    }
  }

  console.timeEnd('Total Build Time');
  console.log('🎉 Auto release build complete!');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
