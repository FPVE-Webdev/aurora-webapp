import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ lat: string; lon: string }> }
) {
  try {
    const { lat: latStr, lon: lonStr } = await params;
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    // Try to fetch from MET.no API
    const metUrl = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;

    try {
      const response = await fetch(metUrl, {
        headers: {
          'User-Agent': 'AuroraTromso/1.0 (https://nordlystromso.app)'
        },
        next: { revalidate: 900 } // Cache for 15 minutes
      });

      if (response.ok) {
        const data = await response.json();
        const current = data.properties.timeseries[0].data.instant.details;

        return NextResponse.json({
          latitude: lat,
          longitude: lon,
          temperature: current.air_temperature,
          cloudCoverage: current.cloud_area_fraction,
          windSpeed: current.wind_speed,
          humidity: current.relative_humidity,
          source: 'met.no',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (metError) {
      console.warn('MET.no API error:', metError);
    }

    // Fallback to realistic demo data based on location
    // Northern locations are generally colder with more variation
    const baseTemp = lat > 70 ? -12 : lat > 68 ? -8 : lat > 66 ? -5 : 0;
    const temperature = baseTemp + (Math.random() * 10 - 5);

    const cloudCoverage = 20 + Math.random() * 60; // 20-80%
    const windSpeed = 2 + Math.random() * 12; // 2-14 m/s

    return NextResponse.json({
      latitude: lat,
      longitude: lon,
      temperature: Math.round(temperature * 10) / 10,
      cloudCoverage: Math.round(cloudCoverage),
      windSpeed: Math.round(windSpeed * 10) / 10,
      humidity: 60 + Math.round(Math.random() * 30),
      source: 'fallback',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}
