/**
 * NPC Interaction Menu Component
 * Modal for interacting with NPCs (Talk or Attack)
 */

import React, { useState, useEffect, useRef } from 'react';
import { formatDisplayName } from '../../utils/formatName';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../../state/characterSlice';
import { addTutorialTarget, TUTORIAL_TARGETS } from '../../services/tutorialTargetRegistry';
import { tutorialEventBus, TUTORIAL_EVENTS } from '../../services/tutorialEventBus';
import { notify } from '../hud/NotificationCenter';
import { COMBAT_OFFLINE_MESSAGE } from '../../config/combat';
import { Z } from '../hud/hudTokens';
import QuestList from '../quest/QuestList';
import './NPCInteractionMenu.css';

export default function NPCInteractionMenu({ npc, planet, isOpen, onClose, onTalk, onAttack, onShop, position }) {
  const navigate = useNavigate();
  const { currentCharacter } = useCharacterStore();
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

    // 3D hosts pass onShop to open the vendor as an in-world overlay (no navigation,
    // the live scene stays mounted). Legacy 2D pages omit it and fall back to the
    // full-page /game/vendor route.
    if (onShop) {
      onShop(npc);
      onClose();
      return;
    }

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

    // Combat is real-time + 3D-only (Phase 7 retired the turn-based card screen). The host page
    // supplies onAttack, which spawns the hostile in-world and returns true when it handled it.
    if (onAttack && onAttack(npc)) {
      onClose && onClose();
      return;
    }

    // The realtime layer couldn't take the fight (offline / no in-world handler) — surface a
    // graceful message instead of the retired turn-based screen.
    notify({ type: 'warning', title: 'Combat unavailable', message: COMBAT_OFFLINE_MESSAGE });
    onClose && onClose();
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
        zIndex: Z.CONTEXT_MENUS
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

