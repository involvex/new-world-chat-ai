// HDR Compatibility Patch for New World Chat AI
// This patch addresses HDR-related screenshot issues

/**
 * HDR Compatibility Manager
 * Handles HDR detection and provides workarounds for screenshot capture
 */
class HDRCompatibilityManager {
  constructor() {
    this.hdrDetected = false;
    this.compatibilityMode = 'auto';
    this.supportedFormats = ['image/png', 'image/jpeg'];
  }

  /**
   * Initialize HDR compatibility detection
   */
  initialize() {
    console.log('=== INITIALIZING HDR COMPATIBILITY ===');
    
    try {
      this.detectHDRCapabilities();
      this.setOptimalSettings();
      return true;
    } catch (error) {
      console.error('HDR compatibility initialization failed:', error);
      return false;
    }
  }

  /**
   * Detect HDR capabilities and potential issues
   */
  detectHDRCapabilities() {
    const { screen } = require('electron');
    
    try {
      const displays = screen.getAllDisplays();
      
      displays.forEach((display, index) => {
        console.log(`Display ${index + 1} HDR analysis:`, {
          id: display.id,
          colorDepth: display.colorDepth,
          colorSpace: display.colorSpace,
          scaleFactor: display.scaleFactor,
          potentialHDR: this._analyzeHDRPotential(display)
        });
        
        if (this._analyzeHDRPotential(display)) {
          this.hdrDetected = true;
          console.log(`⚠️ Potential HDR display detected: Display ${index + 1}`);
        }
      });
      
      if (this.hdrDetected) {
        console.log('HDR displays detected - enabling compatibility mode');
        this.compatibilityMode = 'hdr-safe';
      } else {
        console.log('No HDR issues detected - using standard mode');
        this.compatibilityMode = 'standard';
      }
    } catch (error) {
      console.error('HDR detection failed:', error);
      this.compatibilityMode = 'safe';
    }
  }

  /**
   * Analyze if a display might have HDR capabilities
   */
  _analyzeHDRPotential(display) {
    // Check for 10-bit color depth (common HDR indicator)
    if (display.colorDepth && display.colorDepth >= 30) {
      console.log(`HDR detected: 10-bit+ color depth (${display.colorDepth}-bit)`);
      return true;
    }
    
    // Check color space for HDR/wide gamut indicators
    if (display.colorSpace) {
      const colorSpaceStr = display.colorSpace.toLowerCase();
      
      // HDR and wide gamut color spaces
      const hdrColorSpaces = [
        'rec2020', 'bt2020', 'p3', 'dci-p3', 'display-p3',
        'rec2020-hlg', 'rec2020-pq', 'hdr10', 'dolby',
        'wide', 'extended'
      ];
      
      const hasHDRColorSpace = hdrColorSpaces.some(space => 
        colorSpaceStr.includes(space)
      );
      
      if (hasHDRColorSpace) {
        console.log(`HDR detected: Wide gamut color space (${display.colorSpace})`);
        return true;
      }
      
      // Check for 10-bit indicators in color space string
      if (colorSpaceStr.includes('10') || colorSpaceStr.includes('bit')) {
        console.log(`HDR detected: 10-bit indicator in color space (${display.colorSpace})`);
        return true;
      }
    }
    
    // High resolution + high scale factor combination (often HDR displays)
    if (display.scaleFactor > 1.5 && 
        display.size.width > 2560 && 
        display.size.height > 1440) {
      console.log(`HDR suspected: High resolution (${display.size.width}x${display.size.height}) + high scale factor (${display.scaleFactor})`);
      return true;
    }
    
    // 4K+ resolution might indicate HDR capability
    if ((display.size.width >= 3840 && display.size.height >= 2160) ||
        (display.size.width >= 2560 && display.size.height >= 1440)) {
      console.log(`HDR suspected: High resolution display (${display.size.width}x${display.size.height})`);
      return true;
    }
    
    return false;
  }

  /**
   * Set optimal settings based on detected capabilities
   */
  setOptimalSettings() {
    const { app } = require('electron');
    
    console.log(`Setting HDR compatibility mode: ${this.compatibilityMode}`);
    
    switch (this.compatibilityMode) {
      case 'hdr-safe':
        this._applyHDRSafeSettings(app);
        break;
      case 'standard':
        this._applyStandardSettings(app);
        break;
      case 'safe':
      default:
        this._applySafeSettings(app);
        break;
    }
  }

  /**
   * Apply HDR-safe settings
   */
  _applyHDRSafeSettings(app) {
    console.log('Applying HDR-safe settings for 10-bit/HDR compatibility...');
    
    // Force 8-bit RGBA format to avoid DXGI 10-bit errors
    app.commandLine.appendSwitch('force-color-profile', 'srgb');
    app.commandLine.appendSwitch('force-device-scale-factor', '1');
    
    // Disable HDR and high bit depth features
    app.commandLine.appendSwitch('disable-hdr');
    app.commandLine.appendSwitch('disable-direct-composition');
    app.commandLine.appendSwitch('disable-gpu-compositing');
    
    // Force 8-bit rendering pipeline
    app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor,UseChromeOSDirectVideoDecoder,DirectComposition');
    app.commandLine.appendSwitch('disable-d3d11');
    app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
    
    // Additional compatibility flags for 10-bit displays
    app.commandLine.appendSwitch('disable-software-rasterizer');
    app.commandLine.appendSwitch('disable-background-timer-throttling');
    app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
    app.commandLine.appendSwitch('disable-renderer-backgrounding');
    
    console.log('✅ HDR-safe settings applied to handle 10-bit color depth issues');
  }

