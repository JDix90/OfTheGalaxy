# Phase 1 Dialogue Enhancement Testing Guide

**Purpose:** Test cases and sample inputs to verify Phase 1 NPC dialogue enhancements are working correctly.

---

## Test Setup

### Prerequisites
1. Run database migration: `cd backend && node src/migrations/run.js`
2. Ensure OpenAI API key is configured (if testing AI dialogue)
3. Have at least one NPC available for testing
4. Have a character created and logged in

### Test NPCs to Create/Use
- **Faction NPCs:** One NPC from each major faction (Jedi, Sith, Empire, Rebels, etc.)
- **Different Types:** Quest giver, vendor, companion, generic
- **Different Personalities:** High extraversion, low extraversion, high formality, low formality

---

## Test Categories

### 1. Personality-Driven Dialogue Tests

#### Test 1.1: High Extraversion NPC
**Setup:** NPC with `extraversion > 70` in personality profile

**Test Inputs:**
```
"Hello"
"Tell me about this planet"
"What do you do here?"
"How are you?"
```

**Expected Behavior:**
- NPC should be more talkative and verbose
- Responses should be longer and more engaging
- May include casual conversation starters
- Template selection should favor "high verbosity" templates

**Verification:**
- Check console logs for personality description in AI prompts
- Verify template scoring includes extraversion bonus
- Response should feel more conversational

---

#### Test 1.2: Low Extraversion NPC
**Setup:** NPC with `extraversion < 30` in personality profile

**Test Inputs:**
```
"Hello"
"Tell me about this planet"
"What do you do here?"
```

**Expected Behavior:**
- NPC should be brief and reserved
- Responses should be shorter and more direct
- Less likely to initiate additional conversation
- Template selection should favor "low verbosity" templates

**Verification:**
- Check that responses are noticeably shorter
- Verify personality influences template selection

---

#### Test 1.3: High Formality NPC
**Setup:** NPC with `authorityRespect > 70` or `formality > 70`

**Test Inputs:**
```
"Hello"
"Tell me about yourself"
"What's happening here?"
```

**Expected Behavior:**
- NPC should use formal language
- Address player with respect/titles
- More structured, polite responses
- May reference authority or order

**Verification:**
- Check for formal language patterns
- Verify speaking style includes "formal" in AI prompts

---

#### Test 1.4: Low Formality NPC
**Setup:** NPC with `authorityRespect < 30` or `formality < 30`

**Test Inputs:**
```
"Hello"
"Tell me about yourself"
"What's happening here?"
```

**Expected Behavior:**
- NPC should use casual, informal language
- May use slang or casual expressions
- More relaxed, friendly tone
- Less structured responses

**Verification:**
- Check for casual language patterns
- Verify speaking style includes "casual" in AI prompts

---

#### Test 1.5: High Directness NPC
**Setup:** NPC with `directness > 70`

**Test Inputs:**
```
"Tell me about this planet"
"What do you think about the Empire?"
"Can you help me?"
```

**Expected Behavior:**
- NPC should be straightforward and blunt
- Gets to the point quickly
- Less likely to beat around the bush
- Direct answers to questions

**Verification:**
- Responses should be direct and to-the-point
- Check template scoring for directness preference

---

### 2. Faction-Driven Dialogue Tests

#### Test 2.1: Galactic Empire NPC
**Setup:** NPC with `factionId: 'galactic_empire'`

**Test Inputs:**
```
"Tell me about the Empire"
"What do you think about the Empire?"
"Tell me about this planet"
"Hello"
```

**Expected Behavior:**
- Should emphasize order, security, strength
- Use phrases like "order and security", "imperial might"
- Formal address and respect for authority
- May mention "the Emperor's will"
- Higher suspicion if player has low reputation

**Verification:**
- Check console for faction context in AI prompts
- Verify faction rhetoric is included
- Responses should reflect Empire values

---

#### Test 2.2: Rebel Alliance NPC
**Setup:** NPC with `factionId: 'rebel_alliance'`

**Test Inputs:**
```
"Tell me about the Rebellion"
"What do you think about the Empire?"
"Tell me about this planet"
"Hello"
```

**Expected Behavior:**
- Should emphasize freedom, resistance, hope
- Use phrases like "freedom fighters", "against tyranny"
- Casual, passionate tone
- Less formal address
- More trusting if player has positive reputation

**Verification:**
- Check for Rebel rhetoric in responses
- Verify faction dialogue style is applied
- Should feel more passionate and less formal

---

#### Test 2.3: Jedi Order NPC
**Setup:** NPC with `factionId: 'jedi_order'`

**Test Inputs:**
```
"Tell me about the Jedi"
"What is the Force?"
"Tell me about this planet"
"Hello"
```

