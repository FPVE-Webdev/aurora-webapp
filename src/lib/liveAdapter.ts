/**
 * Live Adapter – Interpretation Layer for /live View
 *
 * Converts SiteAIDecision (from /forecast logic) into /live-specific UI guidance.
 * No decision-making happens here. Only interprets Site-AI output for immediate
 * actionability (is it worth going outside NOW?).
 *
 * All decisions originate from Site-AI. This adapter merely translates.
 */

import { SiteAIDecision } from '@/types/siteAI';

/**
 * Output format for /live UI components.
 * Derived entirely from Site-AI decision state, not independently calculated.
 */
export interface LiveAdapterOutput {
  /** Should user go outside now? (EXCELLENT state only) */
  isBestNow: boolean;

  /** User-facing advice level */
  adviceLevel: 'go' | 'not_worth_it';

  /** Short, actionable reason derived from Site-AI explanation */
  reason: string;

  /** When conditions might improve (if UNLIKELY or POSSIBLE with future window) */
  nextBestTime?: Date;

  /** Confidence score for advisory (inherited from Site-AI ADS) */
  confidence: number;

  /** Limiting factor description (from Site-AI) */
  limitingFactor: string;
}

/**
 * Shorten Site-AI explanation for /live's immediate-action context.
 * Removes timing details, focuses on "go or don't".
 */
function shortenExplanation(explanation: string): string {
  // EXCELLENT: "Strong aurora conditions expected. Best viewing time: {{time}}. Confidence: {{ADS}}/100."
  // → "Strong conditions now"
  if (explanation.includes('Strong aurora conditions expected')) {
    return 'Strong aurora conditions now';
  }

  // POSSIBLE: "Limited aurora potential detected. Best window: {{time}}. Confidence: {{ADS}}/100. Main limitation: {{factor}}."
  // → "Limited potential, check back later" (or mention limiting factor)
  if (explanation.includes('Limited aurora potential')) {
    const factorMatch = explanation.match(/Main limitation: ([^.]+)/);
    const factor = factorMatch?.[1] || 'conditions not ideal';
    return `Limited potential right now. ${factor}`;
  }

  // UNLIKELY: "Aurora unlikely in the next 48 hours. Limiting factor: {{factor}}. Next possible window: {{time}} (low confidence)."
  // → "Not worth going out now"
  if (explanation.includes('Aurora unlikely')) {
    const factorMatch = explanation.match(/Limiting factor: ([^.]+)/);
    const factor = factorMatch?.[1] || 'conditions not favorable';
    return `Not worth it now. ${factor}`;
  }

  // Fallback
  return explanation;
}

/**
 * Extract limiting factor description from Site-AI explanation.
 * Used for user-facing messaging in /live.
 */
function extractLimitingFactor(explanation: string, state: 'excellent' | 'possible' | 'unlikely'): string {
  const factorMatch = explanation.match(/(?:Main limitation|Limiting factor): ([^.]+)/);
  if (factorMatch?.[1]) {
    return factorMatch[1];
  }

  // Fallback descriptions
  if (state === 'excellent') return 'Ideal conditions';
  if (state === 'unlikely') return 'Unfavorable conditions';
  return 'Mixed conditions';
}

/**
 * Check if bestWindow start is within ±90 minutes of now.
 * Used only for POSSIBLE state edge case: if best window is coming very soon,
 * user might want to wait (but /live still shows not_worth_it for conservative guidance).
 */
function isWithin90Minutes(windowStart: string): boolean {
  const now = new Date();
  const windowTime = new Date(windowStart);
  const diffMs = Math.abs(windowTime.getTime() - now.getTime());
  const diffMinutes = diffMs / (1000 * 60);
  return diffMinutes <= 90;
}

/**
 * Interpret Site-AI decision for /live context.
 *
 * Rules:
 * - EXCELLENT → isBestNow=true, adviceLevel='go'
 * - POSSIBLE (any case) → isBestNow=false, adviceLevel='not_worth_it' (conservative)
 * - UNLIKELY → isBestNow=false, adviceLevel='not_worth_it'
 *
 * @param decision - Complete Site-AI decision object
 * @returns LiveAdapterOutput for /live UI rendering
 */
export function interpretSiteAIForLive(decision: SiteAIDecision): LiveAdapterOutput {
  const now = new Date();

  // EXCELLENT: Best conditions right now
  if (decision.state === 'excellent') {
    return {
      isBestNow: true,
      adviceLevel: 'go',
      reason: shortenExplanation(decision.explanation),
      confidence: decision.bestWindow.ads,
      limitingFactor: 'None—ideal conditions',
      // No nextBestTime for excellent (user should go now)
    };
  }

  // POSSIBLE: Conditions may develop, but conservative /live guidance is "not right now"
  if (decision.state === 'possible') {
    const nextTime = decision.bestWindow.start ? new Date(decision.bestWindow.start) : undefined;
    const withinSoon = nextTime && isWithin90Minutes(decision.bestWindow.start);

    return {
      isBestNow: false, // Conservative: not worth going out now
      adviceLevel: 'not_worth_it',
      reason: shortenExplanation(decision.explanation),
      nextBestTime: nextTime,
      confidence: decision.bestWindow.ads,
      limitingFactor: extractLimitingFactor(decision.explanation, 'possible'),
    };
  }

  // UNLIKELY: Don't go out
  if (decision.state === 'unlikely') {
    const nextTime = decision.nextWindow?.start ? new Date(decision.nextWindow.start) : undefined;

    return {
      isBestNow: false,
      adviceLevel: 'not_worth_it',
      reason: shortenExplanation(decision.explanation),
      nextBestTime: nextTime,
      confidence: decision.bestWindow.ads,
      limitingFactor: extractLimitingFactor(decision.explanation, 'unlikely'),
    };
  }

  // Fallback (should never reach here)
  return {
    isBestNow: false,
    adviceLevel: 'not_worth_it',
    reason: 'Unable to determine conditions',
    confidence: 0,
    limitingFactor: 'Unknown',
  };
}
