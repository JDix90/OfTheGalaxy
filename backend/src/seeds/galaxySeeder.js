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
  { id: 'coruscant_system', name: 'Coruscant System', region: 'Core Worlds', coords: { x: -10, y: 5 }, faction: 'new_republic', danger: 1, economy: 'urban', population: 'urban' },
  { id: 'corellia_system', name: 'Corellia System', region: 'Core Worlds', coords: { x: 0, y: 0 }, faction: 'new_republic', danger: 2, economy: 'industrial', population: 'dense' },
  { id: 'alderaan_system', name: 'Alderaan System', region: 'Core Worlds', coords: { x: 5, y: -5 }, faction: 'new_republic', danger: 1, economy: 'agricultural', population: 'moderate' },
  { id: 'chandrila_system', name: 'Chandrila System', region: 'Core Worlds', coords: { x: -5, y: 10 }, faction: 'new_republic', danger: 1, economy: 'agricultural', population: 'moderate' },
  { id: 'kuat_system', name: 'Kuat System', region: 'Core Worlds', coords: { x: -8, y: -3 }, faction: 'new_republic', danger: 1, economy: 'industrial', population: 'dense' },
  { id: 'brentaal_system', name: 'Brentaal System', region: 'Core Worlds', coords: { x: -12, y: 8 }, faction: 'new_republic', danger: 1, economy: 'trade', population: 'dense' },
  { id: 'commenor_system', name: 'Commenor System', region: 'Core Worlds', coords: { x: 3, y: 7 }, faction: 'new_republic', danger: 1, economy: 'trade', population: 'moderate' },
  { id: 'ansion_system', name: 'Ansion System', region: 'Core Worlds', coords: { x: -7, y: 12 }, faction: 'new_republic', danger: 2, economy: 'agricultural', population: 'moderate' },
  
  // ========== COLONIES (Between Core and Inner Rim) ==========
  { id: 'eriadu_system', name: 'Eriadu System', region: 'Colonies', coords: { x: 8, y: -8 }, faction: 'imperial_remnant', danger: 3, economy: 'industrial', population: 'dense' },
  { id: 'fondor_system', name: 'Fondor System', region: 'Colonies', coords: { x: -15, y: 2 }, faction: 'new_republic', danger: 2, economy: 'industrial', population: 'dense' },
  { id: 'rendili_system', name: 'Rendili System', region: 'Colonies', coords: { x: 12, y: 3 }, faction: 'new_republic', danger: 2, economy: 'industrial', population: 'moderate' },
  
  // ========== INNER RIM (Well-developed, stable) ==========
  { id: 'mon_cala_system', name: 'Mon Cala System', region: 'Inner Rim', coords: { x: 15, y: -12 }, faction: 'new_republic', danger: 1, economy: 'trade', population: 'dense' },
  { id: 'rodia_system', name: 'Rodia System', region: 'Inner Rim', coords: { x: 18, y: -8 }, faction: 'new_republic', danger: 2, economy: 'agricultural', population: 'moderate' },
  { id: 'sullust_system', name: 'Sullust System', region: 'Inner Rim', coords: { x: 10, y: -15 }, faction: 'new_republic', danger: 2, economy: 'mining', population: 'moderate' },
  { id: 'bothawui_system', name: 'Bothawui System', region: 'Inner Rim', coords: { x: -18, y: -5 }, faction: 'new_republic', danger: 2, economy: 'trade', population: 'moderate' },
  { id: 'ithor_system', name: 'Ithor System', region: 'Inner Rim', coords: { x: 22, y: 5 }, faction: 'new_republic', danger: 1, economy: 'agricultural', population: 'sparse' },
  { id: 'dac_system', name: 'Dac System', region: 'Inner Rim', coords: { x: 16, y: -10 }, faction: 'new_republic', danger: 1, economy: 'trade', population: 'dense' },
  
  // ========== MID RIM (Moderate development) ==========
  { id: 'naboo_system', name: 'Naboo System', region: 'Mid Rim', coords: { x: 20, y: -15 }, faction: 'new_republic', danger: 1, economy: 'agricultural', population: 'moderate' },
  { id: 'kashyyyk_system', name: 'Kashyyyk System', region: 'Mid Rim', coords: { x: 25, y: 15 }, faction: 'new_republic', danger: 2, economy: 'agricultural', population: 'moderate' },
  { id: 'ryloth_system', name: 'Ryloth System', region: 'Mid Rim', coords: { x: 30, y: -20 }, faction: 'new_republic', danger: 3, economy: 'mining', population: 'moderate' },
  { id: 'geonosis_system', name: 'Geonosis System', region: 'Mid Rim', coords: { x: 35, y: -10 }, faction: 'independent', danger: 4, economy: 'mining', population: 'sparse' },
  { id: 'utapau_system', name: 'Utapau System', region: 'Mid Rim', coords: { x: 28, y: 8 }, faction: 'independent', danger: 2, economy: 'trade', population: 'moderate' },
  { id: 'felucia_system', name: 'Felucia System', region: 'Mid Rim', coords: { x: 32, y: -5 }, faction: 'independent', danger: 5, economy: 'agricultural', population: 'sparse' },
  { id: 'mygeeto_system', name: 'Mygeeto System', region: 'Mid Rim', coords: { x: 38, y: 12 }, faction: 'imperial_remnant', danger: 4, economy: 'mining', population: 'sparse' },
  { id: 'saleucami_system', name: 'Saleucami System', region: 'Mid Rim', coords: { x: 26, y: -18 }, faction: 'independent', danger: 3, economy: 'agricultural', population: 'moderate' },
  { id: 'cato_neimoidia_system', name: 'Cato Neimoidia System', region: 'Mid Rim', coords: { x: 24, y: 10 }, faction: 'independent', danger: 3, economy: 'trade', population: 'moderate' },
  { id: 'malastare_system', name: 'Malastare System', region: 'Mid Rim', coords: { x: 22, y: -12 }, faction: 'new_republic', danger: 2, economy: 'mining', population: 'moderate' },
  { id: 'onderon_system', name: 'Onderon System', region: 'Mid Rim', coords: { x: 40, y: -8 }, faction: 'new_republic', danger: 3, economy: 'agricultural', population: 'moderate' },
  { id: 'dantooine_system', name: 'Dantooine System', region: 'Mid Rim', coords: { x: 35, y: -25 }, faction: 'new_republic', danger: 2, economy: 'agricultural', population: 'sparse' },
  
  // ========== EXPANSION REGION (Less developed) ==========
  { id: 'ryloth_expansion_system', name: 'Ryloth Expansion System', region: 'Expansion Region', coords: { x: 45, y: -22 }, faction: 'new_republic', danger: 3, economy: 'mining', population: 'sparse' },
  { id: 'taris_system', name: 'Taris System', region: 'Expansion Region', coords: { x: 42, y: 15 }, faction: 'independent', danger: 4, economy: 'urban', population: 'moderate' },
  { id: 'telos_system', name: 'Telos System', region: 'Expansion Region', coords: { x: 48, y: -18 }, faction: 'new_republic', danger: 2, economy: 'agricultural', population: 'sparse' },
  
  // ========== OUTER RIM (Frontier, dangerous) ==========
  { id: 'tatooine_system', name: 'Tatooine System', region: 'Outer Rim', coords: { x: 50, y: -30 }, faction: 'hutt_cartel', danger: 4, economy: 'mining', population: 'sparse' },
  { id: 'hoth_system', name: 'Hoth System', region: 'Outer Rim', coords: { x: 60, y: 20 }, faction: null, danger: 6, economy: null, population: 'sparse' },
  { id: 'bespin_system', name: 'Bespin System', region: 'Outer Rim', coords: { x: 45, y: -10 }, faction: 'independent', danger: 3, economy: 'mining', population: 'moderate' },
  { id: 'endor_system', name: 'Endor System', region: 'Outer Rim', coords: { x: 40, y: 25 }, faction: 'new_republic', danger: 2, economy: null, population: 'sparse' },
  { id: 'mandalore_system', name: 'Mandalore System', region: 'Outer Rim', coords: { x: 55, y: 10 }, faction: 'mandalorian', danger: 5, economy: 'industrial', population: 'moderate' },
  { id: 'dathomir_system', name: 'Dathomir System', region: 'Outer Rim', coords: { x: 70, y: -40 }, faction: null, danger: 8, economy: null, population: 'sparse' },
  { id: 'mustafar_system', name: 'Mustafar System', region: 'Outer Rim', coords: { x: 65, y: -15 }, faction: 'imperial_remnant', danger: 9, economy: 'mining', population: 'sparse' },
  { id: 'scarif_system', name: 'Scarif System', region: 'Outer Rim', coords: { x: 45, y: -45 }, faction: 'imperial_remnant', danger: 7, economy: 'research', population: 'sparse' },
  { id: 'jakku_system', name: 'Jakku System', region: 'Outer Rim', coords: { x: 80, y: -50 }, faction: null, danger: 4, economy: 'mining', population: 'sparse' },
  { id: 'geonosis_outer_system', name: 'Geonosis Outer System', region: 'Outer Rim', coords: { x: 52, y: -25 }, faction: 'independent', danger: 5, economy: 'mining', population: 'sparse' },
  { id: 'ryloth_outer_system', name: 'Ryloth Outer System', region: 'Outer Rim', coords: { x: 58, y: -35 }, faction: 'new_republic', danger: 4, economy: 'mining', population: 'sparse' },
  { id: 'kamino_system', name: 'Kamino System', region: 'Outer Rim', coords: { x: 75, y: 5 }, faction: null, danger: 3, economy: 'research', population: 'sparse' },
  { id: 'dagobah_system', name: 'Dagobah System', region: 'Outer Rim', coords: { x: 62, y: 30 }, faction: null, danger: 6, economy: null, population: 'sparse' },
  { id: 'yavin_system', name: 'Yavin System', region: 'Outer Rim', coords: { x: 55, y: -40 }, faction: 'new_republic', danger: 3, economy: null, population: 'sparse' },
  { id: 'ord_mantell_system', name: 'Ord Mantell System', region: 'Outer Rim', coords: { x: 48, y: 18 }, faction: 'independent', danger: 4, economy: 'trade', population: 'moderate' },
  { id: 'nar_shaddaa_system', name: 'Nar Shaddaa System', region: 'Outer Rim', coords: { x: 68, y: -20 }, faction: 'hutt_cartel', danger: 6, economy: 'trade', population: 'dense' },
  { id: 'ryloth_deep_system', name: 'Ryloth Deep System', region: 'Outer Rim', coords: { x: 72, y: -28 }, faction: 'new_republic', danger: 5, economy: 'mining', population: 'sparse' },
  
  // ========== WILD SPACE (Unexplored, dangerous) ==========
  { id: 'ryloth_wild_system', name: 'Ryloth Wild System', region: 'Wild Space', coords: { x: 85, y: -35 }, faction: null, danger: 7, economy: null, population: 'sparse' },
  { id: 'exegol_system', name: 'Exegol System', region: 'Wild Space', coords: { x: 90, y: 10 }, faction: 'imperial_remnant', danger: 10, economy: null, population: 'sparse' },
  { id: 'ilum_system', name: 'Ilum System', region: 'Wild Space', coords: { x: 88, y: -15 }, faction: null, danger: 5, economy: 'mining', population: 'sparse' },
  
  // ========== UNKNOWN REGIONS (Mysterious, uncharted) ==========
  { id: 'ahch_to_system', name: 'Ahch-To System', region: 'Unknown Regions', coords: { x: 95, y: -5 }, faction: null, danger: 3, economy: null, population: 'sparse' },
  { id: 'ryloth_unknown_system', name: 'Ryloth Unknown System', region: 'Unknown Regions', coords: { x: 100, y: -25 }, faction: null, danger: 6, economy: null, population: 'sparse' },
  { id: 'chiss_space_system', name: 'Chiss Space System', region: 'Unknown Regions', coords: { x: 105, y: 15 }, faction: 'chiss', danger: 4, economy: 'research', population: 'moderate' },
];

