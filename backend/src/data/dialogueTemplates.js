/**
 * Dialogue Template Library
 * Comprehensive template system for NPC dialogue responses
 * 
 * Structure:
 * - Each template has responses for each relationship tier
 * - Templates are categorized by topic and context
 * - 65% of templates provide helpful information
 * - Variables are filled dynamically from NPC/planet/character context
 */

const dialogueTemplates = [
  // ========== PLANET INFORMATION (25% of helpful responses) ==========
  
  // Planet Overview
  {
    id: 'planet_info_overview_01',
    category: 'planet_info',
    topics: ['planet', 'overview', 'general'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic', 'quest_giver', 'vendor'],
    context: { requiresPlanet: true },
    weight: 1.2,
    helpful: true,
    responses: {
      stranger: "{planetName} is an interesting place. It's known for its {planetType} terrain and {climate} climate.",
      acquaintance: "Since you're on {planetName}, you should know it's a {planetType} world with {climate} conditions. The {terrain} can be challenging.",
      friend: "Friend, {planetName} is a {planetType} planet with {climate} climate. The {terrain} makes it unique, but watch out for the dangers.",
      confidant: "Let me tell you about {planetName}. It's a {planetType} world with {climate} climate. The {terrain} terrain can be treacherous, but there are opportunities here for those who know where to look."
    }
  },
  
  {
    id: 'planet_info_overview_02',
    category: 'planet_info',
    topics: ['planet', 'overview', 'general'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic', 'quest_giver'],
    context: { requiresPlanet: true },
    weight: 1.1,
    helpful: true,
    responses: {
      stranger: "Welcome to {planetName}. It's quite a place - {description}.",
      acquaintance: "You're on {planetName} now. {description} It's worth exploring if you have time.",
      friend: "Good to see you on {planetName}! {description} There's a lot to discover here.",
      confidant: "My friend, {planetName} is special. {description} I know all the best spots if you're interested."
    }
  },

  // Planet Locations/POIs
  {
    id: 'planet_info_locations_01',
    category: 'planet_info',
    topics: ['planet', 'locations', 'poi'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic', 'quest_giver', 'vendor'],
    context: { requiresPlanet: true, requiresPOI: true },
    weight: 1.3,
    helpful: true,
    responses: {
      stranger: "I've heard {planetName} has some interesting locations. The {poiName} is worth checking out if you're exploring.",
      acquaintance: "Since you're new to {planetName}, you should know about {poiName}. It's a {poiType} that many travelers visit.",
      friend: "Friend, if you're exploring {planetName}, definitely visit {poiName}. I've been there myself - it's quite the {poiType}.",
      confidant: "Let me give you some insider knowledge about {planetName}. The {poiName} is a {poiType} that holds secrets. I trust you'll use this information wisely."
    }
  },

  {
    id: 'planet_info_locations_02',
    category: 'planet_info',
    topics: ['planet', 'locations', 'poi'],
    relationshipTiers: ['acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic', 'quest_giver'],
    context: { requiresPlanet: true, requiresPOI: true },
    weight: 1.2,
    helpful: true,
    responses: {
      acquaintance: "There are several places worth seeing on {planetName}. {poiName} is particularly interesting - it's a {poiType}.",
      friend: "On {planetName}, you should check out {poiName}. It's a {poiType} that's known for {poiDescription}.",
      confidant: "Between you and me, {poiName} on {planetName} is more than it seems. It's a {poiType} that {poiDescription}. Be careful if you go there."
    }
  },

  {
    id: 'planet_info_locations_list_01',
    category: 'planet_info',
    topics: ['planet', 'locations', 'poi', 'location'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic', 'quest_giver', 'vendor'],
    context: { requiresPlanet: true, requiresPOI: true },
    weight: 1.8,
    helpful: true,
    responses: {
      stranger: "There are several interesting locations on {planetName}. The {poiName} is worth a visit, and there's also the {poiName2} if you're exploring.",
      acquaintance: "On {planetName}, you should check out {poiName} - it's a {poiType}. The {poiName2} is also interesting if you have time.",
      friend: "Friend, {planetName} has some great places to visit. {poiName} is a {poiType} that's popular, and {poiName2} is worth seeing too.",
      confidant: "My friend, let me tell you about the best locations on {planetName}. {poiName} is a {poiType} that many visit, and {poiName2} has its own appeal. Both are worth your time."
    }
  },

  {
    id: 'planet_info_locations_list_02',
    category: 'planet_info',
    topics: ['planet', 'locations', 'poi', 'location'],
    relationshipTiers: ['acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic', 'quest_giver'],
    context: { requiresPlanet: true, requiresPOI: true },
    weight: 1.7,
    helpful: true,
    responses: {
      acquaintance: "Interesting locations? On {planetName}, there's {poiName}, a {poiType}, and {poiName2}. Both are worth exploring.",
      friend: "Friend, if you're looking for interesting places, {planetName} has {poiName} - a {poiType} - and {poiName2}. I've been to both, they're quite different.",
      confidant: "My friend, {planetName} has several interesting locations. {poiName} is a {poiType} that draws many visitors, and {poiName2} offers something different. I can give you directions if you'd like."
    }
  },

  // Planet Resources
  {
    id: 'planet_info_resources_01',
    category: 'planet_info',
    topics: ['planet', 'resources'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic', 'vendor', 'trader'],
    context: { requiresPlanet: true, requiresResources: true },
    weight: 1.4,
    helpful: true,
    responses: {
      stranger: "{planetName} is known for {resourceName}. Many traders come here for it.",
      acquaintance: "If you're looking to gather resources, {planetName} has {resourceName} at {resourceLocation}. It's quite valuable.",
      friend: "Friend, you should know that {planetName} is rich in {resourceName}. You can find it at {resourceLocation}. It sells for a good price.",
      confidant: "Between you and me, {planetName}'s {resourceName} is highly sought after. The best place to gather it is {resourceLocation}. I've made good credits trading it."
    }
  },

  {
    id: 'planet_info_resources_02',
    category: 'planet_info',
    topics: ['planet', 'resources', 'trading'],
    relationshipTiers: ['acquaintance', 'friend', 'confidant'],
    npcTypes: ['vendor', 'trader'],
    context: { requiresPlanet: true, requiresResources: true },
    weight: 1.3,
    helpful: true,
    responses: {
      acquaintance: "The {resourceName} on {planetName} is valuable. You can harvest it at {resourceLocation} if you know what you're doing.",
      friend: "If you're into trading, {planetName}'s {resourceName} is profitable. {resourceLocation} is where most gatherers go. I can give you tips if you want.",
      confidant: "My friend, {resourceName} from {planetName} is one of the best trades. {resourceLocation} has the highest quality. I'll share my contacts if you're interested."
    }
  },

  // Planet Dangers
  {
    id: 'planet_info_dangers_01',
    category: 'planet_info',
    topics: ['planet', 'dangers', 'safety'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic', 'quest_giver'],
    context: { requiresPlanet: true },
    weight: 1.2,
    helpful: true,
    responses: {
      stranger: "Be careful on {planetName}. The danger level here is {dangerLevel} out of 10. Stay alert.",
      acquaintance: "Since you're on {planetName}, watch yourself. The danger level is {dangerLevel}/10. Some areas are safer than others.",
      friend: "Friend, {planetName} has a danger level of {dangerLevel}/10. I'd avoid the {dangerousArea} if I were you. Stick to populated areas.",
      confidant: "Let me be honest - {planetName} is dangerous. Level {dangerLevel}/10. The {dangerousArea} is particularly risky. I know safe routes if you need them."
    }
  },

  {
    id: 'planet_info_dangers_02',
    category: 'planet_info',
    topics: ['planet', 'dangers', 'safety'],
    relationshipTiers: ['friend', 'confidant'],
    npcTypes: ['generic', 'quest_giver'],
    context: { requiresPlanet: true },
    weight: 1.1,
    helpful: true,
    responses: {
      friend: "Watch out on {planetName}. I've seen travelers get into trouble. The {dangerousArea} is especially risky.",
      confidant: "My friend, {planetName} isn't safe everywhere. The {dangerousArea} has claimed many lives. If you must go, travel in groups and stay armed."
    }
  },

  // Planet Climate/Environment
  {
    id: 'planet_info_climate_01',
    category: 'planet_info',
    topics: ['planet', 'climate', 'environment'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: { requiresPlanet: true },
    weight: 1.0,
    helpful: true,
    responses: {
      stranger: "The {climate} climate on {planetName} can be harsh. Make sure you're prepared.",
      acquaintance: "You'll need to adapt to {planetName}'s {climate} climate. It's not like other worlds.",
      friend: "Friend, the {climate} climate here on {planetName} takes getting used to. Dress appropriately and stay hydrated.",
      confidant: "The {climate} climate on {planetName} is challenging. I've learned to cope with it over the years. I can share some survival tips if you need them."
    }
  },

  // ========== FACTION INFORMATION (15% of helpful responses) ==========

  {
    id: 'faction_info_overview_01',
    category: 'faction_info',
    topics: ['faction', 'overview'],
    relationshipTiers: ['acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic', 'faction_leader'],
    context: { requiresFaction: true },
    weight: 1.5,
    helpful: true,
    responses: {
      acquaintance: "The {factionName} is active here on {planetName}. We're working on several projects.",
      friend: "As a friend, I'll tell you: the {factionName} has a strong presence on {planetName}. We're always looking for capable individuals.",
      confidant: "Since we're close, I can share this: the {factionName} is expanding operations on {planetName}. There are opportunities for those who prove themselves."
    }
  },

  {
    id: 'faction_info_specific_01',
    category: 'faction_info',
    topics: ['faction', 'faction_info', 'neutral'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic', 'faction_leader'],
    context: { requiresFaction: true },
    weight: 1.6,
    helpful: true,
    responses: {
      stranger: "The {factionName}? We're not aligned with any major faction. We prefer to stay neutral and independent.",
      acquaintance: "The {factionName} represents neutrality. We don't take sides in galactic conflicts. It's safer that way.",
      friend: "Friend, the {factionName} is about staying out of the major conflicts. We believe in independence and neutrality. It's not always easy, but it's our way.",
      confidant: "My friend, the {factionName} philosophy is simple: stay neutral, stay independent. We don't answer to the Concord, Iron Dominion, or any other major power. It's a difficult path, but it's ours."
    }
  },

  {
    id: 'faction_info_keeper_01',
    category: 'faction_info',
    topics: ['faction', 'faction_info', 'keeper', 'lore'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic', 'quest_giver'],
    context: {},
    weight: 1.7,
    helpful: true,
    responses: {
      stranger: "The Keeper? They're an ancient order of Veil-users. Not many left these days, but their legacy remains.",
      acquaintance: "The Keeper Order was once a powerful force for peace. They were guardians of the Concord. These days, they're mostly legends.",
      friend: "Friend, the Keeper were keepers of peace and justice. They used the Veil for good. The Keeper Sanctum on Centralis was their stronghold, though it's been through many changes.",
      confidant: "My friend, the Keeper Order has a long and complex history. They were peacekeepers, but also warriors when needed. The Veil flows through them, connecting all living things. Their teachings still influence many, even if the Order itself has diminished."
    }
  },

  {
    id: 'faction_info_keeper_02',
    category: 'faction_info',
    topics: ['faction', 'faction_info', 'keeper', 'lore'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic', 'quest_giver'],
    context: {},
    weight: 1.6,
    helpful: true,
    responses: {
      stranger: "The Keeper Order? They're Veil-wielders who served the Concord. Not much left of them now.",
      acquaintance: "The Keeper were guardians of peace. They used arcblades and the Veil. The Keeper Sanctum on Centralis was their home.",
      friend: "Friend, the Keeper were powerful Veil-users who protected the galaxy. They followed a code of peace and justice. Many say they're all gone, but legends persist.",
      confidant: "My friend, the Keeper Order was one of the most powerful organizations in the galaxy. They were peacekeepers, but also warriors. Their connection to the Veil made them formidable. Even now, their influence is felt across the galaxy."
    }
  },

  {
    id: 'faction_info_reputation_01',
    category: 'faction_info',
    topics: ['faction', 'reputation'],
    relationshipTiers: ['acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic', 'faction_leader'],
    context: { requiresFaction: true },
    weight: 1.5,
    helpful: true,
    responses: {
      acquaintance: "The {factionName} values those who help our cause. Completing quests for us will improve your standing.",
      friend: "As a friend, I'll tell you: the {factionName} rewards loyalty. Help us with missions and you'll gain reputation quickly.",
      confidant: "Since we're close, I can share this: the {factionName} has several ways to gain reputation. Quest completion is the fastest, but helping our members also helps."
    }
  },

  {
    id: 'faction_info_activities_01',
    category: 'faction_info',
    topics: ['faction', 'activities', 'missions'],
    relationshipTiers: ['friend', 'confidant'],
    npcTypes: ['faction_leader', 'quest_giver'],
    context: { requiresFaction: true },
    weight: 1.4,
    helpful: true,
    responses: {
      friend: "The {factionName} has various operations on {planetName}. We're always looking for help with missions and quests.",
      confidant: "My friend, the {factionName} is involved in several activities here. We have missions that could use someone with your skills. Interested?"
    }
  },

  // ========== QUEST HINTS (10% of helpful responses) ==========

  {
    id: 'quest_hint_available_01',
    category: 'quest_hint',
    topics: ['quest', 'mission', 'work'],
    relationshipTiers: ['acquaintance', 'friend', 'confidant'],
    npcTypes: ['quest_giver'],
    context: {},
    weight: 1.6,
    helpful: true,
    responses: {
      acquaintance: "I might have some work for you, if you're interested. Come back when you're ready.",
      friend: "Friend, I have a mission that could use your skills. It's not easy, but the rewards are worth it.",
      confidant: "My trusted friend, I have an important quest for you. It's dangerous, but I know you can handle it. The rewards will be substantial."
    }
  },

  {
    id: 'quest_hint_location_01',
    category: 'quest_hint',
    topics: ['quest', 'location', 'hint'],
    relationshipTiers: ['friend', 'confidant'],
    npcTypes: ['quest_giver'],
    context: {},
    weight: 1.3,
    helpful: true,
    responses: {
      friend: "If you're looking for work, check out the {questLocation}. Something's happening there that needs attention.",
      confidant: "Between you and me, there's trouble brewing at {questLocation}. Someone with your skills could make a difference - and earn good credits."
    }
  },

  // ========== GENERAL TIPS (15% of helpful responses) ==========

  {
    id: 'tip_exploration_01',
    category: 'general_tip',
    topics: ['tip', 'exploration', 'advice'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic', 'quest_giver'],
    context: {},
    weight: 1.1,
    helpful: true,
    responses: {
      stranger: "If you're exploring, keep your eyes open. You never know what you might find.",
      acquaintance: "Exploration is rewarding, but dangerous. Always be prepared for combat.",
      friend: "Friend, when exploring, check every location. Some hide valuable resources or quest opportunities.",
      confidant: "My friend, I've learned that thorough exploration pays off. Check every POI, talk to everyone, and don't rush. The best rewards come to those who are patient."
    }
  },

  {
    id: 'tip_combat_01',
    category: 'general_tip',
    topics: ['tip', 'combat', 'advice'],
    relationshipTiers: ['acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.0,
    helpful: true,
    responses: {
      acquaintance: "Combat is dangerous out there. Make sure you're well-equipped before engaging enemies.",
      friend: "Friend, in combat, use your environment. Cover and positioning can make all the difference.",
      confidant: "My friend, I've survived many fights. The key is preparation - good equipment, full health, and knowing when to retreat. Don't be a hero."
    }
  },

  {
    id: 'tip_trading_01',
    category: 'general_tip',
    topics: ['tip', 'trading', 'credits'],
    relationshipTiers: ['acquaintance', 'friend', 'confidant'],
    npcTypes: ['vendor', 'trader'],
    context: {},
    weight: 1.2,
    helpful: true,
    responses: {
      acquaintance: "Trading can be profitable. Buy low, sell high, and know your markets.",
      friend: "Friend, if you're trading, resources from {planetName} are valuable. Look for rare items - they fetch the best prices.",
      confidant: "My friend, I've made my fortune trading. The secret is finding undervalued resources and selling them where demand is high. {planetName} has good opportunities."
    }
  },

  {
    id: 'tip_relationships_01',
    category: 'general_tip',
    topics: ['tip', 'relationships', 'reputation'],
    relationshipTiers: ['friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.0,
    helpful: true,
    responses: {
      friend: "Building relationships with NPCs opens doors. Help them, complete quests, and they'll share valuable information.",
      confidant: "My friend, relationships matter. The more people trust you, the more opportunities you'll find. Faction reputation is especially important."
    }
  },

  // ========== CASUAL CONVERSATION (35% of responses) ==========

  {
    id: 'casual_greeting_01',
    category: 'casual',
    topics: ['greeting', 'casual'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.0,
    helpful: false,
    responses: {
      stranger: "Hello there. Can I help you?",
      acquaintance: "Oh, hello again. How can I assist you?",
      friend: "Good to see you, friend! What brings you here?",
      confidant: "My dear friend, welcome! It's always a pleasure to see you."
    }
  },

  {
    id: 'casual_occupation_01',
    category: 'casual',
    topics: ['occupation', 'casual'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.0,
    helpful: false,
    responses: {
      stranger: "I work as a {occupation} here. It's not glamorous, but it pays the bills.",
      acquaintance: "Being a {occupation} keeps me busy. There's always something to do on {planetName}.",
      friend: "As a {occupation}, I've seen a lot on {planetName}. It's an interesting place to work.",
      confidant: "My work as a {occupation} has taught me a lot about {planetName}. I'm happy to share what I know with a friend like you."
    }
  },

  {
    id: 'casual_occupation_02',
    category: 'casual',
    topics: ['occupation', 'casual'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic', 'vendor'],
    context: {},
    weight: 1.0,
    helpful: false,
    responses: {
      stranger: "I'm a {occupation} here on {planetName}. It's honest work.",
      acquaintance: "My job as a {occupation} here keeps me on my toes. {planetName} is never boring.",
      friend: "Friend, being a {occupation} on {planetName} has its challenges, but I enjoy it.",
      confidant: "As a {occupation}, I've learned the ins and outs of {planetName}. There's always something happening here."
    }
  },

  {
    id: 'casual_planet_life_01',
    category: 'casual',
    topics: ['planet', 'life', 'casual'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: { requiresPlanet: true },
    weight: 1.0,
    helpful: false,
    responses: {
      stranger: "Life on {planetName} is what you make of it. Some find it harsh, others thrive.",
      acquaintance: "Living on {planetName} takes getting used to, but it's home now.",
      friend: "Friend, {planetName} has been good to me. It's not perfect, but it's where I belong.",
      confidant: "My friend, {planetName} is my home. I've seen it change over the years, but it's still a place worth fighting for."
    }
  },

  {
    id: 'casual_news_01',
    category: 'casual',
    topics: ['news', 'casual', 'events'],
    relationshipTiers: ['acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.0,
    helpful: false,
    responses: {
      acquaintance: "Not much news lately. Things are quiet around here.",
      friend: "Friend, there's been some interesting developments. Nothing major, but worth keeping an eye on.",
      confidant: "My friend, I've heard some rumors. Nothing confirmed, but there might be opportunities coming up. I'll let you know if I hear more."
    }
  },

  {
    id: 'casual_small_talk_01',
    category: 'casual',
    topics: ['casual', 'small_talk'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.0,
    helpful: false,
    responses: {
      stranger: "The weather's been typical for {planetName}. Nothing unusual.",
      acquaintance: "How's your day going? Mine's been busy, as usual.",
      friend: "Friend, it's good to see you. How have you been?",
      confidant: "My dear friend, it's always a pleasure to chat. What's on your mind?"
    }
  },

  {
    id: 'casual_species_01',
    category: 'casual',
    topics: ['species', 'casual'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.0,
    helpful: false,
    responses: {
      stranger: "I'm {species}. We're not uncommon around these parts.",
      acquaintance: "Being {species} on {planetName} has its advantages and disadvantages, like anywhere.",
      friend: "Friend, as a {species}, I've learned to adapt. {planetName} is home now.",
      confidant: "My friend, being {species} means I see things differently. But we're all just trying to get by, aren't we?"
    }
  },

  {
    id: 'casual_farewell_01',
    category: 'casual',
    topics: ['farewell', 'casual'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.0,
    helpful: false,
    responses: {
      stranger: "Take care out there. Stay safe.",
      acquaintance: "Good luck with your travels. Come back anytime.",
      friend: "Friend, stay safe out there. May the Veil be with you.",
      confidant: "My dear friend, take care. If you need anything, you know where to find me. May the Veil be with you."
    }
  },

  // ========== EXPANDED TEMPLATES - COMMON INTERACTIONS (30 new templates) ==========
  
  // Greeting Variations (Emotional/Contextual)
  {
    id: 'greeting_stressed_01',
    category: 'casual',
    topics: ['greeting', 'casual'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.2,
    helpful: false,
    emotionalState: ['stressed', 'anxious'],
    responses: {
      stranger: "*glances around* What do you want? I'm busy.",
      acquaintance: "*sighs* Not a great time, but what do you need?",
      friend: "Hey, sorry I'm stressed. What's up?",
      confidant: "Friend, I'm dealing with something. Can we make this quick?"
    }
  },

  {
    id: 'greeting_happy_01',
    category: 'casual',
    topics: ['greeting', 'casual'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.2,
    helpful: false,
    emotionalState: ['happy', 'satisfied'],
    responses: {
      stranger: "Hello! Nice to meet you. How can I help?",
      acquaintance: "Oh, hello! Good to see you again. What brings you here?",
      friend: "Friend! Great to see you! How have you been?",
      confidant: "My dear friend! It's wonderful to see you! How are things going?"
    }
  },

  {
    id: 'greeting_time_morning_01',
    category: 'casual',
    topics: ['greeting', 'casual'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.1,
    helpful: false,
    responses: {
      stranger: "Good morning. Can I help you?",
      acquaintance: "Morning! How can I assist you today?",
      friend: "Good morning, friend! What brings you here so early?",
      confidant: "Morning, my friend! You're up early. Everything alright?"
    }
  },

  {
    id: 'greeting_time_night_01',
    category: 'casual',
    topics: ['greeting', 'casual'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.1,
    helpful: false,
    responses: {
      stranger: "*yawns* It's late. What do you need?",
      acquaintance: "Evening. I was about to call it a day. What's up?",
      friend: "Friend, it's late! What brings you out at this hour?",
      confidant: "My friend, it's late. Is everything okay? What do you need?"
    }
  },

  // NPC Personal Information
  {
    id: 'npc_info_who_01',
    category: 'casual',
    topics: ['npc_info', 'who', 'yourself'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.3,
    helpful: false,
    responses: {
      stranger: "I'm {npcName}, a {species} {occupation}. That's all you need to know.",
      acquaintance: "I'm {npcName}. I work as a {occupation} here on {planetName}. Been here a while.",
      friend: "Friend, I'm {npcName}, a {species} {occupation}. I've been on {planetName} for years. It's home now.",
      confidant: "My friend, I'm {npcName}. I'm a {species} {occupation}, and {planetName} has been my home for a long time. I've seen a lot here."
    }
  },

  {
    id: 'npc_info_tell_about_01',
    category: 'casual',
    topics: ['npc_info', 'tell me about', 'yourself'],
    relationshipTiers: ['acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.2,
    helpful: false,
    responses: {
      acquaintance: "Not much to tell. I'm a {occupation} trying to make a living on {planetName}. Same as most people here.",
      friend: "Friend, I'm just a {occupation} trying to get by. {planetName} is tough, but I've managed. I keep to myself mostly.",
      confidant: "My friend, I've been a {occupation} on {planetName} for years. I've seen good times and bad. I've learned to be careful who I trust, but you've proven yourself."
    }
  },

  {
    id: 'npc_info_background_01',
    category: 'casual',
    topics: ['npc_info', 'background', 'history'],
    relationshipTiers: ['friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.1,
    helpful: false,
    responses: {
      friend: "Friend, my past isn't that interesting. I came to {planetName} looking for work and stayed. That's about it.",
      confidant: "My friend, I came to {planetName} years ago. I was looking for a fresh start, and this place gave me that. It's been home ever since."
    }
  },

  // Quest/Mission Related
  {
    id: 'quest_ask_work_01',
    category: 'quest_hint',
    topics: ['quest', 'work', 'job', 'mission'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic', 'quest_giver'],
    context: {},
    weight: 1.5,
    helpful: true,
    responses: {
      stranger: "Work? I might have something, but I don't know you well enough yet.",
      acquaintance: "I might have some work for you. Come back when you're ready to take on a job.",
      friend: "Friend, I do have some work available. It's not easy, but the pay is decent. Interested?",
      confidant: "My trusted friend, I have a job that needs doing. I know you can handle it. The rewards will be worth your time."
    }
  },

  {
    id: 'quest_ask_help_01',
    category: 'quest_hint',
    topics: ['quest', 'help', 'assist', 'need'],
    relationshipTiers: ['acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic', 'quest_giver'],
    context: {},
    weight: 1.4,
    helpful: true,
    responses: {
      acquaintance: "I could use some help, but I need to know you're reliable first. Prove yourself and we'll talk.",
      friend: "Friend, I do need help with something. It's important to me. Can I count on you?",
      confidant: "My friend, I have something important that needs doing. I trust you to help me with it. It won't be easy, but I know you can do it."
    }
  },

  {
    id: 'quest_no_work_01',
    category: 'casual',
    topics: ['quest', 'work', 'mission'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.0,
    helpful: false,
    responses: {
      stranger: "Sorry, I don't have any work for you right now. Try asking around.",
      acquaintance: "I don't have any jobs available at the moment. Check back later, or ask other people.",
      friend: "Friend, I don't have any work right now. But I'll keep you in mind if something comes up.",
      confidant: "My friend, nothing at the moment, but I'll let you know as soon as I have something. You're always my first choice."
    }
  },

  // Help/Assistance Offers
  {
    id: 'help_offer_01',
    category: 'casual',
    topics: ['help', 'assist', 'offer'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.2,
    helpful: false,
    responses: {
      stranger: "That's kind of you, but I'm fine. Thanks anyway.",
      acquaintance: "I appreciate the offer, but I can handle things myself. Maybe another time.",
      friend: "Friend, that's very kind. I might take you up on that. Let me think about it.",
      confidant: "My friend, your offer means a lot. I do have something I could use help with. Can we talk about it?"
    }
  },

  {
    id: 'help_accept_01',
    category: 'quest_hint',
    topics: ['help', 'accept', 'yes'],
    relationshipTiers: ['friend', 'confidant'],
    npcTypes: ['generic', 'quest_giver'],
    context: {},
    weight: 1.3,
    helpful: true,
    responses: {
      friend: "Thank you, friend! I really appreciate this. Here's what I need...",
      confidant: "My friend, thank you! This means everything to me. Let me explain what I need..."
    }
  },

  // Thank You Responses
  {
    id: 'thanks_general_01',
    category: 'casual',
    topics: ['thanks', 'thank you', 'gratitude'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.1,
    helpful: false,
    responses: {
      stranger: "You're welcome. Take care.",
      acquaintance: "You're welcome. Good luck out there.",
      friend: "You're welcome, friend! Anytime.",
      confidant: "My friend, you're always welcome. I'm here if you need anything else."
    }
  },

  {
    id: 'thanks_quest_01',
    category: 'casual',
    topics: ['thanks', 'quest', 'mission'],
    relationshipTiers: ['friend', 'confidant'],
    npcTypes: ['quest_giver'],
    context: {},
    weight: 1.2,
    helpful: false,
    responses: {
      friend: "Thank you, friend! You did great work. I won't forget this.",
      confidant: "My friend, thank you so much! You've proven yourself to be reliable. I'll remember this."
    }
  },

  // Casual Conversation - Daily Life
  {
    id: 'casual_how_are_you_01',
    category: 'casual',
    topics: ['casual', 'how are you', 'how is it going'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.0,
    helpful: false,
    responses: {
      stranger: "I'm doing fine, thanks. How about you?",
      acquaintance: "I'm doing alright. Just another day on {planetName}. How are you?",
      friend: "Friend, I'm doing well! Things have been busy, but I can't complain. How about you?",
      confidant: "My friend, I'm doing great! Life on {planetName} has its challenges, but I'm managing. How are things with you?"
    }
  },

  {
    id: 'casual_weather_01',
    category: 'casual',
    topics: ['casual', 'weather', 'climate'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: { requiresPlanet: true },
    weight: 1.0,
    helpful: false,
    responses: {
      stranger: "The {climate} weather is typical for {planetName}. Nothing unusual.",
      acquaintance: "The weather's been normal for {planetName}. The {climate} climate takes getting used to.",
      friend: "Friend, the {climate} weather here is what it is. You learn to adapt after a while.",
      confidant: "My friend, the {climate} climate on {planetName} is harsh, but you get used to it. I've seen worse places."
    }
  },

  {
    id: 'casual_busy_01',
    category: 'casual',
    topics: ['casual', 'busy', 'work'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.0,
    helpful: false,
    responses: {
      stranger: "I'm pretty busy with my work. Can we make this quick?",
      acquaintance: "I've been busy lately. Work never stops on {planetName}.",
      friend: "Friend, I've been swamped with work. Being a {occupation} keeps me on my toes.",
      confidant: "My friend, I've been very busy. But I always have time for you. What's on your mind?"
    }
  },

  // Faction Discussions
  {
    id: 'faction_opinion_01',
    category: 'faction_info',
    topics: ['faction', 'opinion', 'thoughts'],
    relationshipTiers: ['acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: { requiresFaction: true },
    weight: 1.3,
    helpful: true,
    responses: {
      acquaintance: "The {factionName}? We do what we can. I believe in our cause.",
      friend: "Friend, the {factionName} stands for something important. I'm proud to be part of it.",
      confidant: "My friend, the {factionName} is more than just an organization. It's a way of life. I believe in what we're doing."
    }
  },

  {
    id: 'faction_neutral_01',
    category: 'faction_info',
    topics: ['faction', 'neutral', 'no faction'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.2,
    helpful: true,
    responses: {
      stranger: "I don't align with any faction. I prefer to stay independent.",
      acquaintance: "I'm not affiliated with any major faction. I stay neutral and mind my own business.",
      friend: "Friend, I don't take sides in faction conflicts. I've seen what happens when you do. Neutrality is safer.",
      confidant: "My friend, I've learned that staying neutral is the best way to survive. Faction conflicts only bring trouble."
    }
  },

  // Trust-Based Responses
  {
    id: 'trust_low_secret_01',
    category: 'casual',
    topics: ['secret', 'information', 'trust'],
    relationshipTiers: ['stranger', 'acquaintance'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.2,
    helpful: false,
    requiresTrust: 60,
    responses: {
      stranger: "I don't know you well enough to share that kind of information. Sorry.",
      acquaintance: "That's not something I share with just anyone. Maybe if we get to know each other better."
    }
  },

  {
    id: 'trust_high_secret_01',
    category: 'casual',
    topics: ['secret', 'information', 'trust'],
    relationshipTiers: ['friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.3,
    helpful: true,
    requiresTrust: 60,
    responses: {
      friend: "Friend, since I trust you, I'll tell you this: I've been working on something important. Keep it to yourself.",
      confidant: "My friend, I trust you completely. Here's something you should know: I have information that could be valuable. Use this information wisely."
    }
  },

  // Personality-Based Responses (Formal)
  {
    id: 'personality_formal_01',
    category: 'casual',
    topics: ['casual', 'greeting'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.1,
    helpful: false,
    personalityRequirements: { authorityRespect: { min: 70 } },
    responses: {
      stranger: "Greetings. How may I assist you today?",
      acquaintance: "Good day. It is pleasant to see you again. How may I be of service?",
      friend: "My friend, it is good to see you. How may I assist you today?",
      confidant: "My dear friend, it is always a pleasure. How may I be of assistance?"
    }
  },

  // Personality-Based Responses (Humorous)
  {
    id: 'personality_humorous_01',
    category: 'casual',
    topics: ['casual', 'greeting'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.1,
    helpful: false,
    personalityRequirements: { humor: { min: 70 } },
    responses: {
      stranger: "*chuckles* Well, hello there! What brings you to this corner of the galaxy?",
      acquaintance: "*grins* Hey again! Back for more of my charming conversation?",
      friend: "*laughs* Friend! Good to see you! You know, I was just thinking about you. Funny how that works!",
      confidant: "*big smile* My friend! Always a delight! You know, I've got a joke for you... well, maybe later. What's up?"
    }
  },

  // Personality-Based Responses (Direct)
  {
    id: 'personality_direct_01',
    category: 'casual',
    topics: ['casual', 'greeting'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.1,
    helpful: false,
    personalityRequirements: { directness: { min: 70 } },
    responses: {
      stranger: "What do you want?",
      acquaintance: "What's up?",
      friend: "Friend, what do you need?",
      confidant: "My friend, what can I do for you?"
    }
  },

  // Emotional Responses - Stressed
  {
    id: 'emotional_stressed_01',
    category: 'casual',
    topics: ['casual', 'how are you'],
    relationshipTiers: ['acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.2,
    helpful: false,
    emotionalState: ['stressed', 'anxious'],
    responses: {
      acquaintance: "*sighs* I'm stressed. Things are piling up. I need to focus.",
      friend: "Friend, I'm really stressed right now. There's a lot going on. I could use some help, actually.",
      confidant: "My friend, I'm under a lot of pressure. Things are getting difficult. I don't know what to do."
    }
  },

  // Emotional Responses - Happy
  {
    id: 'emotional_happy_01',
    category: 'casual',
    topics: ['casual', 'how are you'],
    relationshipTiers: ['acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.2,
    helpful: false,
    emotionalState: ['happy', 'satisfied'],
    responses: {
      acquaintance: "*smiles* I'm doing great! Things are going well for me lately.",
      friend: "Friend, I'm in a great mood! Everything's working out. How about you?",
      confidant: "My friend, I'm so happy! Things are finally going my way. I feel like I'm on top of the world!"
    }
  },

  // Resource Trading
  {
    id: 'trading_offer_01',
    category: 'general_tip',
    topics: ['trading', 'resources', 'credits'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['vendor', 'trader'],
    context: {},
    weight: 1.3,
    helpful: true,
    responses: {
      stranger: "I've got goods for sale if you're interested. Fair prices, quality items.",
      acquaintance: "Looking to trade? I've got some good deals. What are you looking for?",
      friend: "Friend, I've got some great items in stock. I can give you a good price since we know each other.",
      confidant: "My friend, I've saved some special items for you. I know what you're looking for, and I've got it. Best prices, of course."
    }
  },

  {
    id: 'trading_no_interest_01',
    category: 'casual',
    topics: ['trading', 'resources'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.0,
    helpful: false,
    responses: {
      stranger: "I'm not really into trading. I just work here.",
      acquaintance: "Trading's not my thing. I leave that to the vendors and traders.",
      friend: "Friend, I don't do much trading. I'm more of a worker than a merchant.",
      confidant: "My friend, trading isn't my expertise. I stick to my {occupation} work. But I can point you to good traders if you need."
    }
  },

  // Farewell Variations
  {
    id: 'farewell_see_you_01',
    category: 'casual',
    topics: ['farewell', 'goodbye'],
    relationshipTiers: ['stranger', 'acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.0,
    helpful: false,
    responses: {
      stranger: "See you around. Stay safe.",
      acquaintance: "See you later. Come back anytime.",
      friend: "See you soon, friend! Take care out there.",
      confidant: "See you soon, my friend! You know where to find me if you need anything."
    }
  },

  {
    id: 'farewell_good_luck_01',
    category: 'casual',
    topics: ['farewell', 'goodbye'],
    relationshipTiers: ['acquaintance', 'friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.0,
    helpful: false,
    responses: {
      acquaintance: "Good luck with your travels. Stay safe out there.",
      friend: "Good luck, friend! May the Veil be with you.",
      confidant: "Good luck, my friend! May the Veil be with you, and may you find what you're looking for."
    }
  },

  // General Advice
  {
    id: 'advice_survival_01',
    category: 'general_tip',
    topics: ['tip', 'advice', 'survival'],
    relationshipTiers: ['friend', 'confidant'],
    npcTypes: ['generic'],
    context: { requiresPlanet: true },
    weight: 1.2,
    helpful: true,
    responses: {
      friend: "Friend, if you're going to survive on {planetName}, you need to be smart. Watch your back, trust carefully, and always have an escape plan.",
      confidant: "My friend, survival on {planetName} is about being prepared. Keep your weapons ready, your credits hidden, and your friends close. I've learned that the hard way."
    }
  },

  {
    id: 'advice_relationships_01',
    category: 'general_tip',
    topics: ['tip', 'advice', 'relationships'],
    relationshipTiers: ['friend', 'confidant'],
    npcTypes: ['generic'],
    context: {},
    weight: 1.1,
    helpful: true,
    responses: {
      friend: "Friend, building relationships takes time. Help people, complete quests, and be reliable. That's how you build trust.",
      confidant: "My friend, relationships are everything. The more people trust you, the more opportunities you'll find. But remember - trust is earned, not given."
    }
  }
];

/**
 * Get all dialogue templates
 */
function getAllTemplates() {
  return dialogueTemplates;
}

/**
 * Get templates by category
 */
function getTemplatesByCategory(category) {
  return dialogueTemplates.filter(t => t.category === category);
}

/**
 * Get templates that match criteria
 */
function getMatchingTemplates(criteria) {
  return dialogueTemplates.filter(template => {
    // Check relationship tier
    if (criteria.relationshipTier && !template.relationshipTiers.includes(criteria.relationshipTier)) {
      return false;
    }
    
    // Check NPC type
    if (criteria.npcType && !template.npcTypes.includes(criteria.npcType)) {
      return false;
    }
    
    // Check if helpful (for 65% requirement)
    if (criteria.requireHelpful !== undefined && template.helpful !== criteria.requireHelpful) {
      return false;
    }
    
    // Check context requirements
    if (criteria.context) {
      if (template.context.requiresPlanet && !criteria.context.hasPlanet) {
        return false;
      }
      if (template.context.requiresFaction && !criteria.context.hasFaction) {
        return false;
      }
      if (template.context.requiresPOI && !criteria.context.hasPOI) {
        return false;
      }
      if (template.context.requiresResources && !criteria.context.hasResources) {
        return false;
      }
    }
    
    return true;
  });
}

module.exports = {
  getAllTemplates,
  getTemplatesByCategory,
  getMatchingTemplates,
  dialogueTemplates
};

