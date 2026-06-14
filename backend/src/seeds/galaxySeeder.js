/**
 * Galaxy Seeder
 * Seeds star systems, planets, and travel routes
 * Comprehensive Star Wars galaxy with 86 planets across multiple regions
 */

const { StarSystem, Planet, TravelRoute } = require('../models');
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// STAR SYSTEMS DATA
// Organized by galactic regions with appropriate coordinates
// ============================================================================

const systemsData = [
  // ========== CORE WORLDS (Central, densely populated) ==========
  { id: 'centralis_system', name: 'Centralis System', region: 'Core Worlds', coords: { x: -10, y: 5 }, faction: 'concord', danger: 1, economy: 'urban', population: 'urban' },
  { id: 'drydock_system', name: 'Drydock System', region: 'Core Worlds', coords: { x: 0, y: 0 }, faction: 'concord', danger: 2, economy: 'industrial', population: 'dense' },
  { id: 'caelmore_system', name: 'Caelmore System', region: 'Core Worlds', coords: { x: 5, y: -5 }, faction: 'concord', danger: 1, economy: 'agricultural', population: 'moderate' },
  { id: 'solenne_system', name: 'Solenne System', region: 'Core Worlds', coords: { x: -5, y: 10 }, faction: 'concord', danger: 1, economy: 'agricultural', population: 'moderate' },
  { id: 'forgeline_system', name: 'Forgeline System', region: 'Core Worlds', coords: { x: -8, y: -3 }, faction: 'concord', danger: 1, economy: 'industrial', population: 'dense' },
  { id: 'tradewell_system', name: 'Tradewell System', region: 'Core Worlds', coords: { x: -12, y: 8 }, faction: 'concord', danger: 1, economy: 'trade', population: 'dense' },
  { id: 'coriane_system', name: 'Coriane System', region: 'Core Worlds', coords: { x: 3, y: 7 }, faction: 'concord', danger: 1, economy: 'trade', population: 'moderate' },
  { id: 'greyfield_system', name: 'Greyfield System', region: 'Core Worlds', coords: { x: -7, y: 12 }, faction: 'concord', danger: 2, economy: 'agricultural', population: 'moderate' },
  
  // ========== COLONIES (Between Core and Inner Rim) ==========
  { id: 'greld_system', name: 'Greld System', region: 'Colonies', coords: { x: 8, y: -8 }, faction: 'dominion_remnant', danger: 3, economy: 'industrial', population: 'dense' },
  { id: 'anvret_system', name: 'Anvret System', region: 'Colonies', coords: { x: -15, y: 2 }, faction: 'concord', danger: 2, economy: 'industrial', population: 'dense' },
  { id: 'dolmark_system', name: 'Dolmark System', region: 'Colonies', coords: { x: 12, y: 3 }, faction: 'concord', danger: 2, economy: 'industrial', population: 'moderate' },
  
  // ========== INNER RIM (Well-developed, stable) ==========
  { id: 'thessmar_system', name: 'Thessmar System', region: 'Inner Rim', coords: { x: 15, y: -12 }, faction: 'concord', danger: 1, economy: 'trade', population: 'dense' },
  { id: 'vashqa_system', name: 'Vashqa System', region: 'Inner Rim', coords: { x: 18, y: -8 }, faction: 'concord', danger: 2, economy: 'agricultural', population: 'moderate' },
  { id: 'pyrren_system', name: 'Pyrren System', region: 'Inner Rim', coords: { x: 10, y: -15 }, faction: 'concord', danger: 2, economy: 'mining', population: 'moderate' },
  { id: 'renqa_system', name: 'Renqa System', region: 'Inner Rim', coords: { x: -18, y: -5 }, faction: 'concord', danger: 2, economy: 'trade', population: 'moderate' },
  { id: 'greenholt_system', name: 'Greenholt System', region: 'Inner Rim', coords: { x: 22, y: 5 }, faction: 'concord', danger: 1, economy: 'agricultural', population: 'sparse' },
  { id: 'dorrun_system', name: 'Dorrun System', region: 'Inner Rim', coords: { x: 16, y: -10 }, faction: 'concord', danger: 1, economy: 'trade', population: 'dense' },
  
  // ========== MID RIM (Moderate development) ==========
  { id: 'eloria_system', name: 'Eloria System', region: 'Mid Rim', coords: { x: 20, y: -15 }, faction: 'concord', danger: 1, economy: 'agricultural', population: 'moderate' },
  { id: 'verdholm_system', name: 'Verdholm System', region: 'Mid Rim', coords: { x: 25, y: 15 }, faction: 'concord', danger: 2, economy: 'agricultural', population: 'moderate' },
  { id: 'sytha_system', name: 'Sytha System', region: 'Mid Rim', coords: { x: 30, y: -20 }, faction: 'concord', danger: 3, economy: 'mining', population: 'moderate' },
  { id: 'karrn_system', name: 'Karrn System', region: 'Mid Rim', coords: { x: 35, y: -10 }, faction: 'independent', danger: 4, economy: 'mining', population: 'sparse' },
  { id: 'casmer_system', name: 'Casmer System', region: 'Mid Rim', coords: { x: 28, y: 8 }, faction: 'independent', danger: 2, economy: 'trade', population: 'moderate' },
  { id: 'myssia_system', name: 'Myssia System', region: 'Mid Rim', coords: { x: 32, y: -5 }, faction: 'independent', danger: 5, economy: 'agricultural', population: 'sparse' },
  { id: 'glaiv_system', name: 'Glaiv System', region: 'Mid Rim', coords: { x: 38, y: 12 }, faction: 'dominion_remnant', danger: 4, economy: 'mining', population: 'sparse' },
  { id: 'saldon_system', name: 'Saldon System', region: 'Mid Rim', coords: { x: 26, y: -18 }, faction: 'independent', danger: 3, economy: 'agricultural', population: 'moderate' },
  { id: 'vexhold_system', name: 'Vexhold System', region: 'Mid Rim', coords: { x: 24, y: 10 }, faction: 'independent', danger: 3, economy: 'trade', population: 'moderate' },
  { id: 'dustram_system', name: 'Dustram System', region: 'Mid Rim', coords: { x: 22, y: -12 }, faction: 'concord', danger: 2, economy: 'mining', population: 'moderate' },
  { id: 'veluron_system', name: 'Veluron System', region: 'Mid Rim', coords: { x: 40, y: -8 }, faction: 'concord', danger: 3, economy: 'agricultural', population: 'moderate' },
  { id: 'caldon_system', name: 'Caldon System', region: 'Mid Rim', coords: { x: 35, y: -25 }, faction: 'concord', danger: 2, economy: 'agricultural', population: 'sparse' },
  
  // ========== EXPANSION REGION (Less developed) ==========
  { id: 'sytha_reach_system', name: 'Sytha Reach System', region: 'Expansion Region', coords: { x: 45, y: -22 }, faction: 'concord', danger: 3, economy: 'mining', population: 'sparse' },
  { id: 'highspire_system', name: 'Highspire System', region: 'Expansion Region', coords: { x: 42, y: 15 }, faction: 'independent', danger: 4, economy: 'urban', population: 'moderate' },
  { id: 'tellan_system', name: 'Tellan System', region: 'Expansion Region', coords: { x: 48, y: -18 }, faction: 'concord', danger: 2, economy: 'agricultural', population: 'sparse' },
  
  // ========== OUTER RIM (Frontier, dangerous) ==========
  { id: 'gravenmoor_system', name: 'Gravenmoor System', region: 'Outer Rim', coords: { x: 50, y: -30 }, faction: 'vorr_cartel', danger: 4, economy: 'mining', population: 'sparse' },
  { id: 'rime_system', name: 'Rime System', region: 'Outer Rim', coords: { x: 60, y: 20 }, faction: null, danger: 6, economy: null, population: 'sparse' },
  { id: 'cirruan_system', name: 'Cirruan System', region: 'Outer Rim', coords: { x: 45, y: -10 }, faction: 'independent', danger: 3, economy: 'mining', population: 'moderate' },
  { id: 'verdance_system', name: 'Verdance System', region: 'Outer Rim', coords: { x: 40, y: 25 }, faction: 'concord', danger: 2, economy: null, population: 'sparse' },
  { id: 'veshkar_system', name: 'Veshkar System', region: 'Outer Rim', coords: { x: 55, y: 10 }, faction: 'ironkin', danger: 5, economy: 'industrial', population: 'moderate' },
  { id: 'mawthorn_system', name: 'Mawthorn System', region: 'Outer Rim', coords: { x: 70, y: -40 }, faction: null, danger: 8, economy: null, population: 'sparse' },
  { id: 'embervast_system', name: 'Embervast System', region: 'Outer Rim', coords: { x: 65, y: -15 }, faction: 'dominion_remnant', danger: 9, economy: 'mining', population: 'sparse' },
  { id: 'coralsec_system', name: 'Coralsec System', region: 'Outer Rim', coords: { x: 45, y: -45 }, faction: 'dominion_remnant', danger: 7, economy: 'research', population: 'sparse' },
  { id: 'talveen_system', name: 'Talveen System', region: 'Outer Rim', coords: { x: 80, y: -50 }, faction: null, danger: 4, economy: 'mining', population: 'sparse' },
  { id: 'karrn_outer_system', name: 'Karrn Outer System', region: 'Outer Rim', coords: { x: 52, y: -25 }, faction: 'independent', danger: 5, economy: 'mining', population: 'sparse' },
  { id: 'sytha_verge_system', name: 'Sytha Verge System', region: 'Outer Rim', coords: { x: 58, y: -35 }, faction: 'concord', danger: 4, economy: 'mining', population: 'sparse' },
  { id: 'tethys_system', name: 'Tethys System', region: 'Outer Rim', coords: { x: 75, y: 5 }, faction: null, danger: 3, economy: 'research', population: 'sparse' },
  { id: 'mirefen_system', name: 'Mirefen System', region: 'Outer Rim', coords: { x: 62, y: 30 }, faction: null, danger: 6, economy: null, population: 'sparse' },
  { id: 'selvora_system', name: 'Selvora System', region: 'Outer Rim', coords: { x: 55, y: -40 }, faction: 'concord', danger: 3, economy: null, population: 'sparse' },
  { id: 'ordwell_system', name: 'Ordwell System', region: 'Outer Rim', coords: { x: 48, y: 18 }, faction: 'independent', danger: 4, economy: 'trade', population: 'moderate' },
  { id: 'sinkport_system', name: 'Sinkport System', region: 'Outer Rim', coords: { x: 68, y: -20 }, faction: 'vorr_cartel', danger: 6, economy: 'trade', population: 'dense' },
  { id: 'sytha_deep_system', name: 'Sytha Deep System', region: 'Outer Rim', coords: { x: 72, y: -28 }, faction: 'concord', danger: 5, economy: 'mining', population: 'sparse' },
  
  // ========== WILD SPACE (Unexplored, dangerous) ==========
  { id: 'sytha_wilds_system', name: 'Sytha Wilds System', region: 'Wild Space', coords: { x: 85, y: -35 }, faction: null, danger: 7, economy: null, population: 'sparse' },
  { id: 'nyxar_system', name: 'Nyxar System', region: 'Wild Space', coords: { x: 90, y: 10 }, faction: 'dominion_remnant', danger: 10, economy: null, population: 'sparse' },
  { id: 'kthala_system', name: 'Kthala System', region: 'Wild Space', coords: { x: 88, y: -15 }, faction: null, danger: 5, economy: 'mining', population: 'sparse' },
  
  // ========== UNKNOWN REGIONS (Mysterious, uncharted) ==========
  { id: 'esh_vael_system', name: 'Esh-Vael System', region: 'Unknown Regions', coords: { x: 95, y: -5 }, faction: null, danger: 3, economy: null, population: 'sparse' },
  { id: 'sytha_fringe_system', name: 'Sytha Fringe System', region: 'Unknown Regions', coords: { x: 100, y: -25 }, faction: null, danger: 6, economy: null, population: 'sparse' },
  { id: 'vorne_reaches_system', name: 'Vorne Reaches System', region: 'Unknown Regions', coords: { x: 105, y: 15 }, faction: 'vorne', danger: 4, economy: 'research', population: 'moderate' },
];

