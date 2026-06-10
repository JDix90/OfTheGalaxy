/**
 * SubMap Entry Menu Component
 * Context menu for entering/exploring submaps from planet surface
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../../state/characterSlice';
import './SubMapEntryMenu.css';

export default function SubMapEntryMenu({ subMap, planet, isOpen, onClose, position }) {
  const navigate = useNavigate();
  const { currentCharacter } = useCharacterStore();
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (!isOpen || !position) return;
    
    // Adjust position to keep menu on screen
    const menuWidth = 220; // Approximate menu width
    const menuHeight = 200; // Approximate menu height
    const padding = 10;
    
    let { x, y } = position;
    
    // Adjust horizontal position
    if (x + menuWidth > window.innerWidth - padding) {
      x = window.innerWidth - menuWidth - padding;
    }
    if (x < padding) {
      x = padding;
    }
    
    // Adjust vertical position (show above entry point if too low)
    if (y + menuHeight > window.innerHeight - padding) {
      y = position.y - menuHeight - 20; // Show above instead
    }
    if (y < padding) {
      y = padding;
    }
    
    setAdjustedPosition({ x, y });
  }, [isOpen, position]);

  if (!isOpen || !subMap || !planet) return null;

  const handleEnter = () => {
    if (!currentCharacter) return;
    
    // Navigate to submap using the location route format
    const encodedParentLocationId = encodeURIComponent(subMap.parentLocationId || '');
    const path = `/game/location/${planet.id}/${encodedParentLocationId}/${subMap.parentLocationType || 'city'}/${subMap.type}`;
    
    console.log('[SubMap Entry] Navigating to submap:', {
      path,
      subMapId: subMap.id,
      subMapType: subMap.type,
      parentLocationId: subMap.parentLocationId
    });
    
    navigate(path);
    onClose();
  };

  const handleExplore = () => {
    // Same as Enter for now
    handleEnter();
  };

  const handleInvestigate = () => {
    // For now, just enter - could add investigation modal later
    handleEnter();
  };

  const handleHeal = async () => {
    if (!currentCharacter) return;
    
    try {
      // TODO: Implement healing logic
      // For now, just enter the medical center
      handleEnter();
    } catch (error) {
      console.error('Failed to heal:', error);
    }
  };

  // Determine available actions based on submap type
  const getAvailableActions = () => {
    const actions = [];
    const subMapType = subMap.type;

    if (subMapType === 'medical_center' || subMapType === 'hospital') {
      actions.push({ type: 'heal', label: 'Heal', icon: '⚕️', handler: handleHeal });
      actions.push({ type: 'enter', label: 'Enter', icon: '🚪', handler: handleEnter });
    } else if (subMapType === 'dungeon' || subMapType === 'danger' || subMapType === 'mine') {
      actions.push({ type: 'enter', label: 'Enter', icon: '⚔️', handler: handleEnter });
      actions.push({ type: 'investigate', label: 'Investigate', icon: '🔎', handler: handleInvestigate });
    } else if (subMapType === 'settlement' || subMapType === 'province' || subMapType === 'wilderness') {
      actions.push({ type: 'enter', label: 'Enter', icon: '🚪', handler: handleEnter });
      actions.push({ type: 'investigate', label: 'Investigate', icon: '🔎', handler: handleInvestigate });
    } else {
      // Default: Enter for cities, spaceports, markets, cantinas, etc.
      actions.push({ type: 'enter', label: 'Enter', icon: '🚪', handler: handleEnter });
    }

    return actions;
  };

  const actions = getAvailableActions();
  const subMapName = subMap.name || `${subMap.parentLocationId} ${subMap.type}`;

  return (
    <div 
      className="submap-entry-menu" 
      style={{ 
        left: `${adjustedPosition.x}px`, 
        top: `${adjustedPosition.y}px` 
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="submap-entry-menu-header">
        <h3>{subMapName}</h3>
        <button className="submap-entry-menu-close" onClick={onClose}>×</button>
      </div>
      <div className="submap-entry-menu-actions">
        {actions.map((action, index) => (
          <button
            key={index}
            className="submap-entry-menu-action"
            onClick={action.handler}
          >
            <span className="submap-entry-menu-action-icon">{action.icon}</span>
            <span className="submap-entry-menu-action-label">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

