#!/usr/bin/env node
/**
 * build-term-map.js  —  Generates term-map.json for the Star Wars -> "The Severed
 * Reach" rebrand, from explicit, reviewable mapping tables.
 *
 * Output has two maps consumed by apply-rebrand.js:
 *   display     : case-SENSITIVE, capitalized prose/name terms. Boundary = letters.
 *   identifiers : lowercase snake_case id/tag tokens. Boundary = [A-Za-z0-9].
 *
 * Design notes:
 *  - lightsaber/blaster appear lowercase in BOTH prose and ids and map to the same
 *    value, so they live in `identifiers` (matches prose + ids in one pass).
 *  - camelCase property keys (forceAlignment, forceSensitive) are intentionally
 *    NOT renamed: the [A-Za-z0-9] right-boundary means token "force" never matches
 *    inside "forceAlignment". They are internal, generic, and carry no IP.
 *  - bare lowercase "force" is NOT mapped (would hit the English verb in prose);
 *    only the concrete force_* id tags are mapped explicitly.
 *  - Galactic region names (Outer Rim, Core Worlds, ...) are kept — generic
 *    space-opera geography, consistent with keeping the outer_rim_settlers faction.
 */

const fs = require('fs');
const path = require('path');

// ── Planets: [swId, swName, newId, newName].  Moons/systems/cities cascade from
//    these base tokens; numbered/compound bodies get explicit overrides below.
const PLANETS = [
  ['coruscant',      'Coruscant',      'centralis',  'Centralis'],
  ['corellia',       'Corellia',       'drydock',    'Drydock'],
  ['drall',          'Drall',          'brae',       'Brae'],
  ['selonia',        'Selonia',        'mereth',     'Mereth'],
  ['alderaan',       'Alderaan',       'caelmore',   'Caelmore'],
  ['chandrila',      'Chandrila',      'solenne',    'Solenne'],
  ['kuat',           'Kuat',           'forgeline',  'Forgeline'],
  ['brentaal',       'Brentaal',       'tradewell',  'Tradewell'],
  ['commenor',       'Commenor',       'coriane',    'Coriane'],
  ['ansion',         'Ansion',         'greyfield',  'Greyfield'],
  ['eriadu',         'Eriadu',         'greld',      'Greld'],
  ['fondor',         'Fondor',         'anvret',     'Anvret'],
  ['rendili',        'Rendili',        'dolmark',    'Dolmark'],
  ['mon_cala',       'Mon Cala',       'thessmar',   'Thessmar'],
  ['dac',            'Dac',            'dorrun',     'Dorrun'],
  ['rodia',          'Rodia',          'vashqa',     'Vashqa'],
  ['sullust',        'Sullust',        'pyrren',     'Pyrren'],
  ['bothawui',       'Bothawui',       'renqa',      'Renqa'],
  ['ithor',          'Ithor',          'greenholt',  'Greenholt'],
  ['naboo',          'Naboo',          'eloria',     'Eloria'],
  ['kashyyyk',       'Kashyyyk',       'verdholm',   'Verdholm'],
  ['ryloth',         'Ryloth',         'sytha',      'Sytha'],
  ['geonosis',       'Geonosis',       'karrn',      'Karrn'],
  ['utapau',         'Utapau',         'casmer',     'Casmer'],
  ['felucia',        'Felucia',        'myssia',     'Myssia'],
  ['mygeeto',        'Mygeeto',        'glaiv',      'Glaiv'],
  ['saleucami',      'Saleucami',      'saldon',     'Saldon'],
  ['cato_neimoidia', 'Cato Neimoidia', 'vexhold',    'Vexhold'],
  ['malastare',      'Malastare',      'dustram',    'Dustram'],
  ['onderon',        'Onderon',        'veluron',    'Veluron'],
  ['dxun',           'Dxun',           'drask',      'Drask'],
  ['dantooine',      'Dantooine',      'caldon',     'Caldon'],
  ['taris',          'Taris',          'highspire',  'Highspire'],
  ['telos',          'Telos',          'tellan',     'Tellan'],
  ['tatooine',       'Tatooine',       'gravenmoor', 'Gravenmoor'],
  ['hoth',           'Hoth',           'rime',       'Rime'],
  ['bespin',         'Bespin',         'cirruan',    'Cirruan'],
  ['endor',          'Endor',          'verdance',   'Verdance'],
  ['mandalore',      'Mandalore',      'veshkar',    'Veshkar'],
  ['dathomir',       'Dathomir',       'mawthorn',   'Mawthorn'],
  ['mustafar',       'Mustafar',       'embervast',  'Embervast'],
  ['scarif',         'Scarif',         'coralsec',   'Coralsec'],
  ['jakku',          'Jakku',          'talveen',    'Talveen'],
  ['kamino',         'Kamino',         'tethys',     'Tethys'],
  ['dagobah',        'Dagobah',        'mirefen',    'Mirefen'],
  ['yavin',          'Yavin',          'selvora',    'Selvora'],
  ['ord_mantell',    'Ord Mantell',    'ordwell',    'Ordwell'],
  ['nar_shaddaa',    'Nar Shaddaa',    'sinkport',   'Sinkport'],
  ['exegol',         'Exegol',         'nyxar',      'Nyxar'],
  ['ilum',           'Ilum',           'kthala',     'Kthala'],
  ['ahch_to',        'Ahch-To',        'esh_vael',   'Esh-Vael'],
  ['csilla',         'Csilla',         'vornhal',    'Vornhal'],
  ['naporar',        'Naporar',        'naveth',     'Naveth'],
];

