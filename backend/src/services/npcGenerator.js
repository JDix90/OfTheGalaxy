/**
 * NPC Generator Service
 * Procedural generation of NPCs for planets and sub-maps
 */

const { NPC } = require('../models');
const templates = require('../data/npcTemplates');
const { getFactionForNPC } = require('../data/factionList');
const personalityService = require('./personalityService');
const factionService = require('./factionService');
const emotionalStateService = require('./emotionalStateService');
const memoryService = require('./memoryService');
const motivationService = require('./motivationService');
const trustService = require('./trustService');

class NPCGenerator {
  /**
   * Generate NPCs for a planet
   * @param {Object} planet - Planet model instance
   * @param {number|null} count - Optional NPC count override
   * @param {Object} options - Optional settings (force: boolean)
   */
  async generatePlanetNPCs(planet, count = null, options = {}) {
    const template = templates.getPlanetTemplate(planet);
    const seed = templates.getSeed(`${planet.id}_npcs`);
    const rnd = templates.seededRandom(seed);

    // Determine NPC count
    const npcCount = count || Math.floor(rnd() * (template.maxNPCs - template.minNPCs + 1)) + template.minNPCs;

    // Adjust based on population if available
    let adjustedCount = npcCount;
    if (planet.population) {
      const popFactor = Math.min(planet.population / 1000000, 1); // Cap at 1M population
      adjustedCount = Math.floor(npcCount * popFactor);
      adjustedCount = Math.max(template.minNPCs, Math.min(template.maxNPCs, adjustedCount));
    }

    const generatedNPCs = [];
    const existingNPCs = await NPC.findByLocation(planet.id, 'surface');

    // Don't regenerate if NPCs already exist (unless force flag is set)
    // This check is done in the seeder, but we keep it here for safety
    if (existingNPCs.length > 0 && !options?.force) {
      return existingNPCs;
    }

    // Get POIs for intelligent NPC placement
    const pois = planet.pointsOfInterest || [];
    const relevantPOITypes = ['city', 'spaceport', 'cantina', 'market', 'medical_center', 'trading_post', 'bazaar'];
    const relevantPOIs = pois.filter(poi => {
      const poiType = (poi.type || '').toLowerCase();
      return relevantPOITypes.some(type => poiType.includes(type) || poi.name?.toLowerCase().includes(type));
    });

    // Also include major cities from planet data
    const majorCities = planet.majorCities || [];
    const cityPOIs = majorCities.map(city => ({
      name: city,
      x: 50, // Default center if no coordinates
      y: 50,
      type: 'city'
    }));

    // Combine POIs and cities
    const allLocations = [...relevantPOIs, ...cityPOIs];

    // If no POIs found, create default locations based on planet
    let npcLocations = allLocations;
    if (npcLocations.length === 0) {
      // Create default locations: center, corners, and midpoints
      npcLocations = [
        { name: 'Center', x: 50, y: 50, type: 'settlement' },
        { name: 'North', x: 50, y: 20, type: 'settlement' },
        { name: 'South', x: 50, y: 80, type: 'settlement' },
        { name: 'East', x: 80, y: 50, type: 'settlement' },
        { name: 'West', x: 20, y: 50, type: 'settlement' }
      ];
    }

    for (let i = 0; i < adjustedCount; i++) {
      const npcSeed = templates.getSeed(`${planet.id}_npc_${i}`);
      const npcRnd = templates.seededRandom(npcSeed);

      // Select species
      const species = templates.weightedRandom(
        template.species,
        template.speciesWeights || template.species.map(() => 1 / template.species.length),
        npcRnd
      );

      // Select NPC type
      const npcType = templates.weightedRandom(
        template.npcTypes,
        template.npcTypeWeights || template.npcTypes.map(() => 1 / template.npcTypes.length),
        npcRnd
      );

      // Select occupation
      const occupation = template.occupations[Math.floor(npcRnd() * template.occupations.length)];

      // Place NPC near a relevant location (POI, city, etc.)
      const locationIndex = Math.floor(npcRnd() * npcLocations.length);
      const baseLocation = npcLocations[locationIndex];
      
      // Add variance around the location (5-15 units away)
      const variance = 5 + (npcRnd() * 10); // 5-15 unit radius
      const angle = npcRnd() * Math.PI * 2; // Random angle
      const offsetX = Math.cos(angle) * variance;
      const offsetY = Math.sin(angle) * variance;
      
      // Ensure coordinates stay within bounds (0-100)
      const npcX = Math.max(0, Math.min(100, (baseLocation.x || 50) + offsetX));
      const npcY = Math.max(0, Math.min(100, (baseLocation.y || 50) + offsetY));

      // Generate NPC
      const npc = await this.generateNPC({
        id: `${planet.id}_npc_${i}`,
        name: templates.generateName(species, npcSeed),
        species,
        occupation,
        npcType,
        location: {
          planet: planet.id,
          area: 'surface',
          x: Math.round(npcX),
          y: Math.round(npcY)
        },
        factionId: getFactionForNPC(planet, npcType, npcRnd),
        isCompanion: npcType === 'companion',
        dialogue: templates.generateDialogue(npcType, species, occupation, npcRnd),
        personalityTraits: templates.generatePersonalityTraits(npcType, npcRnd),
        biography: `A ${species} ${occupation} on ${planet.name}.`,
        seed: npcSeed,
        rnd: npcRnd
      });

      generatedNPCs.push(npc);
    }

    return generatedNPCs;
  }

