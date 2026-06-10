# Attribute, Skill, and Ability System Interactions
## Comprehensive Visual Guide

**Date:** December 2024  
**Version:** 2.0  
**Purpose:** Detailed documentation of how attributes, skills, and abilities interact within the character progression system

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Core Components](#2-core-components)
3. [Interaction Flows](#3-interaction-flows)
4. [Visual Dependency Diagrams](#4-visual-dependency-diagrams)
5. [Progression Paths](#5-progression-paths)
6. [Synergy Examples](#6-synergy-examples)
7. [Implementation Details](#7-implementation-details)

---

## 1. System Overview

### 1.1 The Three Pillars

```
┌─────────────────────────────────────────────────────────────┐
│                    CHARACTER PROGRESSION                     │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │  ATTRIBUTES  │    │    SKILLS    │    │   ABILITIES  │ │
│  │              │    │              │    │              │ │
│  │ • Strength   │    │ • Combat     │    │ • Active     │ │
│  │ • Agility     │◄───┤ • Stealth    │◄───┤ • Passive    │ │
│  │ • Intelligence│    │ • Diplomacy  │    │ • Unlocked   │ │
│  │ • Charisma    │    │ • Technical  │    │   by Skills  │ │
│  │ • Perception  │    │ • Survival   │    │              │ │
│  │ • Endurance   │    │              │    │              │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│         │                    │                    │         │
│         └────────────────────┴────────────────────┘         │
│                            │                                  │
│                    ┌───────▼───────┐                          │
│                    │  CHARACTER    │                          │
│                    │    LEVEL      │                          │
│                    └───────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Key Relationships

```
ATTRIBUTES ──► Gate Skill Prerequisites
    │
    ├──► Modify Skill Effectiveness (Future)
    │
    └──► Scale Ability Power (Current)

SKILLS ──► Unlock Abilities
    │
    ├──► Provide Passive Bonuses
    │
    └──► Require Attribute Prerequisites

ABILITIES ──► Unlocked by Skills
    │
    ├──► Scale with Attributes
    │
    └──► Enhanced by Skill Levels
```

---

## 2. Core Components

### 2.1 Attributes (6 Core Stats)

```
┌─────────────────────────────────────────────────────────────┐
│                         ATTRIBUTES                            │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  STRENGTH   │  │   AGILITY   │  │INTELLIGENCE │          │
│  │             │  │             │  │             │          │
│  │ • Melee Dmg │  │ • Ranged Acc│  │ • Crafting  │          │
│  │ • Carry Wt  │  │ • Dodge     │  │ • Hacking   │          │
│  │ • Physical  │  │ • Movement │  │ • Tech      │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  CHARISMA   │  │ PERCEPTION  │  │  ENDURANCE   │          │
│  │             │  │             │  │             │          │
│  │ • Dialogue  │  │ • Crit Hit │  │ • Max Health│          │
│  │ • Vendors   │  │ • Detection │  │ • Stamina   │          │
│  │ • Factions  │  │ • Awareness │  │ • Resilience│          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                               │
│  Range: 1-100 (Soft Cap: 50, Hard Cap: 100)                  │
│  Allocation: +2 every 3 levels + milestone bonuses          │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Skills (5 Trees)

```
┌─────────────────────────────────────────────────────────────┐
│                          SKILL TREES                          │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  COMBAT  │  │  STEALTH │  │DIPLOMACY │  │TECHNICAL │    │
│  │          │  │          │  │          │  │          │    │
│  │ • Basic  │  │ • Basic  │  │ • Persu.│  │ • Basic  │    │
│  │ • Adv.   │  │ • Lock   │  │ • Intim.│  │ • Hack   │    │
│  │ • Tact.  │  │ • Shadow │  │ • Lead  │  │ • Eng.   │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                               │
│                    ┌──────────┐                              │
│                    │ SURVIVAL │                              │
│                    │          │                              │
│                    │ • Basic  │                              │
│                    │ • Scav.  │                              │
│                    │ • Medic   │                              │
│                    └──────────┘                              │
│                                                               │
│  Levels: 1-5 (Normal), 6-10 (Mastery)                        │
│  Points: +1 per level, Specialization: +1 every 5 levels     │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Abilities

```
┌─────────────────────────────────────────────────────────────┐
│                          ABILITIES                            │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              UNLOCK SOURCES                          │   │
│  │                                                       │   │
│  │  1. Skills ──► Active Abilities                     │   │
│  │     • Pick Lock (from Lockpicking)                  │   │
│  │     • Hack Terminal (from Hacking)                 │   │
│  │     • Field Heal (from Field Medic)                │   │
│  │                                                       │   │
│  │  2. Items ──► Permanent Abilities                   │   │
│  │     • Equip item with permanentAbility stat         │   │
│  │     • Auto-unlocked on equip                        │   │
│  │                                                       │   │
│  │  3. Level ──► Milestone Abilities (Future)           │   │
│  │     • Unlocked at specific levels                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  Types: Active, Passive, Utility                             │
│  Scaling: Attributes, Skill Levels                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Interaction Flows

### 3.1 Attribute → Skill Flow

```
┌─────────────────────────────────────────────────────────────┐
│              ATTRIBUTE TO SKILL INTERACTION                  │
│                                                               │
│  STEP 1: Check Prerequisites                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Skill: Tactical Awareness                           │   │
│  │  Requires: Level 8, Perception 15                   │   │
│  │                                                       │   │
│  │  Character Level: 8 ✓                                │   │
│  │  Perception: 12 ✗ (Need 15)                          │   │
│  │                                                       │   │
│  │  Result: LOCKED - "Requires Perception 15"         │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  STEP 2: Allocate Attribute Points                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Player allocates 3 points to Perception             │   │
│  │  Perception: 12 → 15                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  STEP 3: Skill Becomes Available                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Skill: Tactical Awareness                           │   │
│  │  Status: AVAILABLE ✓                                  │   │
│  │  Can unlock with 1 Skill Point                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Skill → Ability Flow

```
┌─────────────────────────────────────────────────────────────┐
│               SKILL TO ABILITY INTERACTION                   │
│                                                               │
│  STEP 1: Unlock Skill                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Skill: Lockpicking                                  │   │
│  │  Prerequisites: Level 3, Basic Stealth Level 2     │   │
│  │                                                       │   │
│  │  Player allocates 1 Skill Point                     │   │
│  │  Lockpicking: 0 → 1                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  STEP 2: Ability Auto-Unlocks                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Ability: Pick Lock                                  │   │
│  │  Source: Lockpicking Skill                           │   │
│  │  Status: UNLOCKED ✓                                  │   │
│  │                                                       │   │
│  │  Available in:                                        │   │
│  │  • Interaction menu (locked doors)                   │   │
│  │  • Inventory (locked containers)                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  STEP 3: Ability Scales with Skill Level                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Lockpicking Level 1: Pick Lock Success: 60%         │   │
│  │  Lockpicking Level 3: Pick Lock Success: 80%         │   │
│  │  Lockpicking Level 5: Pick Lock Success: 95%         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Attribute → Ability Flow

```
┌─────────────────────────────────────────────────────────────┐
│              ATTRIBUTE TO ABILITY INTERACTION                │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Ability: Field Heal                                 │   │
│  │  Source: Field Medic Skill                           │   │
│  │  Scaling Attribute: Intelligence                     │   │
│  │                                                       │   │
│  │  Base Healing: 50 HP                                 │   │
│  │  Intelligence: 14                                    │   │
│  │  Bonus: +4 HP per point above 10 = +16 HP            │   │
│  │                                                       │   │
│  │  Total Healing: 66 HP                                │   │
│  │                                                       │   │
│  │  If Intelligence: 20                                  │   │
│  │  Bonus: +10 HP per point above 10 = +40 HP           │   │
│  │  Total Healing: 90 HP                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Ability: Critical Hit (Passive)                     │   │
│  │  Source: Perception Attribute                        │   │
│  │                                                       │   │
│  │  Base Crit Chance: 5%                                │   │
│  │  Perception: 12                                      │   │
│  │  Bonus: +1% per point above 10 = +2%                 │   │
│  │                                                       │   │
│  │  Total Crit Chance: 7%                               │   │
│  │                                                       │   │
│  │  If Perception: 20                                   │   │
│  │  Bonus: +10%                                         │   │
│  │  Total Crit Chance: 15% (capped at 50%)              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Visual Dependency Diagrams

### 4.1 Combat Skill Tree Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                    COMBAT SKILL TREE                         │
│                                                               │
│  Level 1+ (No Prerequisites)                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [Basic Combat]                                       │   │
│  │  • Max Level: 5                                       │   │
│  │  • Passives: +2% damage per level                    │   │
│  │  • No prerequisites                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  Level 5+ (Requires: Basic Combat Level 3)                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [Advanced Weapons]                                   │   │
│  │  • Max Level: 5                                       │   │
│  │  • Passives: +1% crit chance per level               │   │
│  │  • Prerequisites:                                     │   │
│  │    - Level: 5                                        │   │
│  │    - Basic Combat: 3                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  Level 8+ (Requires: Perception 15)                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [Tactical Awareness]                                 │   │
│  │  • Max Level: 3                                      │   │
│  │  • Passives: +3% defense per level                   │   │
│  │  • Prerequisites:                                     │   │
│  │    - Level: 8                                        │   │
│  │    - Perception: 15                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  Visual Flow:                                                │
│                                                               │
│  [Basic Combat] ──► [Advanced Weapons]                       │
│       │                                                       │
│       └──► (Perception 15) ──► [Tactical Awareness]          │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Stealth Skill Tree Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                    STEALTH SKILL TREE                         │
│                                                               │
│  Level 1+ (No Prerequisites)                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [Basic Stealth]                                     │   │
│  │  • Max Level: 5                                      │   │
│  │  • Passives: +5 stealth per level                    │   │
│  └─────────────────────────────────────────────────────┘   │
│         │                                                     │
│         ├─────────────────┐                                 │
│         │                 │                                 │
│         ▼                 ▼                                 │
│  Level 3+          Level 10+                                 │
│  ┌──────────┐     ┌───────────────────────────────────┐    │
│  │[Lockpick]│     │ [Shadow Operative]                │    │
│  │          │     │                                    │    │
│  │ • Level 5│     │ • Max Level: 3                    │    │
│  │ • Ability:     │ • Passives:                       │    │
│  │   Pick Lock    │   - +10 stealth per level         │    │
│  │                │   - +2% crit chance per level     │    │
│  │ Prerequisites: │                                    │    │
│  │ - Level: 3     │ Prerequisites:                    │    │
│  │ - Basic         │ - Level: 10                       │    │
│  │   Stealth: 2    │ - Basic Stealth: 5               │    │
│  └──────────┘     │ - Lockpicking: 3                  │    │
│                   │ - Agility: 18                      │    │
│                   └───────────────────────────────────┘    │
│                                                              │
│  Visual Flow:                                               │
│                                                              │
│  [Basic Stealth] ──► [Lockpicking]                          │
│       │                                                     │
│       └──► (Level 10, Agility 18) ──► [Shadow Operative]  │
│              └──► (Lockpicking 3) ──►                      │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Technical Skill Tree Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                   TECHNICAL SKILL TREE                        │
│                                                               │
│  Level 1+ (No Prerequisites)                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [Basic Tech]                                        │   │
│  │  • Max Level: 5                                       │   │
│  │  • Passives: +5 hacking bonus per level              │   │
│  └─────────────────────────────────────────────────────┘   │
│         │                                                     │
│         ├─────────────────┐                                 │
│         │                 │                                 │
│         ▼                 ▼                                 │
│  Level 5+          Level 6+                                 │
│  ┌──────────┐     ┌───────────────────────────────────┐    │
│  │[Hacking]│     │ [Engineering]                     │    │
│  │          │     │                                    │    │
│  │ • Level 5│     │ • Max Level: 5                    │    │
│  │ • Ability:     │ • Abilities:                       │    │
│  │   Hack          │   - Craft Item                    │    │
│  │   Terminal      │   - Modify Weapon                 │    │
│  │                │                                    │    │
│  │ Prerequisites: │ Prerequisites:                    │    │
│  │ - Level: 5     │ - Level: 6                        │    │
│  │ - Basic Tech: 3│ - Basic Tech: 4                   │    │
│  └──────────┘     │ - Intelligence: 16                 │    │
│                   └───────────────────────────────────┘    │
│                                                              │
│  Visual Flow:                                               │
│                                                              │
│  [Basic Tech] ──► [Hacking]                                │
│       │                                                     │
│       └──► (Intelligence 16) ──► [Engineering]             │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 Complete System Interaction Map

```
┌─────────────────────────────────────────────────────────────┐
│              COMPLETE SYSTEM INTERACTION MAP                  │
│                                                               │
│  ┌──────────────┐                                           │
│  │  CHARACTER    │                                           │
│  │    LEVEL      │                                           │
│  └──────┬───────┘                                            │
│         │                                                     │
│         ├──► Awards Skill Points (+1 per level)             │
│         ├──► Awards Attribute Points (+2 every 3 levels)     │
│         └──► Gates Skill Prerequisites                       │
│                                                               │
│  ┌──────────────┐                                           │
│  │  ATTRIBUTES   │                                           │
│  │               │                                           │
│  │ • Strength    │──► Gates Skill Prerequisites             │
│  │ • Agility     │──► (e.g., Agility 18 for Shadow Op.)    │
│  │ • Intelligence│──► Scales Ability Power                   │
│  │ • Charisma    │──► (e.g., Intelligence for Field Heal)   │
│  │ • Perception  │──► Provides Passive Bonuses              │
│  │ • Endurance   │──► (e.g., Perception for Crit Chance)    │
│  └──────┬───────┘                                            │
│         │                                                     │
│         └──► Modifies Skill Effectiveness (Future)           │
│                                                               │
│  ┌──────────────┐                                           │
│  │    SKILLS    │                                           │
│  │              │                                           │
│  │ • Combat     │──► Provides Passive Bonuses               │
│  │ • Stealth    │──► (e.g., +2% damage per level)          │
│  │ • Diplomacy  │──► Unlocks Abilities                      │
│  │ • Technical   │──► (e.g., Lockpicking → Pick Lock)       │
│  │ • Survival   │──► Requires Attribute Prerequisites       │
│  └──────┬───────┘──► (e.g., Perception 15 for Tactical)    │
│         │                                                     │
│         └──► Requires Skill Prerequisites                    │
│              (e.g., Basic Combat 3 for Advanced Weapons)     │
│                                                               │
│  ┌──────────────┐                                           │
│  │   ABILITIES   │                                           │
│  │               │                                           │
│  │ • Active      │◄──► Unlocked by Skills                    │
│  │ • Passive     │◄──► Unlocked by Items                    │
│  │ • Utility      │◄──► Scales with Attributes                │
│  └──────────────┘◄──► Enhanced by Skill Levels              │
│                                                               │
│  ┌──────────────┐                                           │
│  │    ITEMS      │                                           │
│  │               │                                           │
│  │ • Equipment   │──► Auto-unlocks Abilities                │
│  │ • Weapons     │──► (permanentAbility stat)               │
│  │ • Armor       │──► Provides Stat Bonuses                │
│  └──────────────┘──► (affects attribute calculations)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Progression Paths

### 5.1 Example: Stealth Build Progression

```
┌─────────────────────────────────────────────────────────────┐
│           STEALTH BUILD PROGRESSION PATH                     │
│                                                               │
│  LEVEL 1: Character Creation                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Attributes:                                          │   │
│  │  • Agility: 14 (Species: +2)                        │   │
│  │  • Perception: 12                                    │   │
│  │  • Other: 10                                         │   │
│  │                                                       │   │
│  │  Skills:                                             │   │
│  │  • Basic Stealth: 1 (Background: +1)                │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  LEVEL 3: Unlock Lockpicking                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Prerequisites Met:                                  │   │
│  │  • Level: 3 ✓                                        │   │
│  │  • Basic Stealth: 2 ✓                                 │   │
│  │                                                       │   │
│  │  Action: Allocate 1 Skill Point                     │   │
│  │  Result: Lockpicking Level 1                         │   │
│  │  Unlocked: Pick Lock Ability                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  LEVEL 5-9: Build Agility                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Attribute Points Available: 4 (Level 6, 9)         │   │
│  │  Allocate to Agility: 14 → 18                       │   │
│  │                                                       │   │
│  │  Skills:                                             │   │
│  │  • Basic Stealth: 5 (Max)                            │   │
│  │  • Lockpicking: 3                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  LEVEL 10: Unlock Shadow Operative                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Prerequisites Met:                                  │   │
│  │  • Level: 10 ✓                                       │   │
│  │  • Basic Stealth: 5 ✓                                │   │
│  │  • Lockpicking: 3 ✓                                 │   │
│  │  • Agility: 18 ✓                                    │   │
│  │                                                       │   │
│  │  Action: Allocate 1 Skill Point                     │   │
│  │  Result: Shadow Operative Level 1                    │   │
│  │  Bonuses: +10 stealth, +2% crit chance               │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  LEVEL 15: Master Shadow Operative                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Specialization Points Available: 3 (Level 5, 10, 15)│  │
│  │  Allocate to Shadow Operative: 3 → 6                │   │
│  │                                                       │   │
│  │  Mastery Bonuses:                                    │   │
│  │  • Enhanced stealth bonus                            │   │
│  │  • Additional crit chance                            │   │
│  │  • Unique ability unlock (Future)                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Example: Combat Build Progression

```
┌─────────────────────────────────────────────────────────────┐
│            COMBAT BUILD PROGRESSION PATH                    │
│                                                               │
│  LEVEL 1: Character Creation                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Attributes:                                          │   │
│  │  • Strength: 14                                      │   │
│  │  • Perception: 12                                    │   │
│  │  • Other: 10                                         │   │
│  │                                                       │   │
│  │  Skills:                                             │   │
│  │  • Basic Combat: 1 (Background: +1)                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  LEVEL 1-4: Build Basic Combat                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Skill Points: 4                                    │   │
│  │  Allocate to Basic Combat: 1 → 5                    │   │
│  │  Passive Bonus: +10% damage (5 × 2%)                │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  LEVEL 5: Unlock Advanced Weapons                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Prerequisites Met:                                  │   │
│  │  • Level: 5 ✓                                        │   │
│  │  • Basic Combat: 3 ✓                                 │   │
│  │                                                       │   │
│  │  Action: Allocate 1 Skill Point                     │   │
│  │  Result: Advanced Weapons Level 1                    │   │
│  │  Bonus: +1% crit chance                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  LEVEL 6-7: Build Perception                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Attribute Points: 2 (Level 6)                      │   │
│  │  Allocate to Perception: 12 → 14                     │   │
│  │  Need: 15 for Tactical Awareness                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  LEVEL 8: Unlock Tactical Awareness                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Prerequisites Met:                                  │   │
│  │  • Level: 8 ✓                                        │   │
│  │  • Perception: 15 ✓ (14 + 1 from allocation)        │   │
│  │                                                       │   │
│  │  Action: Allocate 1 Skill Point                     │   │
│  │  Result: Tactical Awareness Level 1                  │   │
│  │  Bonus: +3% defense                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  COMBAT EFFECTIVENESS                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Combined Bonuses:                                   │   │
│  │  • Basic Combat (5): +10% damage                    │   │
│  │  • Advanced Weapons (3): +3% crit chance             │   │
│  │  • Tactical Awareness (3): +9% defense               │   │
│  │  • Perception (15): +5% crit chance (passive)       │   │
│  │                                                       │   │
│  │  Total: +10% damage, +8% crit, +9% defense          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Synergy Examples

### 6.1 Attribute + Skill Synergy: Perception + Combat

```
┌─────────────────────────────────────────────────────────────┐
│         PERCEPTION + COMBAT SKILL SYNERGY                    │
│                                                               │
│  BASE STATS:                                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Perception: 12                                       │   │
│  │  Basic Combat: 5                                       │   │
│  │  Advanced Weapons: 3                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  PASSIVE BONUSES:                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  From Perception:                                      │   │
│  │  • Base Crit Chance: 5%                                │   │
│  │  • Perception Bonus: +2% (12 - 10)                    │   │
│  │  • Total Crit: 7%                                      │   │
│  │                                                       │   │
│  │  From Advanced Weapons:                               │   │
│  │  • Skill Bonus: +3% (3 × 1%)                          │   │
│  │                                                       │   │
│  │  Combined Crit Chance: 10%                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  IF PERCEPTION INCREASED TO 20:                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  From Perception:                                      │   │
│  │  • Base Crit Chance: 5%                                │   │
│  │  • Perception Bonus: +10% (20 - 10)                    │   │
│  │  • Capped at: 50% (hard cap)                          │   │
│  │                                                       │   │
│  │  From Advanced Weapons:                               │   │
│  │  • Skill Bonus: +3%                                    │   │
│  │                                                       │   │
│  │  Combined Crit Chance: 18%                            │   │
│  │  (Would be 25% without cap)                           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Skill + Ability Synergy: Engineering + Crafting

```
┌─────────────────────────────────────────────────────────────┐
│        ENGINEERING + CRAFTING ABILITY SYNERGY               │
│                                                               │
│  BASE STATS:                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Intelligence: 16                                     │   │
│  │  Engineering: 5                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  CRAFTING CALCULATIONS:                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Base Success Rate: 60%                              │   │
│  │                                                       │   │
│  │  Intelligence Bonus:                                  │   │
│  │  • +1.5% per point above 10                           │   │
│  │  • (16 - 10) × 1.5% = +9%                             │   │
│  │                                                       │   │
│  │  Engineering Skill Bonus:                             │   │
│  │  • +3% per level                                       │   │
│  │  • 5 × 3% = +15%                                      │   │
│  │                                                       │   │
│  │  Total Success Rate: 84%                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  MATERIAL COST REDUCTION:                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Base Material Cost: 100%                            │   │
│  │                                                       │   │
│  │  Intelligence Reduction:                              │   │
│  │  • +1% per point above 10                             │   │
│  │  • (16 - 10) × 1% = -6%                               │   │
│  │                                                       │   │
│  │  Engineering Reduction:                               │   │
│  │  • +5% per level                                       │   │
│  │  • 5 × 5% = -25%                                      │   │
│  │                                                       │   │
│  │  Total Reduction: -31%                               │   │
│  │  Final Cost: 69% of base                              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Multi-System Synergy: Stealth + Perception + Agility

```
┌─────────────────────────────────────────────────────────────┐
│      STEALTH + PERCEPTION + AGILITY SYNERGY                  │
│                                                               │
│  BASE STATS:                                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Agility: 18                                          │   │
│  │  Perception: 15                                       │   │
│  │  Basic Stealth: 5                                      │   │
│  │  Shadow Operative: 3                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  STEALTH EFFECTIVENESS:                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Base Stealth: 50                                     │   │
│  │                                                       │   │
│  │  From Basic Stealth:                                  │   │
│  │  • +5 per level = +25                                 │   │
│  │                                                       │   │
│  │  From Shadow Operative:                               │   │
│  │  • +10 per level = +30                                │   │
│  │                                                       │   │
│  │  Total Stealth: 105                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  DETECTION AVOIDANCE:                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Enemy Detection: 80                                 │   │
│  │                                                       │   │
│  │  Stealth Check: 105 vs 80 = Success ✓                │   │
│  │                                                       │   │
│  │  Perception Bonus:                                    │   │
│  │  • +5% detection avoidance per point above 10         │   │
│  │  • (15 - 10) × 5% = +25%                              │   │
│  │                                                       │   │
│  │  Agility Bonus:                                       │   │
│  │  • +2% movement speed per point above 10               │   │
│  │  • (18 - 10) × 2% = +16%                              │   │
│  │                                                       │   │
│  │  Result: Near-undetectable, fast movement             │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  CRITICAL HIT BONUS:                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Base Crit Chance: 5%                                 │   │
│  │                                                       │   │
│  │  From Perception:                                      │   │
│  │  • +5% (15 - 10)                                       │   │
│  │                                                       │   │
│  │  From Shadow Operative:                               │   │
│  │  • +6% (3 × 2%)                                       │   │
│  │                                                       │   │
│  │  Total Crit Chance: 16%                               │   │
│  │                                                       │   │
│  │  Combined with stealth attacks:                       │   │
│  │  • Stealth attack bonus: +20% crit                    │   │
│  │  • Total: 36% crit chance from stealth               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Implementation Details

### 7.1 Prerequisite Checking Flow

```
┌─────────────────────────────────────────────────────────────┐
│            PREREQUISITE CHECKING ALGORITHM                   │
│                                                               │
│  FUNCTION: canUnlockSkill(tree, skillId)                     │
│                                                               │
│  STEP 1: Validate Skill Exists                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  IF skill not found:                                  │   │
│  │    RETURN { can: false, reason: "Skill not found" }   │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  STEP 2: Check Current Level                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  IF currentLevel >= maxLevel:                         │   │
│  │    RETURN { can: false, reason: "At max level" }     │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  STEP 3: Check Skill Points                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  IF skillPoints <= 0:                                 │   │
│  │    RETURN { can: false, reason: "No skill points" }  │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  STEP 4: Check Level Prerequisite                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  IF prerequisites.level exists:                      │   │
│  │    IF character.level < prerequisites.level:        │   │
│  │      RETURN { can: false, reason: "Level X required" }│ │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  STEP 5: Check Attribute Prerequisites                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  FOR EACH stat in prerequisites.stats:               │   │
│  │    IF character.stats[stat] < requiredValue:        │   │
│  │      RETURN { can: false, reason: "Stat X required" }│ │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  STEP 6: Check Skill Prerequisites                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  FOR EACH tree in prerequisites.skills:              │   │
│  │    FOR EACH skill in tree:                           │   │
│  │      IF getSkillLevel(tree, skill) < requiredLevel: │   │
│  │        RETURN { can: false, reason: "Skill required" }│ │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  STEP 7: All Prerequisites Met                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  RETURN { can: true, reason: null }                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Ability Unlock Flow

```
┌─────────────────────────────────────────────────────────────┐
│              ABILITY UNLOCK FLOWCHART                        │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  TRIGGER: Skill Level Up OR Item Equipped           │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                    ┌─────┴─────┐                             │
│                    │           │                             │
│                    ▼           ▼                             │
│         ┌──────────────┐  ┌──────────────┐                │
│         │ SKILL UNLOCK │  │ ITEM UNLOCK   │                │
│         └──────┬───────┘  └──────┬───────┘                │
│                │                 │                          │
│                │                 │                          │
│                ▼                 ▼                          │
│  ┌─────────────────────────────────────────────┐            │
│  │  CHECK: Skill has abilities array?          │            │
│  │  OR Item has permanentAbility stat?         │            │
│  └─────────────────────────────────────────────┘            │
│                │                                             │
│                ▼                                             │
│  ┌─────────────────────────────────────────────┐            │
│  │  FOR EACH ability in skill.abilities:       │            │
│  │    CALL: abilityService.unlockAbility(       │            │
│  │      characterId,                           │            │
│  │      ability.id,                            │            │
│  │      source: 'skill'                        │            │
│  │    )                                        │            │
│  └─────────────────────────────────────────────┘            │
│                │                                             │
│                ▼                                             │
│  ┌─────────────────────────────────────────────┐            │
│  │  UPDATE: character.abilities[abilityId] = { │            │
│  │    unlocked: true,                          │            │
│  │    source: 'skill' | 'item',                │            │
│  │    rank: 1                                  │            │
│  │  }                                          │            │
│  └─────────────────────────────────────────────┘            │
│                │                                             │
│                ▼                                             │
│  ┌─────────────────────────────────────────────┐            │
│  │  PERSIST: Save character to database        │            │
│  └─────────────────────────────────────────────┘            │
│                │                                             │
│                ▼                                             │
│  ┌─────────────────────────────────────────────┐            │
│  │  NOTIFY: Frontend updates ability list     │            │
│  └─────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Passive Bonus Calculation

```
┌─────────────────────────────────────────────────────────────┐
│          PASSIVE BONUS CALCULATION SYSTEM                    │
│                                                               │
│  FUNCTION: getPassiveBonuses()                               │
│                                                               │
│  STEP 1: Initialize Bonus Objects                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  bonuses = {                                         │   │
│  │    stats: {},      // Attribute bonuses             │   │
│  │    combat: {},     // Combat bonuses                │   │
│  │    other: {}       // Other bonuses                 │   │
│  │  }                                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  STEP 2: Iterate Through Skills                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  FOR EACH tree in character.skills:                 │   │
│  │    FOR EACH skill in tree:                          │   │
│  │      skillLevel = skill.level                       │   │
│  │      IF skillLevel > 0:                             │   │
│  │        skillDef = getSkillDefinition(tree, skill) │   │
│  │        IF skillDef.passives exists:                │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  STEP 3: Calculate Scaled Bonuses                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  FOR EACH passive in skillDef.passives:             │   │
│  │    scaledValue = passiveValue × skillLevel           │   │
│  │                                                       │   │
│  │    IF passive is attribute (str, agi, int, etc):    │   │
│  │      bonuses.stats[passive] += scaledValue           │   │
│  │                                                       │   │
│  │    ELSE IF passive is combat (damage, crit, etc):   │   │
│  │      bonuses.combat[passive] += scaledValue          │   │
│  │                                                       │   │
│  │    ELSE:                                             │   │
│  │      bonuses.other[passive] += scaledValue           │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  STEP 4: Return Combined Bonuses                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  RETURN bonuses                                      │   │
│  │                                                       │   │
│  │  Example Output:                                     │   │
│  │  {                                                   │   │
│  │    stats: {},                                        │   │
│  │    combat: {                                        │   │
│  │      damage: 10,      // 5 levels × 2%              │   │
│  │      critChance: 3,    // 3 levels × 1%              │   │
│  │      defense: 9        // 3 levels × 3%              │   │
│  │    },                                                │   │
│  │    other: {                                          │   │
│  │      stealthBonus: 25, // 5 levels × 5               │   │
│  │      healingBonus: 15  // 1 level × 15               │   │
│  │    }                                                 │   │
│  │  }                                                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Summary

### 8.1 Key Interaction Points

1. **Attributes Gate Skills**: Attributes act as prerequisites for unlocking skills
2. **Skills Unlock Abilities**: Skills provide active abilities when unlocked
3. **Attributes Scale Abilities**: Attributes modify the power of abilities
4. **Skills Provide Passives**: Skills grant passive bonuses that scale with level
5. **Level Gates Everything**: Character level gates skill prerequisites
6. **Items Unlock Abilities**: Equipped items can auto-unlock permanent abilities

### 8.2 Design Principles

- **Meaningful Choices**: Prerequisites force players to specialize
- **Synergistic Systems**: Attributes, skills, and abilities work together
- **Progressive Unlocks**: Higher-level content requires investment
- **Build Diversity**: Multiple valid paths through the system
- **Scalable Power**: Systems scale with investment

### 8.3 Future Enhancements

- Attribute modifiers to skill effectiveness
- Skill modifiers to ability cooldowns
- Cross-tree synergies
- Mastery-specific abilities
- Prestige system integration

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Maintained By:** Development Team

