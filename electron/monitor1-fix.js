// Monitor Detection Utility for New World Chat AI
// This utility helps diagnose and fix monitor detection issues

const { screen, desktopCapturer } = require('electron');

/**
 * Comprehensive monitor detection and diagnostics
 */
class MonitorDetector {
  constructor() {
    this.displays = [];
    this.sources = [];
    this.primaryDisplay = null;
  }

  /**
   * Initialize monitor detection
   */
  async initialize() {
    try {
      console.log('=== INITIALIZING MONITOR DETECTOR ===');
      
      // Get display information
      this.displays = screen.getAllDisplays();
      this.primaryDisplay = screen.getPrimaryDisplay();
      
      // Try multiple detection approaches
      await this.tryMultipleSourceDetection();
      
      // Analyze results (moved inline)
      await this.performSourceAnalysis();
      
      return this.sources.length > 0;
    } catch (error) {
      console.error('Monitor detector initialization failed:', error);
      return false;
    }
  }

  async tryMultipleSourceDetection() {
    console.log('=== TRYING MULTIPLE SOURCE DETECTION APPROACHES ===');
    
    // Approach 1: Standard detection
    console.log('Approach 1: Standard parameters');
    try {
      const sources1 = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 300, height: 200 },
        fetchWindowIcons: false
      });
      console.log(`Standard approach found ${sources1.length} sources`);
      this.sources = sources1;
    } catch (error) {
      console.error('Standard approach failed:', error);
    }

    // Approach 2: High resolution thumbnails
    console.log('Approach 2: High resolution thumbnails');
    try {
      const sources2 = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 },
        fetchWindowIcons: false
      });
      console.log(`High-res approach found ${sources2.length} sources`);
      if (sources2.length > this.sources.length) {
        this.sources = sources2;
        console.log('Using high-res sources (more sources found)');
      }
    } catch (error) {
      console.error('High-res approach failed:', error);
    }

    // Approach 3: Small thumbnails
    console.log('Approach 3: Small thumbnails');
    try {
      const sources3 = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 150, height: 100 },
        fetchWindowIcons: false
      });
      console.log(`Small thumbnail approach found ${sources3.length} sources`);
      if (sources3.length > this.sources.length) {
        this.sources = sources3;
        console.log('Using small thumbnail sources (more sources found)');
      }
    } catch (error) {
      console.error('Small thumbnail approach failed:', error);
    }

    // Approach 4: Include windows type (sometimes helps)
    console.log('Approach 4: Include both screen and window types');
    try {
      const sources4 = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 300, height: 200 },
        fetchWindowIcons: false
      });
      const screenSources = sources4.filter(source => source.id.startsWith('screen:'));
      console.log(`Mixed types approach found ${screenSources.length} screen sources (${sources4.length} total)`);
      if (screenSources.length > this.sources.length) {
        this.sources = screenSources;
        console.log('Using mixed types screen sources (more screen sources found)');
      }
    } catch (error) {
      console.error('Mixed types approach failed:', error);
    }

    // Approach 5: Try with specific display IDs if supported
    console.log('Approach 5: Attempting display-specific capture');
    try {
      for (const display of this.displays) {
        try {
          const sources5 = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: display.size.width, height: display.size.height },
            fetchWindowIcons: false
          });
          console.log(`Display ${display.id} specific approach found ${sources5.length} sources`);
          
          // Check if any of these sources match this specific display
          const matchingSources = sources5.filter(source => {
            const sourceDisplayId = parseInt(source.display_id);
            return sourceDisplayId === display.id;
          });
          console.log(`  - ${matchingSources.length} sources match display ${display.id}`);
        } catch (displayError) {
          console.error(`Display-specific capture failed for ${display.id}:`, displayError);
        }
      }
    } catch (error) {
      console.error('Display-specific approach failed:', error);
    }

    console.log(`Final source count: ${this.sources.length}`);
  }

  /**
   * Log detailed detection results
   */
  logDetectionResults() {
    console.log('=== MONITOR DETECTION RESULTS ===');
    console.log(`Displays found: ${this.displays.length}`);
    console.log(`Sources found: ${this.sources.length}`);
    console.log(`Primary display ID: ${this.primaryDisplay.id}`);
    
    // Log display information
    this.displays.forEach((display, index) => {
      console.log(`\nDisplay ${index + 1}:`, {
        id: display.id,
        bounds: display.bounds,
        size: display.size,
        scaleFactor: display.scaleFactor,
        rotation: display.rotation,
        colorDepth: display.colorDepth,
        colorSpace: display.colorSpace,
        isPrimary: display.id === this.primaryDisplay.id,
        internal: display.internal || false,
        accelerometerSupport: display.accelerometerSupport || 'unknown',
        monochrome: display.monochrome || false,
        touchSupport: display.touchSupport || 'unknown'
      });
    });
    
    // Log source information
    this.sources.forEach((source, index) => {
      console.log(`\nSource ${index + 1}:`, {
        id: source.id,
        name: source.name,
        display_id: source.display_id,
        thumbnailSize: source.thumbnail ? source.thumbnail.getSize() : 'no thumbnail'
      });
    });
  }

  async performSourceAnalysis() {
    console.log('=== MONITOR DETECTION RESULTS ===');
    console.log(`Displays found: ${this.displays.length}`);
    console.log(`Sources found: ${this.sources.length}`);
    console.log(`Primary display ID: ${this.primaryDisplay.id}`);

    // Log display information
    this.displays.forEach((display, index) => {
      console.log(`\nDisplay ${index + 1}:`, {
        id: display.id,
        bounds: display.bounds,
        size: display.size,
        scaleFactor: display.scaleFactor,
        rotation: display.rotation,
        colorDepth: display.colorDepth,
        colorSpace: display.colorSpace,
        isPrimary: display.id === this.primaryDisplay.id,
        internal: display.internal,
        accelerometerSupport: display.accelerometerSupport,
        monochrome: display.monochrome,
        touchSupport: display.touchSupport
      });
    });

    // Log source information
    this.sources.forEach((source, index) => {
      console.log(`\nSource ${index + 1}:`, {
        id: source.id,
        name: source.name,
        display_id: source.display_id,
        thumbnailSize: source.thumbnail ? source.thumbnail.getSize() : null
      });
    });
  }

  /**
   * Find the best source for the primary display
   */
  findPrimaryDisplaySource() {
    console.log('=== FINDING PRIMARY DISPLAY SOURCE ===');
    
    if (this.sources.length === 0) {
      console.log('❌ No sources available');
      return null;
    }
    
    if (this.sources.length === 1) {
      const source = this.sources[0];
      console.log('Single source found:', {
        name: source.name,
        display_id: source.display_id,
        matchesPrimary: parseInt(source.display_id) === this.primaryDisplay.id
      });
      
      // Check if this single source covers multiple displays
      if (this.isEntireScreenSource(source)) {
        console.log('✅ Using entire screen source (captures all displays):', source.name);
        
        // Create virtual sources for each display
        this.createVirtualDisplaySources(source);
        
        return source;
      }
      
      // Single source doesn't match primary - check if it's close enough
      const sourceDisplayId = parseInt(source.display_id);
      if (sourceDisplayId !== this.primaryDisplay.id) {
        console.log('⚠️ Single source does NOT match primary display!');
        console.log(`Source is for display ${sourceDisplayId}, but primary is ${this.primaryDisplay.id}`);
        
        // If it's the only source, use it anyway
        console.log('✅ Using available source (only option):', source.name);
        return source;
      }
      
      return source;
    }
    
    // Multiple sources - find best match for primary display
    return this.selectBestSourceForPrimary();
  }

  // Select best source for primary display when multiple sources available
  selectBestSourceForPrimary() {
    console.log('=== SELECTING BEST SOURCE FOR PRIMARY DISPLAY ===');
    
    // First, try to find exact match for primary display
    const exactMatch = this.sources.find(source => {
      const sourceDisplayId = parseInt(source.display_id);
      return sourceDisplayId === this.primaryDisplay.id;
    });
    
    if (exactMatch) {
      console.log('✅ Found exact match for primary display:', exactMatch.name);
      return exactMatch;
    }
    
    // Look for entire screen sources
    const entireScreenSource = this.sources.find(source => this.isEntireScreenSource(source));
    if (entireScreenSource) {
      console.log('✅ Found entire screen source for multi-display setup:', entireScreenSource.name);
      this.createVirtualDisplaySources(entireScreenSource);
      return entireScreenSource;
    }
    
    // Fallback to first available source
    console.log('⚠️ No perfect match found, using first available source:', this.sources[0].name);
    return this.sources[0];
  }

  createVirtualDisplaySources(entireScreenSource) {
    console.log('=== CREATING VIRTUAL DISPLAY SOURCES ===');
    
    this.virtualSources = [];
    
    this.displays.forEach((display, index) => {
      const virtualSource = {
        ...entireScreenSource,
        id: `virtual:${display.id}:${entireScreenSource.id}`,
        name: `Virtual Display ${index + 1} (${display.size.width}x${display.size.height})`,
        display_id: display.id.toString(),
        originalSource: entireScreenSource,
        targetDisplay: display,
        isVirtual: true,
        cropBounds: this.calculateCropBounds(display, entireScreenSource)
      };
      
      this.virtualSources.push(virtualSource);
      
      console.log(`Virtual source ${index + 1}:`, {
        id: virtualSource.id,
        name: virtualSource.name,
        targetDisplay: display.id,
        isPrimary: display.id === this.primaryDisplay.id,
        cropBounds: virtualSource.cropBounds
      });
    });
    
    console.log(`✅ Created ${this.virtualSources.length} virtual display sources`);
  }

  calculateCropBounds(display, entireScreenSource) {
    // Calculate the portion of the entire screen that corresponds to this display
    const allDisplays = this.displays;
    const minX = Math.min(...allDisplays.map(d => d.bounds.x));
    const minY = Math.min(...allDisplays.map(d => d.bounds.y));
    const maxX = Math.max(...allDisplays.map(d => d.bounds.x + d.bounds.width));
    const maxY = Math.max(...allDisplays.map(d => d.bounds.y + d.bounds.height));
    
    const totalWidth = maxX - minX;
    const totalHeight = maxY - minY;
    
    // Calculate relative position of this display within the total screen
    const relativeX = (display.bounds.x - minX) / totalWidth;
    const relativeY = (display.bounds.y - minY) / totalHeight;
    const relativeWidth = display.bounds.width / totalWidth;
    const relativeHeight = display.bounds.height / totalHeight;
    
    return {
      x: relativeX,
      y: relativeY,
      width: relativeWidth,
      height: relativeHeight,
      absoluteBounds: display.bounds
    };
  }

  // Get all available sources including virtual ones
  getAllSources() {
    const sources = [...this.sources];
    
    if (this.virtualSources && this.virtualSources.length > 0) {
      sources.push(...this.virtualSources);
    }
    
    return sources;
  }

  // Get source for specific display (including virtual)
  getSourceForDisplay(displayId) {
    // Check virtual sources first
    if (this.virtualSources) {
      const virtualSource = this.virtualSources.find(vs => 
        parseInt(vs.display_id) === displayId
      );
      if (virtualSource) {
        return virtualSource;
      }
    }
    
    // Check physical sources
    const physicalSource = this.sources.find(source => 
      parseInt(source.display_id) === displayId
    );
    
    return physicalSource || null;
  }

  /**
   * Test screenshot capture for all sources
   */
  async testAllSources() {
    console.log('=== TESTING ALL SOURCES ===');
    const results = [];
    
    for (let i = 0; i < this.sources.length; i++) {
      const source = this.sources[i];
      console.log(`Testing source ${i + 1}: ${source.name}`);
      
      try {
        const thumbnail = source.thumbnail;
        const size = thumbnail.getSize();
        const isEmpty = thumbnail.isEmpty();
        const dataUrl = thumbnail.toDataURL();
        
        results.push({
          index: i + 1,
          source: {
            id: source.id,
            name: source.name,
            display_id: source.display_id
          },
          success: true,
          size,
          isEmpty,
          dataUrlLength: dataUrl.length
        });
        
        console.log(`✅ Source ${i + 1} test successful:`, {
          size,
          isEmpty,
          dataUrlLength: dataUrl.length
        });
      } catch (error) {
        results.push({
          index: i + 1,
          source: {
            id: source.id,
            name: source.name,
            display_id: source.display_id
          },
          success: false,
          error: error.message
        });
        
        console.log(`❌ Source ${i + 1} test failed:`, error.message);
      }
    }
    
    return results;
  }

  /**
   * Get recommended source with reasoning
   */
  getRecommendation() {
    const primarySource = this.findPrimaryDisplaySource();
    
    return {
      recommendedSource: primarySource,
      reasoning: this._getRecommendationReasoning(primarySource),
      alternativeSources: this.sources.filter(s => s.id !== primarySource?.id),
      displayCount: this.displays.length,
      sourceCount: this.sources.length
    };
  }

  /**
   * Generate reasoning for source recommendation
   */
  _getRecommendationReasoning(source) {
    if (!source) return 'No suitable source found';
    
    const displayIdMatch = parseInt(source.display_id) === this.primaryDisplay.id;
    if (displayIdMatch) {
      return 'Exact display_id match with primary display';
    }
    
    const namePatterns = [/display\s*1/i, /screen\s*1/i, /monitor\s*1/i, /primary/i, /main/i];
    const matchesNamePattern = namePatterns.some(pattern => pattern.test(source.name));
    if (matchesNamePattern) {
      return 'Name pattern suggests primary display';
    }
    
    const isNotEntireScreen = !source.name.toLowerCase().includes('entire');
    if (isNotEntireScreen) {
      return 'Preferred over "Entire screen" options';
    }
    
    return 'Fallback selection (first available source)';
  }

  // Check if a source represents the entire screen spanning multiple displays
  isEntireScreenSource(source) {
    if (!source) return false;
    
    const name = source.name.toLowerCase();
    
    // German patterns
    if (name.includes('gesamter') || name.includes('gesamt')) return true;
    
    // English patterns
    if (name.includes('entire') || name.includes('whole') || name.includes('all')) return true;
    if (name.includes('complete') || name.includes('full')) return true;
    
    // Check if this source might capture multiple displays based on its characteristics
    // If we have multiple displays but only one source, it's likely an entire screen source
    if (this.displays.length > 1 && this.sources.length === 1) {
      console.log('Single source with multiple displays - likely entire screen');
      return true;
    }
    
    return false;
  }
}

module.exports = MonitorDetector;
