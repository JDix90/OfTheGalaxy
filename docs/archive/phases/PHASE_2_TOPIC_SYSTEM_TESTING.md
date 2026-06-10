# Phase 2: Topic System - Testing Guide

## Overview
This document provides comprehensive testing steps for Phase 2 of the Conversation History and Dialogue System Enhancement, focusing on the Topic System implementation.

## Test Environment Setup

1. **Start Backend Server**
   ```bash
   cd backend
   npm start
   ```

2. **Start Frontend Server**
   ```bash
   cd frontend
   npm start
   ```

3. **Ensure Database Migrations Are Applied**
   ```bash
   cd backend
   npm run migrate
   ```

## Test Cases

### Test 1: Topic Extraction

**Objective:** Verify that topics are correctly extracted from player messages.

**Steps:**
1. Create a new character or use an existing one
2. Navigate to a planet surface
3. Click on an NPC to open dialogue
4. Send the following messages and verify topics are extracted:
   - "Tell me about this planet" → Should extract: `planet`, `location`
   - "Do you have any quests?" → Should extract: `quest`
   - "What faction are you with?" → Should extract: `faction`
   - "I need help" → Should extract: `help`
   - "Where can I find resources?" → Should extract: `resources`, `location`

**Expected Results:**
- Topics are extracted and stored in message metadata
- Topics appear in the ConversationTopics UI component
- Topics are saved to the `conversation_topics` table

**Verification:**
- Check browser console for `[Conversation Context] Extracted topics: [...]`
- Check database: `SELECT * FROM conversation_topics WHERE relationship_id = '<relationship_id>'`
- Verify topics appear in the UI component

---

### Test 2: Topic Tracking

**Objective:** Verify that topics are tracked across multiple conversations.

**Steps:**
1. Open dialogue with an NPC
2. Send message: "Tell me about Nar Shaddaa"
3. Close dialogue
4. Reopen dialogue with the same NPC
5. Check if "planet" topic appears in ConversationTopics component
6. Send another message: "What about the planet's history?"
7. Verify topic mention count increases

**Expected Results:**
- Topics persist across dialogue sessions
- Topic mention count increments correctly
- `lastMentioned` timestamp updates
- Topics are displayed in chronological order (most recent first)

**Verification:**
- Check database: `SELECT topic, mention_count, last_mentioned FROM conversation_topics WHERE relationship_id = '<relationship_id>' ORDER BY last_mentioned DESC`
- Verify UI shows correct mention counts

---

### Test 3: Topic Continuation Detection

**Objective:** Verify that the system detects when a player continues a previous topic.

**Steps:**
1. Open dialogue with an NPC
2. Send message: "Tell me about the Hutt Cartel"
3. Wait for NPC response
4. Close dialogue
5. Reopen dialogue
6. Send message: "What else can you tell me about the Hutt Cartel?"
7. Check backend logs for topic continuation detection

**Expected Results:**
- System detects topic continuation
- AI dialogue service receives topic continuation context
- NPC response references previous discussion
- NPC builds upon previous information rather than repeating

**Verification:**
- Check backend logs: `[Conversation Context] Topic continuation detected: faction`
- Check AI prompt includes: `TOPIC CONTINUATION: The player is continuing a previous conversation about "faction"`
- Verify NPC response acknowledges previous discussion

---

### Test 4: Topic UI Component

**Objective:** Verify that the ConversationTopics component displays and functions correctly.

**Steps:**
1. Open dialogue with an NPC
2. Have at least 3 different topics in conversation history
3. Verify ConversationTopics component appears above message area
4. Click on a topic chip
5. Verify messages are filtered to show only that topic
6. Click "Clear Filter" button
7. Verify all messages are shown again

**Expected Results:**
- Component displays all tracked topics
- Topic chips show topic name and mention count
- Selected topic is highlighted
- Filtering works correctly
- Clear filter button resets view

**Verification:**
- Visual inspection of UI
- Check that filtered messages only contain selected topic
- Verify API calls include topic filter parameter

---

### Test 5: Topic Filtering API

**Objective:** Verify that topic filtering works at the API level.

**Steps:**
1. Use API client (Postman, curl, etc.)
2. Send GET request: `/api/npcs/:npcId/conversation-history?characterId=:charId&topic=planet`
3. Verify response only contains messages with "planet" topic
4. Send request without topic parameter
5. Verify all messages returned

**Expected Results:**
- API correctly filters by topic
- Response includes only matching messages
- Pagination works with topic filter
- Total count reflects filtered results

**Verification:**
```bash
# Test with topic filter
curl "http://localhost:5000/api/npcs/npc_123/conversation-history?characterId=char_456&topic=planet"

# Test without filter
curl "http://localhost:5000/api/npcs/npc_123/conversation-history?characterId=char_456"
```

---

### Test 6: AI Dialogue Topic Integration

**Objective:** Verify that topic continuation is used in AI-generated responses.

**Steps:**
1. Ensure OpenAI API key is configured
2. Open dialogue with an NPC
3. Send message: "Tell me about this planet"
4. Wait for AI response
5. Close and reopen dialogue
6. Send message: "What else about the planet?"
7. Verify AI response references previous discussion

**Expected Results:**
- AI receives topic continuation context
- AI response acknowledges previous topic discussion
- AI builds upon previous information
- Response feels natural and contextual

**Verification:**
- Check backend logs for topic continuation in AI prompt
- Verify AI response quality
- Check that response doesn't repeat previous information

---

### Test 7: Multiple Topics in Single Message

**Objective:** Verify that multiple topics can be extracted from a single message.