  /**
   * Generate NPCs for a sub-map
   */
  async generateSubMapNPCs(subMap, planet, count = null) {
    // CRITICAL: Dungeons do not have regular NPCs - only enemy combatants
    if (subMap.type === 'dungeon') {
      return [];
    }
    
    const subMapType = subMap.subMapType || subMap.type || 'city_district';
    const template = templates.getSubMapTemplate(subMapType);
    const seed = templates.getSeed(`${subMap.id}_npcs`);
    const rnd = templates.seededRandom(seed);

    // Get spawn points from layout
    const layout = subMap.layoutData || subMap.layout || {};
    const spawnPoints = layout.npcSpawnPoints || [];

    // Get planet template for species distribution
    const planetTemplate = templates.getPlanetTemplate(planet);
    
    // For market submaps, ensure specific vendor types
    const isMarket = subMapType === 'market';
    
    // Check existing NPCs
    const existingNPCs = await NPC.findBySubMap(subMap.id);
    
    // For market submaps, always regenerate to ensure vendors are placed inside stalls
    // (This ensures the new placement logic is applied)
    if (isMarket && existingNPCs.length > 0) {
      // Count vendors in existing NPCs
      const vendorCount = existingNPCs.filter(npc => npc.npcType === 'vendor').length;
      console.log(`[NPC Generator] Market submap ${subMap.id}: Found ${existingNPCs.length} total NPCs, ${vendorCount} vendors`);
      
      // Check if vendors are positioned inside stalls by checking if any vendor is at a stall center
      const buildings = layout.buildings || [];
      const vendorStalls = buildings.filter(b => 
        b.type === 'vendor_stall' || 
        (b.name && (b.name.includes('Vendor Stall') || b.name.includes('Vendor Stand')))
      );
      let vendorsInStalls = 0;
      
      console.log(`[NPC Generator] Market submap ${subMap.id}: Found ${vendorStalls.length} vendor stalls in layout`);
      if (vendorStalls.length > 0) {
        console.log(`[NPC Generator] Sample stall:`, JSON.stringify(vendorStalls[0], null, 2));
      } else {
        console.log(`[NPC Generator] No vendor stalls found. Layout keys:`, Object.keys(layout));
        console.log(`[NPC Generator] Buildings array length:`, buildings.length);
        if (buildings.length > 0) {
          console.log(`[NPC Generator] Sample building:`, JSON.stringify(buildings[0], null, 2));
        }
      }
      
      if (vendorStalls.length > 0) {
        // Check if any vendor is positioned at a stall center (within 0.5 units)
        for (const npc of existingNPCs) {
          if (npc.npcType === 'vendor' && npc.location) {
            const npcX = npc.location.x || 0;
            const npcY = npc.location.y || 0;
            
            for (const stall of vendorStalls) {
              const stallCenterX = (stall.position?.x || 0) + ((stall.size?.width || 1) / 2);
              const stallCenterY = (stall.position?.y || 0) + ((stall.size?.height || 1) / 2);
              
              // Check if vendor is at stall center (within 0.5 units)
              if (Math.abs(npcX - stallCenterX) < 0.5 && Math.abs(npcY - stallCenterY) < 0.5) {
                vendorsInStalls++;
                break;
              }
            }
          }
        }
        console.log(`[NPC Generator] Market submap ${subMap.id}: ${vendorsInStalls} of ${vendorCount} vendors are positioned in stalls`);
      }
      
      // Always regenerate if vendors aren't properly positioned in stalls
      // This ensures all market vendors are placed inside stalls
      const shouldRegenerate = vendorCount < 7 || 
        vendorStalls.length === 0 || 
        (vendorStalls.length > 0 && vendorsInStalls < Math.min(vendorCount, Math.min(7, vendorStalls.length)));
      
      if (shouldRegenerate) {
        console.log(`[NPC Generator] Market submap ${subMap.id} has ${vendorCount} vendors (${vendorsInStalls} in stalls, ${vendorStalls.length} stalls available), regenerating to place vendors correctly...`);
        // Delete existing NPCs to force regeneration using Sequelize JSONB operators
        const Sequelize = require('sequelize');
        const deletedCount = await NPC.destroy({
          where: {
            [Sequelize.Op.and]: [
              Sequelize.where(
                Sequelize.fn('jsonb_extract_path_text', Sequelize.col('location'), 'subMapId'),
                subMap.id
              )
            ]
          }
        });
        console.log(`[NPC Generator] Deleted ${deletedCount} existing NPCs from market submap ${subMap.id}`);
        // Clear existingNPCs so generation continues
        existingNPCs.length = 0;
      } else {
        // We have enough vendors in stalls, return existing NPCs
        console.log(`[NPC Generator] Market submap ${subMap.id} has sufficient vendors in stalls (${vendorCount} vendors, ${vendorsInStalls} in stalls), keeping existing NPCs`);
        return existingNPCs;
      }
    } else if (existingNPCs.length > 0) {
      // For non-market submaps, don't regenerate if NPCs already exist
      return existingNPCs;
    }

    // Determine NPC count
    let npcCount = count;
    if (!npcCount) {
      if (spawnPoints.length > 0) {
        npcCount = Math.min(spawnPoints.length, template.maxNPCs);
      } else {
        npcCount = Math.floor(rnd() * (template.maxNPCs - template.minNPCs + 1)) + template.minNPCs;
      }
    }
    
    // For market submaps, ensure minimum of 7 NPCs (4 category vendors + 3 faction vendors)
    if (isMarket && npcCount < 7) {
      npcCount = 7;
    }

    const generatedNPCs = [];
    const requiredVendorCategories = ['medical', 'tech', 'communication', 'general'];
    const spawnedVendorCategories = new Set();
    const spawnedFactionVendors = [];
    const gameFactions = ['imperial_remnant', 'new_republic', 'smugglers_guild', 'jedi_seekers', 'corporate_sector'];
    
    // For medical facility submaps, ensure at least 1 vendor
    const isMedicalFacility = subMapType === 'medical_center' || subMapType === 'hospital';
    let vendorSpawned = false;
    let vendorSpawnPointIndex = -1;
    
    // Find vendor spawn point if it exists
    if (isMedicalFacility && spawnPoints.length > 0) {
      vendorSpawnPointIndex = spawnPoints.findIndex(sp => sp.requiredType === 'vendor');
    }

    // For market submaps, ensure we have enough spawn points for required vendors
    if (isMarket && spawnPoints.length < 7) {
      // Add more spawn points if needed (4 category vendors + 3 faction vendors = 7 minimum)
      const additionalPoints = 7 - spawnPoints.length;
      const mapWidth = layout.width || 10;
      const mapHeight = layout.height || 10;
      for (let j = 0; j < additionalPoints; j++) {
        spawnPoints.push({
          id: `market_spawn_${spawnPoints.length + j}`,
          position: {
            x: 2 + Math.floor(rnd() * (mapWidth - 4)),
            y: 2 + Math.floor(rnd() * (mapHeight - 4))
          },
          npcIds: [],
          spawnChance: 1.0
        });
      }
      // Update layout with new spawn points
      layout.npcSpawnPoints = spawnPoints;
    }

    // Track NPC index for market special handling
    let npcIndex = 0;

    for (let i = 0; i < npcCount; i++) {
      const npcSeed = templates.getSeed(`${subMap.id}_npc_${i}`);
      const npcRnd = templates.seededRandom(npcSeed);

      // Select NPC type based on sub-map template
      // For market submaps, ensure required vendor categories and faction vendors
      let npcType;
      let vendorCategory = null;
      let assignedFaction = null;
      
      if (isMarket) {
        // First 4 NPCs: One of each vendor category (medical, tech, communication, general)
        if (npcIndex < 4 && spawnedVendorCategories.size < 4) {
          npcType = 'vendor';
          // Find a category we haven't spawned yet
          const availableCategories = requiredVendorCategories.filter(cat => !spawnedVendorCategories.has(cat));
          if (availableCategories.length > 0) {
            vendorCategory = availableCategories[0];
            spawnedVendorCategories.add(vendorCategory);
          } else {
            // Fallback to random category if all spawned (shouldn't happen)
            vendorCategory = requiredVendorCategories[Math.floor(npcRnd() * requiredVendorCategories.length)];
          }
        }
        // Next 3 NPCs: Faction vendors
        else if (npcIndex >= 4 && npcIndex < 7 && spawnedFactionVendors.length < 3) {
          npcType = 'vendor';
          // Select a random faction that hasn't been used yet
          const availableFactions = gameFactions.filter(f => !spawnedFactionVendors.includes(f));
          if (availableFactions.length > 0) {
            assignedFaction = availableFactions[Math.floor(npcRnd() * availableFactions.length)];
            spawnedFactionVendors.push(assignedFaction);
          } else {
            // If all factions used, pick a random one
            assignedFaction = gameFactions[Math.floor(npcRnd() * gameFactions.length)];
            spawnedFactionVendors.push(assignedFaction);
          }
        }
        // Remaining NPCs: Use template distribution
        else {
          npcType = templates.weightedRandom(
            template.npcTypes,
            template.npcTypeWeights || template.npcTypes.map(() => 1 / template.npcTypes.length),
            npcRnd
          );
        }
        npcIndex++;
      }
      // For medical facilities, ensure first vendor spawn point gets a vendor
      else if (isMedicalFacility && !vendorSpawned && i === vendorSpawnPointIndex && vendorSpawnPointIndex >= 0) {
        npcType = 'vendor';
        vendorSpawned = true;
      } else if (isMedicalFacility && !vendorSpawned && i === 0 && vendorSpawnPointIndex < 0) {
        // If no vendor spawn point found, make first NPC a vendor
        npcType = 'vendor';
        vendorSpawned = true;
      } else {
        npcType = templates.weightedRandom(
          template.npcTypes,
          template.npcTypeWeights || template.npcTypes.map(() => 1 / template.npcTypes.length),
          npcRnd
        );
      }

      // Select spawn point or building position
      let spawnPoint = null;
      let position = { x: 0, y: 0 };
      
      // For market submaps, try to place vendors inside vendor stalls
      if (isMarket && npcType === 'vendor') {
        // Access buildings from layout - try both layout.buildings and direct access
        const buildings = layout.buildings || [];
        console.log(`[NPC Generator] Market vendor ${i}: Layout has ${buildings.length} buildings`);
        
        const vendorStalls = buildings.filter(b => 
          b.type === 'vendor_stall' || 
          (b.name && (b.name.includes('Vendor Stall') || b.name.includes('Vendor Stand')))
        );
        
        console.log(`[NPC Generator] Looking for vendor stalls: found ${vendorStalls.length} stalls out of ${buildings.length} buildings`);
        
        if (vendorStalls.length > 0) {
          // Assign vendor to a stall (multiple vendors can share a stall)
          // Distribute vendors across stalls, but allow multiple per stall
          // For first 4 category vendors, try to give each their own stall
          // For remaining vendors, distribute across all stalls
          let stallIndex;
          if (npcIndex < 4 && vendorStalls.length >= 4) {
            // First 4 category vendors get their own stalls
            stallIndex = npcIndex;
          } else {
            // Remaining vendors (faction vendors and extras) distribute across all stalls
            // This allows multiple vendors per stall
            stallIndex = (npcIndex - 4) % vendorStalls.length;
          }
          
          const stall = vendorStalls[stallIndex];
          
          // Place vendor inside the stall (center of the stall)
          // If multiple vendors in same stall, add slight offset for each vendor
          const stallX = stall.position?.x || 0;
          const stallY = stall.position?.y || 0;
          const stallWidth = stall.size?.width || 1;
          const stallHeight = stall.size?.height || 1;
          
          // Calculate how many vendors are already in this stall (for offset)
          const vendorsInThisStall = Math.floor(npcIndex / vendorStalls.length);
          const offsetX = (vendorsInThisStall % 2) * 0.2 - 0.1; // Slight horizontal offset
          const offsetY = Math.floor(vendorsInThisStall / 2) * 0.2 - 0.1; // Slight vertical offset
          
          position = {
            x: stallX + (stallWidth / 2) + offsetX,
            y: stallY + (stallHeight / 2) + offsetY
          };
          
          console.log(`[NPC Generator] Placing vendor ${i} (${npcType}, index ${npcIndex}) inside ${stall.name || stall.id} at (${position.x.toFixed(2)}, ${position.y.toFixed(2)}) - stall at (${stallX}, ${stallY}) size ${stallWidth}x${stallHeight}`);
        } else {
          console.log(`[NPC Generator] No vendor stalls found. Buildings:`, buildings.length, 'Layout keys:', Object.keys(layout));
          if (buildings.length > 0) {
            console.log(`[NPC Generator] First building:`, JSON.stringify(buildings[0], null, 2));
          }
          // Fallback to spawn points if no stalls found
          if (spawnPoints.length > 0) {
            const spawnIndex = i % spawnPoints.length;
            spawnPoint = spawnPoints[spawnIndex];
            position = spawnPoint.position || { x: 0, y: 0 };
          } else {
            const mapWidth = layout.width || 15;
            const mapHeight = layout.height || 15;
            position = {
              x: Math.floor(npcRnd() * mapWidth),
              y: Math.floor(npcRnd() * mapHeight)
            };
          }
        }
      } else if (spawnPoints.length > 0) {
        // For non-market vendors or non-vendors, use spawn points
        const spawnIndex = i % spawnPoints.length;
        spawnPoint = spawnPoints[spawnIndex];
        position = spawnPoint.position || { x: 0, y: 0 };
      } else {
        // Generate random position if no spawn points
        const mapWidth = layout.width || 15;
        const mapHeight = layout.height || 15;
        position = {
          x: Math.floor(npcRnd() * mapWidth),
          y: Math.floor(npcRnd() * mapHeight)
        };
      }

      // Select species (use planet template)
      const species = templates.weightedRandom(
        planetTemplate.species,
        planetTemplate.speciesWeights || planetTemplate.species.map(() => 1 / planetTemplate.species.length),
        npcRnd
      );

      // Select occupation based on sub-map type
      const occupation = this.getOccupationForSubMap(subMapType, npcType, npcRnd);

      // Determine faction for market vendors
      let finalFactionId = assignedFaction || getFactionForNPC(planet, npcType, npcRnd);
      
      // For market category vendors, they should be non-faction (general vendors)
      if (isMarket && vendorCategory && vendorCategory !== 'general') {
        finalFactionId = null; // Category vendors are non-faction
      }

      // Generate NPC
      const npc = await this.generateNPC({
        id: `${subMap.id}_npc_${i}`,
        name: templates.generateName(species, npcSeed),
        species,
        occupation,
        npcType,
        location: {
          planet: subMap.planetId,
          area: 'submap',
          subMapId: subMap.id,
          parentLocationId: subMap.parentLocationId || null,
          x: position.x,
          y: position.y
        },
        factionId: finalFactionId,
        isCompanion: npcType === 'companion',
        dialogue: templates.generateDialogue(npcType, species, occupation, npcRnd),
        personalityTraits: templates.generatePersonalityTraits(npcType, npcRnd),
        biography: `A ${species} ${occupation} in ${subMap.name || subMapType}.`,
        seed: npcSeed,
        subMapType: subMapType, // Pass submap type for vendor inventory generation
        vendorCategory: vendorCategory, // Pass vendor category for market vendors
        rnd: npcRnd
      });
      
      // Log market vendor generation
      if (isMarket && npcType === 'vendor') {
        if (vendorCategory) {
          console.log(`[NPC Generator] Generated ${vendorCategory} vendor: ${npc.name} (${npc.id})`);
        } else if (assignedFaction) {
          console.log(`[NPC Generator] Generated ${assignedFaction} faction vendor: ${npc.name} (${npc.id})`);
        }
      }

      generatedNPCs.push(npc);

      // Update spawn point with NPC ID if it exists
      if (spawnPoint) {
        if (!spawnPoint.npcIds) {
          spawnPoint.npcIds = [];
        }
        spawnPoint.npcIds.push(npc.id);
      }
    }

    return generatedNPCs;
  }

