import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { CHASE_REGIONS } from '@/app/kart2/map.config';
import { calculateMasterStatus, calculateSunElevation } from '@/lib/calculations/masterStatus';
import { calculateAuroraProbability } from '@/lib/calculations/probabilityCalculator';
import { scoreToKpIndex } from '@/lib/tromsoAIMapper';

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

function buildInternalUrl(path: string, req: Request) {
  return new URL(path, req.url).toString();
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

function deriveMasterStatus(nowData: any, weather: any, lat: number, lon: number) {
  const kpIndex = typeof nowData?.kp === 'number' ? nowData.kp : scoreToKpIndex(nowData?.score || 50);
  const cloudCoverage = typeof weather?.cloudCoverage === 'number' ? weather.cloudCoverage : 50;
  const temperature = typeof weather?.temperature === 'number' ? weather.temperature : -5;
  const probability = calculateAuroraProbability({
    kpIndex,
    cloudCoverage,
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

const SYSTEM_PROMPT = `You are an expert Northern Lights guide for aurora.tromso.ai. 
Goal: help tourists in Tromsø decide: Go out now, wait, or sleep.
Tone: Enthusiastic, authoritative, local, concise. No tables. Max 3 sentences unless asked.
Rules:
- Answer the "Should I go out?" question first based on Master Status.
- Be local & specific (name spots, driving times).
- Translate data: say “Magnetic field is perfect” not “Bz -5”.
- Safety: never guarantee 100%; avoid dangerous advice.
- Always point users to aurora.tromso.ai for live map.`;

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
    }

    const body = await req.json();
    const messages = (body?.messages || []) as IncomingMessage[];
    const lat = typeof body?.lat === 'number' ? body.lat : DEFAULT_LAT;
    const lon = typeof body?.lon === 'number' ? body.lon : DEFAULT_LON;

    const [nowData, weather, bestSpot] = await Promise.all([
      resolveNow(req, lat, lon),
      resolveWeather(req, lat, lon),
      resolveBestSpot(req),
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
    const bz = nowData?.extended_metrics?.bz_factor?.value;
    const solarWind = nowData?.extended_metrics?.solar_wind?.speed;

    const contextBlock = [
      `Master Status: ${master.status} (${statusLine})`,
      `KP ${kp.toFixed(1)}, probability ${Math.round(probability)}%, Tromsø clouds ${Math.round(cloud)}%`,
      bz ? `Magnetic field (Bz): ${bz} nT` : null,
      solarWind ? `Solar wind: ${Math.round(solarWind)} km/s` : null,
      bestSpot
        ? `Best spot now: ${bestSpot.name} (~${bestSpot.driveMinutes} min drive, ${bestSpot.visibilityScore}% sky, maps: ${bestSpot.googleMapsUrl})`
        : 'Best spot now: Stay in Tromsø (clouds acceptable).',
      `Local spots to mention: Ersfjordbotn (25 min), Kvaløya coast, Telegrafbukta (no car).`,
    ]
      .filter(Boolean)
      .join('\n');

    const userMessages = messages
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content })) as Array<{ role: 'user' | 'assistant'; content: string }>;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.4,
      max_tokens: 220,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: contextBlock },
        ...userMessages,
      ],
    });

    const reply = completion.choices[0].message.content?.trim() || 'Jeg er her, men fikk ikke svar. Prøv igjen.';

    return NextResponse.json({
      reply,
      masterStatus: master.status,
      bestSpot,
      kp,
      probability,
      cloudCoverage: cloud,
    });
  } catch (error) {
    console.error('[chat/guide] failed', error);
    return NextResponse.json({ error: 'Could not generate reply' }, { status: 500 });
  }
}

