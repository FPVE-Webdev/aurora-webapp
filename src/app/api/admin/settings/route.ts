import { NextResponse } from 'next/server';

type AppSettings = {
  mapMode: 'demo' | 'live';
  devMode: boolean;
  showBetaBadge: boolean;
};

const DEFAULT_SETTINGS: AppSettings = {
  mapMode: 'live',
  devMode: true,
  showBetaBadge: true,
};

// In-memory settings (dev/runtime only). Keeps behavior stable without introducing new data sources.
let settings: AppSettings = { ...DEFAULT_SETTINGS };

export async function GET() {
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Expected application/json' }, { status: 415 });
    }

    const body = (await request.json()) as Partial<AppSettings>;

    const next: AppSettings = {
      mapMode: body.mapMode === 'live' ? 'live' : 'demo',
      devMode: Boolean(body.devMode),
      showBetaBadge: body.showBetaBadge === false ? false : true,
    };

    settings = next;

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save settings' },
      {
        status: 400,
      }
    );
  }
}