**Expected Behavior:**
- Should emphasize wisdom, peace, balance
- Use phrases like "may the Force be with you", "peace and knowledge"
- Formal, wise tone
- May reference "the will of the Force"
- Emphasize balance and knowledge

**Verification:**
- Check for Jedi-specific language
- Verify Force-related references
- Should feel wise and philosophical

---

#### Test 2.4: Sith NPC
**Setup:** NPC with `factionId: 'sith'`

**Test Inputs:**
```
"Tell me about the Sith"
"What is the dark side?"
"Tell me about this planet"
"Hello"
```

**Expected Behavior:**
- Should emphasize power, strength, dominance
- Use phrases like "power through passion", "unlimited power"
- Intimidating, powerful tone
- May reference "the dark side"
- Less trusting, more suspicious

**Verification:**
- Check for Sith-specific language
- Verify dark side references
- Should feel intimidating and powerful

---

#### Test 2.5: Mandalorian NPC
**Setup:** NPC with `factionId: 'mandalorians'`

**Test Inputs:**
```
"Tell me about Mandalorians"
"What is honor?"
"Tell me about this planet"
"Hello"
```

**Expected Behavior:**
- Should emphasize honor, strength, tradition
- Use phrases like "this is the way", "mandalorian honor"
- Direct, warrior-like tone
- Less formal, more direct
- Values honor and strength

**Verification:**
- Check for Mandalorian phrases
- Verify honor and tradition references
- Should feel direct and warrior-like

---

### 3. Emotional State Tests

#### Test 3.1: Happy NPC
**Setup:** Trigger positive emotion (complete quest, help NPC)

**Test Inputs:**
```
"Hello"
"How are you?"
"Tell me about this planet"
```

**Expected Behavior:**
- NPC should be in good mood
- More friendly and helpful
- Positive, upbeat responses
- May reference recent positive event

**Verification:**
- Check `npc.emotionalState.primaryEmotion` should be 'happy' or 'grateful'
- Check `npc.emotionalState.emotionIntensity` should be > 0.3
- Emotional cues should appear in AI prompts
- Responses should reflect positive mood

---

#### Test 3.2: Angry NPC
**Setup:** Trigger negative emotion (betray player, attack faction)

**Test Inputs:**
```
"Hello"
"How are you?"
"Tell me about this planet"
```

**Expected Behavior:**
- NPC should be upset or angry
- Short-tempered, less helpful
- May be suspicious or hostile
- Negative tone in responses

**Verification:**
- Check `npc.emotionalState.primaryEmotion` should be 'angry' or 'betrayed'
- Check emotional intensity
- Emotional cues should appear in AI prompts
- Responses should reflect negative mood

---

#### Test 3.3: Neutral NPC
**Setup:** NPC with no recent emotional triggers

**Test Inputs:**
```
"Hello"
"How are you?"
"Tell me about this planet"
```

**Expected Behavior:**
- NPC should be in neutral emotional state
- Standard, baseline responses
- No strong emotional coloring

**Verification:**
- Check `npc.emotionalState.primaryEmotion` should be 'neutral'
- Check `npc.emotionalState.emotionIntensity` should be < 0.3
- No emotional cues in prompts (or minimal)

---

#### Test 3.4: Emotional Decay
**Setup:** Trigger emotion, then wait (or manually adjust timestamp)

**Test Process:**
1. Trigger strong emotion (intensity > 0.7)
2. Simulate time passage (or manually update `lastUpdated`)
3. Call `emotionalStateService.applyDecay(npc, hoursPassed)`
4. Test dialogue again

**Expected Behavior:**
- Emotion intensity should decrease over time
- Eventually returns to neutral
- Responses should gradually become less emotional

**Verification:**
- Check emotion intensity decreases
- After sufficient time, should return to neutral
- Responses should reflect decreasing emotion

---

### 4. Memory System Tests

#### Test 4.1: First Meeting
**Setup:** New NPC, no previous interactions

**Test Inputs:**
```
"Hello"
"Tell me about yourself"
"What do you do here?"
```

**Expected Behavior:**
- NPC should not reference past interactions
- No memory context in responses
- Standard greeting and introduction

**Verification:**
- Check `npc.memory.episodes` should be empty or minimal
- No memory summary in AI prompts
- Responses should be generic

---

#### Test 4.2: After Quest Completion
**Setup:** Complete a quest for the NPC

**Test Process:**
1. Accept quest from NPC
2. Complete quest objectives
3. Return to NPC
4. Test dialogue

**Test Inputs:**
```
"Hello"
"I completed that quest"
"Tell me about this planet"
```

