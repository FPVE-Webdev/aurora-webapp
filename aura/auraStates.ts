/**
 * AURA States & Events
 * Deterministic state machine definition for AI assistant
 *
 * EXACTLY 13 REQUIRED STATES
 */

export enum AuraState {
  // Visibility states
  HIDDEN = 'HIDDEN',
  IDLE_DOCKED = 'IDLE_DOCKED',
  WELCOME_HERO = 'WELCOME_HERO',
  NUDGE = 'NUDGE',

  // Interaction states
  FOCUS_FLOATING = 'FOCUS_FLOATING',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  RESPONDING = 'RESPONDING',
  CONVERSATION = 'CONVERSATION',

  // Guidance states
  GUIDING_MAP = 'GUIDING_MAP',
  GUIDING_UI = 'GUIDING_UI',

  // Error state
  ERROR_RECOVERABLE = 'ERROR_RECOVERABLE',

  // Sleep state
  SLEEP_MINIMIZED = 'SLEEP_MINIMIZED',
}

/**
 * Events that trigger state transitions
 */
export enum AuraEvent {
  // Initialization
  INIT = 'INIT',
  FIRST_VISIT = 'FIRST_VISIT',

  // User actions
  CLICK_AURA = 'CLICK_AURA',
  USER_INPUT = 'USER_INPUT',
  USER_DISMISS = 'USER_DISMISS',
  USER_MINIMIZE = 'USER_MINIMIZE',

  // Processing events
  INPUT_RECEIVED = 'INPUT_RECEIVED',
  PROCESSING_COMPLETE = 'PROCESSING_COMPLETE',
  RESPONSE_COMPLETE = 'RESPONSE_COMPLETE',

  // Guidance events
  START_MAP_GUIDANCE = 'START_MAP_GUIDANCE',
  START_UI_GUIDANCE = 'START_UI_GUIDANCE',
  GUIDANCE_COMPLETE = 'GUIDANCE_COMPLETE',

  // Error events
  ERROR_OCCURRED = 'ERROR_OCCURRED',
  RETRY = 'RETRY',

  // Lifecycle events
  TIMEOUT = 'TIMEOUT',
  RESET = 'RESET',
  SLEEP = 'SLEEP',
  WAKE = 'WAKE',

  // Context events
  CONTEXT_CHANGED = 'CONTEXT_CHANGED',
}

/**
 * State metadata
 */
export interface StateMetadata {
  readonly isVisible: boolean;
  readonly isInteractive: boolean;
  readonly allowedTransitions: ReadonlyArray<AuraState>;
  readonly description: string;
}

/**
 * Complete state machine metadata
 * Defines all valid transitions for each state
 */