// ============================================================================
// PLANETS DATA
// 86 planets total across all systems
// ============================================================================

const planetsData = [
  // ========== CORE WORLDS PLANETS ==========
  // Centralis System
  { id: 'centralis', systemId: 'centralis_system', name: 'Centralis', type: 'urban', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 1000000000000, cities: ['Central Spire', 'Nightrun District', 'Lowmarket'], faction: 'concord', danger: 1 },
  
  // Drydock System
  { id: 'drydock', systemId: 'drydock_system', name: 'Drydock', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 3000000000, cities: ['Coronet', 'Doaba Guerfel', 'Tyrena'], faction: 'concord', danger: 2 },
  { id: 'brae', systemId: 'drydock_system', name: 'Brae', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.95, population: 500000000, cities: ['Brellyr'], faction: 'concord', danger: 1 },
  { id: 'mereth', systemId: 'drydock_system', name: 'Mereth', type: 'ocean', climate: 'temperate', atmosphere: 'breathable', gravity: 0.9, population: 100000000, cities: ['Hunchuzuc'], faction: 'concord', danger: 1 },
  
  // Caelmore System
  { id: 'caelmore', systemId: 'caelmore_system', name: 'Caelmore', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 2000000000, cities: ['Aldera', 'New Caelmore'], faction: 'concord', danger: 1 },
  
  // Solenne System
  { id: 'solenne', systemId: 'solenne_system', name: 'Solenne', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 1200000000, cities: ['Hanna City'], faction: 'concord', danger: 1 },
  
  // Forgeline System
  { id: 'forgeline', systemId: 'forgeline_system', name: 'Forgeline', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 8000000000, cities: ['Forgeline City', 'Forgeline Drive Yards'], faction: 'concord', danger: 1 },
  { id: 'forgeline_moon', systemId: 'forgeline_system', name: 'Forgeline Moon', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.85, population: 50000000, cities: ['Lunar Base'], faction: 'concord', danger: 1 },
  
  // Tradewell System
  { id: 'tradewell', systemId: 'tradewell_system', name: 'Tradewell', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 1500000000, cities: ['Tradewell City'], faction: 'concord', danger: 1 },
  
  // Coriane System
  { id: 'coriane', systemId: 'coriane_system', name: 'Coriane', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 900000000, cities: ['Coriane City'], faction: 'concord', danger: 1 },
  
  // Greyfield System
  { id: 'greyfield', systemId: 'greyfield_system', name: 'Greyfield', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 600000000, cities: ['Cantras Gola'], faction: 'concord', danger: 2 },
  
  // ========== COLONIES PLANETS ==========
  // Greld System
  { id: 'greld', systemId: 'greld_system', name: 'Greld', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 22000000000, cities: ['Greld City'], faction: 'dominion_remnant', danger: 3 },
  
  // Anvret System
  { id: 'anvret', systemId: 'anvret_system', name: 'Anvret', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 5000000000, cities: ['Anvret City'], faction: 'concord', danger: 2 },
  
  // Dolmark System
  { id: 'dolmark', systemId: 'dolmark_system', name: 'Dolmark', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 1800000000, cities: ['Dolmark City'], faction: 'concord', danger: 2 },
  
  // ========== INNER RIM PLANETS ==========
  // Thessmar System
  { id: 'thessmar', systemId: 'thessmar_system', name: 'Thessmar', type: 'ocean', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 27000000000, cities: ['Coral City', 'Heurkea'], faction: 'concord', danger: 1 },
  { id: 'dorrun', systemId: 'dorrun_system', name: 'Dorrun', type: 'ocean', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 25000000000, cities: ['Coral City'], faction: 'concord', danger: 1 },
  
  // Vashqa System
  { id: 'vashqa', systemId: 'vashqa_system', name: 'Vashqa', type: 'jungle', climate: 'tropical', atmosphere: 'breathable', gravity: 1.0, population: 1300000000, cities: ['Equator City'], faction: 'concord', danger: 2 },
  
  // Pyrren System
  { id: 'pyrren', systemId: 'pyrren_system', name: 'Pyrren', type: 'volcanic', climate: 'variable', atmosphere: 'breathable', gravity: 1.0, population: 10000000000, cities: ['Plesstila', 'Pyrren City'], faction: 'concord', danger: 2 },
  
  // Renqa System
  { id: 'renqa', systemId: 'renqa_system', name: 'Renqa', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 3000000000, cities: ['Drev\'starn'], faction: 'concord', danger: 2 },
  
  // Greenholt System
  { id: 'greenholt', systemId: 'greenholt_system', name: 'Greenholt', type: 'jungle', climate: 'tropical', atmosphere: 'breathable', gravity: 0.9, population: 0, cities: [], faction: 'concord', danger: 1 },
  
  // ========== MID RIM PLANETS ==========
  // Eloria System
  { id: 'eloria', systemId: 'eloria_system', name: 'Eloria', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 4500000000, cities: ['Theed', 'Otoh Gunga'], faction: 'concord', danger: 1 },
  { id: 'eloria_moon', systemId: 'eloria_system', name: 'Eloria Moon', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.8, population: 0, cities: [], faction: null, danger: 2 },
  
  // Verdholm System
  { id: 'verdholm', systemId: 'verdholm_system', name: 'Verdholm', type: 'jungle', climate: 'tropical', atmosphere: 'breathable', gravity: 1.0, population: 45000000, cities: ['Kachirho', 'Rwookrrorro'], faction: 'concord', danger: 2 },
  
  // Sytha System
  { id: 'sytha', systemId: 'sytha_system', name: 'Sytha', type: 'terrestrial', climate: 'arid', atmosphere: 'breathable', gravity: 0.9, population: 1500000000, cities: ['Sythmar', 'Kala\'uun'], faction: 'concord', danger: 3 },
  
  // Karrn System
  { id: 'karrn', systemId: 'karrn_system', name: 'Karrn', type: 'desert', climate: 'arid', atmosphere: 'breathable', gravity: 0.9, population: 100000000, cities: ['Stalgasin Hive'], faction: 'independent', danger: 4 },
  
  // Casmer System
  { id: 'casmer', systemId: 'casmer_system', name: 'Casmer', type: 'terrestrial', climate: 'arid', atmosphere: 'breathable', gravity: 0.9, population: 95000000, cities: ['Pau City'], faction: 'independent', danger: 2 },
  
  // Myssia System
  { id: 'myssia', systemId: 'myssia_system', name: 'Myssia', type: 'jungle', climate: 'tropical', atmosphere: 'breathable', gravity: 0.75, population: 0, cities: [], faction: 'independent', danger: 5 },
  
  // Glaiv System
  { id: 'glaiv', systemId: 'glaiv_system', name: 'Glaiv', type: 'ice', climate: 'frozen', atmosphere: 'breathable', gravity: 1.0, population: 19000000, cities: ['Glaiv City'], faction: 'dominion_remnant', danger: 4 },
  
  // Saldon System
  { id: 'saldon', systemId: 'saldon_system', name: 'Saldon', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 3000000, cities: ['Saldon City'], faction: 'independent', danger: 3 },
  
  // Vexhold System
  { id: 'vexhold', systemId: 'vexhold_system', name: 'Vexhold', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 1000000000, cities: ['Vexhold City'], faction: 'independent', danger: 3 },
  
  // Dustram System
  { id: 'dustram', systemId: 'dustram_system', name: 'Dustram', type: 'terrestrial', climate: 'arid', atmosphere: 'breathable', gravity: 1.0, population: 4000000000, cities: ['Dustram City'], faction: 'concord', danger: 2 },
  
  // Veluron System
  { id: 'veluron', systemId: 'veluron_system', name: 'Veluron', type: 'jungle', climate: 'tropical', atmosphere: 'breathable', gravity: 1.0, population: 5000000000, cities: ['Iziz'], faction: 'concord', danger: 3 },
  { id: 'drask', systemId: 'veluron_system', name: 'Drask', type: 'jungle', climate: 'tropical', atmosphere: 'breathable', gravity: 1.1, population: 0, cities: [], faction: null, danger: 4 },
  
  // Caldon System
  { id: 'caldon', systemId: 'caldon_system', name: 'Caldon', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 10000, cities: ['Khoonda'], faction: 'concord', danger: 2 },
  
  // ========== EXPANSION REGION PLANETS ==========
  // Sytha Reach System
  { id: 'sytha_reach', systemId: 'sytha_reach_system', name: 'Sytha Reach', type: 'terrestrial', climate: 'arid', atmosphere: 'breathable', gravity: 0.9, population: 500000, cities: ['Outpost Alpha'], faction: 'concord', danger: 3 },
  
  // Highspire System
  { id: 'highspire', systemId: 'highspire_system', name: 'Highspire', type: 'urban', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 6000000000, cities: ['Upper City', 'Lower City'], faction: 'independent', danger: 4 },
  
  // Tellan System
  { id: 'tellan', systemId: 'tellan_system', name: 'Tellan', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 1000000, cities: ['Tellan City'], faction: 'concord', danger: 2 },
  
  // ========== OUTER RIM PLANETS ==========
  // Gravenmoor System
  { id: 'gravenmoor', systemId: 'gravenmoor_system', name: 'Gravenmoor', type: 'desert', climate: 'arid', atmosphere: 'breathable', gravity: 1.0, population: 200000, cities: ['Greywell', 'Dustreach', 'Anchorhead'], faction: 'vorr_cartel', danger: 4 },
  
  // Rime System
  { id: 'rime', systemId: 'rime_system', name: 'Rime', type: 'ice', climate: 'frozen', atmosphere: 'breathable', gravity: 1.1, population: 0, cities: [], faction: null, danger: 6 },
  
  // Cirruan System
  { id: 'cirruan', systemId: 'cirruan_system', name: 'Cirruan', type: 'gas_giant', climate: 'variable', atmosphere: 'breathable', gravity: 0.75, population: 6000000, cities: ['Cloud City'], faction: 'independent', danger: 3 },
  
  // Verdance System
  { id: 'verdance', systemId: 'verdance_system', name: 'Verdance', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.85, population: 30000000, cities: [], faction: 'concord', danger: 2 },
  
  // Veshkar System
  { id: 'veshkar', systemId: 'veshkar_system', name: 'Veshkar', type: 'terrestrial', climate: 'arid', atmosphere: 'breathable', gravity: 1.0, population: 4000000, cities: ['Keldabe', 'Sundari'], faction: 'ironkin', danger: 5 },
  { id: 'dawnmark', systemId: 'veshkar_system', name: 'Concord Dawn', type: 'terrestrial', climate: 'arid', atmosphere: 'breathable', gravity: 1.0, population: 500000, cities: ['Concord Dawn City'], faction: 'ironkin', danger: 4 },
  
  // Mawthorn System
  { id: 'mawthorn', systemId: 'mawthorn_system', name: 'Mawthorn', type: 'jungle', climate: 'tropical', atmosphere: 'breathable', gravity: 0.9, population: 0, cities: [], faction: null, danger: 8 },
  
  // Embervast System
  { id: 'embervast', systemId: 'embervast_system', name: 'Embervast', type: 'volcanic', climate: 'variable', atmosphere: 'toxic', gravity: 1.2, population: 20000, cities: ['Fust', 'Mining Facility'], faction: 'dominion_remnant', danger: 9 },
  
  // Coralsec System
  { id: 'coralsec', systemId: 'coralsec_system', name: 'Coralsec', type: 'terrestrial', climate: 'tropical', atmosphere: 'breathable', gravity: 1.0, population: 0, cities: [], faction: 'dominion_remnant', danger: 7 },
  
  // Talveen System
  { id: 'talveen', systemId: 'talveen_system', name: 'Talveen', type: 'desert', climate: 'arid', atmosphere: 'breathable', gravity: 1.0, population: 5000, cities: ['Niima Outpost'], faction: null, danger: 4 },
  
  // Karrn Outer System
  { id: 'karrn_outer', systemId: 'karrn_outer_system', name: 'Karrn Outer', type: 'desert', climate: 'arid', atmosphere: 'breathable', gravity: 0.9, population: 50000, cities: ['Outer Hive'], faction: 'independent', danger: 5 },
  
  // Sytha Verge System
  { id: 'sytha_verge', systemId: 'sytha_verge_system', name: 'Sytha Verge', type: 'terrestrial', climate: 'arid', atmosphere: 'breathable', gravity: 0.9, population: 200000, cities: ['Outer Settlement'], faction: 'concord', danger: 4 },
  
  // Tethys System
  { id: 'tethys', systemId: 'tethys_system', name: 'Tethys', type: 'ocean', climate: 'temperate', atmosphere: 'breathable', gravity: 0.9, population: 1000000000, cities: ['Tipoca City'], faction: null, danger: 3 },
  
  // Mirefen System
  { id: 'mirefen', systemId: 'mirefen_system', name: 'Mirefen', type: 'jungle', climate: 'tropical', atmosphere: 'breathable', gravity: 1.0, population: 0, cities: [], faction: null, danger: 6 },
  
  // Selvora System
  { id: 'selvora_4', systemId: 'selvora_system', name: 'Selvora IV', type: 'jungle', climate: 'tropical', atmosphere: 'breathable', gravity: 0.9, population: 0, cities: [], faction: 'concord', danger: 3 },
  { id: 'selvora_prime', systemId: 'selvora_system', name: 'Selvora', type: 'gas_giant', climate: 'variable', atmosphere: 'toxic', gravity: 2.5, population: 0, cities: [], faction: null, danger: 8 },
  
  // Ordwell System
  { id: 'ordwell', systemId: 'ordwell_system', name: 'Ordwell', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 5000000, cities: ['Worlport'], faction: 'independent', danger: 4 },
  
  // Sinkport System - The Smuggler's Moon
  { 
    id: 'sinkport', 
    systemId: 'sinkport_system', 
    name: 'Sinkport', 
    type: 'urban', 
    climate: 'variable', 
    atmosphere: 'breathable', 
    gravity: 1.0, 
    population: 85000000000, 
    cities: ['Sinkport City'], 
    faction: 'vorr_cartel', 
    danger: 6,
    description: 'Sinkport, the Smuggler\'s Moon, is a lawless urban world where credits rule and anything can be bought or sold. Neon-lit streets, towering skyscrapers, and shadowy alleys hide a thriving criminal underworld. From the opulent Entertainment District to the dangerous Lower Levels, this moon is a haven for smugglers, bounty hunters, and those who operate outside the law.',
    lore: 'Known throughout the galaxy as the Smuggler\'s Moon, Sinkport has been a hub of criminal activity for centuries. Controlled by the Vorr Cartel, the moon operates with its own rules where credits and power determine everything. The upper levels boast casinos, luxury cantinas, and the palaces of crime lords, while the lower levels are a warren of gangs, spice dens, and illegal markets. Despite its dangers, Sinkport attracts those seeking fortune, information, or simply a place where no questions are asked. The moon\'s spaceports see constant traffic from smugglers, pirates, and traders dealing in everything from legitimate goods to the most illegal contraband. Here, a person can disappear, make a fortune, or meet an untimely end—all in the same day.'
  },
  
  // Sytha Deep System
  { id: 'sytha_deep', systemId: 'sytha_deep_system', name: 'Sytha Deep', type: 'terrestrial', climate: 'arid', atmosphere: 'breathable', gravity: 0.9, population: 100000, cities: ['Deep Settlement'], faction: 'concord', danger: 5 },
  
  // ========== WILD SPACE PLANETS ==========
  // Sytha Wilds System
  { id: 'sytha_wilds', systemId: 'sytha_wilds_system', name: 'Sytha Wilds', type: 'terrestrial', climate: 'arid', atmosphere: 'breathable', gravity: 0.9, population: 0, cities: [], faction: null, danger: 7 },
  
  // Nyxar System
  { id: 'nyxar', systemId: 'nyxar_system', name: 'Nyxar', type: 'barren', climate: 'variable', atmosphere: 'toxic', gravity: 1.1, population: 0, cities: [], faction: 'dominion_remnant', danger: 10 },
  
  // Kthala System
  { id: 'kthala', systemId: 'kthala_system', name: 'Kthala', type: 'ice', climate: 'frozen', atmosphere: 'breathable', gravity: 1.0, population: 0, cities: [], faction: null, danger: 5 },
  
  // ========== UNKNOWN REGIONS PLANETS ==========
  // Esh-Vael System
  { id: 'esh_vael', systemId: 'esh_vael_system', name: 'Esh-Vael', type: 'ocean', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 0, cities: [], faction: null, danger: 3 },
  
  // Sytha Fringe System
  { id: 'sytha_fringe', systemId: 'sytha_fringe_system', name: 'Sytha Fringe', type: 'terrestrial', climate: 'arid', atmosphere: 'breathable', gravity: 0.9, population: 0, cities: [], faction: null, danger: 6 },
  
  // Vorne Reaches System
  { id: 'vornhal', systemId: 'vorne_reaches_system', name: 'Vornhal', type: 'ice', climate: 'frozen', atmosphere: 'breathable', gravity: 1.0, population: 2500000000, cities: ['Csaplar'], faction: 'vorne', danger: 4 },
  { id: 'naveth', systemId: 'vorne_reaches_system', name: 'Naveth', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 500000000, cities: ['Naveth City'], faction: 'vorne', danger: 3 },
  
  // ========== ADDITIONAL PLANETS TO REACH 86 TOTAL ==========
  // Adding planets to existing systems and new systems
  
  // Centralis System - additional planets
  { id: 'centralis_moon', systemId: 'centralis_system', name: 'Centralis Moon', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.85, population: 50000000, cities: ['Lunar Base'], faction: 'concord', danger: 1 },
  
  // Caelmore System - moons
  { id: 'caelmore_moon_1', systemId: 'caelmore_system', name: 'Caelmore Moon I', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.8, population: 0, cities: [], faction: null, danger: 2 },
  
  // Forgeline System - additional planets
  { id: 'forgeline_2', systemId: 'forgeline_system', name: 'Forgeline II', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.95, population: 2000000000, cities: ['Forgeline II City'], faction: 'concord', danger: 1 },
  
  // Thessmar System - additional planets
  { id: 'thessmar_moon', systemId: 'thessmar_system', name: 'Thessmar Moon', type: 'ocean', climate: 'temperate', atmosphere: 'breathable', gravity: 0.9, population: 50000000, cities: ['Lunar Station'], faction: 'concord', danger: 1 },
  
  // Vashqa System - moons
  { id: 'vashqa_moon', systemId: 'vashqa_system', name: 'Vashqa Moon', type: 'jungle', climate: 'tropical', atmosphere: 'breathable', gravity: 0.85, population: 0, cities: [], faction: null, danger: 3 },
  
  // Pyrren System - additional planets
  { id: 'pyrren_moon', systemId: 'pyrren_system', name: 'Pyrren Moon', type: 'volcanic', climate: 'variable', atmosphere: 'breathable', gravity: 0.8, population: 1000000, cities: ['Lunar Base'], faction: 'concord', danger: 3 },
  
  // Renqa System - moons
  { id: 'renqa_moon', systemId: 'renqa_system', name: 'Renqa Moon', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.9, population: 500000, cities: ['Lunar Outpost'], faction: 'concord', danger: 2 },
  
  // Karrn System - additional planets
  { id: 'karrn_moon', systemId: 'karrn_system', name: 'Karrn Moon', type: 'desert', climate: 'arid', atmosphere: 'breathable', gravity: 0.85, population: 0, cities: [], faction: null, danger: 5 },
  
  // Casmer System - additional planets
  { id: 'casmer_moon', systemId: 'casmer_system', name: 'Casmer Moon', type: 'terrestrial', climate: 'arid', atmosphere: 'breathable', gravity: 0.85, population: 0, cities: [], faction: null, danger: 3 },
  
  // Myssia System - additional planets
  { id: 'myssia_moon', systemId: 'myssia_system', name: 'Myssia Moon', type: 'jungle', climate: 'tropical', atmosphere: 'breathable', gravity: 0.7, population: 0, cities: [], faction: null, danger: 6 },
  
  // Glaiv System - additional planets
  { id: 'glaiv_moon', systemId: 'glaiv_system', name: 'Glaiv Moon', type: 'ice', climate: 'frozen', atmosphere: 'breathable', gravity: 0.9, population: 0, cities: [], faction: null, danger: 5 },
  
  // Saldon System - additional planets
  { id: 'saldon_moon', systemId: 'saldon_system', name: 'Saldon Moon', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.95, population: 0, cities: [], faction: null, danger: 4 },
  
  // Vexhold System - additional planets
  { id: 'vexhold_moon', systemId: 'vexhold_system', name: 'Vexhold Moon', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.9, population: 500000, cities: ['Lunar Base'], faction: 'independent', danger: 3 },
  
  // Dustram System - additional planets
  { id: 'dustram_moon', systemId: 'dustram_system', name: 'Dustram Moon', type: 'terrestrial', climate: 'arid', atmosphere: 'breathable', gravity: 0.9, population: 1000000, cities: ['Lunar Outpost'], faction: 'concord', danger: 2 },
  
  // Gravenmoor System - additional planets
  { id: 'gravenmoor_moon', systemId: 'gravenmoor_system', name: 'Gravenmoor Moon', type: 'desert', climate: 'arid', atmosphere: 'breathable', gravity: 0.85, population: 0, cities: [], faction: null, danger: 5 },
  
  // Rime System - additional planets
  { id: 'rime_moon', systemId: 'rime_system', name: 'Rime Moon', type: 'ice', climate: 'frozen', atmosphere: 'breathable', gravity: 0.9, population: 0, cities: [], faction: null, danger: 7 },
  
  // Cirruan System - additional planets (gas giant moons)
  { id: 'cirruan_moon_1', systemId: 'cirruan_system', name: 'Cirruan Moon I', type: 'terrestrial', climate: 'variable', atmosphere: 'breathable', gravity: 0.7, population: 0, cities: [], faction: null, danger: 4 },
  
  // Verdance System - additional planets
  { id: 'verdance_moon', systemId: 'verdance_system', name: 'Verdance Moon', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.8, population: 0, cities: [], faction: null, danger: 3 },
  
  // Tethys System - additional planets
  { id: 'tethys_moon', systemId: 'tethys_system', name: 'Tethys Moon', type: 'ocean', climate: 'temperate', atmosphere: 'breathable', gravity: 0.85, population: 0, cities: [], faction: null, danger: 4 },
  
  // Mirefen System - additional planets
  { id: 'mirefen_moon', systemId: 'mirefen_system', name: 'Mirefen Moon', type: 'jungle', climate: 'tropical', atmosphere: 'breathable', gravity: 0.95, population: 0, cities: [], faction: null, danger: 7 },
  
  // Selvora System - additional planets
  { id: 'selvora_8', systemId: 'selvora_system', name: 'Selvora VIII', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.9, population: 0, cities: [], faction: null, danger: 4 },
  
  // Ordwell System - additional planets
  { id: 'ordwell_moon', systemId: 'ordwell_system', name: 'Ordwell Moon', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.9, population: 500000, cities: ['Lunar Port'], faction: 'independent', danger: 4 },
  
  // Sinkport System - additional planets
  { id: 'sinkport_moon', systemId: 'sinkport_system', name: 'Sinkport Moon', type: 'urban', climate: 'variable', atmosphere: 'breathable', gravity: 0.9, population: 50000000, cities: ['Lunar City'], faction: 'vorr_cartel', danger: 6 },
  
  // Kthala System - additional planets
  { id: 'kthala_moon', systemId: 'kthala_system', name: 'Kthala Moon', type: 'ice', climate: 'frozen', atmosphere: 'breathable', gravity: 0.9, population: 0, cities: [], faction: null, danger: 6 },
  
  // Esh-Vael System - additional planets
  { id: 'esh_vael_moon', systemId: 'esh_vael_system', name: 'Esh-Vael Moon', type: 'ocean', climate: 'temperate', atmosphere: 'breathable', gravity: 0.9, population: 0, cities: [], faction: null, danger: 4 },
];

