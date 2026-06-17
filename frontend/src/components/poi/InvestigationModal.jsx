/**
 * Investigation Modal Component
 * Displays lore-accurate descriptions when investigating POIs
 */

import React from 'react';
import { formatDisplayName } from '../../utils/formatName';
import './InvestigationModal.css';

export default function InvestigationModal({ isOpen, onClose, poi, lore }) {
  if (!isOpen || !poi) return null;

  return (
    <div className="investigation-modal-overlay" onClick={onClose}>
      <div className="investigation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="investigation-modal-header">
          <h2>Investigation: {poi.name}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="investigation-modal-content">
          <div className="poi-type-badge">
            <span className="poi-type-label">Type:</span>
            <span className="poi-type-value">{poi.type ? formatDisplayName(poi.type) : 'Unknown'}</span>
          </div>
          <div className="lore-description">
            <h3>Investigation Results</h3>
            <p>{lore || poi.description || 'You investigate the location but find nothing of particular interest.'}</p>
          </div>
          {poi.description && poi.description !== lore && (
            <div className="basic-description">
              <h4>Basic Information</h4>
              <p>{poi.description}</p>
            </div>
          )}
        </div>
        <div className="investigation-modal-footer">
          <button className="close-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}


