/**
 * useAuraMachine Hook
 * React wrapper for pure Aura state machine reducer
 *
 * No side effects, no animations, no UI code
 * Deterministic and reusable
 */

import { useReducer, useMemo } from 'react';
import { AuraState, AuraEvent } from './auraStates';
import { auraReducer } from './auraMachine';
import { AuraContext, createDefaultContext, PlanType } from './auraContext';

/**
 * State machine internal state
 */
interface AuraMachineState {
  readonly currentState: AuraState;
  readonly context: AuraContext;
}

/**
 * Action for React reducer
 */
interface AuraMachineAction {
  readonly type: 'SEND_EVENT';
  readonly event: AuraEvent;
  readonly context?: Partial<AuraContext>;
}

/**
 * Initial config for hook
 */
export interface UseAuraMachineConfig {
  readonly initialState?: AuraState;
  readonly plan?: PlanType;
  readonly page?: {
    readonly path: string;
    readonly section?: string;
    readonly params?: Readonly<Record<string, string>>;
  };
  readonly geoScope?: {
    readonly latitude?: number;
    readonly longitude?: number;
    readonly accuracy?: number;
    readonly region?: string;
  };
}

/**
 * Hook return value
 */
export interface AuraMachineValue {
  readonly state: AuraState;
  readonly context: AuraContext;
  readonly sendEvent: (event: AuraEvent, contextUpdate?: Partial<AuraContext>) => void;
}

/**
 * React reducer wrapper for pure aura reducer
 * Maps (state, action) => newState
 */
function auraMachineReducer(
  state: AuraMachineState,
  action: AuraMachineAction
): AuraMachineState {
  if (action.type !== 'SEND_EVENT') {
    return state;
  }

  // Merge context update if provided
  const updatedContext: AuraContext = action.context
    ? { ...state.context, ...action.context }
    : state.context;

  // Apply pure reducer
  const nextState = auraReducer(state.currentState, action.event, updatedContext);

  // If transition invalid, stay in current state
  if (nextState === null) {
    return state;
  }

  // Return new state
  return {
    currentState: nextState,
    context: updatedContext,
  };
}

/**
 * useAuraMachine Hook
 * Wraps pure aura reducer with React useReducer
 *
 * @param config - Initial configuration (plan, page, geoScope)
 * @returns { state, context, sendEvent }
 *
 * @example
 * ```tsx
 * const { state, sendEvent } = useAuraMachine({
 *   plan: 'pro',
 *   page: { path: '/home' },
 * });
 *
 * // Send events
 * sendEvent(AuraEvent.INIT);
 * sendEvent(AuraEvent.CLICK_AURA);
 * ```
 */
export function useAuraMachine(config: UseAuraMachineConfig = {}): AuraMachineValue {
  // Create initial context from config
  const initialContext = useMemo(() => {
    const context = createDefaultContext(config.plan ?? 'free');

    return {
      ...context,
      page: config.page ?? context.page,
      geoScope: config.geoScope,
    };
  }, []); // Empty deps - only compute once on mount

  // Create initial state
  const initialMachineState: AuraMachineState = useMemo(
    () => ({
      currentState: config.initialState ?? AuraState.HIDDEN,
      context: initialContext,
    }),
    [] // Empty deps - only compute once on mount
  );

  // Use React useReducer with pure reducer wrapper
  const [machineState, dispatch] = useReducer(auraMachineReducer, initialMachineState);

  // Memoized sendEvent function
  const sendEvent = useMemo(
    () => (event: AuraEvent, contextUpdate?: Partial<AuraContext>) => {
      dispatch({
        type: 'SEND_EVENT',
        event,
        context: contextUpdate,
      });
    },
    [] // Stable reference
  );

  // Return public API
  return {
    state: machineState.currentState,
    context: machineState.context,
    sendEvent,
  };
}
