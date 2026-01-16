# Aurora Guide Chatbot – Technical Documentation

> **Version:** 1.0.1
> **Last Updated:** 2026-01-16
> **Author:** Øystein Jørgensen

## Overview

Aurora Guide is an AI-powered chatbot that helps users find Northern Lights in Tromsø, Norway. It uses real-time aurora forecasts, weather data, and location intelligence to provide personalized guidance to tourists and locals.

---

## Architecture

### Frontend
- **Component:** `/src/components/chat/ChatWidget.tsx`
- **Framework:** React 19 (functional component with hooks)
- **State Management:** Local state + Context (MasterStatus, Premium)
- **Styling:** Tailwind CSS with custom gradients

### Backend
- **API Route:** `/src/app/api/chat/guide/route.ts`
- **Framework:** Next.js 15 API Routes
- **AI Service:** OpenAI GPT-4o-mini
- **Temperature:** 0.4 (fairly deterministic responses)
- **Max Tokens:** 220 per response (short, mobile-friendly)

### Data Sources
The chatbot fetches real-time data from multiple internal APIs:
- `/api/aurora/now` – Current KP index, aurora probability
- `/api/weather/{lat}/{lon}` – Cloud coverage, temperature, wind
- `/api/best-spot` – Optimal viewing location based on conditions
- `/api/aurora/tonight` – 48-hour hourly forecast

---

## Features

### 1. Quick-Reply Buttons
**Purpose:** Reduce typing friction for users (tourists in cold weather with gloves).

**Behavior:**
- **Dynamic suggestions** based on Master Status (GO/WAIT/NO)
- **Default suggestions** shown on first open
- **Auto-hide** after user sends first message
- **Auto-show** after 20 seconds of inactivity

**Example Quick-Replies:**
- Master Status = GO → "Where should I go now?" 📍
- Master Status = WAIT → "When will it improve?" ⏰
- Master Status = NO → "Any chance later tonight?" 🌟

**Implementation:**
```tsx
const quickReplies = useMemo<QuickReply[]>(() => {
  if (result?.status === 'GO') {
    return [
      { id: 'where-now', text: 'Where should I go now?', emoji: '📍' },
      { id: 'how-long', text: 'How long will it last?', emoji: '⏰' },
      { id: 'what-kp', text: 'What is Kp index?', emoji: '📊' },
    ];
  }
  // ... more logic
}, [result]);
```

---

### 2. Premium/Free Tier Gating

**Free Tier:**
- General directional advice ("Head west towards coast")
- No specific location names or GPS coordinates
- Upgrade CTA shown with 🔒 emoji in bot messages

**Premium Tier:**
- Exact GPS coordinates with driving times
- Specific spot names (Ersfjordbotn, Sommarøy, Skibotn, etc.)
- Turn-by-turn routing advice
- Google Maps links

**Example Free Response:**
> "The coast looks promising tonight 🔒 Unlock Aurora Guide to get exact GPS coordinates."

**Example Premium Response:**
> "Drive to Ersfjordbotn (69.5828, 19.0247), 25 min via Route 862. Dark skies guaranteed!"

---

### 3. Interactive UI Guidance ([GUIDE] Tokens)

**Purpose:** Highlight UI elements and guide users visually through the app.

**Syntax:**
```
[GUIDE:element-id:message]
```

**Available Element IDs:**
- `nav-forecast` → Forecast navigation link
- `nav-live` → Live Map navigation link
- `nav-settings` → Settings page link
- `upgrade-button` → Premium upgrade button

**Example:**
Bot says: _"You can see the full 48-hour forecast here. [GUIDE:nav-forecast:Click here for detailed predictions]"_

**Result:**
- A spotlight overlay appears on the Forecast nav link
- Tooltip shows: "Click here for detailed predictions"
- User is guided to the correct feature

**Event Emission:**
```tsx
window.dispatchEvent(
  new CustomEvent('aura-ui-guide', {
    detail: {
      elementId: 'nav-forecast',
      message: 'Click here for detailed predictions',
      pulseColor: 'rgb(52, 245, 197)'
    }
  })
);
```

---

### 4. Map Integration ([SPOT] Tokens)

**Purpose:** Highlight specific viewing spots on the Live Map.

**Syntax:**
```
[SPOT:spot-id]
```

**Available Spot IDs:**
`tromso`, `sommaroy`, `grotfjord`, `grunnfjord`, `svensby`, `lakselvbukt`, `skibotn`, `lyngen`, `storslett`, `skjervoy`, `bardufoss`, `setermoen`, `senja-ytterside`, `senja`, `narvik`, `lofoten`, `svolvaer`, `alta`, `lakselv`, `karasjok`, `kautokeino`, `nordkapp`, `vadso`, `kirkenes`

**Example:**
Bot says: _"Drive to Sommarøy [SPOT:sommaroy] for dark skies tonight!"_

