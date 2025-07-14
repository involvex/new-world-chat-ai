// Enhanced Screenshot Capture System
// Integrates monitor detection and HDR compatibility for reliable screenshots

const { desktopCapturer } = require('electron');
const MonitorDetector = require('./monitor1-fix');
const HDRCompatibilityManager = require('./hdr-patch');

/**
 * Enhanced Screenshot Manager
 * Combines monitor detection and HDR compatibility for robust screenshot capture
 */
class ScreenshotManager {
  constructor() {
    this.monitorDetector = new MonitorDetector();
    this.hdrManager = new HDRCompatibilityManager();
    this.initialized = false;
    this.lastSuccessfulSource = null;
  }

  /**
   * Initialize the screenshot manager
   */
  async initialize() {
    console.log('=== INITIALIZING ENHANCED SCREENSHOT MANAGER ===');
    
    try {
      // Initialize HDR compatibility first
      const hdrInitialized = this.hdrManager.initialize();
      if (!hdrInitialized) {
        console.warn('HDR manager initialization failed, proceeding with caution');
      }
      
      // Initialize monitor detection
      const monitorInitialized = await this.monitorDetector.initialize();
      if (!monitorInitialized) {
        console.error('Monitor detector initialization failed');
        return false;
      }
      
      this.initialized = true;
      console.log('✅ Screenshot manager initialized successfully');
      
      // Test all sources and log results
      await this._performInitialDiagnostics();
      
      return true;
    } catch (error) {
      console.error('Screenshot manager initialization failed:', error);
      return false;
    }
  }

  /**
   * Perform initial diagnostics
   */
  async _performInitialDiagnostics() {
    console.log('=== PERFORMING INITIAL DIAGNOSTICS ===');
    
    try {
      // Test all available sources
      const testResults = await this.monitorDetector.testAllSources();
      
      // Find working sources
      const workingSources = testResults.filter(result => result.success);
      const failingSources = testResults.filter(result => !result.success);
      
      console.log(`Working sources: ${workingSources.length}/${testResults.length}`);
      console.log(`Failing sources: ${failingSources.length}/${testResults.length}`);
      
      if (workingSources.length === 0) {
        console.error('⚠️ No working screenshot sources found!');
      } else {
        console.log('✅ Found working screenshot sources');
        
        // Cache the best working source
        const recommendation = this.monitorDetector.getRecommendation();
        if (recommendation.recommendedSource) {
          this.lastSuccessfulSource = recommendation.recommendedSource;
          console.log('Cached recommended source:', this.lastSuccessfulSource.name);
        }
      }
      
      // Log HDR status
      const hdrStatus = this.hdrManager.getStatus();
      console.log('HDR compatibility status:', hdrStatus);
      
    } catch (error) {
      console.error('Initial diagnostics failed:', error);
    }
  }

  /**
   * Enhanced capture that can use virtual display sources
   */
  async captureScreenshot(options = {}) {
    if (!this.initialized) {
      console.warn('Screenshot manager not initialized, attempting to initialize...');
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize screenshot manager');
      }
    }

