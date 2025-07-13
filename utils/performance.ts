// Performance monitoring utilities
export const performanceMonitor = {
  startTime: 0,
  
  start(label: string) {
    this.startTime = performance.now();
    console.log(`🚀 Starting: ${label}`);
  },
  
  end(label: string) {
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    console.log(`✅ Completed: ${label} in ${duration.toFixed(2)}ms`);
    return duration;
  },
  
  measure<T extends any[], R>(label: string, fn: (...args: T) => Promise<R>) {
    return async (...args: T): Promise<R> => {
      this.start(label);
      try {
        const result = await fn(...args);
        this.end(label);
        return result;
      } catch (error) {
        console.error(`❌ Error in ${label}:`, error);
        throw error;
      }
    };
  }
};

// Memory usage monitoring
export const memoryMonitor = {
  logMemoryUsage(label: string) {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      console.log(`📊 Memory usage at ${label}:`, {
        used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
      });
    }
  }
};

// Image optimization utilities
export const imageUtils = {
  compressImage(file: File, quality: number = 0.8): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions (max 1920x1080)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }
};