// Compound/numbered bodies that must beat their base token (longest-match-first).
const PLANET_SPECIAL_DISPLAY = {
  'Ryloth Expansion': 'Sytha Reach',
  'Ryloth Outer':     'Sytha Verge',
  'Ryloth Deep':      'Sytha Deep',
  'Ryloth Wild':      'Sytha Wilds',
  'Ryloth Unknown':   'Sytha Fringe',
  'Geonosis Outer':   'Karrn Outer',
  'Chiss Space':      'Vorne Reaches',
  'Yavin 4':          'Selvora IV',
  'Yavin 8':          'Selvora VIII',
  'Yavin Prime':      'Selvora',
  'Kuat II':          'Forgeline II',
  'Alderaan Moon I':  'Caelmore Moon I',
  'Bespin Moon I':    'Cirruan Moon I',
};
const PLANET_SPECIAL_IDS = {
  'ryloth_expansion': 'sytha_reach',
  'ryloth_outer':     'sytha_verge',
  'ryloth_deep':      'sytha_deep',
  'ryloth_wild':      'sytha_wilds',
  'ryloth_unknown':   'sytha_fringe',
  'geonosis_outer':   'karrn_outer',
  'chiss_space':      'vorne_reaches',
  'concord_dawn':     'dawnmark',
};

// ── Mystic order / the Veil (display, case-sensitive).
const ORDER_DISPLAY = {
  'Force-sensitive': 'Veil-touched',
  'Force-Sensitive': 'Veil-Touched',
  'Force sensitivity': 'Veil sensitivity',
  'Force Sensitivity': 'Veil Sensitivity',
  'the Force': 'the Veil',
  'The Force': 'The Veil',
  'Force': 'Veil',
  'dark side': 'Torn Veil',
  'Dark Side': 'Torn Veil',
  'light side': 'Woven Veil',
  'Light Side': 'Woven Veil',
  'Jedi Order': 'Keeper Order',
  'Jedi Temple': 'Keeper Sanctum',
  'Jedi': 'Keeper',
  'Sith': 'Hollow',
};

