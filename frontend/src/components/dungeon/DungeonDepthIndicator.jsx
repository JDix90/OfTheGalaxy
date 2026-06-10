/**
 * Dungeon Depth Indicator
 * Displays current depth zone and enemy count per zone
 */

import React, { useMemo } from 'react';
import './DungeonDepthIndicator.css';

export default function DungeonDepthIndicator({ 
  currentDepthZone, 
  depthZones = [], 
  dungeonEnemies = [],
  layout = null 
}) {
  // Calculate enemy count per zone
  const enemyCountsByZone = useMemo(() => {
    // Use depthZones prop first, fallback to layout.depthZones
    const zonesToUse = depthZones.length > 0 ? depthZones : (layout?.depthZones || []);
    
    if (!layout || !layout.grid || zonesToUse.length === 0 || dungeonEnemies.length === 0) {
      return {};
    }

    const counts = {};
    
    // Initialize counts for all zones
    zonesToUse.forEach(zone => {
      counts[zone.depth] = 0;
    });

    // Count enemies in each zone
    dungeonEnemies.forEach(enemy => {
      if (enemy.defeated || enemy.inCombat) return; // Skip defeated/in-combat enemies
      
      const enemyX = enemy.position?.x;
      const enemyY = enemy.position?.y;
      
      if (enemyX === undefined || enemyY === undefined) return;

      // Calculate distance from entrance
      const entrance = layout.entrance || { x: 0, y: 0 };
      const distance = Math.abs(enemyX - entrance.x) + Math.abs(enemyY - entrance.y);

      // Find which zone this enemy is in
      for (const zone of zonesToUse) {
        if (distance >= zone.minDistance && distance <= zone.maxDistance) {
          counts[zone.depth] = (counts[zone.depth] || 0) + 1;
          break;
        }
      }
    });

    return counts;
  }, [dungeonEnemies, layout, depthZones]);

  if (!depthZones || depthZones.length === 0) {
    return null;
  }

  // Find current zone info
  const currentZone = depthZones.find(z => z.depth === currentDepthZone) || depthZones[0];
  const totalEnemies = dungeonEnemies.filter(e => !e.defeated && !e.inCombat).length;
  const currentZoneEnemies = enemyCountsByZone[currentDepthZone] || 0;

  return (
    <div className="dungeon-depth-indicator">
      <div className="depth-indicator-header">
        <h3>Dungeon Depth</h3>
        <span className="depth-zone-name">{currentZone.name}</span>
      </div>
      
      <div className="depth-progress">
        {depthZones.map((zone, index) => {
          const isActive = zone.depth === currentDepthZone;
          const isCompleted = zone.depth < currentDepthZone;
          const enemyCount = enemyCountsByZone[zone.depth] || 0;
          
          return (
            <div 
              key={zone.depth} 
              className={`depth-zone-marker ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              title={`${zone.name} Zone (${enemyCount} enemies)`}
            >
              <div className="zone-indicator">
                {isActive && <div className="active-pulse" />}
                <span className="zone-number">{zone.depth + 1}</span>
              </div>
              <div className="zone-label">{zone.name}</div>
              {enemyCount > 0 && (
                <div className="zone-enemy-count">{enemyCount}</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="depth-stats">
        <div className="stat-item">
          <span className="stat-label">Current Zone:</span>
          <span className="stat-value">{currentZone.name}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Enemies Remaining:</span>
          <span className="stat-value">{totalEnemies}</span>
        </div>
        {currentZoneEnemies > 0 && (
          <div className="stat-item">
            <span className="stat-label">In This Zone:</span>
            <span className="stat-value">{currentZoneEnemies}</span>
          </div>
        )}
      </div>
    </div>
  );
}

