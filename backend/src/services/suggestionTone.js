/**
 * suggestionTone — derives a short, backend-authored INTENT/TONE label for a
 * suggested player response, so the UI can tag each choice (BioWare-style:
 * Warm / Probe / Press …). Suggestions are templated (not LLM-generated), so the
 * tone is derived deterministically from the suggestion's action/intent/category.
 *
 * Shared by suggestedResponseService (non-tutorial, intent/category-keyed) and
 * tutorialDialogueService (action-keyed) so both emission paths agree.
 */

const TONE_BY_KEY = {
  // conversational openers / smalltalk
  greeting: 'Warm',
  casual: 'Casual',
  casual_planet: 'Casual',
  acknowledge: 'Casual',
  // information seeking
  planet_info: 'Curious',
  planet_locations: 'Curious',
  resources: 'Curious', // suggestedResponseService emits intent 'resources'
  planet: 'Curious',
  npc_info: 'Curious',
  npc_occupation: 'Curious',
  location_info: 'Ask',
  guidance: 'Ask',
  quest_guidance: 'Ask',
  quest_log_help: 'Ask',
  medpac_info: 'Ask',
  inventory_help: 'Ask',
  combat_info: 'Ask',
  quest_details: 'Ask',
  // probing / standing
  faction_info: 'Probe',
  faction_reputation: 'Probe',
  // work / quests
  quest: 'Eager',
  quest_offer: 'Eager',
  accept_quest: 'Accept',
  ready_for_combat: 'Ready',
  // commerce
  open_vendor: 'Trade',
  // refusals
  not_ready: 'Decline',
  decline_vendor: 'Decline',
  // branching choices
  choose_keeper: 'Resolve',
  choose_cartel: 'Resolve',
};

/**
 * @param {object|string} s - a suggestion ({ action?, intent?, category?, tone? }) or bare string
 * @returns {string} a short tone label (defaults to 'Neutral')
 */
function deriveSuggestionTone(s) {
  if (!s || typeof s === 'string') return 'Neutral';
  if (s.tone) return s.tone;
  const key = s.action || s.intent || s.category || '';
  return TONE_BY_KEY[key] || 'Neutral';
}

module.exports = { deriveSuggestionTone, TONE_BY_KEY };
