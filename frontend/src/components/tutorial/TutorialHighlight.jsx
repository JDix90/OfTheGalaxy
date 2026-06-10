/**
 * Tutorial Highlight Component
 * Highlights UI elements for tutorial steps
 */

import React, { useState, useEffect } from 'react';
import { findTutorialTarget } from '../../services/tutorialTargetRegistry';
import './TutorialHighlight.css';

export default function TutorialHighlight({ target }) {
  const [highlightRect, setHighlightRect] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (!target) {
      setIsVisible(false);
      return;
    }
    
    const updateHighlight = () => {
      const element = findTutorialTarget(target);
      
      if (!element) {
        setIsVisible(false);
        return;
      }
      
      const rect = element.getBoundingClientRect();
      setHighlightRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
      setIsVisible(true);
    };
    
    // Initial highlight
    updateHighlight();
    
    // Update on scroll/resize
    window.addEventListener('scroll', updateHighlight, true);
    window.addEventListener('resize', updateHighlight);
    
    // Use MutationObserver to watch for element changes
    const observer = new MutationObserver(updateHighlight);
    const element = findTutorialTarget(target);
    if (element) {
      observer.observe(element, {
        attributes: true,
        childList: true,
        subtree: true
      });
    }
    
    return () => {
      window.removeEventListener('scroll', updateHighlight, true);
      window.removeEventListener('resize', updateHighlight);
      observer.disconnect();
    };
  }, [target]);
  
  if (!isVisible || !highlightRect) return null;
  
  return (
    <>
      {/* Overlay dimming */}
      <div className="tutorial-highlight-overlay" />
      
      {/* Highlight box */}
      <div
        className="tutorial-highlight-box"
        style={{
          top: `${highlightRect.top}px`,
          left: `${highlightRect.left}px`,
          width: `${highlightRect.width}px`,
          height: `${highlightRect.height}px`
        }}
      />
    </>
  );
}