  /**
   * Apply standard settings for non-HDR displays
   */
  _applyStandardSettings(app) {
    console.log('Applying standard settings...');
    
    // Basic compatibility settings
    app.commandLine.appendSwitch('force-color-profile', 'srgb');
    app.commandLine.appendSwitch('disable-hdr');
  }

  /**
   * Apply safe fallback settings
   */
  _applySafeSettings(app) {
    console.log('Applying safe fallback settings...');
    
    // Maximum compatibility settings
    app.commandLine.appendSwitch('force-color-profile', 'srgb');
    app.commandLine.appendSwitch('disable-hdr');
    app.commandLine.appendSwitch('disable-direct-composition');
    app.commandLine.appendSwitch('disable-gpu');
    app.commandLine.appendSwitch('disable-gpu-sandbox');
    app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');
  }

  /**
   * Get HDR-safe thumbnail size based on display characteristics
   */
  getOptimalThumbnailSize(targetDisplay) {
    const baseWidth = targetDisplay?.size?.width || 1920;
    const baseHeight = targetDisplay?.size?.height || 1080;
    const scaleFactor = targetDisplay?.scaleFactor || 1;
    
    switch (this.compatibilityMode) {
      case 'hdr-safe':
        // Smaller thumbnails for HDR compatibility
        return {
          width: Math.min(800, Math.floor(baseWidth / scaleFactor)),
          height: Math.min(600, Math.floor(baseHeight / scaleFactor))
        };
      
      case 'standard':
        // Standard high-quality thumbnails
        return {
          width: Math.min(1280, baseWidth),
          height: Math.min(720, baseHeight)
        };
      
      case 'safe':
      default:
        // Conservative thumbnail size
        return {
          width: 640,
          height: 480
        };
    }
  }

  /**
   * Process screenshot with HDR-safe methods
   */
  async processSafeScreenshot(thumbnail) {
    try {
      // Validate thumbnail
      if (!thumbnail || thumbnail.isEmpty()) {
        throw new Error('Invalid or empty thumbnail');
      }
      
      const size = thumbnail.getSize();
      console.log('Processing screenshot:', {
        size,
        compatibilityMode: this.compatibilityMode,
        isEmpty: thumbnail.isEmpty()
      });
      
      // For HDR-safe mode, use smaller dimensions to avoid 10-bit format issues
      if (this.compatibilityMode === 'hdr-safe' && (size.width > 1920 || size.height > 1080)) {
        console.log('⚠️ Large screenshot detected in HDR-safe mode, may cause DXGI 10-bit format errors');
      }
      
      // Convert with error handling and fallback methods
      let dataUrl;
      try {
        // Primary conversion method
        dataUrl = thumbnail.toDataURL();
        
        // Validate the result isn't affected by 10-bit format issues
        if (!dataUrl || dataUrl.length < 1000) {
          throw new Error('Primary conversion produced invalid result (possible 10-bit format issue)');
        }
        
      } catch (error) {
        console.warn('Primary screenshot conversion failed (likely 10-bit format issue):', error.message);
        
        // Fallback method 1: Try JPEG format (better 10-bit compatibility)
        try {
          console.log('Trying JPEG fallback for 10-bit compatibility...');
          dataUrl = thumbnail.toDataURL('image/jpeg', 0.9);
          
          if (!dataUrl || dataUrl.length < 1000) {
            throw new Error('JPEG fallback also produced invalid result');
          }
          
          console.log('✅ JPEG fallback successful');
          
        } catch (jpegError) {
          console.warn('JPEG fallback failed:', jpegError.message);
          
          // Fallback method 2: Try with lower quality
          try {
            console.log('Trying low-quality JPEG for maximum compatibility...');
            dataUrl = thumbnail.toDataURL('image/jpeg', 0.5);
            
            if (!dataUrl || dataUrl.length < 500) {
              throw new Error('Low-quality fallback also failed');
            }
            
            console.log('✅ Low-quality JPEG fallback successful');
            
          } catch (lowQualityError) {
            console.error('All conversion methods failed:', lowQualityError.message);
            throw new Error('Screenshot conversion failed with all methods (10-bit format incompatibility)');
          }
        }
      }
      
      // Additional validation for 10-bit format issues
      if (dataUrl.length < 1000) {
        throw new Error(`Screenshot conversion produced suspiciously small result (${dataUrl.length} bytes) - likely 10-bit format issue`);
      }
      
      // Check for common 10-bit format error indicators
      if (dataUrl.includes('error') || dataUrl.length < 5000) {
        console.warn('⚠️ Screenshot may be affected by 10-bit format compatibility issues');
      }
      
      console.log('Screenshot processed successfully:', {
        dataUrlLength: dataUrl.length,
        format: dataUrl.substring(0, 30),
        compatibilityMode: this.compatibilityMode
      });
      
      return dataUrl;
    } catch (error) {
      console.error('Safe screenshot processing failed:', error);
      console.error('This is likely due to 10-bit color depth (HDR) format incompatibility');
      throw error;
    }
  }

  /**
   * Get status information
   */
  getStatus() {
    return {
      hdrDetected: this.hdrDetected,
      compatibilityMode: this.compatibilityMode,
      supportedFormats: this.supportedFormats,
      initialized: true
    };
  }
}

module.exports = HDRCompatibilityManager;