// ============================================================================
// PLANETS DATA
// 86 planets total across all systems
// ============================================================================

const planetsData = [
  // ========== CORE WORLDS PLANETS ==========
  // Coruscant System
  { id: 'coruscant', systemId: 'coruscant_system', name: 'Coruscant', type: 'urban', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 1000000000000, cities: ['Galactic City', 'Uscru District', 'CoCo Town'], faction: 'new_republic', danger: 1 },
  
  // Corellia System
  { id: 'corellia', systemId: 'corellia_system', name: 'Corellia', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 3000000000, cities: ['Coronet', 'Doaba Guerfel', 'Tyrena'], faction: 'new_republic', danger: 2 },
  { id: 'drall', systemId: 'corellia_system', name: 'Drall', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.95, population: 500000000, cities: ['Brellyr'], faction: 'new_republic', danger: 1 },
  { id: 'selonia', systemId: 'corellia_system', name: 'Selonia', type: 'ocean', climate: 'temperate', atmosphere: 'breathable', gravity: 0.9, population: 100000000, cities: ['Hunchuzuc'], faction: 'new_republic', danger: 1 },
  
  // Alderaan System
  { id: 'alderaan', systemId: 'alderaan_system', name: 'Alderaan', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 2000000000, cities: ['Aldera', 'New Alderaan'], faction: 'new_republic', danger: 1 },
  
  // Chandrila System
  { id: 'chandrila', systemId: 'chandrila_system', name: 'Chandrila', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 1200000000, cities: ['Hanna City'], faction: 'new_republic', danger: 1 },
  
  // Kuat System
  { id: 'kuat', systemId: 'kuat_system', name: 'Kuat', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 8000000000, cities: ['Kuat City', 'Kuat Drive Yards'], faction: 'new_republic', danger: 1 },
  { id: 'kuat_moon', systemId: 'kuat_system', name: 'Kuat Moon', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.85, population: 50000000, cities: ['Lunar Base'], faction: 'new_republic', danger: 1 },
  
  // Brentaal System
  { id: 'brentaal', systemId: 'brentaal_system', name: 'Brentaal', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 1500000000, cities: ['Brentaal City'], faction: 'new_republic', danger: 1 },
  
  // Commenor System
  { id: 'commenor', systemId: 'commenor_system', name: 'Commenor', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 900000000, cities: ['Commenor City'], faction: 'new_republic', danger: 1 },
  
  // Ansion System
  { id: 'ansion', systemId: 'ansion_system', name: 'Ansion', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 600000000, cities: ['Cantras Gola'], faction: 'new_republic', danger: 2 },
  
  // ========== COLONIES PLANETS ==========
  // Eriadu System
  { id: 'eriadu', systemId: 'eriadu_system', name: 'Eriadu', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 22000000000, cities: ['Eriadu City'], faction: 'imperial_remnant', danger: 3 },
  
  // Fondor System
  { id: 'fondor', systemId: 'fondor_system', name: 'Fondor', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 5000000000, cities: ['Fondor City'], faction: 'new_republic', danger: 2 },
  
  // Rendili System
  { id: 'rendili', systemId: 'rendili_system', name: 'Rendili', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 1800000000, cities: ['Rendili City'], faction: 'new_republic', danger: 2 },
  
  // ========== INNER RIM PLANETS ==========
  // Mon Cala System
  { id: 'mon_cala', systemId: 'mon_cala_system', name: 'Mon Cala', type: 'ocean', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 27000000000, cities: ['Coral City', 'Heurkea'], faction: 'new_republic', danger: 1 },
  { id: 'dac', systemId: 'dac_system', name: 'Dac', type: 'ocean', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 25000000000, cities: ['Coral City'], faction: 'new_republic', danger: 1 },
  
  // Rodia System
  { id: 'rodia', systemId: 'rodia_system', name: 'Rodia', type: 'jungle', climate: 'tropical', atmosphere: 'breathable', gravity: 1.0, population: 1300000000, cities: ['Equator City'], faction: 'new_republic', danger: 2 },
  
  // Sullust System
  { id: 'sullust', systemId: 'sullust_system', name: 'Sullust', type: 'volcanic', climate: 'variable', atmosphere: 'breathable', gravity: 1.0, population: 10000000000, cities: ['Plesstila', 'Sullust City'], faction: 'new_republic', danger: 2 },
  
  // Bothawui System
  { id: 'bothawui', systemId: 'bothawui_system', name: 'Bothawui', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 3000000000, cities: ['Drev\'starn'], faction: 'new_republic', danger: 2 },
  
  // Ithor System
  { id: 'ithor', systemId: 'ithor_system', name: 'Ithor', type: 'jungle', climate: 'tropical', atmosphere: 'breathable', gravity: 0.9, population: 0, cities: [], faction: 'new_republic', danger: 1 },
  
  // ========== MID RIM PLANETS ==========
  // Naboo System
  { id: 'naboo', systemId: 'naboo_system', name: 'Naboo', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 4500000000, cities: ['Theed', 'Otoh Gunga'], faction: 'new_republic', danger: 1 },
  { id: 'naboo_moon', systemId: 'naboo_system', name: 'Naboo Moon', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.8, population: 0, cities: [], faction: null, danger: 2 },
  
  // Kashyyyk System
  { id: 'kashyyyk', systemId: 'kashyyyk_system', name: 'Kashyyyk', type: 'jungle', climate: 'tropical', atmosphere: 'breathable', gravity: 1.0, population: 45000000, cities: ['Kachirho', 'Rwookrrorro'], faction: 'new_republic', danger: 2 },
  
  // Ryloth System
  { id: 'ryloth', systemId: 'ryloth_system', name: 'Ryloth', type: 'terrestrial', climate: 'arid', atmosphere: 'breathable', gravity: 0.9, population: 1500000000, cities: ['Lessu', 'Kala\'uun'], faction: 'new_republic', danger: 3 },
  
  // Geonosis System
  { id: 'geonosis', systemId: 'geonosis_system', name: 'Geonosis', type: 'desert', climate: 'arid', atmosphere: 'breathable', gravity: 0.9, population: 100000000, cities: ['Stalgasin Hive'], faction: 'independent', danger: 4 },
  
  // Utapau System
  { id: 'utapau', systemId: 'utapau_system', name: 'Utapau', type: 'terrestrial', climate: 'arid', atmosphere: 'breathable', gravity: 0.9, population: 95000000, cities: ['Pau City'], faction: 'independent', danger: 2 },
  
  // Felucia System
  { id: 'felucia', systemId: 'felucia_system', name: 'Felucia', type: 'jungle', climate: 'tropical', atmosphere: 'breathable', gravity: 0.75, population: 0, cities: [], faction: 'independent', danger: 5 },
  
  // Mygeeto System
  { id: 'mygeeto', systemId: 'mygeeto_system', name: 'Mygeeto', type: 'ice', climate: 'frozen', atmosphere: 'breathable', gravity: 1.0, population: 19000000, cities: ['Mygeeto City'], faction: 'imperial_remnant', danger: 4 },
  
  // Saleucami System
  { id: 'saleucami', systemId: 'saleucami_system', name: 'Saleucami', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 3000000, cities: ['Saleucami City'], faction: 'independent', danger: 3 },
  
  // Cato Neimoidia System
  { id: 'cato_neimoidia', systemId: 'cato_neimoidia_system', name: 'Cato Neimoidia', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 1000000000, cities: ['Cato Neimoidia City'], faction: 'independent', danger: 3 },
  
  // Malastare System
  { id: 'malastare', systemId: 'malastare_system', name: 'Malastare', type: 'terrestrial', climate: 'arid', atmosphere: 'breathable', gravity: 1.0, population: 4000000000, cities: ['Malastare City'], faction: 'new_republic', danger: 2 },
  
  // Onderon System
  { id: 'onderon', systemId: 'onderon_system', name: 'Onderon', type: 'jungle', climate: 'tropical', atmosphere: 'breathable', gravity: 1.0, population: 5000000000, cities: ['Iziz'], faction: 'new_republic', danger: 3 },
  { id: 'dxun', systemId: 'onderon_system', name: 'Dxun', type: 'jungle', climate: 'tropical', atmosphere: 'breathable', gravity: 1.1, population: 0, cities: [], faction: null, danger: 4 },
  
  // Dantooine System
  { id: 'dantooine', systemId: 'dantooine_system', name: 'Dantooine', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 10000, cities: ['Khoonda'], faction: 'new_republic', danger: 2 },
  
  // ========== EXPANSION REGION PLANETS ==========
  // Ryloth Expansion System
  { id: 'ryloth_expansion', systemId: 'ryloth_expansion_system', name: 'Ryloth Expansion', type: 'terrestrial', climate: 'arid', atmosphere: 'breathable', gravity: 0.9, population: 500000, cities: ['Outpost Alpha'], faction: 'new_republic', danger: 3 },
  
  // Taris System
  { id: 'taris', systemId: 'taris_system', name: 'Taris', type: 'urban', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 6000000000, cities: ['Upper City', 'Lower City'], faction: 'independent', danger: 4 },
  
  // Telos System
  { id: 'telos', systemId: 'telos_system', name: 'Telos', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 1000000, cities: ['Telos City'], faction: 'new_republic', danger: 2 },
  
  // ========== OUTER RIM PLANETS ==========
  // Tatooine System
  { id: 'tatooine', systemId: 'tatooine_system', name: 'Tatooine', type: 'desert', climate: 'arid', atmosphere: 'breathable', gravity: 1.0, population: 200000, cities: ['Mos Eisley', 'Mos Espa', 'Anchorhead'], faction: 'hutt_cartel', danger: 4 },
  
  // Hoth System
  { id: 'hoth', systemId: 'hoth_system', name: 'Hoth', type: 'ice', climate: 'frozen', atmosphere: 'breathable', gravity: 1.1, population: 0, cities: [], faction: null, danger: 6 },
  
  // Bespin System
  { id: 'bespin', systemId: 'bespin_system', name: 'Bespin', type: 'gas_giant', climate: 'variable', atmosphere: 'breathable', gravity: 0.75, population: 6000000, cities: ['Cloud City'], faction: 'independent', danger: 3 },
  
  // Endor System
  { id: 'endor', systemId: 'endor_system', name: 'Endor', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.85, population: 30000000, cities: [], faction: 'new_republic', danger: 2 },
  
  // Mandalore System
  { id: 'mandalore', systemId: 'mandalore_system', name: 'Mandalore', type: 'terrestrial', climate: 'arid', atmosphere: 'breathable', gravity: 1.0, population: 4000000, cities: ['Keldabe', 'Sundari'], faction: 'mandalorian', danger: 5 },
  { id: 'concord_dawn', systemId: 'mandalore_system', name: 'Concord Dawn', type: 'terrestrial', climate: 'arid', atmosphere: 'breathable', gravity: 1.0, population: 500000, cities: ['Concord Dawn City'], faction: 'mandalorian', danger: 4 },
  
  // Dathomir System
  { id: 'dathomir', systemId: 'dathomir_system', name: 'Dathomir', type: 'jungle', climate: 'tropical', atmosphere: 'breathable', gravity: 0.9, population: 0, cities: [], faction: null, danger: 8 },
  
  // Mustafar System
  { id: 'mustafar', systemId: 'mustafar_system', name: 'Mustafar', type: 'volcanic', climate: 'variable', atmosphere: 'toxic', gravity: 1.2, population: 20000, cities: ['Fust', 'Mining Facility'], faction: 'imperial_remnant', danger: 9 },
  
  // Scarif System
  { id: 'scarif', systemId: 'scarif_system', name: 'Scarif', type: 'terrestrial', climate: 'tropical', atmosphere: 'breathable', gravity: 1.0, population: 0, cities: [], faction: 'imperial_remnant', danger: 7 },
  
  // Jakku System
  { id: 'jakku', systemId: 'jakku_system', name: 'Jakku', type: 'desert', climate: 'arid', atmosphere: 'breathable', gravity: 1.0, population: 5000, cities: ['Niima Outpost'], faction: null, danger: 4 },
  
  // Geonosis Outer System
  { id: 'geonosis_outer', systemId: 'geonosis_outer_system', name: 'Geonosis Outer', type: 'desert', climate: 'arid', atmosphere: 'breathable', gravity: 0.9, population: 50000, cities: ['Outer Hive'], faction: 'independent', danger: 5 },
  
  // Ryloth Outer System
  { id: 'ryloth_outer', systemId: 'ryloth_outer_system', name: 'Ryloth Outer', type: 'terrestrial', climate: 'arid', atmosphere: 'breathable', gravity: 0.9, population: 200000, cities: ['Outer Settlement'], faction: 'new_republic', danger: 4 },
  
  // Kamino System
  { id: 'kamino', systemId: 'kamino_system', name: 'Kamino', type: 'ocean', climate: 'temperate', atmosphere: 'breathable', gravity: 0.9, population: 1000000000, cities: ['Tipoca City'], faction: null, danger: 3 },
  
  // Dagobah System
  { id: 'dagobah', systemId: 'dagobah_system', name: 'Dagobah', type: 'jungle', climate: 'tropical', atmosphere: 'breathable', gravity: 1.0, population: 0, cities: [], faction: null, danger: 6 },
  
  // Yavin System
  { id: 'yavin_4', systemId: 'yavin_system', name: 'Yavin 4', type: 'jungle', climate: 'tropical', atmosphere: 'breathable', gravity: 0.9, population: 0, cities: [], faction: 'new_republic', danger: 3 },
  { id: 'yavin_prime', systemId: 'yavin_system', name: 'Yavin Prime', type: 'gas_giant', climate: 'variable', atmosphere: 'toxic', gravity: 2.5, population: 0, cities: [], faction: null, danger: 8 },
  
  // Ord Mantell System
  { id: 'ord_mantell', systemId: 'ord_mantell_system', name: 'Ord Mantell', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 5000000, cities: ['Worlport'], faction: 'independent', danger: 4 },
  
  // Nar Shaddaa System - The Smuggler's Moon
  { 
    id: 'nar_shaddaa', 
    systemId: 'nar_shaddaa_system', 
    name: 'Nar Shaddaa', 
    type: 'urban', 
    climate: 'variable', 
    atmosphere: 'breathable', 
    gravity: 1.0, 
    population: 85000000000, 
    cities: ['Nar Shaddaa City'], 
    faction: 'hutt_cartel', 
    danger: 6,
    description: 'Nar Shaddaa, the Smuggler\'s Moon, is a lawless urban world where credits rule and anything can be bought or sold. Neon-lit streets, towering skyscrapers, and shadowy alleys hide a thriving criminal underworld. From the opulent Entertainment District to the dangerous Lower Levels, this moon is a haven for smugglers, bounty hunters, and those who operate outside the law.',
    lore: 'Known throughout the galaxy as the Smuggler\'s Moon, Nar Shaddaa has been a hub of criminal activity for centuries. Controlled by the Hutt Cartel, the moon operates with its own rules where credits and power determine everything. The upper levels boast casinos, luxury cantinas, and the palaces of crime lords, while the lower levels are a warren of gangs, spice dens, and illegal markets. Despite its dangers, Nar Shaddaa attracts those seeking fortune, information, or simply a place where no questions are asked. The moon\'s spaceports see constant traffic from smugglers, pirates, and traders dealing in everything from legitimate goods to the most illegal contraband. Here, a person can disappear, make a fortune, or meet an untimely end—all in the same day.'
  },
  
  // Ryloth Deep System
  { id: 'ryloth_deep', systemId: 'ryloth_deep_system', name: 'Ryloth Deep', type: 'terrestrial', climate: 'arid', atmosphere: 'breathable', gravity: 0.9, population: 100000, cities: ['Deep Settlement'], faction: 'new_republic', danger: 5 },
  
  // ========== WILD SPACE PLANETS ==========
  // Ryloth Wild System
  { id: 'ryloth_wild', systemId: 'ryloth_wild_system', name: 'Ryloth Wild', type: 'terrestrial', climate: 'arid', atmosphere: 'breathable', gravity: 0.9, population: 0, cities: [], faction: null, danger: 7 },
  
  // Exegol System
  { id: 'exegol', systemId: 'exegol_system', name: 'Exegol', type: 'barren', climate: 'variable', atmosphere: 'toxic', gravity: 1.1, population: 0, cities: [], faction: 'imperial_remnant', danger: 10 },
  
  // Ilum System
  { id: 'ilum', systemId: 'ilum_system', name: 'Ilum', type: 'ice', climate: 'frozen', atmosphere: 'breathable', gravity: 1.0, population: 0, cities: [], faction: null, danger: 5 },
  
  // ========== UNKNOWN REGIONS PLANETS ==========
  // Ahch-To System
  { id: 'ahch_to', systemId: 'ahch_to_system', name: 'Ahch-To', type: 'ocean', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 0, cities: [], faction: null, danger: 3 },
  
  // Ryloth Unknown System
  { id: 'ryloth_unknown', systemId: 'ryloth_unknown_system', name: 'Ryloth Unknown', type: 'terrestrial', climate: 'arid', atmosphere: 'breathable', gravity: 0.9, population: 0, cities: [], faction: null, danger: 6 },
  
  // Chiss Space System
  { id: 'csilla', systemId: 'chiss_space_system', name: 'Csilla', type: 'ice', climate: 'frozen', atmosphere: 'breathable', gravity: 1.0, population: 2500000000, cities: ['Csaplar'], faction: 'chiss', danger: 4 },
  { id: 'naporar', systemId: 'chiss_space_system', name: 'Naporar', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 1.0, population: 500000000, cities: ['Naporar City'], faction: 'chiss', danger: 3 },
  
  // ========== ADDITIONAL PLANETS TO REACH 86 TOTAL ==========
  // Adding planets to existing systems and new systems
  
  // Coruscant System - additional planets
  { id: 'coruscant_moon', systemId: 'coruscant_system', name: 'Coruscant Moon', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.85, population: 50000000, cities: ['Lunar Base'], faction: 'new_republic', danger: 1 },
  
  // Alderaan System - moons
  { id: 'alderaan_moon_1', systemId: 'alderaan_system', name: 'Alderaan Moon I', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.8, population: 0, cities: [], faction: null, danger: 2 },
  
  // Kuat System - additional planets
  { id: 'kuat_2', systemId: 'kuat_system', name: 'Kuat II', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.95, population: 2000000000, cities: ['Kuat II City'], faction: 'new_republic', danger: 1 },
  
  // Mon Cala System - additional planets
  { id: 'mon_cala_moon', systemId: 'mon_cala_system', name: 'Mon Cala Moon', type: 'ocean', climate: 'temperate', atmosphere: 'breathable', gravity: 0.9, population: 50000000, cities: ['Lunar Station'], faction: 'new_republic', danger: 1 },
  
  // Rodia System - moons
  { id: 'rodia_moon', systemId: 'rodia_system', name: 'Rodia Moon', type: 'jungle', climate: 'tropical', atmosphere: 'breathable', gravity: 0.85, population: 0, cities: [], faction: null, danger: 3 },
  
  // Sullust System - additional planets
  { id: 'sullust_moon', systemId: 'sullust_system', name: 'Sullust Moon', type: 'volcanic', climate: 'variable', atmosphere: 'breathable', gravity: 0.8, population: 1000000, cities: ['Lunar Base'], faction: 'new_republic', danger: 3 },
  
  // Bothawui System - moons
  { id: 'bothawui_moon', systemId: 'bothawui_system', name: 'Bothawui Moon', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.9, population: 500000, cities: ['Lunar Outpost'], faction: 'new_republic', danger: 2 },
  
  // Geonosis System - additional planets
  { id: 'geonosis_moon', systemId: 'geonosis_system', name: 'Geonosis Moon', type: 'desert', climate: 'arid', atmosphere: 'breathable', gravity: 0.85, population: 0, cities: [], faction: null, danger: 5 },
  
  // Utapau System - additional planets
  { id: 'utapau_moon', systemId: 'utapau_system', name: 'Utapau Moon', type: 'terrestrial', climate: 'arid', atmosphere: 'breathable', gravity: 0.85, population: 0, cities: [], faction: null, danger: 3 },
  
  // Felucia System - additional planets
  { id: 'felucia_moon', systemId: 'felucia_system', name: 'Felucia Moon', type: 'jungle', climate: 'tropical', atmosphere: 'breathable', gravity: 0.7, population: 0, cities: [], faction: null, danger: 6 },
  
  // Mygeeto System - additional planets
  { id: 'mygeeto_moon', systemId: 'mygeeto_system', name: 'Mygeeto Moon', type: 'ice', climate: 'frozen', atmosphere: 'breathable', gravity: 0.9, population: 0, cities: [], faction: null, danger: 5 },
  
  // Saleucami System - additional planets
  { id: 'saleucami_moon', systemId: 'saleucami_system', name: 'Saleucami Moon', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.95, population: 0, cities: [], faction: null, danger: 4 },
  
  // Cato Neimoidia System - additional planets
  { id: 'cato_neimoidia_moon', systemId: 'cato_neimoidia_system', name: 'Cato Neimoidia Moon', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.9, population: 500000, cities: ['Lunar Base'], faction: 'independent', danger: 3 },
  
  // Malastare System - additional planets
  { id: 'malastare_moon', systemId: 'malastare_system', name: 'Malastare Moon', type: 'terrestrial', climate: 'arid', atmosphere: 'breathable', gravity: 0.9, population: 1000000, cities: ['Lunar Outpost'], faction: 'new_republic', danger: 2 },
  
  // Tatooine System - additional planets
  { id: 'tatooine_moon', systemId: 'tatooine_system', name: 'Tatooine Moon', type: 'desert', climate: 'arid', atmosphere: 'breathable', gravity: 0.85, population: 0, cities: [], faction: null, danger: 5 },
  
  // Hoth System - additional planets
  { id: 'hoth_moon', systemId: 'hoth_system', name: 'Hoth Moon', type: 'ice', climate: 'frozen', atmosphere: 'breathable', gravity: 0.9, population: 0, cities: [], faction: null, danger: 7 },
  
  // Bespin System - additional planets (gas giant moons)
  { id: 'bespin_moon_1', systemId: 'bespin_system', name: 'Bespin Moon I', type: 'terrestrial', climate: 'variable', atmosphere: 'breathable', gravity: 0.7, population: 0, cities: [], faction: null, danger: 4 },
  
  // Endor System - additional planets
  { id: 'endor_moon', systemId: 'endor_system', name: 'Endor Moon', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.8, population: 0, cities: [], faction: null, danger: 3 },
  
  // Kamino System - additional planets
  { id: 'kamino_moon', systemId: 'kamino_system', name: 'Kamino Moon', type: 'ocean', climate: 'temperate', atmosphere: 'breathable', gravity: 0.85, population: 0, cities: [], faction: null, danger: 4 },
  
  // Dagobah System - additional planets
  { id: 'dagobah_moon', systemId: 'dagobah_system', name: 'Dagobah Moon', type: 'jungle', climate: 'tropical', atmosphere: 'breathable', gravity: 0.95, population: 0, cities: [], faction: null, danger: 7 },
  
  // Yavin System - additional planets
  { id: 'yavin_8', systemId: 'yavin_system', name: 'Yavin 8', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.9, population: 0, cities: [], faction: null, danger: 4 },
  
  // Ord Mantell System - additional planets
  { id: 'ord_mantell_moon', systemId: 'ord_mantell_system', name: 'Ord Mantell Moon', type: 'terrestrial', climate: 'temperate', atmosphere: 'breathable', gravity: 0.9, population: 500000, cities: ['Lunar Port'], faction: 'independent', danger: 4 },
  
  // Nar Shaddaa System - additional planets
  { id: 'nar_shaddaa_moon', systemId: 'nar_shaddaa_system', name: 'Nar Shaddaa Moon', type: 'urban', climate: 'variable', atmosphere: 'breathable', gravity: 0.9, population: 50000000, cities: ['Lunar City'], faction: 'hutt_cartel', danger: 6 },
  
  // Ilum System - additional planets
  { id: 'ilum_moon', systemId: 'ilum_system', name: 'Ilum Moon', type: 'ice', climate: 'frozen', atmosphere: 'breathable', gravity: 0.9, population: 0, cities: [], faction: null, danger: 6 },
  
  // Ahch-To System - additional planets
  { id: 'ahch_to_moon', systemId: 'ahch_to_system', name: 'Ahch-To Moon', type: 'ocean', climate: 'temperate', atmosphere: 'breathable', gravity: 0.9, population: 0, cities: [], faction: null, danger: 4 },
];

