/**
 * TutorialProgress Model
 * Tracks tutorial progress for each character
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TutorialProgress = sequelize.define('TutorialProgress', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    characterId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'character_id',
      references: {
        model: 'player_characters',
        key: 'id'
      }
    },
    tutorialId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'tutorial_001_dockside_initiation',
      field: 'tutorial_id'
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'not_started',
      validate: {
        isIn: [[
          'not_started',
          'starting',
          'orient_ui',
          'movement_intro',
          'movement_complete',
          'npc_interaction_intro',
          'npc_menu_opened',
          'dialogue_started',
          'dialogue_complete',
          'quest_offered',
          'quest_accepted',
          'quest_objective_tracking',
          'submap_entry_intro',
          'submap_entered',
          'submap_exited',
          'combat_intro',
          'combat_started',
          'combat_turn_order_explained',
          'combat_action_menu_explained',
          'combat_targeting_explained',
          'combat_complete',
          'loot_received',
          'inventory_opened',
          'item_equipped',
          'healing_explained',
          'medpac_used',
          'hud_health_stamina_explained',
          'hud_credits_level_xp_explained',
          'spaceport_exit_explained',
          'vendor_intro',
          'vendor_opened',
          'vendor_item_hover_explained',
          'vendor_buy_medpac',
          'vendor_sell_droid_parts',
          'item_sold',
          'item_bought',
          'travel_intro',
          'galaxy_map_opened',
          'travel_initiated',
          'travel_complete',
          'quest_turn_in',
          'tutorial_complete',
          'momentum_handoff',
          'tutorial_skipped',
          // Planet Surface Tutorial States
          'planet_surface_intro',
          'planet_surface_movement',
          'poi_discovered',
          'poi_interaction_menu_opened',
          'poi_entered',
          'poi_investigated',
          'planet_npc_clicked',
          'planet_npc_dialogue_started',
          'quest_found',
          'quest_objective_location_reached',
          'quest_objective_completed',
          'quest_return_to_giver',
          // Advanced Mechanics
          'lockpicking_skill_required',
          'lockpicking_attempted',
          'fast_travel_discovered',
          'fast_travel_used',
          // Character Progression
          'level_up_occurred',
          'skill_points_available',
          'attribute_points_available',
          // Random Encounters
          'random_encounter_triggered',
          // Exploration
          'discovery_recorded',
          'exploration_journal_opened',
          // Planet Surface Completion
          'planet_surface_tutorial_complete'
        ]]
      }
    },
    completedStates: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: 'completed_states'
    },
    milestones: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    skipped: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at'
    }
  }, {
    tableName: 'tutorial_progress',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['character_id']
      },
      {
        fields: ['tutorial_id']
      },
      {
        fields: ['state']
      },
      {
        unique: true,
        fields: ['character_id', 'tutorial_id']
      }
    ]
  });

  return TutorialProgress;
};



