import React, { useState } from 'react';
import './StatBreakdownTooltip.css';

export default function StatBreakdownTooltip({ statName, breakdown, value, children, formatValue }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  if (!breakdown || Object.keys(breakdown).length === 0) {
    return children;
  }
  
  const format = formatValue || ((v) => {
    if (typeof v === 'number') {
      if (v < 1 && v > 0) {
        return (v * 100).toFixed(1) + '%';
      }
      return v.toFixed(1);
    }
    return v;
  });
  
  return (
    <div 
      className="stat-breakdown-container"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <div className="stat-breakdown-tooltip">
          <div className="tooltip-header">
            <h4>{statName}</h4>
            <div className="tooltip-value">{format(value)}</div>
          </div>
          <div className="tooltip-breakdown">
            {Object.entries(breakdown).map(([key, component]) => (
              <div key={key} className="breakdown-item">
                <span className="breakdown-label">{component.label || component.description || key}:</span>
                <span className="breakdown-value">
                  {component.calculatedValue !== undefined 
                    ? (component.calculatedValue > 0 ? '+' : '') + format(component.calculatedValue) + (component.unit || '')
                    : (component.value > 0 ? '+' : '') + format(component.value) + (component.unit || '')
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