// ── Factions (display).
const FACTION_DISPLAY = {
  'New Republic': 'Concord',
  'Galactic Republic': 'Old Concord',
  'Old Republic': 'Old Concord',
  'Republic': 'Concord',
  'Galactic Empire': 'Iron Dominion',
  'Empire': 'Iron Dominion',
  'Imperial Remnant': 'Dominion Remnant',
  'Imperial': 'Dominion',
  'Rebel Alliance': 'Free Worlds',
  'Mandalorians': 'Ironkin',
  'Mandalorian': 'Ironkin',
  'Hutt Cartel': 'Vorr Cartel',
  'Hutts': 'Vorr',
  'Hutt': 'Vorr',
  'Smugglers Guild': 'Drift Cartel',
  "Smugglers' Guild": 'Drift Cartel',
  "Smuggler's Guild": 'Drift Cartel',
  'Chiss Ascendancy': 'Vorne Ascendancy',
  // Sequel-era + underworld factions (drop leading "the" so "the X" stays clean)
  'First Order': 'Ascendancy',
  'Black Sun': 'Umbra',
  'Crimson Dawn': 'Scarlet Tide',
  'Separatists': 'Secessionists', 'Separatist': 'Secessionist',
  'Resistance': 'Uprising',
  'Trade Federation': 'Commerce League',
  'Hapes Consortium': 'Hesperan Consortium', 'Hapes': 'Hesper',
};

// ── Species (display).
const SPECIES_DISPLAY = {
  "Twi'lek": 'Sytheen', "Twi'leks": 'Sytheen', 'Twilek': 'Sytheen',
  'Mon Calamari': 'Sennari', 'Mon Calamarian': 'Sennari',
  'Quarren': 'Dovrek',
  'Tauntauns': 'Ridgebacks', 'Tauntaun': 'Ridgeback',
  'Wookiee': 'Ursk', 'Wookiees': 'Ursk',
  'Zabrak': 'Karnaki', 'Zabraks': 'Karnaki',
  'Chiss': 'Vorne',
  'Rodian': 'Skarn', 'Rodians': 'Skarn',
  'Mirialan': 'Jeharu', 'Mirialans': 'Jeharu',
  'Togruta': 'Sethari',
  'Ewok': 'Brindle', 'Ewoks': 'Brindle',
  'Bothan': 'Renai', 'Bothans': 'Renai',
  'Gungan': 'Marrow', 'Gungans': 'Marrow',
  'Sullustan': 'Dell', 'Sullustans': 'Dell',
  'Trandoshan': 'Skrag', 'Trandoshans': 'Skrag',
};

// ── Weapons / tech / institutions / enemies / eras (display).
const TECH_DISPLAY = {
  'Lightsaber': 'Arcblade', 'Lightsabers': 'Arcblades',
  'Blaster': 'Pulser', 'Blasters': 'Pulsers',
  'Vibroblade': 'Shock-blade', 'Vibroblades': 'Shock-blades',
  'Bacta': 'Regen', 'Kolto': 'Hexol',   // SW healing substances
  'Hyperspace': 'Foldspace',
  'Hyperlane': 'Fold-lane', 'Hyperlanes': 'Fold-lanes',
  'Hyperdrive': 'Folddrive', 'Hyperdrives': 'Folddrives',
  'Galactic Senate': 'Concord Assembly',
  'Senate': 'Assembly',
  'Stormtroopers': 'Ironclads', 'Stormtrooper': 'Ironclad',
  'Galactic Civil War': 'Severing War',
  'Clone Wars': 'Forge Wars', 'Clone War': 'Forge War',
  // Weapon model codes -> original codes
  'E-11s': 'L-11s', 'E-11': 'L-11', 'DL-44': 'VK-7', 'A-280': 'RK-9', 'A280': 'RK-9',
};

// ── Article-agreement fixes (must out-rank the bare term by length).
const ARTICLE_DISPLAY = {
  'an Imperial': 'a Dominion', 'An Imperial': 'A Dominion',
  'a stormtrooper': 'an ironclad', 'A stormtrooper': 'An ironclad',
};

