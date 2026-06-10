# AI Dialogue Service Setup Instructions

## Overview
The hybrid dialogue system includes optional AI integration using OpenAI's API. This provides natural, contextual responses for custom player questions while keeping costs low by using templates for most interactions.

## Setup Steps

### 1. Install OpenAI Package
```bash
cd backend
npm install openai
```

### 2. Add API Key to Environment
Add your OpenAI API key to `backend/.env`:

```env
OPENAI_API_KEY=your_api_key_here
```

**Important:** Never commit your API key to version control. The `.env` file should already be in `.gitignore`.

### 3. Restart Backend Server
After adding the API key, restart your backend server:

```bash
npm run dev
```

You should see one of these messages in the console:
- ✅ `[AI Dialogue] OpenAI service initialized successfully` - AI is ready
- ⚠️ `[AI Dialogue] OpenAI API key not found. AI fallback disabled.` - AI disabled, templates only

## How It Works

### Template System (Primary - 80% of responses)
- Fast, free, and instant
- Provides varied, helpful responses
- Meets 65% helpful information requirement
- No API costs

### AI Service (Fallback - 20% of responses)
- Only used for custom questions that don't match template patterns
- Rate limited: Max 5 AI calls per conversation
- Cached responses for common questions
- Cost: ~$0.01-0.03 per AI response

### Cost Control
- **Rate Limiting**: Maximum 5 AI calls per conversation
- **Caching**: Common questions are cached for 1 hour
- **Smart Selection**: AI only used for complex custom questions
- **Fallback**: Always falls back to templates if AI fails

## Expected Monthly Costs

**Scenario 1: 100 active players, 20 conversations/day each**
- Total conversations: 2,000/day = 60,000/month
- AI usage: ~20% = 12,000 AI calls/month
- Cost: 12,000 × $0.02 = **$240/month**

**Scenario 2: 50 active players, 10 conversations/day each**
- Total conversations: 500/day = 15,000/month
- AI usage: ~20% = 3,000 AI calls/month
- Cost: 3,000 × $0.02 = **$60/month**

## Monitoring

The AI service logs usage to the console:
- `[AI Dialogue] Rate limit reached` - AI calls exceeded for a conversation
- `[AI Dialogue] Error generating AI response` - AI call failed, using template fallback

## Testing

1. **Without API Key**: System works perfectly with templates only
2. **With API Key**: Custom questions get AI responses, common questions use templates

## Troubleshooting

### "OpenAI package not installed"
```bash
cd backend
npm install openai
```

### "API key not found"
- Check `backend/.env` file exists
- Verify `OPENAI_API_KEY=your_key_here` is in the file
- Restart backend server after adding key

### "Rate limit reached"
- This is normal - AI is rate limited to 5 calls per conversation
- System automatically falls back to templates
- This helps control costs

## Disabling AI

To disable AI and use templates only:
1. Remove or comment out `OPENAI_API_KEY` in `backend/.env`
2. Restart backend server

The system will continue working perfectly with templates only.



