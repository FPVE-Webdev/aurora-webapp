import { ImageResponse } from 'next/server';
import { calculateMasterStatus, calculateSunElevation } from '@/lib/calculations/masterStatus';
import { calculateAuroraProbability } from '@/lib/calculations/probabilityCalculator';
import { scoreToKpIndex } from '@/lib/tromsoAIMapper';

export const runtime = 'edge';

const WIDTH = 1080;
const HEIGHT = 1920;
const DEFAULT_LAT = 69.6492;
const DEFAULT_LON = 18.9553;

async function fetchJson<T>(url: string) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function resolveContext(request: Request) {
  const base = new URL(request.url);
  const now = await fetchJson<any>(new URL('/api/aurora/now?lang=en', base).toString());
  const weather = await fetchJson<any>(new URL(`/api/weather/${DEFAULT_LAT}/${DEFAULT_LON}`, base).toString());

  const kp = typeof now?.kp === 'number' ? now.kp : scoreToKpIndex(now?.score || 50);
  const cloudCoverage = typeof weather?.cloudCoverage === 'number' ? weather.cloudCoverage : 50;
  const temperature = typeof weather?.temperature === 'number' ? weather.temperature : -5;
  const probability = calculateAuroraProbability({
    kpIndex: kp,
    cloudCoverage,
    temperature,
    latitude: DEFAULT_LAT,
  }).probability;
  const sunElevation = calculateSunElevation(DEFAULT_LAT, DEFAULT_LON, new Date());

  const master = calculateMasterStatus({
    probability,
    cloudCoverage,
    kpIndex: kp,
    sunElevation,
    latitude: DEFAULT_LAT,
    longitude: DEFAULT_LON,
  });

  return { kp, probability, cloudCoverage, master };
}

function statusBadge(status: string) {
  if (status === 'GO') return { label: '🟢 GO NOW', bg: '#16a34a' };
  if (status === 'WAIT') return { label: '🟠 WAIT', bg: '#f59e0b' };
  return { label: '⚪️ NO', bg: '#6b7280' };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location') || 'Tromsø';
    const spot = searchParams.get('spot') || '';

    const ctx = await resolveContext(request);
    const badge = statusBadge(ctx.master.status);
    const bestSpotLine = spot ? `Best spot: ${spot}` : 'Stay flexible and watch the sky.';

    return new ImageResponse(
      (
        <div
          style={{
            width: WIDTH,
            height: HEIGHT,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '64px',
            background: 'linear-gradient(180deg, #040715 0%, #0b1228 40%, #05070f 100%)',
            color: 'white',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                padding: '12px 18px',
                borderRadius: 999,
                backgroundColor: badge.bg,
                color: 'white',
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: 0.5,
              }}
            >
              {badge.label}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, opacity: 0.8 }}>Live from {location}</div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>
                {new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          <div
            style={{
              borderRadius: 32,
              border: '1px solid rgba(255,255,255,0.08)',
              padding: 32,
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 60%, rgba(255,255,255,0.01) 100%)',
              boxShadow: '0 20px 120px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              display: 'grid',
              gap: 18,
            }}
          >
            <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: -0.5 }}>aurora.tromso.ai</div>
            <div style={{ fontSize: 26, opacity: 0.8 }}>
              KP {ctx.kp.toFixed(1)} · {Math.round(ctx.probability)}% sjanse · {Math.round(ctx.cloudCoverage)}% skyer
            </div>
            <div style={{ fontSize: 24 }}>{bestSpotLine}</div>
            <div style={{ fontSize: 20, opacity: 0.7 }}>
              «Tourist-first» råd basert på live data. Ingen tabeller, bare klare anbefalinger.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 22, opacity: 0.7 }}>Del og tagg @aurora.tromso.ai</div>
            <div style={{ fontSize: 18, opacity: 0.55 }}>
              {new Date().toLocaleDateString('no-NO', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
    );
  } catch (error) {
    console.error('[share/story] failed', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}