// ── Creatures, places, characters (display).
const FLAVOR_DISPLAY = {
  'Krayt Dragon': 'Dune Wyrm', 'Krayt dragon': 'Dune wyrm',
  'Krayt': 'Wyrm',
  'Kinrath': 'Venox',
  'Banthas': 'Grazers', 'Bantha': 'Grazer',
  'Tusken Raiders': 'Dune Nomads', 'Tusken Raider': 'Dune Nomad', 'Tusken': 'Dune Nomad',
  'Jawas': 'Skritchers', 'Jawa': 'Skritcher',
  'Rancor': 'Gravox',
  'Sarlacc': 'Devourer',
  'Mos Eisley': 'Greywell',
  'Mos Espa': 'Dustreach',
  'Galactic City': 'Central Spire',
  'CoCo Town': 'Lowmarket',
  'Uscru': 'Nightrun',
  'Jabba': 'Vorga',
  'Owen Lars': 'Owen Marn',
  'Lars': 'Marn',
  // Named SW characters/places embedded in quest/item/POI content
  'Luke Skywalker': 'Dav Marn', 'Skywalker': 'Marn',
  'Han Solo': 'Rann Vetch',
  "Vader's Castle": "Korrth's Keep", 'Vader': 'Korrth',
  'Tarkin Estate': 'Vethan Estate', 'Tarkin': 'Vethan',
  'Lessu': 'Sythmar',          // Ryloth's capital city -> Sytha's capital
  'Jundland': 'Sunder',        // "Jundland Wastes" -> "Sunder Wastes"
  // ALL-CAPS planet constants (items.js comment headers / enum-style refs)
  'CORUSCANT': 'CENTRALIS', 'TATOOINE': 'GRAVENMOOR', 'DANTOOINE': 'CALDON',
  'RYLOTH': 'SYTHA', 'NAR_SHADDAA': 'SINKPORT', 'NABOO': 'ELORIA',
  'HOTH': 'RIME', 'ENDOR': 'VERDANCE', 'KASHYYYK': 'VERDHOLM',
  'MUSTAFAR': 'EMBERVAST', 'BESPIN': 'CIRRUAN',
};

