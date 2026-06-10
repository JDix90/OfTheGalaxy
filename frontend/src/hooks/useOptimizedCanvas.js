/**
 * Optimized Canvas Hook
 * Provides optimized canvas rendering with frame rate limiting and dirty rectangle tracking
 */

import { useRef, useCallback, useEffect } from 'react';
import { FrameRateLimiter, DirtyRectangleTracker, ViewportCuller, PerformanceMonitor } from '../utils/canvasOptimizer';

export function useOptimizedCanvas(options = {}) {
  const {
    targetFPS = 60,
    enableDirtyRects = true,
    enableViewportCulling = true,
    enablePerformanceMonitoring = false
  } = options;

  const frameLimiterRef = useRef(new FrameRateLimiter(targetFPS));
  const dirtyTrackerRef = useRef(new DirtyRectangleTracker());
  const viewportCullerRef = useRef(new ViewportCuller({ x: 0, y: 0, width: 0, height: 0, zoom: 1 }));
  const performanceMonitorRef = useRef(enablePerformanceMonitoring ? new PerformanceMonitor() : null);
  const animationFrameRef = useRef(null);
  const lastRenderTimeRef = useRef(0);

  // Update viewport for culling
  const updateViewport = useCallback((viewport) => {
    if (enableViewportCulling) {
      viewportCullerRef.current.updateViewport(viewport);
    }
  }, [enableViewportCulling]);

  // Mark area as dirty
  const markDirty = useCallback((x, y, width, height) => {
    if (enableDirtyRects) {
      dirtyTrackerRef.current.addDirtyRect(x, y, width, height);
    } else {
      dirtyTrackerRef.current.markFullRedraw();
    }
  }, [enableDirtyRects]);

  // Mark full redraw needed
  const markFullRedraw = useCallback(() => {
    dirtyTrackerRef.current.markFullRedraw();
  }, []);

  // Clear dirty rectangles
  const clearDirty = useCallback(() => {
    dirtyTrackerRef.current.clear();
  }, []);

  // Optimized render function
  const render = useCallback((renderFn, currentTime = performance.now()) => {
    // Check frame rate limiter
    if (!frameLimiterRef.current.shouldRender(currentTime)) {
      return false;
    }

    // Update performance monitor
    if (performanceMonitorRef.current) {
      performanceMonitorRef.current.update(currentTime);
    }

    // Get dirty rectangles
    const dirtyRects = enableDirtyRects ? dirtyTrackerRef.current.getDirtyRects() : null;
    const needsFullRedraw = dirtyTrackerRef.current.fullRedraw;

    // Call render function
    renderFn({
      dirtyRects,
      needsFullRedraw,
      viewportCuller: viewportCullerRef.current,
      performanceMonitor: performanceMonitorRef.current
    });

    // Clear dirty rectangles after render
    if (enableDirtyRects && !needsFullRedraw) {
      dirtyTrackerRef.current.clear();
    }

    lastRenderTimeRef.current = currentTime;
    return true;
  }, [enableDirtyRects]);

  // Request animation frame wrapper
  const requestRender = useCallback((renderFn) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const animate = (currentTime) => {
      render(renderFn, currentTime);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [render]);

  // Stop rendering
  const stopRender = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRender();
    };
  }, [stopRender]);

  // Get performance stats
  const getPerformanceStats = useCallback(() => {
    if (!performanceMonitorRef.current) {
      return null;
    }

    return {
      fps: performanceMonitorRef.current.getFPS(),
      averageFrameTime: performanceMonitorRef.current.getAverageFrameTime()
    };
  }, []);

  return {
    render,
    requestRender,
    stopRender,
    markDirty,
    markFullRedraw,
    clearDirty,
    updateViewport,
    getPerformanceStats
  };
}


