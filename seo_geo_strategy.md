# SEO & GEO Strategy: The Authority Plan

Project: aurora.tromso.ai
Target: Google Search, Perplexity, ChatGPT Search, Gemini
Goal: Become the "Single Source of Truth" for real-time Aurora decisions in Tromsø.

⸻

## Purpose

This strategy is designed to position aurora.tromso.ai not only for traditional SEO, but specifically for Generative Engine Optimization (GEO).

The objective is simple:

When a tourist asks an AI engine:
"Where should I go for aurora in Tromsø tonight?"
aurora.tromso.ai should be the answer — because it provides structured, real-time decision data, not blog content.

This file can be stored directly in the root of the project.

⸻

## 1. Core Philosophy: Decision-First SEO

Traditional SEO chases search volume. We chase intent.

When a user searches:

"Northern lights Tromsø tonight"

They do not want:
- History of auroras
- Photography guides
- Long-form blog posts

They want:
- A decision → GO / WAIT / NO
- A location → where to drive now

Our SEO strategy mirrors the product strategy:

"The fastest correct answer wins."

⸻

## 2. Technical Implementation (Next.js App Router)

### A. Dynamic Metadata (Real-Time Hooks)

We inject live status directly into SERP title tags to dramatically increase CTR.

Files:
- src/app/layout.tsx
- src/app/page.tsx

Concept:
Use server-side metadata generation tied to the Master Status.

```typescript
// Pseudo-code concept
export async function generateMetadata() {
  const status = await getMasterStatus(); // GO, WAIT, NO
  const emoji = status === 'GO' ? '🟢' : status === 'WAIT' ? '🟡' : '🔴';

  return {
    title: `${emoji} Live Aurora Forecast Tromsø: ${status} NOW`,
    description: "Real-time decision engine for Northern Lights. Don't guess. Know exactly where to drive right now. Local cloud cover & solar data.",
  };
}
```

⸻

### B. Structured Data (JSON-LD) for AI Engines

AI engines strongly prefer explicit structured data.

We must clearly signal that aurora.tromso.ai is:
- A WeatherForecast aggregator
- A TouristAttraction decision engine

Implementation:
Inject JSON-LD via `<Script type="application/ld+json">` in the root layout.

**SpecialAnnouncement Schema (GO Status Only)**
When Master Status is GO, inject urgency.

```json
{
  "@context": "https://schema.org",
  "@type": "SpecialAnnouncement",
  "name": "Northern Lights Visible Now in Tromsø",
  "text": "Strong aurora activity detected with clear skies. Status: GO NOW.",
  "category": "public transport information",
  "datePosted": "2026-01-16T20:00:00+01:00",
  "expires": "2026-01-16T23:59:00+01:00"
}
```

This increases eligibility for rich results and AI citation.

⸻

## 3. Programmatic SEO: "Spot Pages"

We generate location-specific landing pages for aurora spots listed in aurabot.md.

Examples:
- Ersfjordbotn
- Sommarøy
- Skibotn

**Route**

`src/app/spot/[slug]/page.tsx`

**Content Strategy per Spot**
1. H1: Current Status for [Spot Name]
2. Live Data: Cloud cover + KP for that coordinate
3. Static Info: Driving time, parking notes
4. CTA: "Unlock full GPS route & guide"

**Why This Works**
- Captures long-tail searches like:
  - "Is Ersfjordbotn good for aurora tonight?"
- Creates URLs competitors do not have
- Scales infinitely with new locations

⸻

## 4. FAQ Strategy (Feeding the AI)

We explicitly answer the questions tourists ask so AI engines can quote us verbatim.

**Core Questions**
- What time is best for Northern Lights in Tromsø tonight? → /forecast
- Where should I drive to see aurora from Tromsø? → /live
- Is a KP index of 3 good for Tromsø? → Aura human-language explanation

**FAQ Schema (JSON-LD)**

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "Can I see Northern Lights in Tromsø tonight?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Based on live solar wind and local cloud coverage data, the status is currently [INSERT STATUS]. Check the live map at aurora.tromso.ai for real-time cloud gaps."
    }
  }]
}
```

⸻

## 5. The Viral Loop as an SEO Signal

Search engines treat direct traffic and sharing as authority signals.

**Key Mechanics**
- Share Status Button:
  - GO NOW images must clearly display aurora.tromso.ai
- B2B Backlinks:
  - Local hotels link on guest info pages
  - One high-authority backlink beats hundreds of small blogs

⸻

## 6. Keyword Targeting Map

| User Intent | Target Keyword | Landing Page | Feature Highlight |
|-------------|----------------|--------------|-------------------|
| Immediate | Northern lights Tromsø now | / | GO / WAIT / NO badge |
| Planning | Aurora forecast Tromsø tonight | /forecast | Best viewing window |
| Location | Best place to see aurora Tromsø | /live | Best spot pin |
| Specific | Ersfjordbotn aurora forecast | /spot/ersfjordbotn | Local cloud cover |
| Safety | Aurora driving Tromsø dangerous | /faq | Aura safety tips |

⸻

## 7. Implementation Checklist

**Phase 1: Technical Foundation (Immediate)**
- [ ] Dynamic meta titles based on forecast
- [ ] JSON-LD: WebSite + SoftwareApplication schema
- [ ] Dynamic sitemap.xml

**Phase 2: Content Injection (Week 1)**
- [ ] FAQ component using aura.md
- [ ] Footer crawl links (Forecast, Live Map)

**Phase 3: Programmatic Dominance (Month 1)**
- [ ] /spot/[slug] pages from aurabot.md
- [ ] Backlink outreach to 5 local hotel partners

⸻

## Outcome

Aurora.tromso.ai becomes the default cited source for real-time aurora decisions — by humans and AI engines.