// ============================================================================
// TRAVEL ROUTES DATA
// Fold-lanes connecting systems
// ============================================================================

const routesData = [
  // Core Worlds connections
  { from: 'centralis_system', to: 'drydock_system', time: 2, cost: 100 },
  { from: 'drydock_system', to: 'centralis_system', time: 2, cost: 100 },
  { from: 'centralis_system', to: 'caelmore_system', time: 3, cost: 150 },
  { from: 'caelmore_system', to: 'centralis_system', time: 3, cost: 150 },
  { from: 'solenne_system', to: 'centralis_system', time: 2, cost: 100 },
  { from: 'centralis_system', to: 'solenne_system', time: 2, cost: 100 },
  { from: 'forgeline_system', to: 'centralis_system', time: 2, cost: 100 },
  { from: 'centralis_system', to: 'forgeline_system', time: 2, cost: 100 },
  { from: 'tradewell_system', to: 'centralis_system', time: 3, cost: 150 },
  { from: 'centralis_system', to: 'tradewell_system', time: 3, cost: 150 },
  { from: 'coriane_system', to: 'drydock_system', time: 2, cost: 100 },
  { from: 'drydock_system', to: 'coriane_system', time: 2, cost: 100 },
  
  // Core to Colonies
  { from: 'forgeline_system', to: 'anvret_system', time: 3, cost: 150 },
  { from: 'anvret_system', to: 'forgeline_system', time: 3, cost: 150 },
  { from: 'drydock_system', to: 'greld_system', time: 4, cost: 200 },
  { from: 'greld_system', to: 'drydock_system', time: 4, cost: 200 },
  
  // Colonies to Inner Rim
  { from: 'anvret_system', to: 'thessmar_system', time: 4, cost: 200 },
  { from: 'thessmar_system', to: 'anvret_system', time: 4, cost: 200 },
  { from: 'dolmark_system', to: 'renqa_system', time: 5, cost: 250 },
  { from: 'renqa_system', to: 'dolmark_system', time: 5, cost: 250 },
  
  // Inner Rim connections
  { from: 'thessmar_system', to: 'dorrun_system', time: 1, cost: 50 },
  { from: 'dorrun_system', to: 'thessmar_system', time: 1, cost: 50 },
  { from: 'vashqa_system', to: 'pyrren_system', time: 3, cost: 150 },
  { from: 'pyrren_system', to: 'vashqa_system', time: 3, cost: 150 },
  { from: 'renqa_system', to: 'greenholt_system', time: 4, cost: 200 },
  { from: 'greenholt_system', to: 'renqa_system', time: 4, cost: 200 },
  
  // Inner Rim to Mid Rim
  { from: 'thessmar_system', to: 'eloria_system', time: 5, cost: 250 },
  { from: 'eloria_system', to: 'thessmar_system', time: 5, cost: 250 },
  { from: 'drydock_system', to: 'eloria_system', time: 5, cost: 250 },
  { from: 'eloria_system', to: 'drydock_system', time: 5, cost: 250 },
  { from: 'solenne_system', to: 'verdholm_system', time: 4, cost: 200 },
  { from: 'verdholm_system', to: 'solenne_system', time: 4, cost: 200 },
  
  // Mid Rim connections
  { from: 'eloria_system', to: 'sytha_system', time: 6, cost: 300 },
  { from: 'sytha_system', to: 'eloria_system', time: 6, cost: 300 },
  { from: 'verdholm_system', to: 'caldon_system', time: 5, cost: 250 },
  { from: 'caldon_system', to: 'verdholm_system', time: 5, cost: 250 },
  { from: 'sytha_system', to: 'karrn_system', time: 4, cost: 200 },
  { from: 'karrn_system', to: 'sytha_system', time: 4, cost: 200 },
  { from: 'casmer_system', to: 'myssia_system', time: 3, cost: 150 },
  { from: 'myssia_system', to: 'casmer_system', time: 3, cost: 150 },
  // Connect casmer/myssia to main network
  { from: 'eloria_system', to: 'casmer_system', time: 4, cost: 200 },
  { from: 'casmer_system', to: 'eloria_system', time: 4, cost: 200 },
  { from: 'verdholm_system', to: 'myssia_system', time: 5, cost: 250 },
  { from: 'myssia_system', to: 'verdholm_system', time: 5, cost: 250 },
  { from: 'glaiv_system', to: 'saldon_system', time: 4, cost: 200 },
  { from: 'saldon_system', to: 'glaiv_system', time: 4, cost: 200 },
  { from: 'vexhold_system', to: 'dustram_system', time: 3, cost: 150 },
  { from: 'dustram_system', to: 'vexhold_system', time: 3, cost: 150 },
  { from: 'veluron_system', to: 'caldon_system', time: 4, cost: 200 },
  { from: 'caldon_system', to: 'veluron_system', time: 4, cost: 200 },
  
  // Mid Rim to Expansion Region
  { from: 'sytha_system', to: 'sytha_reach_system', time: 5, cost: 250 },
  { from: 'sytha_reach_system', to: 'sytha_system', time: 5, cost: 250 },
  { from: 'highspire_system', to: 'tellan_system', time: 3, cost: 150 },
  { from: 'tellan_system', to: 'highspire_system', time: 3, cost: 150 },
  
  // Expansion Region to Outer Rim
  { from: 'sytha_reach_system', to: 'sytha_verge_system', time: 6, cost: 300 },
  { from: 'sytha_verge_system', to: 'sytha_reach_system', time: 6, cost: 300 },
  
  // Outer Rim connections
  { from: 'sytha_system', to: 'gravenmoor_system', time: 8, cost: 400 },
  { from: 'gravenmoor_system', to: 'sytha_system', time: 8, cost: 400 },
  { from: 'gravenmoor_system', to: 'cirruan_system', time: 7, cost: 350 },
  { from: 'cirruan_system', to: 'gravenmoor_system', time: 7, cost: 350 },
  { from: 'cirruan_system', to: 'rime_system', time: 6, cost: 300 },
  { from: 'rime_system', to: 'cirruan_system', time: 6, cost: 300 },
  { from: 'verdholm_system', to: 'verdance_system', time: 5, cost: 250 },
  { from: 'verdance_system', to: 'verdholm_system', time: 5, cost: 250 },
  { from: 'veshkar_system', to: 'verdholm_system', time: 7, cost: 350 },
  { from: 'verdholm_system', to: 'veshkar_system', time: 7, cost: 350 },
  { from: 'embervast_system', to: 'cirruan_system', time: 8, cost: 400 },
  { from: 'cirruan_system', to: 'embervast_system', time: 8, cost: 400 },
  { from: 'mawthorn_system', to: 'sytha_system', time: 10, cost: 500 },
  { from: 'sytha_system', to: 'mawthorn_system', time: 10, cost: 500 },
  { from: 'talveen_system', to: 'gravenmoor_system', time: 12, cost: 600 },
  { from: 'gravenmoor_system', to: 'talveen_system', time: 12, cost: 600 },
  { from: 'coralsec_system', to: 'sytha_system', time: 9, cost: 450 },
  { from: 'sytha_system', to: 'coralsec_system', time: 9, cost: 450 },
  { from: 'karrn_outer_system', to: 'gravenmoor_system', time: 6, cost: 300 },
  { from: 'gravenmoor_system', to: 'karrn_outer_system', time: 6, cost: 300 },
  { from: 'sytha_verge_system', to: 'sytha_deep_system', time: 5, cost: 250 },
  { from: 'sytha_deep_system', to: 'sytha_verge_system', time: 5, cost: 250 },
  { from: 'tethys_system', to: 'sytha_verge_system', time: 8, cost: 400 },
  { from: 'sytha_verge_system', to: 'tethys_system', time: 8, cost: 400 },
  { from: 'mirefen_system', to: 'verdance_system', time: 7, cost: 350 },
  { from: 'verdance_system', to: 'mirefen_system', time: 7, cost: 350 },
  { from: 'selvora_system', to: 'sytha_verge_system', time: 6, cost: 300 },
  { from: 'sytha_verge_system', to: 'selvora_system', time: 6, cost: 300 },
  { from: 'ordwell_system', to: 'cirruan_system', time: 5, cost: 250 },
  { from: 'cirruan_system', to: 'ordwell_system', time: 5, cost: 250 },
  { from: 'sinkport_system', to: 'sytha_deep_system', time: 6, cost: 300 },
  { from: 'sytha_deep_system', to: 'sinkport_system', time: 6, cost: 300 },
  
  // Outer Rim to Wild Space
  { from: 'sytha_deep_system', to: 'sytha_wilds_system', time: 8, cost: 400 },
  { from: 'sytha_wilds_system', to: 'sytha_deep_system', time: 8, cost: 400 },
  { from: 'nyxar_system', to: 'sytha_wilds_system', time: 10, cost: 500 },
  { from: 'sytha_wilds_system', to: 'nyxar_system', time: 10, cost: 500 },
  { from: 'kthala_system', to: 'sytha_wilds_system', time: 7, cost: 350 },
  { from: 'sytha_wilds_system', to: 'kthala_system', time: 7, cost: 350 },
  
  // Wild Space to Unknown Regions
  { from: 'sytha_wilds_system', to: 'sytha_fringe_system', time: 12, cost: 600 },
  { from: 'sytha_fringe_system', to: 'sytha_wilds_system', time: 12, cost: 600 },
  { from: 'esh_vael_system', to: 'sytha_fringe_system', time: 8, cost: 400 },
  { from: 'sytha_fringe_system', to: 'esh_vael_system', time: 8, cost: 400 },
  { from: 'vorne_reaches_system', to: 'sytha_fringe_system', time: 15, cost: 750 },
  { from: 'sytha_fringe_system', to: 'vorne_reaches_system', time: 15, cost: 750 },
];