**Result:**
- Map zooms to Sommarøy
- Spot is highlighted with pulsing marker
- User sees exact location visually

**Event Emission:**
```tsx
window.dispatchEvent(
  new CustomEvent('aura-guide-spot', {
    detail: {
      spotId: 'sommaroy',
      zoom: 11,
      highlight: true
    }
  })
);
```

---

### 5. Navigation Links ([LINK] Tokens) **🆕**

**Purpose:** Provide clickable in-chat links to app pages.

**Syntax:**
```
[LINK:/page-path:Link text]
```

**Available Pages:**
- `/forecast` → 48-hour detailed forecast
- `/live` → Live map with viewing spots
- `/settings` → User preferences
- `/` → Home dashboard

**Example:**
Bot says: _"The best time is around 22:00 tonight. [LINK:/forecast:View detailed forecast]"_

**Result:**
Renders as: _"The best time is around 22:00 tonight. <a href="/forecast" class="text-teal-400 underline">View detailed forecast →</a>"_

**Implementation:**
```tsx
const linkTokenRegex = /\[LINK:(\/[^:]+):([^\]]+)\]/gi;
botReply = botReply.replace(
  linkTokenRegex,
  '<a href="$1" class="text-teal-400 underline hover:text-teal-300 font-medium">$2 →</a>'
);
```

---

### 6. Persistent Chat History (24h)

**Storage:** `localStorage` under key `aura_chat_history`

**Behavior:**
- Saves last 50 messages automatically
- Expires after 24 hours
- Loads on component mount
- Handles quota exceeded gracefully

**Implementation:**
```tsx
useEffect(() => {
  const savedMessages = localStorage.getItem('aura_chat_history');
  if (savedMessages) {
    const parsed = JSON.parse(savedMessages);
    const validMessages = parsed.filter(msg => {
      const msgTime = new Date(msg.timestamp).getTime();
      return now - msgTime < 24 * 60 * 60 * 1000; // 24 hours
    });
    setMessages(validMessages);
  }
}, [historyLoaded]);
```

**Clear History:**
User can click trash icon in chat header → Confirms deletion → Clears localStorage.

---

### 7. Contextual Nudging

**Idle Timer Nudge (30 seconds):**
When user is idle for 30 seconds without opening chat:
- Chat auto-opens with contextual message based on Master Status
- Example (GO): _"✨ Nordlyset er sterkt akkurat nå! Vil du vite hvor du skal dra?"_
- Example (WAIT): _"🌌 Nordlysaktivitet bygger seg opp. Spør meg når det er beste tidspunkt!"_

**Master Status Change Nudge:**
When Master Status changes (GO → WAIT or WAIT → GO):
- Chat auto-opens with transition message
- Example (GO): _"🚀 Forholdene har bedret seg! Nordlyset er nå synlig. Vil du vite hvor?"_
- Example (WAIT): _"⚠️ Skydekket øker. Forholdene er ikke optimale lenger, men jeg kan hjelpe deg finne best spot."_

**Welcome Flow (First-Time Visitors):**
3-message intro sequence:
1. _"Hei! 👋 Jeg er Aura, din personlige nordlys-guide for Tromsø."_
2. _"Jeg kan hjelpe deg med å finne beste spot for nordlys, gi værvarsler og real-time råd."_
3. _"Prøv å spørre: 'Hvor kan jeg se nordlys i kveld?' eller 'Hva er beste tidspunkt?'"_

---

## Data Context Sent to AI

The system prompt receives a rich context block with real-time data:

```
=== CURRENT CONDITIONS (22:45) ===
Master Status: GO
Your recommendation: YES! Put on your jacket—the lights are on.

Technical data (translate to human language):
- KP Index: 4.2 (solar activity level)
- Aurora Probability: 78%
- Tromsø Cloud Coverage: 15%
- Magnetic Field (Bz): -12 nT (EXCELLENT for aurora!)
- Solar Wind Speed: 620 km/s (FAST - great!)

=== TIME PLANNING ===
Best window tonight: Around 23:00 (82% probability peak)

=== LOCATION INTEL (PREMIUM) ===
Best spot RIGHT NOW: Ersfjordbotn (~25 min drive, 95% clear sky)
Google Maps: https://maps.google.com/?q=69.5828,19.0247

SPECIFIC ROUTING (Premium access):
- Telegrafbukta: 69.6408, 18.9817 (30 min walk from center)
- Ersfjordbotn: 69.5828, 19.0247 (25 min drive, Route 862)
- Kvaløya west: 69.7500, 18.6500 (30-40 min, beach spots)
- Sommarøy: 69.6377, 17.9689 (1h drive, very dark)
- Skibotn: 69.3847, 20.2797 (1.5h, E8 inland - only if coast cloudy)
```

**For Free Tier:**
Location intel is replaced with general directional hints (west/inland/coast) + upgrade CTA.

---

## Token System Reference