// ============================================================================
// TRAVEL ROUTES DATA
// Hyperlanes connecting systems
// ============================================================================

const routesData = [
  // Core Worlds connections
  { from: 'coruscant_system', to: 'corellia_system', time: 2, cost: 100 },
  { from: 'corellia_system', to: 'coruscant_system', time: 2, cost: 100 },
  { from: 'coruscant_system', to: 'alderaan_system', time: 3, cost: 150 },
  { from: 'alderaan_system', to: 'coruscant_system', time: 3, cost: 150 },
  { from: 'chandrila_system', to: 'coruscant_system', time: 2, cost: 100 },
  { from: 'coruscant_system', to: 'chandrila_system', time: 2, cost: 100 },
  { from: 'kuat_system', to: 'coruscant_system', time: 2, cost: 100 },
  { from: 'coruscant_system', to: 'kuat_system', time: 2, cost: 100 },
  { from: 'brentaal_system', to: 'coruscant_system', time: 3, cost: 150 },
  { from: 'coruscant_system', to: 'brentaal_system', time: 3, cost: 150 },
  { from: 'commenor_system', to: 'corellia_system', time: 2, cost: 100 },
  { from: 'corellia_system', to: 'commenor_system', time: 2, cost: 100 },
  
  // Core to Colonies
  { from: 'kuat_system', to: 'fondor_system', time: 3, cost: 150 },
  { from: 'fondor_system', to: 'kuat_system', time: 3, cost: 150 },
  { from: 'corellia_system', to: 'eriadu_system', time: 4, cost: 200 },
  { from: 'eriadu_system', to: 'corellia_system', time: 4, cost: 200 },
  
  // Colonies to Inner Rim
  { from: 'fondor_system', to: 'mon_cala_system', time: 4, cost: 200 },
  { from: 'mon_cala_system', to: 'fondor_system', time: 4, cost: 200 },
  { from: 'rendili_system', to: 'bothawui_system', time: 5, cost: 250 },
  { from: 'bothawui_system', to: 'rendili_system', time: 5, cost: 250 },
  
  // Inner Rim connections
  { from: 'mon_cala_system', to: 'dac_system', time: 1, cost: 50 },
  { from: 'dac_system', to: 'mon_cala_system', time: 1, cost: 50 },
  { from: 'rodia_system', to: 'sullust_system', time: 3, cost: 150 },
  { from: 'sullust_system', to: 'rodia_system', time: 3, cost: 150 },
  { from: 'bothawui_system', to: 'ithor_system', time: 4, cost: 200 },
  { from: 'ithor_system', to: 'bothawui_system', time: 4, cost: 200 },
  
  // Inner Rim to Mid Rim
  { from: 'mon_cala_system', to: 'naboo_system', time: 5, cost: 250 },
  { from: 'naboo_system', to: 'mon_cala_system', time: 5, cost: 250 },
  { from: 'corellia_system', to: 'naboo_system', time: 5, cost: 250 },
  { from: 'naboo_system', to: 'corellia_system', time: 5, cost: 250 },
  { from: 'chandrila_system', to: 'kashyyyk_system', time: 4, cost: 200 },
  { from: 'kashyyyk_system', to: 'chandrila_system', time: 4, cost: 200 },
  
  // Mid Rim connections
  { from: 'naboo_system', to: 'ryloth_system', time: 6, cost: 300 },
  { from: 'ryloth_system', to: 'naboo_system', time: 6, cost: 300 },
  { from: 'kashyyyk_system', to: 'dantooine_system', time: 5, cost: 250 },
  { from: 'dantooine_system', to: 'kashyyyk_system', time: 5, cost: 250 },
  { from: 'ryloth_system', to: 'geonosis_system', time: 4, cost: 200 },
  { from: 'geonosis_system', to: 'ryloth_system', time: 4, cost: 200 },
  { from: 'utapau_system', to: 'felucia_system', time: 3, cost: 150 },
  { from: 'felucia_system', to: 'utapau_system', time: 3, cost: 150 },
  // Connect utapau/felucia to main network
  { from: 'naboo_system', to: 'utapau_system', time: 4, cost: 200 },
  { from: 'utapau_system', to: 'naboo_system', time: 4, cost: 200 },
  { from: 'kashyyyk_system', to: 'felucia_system', time: 5, cost: 250 },
  { from: 'felucia_system', to: 'kashyyyk_system', time: 5, cost: 250 },
  { from: 'mygeeto_system', to: 'saleucami_system', time: 4, cost: 200 },
  { from: 'saleucami_system', to: 'mygeeto_system', time: 4, cost: 200 },
  { from: 'cato_neimoidia_system', to: 'malastare_system', time: 3, cost: 150 },
  { from: 'malastare_system', to: 'cato_neimoidia_system', time: 3, cost: 150 },
  { from: 'onderon_system', to: 'dantooine_system', time: 4, cost: 200 },
  { from: 'dantooine_system', to: 'onderon_system', time: 4, cost: 200 },
  
  // Mid Rim to Expansion Region
  { from: 'ryloth_system', to: 'ryloth_expansion_system', time: 5, cost: 250 },
  { from: 'ryloth_expansion_system', to: 'ryloth_system', time: 5, cost: 250 },
  { from: 'taris_system', to: 'telos_system', time: 3, cost: 150 },
  { from: 'telos_system', to: 'taris_system', time: 3, cost: 150 },
  
  // Expansion Region to Outer Rim
  { from: 'ryloth_expansion_system', to: 'ryloth_outer_system', time: 6, cost: 300 },
  { from: 'ryloth_outer_system', to: 'ryloth_expansion_system', time: 6, cost: 300 },
  
  // Outer Rim connections
  { from: 'ryloth_system', to: 'tatooine_system', time: 8, cost: 400 },
  { from: 'tatooine_system', to: 'ryloth_system', time: 8, cost: 400 },
  { from: 'tatooine_system', to: 'bespin_system', time: 7, cost: 350 },
  { from: 'bespin_system', to: 'tatooine_system', time: 7, cost: 350 },
  { from: 'bespin_system', to: 'hoth_system', time: 6, cost: 300 },
  { from: 'hoth_system', to: 'bespin_system', time: 6, cost: 300 },
  { from: 'kashyyyk_system', to: 'endor_system', time: 5, cost: 250 },
  { from: 'endor_system', to: 'kashyyyk_system', time: 5, cost: 250 },
  { from: 'mandalore_system', to: 'kashyyyk_system', time: 7, cost: 350 },
  { from: 'kashyyyk_system', to: 'mandalore_system', time: 7, cost: 350 },
  { from: 'mustafar_system', to: 'bespin_system', time: 8, cost: 400 },
  { from: 'bespin_system', to: 'mustafar_system', time: 8, cost: 400 },
  { from: 'dathomir_system', to: 'ryloth_system', time: 10, cost: 500 },
  { from: 'ryloth_system', to: 'dathomir_system', time: 10, cost: 500 },
  { from: 'jakku_system', to: 'tatooine_system', time: 12, cost: 600 },
  { from: 'tatooine_system', to: 'jakku_system', time: 12, cost: 600 },
  { from: 'scarif_system', to: 'ryloth_system', time: 9, cost: 450 },
  { from: 'ryloth_system', to: 'scarif_system', time: 9, cost: 450 },
  { from: 'geonosis_outer_system', to: 'tatooine_system', time: 6, cost: 300 },
  { from: 'tatooine_system', to: 'geonosis_outer_system', time: 6, cost: 300 },
  { from: 'ryloth_outer_system', to: 'ryloth_deep_system', time: 5, cost: 250 },
  { from: 'ryloth_deep_system', to: 'ryloth_outer_system', time: 5, cost: 250 },
  { from: 'kamino_system', to: 'ryloth_outer_system', time: 8, cost: 400 },
  { from: 'ryloth_outer_system', to: 'kamino_system', time: 8, cost: 400 },
  { from: 'dagobah_system', to: 'endor_system', time: 7, cost: 350 },
  { from: 'endor_system', to: 'dagobah_system', time: 7, cost: 350 },
  { from: 'yavin_system', to: 'ryloth_outer_system', time: 6, cost: 300 },
  { from: 'ryloth_outer_system', to: 'yavin_system', time: 6, cost: 300 },
  { from: 'ord_mantell_system', to: 'bespin_system', time: 5, cost: 250 },
  { from: 'bespin_system', to: 'ord_mantell_system', time: 5, cost: 250 },
  { from: 'nar_shaddaa_system', to: 'ryloth_deep_system', time: 6, cost: 300 },
  { from: 'ryloth_deep_system', to: 'nar_shaddaa_system', time: 6, cost: 300 },
  
  // Outer Rim to Wild Space
  { from: 'ryloth_deep_system', to: 'ryloth_wild_system', time: 8, cost: 400 },
  { from: 'ryloth_wild_system', to: 'ryloth_deep_system', time: 8, cost: 400 },
  { from: 'exegol_system', to: 'ryloth_wild_system', time: 10, cost: 500 },
  { from: 'ryloth_wild_system', to: 'exegol_system', time: 10, cost: 500 },
  { from: 'ilum_system', to: 'ryloth_wild_system', time: 7, cost: 350 },
  { from: 'ryloth_wild_system', to: 'ilum_system', time: 7, cost: 350 },
  
  // Wild Space to Unknown Regions
  { from: 'ryloth_wild_system', to: 'ryloth_unknown_system', time: 12, cost: 600 },
  { from: 'ryloth_unknown_system', to: 'ryloth_wild_system', time: 12, cost: 600 },
  { from: 'ahch_to_system', to: 'ryloth_unknown_system', time: 8, cost: 400 },
  { from: 'ryloth_unknown_system', to: 'ahch_to_system', time: 8, cost: 400 },
  { from: 'chiss_space_system', to: 'ryloth_unknown_system', time: 15, cost: 750 },
  { from: 'ryloth_unknown_system', to: 'chiss_space_system', time: 15, cost: 750 },
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
          routeType: 'hyperlane',
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
