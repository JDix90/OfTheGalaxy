/**
 * Canvas Optimization Utilities
 * Provides performance optimizations for canvas rendering
 */

/**
 * Frame rate limiter
 * Limits rendering to target FPS
 */
export class FrameRateLimiter {
  constructor(targetFPS = 60) {
    this.targetFPS = targetFPS;
    this.frameInterval = 1000 / targetFPS;
    this.lastFrameTime = 0;
    this.accumulator = 0;
  }

  shouldRender(currentTime) {
    const deltaTime = currentTime - this.lastFrameTime;
    this.accumulator += deltaTime;

    if (this.accumulator >= this.frameInterval) {
      this.accumulator = 0;
      this.lastFrameTime = currentTime;
      return true;
    }

    return false;
  }

  reset() {
    this.lastFrameTime = 0;
    this.accumulator = 0;
  }
}

/**
 * Dirty rectangle tracker
 * Tracks which areas of the canvas need to be redrawn
 */
export class DirtyRectangleTracker {
  constructor() {
    this.dirtyRects = [];
    this.fullRedraw = false;
  }

  addDirtyRect(x, y, width, height) {
    if (this.fullRedraw) return;

    // Merge with existing rectangles if overlapping
    const newRect = { x, y, width, height };
    let merged = false;

    for (let i = 0; i < this.dirtyRects.length; i++) {
      const rect = this.dirtyRects[i];
      if (this.rectsOverlap(newRect, rect)) {
        // Merge rectangles
        const minX = Math.min(newRect.x, rect.x);
        const minY = Math.min(newRect.y, rect.y);
        const maxX = Math.max(newRect.x + newRect.width, rect.x + rect.width);
        const maxY = Math.max(newRect.y + newRect.height, rect.y + rect.height);
        
        this.dirtyRects[i] = {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY
        };
        merged = true;
        break;
      }
    }

    if (!merged) {
      this.dirtyRects.push(newRect);
    }

    // Limit number of dirty rectangles to prevent performance issues
    if (this.dirtyRects.length > 10) {
      this.fullRedraw = true;
    }
  }

  rectsOverlap(rect1, rect2) {
    return !(
      rect1.x + rect1.width < rect2.x ||
      rect2.x + rect2.width < rect1.x ||
      rect1.y + rect1.height < rect2.y ||
      rect2.y + rect2.height < rect1.y
    );
  }

  markFullRedraw() {
    this.fullRedraw = true;
    this.dirtyRects = [];
  }

  clear() {
    this.dirtyRects = [];
    this.fullRedraw = false;
  }

  getDirtyRects() {
    return this.fullRedraw ? null : this.dirtyRects;
  }

  hasDirtyRects() {
    return this.fullRedraw || this.dirtyRects.length > 0;
  }
}

/**
 * Viewport culler
 * Determines which elements are visible in the viewport
 */
export class ViewportCuller {
  constructor(viewport) {
    this.viewport = viewport; // { x, y, width, height, zoom }
  }

  isVisible(elementX, elementY, elementWidth = 0, elementHeight = 0) {
    const { x, y, width, height, zoom = 1 } = this.viewport;
    
    // Account for zoom
    const scaledWidth = width / zoom;
    const scaledHeight = height / zoom;
    const scaledX = x / zoom;
    const scaledY = y / zoom;

    // Check if element is within viewport bounds (with padding for elements that might be partially visible)
    const padding = Math.max(elementWidth, elementHeight) * 2;
    
    return !(
      elementX + elementWidth + padding < scaledX ||
      elementX - padding > scaledX + scaledWidth ||
      elementY + elementHeight + padding < scaledY ||
      elementY - padding > scaledY + scaledHeight
    );
  }

  updateViewport(viewport) {
    this.viewport = viewport;
  }
}

/**
 * Canvas cache manager
 * Caches static elements to avoid redrawing
 */
export class CanvasCache {
  constructor() {
    this.cache = new Map();
    this.offscreenCanvas = null;
  }

  getOffscreenCanvas(width, height) {
    if (!this.offscreenCanvas || 
        this.offscreenCanvas.width !== width || 
        this.offscreenCanvas.height !== height) {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;
    }
    return this.offscreenCanvas;
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value) {
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
    this.offscreenCanvas = null;
  }

  has(key) {
    return this.cache.has(key);
  }
}

/**
 * Performance monitor
 * Tracks rendering performance
 */
export class PerformanceMonitor {
  constructor() {
    this.frameCount = 0;
    this.lastFPSUpdate = 0;
    this.currentFPS = 0;
    this.frameTimes = [];
    this.maxFrameTimeHistory = 60;
  }

  update(currentTime) {
    this.frameCount++;
    
    if (this.frameTimes.length > 0) {
      const frameTime = currentTime - this.frameTimes[this.frameTimes.length - 1];
      this.frameTimes.push(currentTime);
      
      if (this.frameTimes.length > this.maxFrameTimeHistory) {
        this.frameTimes.shift();
      }

      // Calculate FPS
      if (currentTime - this.lastFPSUpdate >= 1000) {
        const framesInSecond = this.frameTimes.length;
        this.currentFPS = framesInSecond;
        this.lastFPSUpdate = currentTime;
      }
    } else {
      this.frameTimes.push(currentTime);
    }
  }

  getFPS() {
    return this.currentFPS;
  }

  getAverageFrameTime() {
    if (this.frameTimes.length < 2) return 0;
    
    let totalTime = 0;
    for (let i = 1; i < this.frameTimes.length; i++) {
      totalTime += this.frameTimes[i] - this.frameTimes[i - 1];
    }
    
    return totalTime / (this.frameTimes.length - 1);
  }

  reset() {
    this.frameCount = 0;
    this.lastFPSUpdate = 0;
    this.currentFPS = 0;
    this.frameTimes = [];
  }
}