**Expected Behavior:**
- NPC should remember quest completion
- May reference the quest
- More positive relationship
- Memory should be stored

**Verification:**
- Check `npc.memory.episodes` should contain quest_completed event
- Memory summary should appear in AI prompts
- NPC should acknowledge past interaction

---

#### Test 4.3: After Multiple Interactions
**Setup:** Have several conversations with NPC

**Test Process:**
1. Have 3-5 conversations with NPC
2. Mix positive and neutral interactions
3. Test dialogue

**Test Inputs:**
```
"Hello"
"Remember me?"
"Tell me about this planet"
```

**Expected Behavior:**
- NPC should remember significant interactions
- Top 3 memories should be included in prompts
- Responses should reflect relationship history

**Verification:**
- Check `npc.memory.episodes` should have multiple entries
- Check memory significance scoring
- Top 3 memories should appear in AI prompts
- Responses should reference past interactions

---

#### Test 4.4: Player Trait Memory
**Setup:** Player demonstrates trait in conversation

**Test Process:**
1. Use language that indicates a trait (e.g., "I'm brave", "I help people")
2. Have conversation with NPC
3. Test if NPC remembers trait

**Test Inputs:**
```
"I'm always willing to help those in need"
"I never back down from a fight"
"I value honesty above all"
```

**Expected Behavior:**
- NPC should extract and store player traits
- Traits should appear in semantic memory
- Future conversations may reference traits

**Verification:**
- Check `npc.memory.playerKnowledge.traits` should contain extracted traits
- Trait knowledge should appear in AI prompts
- NPC may reference player traits in responses

---

### 5. Template System Enhancement Tests

#### Test 5.1: Emotional Template Variants
**Setup:** NPC with strong emotional state

**Test Inputs:**
```
"Hello"
"How are you?"
```

**Expected Behavior:**
- Template selection should consider emotional state
- Emotional variants should be preferred if available
- Templates conflicting with emotion should be avoided

**Verification:**
- Check template scoring includes emotional matching
- Verify emotional variants are selected when appropriate
- Check console logs for template selection reasoning

---

#### Test 5.2: Personality-Based Template Selection
**Setup:** NPC with strong personality traits

**Test Inputs:**
```
"Tell me about this planet"
"What do you do here?"
```

**Expected Behavior:**
- Template selection should match personality
- High directness NPCs should get direct templates
- High extraversion NPCs should get verbose templates
- High formality NPCs should get formal templates

**Verification:**
- Check template scoring includes personality bonuses
- Verify selected templates match personality profile
- Check console logs for personality influence

---

#### Test 5.3: Memory Variables in Templates
**Setup:** NPC with significant memories

**Test Inputs:**
```
"Hello"
"Remember when..."
```

**Expected Behavior:**
- Templates with `{memory}` variable should be filled
- Memory context should appear in responses
- Past interactions should be referenced

**Verification:**
- Check template variable filling includes memory
- Verify memory text is inserted into responses
- Responses should reference past events

---

### 6. Integration Tests

#### Test 6.1: Full System Integration
**Setup:** NPC with all systems active (personality, faction, emotion, memory)

**Test Inputs:**
```
"Hello"
"Tell me about yourself"
"Tell me about this planet"
"What do you think about the Empire?"
"How are you feeling?"
```

**Expected Behavior:**
- All systems should work together
- Personality should influence tone
- Faction should influence content
- Emotion should color responses
- Memory should provide context
- AI prompts should include all context

**Verification:**
- Check AI prompt includes all systems
- Verify responses reflect multiple systems
- Check console logs for all system integrations
- Responses should feel cohesive and natural

---

#### Test 6.2: NPC Generation
**Setup:** Generate new NPCs

**Test Process:**
1. Generate NPCs for a planet
2. Check their personality profiles
3. Check their emotional states
4. Check their memory initialization

**Expected Behavior:**
- New NPCs should have personality profiles
- Emotional states should be initialized
- Memory should be initialized
- Faction modifiers should be applied

**Verification:**
- Check `npc.personalityProfile` exists and is populated
- Check `npc.emotionalState` exists and is initialized
- Check `npc.memory` exists and is initialized
- Verify faction personality modifiers are applied

---

#### Test 6.3: Legacy NPC Migration
**Setup:** Existing NPCs with only legacy `personalityTraits`

**Test Process:**
1. Load existing NPC
2. Check if personality profile is generated
3. Test dialogue

**Expected Behavior:**
- Legacy traits should be migrated to new profile
- New systems should be initialized
- NPC should work with new systems

**Verification:**
- Check `npc.personalityProfile` is created from legacy traits
- Check new systems are initialized
- Verify backward compatibility