  /**
   * Get occupation for sub-map type
   */
  getOccupationForSubMap(subMapType, npcType, rnd) {
    const occupations = {
      city: {
        vendor: ['merchant', 'shopkeeper', 'trader'],
        quest_giver: ['official', 'guard_captain', 'citizen_leader'],
        generic: ['citizen', 'resident', 'worker']
      },
      spaceport: {
        vendor: ['vendor', 'trader', 'ship_parts_dealer'],
        quest_giver: ['port_official', 'smuggler', 'pilot'],
        generic: ['traveler', 'passenger', 'worker']
      },
      market: {
        vendor: ['merchant', 'trader', 'vendor', 'shopkeeper'],
        generic: ['customer', 'browser', 'trader']
      },
      cantina: {
        quest_giver: ['bartender', 'patron', 'informant'],
        companion: ['adventurer', 'mercenary', 'wanderer'],
        generic: ['patron', 'drinker', 'gambler']
      },
      palace: {
        faction_leader: ['ruler', 'governor', 'leader'],
        quest_giver: ['advisor', 'official', 'guard'],
        generic: ['servant', 'guard', 'courtier']
      },
      residential: {
        generic: ['resident', 'homeowner', 'tenant'],
        quest_giver: ['neighbor', 'community_leader']
      },
      commercial: {
        vendor: ['shopkeeper', 'merchant', 'trader'],
        generic: ['customer', 'shopper', 'worker']
      }
    };

    const subMapOccupations = occupations[subMapType] || occupations.city;
    const typeOccupations = subMapOccupations[npcType] || subMapOccupations.generic || ['citizen'];
    
    return typeOccupations[Math.floor(rnd() * typeOccupations.length)];
  }