| Token Type | Syntax | Purpose | Example |
|------------|--------|---------|---------|
| **SPOT** | `[SPOT:id]` | Highlight map spot | `[SPOT:sommaroy]` |
| **GUIDE** | `[GUIDE:element:msg]` | UI spotlight | `[GUIDE:nav-forecast:Click here]` |
| **LINK** | `[LINK:path:text]` | In-chat navigation link | `[LINK:/forecast:View forecast]` |

All tokens are stripped from display text after processing.

---

## API Usage & Costs

### OpenAI API
- **Model:** `gpt-4o-mini` (configurable via `OPENAI_MODEL` env var)
- **Temperature:** 0.4
- **Max Tokens:** 220 per response
- **Cost:** ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **Estimated:** 100 chats/day ≈ $1-3/month

### Rate Limiting
Currently no rate limiting on `/api/chat/guide`. Consider adding:
- Upstash Redis rate limiter
- 10 requests per minute per IP
- Premium users: higher limits

---

## Development Guide

### Adding New Quick-Replies

Edit `quickReplies` useMemo in `ChatWidget.tsx`:

```tsx
const quickReplies = useMemo<QuickReply[]>(() => {
  if (result?.status === 'GO') {
    return [
      { id: 'new-reply', text: 'New question?', emoji: '🆕' },
      // ...
    ];
  }
}, [result]);
```

### Adding New Navigation Links

Update system prompt in `route.ts`:

```
- Available pages:
  * /new-page → Description
```

### Adding New Spot IDs

Update system prompt in `route.ts`:

```
- Available spot IDs: tromso, sommaroy, ..., new-spot
```

### Testing Locally

```bash
# Start dev server
npm run dev

# Open chat widget
http://localhost:3000

# Test premium features
# Set isPremium=true in localStorage or use Stripe test mode
```

### Debugging

Enable debug logs in browser console:

```tsx
console.info('[chat-guide] reply', { status, bestSpot });
console.info('[chat-guide] emitted aura-guide-spot', { spotId });
```

---

## Prompt Engineering Notes

### Why Temperature 0.4?
- **Low variance:** Consistent answers for same questions
- **Not too rigid:** Allows natural language variation
- **Tested sweet spot:** 0.3 = robotic, 0.7 = unpredictable

### Why Max Tokens 220?
- **Mobile UX:** Users standing in cold, want quick answers
- **2-3 sentences:** Matches prompt instruction
- **Cost optimization:** Shorter responses = lower API costs
- **Tested:** 150 = too short (cuts off), 300 = too verbose

### Why Enforce Language Matching?
- **Tourists:** Many non-English speakers in Tromsø (German, French, Spanish)
- **Better UX:** Reply in user's language feels more personal
- **Simple detection:** OpenAI auto-detects input language

---

## Common Issues & Solutions

### Issue: Links Not Clickable
**Cause:** Message rendering as plain text instead of HTML
**Solution:** Ensure `dangerouslySetInnerHTML={{ __html: msg.text }}` is used

### Issue: Quick-Replies Not Hiding
**Cause:** `sendQuickReply` not setting `setShowQuickReplies(false)`
**Solution:** Ensure `handleSendMessage` calls `setShowQuickReplies(false)`

### Issue: Tokens Showing in Chat
**Cause:** Token regex not matching correctly
**Solution:** Check regex patterns and ensure `.replace()` runs before rendering

### Issue: Chat History Lost
**Cause:** localStorage quota exceeded
**Solution:** Implemented fallback in code (saves last 20 messages on error)

---

## Version History

### v1.0.1 (2026-01-16)
- ✅ Added quick-reply buttons (dynamic based on Master Status)
- ✅ Added navigation links ([LINK] tokens)
- ✅ Added 20-second idle timer for quick-reply re-appearance
- ✅ Improved mobile UX for tourists in cold weather

### v1.0.0 (2025-01-XX)
- Initial chatbot release
- Premium/free tier gating
- SPOT and GUIDE tokens
- Persistent chat history
- Contextual nudging
- Welcome flow

---

## Future Enhancements (Roadmap)

### Phase 2 (Q2 2026)
- [ ] Voice input (speech-to-text via Whisper API)
- [ ] Push notifications with chat prompts ("Aurora alert! Ask me anything")
- [ ] Chat export/sharing (share conversation as link)
- [ ] Multi-language UI (not just bot messages)

### Phase 3 (Q3 2026)
- [ ] Photo upload + AI aurora analysis ("Is this northern lights?")
- [ ] Offline chat support (cached responses for common questions)
- [ ] Chat analytics dashboard (most asked questions, conversion tracking)

---

## Contact & Support

**Developer:** Øystein Jørgensen
**Email:** [contact via app settings]
**Project:** Aurora WebApp (aurora.tromso.ai)
**Repository:** [Private GitHub repo]

For issues or feature requests, check the project's GitHub Issues or contact via app settings.

---

**End of Documentation**