**Steps:**
1. Open dialogue with an NPC
2. Send message: "I need help finding resources on this planet for my quest"
3. Verify multiple topics are extracted

**Expected Results:**
- Message extracts: `help`, `resources`, `planet`, `quest`
- All topics are saved to message metadata
- All topics are tracked in ConversationTopics table

**Verification:**
- Check message metadata in database
- Verify all topics appear in ConversationTopics component
- Check topic mention counts increment for all topics

---

### Test 8: Topic Case Sensitivity

**Objective:** Verify that topic extraction is case-insensitive.

**Steps:**
1. Open dialogue with an NPC
2. Send messages with different cases:
   - "Tell me about the PLANET"
   - "What about this Planet?"
   - "I love this planet!"
3. Verify all extract "planet" topic

**Expected Results:**
- All variations extract the same topic
- Topic is stored in lowercase
- No duplicate topics created

**Verification:**
- Check database for single "planet" topic entry
- Verify mention count reflects all mentions

---

### Test 9: Topic Continuation with No Previous Messages

**Objective:** Verify that topic continuation doesn't trigger for new topics.

**Steps:**
1. Open dialogue with a new NPC (no previous conversation)
2. Send message: "Tell me about the planet"
3. Verify no topic continuation is detected
4. Verify normal response is generated

**Expected Results:**
- No topic continuation detected
- Normal dialogue generation occurs
- Topic is tracked for future continuation

**Verification:**
- Check backend logs for absence of topic continuation
- Verify normal AI/template response

---

### Test 10: Topic UI Performance

**Objective:** Verify that topic UI performs well with many topics.

**Steps:**
1. Create conversation with 20+ different topics
2. Open dialogue interface
3. Verify ConversationTopics component loads quickly
4. Verify scrolling/rendering is smooth
5. Test topic filtering with many messages

**Expected Results:**
- Component loads in < 500ms
- Smooth scrolling and interaction
- No performance degradation

**Verification:**
- Use browser DevTools Performance tab
- Check render times
- Verify no memory leaks

---

## Integration Tests

### Test 11: Topic System with Quest Integration

**Objective:** Verify topics work alongside quest context.

**Steps:**
1. Accept a quest from an NPC
2. Send message about the quest: "Tell me more about this quest"
3. Verify both quest and topic context are used
4. Close and reopen dialogue
5. Send message: "What about that quest?"
6. Verify topic continuation and quest context both work

**Expected Results:**
- Topics and quest context coexist
- Both are used in dialogue generation
- No conflicts between systems

---

### Test 12: Topic System with Conversation History

**Objective:** Verify topics are preserved when loading conversation history.

**Steps:**
1. Have conversation with multiple topics
2. Close dialogue
3. Reopen dialogue
4. Verify all topics are loaded and displayed
5. Verify topic filtering works with loaded history

**Expected Results:**
- Topics load from history
- Topic filtering works with historical messages
- UI updates correctly

---

## Edge Cases

### Test 13: Empty Message Topics

**Objective:** Verify empty messages don't cause errors.

**Steps:**
1. Send empty message
2. Verify no topic extraction errors
3. Verify system handles gracefully

**Expected Results:**
- No errors thrown
- Empty topic array returned
- System continues normally

---

### Test 14: Very Long Messages

**Objective:** Verify topic extraction works with long messages.

**Steps:**
1. Send message with 500+ characters
2. Verify topics are still extracted correctly
3. Verify performance is acceptable

**Expected Results:**
- Topics extracted correctly
- No performance issues
- System handles long messages

---

### Test 15: Special Characters in Topics

**Objective:** Verify special characters don't break topic system.

**Steps:**
1. Send messages with special characters: "What about the planet's atmosphere?"
2. Verify topics extract correctly
3. Verify database storage works

**Expected Results:**
- Topics extract correctly
- Database stores properly
- UI displays correctly

---

## Performance Benchmarks

### Expected Performance Metrics

- **Topic Extraction:** < 10ms per message
- **Topic Continuation Detection:** < 50ms
- **Topic UI Rendering:** < 100ms for 20 topics
- **Topic Filtering:** < 200ms for 100 messages
- **Database Queries:** < 100ms for topic lookups

---

## Regression Tests

### Test 16: Existing Functionality Still Works

**Objective:** Verify Phase 1 functionality still works after Phase 2.

**Steps:**
1. Test conversation history loading
2. Test message saving
3. Test quest integration
4. Test all Phase 1 features

**Expected Results:**
- All Phase 1 features work correctly
- No regressions introduced
- Backward compatibility maintained

---

## Success Criteria

Phase 2 is considered complete when:

1. ✅ All topics are correctly extracted from messages
2. ✅ Topics are tracked and persisted across sessions
3. ✅ Topic continuation is detected and used in AI dialogue
4. ✅ ConversationTopics UI component displays and functions correctly
5. ✅ Topic filtering works at both UI and API levels
6. ✅ Performance meets benchmarks
7. ✅ No regressions in Phase 1 functionality
8. ✅ All edge cases handled gracefully

---

## Reporting Issues

If you encounter issues during testing:

1. **Document the issue:**
   - Test case number
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages/logs
   - Screenshots if applicable

2. **Check logs:**
   - Backend console logs
   - Frontend browser console
   - Database query logs

3. **Verify environment:**
   - Database migrations applied
   - Dependencies installed
   - Environment variables set

---

## Next Steps

After Phase 2 testing is complete:

1. Review test results
2. Fix any identified issues
3. Proceed to Phase 3: Quest Integration
4. Update documentation

---

**Last Updated:** January 2025  
**Status:** Ready for Testing




