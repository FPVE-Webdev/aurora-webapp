/**
 * Response Message Templates
 * Deterministic static messages based on context
 *
 * No AI logic, just simple template selection
 */

import type { AuraContext } from './auraContext';

/**
 * Get response message based on context
 * Simple deterministic logic based on page path
 */
export function getResponseMessage(context: AuraContext): string {
  const path = context.page.path;

  // Map guidance completed - context-aware messages
  if (path === '/') {
    return 'Check the map for current aurora visibility in Tromsø.';
  }

  if (path === '/welcome') {
    return 'I've highlighted the best viewing spots near you.';
  }

  if (path.startsWith('/kart')) {
    return 'Here are the recommended locations for tonight.';
  }

  if (path === '/forecast') {
    return 'The map shows optimal viewing areas based on the forecast.';
  }

  if (path === '/live') {
    return 'Live aurora activity is visible in the highlighted regions.';
  }

  // Default message
  return 'I've shown you the key locations on the map.';
}

/**
 * Get default response message (no guidance)
 */
export function getDefaultResponseMessage(): string {
  return 'How can I help you with aurora viewing?';
}