  /**
   * Generate a single NPC
   */
  async generateNPC(template) {
    const npcData = {
      id: template.id,
      name: template.name,
      species: template.species,
      occupation: template.occupation,
      npcType: template.npcType,
      location: template.location,
      factionId: template.factionId,
      isCompanion: template.isCompanion || false,
      dialogue: template.dialogue || {
        greeting: {
          stranger: 'Hello.',
          acquaintance: 'Hello again.',
          friend: 'Good to see you!',
          confidant: 'Welcome, friend!'
        },
        questRelated: {},
        general: []
      },
      personalityTraits: template.personalityTraits || {
        empathy: 50,
        formality: 50,
        humor: 50,
        trust: 50
      },
      biography: template.biography || '',
      isAvailable: true,
      appearance: {},
      vendorInventory: template.npcType === 'vendor' ? this.generateVendorInventory(template, template.subMapType || 'generic') : null,
      companionAbilities: template.isCompanion ? this.generateCompanionAbilities(template) : null,
      companionStats: template.isCompanion ? this.generateCompanionStats(template) : null,
      quests: []
    };

    // Phase 1: Generate enhanced personality profile
    const rnd = template.rnd || (() => Math.random());
    npcData.personalityProfile = personalityService.generatePersonalityProfile(
      { npcType: npcData.npcType, occupation: npcData.occupation, factionId: npcData.factionId },
      rnd
    );

    // Phase 1: Apply faction personality modifiers
    if (npcData.factionId) {
      const factionModifiers = factionService.getPersonalityModifiers(npcData.factionId);
      Object.keys(factionModifiers).forEach(key => {
        if (npcData.personalityProfile[key] !== undefined) {
          npcData.personalityProfile[key] = personalityService.clamp(
            0,
            100,
            npcData.personalityProfile[key] + (factionModifiers[key] - 50) * 0.3
          );
        }
      });
    }

    // Phase 1: Initialize emotional state (with randomization)
    npcData.emotionalState = emotionalStateService.initializeEmotionalState({}, rnd);

    // Phase 1: Initialize memory
    npcData.memory = memoryService.initializeMemory({});

    // Phase 2: Generate motivations
    npcData.motivations = motivationService.generateMotivations(
      {
        species: npcData.species,
        occupation: npcData.occupation,
        factionId: npcData.factionId,
        location: npcData.location,
        npcType: npcData.npcType
      },
      rnd
    );

    // Phase 2: Initialize trust system with randomization
    // Use initializeTrust with random function for proper randomization
    npcData.trustSystem = trustService.initializeTrust({}, null, rnd);

    // Create or update NPC
    const [npc, created] = await NPC.findOrCreate({
      where: { id: npcData.id },
      defaults: npcData
    });

    if (!created) {
      // Update existing NPC, but preserve existing Phase 1 data if present
      if (!npc.personalityProfile) {
        npcData.personalityProfile = personalityService.generatePersonalityProfile(
          { npcType: npc.npcType, occupation: npc.occupation, factionId: npc.factionId },
          rnd
        );
      }
      if (!npc.emotionalState) {
        npcData.emotionalState = emotionalStateService.initializeEmotionalState({}, rnd);
      }
      if (!npc.memory) {
        npcData.memory = memoryService.initializeMemory({});
      }
      if (!npc.motivations || !npc.motivations.primaryGoal?.description) {
        npcData.motivations = motivationService.generateMotivations(
          {
            species: npc.species,
            occupation: npc.occupation,
            factionId: npc.factionId,
            location: npc.location,
            npcType: npc.npcType
          },
          rnd
        );
      }
      if (!npc.trustSystem) {
        // Initialize trust with proper randomization
        npcData.trustSystem = trustService.initializeTrust(npc, null, rnd);
      }
      await npc.update(npcData);
    }

    return npc;
  }

