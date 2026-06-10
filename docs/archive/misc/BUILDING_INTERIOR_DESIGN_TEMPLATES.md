# Building Interior Design Templates
## Comprehensive Design Document for Planet-Specific Building Interiors

**Date:** January 2025  
**Status:** Design Document - Implementation Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [Building Type Categories](#building-type-categories)
4. [Planet-Specific Variations](#planet-specific-variations)
5. [Residential Building Templates](#residential-building-templates)
6. [Commercial Building Templates](#commercial-building-templates)
7. [Special Building Templates](#special-building-templates)
8. [NPC Occupant System](#npc-occupant-system)
9. [Furniture & Decoration System](#furniture--decoration-system)
10. [Implementation Guidelines](#implementation-guidelines)

---

## Overview

This document provides comprehensive design templates for building interior submaps across all planets in the Star Wars universe. Each template considers:

- **Planet-specific architecture** (species, climate, culture)
- **Building function** (residential, commercial, industrial, etc.)
- **Size variations** (small, medium, large)
- **Room layouts** (studio, multi-room, open-plan, etc.)
- **NPC occupants** (0-5 for residential, 2-6 for commercial)
- **Furniture and decoration** (culturally appropriate)
- **Interactive elements** (storage, crafting stations, vendors)

---

## Design Principles

### 1. **Lore Authenticity**
- All designs must align with canonical Star Wars lore
- Architecture reflects species-specific needs and cultural values
- Climate and environment influence building materials and layout

### 2. **Visual Variety**
- Multiple templates per building type prevent repetition
- Planet-specific color palettes and materials
- Unique furniture and decoration sets per species/culture

### 3. **Functional Gameplay**
- Clear navigation paths
- Logical room arrangements
- Interactive elements positioned for easy access
- NPCs placed in contextually appropriate locations

### 4. **Scalability**
- Templates support small (8x8) to large (16x16) interiors
- Modular room system allows flexible combinations
- Furniture scales appropriately with room size

### 5. **Performance**
- Efficient collision map generation
- Optimized rendering for multiple furniture items
- NPC spawn points pre-calculated

---

## Building Type Categories

### Primary Categories

1. **Residential** (`residential`)
   - Apartments, houses, homesteads
   - Occupants: 0-5 NPCs
   - Variants: Studio, 1-bedroom, 2-bedroom, family home

2. **Commercial** (`commercial`)
   - Shops, stores, markets
   - Occupants: 2-6 NPCs (vendor + customers)
   - Variants: General store, specialty shop, cantina, restaurant

3. **Industrial** (`industrial`)
   - Factories, workshops, warehouses
   - Occupants: 1-4 NPCs (workers)
   - Variants: Manufacturing, assembly, storage

4. **Government** (`government`)
   - Offices, administration buildings
   - Occupants: 2-8 NPCs (officials, guards)
   - Variants: Office building, courthouse, embassy

5. **Medical** (`medical_center`)
   - Hospitals, clinics, med bays
   - Occupants: 2-6 NPCs (doctors, patients)
   - Variants: Full hospital, clinic, field med bay

6. **Entertainment** (`entertainment`)
   - Cantinas, theaters, casinos
   - Occupants: 3-10 NPCs (patrons, staff)
   - Variants: Cantina, bar, theater, casino

7. **Religious** (`temple`)
   - Temples, shrines, monasteries
   - Occupants: 1-5 NPCs (priests, acolytes)
   - Variants: Jedi temple, local shrine, monastery

8. **Military** (`base`, `fortress`)
   - Bases, barracks, strongholds
   - Occupants: 3-12 NPCs (soldiers, officers)
   - Variants: Outpost, base, fortress

---

## Planet-Specific Variations

### Core Worlds

#### **Coruscant** (Urban, Human-dominated)
- **Architecture Style:** Ultra-modern, vertical, glass and durasteel
- **Color Palette:** Metallic grays, blues, neon accents
- **Materials:** Durasteel, transparisteel, plasteel
- **Furniture:** Sleek, minimalist, high-tech
- **Cultural Notes:** Dense population, vertical living, high-tech amenities
- **Special Features:** Holographic displays, automated systems, skyline views

#### **Corellia** (Terrestrial, Human-dominated, Shipbuilding)
- **Architecture Style:** Industrial-modern, functional, shipyard aesthetic
- **Color Palette:** Blues, grays, industrial oranges
- **Materials:** Durasteel, reinforced plasteel, industrial composites
- **Furniture:** Practical, durable, space-efficient
- **Cultural Notes:** Shipbuilding culture, practical mindset, blue-collar aesthetic
- **Special Features:** Ship models, technical diagrams, tool storage

#### **Alderaan** (Terrestrial, Human-dominated, Peaceful)
- **Architecture Style:** Elegant, classical, refined
- **Color Palette:** Soft whites, pastels, natural wood tones
- **Materials:** Natural stone, fine wood, elegant metals
- **Furniture:** Ornate, comfortable, artistic
- **Cultural Notes:** Peaceful, artistic, refined culture
- **Special Features:** Art displays, gardens, libraries

#### **Chandrila** (Terrestrial, Human-dominated, Agricultural)
- **Architecture Style:** Rustic-modern, farmhouse aesthetic
- **Color Palette:** Earth tones, greens, warm browns
- **Materials:** Natural wood, stone, agricultural composites
- **Furniture:** Comfortable, practical, homey
- **Cultural Notes:** Agricultural focus, community-oriented, sustainable
- **Special Features:** Agricultural tools, preserved foods, community spaces

### Mid Rim

#### **Naboo** (Terrestrial, Human/Gungan, Peaceful)
- **Architecture Style:** Elegant, classical, Naboo aesthetic
- **Color Palette:** Creams, golds, soft blues
- **Materials:** Natural stone, marble, fine wood
- **Furniture:** Elegant, ornate, regal
- **Cultural Notes:** Royal culture, artistic, peaceful
- **Special Features:** Art galleries, gardens, royal symbols

#### **Kashyyyk** (Jungle, Wookiee homeworld)
- **Architecture Style:** Tree-based, organic, integrated with nature
- **Color Palette:** Browns, greens, natural earth tones
- **Materials:** Wroshyr wood, natural fibers, organic materials
- **Furniture:** Handcrafted, organic shapes, large scale
- **Cultural Notes:** Tree-dwelling, honor-bound, family-oriented
- **Special Features:** Tree integration, rope bridges, natural lighting
- **Special Consideration:** Larger doorways and furniture for Wookiee size

#### **Ryloth** (Terrestrial, Twi'lek homeworld, Arid)
- **Architecture Style:** Cave-dwelling, underground, adapted to harsh climate
- **Color Palette:** Earth tones, oranges, deep purples
- **Materials:** Natural stone, reinforced rock, heat-resistant materials
- **Furniture:** Low-profile, heat-efficient, cultural artifacts
- **Cultural Notes:** Cave-dwelling, clan-based, resourceful
- **Special Features:** Underground chambers, ventilation systems, clan symbols

#### **Geonosis** (Desert, Geonosian homeworld)
- **Architecture Style:** Hive-like, organic, insectoid
- **Color Palette:** Oranges, reds, browns
- **Materials:** Geonosian rock, organic secretions, reinforced structures
- **Furniture:** Minimal, functional, adapted for Geonosian physiology
- **Cultural Notes:** Hive mind, industrial, insectoid architecture
- **Special Features:** Hive chambers, industrial equipment, vertical access

### Outer Rim

#### **Tatooine** (Desert, Multi-species, Hutt-controlled)
- **Architecture Style:** Rustic, weathered, adobe-like
- **Color Palette:** Tans, browns, desert oranges
- **Materials:** Sandstone, scrap metal, salvaged materials
- **Furniture:** Worn, salvaged, practical
- **Cultural Notes:** Frontier, lawless, resourceful
- **Special Features:** Moisture vaporators, scrap storage, hidden compartments

#### **Hoth** (Ice, Uninhabited, Rebel base)
- **Architecture Style:** Military, functional, insulated
- **Color Palette:** Whites, grays, blues
- **Materials:** Reinforced plasteel, insulation, heating systems
- **Furniture:** Military-grade, space-efficient, thermal
- **Cultural Notes:** Temporary base, survival-focused, military
- **Special Features:** Heating systems, emergency supplies, military equipment

#### **Bespin** (Gas Giant, Cloud City, Multi-species)
- **Architecture Style:** Floating, elegant, high-tech
- **Color Palette:** Whites, silvers, soft pastels
- **Materials:** Lightweight alloys, transparisteel, anti-gravity tech
- **Furniture:** Elegant, floating, luxurious
- **Cultural Notes:** Mining city, wealthy, multi-cultural
- **Special Features:** Cloud views, luxury amenities, mining equipment displays

#### **Mandalore** (Terrestrial, Mandalorian homeworld, Arid)
- **Architecture Style:** Fortress-like, defensive, practical
- **Color Palette:** Grays, dark blues, metallics
- **Materials:** Reinforced durasteel, defensive materials, weapons
- **Furniture:** Functional, weapon storage, armor displays
- **Cultural Notes:** Warrior culture, honor-bound, clan-based
- **Special Features:** Armories, training areas, clan banners

### Special Planets

#### **Mon Cala** (Ocean, Mon Calamari homeworld)
- **Architecture Style:** Underwater, organic, flowing
- **Color Palette:** Blues, greens, aquatic colors
- **Materials:** Transparisteel, water-resistant materials, organic shapes
- **Furniture:** Water-adapted, flowing designs, aquatic themes
- **Cultural Notes:** Underwater living, shipbuilding, artistic
- **Special Features:** Underwater views, airlocks, aquatic decorations

#### **Kamino** (Ocean, Kaminoan homeworld)
- **Architecture Style:** Ultra-modern, sterile, cloning facilities
- **Color Palette:** Whites, grays, clinical blues
- **Materials:** Advanced plasteel, sterile materials, high-tech
- **Furniture:** Minimal, functional, sterile
- **Cultural Notes:** Cloning focus, isolationist, scientific
- **Special Features:** Cloning equipment, data terminals, sterile environments

#### **Mustafar** (Volcanic, Mining, Dangerous)
- **Architecture Style:** Industrial, heat-resistant, fortified
- **Color Palette:** Blacks, reds, oranges
- **Materials:** Heat-resistant alloys, reinforced structures, cooling systems
- **Furniture:** Minimal, heat-resistant, functional
- **Cultural Notes:** Mining operations, dangerous environment, industrial
- **Special Features:** Cooling systems, mining equipment, lava views

---

## Residential Building Templates

### Template System

Each residential template includes:
- **Layout:** Room arrangement and dimensions
- **Furniture:** Specific furniture items and positions
- **NPC Spawn Points:** Where occupants can appear
- **Interactive Elements:** Storage, crafting stations, etc.
- **Planet Variations:** How the template adapts per planet

### Template 1: Studio Apartment (Small - 8x8 to 10x10)

**Description:** Single-room living space, common in urban areas

**Layout:**
```
┌─────────────────┐
│                 │
│   Living Area   │
│   (Bed/Table)   │
│                 │
│   Kitchenette   │
│   (Counter)     │
│                 │
│   Storage       │
│   (Exit)        │
└─────────────────┘
```

**Furniture:**
- Bed (2x1) - Position: (2, 2)
- Small table (1x1) - Position: (5, 3)
- Storage unit (1x1) - Position: (7, 2)
- Kitchen counter (2x1) - Position: (2, 6)
- Chair (1x1) - Position: (4, 3)

**NPC Spawn Points:** 0-2 NPCs
- Position: (4, 4) - Main living area
- Position: (6, 5) - Kitchen area

**Planet Variations:**
- **Coruscant:** Sleek, high-tech furniture, holographic displays
- **Tatooine:** Worn furniture, moisture vaporator visible
- **Kashyyyk:** Larger scale, organic wood furniture
- **Ryloth:** Low-profile, heat-efficient, underground aesthetic

### Template 2: One-Bedroom Apartment (Medium - 10x10 to 12x12)

**Description:** Separate bedroom and living area

**Layout:**
```
┌──────────┬──────┐
│ Bedroom  │      │
│ (Bed)    │      │
│          │      │
├──────────┤      │
│ Living   │      │
│ (Table)  │      │
│          │      │
│ Kitchen  │ Exit │
│ (Counter)│      │
└──────────┴──────┘
```

**Furniture:**
- Bed (2x1) - Position: (2, 2) - Bedroom
- Dresser (1x1) - Position: (4, 2) - Bedroom
- Table (2x1) - Position: (2, 6) - Living area
- Chairs (1x1) x2 - Position: (1, 6), (3, 6)
- Kitchen counter (3x1) - Position: (6, 8)
- Storage (1x1) - Position: (9, 2)

**NPC Spawn Points:** 1-3 NPCs
- Position: (2, 2) - Bedroom
- Position: (3, 6) - Living area
- Position: (7, 8) - Kitchen

**Planet Variations:**
- **Alderaan:** Elegant furniture, art displays, refined aesthetic
- **Naboo:** Classical design, ornate decorations, royal symbols
- **Corellia:** Practical, space-efficient, ship models
- **Mandalore:** Functional, weapon storage, armor displays

### Template 3: Two-Bedroom Home (Medium-Large - 12x12 to 14x14)

**Description:** Family home with multiple bedrooms

**Layout:**
```
┌──────┬──────────┬──────┐
│Bed 1 │ Living   │      │
│      │ (Table)  │      │
│      │          │      │
├──────┼──────────┤      │
│Bed 2 │ Kitchen  │ Exit │
│      │ (Counter)│      │
│      │          │      │
└──────┴──────────┴──────┘
```

**Furniture:**
- Bed (2x1) x2 - Position: (2, 2), (2, 7) - Bedrooms
- Dresser (1x1) x2 - Position: (4, 2), (4, 7)
- Large table (3x1) - Position: (6, 4) - Living area
- Chairs (1x1) x4 - Position: (5, 4), (7, 4), (6, 3), (6, 5)
- Kitchen counter (4x1) - Position: (6, 9)
- Storage (1x1) x2 - Position: (11, 2), (11, 7)

**NPC Spawn Points:** 2-5 NPCs
- Position: (2, 2) - Bedroom 1
- Position: (2, 7) - Bedroom 2
- Position: (7, 4) - Living area
- Position: (8, 9) - Kitchen
- Position: (10, 5) - Common area

**Planet Variations:**
- **Chandrila:** Farmhouse aesthetic, agricultural tools, community space
- **Kashyyyk:** Tree-integrated, larger scale, family-oriented
- **Ryloth:** Underground chambers, clan symbols, heat-efficient
- **Tatooine:** Rustic, weathered, moisture farming equipment

### Template 4: Family Homestead (Large - 14x14 to 16x16)

**Description:** Large family home with multiple rooms

**Layout:**
```
┌──────┬──────┬──────────┬──────┐
│Bed 1 │Bed 2 │ Living   │      │
│      │      │ (Table)  │      │
│      │      │          │      │
├──────┴──────┼──────────┤      │
│   Common   │ Kitchen  │ Exit │
│   Area     │ (Counter)│      │
│            │          │      │
│   Storage  │          │      │
└────────────┴──────────┴──────┘
```

**Furniture:**
- Bed (2x1) x3 - Position: (2, 2), (5, 2), (2, 7)
- Dresser (1x1) x3 - Position: (4, 2), (7, 2), (4, 7)
- Large table (4x2) - Position: (9, 4) - Living area
- Chairs (1x1) x6 - Around table
- Kitchen counter (5x1) - Position: (9, 10)
- Storage (1x1) x3 - Position: (2, 11), (5, 11), (13, 2)
- Additional furniture based on planet

**NPC Spawn Points:** 3-5 NPCs
- Position: (3, 2) - Bedroom 1
- Position: (6, 2) - Bedroom 2
- Position: (11, 5) - Living area
- Position: (11, 10) - Kitchen
- Position: (3, 9) - Common area

**Planet Variations:**
- **Naboo:** Elegant, multiple art displays, gardens
- **Alderaan:** Refined, library area, art gallery
- **Kashyyyk:** Tree-integrated, large common area, family gathering space
- **Chandrila:** Farmhouse, agricultural storage, community space

---

## Commercial Building Templates

### Template 1: General Store (Small-Medium - 10x10 to 12x12)

**Description:** General goods and supplies store

**Layout:**
```
┌──────────────────┐
│   Entrance       │
│                  │
│   Display Area   │
│   (Shelves)      │
│                  │
│   Counter        │
│   (Vendor)       │
│                  │
│   Storage        │
│   (Exit)         │
└──────────────────┘
```

**Furniture:**
- Counter (4x1) - Position: (2, 8) - Vendor position
- Shelves (1x3) x4 - Position: (5, 2), (7, 2), (9, 2), (11, 2)
- Display case (2x1) - Position: (5, 5)
- Storage (1x1) - Position: (2, 10)

**NPC Spawn Points:** 2-4 NPCs
- Position: (4, 8) - Vendor (always present)
- Position: (6, 3) - Customer browsing
- Position: (8, 5) - Customer at display
- Position: (10, 3) - Customer browsing

**Planet Variations:**
- **Coruscant:** High-tech displays, holographic product showcases
- **Tatooine:** Worn shelves, salvaged goods, black market items
- **Naboo:** Elegant displays, local crafts, refined aesthetic
- **Kashyyyk:** Handcrafted goods, organic materials, Wookiee crafts

### Template 2: Specialty Shop (Medium - 12x12 to 14x14)

**Description:** Specialized store (weapons, armor, tech, etc.)

**Layout:**
```
┌──────────┬──────────┐
│ Display  │          │
│ (Shelves)│          │
│          │          │
│          │ Counter  │
│          │ (Vendor) │
│          │          │
│ Storage  │ Exit     │
└──────────┴──────────┘
```

**Furniture:**
- Counter (3x1) - Position: (9, 6) - Vendor position
- Specialty displays (2x2) x3 - Position: (2, 2), (5, 2), (2, 6)
- Shelves (1x3) x2 - Position: (8, 2), (11, 2)
- Storage (1x1) - Position: (2, 10)

**NPC Spawn Points:** 2-5 NPCs
- Position: (10, 6) - Vendor (always present)
- Position: (3, 3) - Customer examining item
- Position: (6, 3) - Customer examining item
- Position: (3, 7) - Customer examining item
- Position: (9, 3) - Customer browsing

**Planet Variations:**
- **Mandalore:** Weapon/armor shop, training area, clan banners
- **Corellia:** Ship parts, technical equipment, blueprints
- **Coruscant:** High-tech gadgets, luxury items, holographic displays
- **Tatooine:** Salvaged tech, black market goods, worn equipment

### Template 3: Cantina/Tavern (Medium-Large - 12x12 to 16x16)

**Description:** Social gathering place, food and drinks

**Layout:**
```
┌──────────┬──────────┬──────┐
│   Bar    │ Seating  │      │
│ (Counter)│ (Tables)│      │
│          │          │      │
│          │          │      │
│ Storage  │ Stage    │ Exit │
│          │ (Optional)│     │
└──────────┴──────────┴──────┘
```

**Furniture:**
- Bar counter (6x1) - Position: (2, 2) - Bartender position
- Tables (2x1) x4-6 - Position: (9, 2), (12, 2), (9, 5), (12, 5), (9, 8), (12, 8)
- Chairs (1x1) x8-12 - Around tables
- Stage (3x2) - Position: (9, 11) - Optional, for entertainment
- Storage (1x1) - Position: (2, 10)

**NPC Spawn Points:** 3-8 NPCs
- Position: (4, 2) - Bartender (always present)
- Position: (10, 3) - Patron at table
- Position: (13, 3) - Patron at table
- Position: (10, 6) - Patron at table
- Position: (13, 6) - Patron at table
- Position: (10, 9) - Patron at table
- Position: (11, 12) - Entertainer (if stage present)
- Position: (6, 4) - Patron at bar

**Planet Variations:**
- **Tatooine:** Mos Eisley-style, worn, diverse clientele, shady atmosphere
- **Coruscant:** Upscale, elegant, high-tech, refined
- **Naboo:** Elegant, refined, artistic entertainment
- **Kashyyyk:** Large scale, organic materials, Wookiee-friendly
- **Ryloth:** Underground, clan gathering place, cultural music

### Template 4: Restaurant (Medium - 12x12 to 14x14)

**Description:** Dining establishment

**Layout:**
```
┌──────────┬──────────┐
│ Kitchen  │ Dining   │
│ (Counter)│ (Tables) │
│          │          │
│          │          │
│ Storage  │ Exit     │
└──────────┴──────────┘
```

**Furniture:**
- Kitchen counter (4x1) - Position: (2, 2)
- Tables (2x1) x6 - Position: (8, 2), (11, 2), (8, 5), (11, 5), (8, 8), (11, 8)
- Chairs (1x1) x12 - Around tables
- Serving station (2x1) - Position: (6, 2)
- Storage (1x1) - Position: (2, 10)

**NPC Spawn Points:** 3-6 NPCs
- Position: (4, 2) - Chef/Server (always present)
- Position: (9, 3) - Customer dining
- Position: (12, 3) - Customer dining
- Position: (9, 6) - Customer dining
- Position: (12, 6) - Customer dining
- Position: (9, 9) - Customer dining

**Planet Variations:**
- **Coruscant:** Upscale, fine dining, elegant presentation
- **Naboo:** Refined, local cuisine, artistic presentation
- **Tatooine:** Rustic, simple fare, diverse clientele
- **Kashyyyk:** Large portions, organic ingredients, Wookiee-friendly

### Template 5: Market Stall (Small - 8x8 to 10x10)

**Description:** Open-air market vendor stall

**Layout:**
```
┌──────────────┐
│   Display   │
│   (Shelves) │
│             │
│   Counter   │
│   (Vendor)  │
│             │
│   Exit      │
└──────────────┘
```

**Furniture:**
- Counter (3x1) - Position: (2, 6) - Vendor position
- Shelves (1x2) x3 - Position: (5, 2), (7, 2), (9, 2)
- Display table (2x1) - Position: (5, 4)

**NPC Spawn Points:** 1-3 NPCs
- Position: (3, 6) - Vendor (always present)
- Position: (6, 3) - Customer browsing
- Position: (6, 5) - Customer at counter

**Planet Variations:**
- **Tatooine:** Worn, salvaged goods, black market items
- **Naboo:** Elegant, local crafts, refined goods
- **Coruscant:** High-tech, luxury items, holographic displays
- **Kashyyyk:** Handcrafted, organic materials, Wookiee crafts

---

## Special Building Templates

### Template 1: Medical Center/Clinic (Medium-Large - 12x12 to 16x16)

**Description:** Healthcare facility

**Layout:**
```
┌──────────┬──────────┬──────┐
│ Waiting  │ Exam     │      │
│ (Chairs) │ (Beds)   │      │
│          │          │      │
│          │          │      │
│ Reception│ Storage  │ Exit │
│ (Counter)│          │      │
└──────────┴──────────┴──────┘
```

**Furniture:**
- Reception counter (4x1) - Position: (2, 2)
- Waiting chairs (1x1) x6 - Position: (2, 5), (3, 5), (4, 5), (2, 6), (3, 6), (4, 6)
- Medical beds (2x1) x3 - Position: (8, 2), (11, 2), (8, 5)
- Medical equipment (1x1) x2 - Position: (9, 2), (12, 2)
- Storage (1x1) - Position: (8, 10)

**NPC Spawn Points:** 2-6 NPCs
- Position: (4, 2) - Receptionist/Doctor (always present)
- Position: (3, 5) - Patient waiting
- Position: (4, 5) - Patient waiting
- Position: (9, 3) - Patient in exam room
- Position: (12, 3) - Patient in exam room
- Position: (9, 6) - Medical staff

**Planet Variations:**
- **Coruscant:** State-of-the-art, high-tech equipment, advanced facilities
- **Tatooine:** Basic, worn equipment, field medicine
- **Naboo:** Elegant, refined, quality care
- **Kashyyyk:** Large scale, adapted for Wookiee physiology

### Template 2: Government Office (Medium-Large - 12x12 to 16x16)

**Description:** Administrative building

**Layout:**
```
┌──────────┬──────────┬──────┐
│ Reception│ Offices  │      │
│ (Counter)│ (Desks)  │      │
│          │          │      │
│          │          │      │
│ Archives │ Storage  │ Exit │
│ (Shelves)│          │      │
└──────────┴──────────┴──────┘
```

**Furniture:**
- Reception counter (4x1) - Position: (2, 2)
- Desks (2x1) x4 - Position: (8, 2), (11, 2), (8, 5), (11, 5)
- Chairs (1x1) x4 - At desks
- Filing shelves (1x3) x2 - Position: (2, 8), (5, 8)
- Storage (1x1) - Position: (8, 10)

**NPC Spawn Points:** 2-8 NPCs
- Position: (4, 2) - Receptionist (always present)
- Position: (9, 3) - Official at desk
- Position: (12, 3) - Official at desk
- Position: (9, 6) - Official at desk
- Position: (12, 6) - Official at desk
- Position: (3, 9) - Clerk in archives
- Position: (6, 9) - Clerk in archives
- Position: (11, 4) - Guard

**Planet Variations:**
- **Coruscant:** High-tech, efficient, bureaucratic
- **Naboo:** Elegant, refined, royal administration
- **Alderaan:** Peaceful, organized, diplomatic
- **Mandalore:** Functional, military administration, defensive

### Template 3: Workshop/Factory (Medium-Large - 12x12 to 16x16)

**Description:** Industrial workspace

**Layout:**
```
┌──────────┬──────────┬──────┐
│ Workbench│ Assembly │      │
│ (Tools)  │ (Machines)│     │
│          │          │      │
│          │          │      │
│ Storage  │ Materials│ Exit │
│ (Shelves)│ (Piles)  │      │
└──────────┴──────────┴──────┘
```

**Furniture:**
- Workbench (3x1) x2 - Position: (2, 2), (2, 6)
- Tools (1x1) x4 - On/near workbenches
- Assembly machines (2x2) x2 - Position: (8, 2), (11, 2)
- Material storage (1x2) x3 - Position: (8, 8), (10, 8), (12, 8)
- Storage shelves (1x3) - Position: (2, 10)

**NPC Spawn Points:** 1-4 NPCs
- Position: (3, 2) - Worker at workbench
- Position: (3, 6) - Worker at workbench
- Position: (9, 3) - Worker at assembly
- Position: (9, 9) - Worker managing materials

**Planet Variations:**
- **Corellia:** Shipbuilding equipment, blueprints, ship parts
- **Kuat:** Large-scale manufacturing, shipyard equipment
- **Mustafar:** Mining equipment, heat-resistant tools, industrial
- **Tatooine:** Salvage operations, worn tools, scrap materials

---

## NPC Occupant System

### Residential NPCs (0-5 occupants)

**Spawn Logic:**
- **0 occupants:** Abandoned/empty building (10% chance)
- **1 occupant:** Single resident (30% chance)
- **2 occupants:** Couple/roommates (40% chance)
- **3-5 occupants:** Family/group (20% chance)

**NPC Types:**
- **Residents:** Generic NPCs with residential dialogue
- **Families:** Parent-child relationships
- **Roommates:** Multiple unrelated residents
- **Guests:** Temporary visitors (rare)

**Behavior:**
- Idle animations in appropriate rooms
- Contextual dialogue based on room location
- May have quests or information
- Can be vendors (rare, for home businesses)

### Commercial NPCs (2-6 occupants)

**Spawn Logic:**
- **Vendor:** Always present (1 NPC)
- **Customers:** 1-5 additional NPCs (random)

**NPC Types:**
- **Vendor:** Shop owner, always at counter
- **Customers:** Browsing, examining items, at counter
- **Staff:** Additional employees (larger shops)

**Behavior:**
- Vendor: Stationary at counter, offers shop interface
- Customers: Wander, examine items, may have dialogue
- Staff: Assist customers, restock shelves

### Special Building NPCs

**Medical Centers:**
- Doctor/Receptionist (always present)
- Patients (1-4, in waiting room or exam rooms)
- Medical staff (1-2, in exam rooms)

**Government Offices:**
- Receptionist (always present)
- Officials (2-6, at desks)
- Guards (0-2, near entrance)
- Clerks (1-2, in archives)

**Workshops:**
- Workers (1-4, at workbenches or machines)
- Supervisor (0-1, overseeing operations)

---

## Furniture & Decoration System

### Furniture Categories

1. **Seating**
   - Chairs (1x1)
   - Benches (2x1)
   - Sofas (3x1)
   - Stools (1x1)

2. **Tables**
   - Small table (1x1)
   - Medium table (2x1)
   - Large table (3x1 or 4x2)
   - Counter (variable length)

3. **Storage**
   - Storage unit (1x1)
   - Dresser (1x1)
   - Shelves (1x2, 1x3)
   - Filing cabinet (1x1)

4. **Beds**
   - Single bed (2x1)
   - Double bed (2x1, larger)
   - Bunk bed (2x2)

5. **Work Surfaces**
   - Workbench (3x1)
   - Desk (2x1)
   - Kitchen counter (variable)

6. **Decorative**
   - Art displays (1x1)
   - Plants (1x1)
   - Statues (1x1)
   - Holographic displays (1x1)

### Planet-Specific Furniture Sets

#### **Coruscant Set**
- Sleek, minimalist designs
- Holographic displays
- Automated systems
- High-tech materials
- Neon accents

#### **Tatooine Set**
- Worn, weathered furniture
- Salvaged materials
- Practical, functional
- Desert-adapted
- Rustic aesthetic

#### **Kashyyyk Set**
- Large-scale furniture
- Organic wood materials
- Handcrafted appearance
- Natural colors
- Wookiee-sized

#### **Naboo Set**
- Elegant, ornate designs
- Fine materials
- Artistic decorations
- Refined aesthetic
- Royal symbols

#### **Ryloth Set**
- Low-profile furniture
- Heat-efficient designs
- Underground aesthetic
- Clan symbols
- Earth tones

#### **Naboo Set**
- Classical elegance
- Fine craftsmanship
- Artistic elements
- Refined materials
- Peaceful aesthetic

---

## Implementation Guidelines

### 1. Template Selection

**Algorithm:**
```javascript
function selectTemplate(buildingType, planet, size) {
  // Get planet-specific template pool
  const templates = getTemplatesForPlanet(buildingType, planet);
  
  // Filter by size
  const sizeFiltered = templates.filter(t => 
    t.minSize <= size && size <= t.maxSize
  );
  
  // Random selection with weighted probability
  return weightedRandom(sizeFiltered);
}
```

### 2. Furniture Placement

**Algorithm:**
```javascript
function placeFurniture(template, planet) {
  const furniture = [];
  const planetSet = getFurnitureSet(planet);
  
  for (const item of template.furniture) {
    const furnitureDef = planetSet[item.type];
    furniture.push({
      type: item.type,
      variant: selectVariant(furnitureDef, planet),
      position: item.position,
      size: item.size,
      rotation: item.rotation || 0
    });
  }
  
  return furniture;
}
```

### 3. NPC Spawning

**Algorithm:**
```javascript
function spawnNPCs(template, buildingType, planet) {
  const npcs = [];
  const spawnPoints = template.npcSpawnPoints;
  const occupantCount = getOccupantCount(buildingType, planet);
  
  // Shuffle spawn points
  const shuffled = shuffleArray(spawnPoints);
  
  for (let i = 0; i < Math.min(occupantCount, shuffled.length); i++) {
    const spawnPoint = shuffled[i];
    const npc = generateNPC(buildingType, planet, spawnPoint);
    npcs.push(npc);
  }
  
  return npcs;
}

function getOccupantCount(buildingType, planet) {
  if (buildingType === 'residential') {
    // 0-5 occupants
    return Math.floor(Math.random() * 6);
  } else if (buildingType === 'commercial') {
    // 2-6 occupants (vendor + customers)
    return 2 + Math.floor(Math.random() * 5);
  } else {
    // Special buildings: variable
    return getSpecialOccupantCount(buildingType);
  }
}
```

### 4. Collision Map Generation

**Algorithm:**
```javascript
function generateInteriorCollisionMap(layout, furniture) {
  const collisionMap = {
    resolution: 100,
    cells: []
  };
  
  // Initialize all cells as walkable
  for (let y = 0; y < 100; y++) {
    collisionMap.cells[y] = [];
    for (let x = 0; x < 100; x++) {
      collisionMap.cells[y][x] = COLLISION_TYPES.WALKABLE;
    }
  }
  
  // Mark walls (perimeter)
  markWalls(collisionMap, layout);
  
  // Mark furniture as obstacles
  for (const item of furniture) {
    markFurniture(collisionMap, item);
  }
  
  // Mark doors
  markDoors(collisionMap, layout.entryPoints);
  
  return collisionMap;
}
```

### 5. Planet-Specific Variations

**Implementation:**
```javascript
const PLANET_VARIATIONS = {
  coruscant: {
    materials: ['durasteel', 'transparisteel', 'plasteel'],
    colors: ['#2C3E50', '#34495E', '#3498DB', '#9B59B6'],
    furnitureStyle: 'modern',
    specialFeatures: ['holographic_displays', 'automated_systems']
  },
  tatooine: {
    materials: ['sandstone', 'scrap_metal', 'salvaged_materials'],
    colors: ['#D4A574', '#8B7355', '#CD853F', '#A0522D'],
    furnitureStyle: 'rustic',
    specialFeatures: ['moisture_vaporators', 'hidden_compartments']
  },
  // ... more planets
};

function applyPlanetVariation(template, planet) {
  const variation = PLANET_VARIATIONS[planet.id];
  
  // Apply material variations
  template.materials = variation.materials;
  
  // Apply color palette
  template.colorPalette = variation.colors;
  
  // Apply furniture style
  template.furnitureStyle = variation.furnitureStyle;
  
  // Add special features
  if (variation.specialFeatures) {
    template.specialFeatures = variation.specialFeatures;
  }
  
  return template;
}
```

---

## Template Data Structure

### Complete Template Format:

```javascript
{
  id: 'residential_studio_coruscant',
  name: 'Studio Apartment',
  buildingType: 'residential',
  planetId: 'coruscant',
  size: {
    min: { width: 8, height: 8 },
    max: { width: 10, height: 10 },
    default: { width: 9, height: 9 }
  },
  layout: {
    rooms: [
      {
        id: 'main',
        name: 'Living Area',
        bounds: { x: 0, y: 0, width: 9, height: 9 },
        type: 'living'
      }
    ],
    entryPoints: [
      {
        id: 'exit',
        position: { x: 4.5, y: 8 },
        type: 'exit'
      }
    ]
  },
  furniture: [
    {
      type: 'bed',
      variant: 'modern_single',
      position: { x: 2, y: 2 },
      size: { width: 2, height: 1 },
      rotation: 0
    },
    // ... more furniture
  ],
  npcSpawnPoints: [
    { position: { x: 4, y: 4 }, type: 'resident', weight: 0.7 },
    { position: { x: 6, y: 5 }, type: 'resident', weight: 0.3 }
  ],
  interactiveElements: [
    {
      type: 'storage',
      position: { x: 7, y: 2 },
      size: { width: 1, height: 1 }
    }
  ],
  decorations: [
    {
      type: 'holographic_display',
      position: { x: 5, y: 1 },
      size: { width: 1, height: 1 }
    }
  ],
  collisionMap: {
    // Pre-calculated or generated
  }
}
```

---

## Next Steps

1. **Create Template Database**
   - Implement template storage system
   - Create template JSON files per planet/building type
   - Build template selection algorithm

2. **Implement Furniture System**
   - Create furniture definition files
   - Build furniture placement algorithm
   - Implement planet-specific furniture sets

3. **Implement NPC Spawning**
   - Create NPC spawn point system
   - Implement occupant count logic
   - Build NPC generation for interiors

4. **Enhance Rendering**
   - Update `subMapRenderer.js` for furniture
   - Add planet-specific visual styles
   - Implement decoration rendering

5. **Testing & Refinement**
   - Test template variety
   - Verify collision detection
   - Balance NPC spawn rates
   - Refine planet-specific aesthetics

---

## Conclusion

This document provides a comprehensive foundation for building interior design across all planets in the Star Wars universe. The template system ensures variety, lore authenticity, and functional gameplay while maintaining performance and scalability.

Each planet's unique characteristics are reflected in architecture, materials, furniture, and decoration, creating an immersive experience that feels true to the Star Wars universe.

**Implementation Priority:**
1. Core residential templates (3-4 variants)
2. Core commercial templates (3-4 variants)
3. Planet-specific variations (top 10 planets)
4. Special building types
5. Full planet coverage

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Author:** AI Assistant  
**Status:** Ready for Implementation

