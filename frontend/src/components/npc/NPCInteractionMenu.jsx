/**
 * NPC Interaction Menu Component
 * Modal for interacting with NPCs (Talk or Attack)
 */

import React, { useState, useEffect, useRef } from 'react';
import { formatDisplayName } from '../../utils/formatName';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../../state/characterSlice';
import { useCombatStore } from '../../state/combatSlice';
import { addTutorialTarget, TUTORIAL_TARGETS } from '../../services/tutorialTargetRegistry';
import { tutorialEventBus, TUTORIAL_EVENTS } from '../../services/tutorialEventBus';
import QuestList from '../quest/QuestList';
import './NPCInteractionMenu.css';

export default function NPCInteractionMenu({ npc, planet, isOpen, onClose, onTalk, onAttack, position }) {
  const navigate = useNavigate();
  const { currentCharacter } = useCharacterStore();
  const { startEncounter } = useCombatStore();
  const [showQuestList, setShowQuestList] = useState(false);
  const menuRef = useRef(null);
  const talkButtonRef = useRef(null);
  const shopButtonRef = useRef(null);

  // Add tutorial targets
  useEffect(() => {
    if (menuRef.current) {
      addTutorialTarget(menuRef.current, TUTORIAL_TARGETS.NPC_INTERACTION_MENU);
    }
    if (talkButtonRef.current) {
      addTutorialTarget(talkButtonRef.current, TUTORIAL_TARGETS.NPC_TALK_BUTTON);
    }
    if (shopButtonRef.current) {
      addTutorialTarget(shopButtonRef.current, TUTORIAL_TARGETS.NPC_SHOP_BUTTON);
    }
  }, [isOpen]);

  // Emit event when menu opens
  useEffect(() => {
    if (isOpen && npc) {
      tutorialEventBus.emit(TUTORIAL_EVENTS.NPC_INTERACTION_OPENED, {
        npcId: npc.id,
        npcName: npc.name,
        planetId: planet?.id
      });
    }
  }, [isOpen, npc, planet]);

  if (!isOpen || !npc) return null;

  const handleTalk = () => {
    // Call onTalk callback if provided, otherwise just close
    // onTalk keeps selectedNPC set so DialogueInterface opens
    if (onTalk) {
      onTalk();
    } else {
      onClose();
    }
  };

  const handleQuest = () => {
    setShowQuestList(true);
  };

  const handleQuestAccepted = (questData) => {
    setShowQuestList(false);
    onClose(); // Close the NPC menu after accepting quest
  };

  const handleShop = () => {
    if (!currentCharacter) {
      alert('No character selected');
      return;
    }
    
    // Navigate to trading view
    navigate(`/game/vendor/${npc.id}`);
    onClose(); // Close the interaction menu
  };

  const handleAttack = async () => {
    if (!currentCharacter) {
      alert('No character selected');
      return;
    }

    if (!window.confirm(`Are you sure you want to attack ${npc.name}?`)) {
      return;
    }

    // 3D surface re-homes combat to a real-time in-world spawn (no turn-based card screen): the
    // host page supplies onAttack, which returns true when it handled it in-world. If it returns
    // false (e.g. realtime server offline) — or isn't supplied (2D view) — fall back to the legacy
    // turn-based encounter below.
    if (onAttack && onAttack(npc)) {
      onClose && onClose();
      return;
    }

    try {
      // Create enemy from NPC
      const enemy = {
        name: npc.name,
        level: npc.level || 1,
        stats: npc.stats || {
          health: 50,
          maxHealth: 50,
          strength: 10,
          agility: 10,
          intelligence: 10,
          speed: 10
        },
        type: 'enemy'
      };

      // Start combat encounter
      const encounter = await startEncounter(
        currentCharacter.id,
        'npc',
        [enemy]
      );

      if (encounter && encounter.id) {
        // Store return location for after combat
        const returnLocation = {
          planetId: planet?.id || currentCharacter.currentPlanet,
          location: currentCharacter.currentLocation || { x: 50, y: 50 }
        };

        // Navigate to combat view
        navigate(`/game/combat/${encounter.id}`, {
          state: {
            returnLocation: returnLocation
          }
        });
      }
    } catch (error) {
      console.error('Failed to start combat with NPC:', error);
      alert(`Failed to start combat: ${error.message}`);
    }
  };
  
  // Check if NPC is a vendor
  const isVendor = npc.npcType === 'vendor' || npc.vendorInventory;

  const getNPCTypeLabel = (npcType) => {
    const typeMap = {
      'quest_giver': 'Quest Giver',
      'vendor': 'Vendor',
      'companion': 'Companion',
      'generic': 'Citizen',
      'guard': 'Guard',
      'trader': 'Trader',
      'farmer': 'Farmer',
      'settler': 'Settler',
      'citizen': 'Citizen'
    };
    return typeMap[npcType] || npcType || 'Citizen';
  };

  const getNPCTypeColor = (npcType) => {
    const colorMap = {
      'quest_giver': '#fbbf24',
      'vendor': '#34d399',
      'companion': '#60a5fa',
      'generic': '#9ca3af',
      'guard': '#ef4444',
      'trader': '#34d399',
      'farmer': '#84cc16',
      'settler': '#9ca3af',
      'citizen': '#9ca3af'
    };
    return colorMap[npcType] || '#9ca3af';
  };

  return (
    <div
      ref={menuRef}
      className="npc-interaction-menu"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 1000
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="npc-interaction-header">
        <h3>{npc.name}</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="npc-interaction-info">
        <div className="npc-type-badge" style={{ backgroundColor: getNPCTypeColor(npc.npcType) }}>
          {getNPCTypeLabel(npc.npcType)}
        </div>
        
        {npc.occupation && (
          <p className="npc-occupation">
            <strong>Occupation:</strong> {formatDisplayName(npc.occupation)}
          </p>
        )}
        
        {npc.description && (
          <p className="npc-description">{npc.description}</p>
        )}
        
        {npc.level && (
          <p className="npc-level">
            <strong>Level:</strong> {npc.level}
          </p>
        )}
      </div>

      <div className="npc-interaction-actions">
        <button
          ref={talkButtonRef}
          className="action-btn talk-btn"
          onClick={handleTalk}
        >
          <span className="action-icon">💬</span>
          <span className="action-label">Talk</span>
        </button>
        
        {isVendor && (
          <button
            ref={shopButtonRef}
            className="action-btn shop-btn"
            onClick={handleShop}
          >
            <span className="action-icon">🛒</span>
            <span className="action-label">Shop</span>
          </button>
        )}
        
        {npc.npcType === 'quest_giver' && (
          <button
            className="action-btn quest-btn"
            onClick={handleQuest}
          >
            <span className="action-icon">📜</span>
            <span className="action-label">Quest</span>
          </button>
        )}
        
        <button
          className="action-btn attack-btn"
          onClick={handleAttack}
        >
          <span className="action-icon">⚔️</span>
          <span className="action-label">Attack</span>
        </button>
      </div>

      {showQuestList && (
        <QuestList
          npcId={npc.id}
          npcName={npc.name}
          onClose={() => setShowQuestList(false)}
          onQuestAccepted={handleQuestAccepted}
        />
      )}
    </div>
  );
}

