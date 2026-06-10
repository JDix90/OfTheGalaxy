import React, { useState } from 'react';
import './SuccessPreviewTooltip.css';

export default function SuccessPreviewTooltip({ 
  currentChance, 
  previews, 
  children,
  label = 'Success Chance'
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  if (!previews || previews.length === 0) {
    return children;
  }
  
  return (
    <div 
      className="success-preview-container"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <div className="success-preview-tooltip">
          <div className="tooltip-header">
            <h4>{label}</h4>
            <div className="tooltip-value">{(currentChance * 100).toFixed(1)}%</div>
          </div>
          <div className="preview-list">
            {previews.map((preview, index) => (
              <div key={index} className="preview-item">
                <span className="preview-label">{preview.label}:</span>
                <span className="preview-value">{(preview.chance * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