// ============================================================================
// SEEDING FUNCTION
// ============================================================================

async function seedGalaxy() {
  try {
    console.log('Seeding galaxy data...');
    console.log(`  Systems: ${systemsData.length}`);
    console.log(`  Planets: ${planetsData.length}`);
    console.log(`  Routes: ${routesData.length}`);

    // Create star systems
    for (const systemData of systemsData) {
      const [system, created] = await StarSystem.findOrCreate({
        where: { id: systemData.id },
        defaults: {
          id: systemData.id,
          name: systemData.name,
          region: systemData.region,
          coordinates: systemData.coords,
          factionControl: systemData.faction,
          dangerLevel: systemData.danger,
          economyType: systemData.economy,
          population: systemData.population,
          description: `${systemData.name} is located in the ${systemData.region}.`
        }
      });

      if (created) {
        console.log(`  ✓ Created system: ${systemData.name}`);
      }
    }

    // Create planets
    for (const planetData of planetsData) {
      const [planet, created] = await Planet.findOrCreate({
        where: { id: planetData.id },
        defaults: {
          id: planetData.id,
          name: planetData.name,
          systemId: planetData.systemId,
          planetType: planetData.type,
          climate: planetData.climate,
          atmosphere: planetData.atmosphere,
          gravity: planetData.gravity,
          population: planetData.population,
          majorCities: planetData.cities || [],
          factionControl: planetData.faction,
          dangerLevel: planetData.danger,
          landingZones: planetData.cities && planetData.cities.length > 0 ? [
            { id: 'main', name: planetData.cities[0], x: 0, y: 0, area: 'landing_zone' }
          ] : [{ id: 'main', name: 'Landing Zone', x: 0, y: 0, area: 'landing_zone' }],
          description: `${planetData.name} is a ${planetData.type} planet${planetData.climate ? ` with a ${planetData.climate} climate` : ''}.`
        }
      });

      if (created) {
        console.log(`  ✓ Created planet: ${planetData.name}`);
      }
    }

    // Create travel routes
    for (const routeData of routesData) {
      const [route, created] = await TravelRoute.findOrCreate({
        where: {
          fromSystemId: routeData.from,
          toSystemId: routeData.to
        },
        defaults: {
          id: uuidv4(),
          fromSystemId: routeData.from,
          toSystemId: routeData.to,
          routeType: 'foldlane',
          travelTime: routeData.time,
          cost: routeData.cost,
          isActive: true
        }
      });

      if (created) {
        console.log(`  ✓ Created route: ${routeData.from} → ${routeData.to}`);
      }
    }

    console.log(`\n✓ Galaxy seeding completed!`);
    console.log(`  Total Systems: ${systemsData.length}`);
    console.log(`  Total Planets: ${planetsData.length}`);
    console.log(`  Total Routes: ${routesData.length}`);
  } catch (error) {
    console.error('✗ Error seeding galaxy:', error);
    throw error;
  }
}

module.exports = { seedGalaxy };