    try {
      const { displayId, preferredSource } = options;
      
      console.log('=== ENHANCED SCREENSHOT CAPTURE ===');
      console.log('Options:', { displayId, preferredSource });
      
      let targetSource;
      
      if (displayId) {
        // Capture specific display
        targetSource = this.monitorDetector.getSourceForDisplay(displayId);
        console.log(`Requested display ${displayId}, found source:`, targetSource?.name || 'none');
      } else if (preferredSource) {
        // Use preferred source
        const allSources = this.monitorDetector.getAllSources();
        targetSource = allSources.find(s => s.id === preferredSource || s.name === preferredSource);
        console.log(`Requested source ${preferredSource}, found:`, targetSource?.name || 'none');
      } else {
        // Use cached recommended source or get fresh recommendation
        targetSource = this.lastSuccessfulSource;
        if (!targetSource) {
          const recommendation = this.monitorDetector.getRecommendation();
          targetSource = recommendation.recommendedSource;
          if (targetSource) {
            this.lastSuccessfulSource = targetSource;
          }
        }
        console.log('Using recommended source:', targetSource?.name);
      }
      
      if (!targetSource) {
        throw new Error('No suitable screenshot source available');
      }
      
      // Handle virtual sources
      if (targetSource.isVirtual) {
        console.log('📱 Capturing from virtual source:', targetSource.name);
        return await this.captureVirtualSource(targetSource);
      }
      
      // Handle regular sources
      console.log('📸 Capturing from physical source:', targetSource.name);
      return await this.capturePhysicalSource(targetSource);
      
    } catch (error) {
      console.error('Enhanced screenshot capture failed:', error);
      throw error;
    }
  }

  async captureVirtualSource(virtualSource) {
    try {
      console.log('Capturing virtual source for display:', virtualSource.targetDisplay.id);
      
      // For now, virtual sources will use the entire screen capture
      // Individual display cropping can be implemented in the renderer process
      console.log('📱 Virtual source using entire screen (cropping available in renderer)');
      
      // Capture the entire screen
      const fullScreenshot = await this.capturePhysicalSource(virtualSource.originalSource);
      
      // Add metadata for cropping in renderer
      const metadata = {
        isVirtual: true,
        targetDisplay: virtualSource.targetDisplay,
        cropBounds: virtualSource.cropBounds,
        originalSourceName: virtualSource.originalSource.name
      };
      
      console.log(`✅ Virtual source prepared with metadata:`, metadata);
      
      // Return the full screenshot with cropping metadata
      // The renderer can handle the actual cropping
      return fullScreenshot;
      
    } catch (error) {
      console.error('Virtual source capture failed:', error);
      throw error;
    }
  }

  async capturePhysicalSource(source) {
    try {
      // Get fresh source data with high resolution
      const primaryDisplay = this.monitorDetector.primaryDisplay;
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { 
          width: Math.max(3840, primaryDisplay.size.width * 2), 
          height: Math.max(2160, primaryDisplay.size.height * 2)
        },
        fetchWindowIcons: false
      });
      
      const freshSource = sources.find(s => s.id === source.id || s.name === source.name);
      if (!freshSource) {
        throw new Error(`Source ${source.name} not found in fresh capture`);
      }
      
      const screenshot = freshSource.thumbnail;
      
      if (screenshot.isEmpty()) {
        throw new Error('Captured screenshot is empty');
      }
      
      // Apply HDR compatibility if needed
      const dataUrl = await this.hdrManager.processSafeScreenshot(screenshot);
      
      console.log(`✅ Physical source captured: ${screenshot.getSize().width}x${screenshot.getSize().height}`);
      
      return dataUrl;
      
    } catch (error) {
      console.error('Physical source capture failed:', error);
      throw error;
    }
  }

  /**
   * Get the best available source
   */
  _getBestSource() {
    // If we have a cached successful source, try it first
    if (this.lastSuccessfulSource) {
      const cachedSource = this.monitorDetector.sources.find(
        source => source.id === this.lastSuccessfulSource.id
      );
      if (cachedSource) {
        console.log('Using cached successful source:', cachedSource.name);
        return cachedSource;
      } else {
        console.log('Cached source no longer available, finding new one');
        this.lastSuccessfulSource = null;
      }
    }
    
    // Get recommendation from monitor detector
    const recommendation = this.monitorDetector.getRecommendation();
    return recommendation.recommendedSource;
  }

  /**
   * Capture screenshot from specific source with HDR-safe processing
   */
  async _captureFromSource(source) {
    const { desktopCapturer } = require('electron');
    
    try {
      // Get optimal thumbnail size for the source
      const primaryDisplay = this.monitorDetector.primaryDisplay;
      const thumbnailSize = this.hdrManager.getOptimalThumbnailSize(primaryDisplay);
      
      console.log('Capturing with optimal settings:', {
        sourceId: source.id,
        sourceName: source.name,
        thumbnailSize,
        compatibilityMode: this.hdrManager.compatibilityMode
      });
      
      // Get fresh source data with optimal settings
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize,
        fetchWindowIcons: false
      });
      
      // Find our target source in the fresh data
      const freshSource = sources.find(s => s.id === source.id);
      if (!freshSource) {
        throw new Error(`Source ${source.id} not found in fresh capture`);
      }
      
      // Process screenshot with HDR-safe methods
      const dataUrl = await this.hdrManager.processSafeScreenshot(freshSource.thumbnail);
      
      return dataUrl;
      
    } catch (error) {
      console.error(`Failed to capture from source ${source.name}:`, error);
      throw error;
    }
  }

  /**
   * Attempt fallback capture methods
   */
  async _attemptFallbackCapture() {
    console.log('=== ATTEMPTING FALLBACK CAPTURE METHODS ===');
    
    try {
      // Try all available sources one by one
      const sources = this.monitorDetector.sources;
      
      for (let i = 0; i < sources.length; i++) {
        const source = sources[i];
        console.log(`Trying fallback source ${i + 1}/${sources.length}: ${source.name}`);
        
        try {
          const dataUrl = await this._captureFromSource(source);
          console.log(`✅ Fallback capture successful with source: ${source.name}`);
          
          // Cache this working source
          this.lastSuccessfulSource = source;
          return dataUrl;
          
        } catch (sourceError) {
          console.log(`❌ Fallback source ${source.name} failed:`, sourceError.message);
          continue;
        }
      }
      
      throw new Error('All fallback capture methods failed');
      
    } catch (error) {
      console.error('All fallback capture attempts failed:', error);
      throw new Error(`Screenshot capture completely failed: ${error.message}`);
    }
  }

  /**
   * Get diagnostic information
   */
  getDiagnostics() {
    return {
      initialized: this.initialized,
      hdrStatus: this.hdrManager.getStatus(),
      monitorInfo: {
        displayCount: this.monitorDetector.displays.length,
        sourceCount: this.monitorDetector.sources.length,
        primaryDisplayId: this.monitorDetector.primaryDisplay?.id
      },
      lastSuccessfulSource: this.lastSuccessfulSource ? {
        id: this.lastSuccessfulSource.id,
        name: this.lastSuccessfulSource.name,
        display_id: this.lastSuccessfulSource.display_id
      } : null,
      recommendation: this.monitorDetector.getRecommendation()
    };
  }

  /**
   * Test capture for specific source
   */
  async testCapture(sourceId) {
    try {
      const source = this.monitorDetector.sources.find(s => s.id === sourceId);
      if (!source) {
        throw new Error(`Source ${sourceId} not found`);
      }
      
      const dataUrl = await this._captureFromSource(source);
      return {
        success: true,
        sourceId,
        sourceName: source.name,
        dataUrl
      };
    } catch (error) {
      return {
        success: false,
        sourceId,
        error: error.message
      };
    }
  }
}

module.exports = ScreenshotManager;
