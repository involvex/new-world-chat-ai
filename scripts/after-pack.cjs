#!/usr/bin/env node
/**
 * After Pack Script - Post-build optimizations
 */

const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
  const { electronPlatformName, appOutDir } = context;
  
  console.log(`🔧 Running after-pack for ${electronPlatformName}...`);
  console.log('appOutDir:', appOutDir);
  
  try {
    // Verify icon files are properly included
    const buildDir = path.join(appOutDir, 'resources', 'build');
    
    if (!fs.existsSync(buildDir)) {
      console.log(`⚠️  Build directory not found: ${buildDir}`);
      return;
    }
    
    const iconFiles = ['icon.png', 'icon.ico', 'icon.icns'];
    for (const iconFile of iconFiles) {
      const iconPath = path.join(buildDir, iconFile);
      if (fs.existsSync(iconPath)) {
        console.log(`✅ Icon verified: ${iconFile}`);
      } else {
        console.log(`⚠️  Missing icon: ${iconFile}`);
      }
    }
    
    // Copy PowerShell script to build directory
    const psScriptSource = path.join(process.cwd(), 'fokusnewworldscreenshot.ps1');
    const psScriptDest = path.join(buildDir, 'fokusnewworldscreenshot.ps1');
    
    if (fs.existsSync(psScriptSource)) {
      try {
        fs.copyFileSync(psScriptSource, psScriptDest);
        console.log(`✅ PowerShell script copied to build directory`);
      } catch (error) {
        console.error(`❌ Failed to copy PowerShell script: ${error.message}`);
      }
    } else {
      console.warn(`⚠️  PowerShell script not found at source: ${psScriptSource}`);
    }
    
    // Log build completion
    console.log(`✅ After-pack completed for ${electronPlatformName}`);
    
  } catch (error) {
    console.error(`❌ After-pack error: ${error.message}`);
  }
};
