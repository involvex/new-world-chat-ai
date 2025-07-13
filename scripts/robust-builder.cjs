#!/usr/bin/env node
/**
 * Robust Electron Build Script
 * Handles electron-builder hangs and creates reliable builds
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

class RobustBuilder {
  constructor() {
    this.timeout = 300000; // 5 minutes timeout
    this.maxRetries = 3;
    this.currentRetry = 0;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '🔧',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      progress: '⏳'
    }[type] || 'ℹ️';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async killProcesses() {
    this.log('Cleaning up processes...', 'info');
    
    if (process.platform === 'win32') {
      try {
        execSync('taskkill /F /IM electron.exe /T 2>nul || echo No electron processes', { stdio: 'ignore' });
        execSync('taskkill /F /IM node.exe /T 2>nul || echo No node processes', { stdio: 'ignore' });
        await this.sleep(2000); // Wait for cleanup
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  async cleanDirectories() {
    this.log('Cleaning build directories...', 'info');
    
    const dirsToClean = ['dist-electron'];
    
    for (const dir of dirsToClean) {
      try {
        if (fs.existsSync(dir)) {
          await this.forceRemoveDir(dir);
          this.log(`Cleaned ${dir}`, 'success');
        }
      } catch (error) {
        this.log(`Warning: Could not clean ${dir}: ${error.message}`, 'warning');
      }
    }
  }

  async forceRemoveDir(dirPath, maxAttempts = 5) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        if (fs.existsSync(dirPath)) {
          fs.rmSync(dirPath, { recursive: true, force: true });
        }
        return;
      } catch (error) {
        if (i === maxAttempts - 1) throw error;
        await this.sleep(1000 * (i + 1)); // Exponential backoff
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runWithTimeout(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      this.log(`Running: ${command} ${args.join(' ')}`, 'progress');
      
      const child = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        ...options
      });

      const timeout = setTimeout(() => {
        this.log('Command timed out, killing process...', 'warning');
        child.kill('SIGKILL');
        reject(new Error('Command timed out'));
      }, this.timeout);

      child.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          this.log('Command completed successfully', 'success');
          resolve(code);
        } else {
          this.log(`Command failed with code ${code}`, 'error');
          reject(new Error(`Command failed with code ${code}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        this.log(`Command error: ${error.message}`, 'error');
        reject(error);
      });
    });
  }

  async buildElectron(platform = 'win') {
    this.log(`Building Electron app for ${platform}...`, 'info');
    
    try {
      // Try the standard build first
      await this.runWithTimeout('npx', ['electron-builder', `--${platform}`, '--publish=never']);
      return true;
    } catch (error) {
      this.log(`Standard build failed: ${error.message}`, 'warning');
      
      // Try directory-only build first
      try {
        this.log('Attempting directory build...', 'info');
        await this.runWithTimeout('npx', ['electron-builder', `--${platform}`, '--dir']);
        
        // Then try to package it
        this.log('Attempting to package...', 'info');
        await this.runWithTimeout('npx', ['electron-builder', `--${platform}`, '--prepackaged', `dist-electron/${platform}-unpacked`]);
        
        return true;
      } catch (dirError) {
        this.log(`Directory build also failed: ${dirError.message}`, 'error');
        throw dirError;
      }
    }
  }

  async validateBuild(platform = 'win') {
    this.log('Validating build output...', 'info');
    
    const expectedFiles = {
      win: [
        'dist-electron/win-unpacked',
        'dist-electron/*.exe'
      ],
      mac: [
        'dist-electron/mac',
        'dist-electron/*.dmg'
      ],
      linux: [
        'dist-electron/linux-unpacked',
        'dist-electron/*.AppImage'
      ]
    };

    const files = expectedFiles[platform] || expectedFiles.win;
    let foundFiles = 0;

    for (const pattern of files) {
      if (pattern.includes('*')) {
        // Handle glob patterns
        const dir = path.dirname(pattern);
        const ext = path.extname(pattern);
        
        if (fs.existsSync(dir)) {
          const matchingFiles = fs.readdirSync(dir).filter(file => file.endsWith(ext));
          if (matchingFiles.length > 0) {
            foundFiles++;
            this.log(`✓ Found ${matchingFiles.length} ${ext} files`, 'success');
          }
        }
      } else {
        if (fs.existsSync(pattern)) {
          foundFiles++;
          this.log(`✓ Found ${pattern}`, 'success');
        }
      }
    }

    return foundFiles > 0;
  }

  async buildWithRetry(platform = 'win') {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      this.log(`Build attempt ${attempt}/${this.maxRetries}`, 'info');
      
      try {
        // Clean up first
        await this.killProcesses();
        await this.cleanDirectories();
        
        // Wait a bit
        await this.sleep(2000);
        
        // Try the build
        await this.buildElectron(platform);
        
        // Validate
        if (await this.validateBuild(platform)) {
          this.log(`Build successful on attempt ${attempt}!`, 'success');
          return true;
        } else {
          throw new Error('Build validation failed');
        }
        
      } catch (error) {
        this.log(`Attempt ${attempt} failed: ${error.message}`, 'error');
        
        if (attempt < this.maxRetries) {
          this.log(`Retrying in 5 seconds...`, 'warning');
          await this.sleep(5000);
        } else {
          this.log('All attempts failed!', 'error');
          throw error;
        }
      }
    }
  }

  async run(platform = 'win') {
    this.log(`Starting robust build for ${platform}...`, 'info');
    
    try {
      await this.buildWithRetry(platform);
      this.log('Build completed successfully!', 'success');
      return true;
    } catch (error) {
      this.log(`Build failed completely: ${error.message}`, 'error');
      return false;
    }
  }
}

// CLI execution
if (require.main === module) {
  const platform = process.argv[2] || 'win';
  const builder = new RobustBuilder();
  
  builder.run(platform).then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = RobustBuilder;
