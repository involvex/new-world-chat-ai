#!/usr/bin/env node
/**
 * Notarize Script - Placeholder for macOS notarization
 */

exports.default = async function(context) {
  const { electronPlatformName } = context;
  
  if (electronPlatformName !== 'darwin') {
    return;
  }
  
  console.log('🍎 macOS notarization would run here (disabled for now)');
  // Add actual notarization logic here if needed
};
