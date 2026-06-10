/**
 * Tutorial Tooltip Component
 * Displays contextual tooltips for tutorial steps
 */

import React, { useState, useEffect, useRef } from 'react';
import { findTutorialTarget } from '../../services/tutorialTargetRegistry';
import './TutorialTooltip.css';

export default function TutorialTooltip({
  title,
  description,
  target,
  position = 'bottom',
  onNext,
  onSkip,
  showSkip = true,
  isRandomEncounter = false
}) {
  const [tooltipPosition, setTooltipPosition] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef(null);
  
  useEffect(() => {
    if (!target) {
      // Center tooltip if no target
      setTooltipPosition({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      });
      setIsVisible(true);
      return;
    }
    
    const updatePosition = () => {
      const targetElement = findTutorialTarget(target);
      
      if (!targetElement) {
        // Fallback: center tooltip
        setTooltipPosition({
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        });
        setIsVisible(true);
        return;
      }
      
      const rect = targetElement.getBoundingClientRect();
      const tooltipRect = tooltipRef.current?.getBoundingClientRect();
      const tooltipHeight = tooltipRect?.height || 200;
      const tooltipWidth = tooltipRect?.width || 300;
      
      let top, left;
      const spacing = 15;
      
      switch (position) {
        case 'top':
          top = rect.top - tooltipHeight - spacing;
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          break;
        case 'bottom':
          top = rect.bottom + spacing;
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          break;
        case 'left':
          top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
          left = rect.left - tooltipWidth - spacing;
          break;
        case 'right':
          top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
          left = rect.right + spacing;
          break;
        default:
          top = rect.bottom + spacing;
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
      }
      
      // Keep tooltip within viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      if (left < 10) left = 10;
      if (left + tooltipWidth > viewportWidth - 10) {
        left = viewportWidth - tooltipWidth - 10;
      }
      
      if (top < 10) top = 10;
      if (top + tooltipHeight > viewportHeight - 10) {
        top = viewportHeight - tooltipHeight - 10;
      }
      
      setTooltipPosition({
        top: `${top}px`,
        left: `${left}px`,
        transform: 'none'
      });
      setIsVisible(true);
    };
    
    // Initial position
    updatePosition();
    
    // Update on scroll/resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [target, position]);
  
  if (!isVisible || !title) return null;
  
  return (
    <div
      ref={tooltipRef}
      className={`tutorial-tooltip tutorial-tooltip-${position} ${isRandomEncounter ? 'random-encounter-tooltip' : ''}`}
      style={tooltipPosition}
    >
      <div className="tutorial-tooltip-content">
        <h4 className="tutorial-tooltip-title">{title}</h4>
        {description && (
          <p className="tutorial-tooltip-description">{description}</p>
        )}
        <div className="tutorial-tooltip-actions">
          {onNext && (
            <button
              className="tutorial-tooltip-button tutorial-tooltip-button-primary"
              onClick={onNext}
            >
              Next
            </button>
          )}
          {showSkip && onSkip && (
            <button
              className="tutorial-tooltip-button tutorial-tooltip-button-secondary"
              onClick={onSkip}
            >
              Skip Tutorial
            </button>
          )}
        </div>
      </div>
      {target && (
        <div className={`tutorial-tooltip-arrow tutorial-tooltip-arrow-${position}`} />
      )}
    </div>
  );
}





