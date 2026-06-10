/**
 * AppearanceCustomization Component
 * Step 4: Customize character appearance (simplified)
 */

import React from 'react';

export default function AppearanceCustomization({ characterData, onUpdate }) {
  // Simplified appearance customization
  // In full implementation, this would have detailed customization options
  
  return (
    <div className="appearance-customization">
      <p className="step-description">
        Appearance customization coming soon! For now, you can proceed to name your character.
      </p>

      <div className="appearance-preview">
        <div className="character-preview-placeholder">
          <p>Character Preview</p>
          <p className="preview-species">{characterData.species || 'No species selected'}</p>
        </div>
      </div>

      <div className="appearance-note">
        <p>
          <strong>Note:</strong> Full appearance customization (skin tone, hair, facial features, etc.) 
          will be available in the next update. Your character will use default appearance for now.
        </p>
      </div>
    </div>
  );
}
