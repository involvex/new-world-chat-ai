/**
 * Robust cleanup script for handling locked files and processes
 * Handles Windows file locks and ensures clean build environment
 */
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class RobustCleanup {
    constructor() {
        this.maxRetries = 3;
        this.retryDelay = 2000; // 2 seconds
        this.lockCheckTimeout = 5000; // 5 seconds
    }

    log(message) {
        console.log(`[Cleanup] ${message}`);
    }

    error(message, error = null) {
        console.error(`[Cleanup Error] ${message}`);
        if (error) console.error(error);
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    killProcesses() {
        this.log('Killing potentially blocking processes...');
        
        if (process.platform === 'win32') {
            try {
                // Kill Electron processes
                execSync('taskkill /F /IM electron.exe /T 2>nul', { stdio: 'ignore' });
                this.log('Electron processes terminated');
            } catch (error) {
                // Ignore errors - processes might not be running
            }

            try {
                // Kill any Node processes that might be holding file locks
                // But skip the current process
                const currentPid = process.pid;
                execSync(`wmic process where "name='node.exe' and processid!=${currentPid}" delete 2>nul`, { stdio: 'ignore' });
                this.log('Other Node processes cleaned up');
            } catch (error) {
                // Ignore errors - processes might not be running
            }

            // Don't kill VSCode as it might be running this script
        }
        
        this.log('Process cleanup completed');
    }

    isFileLocked(filePath) {
        try {
            if (!fs.existsSync(filePath)) return false;
            
            // Try to open the file in exclusive mode
            const fd = fs.openSync(filePath, 'r+');
            fs.closeSync(fd);
            return false;
        } catch (error) {
            return error.code === 'EBUSY' || error.code === 'ENOENT';
        }
    }

    async waitForFileUnlock(filePath, maxWaitTime = 10000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            if (!this.isFileLocked(filePath)) {
                return true;
            }
            
            this.log(`Waiting for file unlock: ${path.basename(filePath)}`);
            await this.sleep(500);
        }
        
        return false;
    }

    async removeDirectory(dirPath, retryCount = 0) {
        if (!fs.existsSync(dirPath)) {
            this.log(`Directory already clean: ${dirPath}`);
            return true;
        }

        this.log(`Starting removal of directory: ${dirPath}`);

        try {
            // First, kill processes that might be using files
            this.killProcesses();
            await this.sleep(1000);

            // Check for locked files in the directory
            if (fs.existsSync(path.join(dirPath, 'win-unpacked', 'resources', 'app.asar'))) {
                const asarPath = path.join(dirPath, 'win-unpacked', 'resources', 'app.asar');
                this.log(`Checking app.asar lock status...`);
                
                if (this.isFileLocked(asarPath)) {
                    this.log('app.asar is locked, waiting for unlock...');
                    const unlocked = await this.waitForFileUnlock(asarPath);
                    
                    if (!unlocked) {
                        this.error(`Could not unlock ${asarPath}, forcing cleanup...`);
                        this.killProcesses();
                        await this.sleep(2000);
                    }
                }
            }

            // Try using Windows-specific force delete first
            try {
                this.log(`Attempting Windows rmdir on ${dirPath}...`);
                execSync(`rmdir /s /q "${dirPath}"`, { stdio: 'pipe' });
                
                // Check if directory was actually removed
                if (!fs.existsSync(dirPath)) {
                    this.log(`✅ Successfully removed with Windows rmdir: ${dirPath}`);
                    return true;
                } else {
                    this.log(`❌ Windows rmdir did not remove directory completely`);
                }
            } catch (sysError) {
                this.log(`Windows rmdir failed: ${sysError.message}`);
            }
            
            // Try rimraf as fallback
            try {
                this.log(`Attempting rimraf on ${dirPath}...`);
                const rimraf = require('rimraf');
                if (typeof rimraf === 'function') {
                    // Old rimraf API
                    await new Promise((resolve, reject) => {
                        rimraf(dirPath, (error) => {
                            if (error) reject(error);
                            else resolve();
                        });
                    });
                } else {
                    // New rimraf API
                    await rimraf.rimraf(dirPath);
                }
                
                // Check if directory was actually removed
                if (!fs.existsSync(dirPath)) {
                    this.log(`✅ Successfully removed with rimraf: ${dirPath}`);
                    return true;
                } else {
                    this.log(`❌ Rimraf did not remove directory completely`);
                }
            } catch (rimrafError) {
                this.log(`Rimraf failed: ${rimrafError.message}`);
            }
            
            // Manual recursive deletion as last resort
            try {
                this.log(`Attempting manual recursive deletion on ${dirPath}...`);
                await this.removeDirectoryRecursive(dirPath);
                
                // Check if directory was actually removed
                if (!fs.existsSync(dirPath)) {
                    this.log(`✅ Successfully removed manually: ${dirPath}`);
                    return true;
                } else {
                    this.log(`❌ Manual deletion did not remove directory completely`);
                    return false;
                }
            } catch (manualError) {
                this.log(`Manual deletion failed: ${manualError.message}`);
                return false;
            }

        } catch (error) {
            this.error(`Failed to remove ${dirPath} (attempt ${retryCount + 1}/${this.maxRetries})`, error);
            
            if (retryCount < this.maxRetries - 1) {
                this.log(`Retrying in ${this.retryDelay}ms...`);
                await this.sleep(this.retryDelay);
                return this.removeDirectory(dirPath, retryCount + 1);
            }
            
            return false;
        }
    }

    async removeDirectoryRecursive(dirPath) {
        const stat = fs.lstatSync(dirPath);
        
        if (stat.isDirectory()) {
            const entries = fs.readdirSync(dirPath);
            
            for (const entry of entries) {
                const entryPath = path.join(dirPath, entry);
                await this.removeDirectoryRecursive(entryPath);
            }
            
            fs.rmdirSync(dirPath);
        } else {
            // It's a file
            if (this.isFileLocked(dirPath)) {
                await this.waitForFileUnlock(dirPath);
            }
            fs.unlinkSync(dirPath);
        }
    }

    async cleanBuild() {
        this.log('Starting build cleanup...');
        
        const directories = ['dist', 'dist-electron'];
        let allSuccess = true;
        
        for (const dir of directories) {
            this.log(`Processing directory: ${dir}`);
            const success = await this.removeDirectory(dir);
            if (!success) {
                allSuccess = false;
                this.error(`Failed to clean ${dir}`);
            } else {
                this.log(`✅ Successfully cleaned: ${dir}`);
            }
        }
        
        if (allSuccess) {
            this.log('✅ Build cleanup completed successfully');
        } else {
            this.error('❌ Build cleanup had errors');
        }
        
        return allSuccess;
    }

    async cleanCache() {
        this.log('Cleaning cache directories...');
        
        const cacheDirs = [
            'node_modules/.cache',
            '.vite'
        ];
        
        let allSuccess = true;
        
        for (const dir of cacheDirs) {
            if (fs.existsSync(dir)) {
                const success = await this.removeDirectory(dir);
                if (!success) {
                    allSuccess = false;
                }
            }
        }
        
        return allSuccess;
    }

    async cleanTemp() {
        this.log('Cleaning temporary files...');
        
        try {
            const tempFiles = ['temp.exe'];
            const logFiles = fs.readdirSync('.').filter(file => file.endsWith('.log'));
            
            const allTempFiles = [...tempFiles, ...logFiles];
            
            for (const file of allTempFiles) {
                if (fs.existsSync(file)) {
                    try {
                        fs.unlinkSync(file);
                        this.log(`Removed: ${file}`);
                    } catch (error) {
                        this.error(`Failed to remove ${file}`, error);
                    }
                }
            }
            
            return true;
        } catch (error) {
            this.error('Failed to clean temp files', error);
            return false;
        }
    }

    async cleanAll() {
        this.log('Starting comprehensive cleanup...');
        
        // Kill processes first
        this.killProcesses();
        await this.sleep(2000);
        
        const results = await Promise.all([
            this.cleanBuild(),
            this.cleanCache(),
            this.cleanTemp()
        ]);
        
        const allSuccess = results.every(result => result);
        
        if (allSuccess) {
            this.log('✅ All cleanup operations completed successfully');
        } else {
            this.error('❌ Some cleanup operations failed');
        }
        
        return allSuccess;
    }
}

// CLI interface
async function main() {
    const cleanup = new RobustCleanup();
    const command = process.argv[2] || 'all';
    
    let success = false;
    
    switch (command) {
        case 'build':
            success = await cleanup.cleanBuild();
            break;
        case 'cache':
            success = await cleanup.cleanCache();
            break;
        case 'temp':
            success = await cleanup.cleanTemp();
            break;
        case 'kill':
            cleanup.killProcesses();
            await cleanup.sleep(2000);
            success = true;
            break;
        case 'all':
        default:
            success = await cleanup.cleanAll();
            break;
    }
    
    process.exit(success ? 0 : 1);
}

if (require.main === module) {
    main().catch(error => {
        console.error('[Cleanup Fatal Error]', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    });
}

module.exports = RobustCleanup;
