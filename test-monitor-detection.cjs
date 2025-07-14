// Test script for monitor detection and screenshot functionality
// Run this with: node test-monitor-detection.js

const path = require('path');

// Mock Electron APIs for testing
const mockElectron = {
  screen: {
    getAllDisplays: () => {
      console.log('🔍 Testing screen.getAllDisplays()');
      return [
        {
          id: 1,
          bounds: { x: 0, y: 0, width: 1920, height: 1080 },
          size: { width: 1920, height: 1080 },
          workArea: { x: 0, y: 0, width: 1920, height: 1040 },
          scaleFactor: 1,
          rotation: 0,
          colorDepth: 24,
          colorSpace: 'srgb',
          internal: false
        },
        {
          id: 2,
          bounds: { x: 1920, y: 0, width: 2560, height: 1440 },
          size: { width: 2560, height: 1440 },
          workArea: { x: 1920, y: 0, width: 2560, height: 1400 },
          scaleFactor: 1.25,
          rotation: 0,
          colorDepth: 30,
          colorSpace: 'display-p3',
          internal: false
        }
      ];
    },
    getPrimaryDisplay: () => {
      console.log('🔍 Testing screen.getPrimaryDisplay()');
      return {
        id: 1,
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        size: { width: 1920, height: 1080 },
        workArea: { x: 0, y: 0, width: 1920, height: 1040 },
        scaleFactor: 1,
        rotation: 0,
        colorDepth: 24,
        colorSpace: 'srgb',
        internal: false
      };
    }
  },
  desktopCapturer: {
    getSources: async (options) => {
      console.log('🔍 Testing desktopCapturer.getSources() with options:', options);
      
      // Mock thumbnail
      const mockThumbnail = {
        getSize: () => ({ width: options.thumbnailSize.width, height: options.thumbnailSize.height }),
        isEmpty: () => false,
        toDataURL: () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      };
      
      return [
        {
          id: 'screen:1:0',
          name: 'Screen 1',
          display_id: '1',
          thumbnail: mockThumbnail
        },
        {
          id: 'screen:2:0',
          name: 'Screen 2',
          display_id: '2',
          thumbnail: mockThumbnail
        },
        {
          id: 'screen:0:0',
          name: 'Entire screen',
          display_id: '0',
          thumbnail: mockThumbnail
        }
      ];
    }
  }
};

// Override require for electron module
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === 'electron') {
    return mockElectron;
  }
  return originalRequire.apply(this, arguments);
};

async function testMonitorDetection() {
  console.log('=== TESTING MONITOR DETECTION ===\n');
  
  try {
    // Test MonitorDetector
    console.log('1. Testing MonitorDetector...');
    const MonitorDetector = require('./electron/monitor1-fix.js');
    const detector = new MonitorDetector();
    
    const initialized = await detector.initialize();
    console.log('✅ MonitorDetector initialized:', initialized);
    
    const recommendation = detector.getRecommendation();
    console.log('📊 Recommendation:', {
      source: recommendation.recommendedSource?.name,
      reasoning: recommendation.reasoning,
      alternativeCount: recommendation.alternativeSources.length
    });
    
    const testResults = await detector.testAllSources();
    console.log('🧪 Test results:', testResults.length, 'sources tested');
    
    console.log('\n');
    
    // Test HDRCompatibilityManager
    console.log('2. Testing HDRCompatibilityManager...');
    const HDRCompatibilityManager = require('./electron/hdr-patch.js');
    const hdrManager = new HDRCompatibilityManager();
    
    const hdrInitialized = hdrManager.initialize();
    console.log('✅ HDRCompatibilityManager initialized:', hdrInitialized);
    
    const hdrStatus = hdrManager.getStatus();
    console.log('📊 HDR Status:', hdrStatus);
    
    const thumbnailSize = hdrManager.getOptimalThumbnailSize(mockElectron.screen.getPrimaryDisplay());
    console.log('📐 Optimal thumbnail size:', thumbnailSize);
    
    console.log('\n');
    
    // Test ScreenshotManager
    console.log('3. Testing ScreenshotManager...');
    const ScreenshotManager = require('./electron/screenshot-fix.js');
    const screenshotManager = new ScreenshotManager();
    
    const screenshotInitialized = await screenshotManager.initialize();
    console.log('✅ ScreenshotManager initialized:', screenshotInitialized);
    
    const diagnostics = screenshotManager.getDiagnostics();
    console.log('📊 Screenshot diagnostics:', {
      initialized: diagnostics.initialized,
      hdrMode: diagnostics.hdrStatus.compatibilityMode,
      displayCount: diagnostics.monitorInfo.displayCount,
      sourceCount: diagnostics.monitorInfo.sourceCount,
      lastSuccessfulSource: diagnostics.lastSuccessfulSource?.name || 'none'
    });
    
    // Test screenshot capture
    console.log('📸 Testing screenshot capture...');
    const dataUrl = await screenshotManager.captureScreenshot();
    console.log('✅ Screenshot captured, length:', dataUrl.length);
    
    console.log('\n=== ALL TESTS COMPLETED SUCCESSFULLY ===');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Run tests
testMonitorDetection().then(() => {
  console.log('\n🎉 Monitor detection testing completed!');
}).catch(error => {
  console.error('\n💥 Testing failed:', error);
});