  /**
   * Generate vendor inventory
   * @param {Object} template - NPC template with factionId, subMapType, etc.
   * @param {string} subMapType - Optional submap type for context
   */
  generateVendorInventory(template, subMapType = 'generic') {
    const { getAllItemDefinitions, getItemDefinition } = require('../data/items');
    const items = getAllItemDefinitions();
    let itemList = Object.values(items);
    
    // Use seeded random from template if available, otherwise use Math.random
    const rnd = template.rnd || (() => Math.random());
    
    // Get NPC faction (from template or passed parameter)
    const npcFactionId = template.factionId || null;
    
    // Filter items based on vendor faction
    // Faction vendors primarily sell faction items, but also have some non-aligned items
    if (npcFactionId) {
      // 70% chance for faction items, 30% for non-aligned items
      const factionItems = itemList.filter(item => {
        // Include faction items
        if (item.factionId === npcFactionId) return true;
        // Include non-aligned items (no factionId)
        if (!item.factionId && rnd() < 0.3) return true;
        return false;
      });
      
      // If we have faction items, use them; otherwise fall back to all items
      if (factionItems.length > 0) {
        itemList = factionItems;
      }
    } else {
      // Non-faction vendors only sell non-aligned items
      itemList = itemList.filter(item => !item.factionId);
    }
    
    // Exclude quest items from vendor inventory (they should be quest rewards only)
    itemList = itemList.filter(item => item.type !== 'quest_item');
    
    // Check if this is a medical facility vendor
    const isMedicalFacility = subMapType === 'medical_center' || subMapType === 'hospital';
    
    // Determine vendor category based on submap type, NPC type, or explicit category
    let vendorCategory = template.vendorCategory || 'general';
    if (!template.vendorCategory) {
      if (isMedicalFacility) {
        vendorCategory = 'medical';
      } else if (subMapType === 'spaceport' || subMapType === 'market') {
        // Spaceports and markets can have various vendor types
        const categoryRoll = rnd();
        if (categoryRoll < 0.3) {
          vendorCategory = 'tech';
        } else if (categoryRoll < 0.5) {
          vendorCategory = 'communication';
        } else {
          vendorCategory = 'general';
        }
      }
    }
    
    // Filter items by vendor category
    const categoryFilters = {
      medical: (item) => {
        // Medical vendors: medpacs, medical tools, medical scanners
        return item.id.startsWith('medpac_') || 
               item.id.startsWith('medical_') || 
               item.id.startsWith('bacta_') ||
               item.id === 'stimpack_01' || item.id.startsWith('stimpack_');
      },
      tech: (item) => {
        // Tech vendors: datapads, scanners, slicing tools
        return item.id.startsWith('datapad_') || 
               item.id.startsWith('scanner') || 
               item.id.startsWith('slicer_');
      },
      communication: (item) => {
        // Communication vendors: comlinks
        return item.id.startsWith('comlink_');
      },
      general: (item) => {
        // General vendors: basic consumables, common tools, non-specialized items
        return item.type === 'consumable' || 
               item.id.startsWith('repair_toolkit') ||
               item.id.startsWith('stimpack_01') ||
               (item.type === 'accessory' && !item.id.startsWith('datapad_') && !item.id.startsWith('scanner') && !item.id.startsWith('comlink_'));
      }
    };
    
    const categoryFilter = categoryFilters[vendorCategory] || categoryFilters.general;
    itemList = itemList.filter(categoryFilter);
    
    // Generate 5-10 random items for vendor
    const itemCount = Math.floor(rnd() * 6) + 5; // 5-10 items
    const vendorItems = [];
    const usedItemIds = new Set();
    
    // Medical facility vendors always have unlimited medpacs
    if (isMedicalFacility) {
      vendorItems.push({
        itemId: 'medpac_01',
        quantity: -1 // -1 means unlimited stock
      });
      usedItemIds.add('medpac_01');
      
      // Also add medical tools with higher probability
      const medicalTools = itemList.filter(item => item.id.startsWith('medical_'));
      if (medicalTools.length > 0 && rnd() < 0.7) {
        const tool = medicalTools[Math.floor(rnd() * medicalTools.length)];
        vendorItems.push({
          itemId: tool.id,
          quantity: Math.floor(rnd() * 3) + 1 // 1-3 tools
        });
        usedItemIds.add(tool.id);
      }
    }
    
    // Tech vendors should have datapads and scanners
    if (vendorCategory === 'tech' && itemList.length > 0) {
      const techItems = itemList.filter(item => 
        item.id.startsWith('datapad_') || item.id.startsWith('scanner')
      );
      if (techItems.length > 0 && rnd() < 0.8) {
        const techItem = techItems[Math.floor(rnd() * techItems.length)];
        vendorItems.push({
          itemId: techItem.id,
          quantity: Math.floor(rnd() * 5) + 1 // 1-5 items
        });
        usedItemIds.add(techItem.id);
      }
    }
    
    // Communication vendors should have comlinks
    if (vendorCategory === 'communication' && itemList.length > 0) {
      const comlinks = itemList.filter(item => item.id.startsWith('comlink_'));
      if (comlinks.length > 0 && rnd() < 0.8) {
        const comlink = comlinks[Math.floor(rnd() * comlinks.length)];
        vendorItems.push({
          itemId: comlink.id,
          quantity: Math.floor(rnd() * 5) + 1 // 1-5 items
        });
        usedItemIds.add(comlink.id);
      }
    }
    
    for (let i = 0; i < itemCount; i++) {
      // Pick a random item from filtered list
      let item;
      let attempts = 0;
      do {
        if (itemList.length === 0) break; // No items available
        item = itemList[Math.floor(rnd() * itemList.length)];
        attempts++;
      } while (usedItemIds.has(item.id) && attempts < 50);
      
      if (item && !usedItemIds.has(item.id)) {
        usedItemIds.add(item.id);
        
        // Medical facility vendors can also have limited medpacs (in addition to unlimited)
        // Other vendors can have medpacs with limited stock
        let quantity;
        if (item.id === 'medpac_01') {
          // Non-medical vendors get limited medpacs (5-15)
          quantity = Math.floor(rnd() * 11) + 5; // 5-15 medpacs
        } else {
          // Quantity: 1-5 for most items, more for consumables/resources
          const maxQuantity = (item.type === 'consumable' || item.type === 'resource') ? 20 : 5;
          quantity = Math.floor(rnd() * maxQuantity) + 1;
        }
        
        vendorItems.push({
          itemId: item.id,
          quantity
        });
      }
    }
    
    return {
      items: vendorItems,
      currency: 'credits',
      buyRate: 0.8, // Buys at 80% of value
      sellRate: 1.2  // Sells at 120% of value
    };
  }

  /**
   * Generate companion abilities
   */
  generateCompanionAbilities(template) {
    return {
      combat: Math.floor(Math.random() * 50) + 30,
      stealth: Math.floor(Math.random() * 50) + 30,
      technical: Math.floor(Math.random() * 50) + 30,
      survival: Math.floor(Math.random() * 50) + 30
    };
  }

  /**
   * Generate companion stats
   */
  generateCompanionStats(template) {
    return {
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100
    };
  }
}

module.exports = new NPCGenerator();