export const STATE_METADATA: Readonly<Record<AuraState, StateMetadata>> = {
  /**
   * HIDDEN - Completely invisible
   * Entry points:
   * - INIT → if not first visit
   * - USER_DISMISS → from various states
   */
  [AuraState.HIDDEN]: {
    isVisible: false,
    isInteractive: false,
    allowedTransitions: [AuraState.WELCOME_HERO, AuraState.IDLE_DOCKED, AuraState.NUDGE],
    description: 'Completely invisible, not shown to user',
  },

  /**
   * IDLE_DOCKED - Passive docked state
   * Default state after initialization
   * Can be clicked to open FOCUS_FLOATING
   */
  [AuraState.IDLE_DOCKED]: {
    isVisible: true,
    isInteractive: true,
    allowedTransitions: [
      AuraState.HIDDEN,
      AuraState.NUDGE,
      AuraState.FOCUS_FLOATING,
      AuraState.SLEEP_MINIMIZED,
    ],
    description: 'Visible but passive, docked in corner',
  },

  /**
   * WELCOME_HERO - First-time user experience
   * Only shown on FIRST_VISIT
   * Transitions to FOCUS_FLOATING or IDLE_DOCKED
   */
  [AuraState.WELCOME_HERO]: {
    isVisible: true,
    isInteractive: true,
    allowedTransitions: [AuraState.FOCUS_FLOATING, AuraState.IDLE_DOCKED, AuraState.HIDDEN],
    description: 'First-time hero presentation',
  },

  /**
   * NUDGE - Contextual suggestion
   * Can appear from HIDDEN or IDLE_DOCKED
   */
  [AuraState.NUDGE]: {
    isVisible: true,
    isInteractive: true,
    allowedTransitions: [AuraState.FOCUS_FLOATING, AuraState.IDLE_DOCKED, AuraState.HIDDEN],
    description: 'Subtle contextual prompt',
  },

  /**
   * FOCUS_FLOATING - Ready for input
   * Main entry point for user interaction
   * Accepts user input → transitions to LISTENING
   */
  [AuraState.FOCUS_FLOATING]: {
    isVisible: true,
    isInteractive: true,
    allowedTransitions: [
      AuraState.LISTENING,
      AuraState.IDLE_DOCKED,
      AuraState.SLEEP_MINIMIZED,
      AuraState.HIDDEN,
    ],
    description: 'Floating focus mode, ready for interaction',
  },

  /**
   * LISTENING - Accepting user input
   * Transitions to THINKING when input received
   */
  [AuraState.LISTENING]: {
    isVisible: true,
    isInteractive: true,
    allowedTransitions: [
      AuraState.THINKING,
      AuraState.FOCUS_FLOATING,
      AuraState.IDLE_DOCKED,
      AuraState.ERROR_RECOVERABLE,
    ],
    description: 'Actively listening to user input',
  },

  /**
   * THINKING - Processing user input
   * AI processing happens here
   * Transitions to RESPONDING when complete
   */
  [AuraState.THINKING]: {
    isVisible: true,
    isInteractive: false,
    allowedTransitions: [AuraState.RESPONDING, AuraState.ERROR_RECOVERABLE],
    description: 'Processing user input',
  },

  /**
   * RESPONDING - Delivering response
   * Can transition to:
   * - CONVERSATION (Pro/Enterprise only)
   * - GUIDING_MAP (if map action needed)
   * - GUIDING_UI (if UI guidance needed)
   * - FOCUS_FLOATING (free plan fallback)
   */
  [AuraState.RESPONDING]: {
    isVisible: true,
    isInteractive: true,
    allowedTransitions: [
      AuraState.CONVERSATION,
      AuraState.GUIDING_MAP,
      AuraState.GUIDING_UI,
      AuraState.FOCUS_FLOATING,
      AuraState.ERROR_RECOVERABLE,
    ],
    description: 'Delivering response to user',
  },

  /**
   * CONVERSATION - Multi-turn conversation
   * RESTRICTED: Pro and Enterprise only
   * Free plan users cannot enter this state
   */
  [AuraState.CONVERSATION]: {
    isVisible: true,
    isInteractive: true,
    allowedTransitions: [
      AuraState.LISTENING,
      AuraState.GUIDING_MAP,
      AuraState.GUIDING_UI,
      AuraState.FOCUS_FLOATING,
      AuraState.IDLE_DOCKED,
      AuraState.SLEEP_MINIMIZED,
    ],
    description: 'Multi-turn conversation mode (Pro/Enterprise only)',
  },

  /**
   * GUIDING_MAP - Map guidance mode
   * Can return to RESPONDING or CONVERSATION
   */
  [AuraState.GUIDING_MAP]: {
    isVisible: true,
    isInteractive: true,
    allowedTransitions: [
      AuraState.RESPONDING,
      AuraState.CONVERSATION,
      AuraState.FOCUS_FLOATING,
      AuraState.IDLE_DOCKED,
    ],
    description: 'Guiding user on map interface',
  },

  /**
   * GUIDING_UI - UI guidance mode
   * Can return to RESPONDING or CONVERSATION
   */
  [AuraState.GUIDING_UI]: {
    isVisible: true,
    isInteractive: true,
    allowedTransitions: [
      AuraState.RESPONDING,
      AuraState.CONVERSATION,
      AuraState.FOCUS_FLOATING,
      AuraState.IDLE_DOCKED,
    ],
    description: 'Guiding user through UI elements',
  },

  /**
   * ERROR_RECOVERABLE - Recoverable error state
   * User can retry or dismiss
   */
  [AuraState.ERROR_RECOVERABLE]: {
    isVisible: true,
    isInteractive: true,
    allowedTransitions: [
      AuraState.FOCUS_FLOATING,
      AuraState.LISTENING,
      AuraState.IDLE_DOCKED,
      AuraState.HIDDEN,
    ],
    description: 'Recoverable error with retry option',
  },

  /**
   * SLEEP_MINIMIZED - Minimized sleep state
   * Out of the way but still accessible
   */
  [AuraState.SLEEP_MINIMIZED]: {
    isVisible: true,
    isInteractive: true,
    allowedTransitions: [AuraState.IDLE_DOCKED, AuraState.FOCUS_FLOATING, AuraState.HIDDEN],
    description: 'Minimized sleep mode',
  },
};

/**
 * Validate transition is allowed
 */
export function isValidTransition(from: AuraState, to: AuraState): boolean {
  return STATE_METADATA[from].allowedTransitions.includes(to);
}

/**
 * Get state metadata
 */
export function getStateMetadata(state: AuraState): StateMetadata {
  return STATE_METADATA[state];
}
