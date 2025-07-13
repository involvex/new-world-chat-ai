#!/usr/bin/env node
/**
 * Build Validation and Recovery Script
 * Validates build environment and handles build errors gracefully
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BuildValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '🔍',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    }[type] || 'ℹ️';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  validateEnvironment() {
    this.log('Validating build environment...', 'info');
    
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 16) {
      this.errors.push(`Node.js version ${nodeVersion} is too old. Requires Node 16+`);
    } else {
      this.log(`Node.js version: ${nodeVersion}`, 'success');
    }

    // Check platform
    this.log(`Platform: ${process.platform} ${process.arch}`, 'info');

    // Check available memory
    const totalMem = Math.round(require('os').totalmem() / 1024 / 1024 / 1024);
    if (totalMem < 4) {
      this.warnings.push(`Low memory detected: ${totalMem}GB. Build may be slow.`);
    }

    return this.errors.length === 0;
  }

  validateDependencies() {
    this.log('Validating dependencies...', 'info');
    
    const requiredDeps = [
      'electron',
      'react',
      'react-dom',
      'vite',
      'electron-builder'
    ];

    for (const dep of requiredDeps) {
      try {
        require.resolve(dep);
        this.log(`✓ ${dep}`, 'success');
      } catch (error) {
        this.errors.push(`Missing dependency: ${dep}`);
      }
    }

    return this.errors.length === 0;
  }

  validateIcons() {
    this.log('Validating icon files...', 'info');
    
    const requiredIcons = [
      'build/icon.png',
      'build/icon.ico', 
      'build/icon.icns',
      'icon.png'
    ];

    for (const iconPath of requiredIcons) {
      if (fs.existsSync(iconPath)) {
        this.log(`✓ ${iconPath}`, 'success');
      } else {
        this.warnings.push(`Missing icon: ${iconPath}`);
      }
    }

    return true; // Icons are warnings, not errors
  }

  validateBuildOutput() {
    this.log('Validating build output...', 'info');
    
    const requiredFiles = [
      'dist/index.html',
      'dist/assets'
    ];

    for (const filePath of requiredFiles) {
      if (fs.existsSync(filePath)) {
        this.log(`✓ ${filePath}`, 'success');
      } else {
        this.errors.push(`Missing build output: ${filePath}`);
      }
    }

    return this.errors.length === 0;
  }

  killProcesses() {
    this.log('Killing any hanging processes...', 'info');
    
    if (process.platform === 'win32') {
      try {
        execSync('taskkill /F /IM electron.exe /T 2>nul', { stdio: 'ignore' });
        execSync('taskkill /F /IM node.exe /T 2>nul', { stdio: 'ignore' });
        this.log('Processes cleaned up', 'success');
      } catch (error) {
        // Ignore errors - processes might not be running
      }
    }
  }

  cleanBuildDirs() {
    this.log('Cleaning build directories...', 'info');
    
    const dirsToClean = ['dist', 'dist-electron', 'node_modules/.cache', '.vite'];
    
    for (const dir of dirsToClean) {
      try {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
          this.log(`Cleaned ${dir}`, 'success');
        }
      } catch (error) {
        this.warnings.push(`Failed to clean ${dir}: ${error.message}`);
      }
    }
  }

  recoverBuild() {
    this.log('Attempting build recovery...', 'warning');
    
    // Kill processes
    this.killProcesses();
    
    // Clean directories
    this.cleanBuildDirs();
    
    // Check for partial builds
    if (fs.existsSync('dist-electron/win-unpacked')) {
      this.log('Found partial Electron build', 'info');
      
      // Try to complete the build
      try {
        execSync('npx electron-builder --win --dir', { stdio: 'inherit' });
        this.log('Build recovery successful', 'success');
      } catch (error) {
        this.log('Build recovery failed', 'error');
      }
    }
  }

  reportResults() {
    this.log('\n=== BUILD VALIDATION REPORT ===', 'info');
    
    if (this.errors.length > 0) {
      this.log(`Errors found: ${this.errors.length}`, 'error');
      this.errors.forEach(error => this.log(`  - ${error}`, 'error'));
    }
    
    if (this.warnings.length > 0) {
      this.log(`Warnings: ${this.warnings.length}`, 'warning');
      this.warnings.forEach(warning => this.log(`  - ${warning}`, 'warning'));
    }
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      this.log('All validations passed!', 'success');
    }
    
    return this.errors.length === 0;
  }

  run(mode = 'validate') {
    switch (mode) {
      case 'env':
        return this.validateEnvironment() && this.reportResults();
      case 'deps':
        return this.validateDependencies() && this.reportResults();
      case 'icons':
        return this.validateIcons() && this.reportResults();
      case 'build':
        return this.validateBuildOutput() && this.reportResults();
      case 'recover':
        this.recoverBuild();
        return true;
      case 'validate':
      default:
        const envOk = this.validateEnvironment();
        const depsOk = this.validateDependencies();
        const iconsOk = this.validateIcons();
        return this.reportResults() && envOk && depsOk;
    }
  }
}

// CLI execution
if (require.main === module) {
  const mode = process.argv[2] || 'validate';
  const validator = new BuildValidator();
  const success = validator.run(mode);
  process.exit(success ? 0 : 1);
}

module.exports = BuildValidator;