// ── Identifiers (lowercase snake_case tokens).
const FACTION_IDS = {
  'new_republic': 'concord',
  'galactic_republic': 'old_concord',
  'republic_military': 'concord_vanguard',
  'imperial_remnant': 'dominion_remnant',
  'galactic_empire': 'iron_dominion',
  'imperial': 'dominion',
  'rebel_alliance': 'free_worlds',
  'mandalorians': 'ironkin', 'mandalorian': 'ironkin',
  'hutt_cartel': 'vorr_cartel',
  'hutts': 'vorr', 'hutt': 'vorr',
  'smugglers_guild': 'drift_cartel',
  'smugglers_alliance': 'drift_alliance',
  'bounty_hunters': 'the_tally',
  // Sequel-era + underworld faction ids (NOTE: 'resistance' is handled
  // surgically elsewhere — it collides with the combat stat "resistance").
  'first_order': 'ascendancy',
  'black_sun': 'umbra',
  'crimson_dawn': 'scarlet_tide',
  'separatists': 'secession', 'separatist': 'secession',
  'trade_federation': 'commerce_league',
  'hapes_consortium': 'hesperan_consortium',
};
const ORDER_IDS = {
  'jedi_seekers': 'keeper_seekers',
  'jedi_scholars': 'keeper_scholars',
  'jedi_order': 'keeper_order',
  'jedi': 'keeper',
  'sith': 'hollow',
};
const SPECIES_IDS = {
  'twi_lek': 'sytheen', "twi'lek": 'sytheen', 'twilek': 'sytheen',
  'mon_calamari': 'sennari', 'quarren': 'dovrek', 'tauntaun': 'ridgeback',
  'wookiee': 'ursk', 'zabrak': 'karnaki', 'chiss': 'vorne',
  'rodian': 'skarn', 'mirialan': 'jeharu', 'togruta': 'sethari',
  'ewok': 'brindle', 'bothan': 'renai', 'gungan': 'marrow',
  'sullustan': 'dell', 'trandoshan': 'skrag',
};
const TECH_IDS = {
  'lightsabers': 'arcblades', 'lightsaber': 'arcblade',
  'blasters': 'pulsers', 'blaster': 'pulser',
  'vibroblade': 'shock_blade',
  'bacta': 'regen', 'kolto': 'hexol',   // SW healing substances (item ids)
  'hyperlanes': 'foldlanes', 'hyperlane': 'foldlane',   // travel_routes.route_type enum value
  'stormtrooper': 'ironclad',
  // force_* id tags (bare lowercase "force" is deliberately NOT mapped)
  'force_detection': 'veil_detection',
  'force_enhancement': 'veil_enhancement',
  'force_insight': 'veil_insight',
  'force_mastery': 'veil_mastery',
  'force_pike': 'veil_pike',
};
const FLAVOR_IDS = {
  'krayt': 'wyrm', 'kinrath': 'venox', 'bantha': 'grazer',
  'tusken': 'dune_nomad', 'jawa': 'skritcher', 'rancor': 'gravox',
  'sarlacc': 'devourer',
  'mos_eisley': 'greywell', 'mos_espa': 'dustreach',
  'lars_homestead': 'marn_homestead', 'jabba': 'vorga', 'lars': 'marn',
  'uscru': 'nightrun', 'coco_town': 'lowmarket',
  'lessu': 'sythmar', 'jundland': 'sunder',
  'skywalker_datapad': 'marn_datapad', 'skywalker': 'marn',
  'pulser_pistol_han_solo': 'pulser_pistol_vetch', 'han_solo': 'vetch',
  'vaders_castle': 'korrth_keep', 'vader': 'korrth',
  'tarkin_estate': 'vethan_estate', 'tarkin': 'vethan',
};

// ── Assemble.
const display = {};
const identifiers = {};

for (const [swId, swName, newId, newName] of PLANETS) {
  display[swName] = newName;
  identifiers[swId] = newId;
}
Object.assign(display, PLANET_SPECIAL_DISPLAY);
Object.assign(identifiers, PLANET_SPECIAL_IDS);
Object.assign(display, ORDER_DISPLAY, FACTION_DISPLAY, SPECIES_DISPLAY, TECH_DISPLAY, FLAVOR_DISPLAY, ARTICLE_DISPLAY);
Object.assign(identifiers, FACTION_IDS, ORDER_IDS, SPECIES_IDS, TECH_IDS, FLAVOR_IDS);

// Kept-on-purpose (documented, not applied).
const kept = {
  display: ['Human', 'Credits', 'Outer Rim', 'Inner Rim', 'Mid Rim', 'Core Worlds',
            'Expansion Region', 'Wild Space', 'Unknown Regions', 'Colonies'],
  identifiers: ['human', 'credits', 'forceAlignment', 'forceSensitive',
                'corporate_sector', 'outer_rim_settlers', 'independent_investigators',
                'diplomatic_corps', 'medical_corps', 'pilots_guild', 'tech_guild'],
  note: 'camelCase forceAlignment/forceSensitive are protected by the identifier ' +
        'right-boundary ([A-Za-z0-9]); generic factionIds and currency/baseline ' +
        'species are kept by design.',
};

const out = {
  _meta: {
    title: 'Of the Galaxy: The Severed Reach — rebrand term map',
    generated_by: 'backend/scripts/rebrand/build-term-map.js',
    displayCount: Object.keys(display).length,
    identifierCount: Object.keys(identifiers).length,
  },
  display,
  identifiers,
  kept,
};

const outPath = path.join(__dirname, 'term-map.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
console.log(`Wrote ${outPath}`);
console.log(`  display terms:     ${out._meta.displayCount}`);
console.log(`  identifier tokens: ${out._meta.identifierCount}`);
