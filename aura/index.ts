/**
 * AURA - Deterministic State Machine
 * Framework-agnostic AI assistant state management
 */

// States and events
export { AuraState, AuraEvent } from './auraStates';
export { STATE_METADATA, isValidTransition, getStateMetadata } from './auraStates';
export type { StateMetadata } from './auraStates';

// State machine reducer
export { auraReducer, transition, canTransition } from './auraMachine';

// Context
export {
  createDefaultContext,
  createPlanContext,
  canEnterConversation,
  canEnterMapGuidance,
  canEnterUIGuidance,
  withPage,
  withGeoScope,
  withPlan,
} from './auraContext';
export type { AuraContext, PlanType, PageContext, GeoScope, PlanContext } from './auraContext';

// React hook
export { useAuraMachine } from './useAuraMachine';
export type { UseAuraMachineConfig, AuraMachineValue } from './useAuraMachine';

// React components
export { AuraView } from './AuraView';
export type { AuraViewProps } from './AuraView';
export { AuraRoot } from './AuraRoot';

// Map controller
export { createStubMapController, TEST_LOCATION } from './mapController';
export type { MapController, MapLocation } from './mapController';

// Response messages
export { getResponseMessage, getDefaultResponseMessage } from './responseMessages';

// AI service
export { callAI, callStubAI, UserIntent } from './aiService';
export type { AIResponse } from './aiService';
