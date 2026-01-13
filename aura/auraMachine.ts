/**
 * AURA State Machine
 * Pure reducer: (state, event, context) => newState
 *
 * No side effects, no mutations, fully deterministic
 */

import { AuraState, AuraEvent, isValidTransition } from './auraStates';
import { AuraContext, canEnterConversation } from './auraContext';

/**
 * State machine reducer
 * Returns new state or null if transition is invalid
 */
export function auraReducer(
  currentState: AuraState,
  event: AuraEvent,
  context: AuraContext
): AuraState | null {
  // Determine next state based on current state and event
  const nextState = determineNextState(currentState, event, context);

  // Validate transition is allowed
  if (nextState && !isValidTransition(currentState, nextState)) {
    return null; // Invalid transition
  }

  return nextState;
}

/**
 * Core transition logic
 * Maps (state, event, context) → next state
 */
function determineNextState(
  state: AuraState,
  event: AuraEvent,
  context: AuraContext
): AuraState | null {
  switch (state) {
    // ============================================
    // HIDDEN - Entry point
    // ============================================
    case AuraState.HIDDEN:
      if (event === AuraEvent.FIRST_VISIT) {
        // First visit → show welcome hero
        return AuraState.WELCOME_HERO;
      }
      if (event === AuraEvent.INIT) {
        // Regular init → idle docked
        return AuraState.IDLE_DOCKED;
      }
      return null;

    // ============================================
    // IDLE_DOCKED - Default passive state
    // ============================================
    case AuraState.IDLE_DOCKED:
      if (event === AuraEvent.CLICK_AURA) {
        // User clicks Aura → open focus mode
        return AuraState.FOCUS_FLOATING;
      }
      if (event === AuraEvent.USER_DISMISS) {
        // User dismisses → hide
        return AuraState.HIDDEN;
      }
      if (event === AuraEvent.SLEEP) {
        // Put to sleep
        return AuraState.SLEEP_MINIMIZED;
      }
      return null;

    // ============================================
    // WELCOME_HERO - First-time experience
    // ============================================
    case AuraState.WELCOME_HERO:
      if (event === AuraEvent.CLICK_AURA) {
        // User engages → open focus mode
        return AuraState.FOCUS_FLOATING;
      }
      if (event === AuraEvent.TIMEOUT) {
        // Auto-dismiss after timeout → idle
        return AuraState.IDLE_DOCKED;
      }
      if (event === AuraEvent.USER_DISMISS) {
        // User dismisses → hide
        return AuraState.HIDDEN;
      }
      return null;

    // ============================================
    // NUDGE - Contextual prompt
    // ============================================
    case AuraState.NUDGE:
      if (event === AuraEvent.CLICK_AURA) {
        // User clicks nudge → focus mode
        return AuraState.FOCUS_FLOATING;
      }
      if (event === AuraEvent.TIMEOUT) {
        // Nudge times out → back to idle
        return AuraState.IDLE_DOCKED;
      }
      if (event === AuraEvent.USER_DISMISS) {
        // User dismisses nudge
        return AuraState.HIDDEN;
      }
      return null;

    // ============================================
    // FOCUS_FLOATING - Ready for input
    // ============================================
    case AuraState.FOCUS_FLOATING:
      if (event === AuraEvent.USER_INPUT) {
        // User starts typing → listening mode
        return AuraState.LISTENING;
      }
      if (event === AuraEvent.USER_MINIMIZE) {
        // User minimizes → back to idle
        return AuraState.IDLE_DOCKED;
      }
      if (event === AuraEvent.SLEEP) {
        // Put to sleep
        return AuraState.SLEEP_MINIMIZED;
      }
      if (event === AuraEvent.USER_DISMISS) {
        // User closes
        return AuraState.HIDDEN;
      }
      return null;

    // ============================================
    // LISTENING - Accepting input
    // ============================================
    case AuraState.LISTENING:
      if (event === AuraEvent.INPUT_RECEIVED) {
        // Input received → start processing
        return AuraState.THINKING;
      }
      if (event === AuraEvent.USER_MINIMIZE) {
        // User minimizes during input
        return AuraState.FOCUS_FLOATING;
      }
      if (event === AuraEvent.USER_DISMISS) {
        // User cancels
        return AuraState.IDLE_DOCKED;
      }
      if (event === AuraEvent.ERROR_OCCURRED) {
        // Error during input
        return AuraState.ERROR_RECOVERABLE;
      }
      return null;

    // ============================================
    // THINKING - Processing
    // ============================================
    case AuraState.THINKING:
      if (event === AuraEvent.PROCESSING_COMPLETE) {
        // Processing done → deliver response
        return AuraState.RESPONDING;
      }
      if (event === AuraEvent.ERROR_OCCURRED) {
        // Error during processing
        return AuraState.ERROR_RECOVERABLE;
      }
      return null;

    // ============================================
    // RESPONDING - Delivering response
    // CRITICAL: Check plan entitlements here
    // ============================================
    case AuraState.RESPONDING:
      if (event === AuraEvent.RESPONSE_COMPLETE) {
        // Response complete → check if can enter conversation
        if (canEnterConversation(context)) {
          // Pro/Enterprise → conversation mode
          return AuraState.CONVERSATION;
        } else {
          // Free plan → back to focus mode (no conversation)
          return AuraState.FOCUS_FLOATING;
        }
      }
      if (event === AuraEvent.START_MAP_GUIDANCE) {
        // Response requires map guidance
        return AuraState.GUIDING_MAP;
      }
      if (event === AuraEvent.START_UI_GUIDANCE) {
        // Response requires UI guidance
        return AuraState.GUIDING_UI;
      }
      if (event === AuraEvent.ERROR_OCCURRED) {
        // Error during response
        return AuraState.ERROR_RECOVERABLE;
      }
      return null;

    // ============================================
    // CONVERSATION - Multi-turn mode (Pro/Enterprise only)
    // ============================================
    case AuraState.CONVERSATION:
      if (event === AuraEvent.USER_INPUT) {
        // User continues conversation → listen
        return AuraState.LISTENING;
      }
      if (event === AuraEvent.START_MAP_GUIDANCE) {
        // Switch to map guidance
        return AuraState.GUIDING_MAP;
      }
      if (event === AuraEvent.START_UI_GUIDANCE) {
        // Switch to UI guidance
        return AuraState.GUIDING_UI;
      }
      if (event === AuraEvent.USER_MINIMIZE) {
        // User minimizes conversation
        return AuraState.FOCUS_FLOATING;
      }
      if (event === AuraEvent.USER_DISMISS) {
        // User ends conversation
        return AuraState.IDLE_DOCKED;
      }
      if (event === AuraEvent.SLEEP) {
        // Put to sleep
        return AuraState.SLEEP_MINIMIZED;
      }
      return null;

    // ============================================
    // GUIDING_MAP - Map guidance mode
    // ============================================
    case AuraState.GUIDING_MAP:
      if (event === AuraEvent.GUIDANCE_COMPLETE) {
        // Guidance done → back to responding or conversation
        if (canEnterConversation(context)) {
          return AuraState.CONVERSATION;
        } else {
          return AuraState.RESPONDING;
        }
      }
      if (event === AuraEvent.USER_MINIMIZE) {
        // User minimizes
        return AuraState.FOCUS_FLOATING;
      }
      if (event === AuraEvent.USER_DISMISS) {
        // User dismisses
        return AuraState.IDLE_DOCKED;
      }
      return null;

    // ============================================
    // GUIDING_UI - UI guidance mode
    // ============================================
    case AuraState.GUIDING_UI:
      if (event === AuraEvent.GUIDANCE_COMPLETE) {
        // Guidance done → back to responding or conversation
        if (canEnterConversation(context)) {
          return AuraState.CONVERSATION;
        } else {
          return AuraState.RESPONDING;
        }
      }
      if (event === AuraEvent.USER_MINIMIZE) {
        // User minimizes
        return AuraState.FOCUS_FLOATING;
      }
      if (event === AuraEvent.USER_DISMISS) {
        // User dismisses
        return AuraState.IDLE_DOCKED;
      }
      return null;

    // ============================================
    // ERROR_RECOVERABLE - Error state
    // ============================================
    case AuraState.ERROR_RECOVERABLE:
      if (event === AuraEvent.RETRY) {
        // User retries → back to focus/listening
        return AuraState.FOCUS_FLOATING;
      }
      if (event === AuraEvent.USER_DISMISS) {
        // User dismisses error
        return AuraState.IDLE_DOCKED;
      }
      if (event === AuraEvent.RESET) {
        // Full reset
        return AuraState.HIDDEN;
      }
      return null;

    // ============================================
    // SLEEP_MINIMIZED - Sleep state
    // ============================================
    case AuraState.SLEEP_MINIMIZED:
      if (event === AuraEvent.WAKE) {
        // Wake up → back to idle
        return AuraState.IDLE_DOCKED;
      }
      if (event === AuraEvent.CLICK_AURA) {
        // User clicks while sleeping → focus mode
        return AuraState.FOCUS_FLOATING;
      }
      if (event === AuraEvent.USER_DISMISS) {
        // User dismisses
        return AuraState.HIDDEN;
      }
      return null;

    default:
      return null;
  }
}

/**
 * Helper: Validate and apply transition
 * Returns new state or original state if invalid
 */
export function transition(
  currentState: AuraState,
  event: AuraEvent,
  context: AuraContext
): AuraState {
  const nextState = auraReducer(currentState, event, context);
  return nextState ?? currentState; // Stay in current state if invalid
}

/**
 * Helper: Check if transition would succeed
 */
export function canTransition(
  currentState: AuraState,
  event: AuraEvent,
  context: AuraContext
): boolean {
  return auraReducer(currentState, event, context) !== null;
}
