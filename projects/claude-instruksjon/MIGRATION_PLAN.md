# Aurora-Watcher → Aurora-Webapp Migration Plan

**Dato:** 21. desember 2025  
**Mål:** Migrere alle funksjonaliteter fra aurora-watcher (iOS app) til aurora-webapp (web app for aurora.tromso.ai)

---

## 📊 Feature Comparison

### ✅ Allerede implementert i aurora-webapp
- [x] Basic nordlys forecast display
- [x] Quick stats (KP, cloud, temp)
- [x] Hourly forecast strip
- [x] Spot selector (basic)
- [x] Map visualization
- [x] Dark hours info
- [x] Funfact panel
- [x] Language context (NO/EN)
- [x] Temperature context (C/F)

### ❌ Mangler i aurora-webapp (fra aurora-watcher)
- [ ] **PremiumContext** - Premium/Free tier system
- [ ] **DevModeContext** - Developer mode for testing
- [ ] **AI Chatbot** - Aurora AI Assistant
- [ ] **AI Recommendations** - Smart anbefalinger
- [ ] **Go Now Alert** - Realtime varsel når nordlyset er synlig nå
- [ ] **Predictive Hint Banner** - Varsler om kommende aktivitet
- [ ] **Aurora Oval Overlay** - Live NOAA aurora oval på kart
- [ ] **Map Animation** - Timeline scrubber for fremtidig prognose
- [ ] **Splash Screen** - Branded loading screen
- [ ] **Welcome Modal** - First-time user onboarding
- [ ] **Premium CTA** - Upgrade prompts for free users
- [ ] **Data Sources** - Transparency om datakilder
- [ ] **Solar Banner** - Solar activity highlights
- [ ] **Video Aurora Overlay** - Premium WebGL/video effects
- [ ] **Region Zoom** - Detaljert zoom per region
- [ ] **GPS Location** - Auto-detect user location
- [ ] **Push Notifications** - (Web push for browser)

---

## 🗂️ File Structure Changes Needed

### Contexts to Add
```
src/contexts/
├── PremiumContext.tsx       # NEW - Free/Premium tier
└── DevModeContext.tsx        # NEW - Developer testing mode
```

### Components to Add
```
src/components/
├── chat/
│   └── AuroraChatbot.tsx    # NEW - AI assistant
├── forecast/
│   └── AIRecommendation.tsx  # NEW - Smart recommendations
├── home/
│   ├── GoNowAlert.tsx        # NEW - Realtime alert
│   └── SolarBanner.tsx       # NEW - Solar activity
├── aurora/
│   ├── PredictiveHintBanner.tsx  # NEW - Future hints
│   └── AuroraAIInsight.tsx   # NEW - AI insights
├── shared/
│   ├── SplashScreen.tsx      # NEW - Loading screen
│   ├── WelcomeModal.tsx      # NEW - Onboarding
│   └── PremiumCTA.tsx        # NEW - Upgrade prompts
└── map/
    ├── AuroraGlowOverlay.tsx    # NEW - Aurora oval
    ├── VideoAuroraOverlay.tsx   # NEW - Video effects
    ├── WebGLAuroraOverlay.tsx   # NEW - WebGL effects
    └── ScrubbableTimeline.tsx   # NEW - Animation controls
```

### Hooks to Enhance
```
src/hooks/
├── useAuroraLive.ts         # ENHANCE - Add aurora oval support
└── usePremium.ts            # NEW - Premium tier logic
```

---

## 📋 Implementation Phases

### FASE 1: Core Contexts (Priority: HIGH)
1. ✅ Copy `PremiumContext.tsx` from aurora-watcher
2. ✅ Copy `DevModeContext.tsx` from aurora-watcher
3. ✅ Update `src/app/layout.tsx` to wrap with new contexts
4. ✅ Test context providers work

### FASE 2: UI Enhancements (Priority: HIGH)
1. ✅ Add `SplashScreen.tsx`
2. ✅ Add `WelcomeModal.tsx`
3. ✅ Add `PremiumCTA.tsx`
4. ✅ Add `GoNowAlert.tsx`
5. ✅ Integrate into main page

### FASE 3: AI Features (Priority: MEDIUM)
1. ✅ Copy `AuroraChatbot.tsx`
2. ✅ Copy `AIRecommendation.tsx`
3. ✅ Copy `AuroraAIInsight.tsx`
4. ✅ Copy `PredictiveHintBanner.tsx`
5. ✅ Configure OpenAI/Tromsø.AI integration
6. ✅ Test AI responses

### FASE 4: Map Enhancements (Priority: MEDIUM)
1. ✅ Add aurora oval overlay (`useAuroraLive` enhancement)
2. ✅ Add timeline scrubber for animation
3. ✅ Add region zoom functionality
4. ✅ Add GPS auto-location
5. ✅ Test map interactions

### FASE 5: Advanced Features (Priority: LOW)
1. ✅ Add `VideoAuroraOverlay.tsx` (if premium tier needed)
2. ✅ Add `WebGLAuroraOverlay.tsx` (3D effects)
3. ✅ Add `SolarBanner.tsx`
4. ✅ Add `DataSources.tsx`
5. ✅ Add web push notifications

---

## 🎯 Success Criteria

### Must Have (MVP)
- [x] Premium/Free tier system fungerer
- [x] AI Chatbot er tilgjengelig
- [x] GoNow alert vises når relevant
- [x] Map har aurora oval overlay
- [x] Timeline animation fungerer (premium)

### Nice to Have (V2)
- [ ] WebGL effects på premium tier
- [ ] Web push notifications
- [ ] GPS auto-location
- [ ] Video aurora overlay

---

## 🔧 Technical Notes

### Environment Variables Needed
```env
# .env.local
NEXT_PUBLIC_OPENAI_API_KEY=sk-...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_ENABLE_PREMIUM=true
```

### Dependencies to Add
```json
{
  "@stripe/stripe-js": "^2.x",
  "openai": "^4.x",
  "three": "^0.182.0" // For WebGL effects
}
```

### API Endpoints to Create/Enhance
- `/api/chat` - AI chatbot backend
- `/api/subscription/check` - Premium status
- `/api/aurora/oval` - Aurora oval data
- `/api/aurora/hourly` - Hourly forecast for animation

---

## 📝 Notes
- Fokuser på mobile-first design (som i aurora-watcher)
- Behold Arctic color palette og design language
- Sørg for at alt fungerer uten Capacitor (web-only)
- Test både free og premium flows grundig

