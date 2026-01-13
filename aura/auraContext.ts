/**
 * AURA Context
 * Runtime context passed to state machine
 */

/**
 * Plan types with entitlement rules
 */
export type PlanType = 'free' | 'pro' | 'enterprise';

/**
 * Page context
 */
export interface PageContext {
  readonly path: string;
  readonly section?: string;
  readonly params?: Readonly<Record<string, string>>;
}

/**
 * Geo scope context
 */
export interface GeoScope {
  readonly latitude?: number;
  readonly longitude?: number;
  readonly accuracy?: number;
  readonly region?: string;
}

/**
 * Plan context with entitlements
 */
export interface PlanContext {
  readonly plan: PlanType;
  readonly features: Readonly<{
    conversation: boolean; // Multi-turn conversation
    mapGuidance: boolean; // Map-based guidance
    uiGuidance: boolean; // UI element guidance
  }>;
}

/**
 * Complete runtime context
 */
export interface AuraContext {
  readonly page: PageContext;
  readonly geoScope?: GeoScope;
  readonly plan: PlanContext;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Plan entitlements
 */
const PLAN_FEATURES: Readonly<Record<PlanType, PlanContext['features']>> = {
  free: {
    conversation: false, // Free plan cannot enter CONVERSATION state
    mapGuidance: true,
    uiGuidance: true,
  },
  pro: {
    conversation: true, // Pro can use conversation mode
    mapGuidance: true,
    uiGuidance: true,
  },
  enterprise: {
    conversation: true, // Enterprise has full access
    mapGuidance: true,
    uiGuidance: true,
  },
};

/**
 * Create plan context from plan type
 */
export function createPlanContext(plan: PlanType): PlanContext {
  return {
    plan,
    features: PLAN_FEATURES[plan],
  };
}

/**
 * Create default context
 */
export function createDefaultContext(plan: PlanType = 'free'): AuraContext {
  return {
    page: {
      path: '/',
    },
    plan: createPlanContext(plan),
  };
}

/**
 * Check if plan allows conversation mode
 */
export function canEnterConversation(context: AuraContext): boolean {
  return context.plan.features.conversation;
}

/**
 * Check if plan allows map guidance
 */
export function canEnterMapGuidance(context: AuraContext): boolean {
  return context.plan.features.mapGuidance;
}

/**
 * Check if plan allows UI guidance
 */
export function canEnterUIGuidance(context: AuraContext): boolean {
  return context.plan.features.uiGuidance;
}

/**
 * Update page context (immutable)
 */
export function withPage(context: AuraContext, page: Partial<PageContext>): AuraContext {
  return {
    ...context,
    page: {
      ...context.page,
      ...page,
    },
  };
}

/**
 * Update geo scope (immutable)
 */
export function withGeoScope(context: AuraContext, geoScope: GeoScope): AuraContext {
  return {
    ...context,
    geoScope,
  };
}

/**
 * Update plan (immutable)
 */
export function withPlan(context: AuraContext, plan: PlanType): AuraContext {
  return {
    ...context,
    plan: createPlanContext(plan),
  };
}
