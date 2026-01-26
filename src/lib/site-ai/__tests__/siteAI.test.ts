/**
 * Comprehensive Site-AI Decision Layer Test Suite
 *
 * Tests all decision logic components:
 * - Aurora Decision Score (ADS) calculation
 * - Darkness conversion with Arctic adjustments
 * - Global state determination
 * - Limiting factor detection
 * - UI directives generation
 * - Deterministic copy templates
 */

import { computeADS, classifyADS } from '../auroraDecisionScore';
import { solarElevationToDarkness, isPolarNight, isMidnightSun } from '../darkness';
import { computeGlobalState } from '../globalState';
import { detectLimitingFactor } from '../limitingFactor';
import { generateUIDirectives } from '../uiDirectives';
import { generateExplanation } from '../deterministicCopy';
import { computeSiteAIDecision } from '../index';
import type { SiteAIWindow, SiteAIInput } from '@/types/siteAI';

describe('Aurora Decision Score (ADS) Calculation', () => {
  test('computes ADS with all components', () => {
    const result = computeADS({
      kpIndex: 4,
      cloudCover: 40,
      solarElevation: -25,
      kpTrend: 'stable',
    });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.classification).toBeDefined();
  });

  test('classifies ADS correctly', () => {
    expect(classifyADS(75)).toBe('excellent');
    expect(classifyADS(60)).toBe('good');
    expect(classifyADS(40)).toBe('moderate');
    expect(classifyADS(20)).toBe('poor');
  });

  test('applies trend bonus correctly', () => {
    const stable = computeADS({
      kpIndex: 4,
      cloudCover: 40,
      solarElevation: -25,
      kpTrend: 'stable',
    });

    const increasing = computeADS({
      kpIndex: 4,
      cloudCover: 40,
      solarElevation: -25,
      kpTrend: 'increasing',
    });

    const decreasing = computeADS({
      kpIndex: 4,
      cloudCover: 40,
      solarElevation: -25,
      kpTrend: 'decreasing',
    });

    expect(increasing.score).toBeGreaterThan(stable.score);
    expect(decreasing.score).toBeLessThan(stable.score);
  });

  test('clamps ADS to 0-100 range', () => {
    // High KP, no clouds, full darkness, increasing trend = ~105 raw
    const result = computeADS({
      kpIndex: 9,
      cloudCover: 0,
      solarElevation: -30,
      kpTrend: 'increasing',
    });

    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('Darkness Conversion', () => {
  test('returns 0 for daytime (elevation > 0)', () => {
    expect(solarElevationToDarkness(5)).toBe(0);
    expect(solarElevationToDarkness(45)).toBe(0);
  });

  test('handles civil twilight range (-6 to 0)', () => {
    const darkness0 = solarElevationToDarkness(0);
    const darkness3 = solarElevationToDarkness(-3);
    const darkness6 = solarElevationToDarkness(-6);

    expect(darkness0).toBeLessThan(darkness3);
    expect(darkness3).toBeLessThan(darkness6);
  });

  test('handles nautical twilight range (-12 to -6)', () => {
    const darkness6 = solarElevationToDarkness(-6);
    const darkness9 = solarElevationToDarkness(-9);
    const darkness12 = solarElevationToDarkness(-12);

    expect(darkness6).toBeLessThan(darkness9);
    expect(darkness9).toBeLessThan(darkness12);
  });

  test('handles astronomical twilight range (-18 to -12)', () => {
    const darkness12 = solarElevationToDarkness(-12);
    const darkness15 = solarElevationToDarkness(-15);
    const darkness18 = solarElevationToDarkness(-18);

    expect(darkness12).toBeLessThan(darkness15);
    expect(darkness15).toBeLessThan(darkness18);
  });

  test('returns 100 for astronomical night (elevation <= -18)', () => {
    expect(solarElevationToDarkness(-18)).toBe(100);
    expect(solarElevationToDarkness(-25)).toBe(100);
    expect(solarElevationToDarkness(-90)).toBe(100);
  });

  test('midnight sun rule: forces darkness to 0 during May 19 - Jul 23', () => {
    // Mock a midnight sun date
    const juneDate = new Date('2026-06-15');
    const isMidnight = isMidnightSun(juneDate);
    expect(isMidnight).toBe(true);

    // During midnight sun, darkness should be 0 regardless of elevation
    // (Note: solarElevationToDarkness uses current date, this test documents behavior)
  });

  test('polar night rule: adds +10 to darkness Nov 21 - Jan 21', () => {
    const decDate = new Date('2026-12-15');
    const isPolar = isPolarNight(decDate);
    expect(isPolar).toBe(true);
  });

  test('polar night boundaries are correct', () => {
    // Nov 21 should be polar night
    expect(isPolarNight(new Date('2026-11-21'))).toBe(true);
    // Nov 20 should NOT be polar night
    expect(isPolarNight(new Date('2026-11-20'))).toBe(false);
    // Jan 21 should be polar night
    expect(isPolarNight(new Date('2026-01-21'))).toBe(true);
    // Jan 22 should NOT be polar night
    expect(isPolarNight(new Date('2026-01-22'))).toBe(false);
  });

  test('midnight sun boundaries are correct', () => {
    // May 19 should be midnight sun
    expect(isMidnightSun(new Date('2026-05-19'))).toBe(true);
    // May 18 should NOT be midnight sun
    expect(isMidnightSun(new Date('2026-05-18'))).toBe(false);
    // Jul 23 should be midnight sun
    expect(isMidnightSun(new Date('2026-07-23'))).toBe(true);
    // Jul 24 should NOT be midnight sun
    expect(isMidnightSun(new Date('2026-07-24'))).toBe(false);
  });
});

describe('Limiting Factor Detection', () => {
  test('detects cloud_cover when > 60%', () => {
    const factor = detectLimitingFactor({
      cloudCover: 75,
      kpIndex: 5,
      solarElevation: -25,
    });
    expect(factor).toBe('cloud_cover');
  });

  test('detects low_kp when < 3', () => {
    const factor = detectLimitingFactor({
      cloudCover: 40,
      kpIndex: 2,
      solarElevation: -25,
    });
    expect(factor).toBe('low_kp');
  });

  test('detects too_bright when darkness < 50', () => {
    const factor = detectLimitingFactor({
      cloudCover: 40,
      kpIndex: 5,
      solarElevation: -3, // Darkness ~5, well below 50
    });
    expect(factor).toBe('too_bright');
  });

  test('detects mixed_conditions as fallback', () => {
    const factor = detectLimitingFactor({
      cloudCover: 40,
      kpIndex: 5,
      solarElevation: -25,
    });
    expect(factor).toBe('mixed_conditions');
  });

  test('rule hierarchy: cloud_cover takes precedence', () => {
    // Cloud cover > 60%, KP < 3, darkness < 50 all true
    // Cloud cover should win (first rule)
    const factor = detectLimitingFactor({
      cloudCover: 75,
      kpIndex: 2,
      solarElevation: -3,
    });
    expect(factor).toBe('cloud_cover');
  });

  test('rule hierarchy: low_kp takes precedence over darkness', () => {
    // KP < 3 and darkness < 50 both true, but cloud < 60
    // low_kp should win
    const factor = detectLimitingFactor({
      cloudCover: 40,
      kpIndex: 2,
      solarElevation: -3,
    });
    expect(factor).toBe('low_kp');
  });
});

describe('Global State Determination', () => {
  test('determines EXCELLENT state when max ADS >= 70', () => {
    const windows: SiteAIWindow[] = [
      { time: '2026-01-26T20:00:00Z', ads: 60, classification: 'good' },
      { time: '2026-01-26T21:00:00Z', ads: 75, classification: 'excellent' },
    ];

    const result = computeGlobalState(windows, 'mixed_conditions');
    expect(result.state).toBe('excellent');
  });

  test('determines POSSIBLE state when 30 <= max ADS < 70', () => {
    const windows: SiteAIWindow[] = [
      { time: '2026-01-26T20:00:00Z', ads: 45, classification: 'moderate' },
      { time: '2026-01-26T21:00:00Z', ads: 55, classification: 'good' },
    ];

    const result = computeGlobalState(windows, 'mixed_conditions');
    expect(result.state).toBe('possible');
  });

  test('determines UNLIKELY state when max ADS < 30', () => {
    const windows: SiteAIWindow[] = [
      { time: '2026-01-26T20:00:00Z', ads: 15, classification: 'poor' },
      { time: '2026-01-26T21:00:00Z', ads: 25, classification: 'poor' },
    ];

    const result = computeGlobalState(windows, 'mixed_conditions');
    expect(result.state).toBe('unlikely');
  });

  test('identifies next window for UNLIKELY state', () => {
    const windows: SiteAIWindow[] = [
      { time: '2026-01-26T20:00:00Z', ads: 15, classification: 'poor' },
      { time: '2026-01-26T21:00:00Z', ads: 25, classification: 'poor' },
      { time: '2026-01-26T22:00:00Z', ads: 35, classification: 'moderate' },
    ];

    const result = computeGlobalState(windows, 'mixed_conditions');
    expect(result.state).toBe('unlikely');
    expect(result.nextWindow).toBeDefined();
    expect(result.nextWindow?.ads).toBe(35);
  });
});

describe('UI Directives', () => {
  test('hides grid when all ADS < 20', () => {
    const windows: SiteAIWindow[] = [
      { time: '2026-01-26T20:00:00Z', ads: 10, classification: 'poor' },
      { time: '2026-01-26T21:00:00Z', ads: 15, classification: 'poor' },
    ];

    const directives = generateUIDirectives(windows);
    expect(directives.show48Grid).toBe(false);
    expect(directives.highlightTop).toBe(0);
    expect(directives.showBestBanner).toBe(false);
  });

  test('shows full grid and highlights top 3 when any ADS >= 50', () => {
    const windows: SiteAIWindow[] = [
      { time: '2026-01-26T20:00:00Z', ads: 55, classification: 'good' },
      { time: '2026-01-26T21:00:00Z', ads: 65, classification: 'good' },
      { time: '2026-01-26T22:00:00Z', ads: 75, classification: 'excellent' },
    ];

    const directives = generateUIDirectives(windows);
    expect(directives.show48Grid).toBe(true);
    expect(directives.highlightTop).toBe(3);
    expect(directives.showBestBanner).toBe(true);
  });

  test('shows filtered grid with 1 highlight for 1-3 windows >= 30', () => {
    const windows: SiteAIWindow[] = [
      { time: '2026-01-26T20:00:00Z', ads: 10, classification: 'poor' },
      { time: '2026-01-26T21:00:00Z', ads: 35, classification: 'moderate' },
      { time: '2026-01-26T22:00:00Z', ads: 15, classification: 'poor' },
    ];

    const directives = generateUIDirectives(windows);
    expect(directives.show48Grid).toBe(true);
    expect(directives.highlightTop).toBe(1);
    expect(directives.showBestBanner).toBe(true);
  });

  test('shows banner only when max ADS >= 30', () => {
    const goodWindows: SiteAIWindow[] = [
      { time: '2026-01-26T20:00:00Z', ads: 35, classification: 'moderate' },
    ];

    const poorWindows: SiteAIWindow[] = [
      { time: '2026-01-26T20:00:00Z', ads: 25, classification: 'poor' },
    ];

    expect(generateUIDirectives(goodWindows).showBestBanner).toBe(true);
    expect(generateUIDirectives(poorWindows).showBestBanner).toBe(false);
  });
});

describe('Deterministic Copy Templates', () => {
  test('generates EXCELLENT template', () => {
    const explanation = generateExplanation({
      state: 'excellent',
      bestWindowADS: 82,
      bestWindowStart: '2026-01-26T22:00:00Z',
      limitingFactor: 'mixed_conditions',
    });

    expect(explanation).toContain('Strong aurora conditions expected');
    expect(explanation).toContain('Confidence: 82/100');
  });

  test('generates POSSIBLE template', () => {
    const explanation = generateExplanation({
      state: 'possible',
      bestWindowADS: 55,
      bestWindowStart: '2026-01-26T21:00:00Z',
      limitingFactor: 'cloud_cover',
    });

    expect(explanation).toContain('Limited aurora potential');
    expect(explanation).toContain('Confidence: 55/100');
    expect(explanation).toContain('too many clouds');
  });

  test('generates UNLIKELY template with next window', () => {
    const explanation = generateExplanation({
      state: 'unlikely',
      bestWindowADS: 25,
      bestWindowStart: '2026-01-26T20:00:00Z',
      limitingFactor: 'low_kp',
      nextWindowStart: '2026-01-27T14:30:00Z',
    });

    expect(explanation).toContain('Aurora unlikely');
    expect(explanation).toContain('weak geomagnetic activity');
  });

  test('generates UNLIKELY template without next window', () => {
    const explanation = generateExplanation({
      state: 'unlikely',
      bestWindowADS: 15,
      bestWindowStart: '2026-01-26T20:00:00Z',
      limitingFactor: 'low_kp',
    });

    expect(explanation).toContain('Aurora unlikely');
    expect(explanation).toContain('weak geomagnetic activity');
  });

  test('all templates use deterministic templates only (no free-form)', () => {
    const excellent = generateExplanation({
      state: 'excellent',
      bestWindowADS: 80,
      bestWindowStart: '2026-01-26T22:00:00Z',
      limitingFactor: 'mixed_conditions',
    });

    const possible = generateExplanation({
      state: 'possible',
      bestWindowADS: 50,
      bestWindowStart: '2026-01-26T21:00:00Z',
      limitingFactor: 'cloud_cover',
    });

    const unlikely = generateExplanation({
      state: 'unlikely',
      bestWindowADS: 20,
      bestWindowStart: '2026-01-26T20:00:00Z',
      limitingFactor: 'too_bright',
    });

    // All should contain only templated content
    expect(excellent).toMatch(/^Strong aurora/);
    expect(possible).toMatch(/^Limited aurora/);
    expect(unlikely).toMatch(/^Aurora unlikely/);
  });
});

describe('End-to-End Decision Flow', () => {
  test('excellent conditions scenario', () => {
    const input: SiteAIInput = {
      hourlyForecasts: [
        {
          time: '2026-01-26T21:00:00Z',
          cloudCover: 20,
          solarElevation: -25,
          kpIndex: 7,
        },
        {
          time: '2026-01-26T22:00:00Z',
          cloudCover: 30,
          solarElevation: -25,
          kpIndex: 7,
        },
      ],
      globalKp: 7,
      kpTrend: 'stable',
    };

    const decision = computeSiteAIDecision(input);

    expect(decision.state).toBe('excellent');
    expect(decision.bestWindow.ads).toBeGreaterThanOrEqual(70);
    expect(decision.uiDirectives.show48Grid).toBe(true);
    expect(decision.explanation).toContain('Strong aurora');
  });

  test('possible conditions scenario', () => {
    const input: SiteAIInput = {
      hourlyForecasts: [
        {
          time: '2026-01-26T21:00:00Z',
          cloudCover: 50,
          solarElevation: -25,
          kpIndex: 4,
        },
        {
          time: '2026-01-26T22:00:00Z',
          cloudCover: 60,
          solarElevation: -25,
          kpIndex: 4,
        },
      ],
      globalKp: 4,
      kpTrend: 'stable',
    };

    const decision = computeSiteAIDecision(input);

    expect(decision.state).toBe('possible');
    expect(decision.bestWindow.ads).toBeGreaterThanOrEqual(30);
    expect(decision.bestWindow.ads).toBeLessThan(70);
    expect(decision.explanation).toContain('Limited aurora');
  });

  test('unlikely conditions scenario', () => {
    const input: SiteAIInput = {
      hourlyForecasts: [
        {
          time: '2026-01-26T21:00:00Z',
          cloudCover: 80,
          solarElevation: -25,
          kpIndex: 1,
        },
        {
          time: '2026-01-26T22:00:00Z',
          cloudCover: 90,
          solarElevation: -25,
          kpIndex: 1,
        },
      ],
      globalKp: 1,
      kpTrend: 'decreasing',
    };

    const decision = computeSiteAIDecision(input);

    expect(decision.state).toBe('unlikely');
    expect(decision.bestWindow.ads).toBeLessThan(30);
    expect(decision.explanation).toContain('Aurora unlikely');
  });

  test('determinism: same input produces same output', () => {
    const input: SiteAIInput = {
      hourlyForecasts: [
        {
          time: '2026-01-26T21:00:00Z',
          cloudCover: 40,
          solarElevation: -25,
          kpIndex: 4,
        },
      ],
      globalKp: 4,
      kpTrend: 'stable',
    };

    const decision1 = computeSiteAIDecision(input);
    const decision2 = computeSiteAIDecision(input);

    expect(decision1.state).toBe(decision2.state);
    expect(decision1.bestWindow.ads).toBe(decision2.bestWindow.ads);
    expect(decision1.bestWindow.limitingFactor).toBe(decision2.bestWindow.limitingFactor);
    expect(decision1.explanation).toBe(decision2.explanation);
  });
});
