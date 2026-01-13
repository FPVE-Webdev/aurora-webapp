/**
 * AI Service
 * Minimal AI integration for Aura
 *
 * Single system prompt, predefined intents only, single sentence output
 */

import type { AuraContext } from './auraContext';

/**
 * Predefined user intents
 * Limited set of questions Aura can answer
 */
export enum UserIntent {
  AURORA_VISIBILITY = 'AURORA_VISIBILITY',
  BEST_VIEWING_SPOTS = 'BEST_VIEWING_SPOTS',
  TONIGHT_FORECAST = 'TONIGHT_FORECAST',
  WHAT_IS_AURORA = 'WHAT_IS_AURORA',
}

/**
 * AI response
 */
export interface AIResponse {
  readonly text: string;
  readonly intent: UserIntent;
}

/**
 * Fixed system prompt
 * Constrains AI to short, factual aurora responses
 */
const SYSTEM_PROMPT = `You are Aura, an aurora assistant for Tromsø, Norway.
Answer in ONE short sentence only (max 15 words).
Be helpful and concise.
Focus on aurora viewing information.`;

/**
 * Intent to prompt mapping
 * Converts predefined intents to AI prompts
 */
function getPromptForIntent(intent: UserIntent, context: AuraContext): string {
  switch (intent) {
    case UserIntent.AURORA_VISIBILITY:
      return 'What is the current aurora visibility in Tromsø?';

    case UserIntent.BEST_VIEWING_SPOTS:
      return 'What are the best aurora viewing spots near Tromsø?';

    case UserIntent.TONIGHT_FORECAST:
      return 'What is the aurora forecast for tonight in Tromsø?';

    case UserIntent.WHAT_IS_AURORA:
      return 'What is the aurora borealis in one sentence?';
  }
}

/**
 * Call AI service
 * Returns a single short sentence response
 */
export async function callAI(
  intent: UserIntent,
  context: AuraContext
): Promise<AIResponse> {
  const userPrompt = getPromptForIntent(intent, context);

  try {
    // Call OpenAI API (or similar)
    const response = await fetch('/api/aura/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        maxTokens: 50, // Enforce short response
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      text: data.text || 'Unable to generate response.',
      intent,
    };
  } catch (error) {
    console.error('[AIService] Error:', error);
    throw error;
  }
}

/**
 * Stub AI for testing (returns predefined responses)
 */
export async function callStubAI(
  intent: UserIntent,
  context: AuraContext
): Promise<AIResponse> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Return predefined responses based on intent
  const responses: Record<UserIntent, string> = {
    [UserIntent.AURORA_VISIBILITY]: 'Aurora visibility is moderate tonight in Tromsø.',
    [UserIntent.BEST_VIEWING_SPOTS]: 'Best spots are Telegrafbukta and Prestvannet.',
    [UserIntent.TONIGHT_FORECAST]: 'KP index 4 expected, good viewing conditions.',
    [UserIntent.WHAT_IS_AURORA]: 'Aurora is light from solar particles hitting Earth\'s atmosphere.',
  };

  return {
    text: responses[intent],
    intent,
  };
}
