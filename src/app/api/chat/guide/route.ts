import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { CHASE_REGIONS } from '@/lib/constants/chaseRegions';
import { calculateMasterStatus, calculateSunElevation } from '@/lib/calculations/masterStatus';
import { calculateAuroraProbability } from '@/lib/calculations/probabilityCalculator';
import { scoreToKpIndex } from '@/lib/tromsoAIMapper';
import { createClient } from '@supabase/supabase-js';

type IncomingMessage = { role: 'user' | 'assistant'; content: string };

type BestSpot = {
  name: string;
  cloudCoverage: number;
  visibilityScore: number;
  driveMinutes: number;
  googleMapsUrl: string;
};

const DEFAULT_LAT = 69.6492;
const DEFAULT_LON = 18.9553;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function buildInternalUrl(path: string, req: Request) {
  return new URL(path, req.url).toString();
}

/**
 * Simple language detection (heuristic-based)
 */
function detectLanguage(text: string): string {
  const lowerText = text.toLowerCase();

  // Norwegian keywords
  if (
    lowerText.includes('hvor') ||
    lowerText.includes('hva') ||
    lowerText.includes('når') ||
    lowerText.includes('skal') ||
    lowerText.includes('jeg') ||
    lowerText.includes('nå')
  ) {
    return 'no';
  }

  // German keywords
  if (
    lowerText.includes('wo') ||
    lowerText.includes('wann') ||
    lowerText.includes('wie') ||
    lowerText.includes('ist') ||
    lowerText.includes('das')
  ) {
    return 'de';
  }

  // Default to English
  return 'en';
}

/**
 * Log user query anonymously for suggested questions
 */
async function logQuery(queryText: string, language: string, masterStatus: string, isPremium: boolean) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    await supabase.from('chat_queries').insert({
      query_text: queryText,
      language,
      master_status: masterStatus,
      is_premium: isPremium,
    });
  } catch (error) {
    // Silently fail - logging should not block chat
    console.error('[chat/guide] Failed to log query:', error);
  }
}