---

## Console Logging Checks

### What to Look For in Console

1. **Personality Service:**
   ```
   [Personality] Generating profile for NPC...
   [Personality] Applied faction modifiers...
   ```

2. **Emotional State:**
   ```
   [Emotional State] Triggering emotion: happy, intensity: 0.5
   [Emotional State] Applying decay...
   ```

3. **Memory Service:**
   ```
   [Memory] Adding episodic memory...
   [Memory] Extracting trait: brave
   [Memory] Memory context: ...
   ```

4. **Faction Service:**
   ```
   [Faction] Getting dialogue context for: galactic_empire
   [Faction] Applied relationship modifiers...
   ```

5. **AI Dialogue:**
   ```
   [AI Dialogue] Building system prompt...
   [AI Dialogue] Prompt includes: personality, faction, emotion, memory
   ```

---

## Expected AI Prompt Structure

When testing AI dialogue, the system prompt should include:

```
You are [NPC Name], a [species] [occupation] on [planet], affiliated with the [Faction].

[Personality Description] - e.g., "You are curious and open to new experiences, outgoing and sociable..."

[Speaking Style] - e.g., "Speak in a formal, direct manner."

[Faction Context] - e.g., "You are affiliated with the Galactic Empire. Your dialogue tone is authoritarian. Emphasize strength and order..."

[Emotional Cues] - e.g., "You are currently feeling very happy. You are in a good mood and more talkative."

[Memory Context] - e.g., "You remember these interactions with the player: they helped you complete a quest (this was significant)..."

Your relationship with the player is: [tier] ([level]/100)...

[Planet Information]...

CRITICAL RULES:
- Keep responses concise (1-3 sentences max)
- Stay in character and lore-accurate
- 65% of responses should provide helpful information...
- Reflect your current emotional state and memories in your responses
```

---

## Troubleshooting

### Issue: NPC doesn't have personality profile
**Solution:** Check if migration ran successfully. Verify `npc.personalityProfile` exists. If not, call `personalityService.migrateLegacyTraits(npc)`.

### Issue: Emotional state not updating
**Solution:** Check if `emotionalStateService.triggerEmotion()` is being called. Verify event types match trigger lists.

### Issue: Memory not being stored
**Solution:** Check if `memoryService.processConversation()` is called in `npcService.processDialogue()`. Verify conversation significance is above threshold.

### Issue: Faction context not appearing
**Solution:** Verify NPC has `factionId` set. Check `factionService.getDialogueContext()` is being called. Verify faction exists in `factionProfiles.js`.

### Issue: AI prompts too long
**Solution:** Check prompt building logic. Ensure personality descriptions are concise. Verify memory context is limited to top 3.

---

## Performance Testing

### Test Scenarios

1. **Load Test:** Generate 100 NPCs and check initialization time
2. **Query Test:** Query NPCs with JSONB filters on personality/emotion/memory
3. **Memory Growth:** Have 50 conversations and check memory size
4. **Emotion Decay:** Test decay calculation performance

### Metrics to Monitor

- NPC initialization time
- Dialogue processing time
- AI API call duration
- Database query performance
- Memory usage

---

## Success Criteria

Phase 1 is working correctly if:

✅ NPCs have distinct personalities that influence dialogue  
✅ Faction NPCs use faction-specific language and rhetoric  
✅ NPCs remember past interactions and reference them  
✅ NPCs show emotional responses to events  
✅ Template selection considers personality and emotion  
✅ AI prompts include all Phase 1 context  
✅ System maintains backward compatibility  
✅ Performance is acceptable (no significant slowdown)  

---

## Next Steps After Testing

1. **Document Issues:** Note any bugs or unexpected behaviors
2. **Performance Review:** Check if optimizations are needed
3. **User Feedback:** Gather feedback on dialogue quality
4. **Iteration:** Refine based on test results
5. **Phase 2 Planning:** Use test results to inform Phase 2 priorities

---

## Quick Test Checklist

- [ ] Run database migration
- [ ] Test personality-driven dialogue (high/low extraversion)
- [ ] Test faction-specific dialogue (Empire, Rebels, Jedi, Sith)
- [ ] Test emotional state (happy, angry, neutral)
- [ ] Test memory system (first meeting, after quest, multiple interactions)
- [ ] Test template enhancements (emotional variants, personality matching)
- [ ] Test full system integration
- [ ] Test NPC generation with new systems
- [ ] Test legacy NPC migration
- [ ] Check console logs for all systems
- [ ] Verify AI prompts include all context
- [ ] Performance testing

---

**Good luck with testing!** 🚀

If you encounter any issues, refer to the troubleshooting section or check the implementation files for debugging.