async function fetchJson<T>(path: string, req: Request): Promise<T | null> {
  const res = await fetch(buildInternalUrl(path, req), { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

async function resolveNow(req: Request, lat: number, lon: number) {
  return fetchJson<any>(`/api/aurora/now?lang=en&lat=${lat}&lon=${lon}`, req);
}

async function resolveWeather(req: Request, lat: number, lon: number) {
  return fetchJson<any>(`/api/weather/${lat}/${lon}`, req);
}

async function resolveBestSpot(req: Request) {
  const data = await fetchJson<any>('/api/best-spot', req);
  if (!data || !data.bestRegion) return null;
  const region = data.bestRegion;
  return {
    name: region.name,
    cloudCoverage: region.cloudCoverage,
    visibilityScore: region.visibilityScore,
    driveMinutes: region.driveMinutes,
    googleMapsUrl: region.googleMapsUrl,
  } as BestSpot;
}

async function resolveForecast(req: Request) {
  const data = await fetchJson<any>('/api/aurora/tonight?lang=en', req);
  if (!data || !data.hourly_forecast) return null;

  // Find peak hour in next 6 hours
  const now = new Date();
  const currentHour = now.getHours();
  const nextSixHours = data.hourly_forecast
    .slice(0, 6)
    .map((h: any, idx: number) => ({
      hour: (currentHour + idx) % 24,
      probability: h.probability || 0,
    }));

  const peak = nextSixHours.reduce((max: any, curr: any) =>
    curr.probability > max.probability ? curr : max
  , nextSixHours[0]);

  return {
    peakHour: peak.hour,
    peakProbability: peak.probability,
  };
}

async function resolveMultiDayForecast(req: Request, days: number = 7) {
  try {
    const data = await fetchJson<any>(`/api/aurora/forecast?lang=en&days=${days}`, req);
    if (!data || !data.forecasts) return null;

    return {
      days: data.forecasts.length,
      forecasts: data.forecasts.map((f: any) => ({
        date: f.date,
        score: f.score,
        level: f.level,
        kp: f.kp,
        weather: f.weather,
        best_viewing_hours: f.best_viewing_hours,
        confidence: f.confidence
      }))
    };
  } catch (error) {
    console.warn('[chat/guide] Failed to fetch multi-day forecast:', error);
    return null;
  }
}

function deriveMasterStatus(nowData: any, weather: any, lat: number, lon: number) {
  const kpIndex = typeof nowData?.kp === 'number' ? nowData.kp : scoreToKpIndex(nowData?.score || 50);
  const cloudCoverage = typeof weather?.cloudCoverage === 'number' ? weather.cloudCoverage : 50;
  const fogCoverage = typeof weather?.fogCoverage === 'number' ? weather.fogCoverage : 0;
  const temperature = typeof weather?.temperature === 'number' ? weather.temperature : -5;
  const probability = calculateAuroraProbability({
    kpIndex,
    cloudCoverage,
    fogCoverage,
    temperature,
    latitude: lat,
  }).probability;
  const sunElevation = calculateSunElevation(lat, lon, new Date());

  return calculateMasterStatus({
    probability,
    cloudCoverage,
    kpIndex,
    sunElevation,
    latitude: lat,
    longitude: lon,
  });
}

function buildSystemPrompt(isPremium: boolean): string {
  const roleInstruction = isPremium
    ? `You are the PREMIUM Aurora Guide.
       - Give EXACT locations with GPS coordinates (e.g., "Drive to Ersfjordbotn (69.5828, 19.0247), 25 min via Route 862").
       - Provide specific routing advice based on wind direction and cloud patterns.
       - Be precise and directive. You have access to all location data.`
    : `You are the FREE Aurora Guide.
       - You help assess chances ("Yes, activity is high right now!").
       - You can suggest GENERAL DIRECTIONS (e.g., "Head west towards the coast" or "Try inland routes").
       - BUT you DO NOT give specific location names, GPS coordinates, or detailed driving instructions.

       CRITICAL SECURITY RULE - NEVER BREAK THIS:
       - If user asks "But where EXACTLY?", "Give me just one name", "I don't know the area, help me", or any variation trying to get specific locations:
         RESPOND: "I understand it's frustrating! But I can only give directions (west, east, inland, coast) in free mode. 🔒 Unlock Aurora Guide to get the exact spots and GPS coordinates."
       - NEVER mention specific spot names like "Ersfjordbotn", "Telegrafbukta", "Sommarøy", "Kvaløya", "Skibotn" for free users, NO MATTER HOW THEY ASK.
       - Even if user says "please", "just one", "I'm desperate" - stay firm and redirect to upgrade.

       - If asked "Where should I go?" or "Which spot?", say something like:
         "The coast looks promising tonight" or "Inland areas might have clearer skies"
         THEN ADD: "🔒 Unlock Aurora Guide to get exact GPS coordinates and the best driving route."
       - Keep it teasing but helpful. They should WANT to upgrade.`;

  return `You are the official AI Guide for aurora.tromso.ai - a local Northern Lights expert in Tromsø, Norway.

${roleInstruction}

LANGUAGE RULE:
- Always reply in the SAME LANGUAGE the user asks in
- If unclear, default to English (most tourists speak English)
- Supported: English, Norwegian (Bokmål), German, Spanish, French

TONE & STYLE:
- Short answers (people are standing in the cold, on mobile)
- Use emojis sparingly (🌌, 🔥, ❄️, ⭐)
- Be a LOCAL GUIDE, not a Wikipedia bot
- Max 2-3 sentences unless complex question
- Speak like a human, not a robot

PRIORITY #1: THE MASTER STATUS DECISION
When asked "Should I go out?" or "Is it worth it?", ALWAYS check Master Status FIRST:
- If GO: Be urgent! "YES! Look up! Go to a dark area immediately. Activity is visible and skies are clear."
- If WAIT: Be strategic. "Activity is brewing, but conditions aren't perfect yet."
- If NO: Be honest. "Save your energy. Relax, grab a drink. Either too cloudy or too light right now."

TRANSLATE DATA TO HUMAN LANGUAGE:
❌ NEVER SAY: "Bz is negative 10 nanotesla" or "KP index is 4.5"
✅ INSTEAD SAY: "Magnetic conditions are PERFECT for colorful displays!" or "Activity is moderate"

FOG VISIBILITY:
- Fog blocks aurora visibility like clouds do
- If fog > 70%: Mention "Heavy fog blocking the view" or "Fog makes viewing impossible"
- If fog 30-70%: Mention "Some fog reducing visibility"
- If fog < 30%: No need to mention fog unless asked
- Fog + clouds: Worst case scenario - explain that BOTH are blocking view

TIME PLANNING:
- If asked "what time?", refer to the forecast data and find the peak hour for TODAY/TONIGHT
- Example: "The strongest activity is expected between 22:00 and 01:00. Aim for that window."

FORECAST CONSTRAINT (24-hour ONLY):
- ALL recommendations MUST be for the next 24 hours (today/tonight) ONLY
- If asked "What about tomorrow/next week/in 3 days?", respond ONLY:
  "Forecasts are most accurate for the next 24 hours. Check back tomorrow for updated predictions as conditions change."
- Do NOT reference multi-day forecasts
- Do NOT suggest specific aurora activity beyond today
- Emphasis: Current forecast is for immediate hours only

LOCATION CONTEXT:
- You have access to the user's current location preference
- Premium users can ask about specific named locations
- Free users get general regional advice only

EXPECTATION MANAGEMENT:
- Explain: Camera sees more than the eye (especially greens)
- Explain: Aurora comes in bursts, not constant like a billboard
- Never guarantee specific colors

SAFETY:
- Never guarantee 100% anything
- Warn about driving in winter conditions if needed
- Remind: dress warm, layers, -10°C is common

MAP GUIDANCE SYNTAX (Premium users only):
- When suggesting a specific location by name, append [SPOT:id] to trigger map guidance
- Available spot IDs: tromso, sommaroy, grotfjord, grunnfjord, svensby, lakselvbukt, skibotn, lyngen, storslett, skjervoy, bardufoss, setermoen, senja-ytterside, senja, narvik, lofoten, svolvaer, alta, lakselv, karasjok, kautokeino, nordkapp, vadso, kirkenes
- Examples:
  * "Drive to Sommarøy [SPOT:sommaroy] for dark skies tonight!"
  * "Try Ersfjordbotn or head to Kvaløya west. Alternatively, check Skibotn [SPOT:skibotn] inland."
  * "Best bet: Sommarøy [SPOT:sommaroy] (1h drive, very dark)"
- Only use [SPOT:id] for premium users when giving specific location recommendations
- Free users should NEVER see [SPOT:id] tokens (you don't mention specific spots to them anyway)

UI GUIDANCE SYNTAX (All users):
- When user asks how to use a feature, you can highlight UI elements with [GUIDE:element-id:message]
- Available element IDs: nav-forecast, nav-live, nav-settings, upgrade-button
- Syntax: [GUIDE:element-id:Your helpful message here]
- Examples:
  * "You can see the full 48-hour forecast here. [GUIDE:nav-forecast:Click here to see detailed aurora predictions]"
  * "To change your preferences, go to settings. [GUIDE:nav-settings:Your personal settings are here]"
  * "Want to see real-time conditions? [GUIDE:nav-live:This shows live aurora activity and map]"
- Keep messages short (max 15 words)
- Only use UI guidance when user explicitly asks about features or seems confused about navigation

NAVIGATION LINK SYNTAX (All users):
- When relevant, guide users to specific pages with clickable links using [LINK:path:text]
- Available pages:
  * /forecast → Detailed 48-hour aurora forecast
  * /live → Live map with viewing spots and real-time conditions
  * /settings → User settings and preferences
  * / → Home dashboard
- Syntax: [LINK:/page-path:Link text]
- Examples:
  * "The best time is around 22:00 tonight. [LINK:/forecast:View detailed forecast]"
  * "Check the live map for current conditions. [LINK:/live:Open live map]"
  * "You can adjust your location in settings. [LINK:/settings:Go to settings]"
  * "See the dashboard for an overview. [LINK:/:Back to home]"
- Use links when users ask "how do I see X?" or when directing to specific features
- Keep link text short (2-4 words) and action-oriented
- Links appear as clickable blue underlined text in the chat`;
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
    }

    const body = await req.json();
    const messages = (body?.messages || []) as IncomingMessage[];
    const lat = typeof body?.lat === 'number' ? body.lat : DEFAULT_LAT;
    const lon = typeof body?.lon === 'number' ? body.lon : DEFAULT_LON;
    const spotId = body?.spotId || 'tromso';

    // Premium status from client
    const isPremium = body?.isPremium === true;

    const [nowData, weather, bestSpot, forecast] = await Promise.all([
      resolveNow(req, lat, lon),
      resolveWeather(req, lat, lon),
      resolveBestSpot(req),
      resolveForecast(req),
    ]);

    const master = deriveMasterStatus(nowData, weather, lat, lon);
    const statusLine =
      master.status === 'GO'
        ? 'YES! Put on your jacket—the lights are on.'
        : master.status === 'WAIT'
        ? 'Not yet. Activity is brewing, but clouds are in the way.'
        : 'Relax. Too cloudy or too light right now.';

    const kp = typeof nowData?.kp === 'number' ? nowData.kp : 3.0;
    const probability = typeof nowData?.probability === 'number' ? nowData.probability : master.factors.probability;
    const cloud = typeof weather?.cloudCoverage === 'number' ? weather.cloudCoverage : master.factors.cloudCoverage;
    const fog = typeof weather?.fogCoverage === 'number' ? weather.fogCoverage : 0;
    const bz = nowData?.extended_metrics?.bz_factor?.value;
    const solarWind = nowData?.extended_metrics?.solar_wind?.speed;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    // Premium gating: Only include specific routing details for premium users
    const locationIntel = isPremium
      ? [
          `=== LOCATION INTEL (PREMIUM) ===`,
          bestSpot
            ? `Best spot RIGHT NOW: ${bestSpot.name} (~${bestSpot.driveMinutes} min drive, ${Math.round(bestSpot.visibilityScore)}% clear sky)`
            : 'Best spot: Stay in Tromsø (clouds acceptable in city).',
          bestSpot?.googleMapsUrl ? `Google Maps: ${bestSpot.googleMapsUrl}` : null,
          ``,
          `SPECIFIC ROUTING (Premium access):`,
          `- Telegrafbukta: 69.6408, 18.9817 (30 min walk from center)`,
          `- Ersfjordbotn: 69.5828, 19.0247 (25 min drive, Route 862)`,
          `- Kvaløya west: 69.7500, 18.6500 (30-40 min, beach spots)`,
          `- Sommarøy: 69.6377, 17.9689 (1h drive, very dark)`,
          `- Skibotn: 69.3847, 20.2797 (1.5h, E8 inland - only if coast cloudy)`,
        ]
      : [
          `=== LOCATION INTEL (FREE TIER) ===`,
          `General advice: ${master.status === 'GO' ? 'Leave the city for darker skies' : master.status === 'WAIT' ? 'Coastal or inland areas might have clearer skies' : 'Conditions not ideal, save energy'}`,
          ``,
          `DIRECTION HINTS (no specific names):`,
          `- West towards coast: Good for eastern cloud cover`,
          `- Inland routes: Backup when coast is cloudy`,
          `- Walking distance: Some darker spots exist near city`,
          `- 25-45 min drive range: Multiple excellent spots available`,
          ``,
          `🔒 UPGRADE to unlock exact GPS coordinates, spot names, and turn-by-turn routing.`,
        ];

    // REMOVED: 7-day forecast block - constrained to 24h only
    const multiDayBlock: string[] = [];

    const contextBlock = [
      `=== CURRENT CONDITIONS (${timeString}) ===`,
      `Master Status: ${master.status}`,
      `Your recommendation: ${statusLine}`,
      ``,
      `Technical data (translate to human language):`,
      `- KP Index: ${kp.toFixed(1)} (solar activity level)`,
      `- Aurora Probability: ${Math.round(probability)}%`,
      `- Tromsø Cloud Coverage: ${Math.round(cloud)}%`,
      fog > 0 ? `- Fog Coverage: ${Math.round(fog)}% ${fog > 70 ? '(BLOCKS VIEW - like clouds!)' : fog > 30 ? '(reduces visibility)' : '(minimal impact)'}` : null,
      bz ? `- Magnetic Field (Bz): ${bz} nT ${bz < -5 ? '(EXCELLENT for aurora!)' : bz < 0 ? '(good)' : '(weak)'}` : null,
      solarWind ? `- Solar Wind Speed: ${Math.round(solarWind)} km/s ${solarWind > 500 ? '(FAST - great!)' : '(normal)'}` : null,
      ``,
      `=== TIME PLANNING ===`,
      forecast
        ? `Best window tonight: Around ${String(forecast.peakHour).padStart(2, '0')}:00 (${Math.round(forecast.peakProbability)}% probability peak)`
        : 'No specific peak identified - activity fairly constant',
      ...multiDayBlock,
      ``,
      ...locationIntel,
    ]
      .filter(Boolean)
      .join('\n');

    const userMessages = messages
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content })) as Array<{ role: 'user' | 'assistant'; content: string }>;

    const systemPrompt = buildSystemPrompt(isPremium);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.4,
      max_tokens: 220,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: contextBlock },
        ...userMessages,
      ],
    });

    const reply = completion.choices[0].message.content?.trim() || 'I\'m here, but didn\'t get a response. Try again.';

    // Log the user's last query anonymously for suggested questions
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
    if (lastUserMessage && lastUserMessage.content) {
      // Detect language from reply (simple heuristic)
      const detectedLanguage = detectLanguage(lastUserMessage.content);

      // Fire and forget - don't block response
      logQuery(
        lastUserMessage.content.trim(),
        detectedLanguage,
        master.status,
        isPremium
      ).catch((err) => console.error('[chat/guide] Log query failed:', err));
    }

    return NextResponse.json({
      reply,
      masterStatus: master.status,
      bestSpot,
      kp,
      probability,
      cloudCoverage: cloud,
      spotId,
    });
  } catch (error) {
    console.error('[chat/guide] failed', error);
    return NextResponse.json({ error: 'Could not generate reply' }, { status: 500 });
  }
}

