/**
 * AuraView Component
 * Minimal component to validate state → render → event → state flow
 *
 * Renders: WELCOME_HERO, NUDGE, IDLE_DOCKED, FOCUS_FLOATING, RESPONDING, GUIDING_MAP, CONVERSATION
 * All other states render null
 *
 * No styling, no animations, no side effects, no business logic
 */

import { useEffect, useState, useRef } from 'react';
import { AuraState, AuraEvent } from './auraStates';
import type { AuraContext } from './auraContext';
import { MapController } from './mapController';
import { getResponseMessage, getDefaultResponseMessage } from './responseMessages';
import { callStubAI, UserIntent } from './aiService';

export interface AuraViewProps {
  readonly state: AuraState;
  readonly context: AuraContext;
  readonly sendEvent: (event: AuraEvent, contextUpdate?: Partial<AuraContext>) => void;
  readonly mapController?: MapController;
  readonly userIntent?: UserIntent;
}

/**
 * AuraView Component
 * Validates state machine transitions through UI interactions
 */
export function AuraView({ state, context, sendEvent, mapController, userIntent }: AuraViewProps) {
  // Track response message after guidance
  const [responseMessage, setResponseMessage] = useState<string>(getDefaultResponseMessage());
  const previousState = useRef<AuraState>(state);
  const aiProcessedRef = useRef<boolean>(false);

  // Handle THINKING state - call AI
  useEffect(() => {
    if (state === AuraState.THINKING && !aiProcessedRef.current) {
      aiProcessedRef.current = true;

      const performAICall = async () => {
        try {
          // Use predefined intent (default to AURORA_VISIBILITY)
          const intent = userIntent || UserIntent.AURORA_VISIBILITY;

          // Call AI service
          const response = await callStubAI(intent, context);

          // Set response message
          setResponseMessage(response.text);

          // Processing complete - transition to RESPONDING
          sendEvent(AuraEvent.PROCESSING_COMPLETE);
        } catch (error) {
          console.error('[AuraView] AI error:', error);
          // On error, dispatch ERROR event
          sendEvent(AuraEvent.ERROR_OCCURRED);
        }
      };

      performAICall();
    }

    // Reset AI processed flag when leaving THINKING state
    if (state !== AuraState.THINKING) {
      aiProcessedRef.current = false;
    }
  }, [state, context, sendEvent, userIntent]);

  // Update response message when returning from GUIDING_MAP
  useEffect(() => {
    if (previousState.current === AuraState.GUIDING_MAP && state === AuraState.RESPONDING) {
      // Guidance completed - set context-based message
      setResponseMessage(getResponseMessage(context));
    } else if (state === AuraState.RESPONDING && previousState.current !== AuraState.GUIDING_MAP) {
      // Regular response - use default message
      setResponseMessage(getDefaultResponseMessage());
    }

    previousState.current = state;
  }, [state, context]);

  // Handle GUIDING_MAP state - perform map action and send GUIDANCE_COMPLETE
  useEffect(() => {
    if (state === AuraState.GUIDING_MAP && mapController) {
      const performGuidance = async () => {
        try {
          // Static location for testing
          const location = { latitude: 69.6492, longitude: 18.9553, zoom: 12 };

          // Pan to location
          await mapController.panTo(location);

          // Highlight location
          await mapController.highlight(location);

          // Map action complete - send event
          sendEvent(AuraEvent.GUIDANCE_COMPLETE);
        } catch (error) {
          console.error('[AuraView] Map guidance error:', error);
          // On error, still complete guidance
          sendEvent(AuraEvent.GUIDANCE_COMPLETE);
        }
      };

      performGuidance();
    }
  }, [state, mapController, sendEvent]);

  // Render based on current state
  switch (state) {
    case AuraState.WELCOME_HERO:
      return (
        <div
          onClick={() => sendEvent(AuraEvent.CLICK_AURA)}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '20px',
            background: '#f0f0f0',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          Welcome to Aura
        </div>
      );

    case AuraState.NUDGE:
      return (
        <div
          onClick={() => sendEvent(AuraEvent.CLICK_AURA)}
          style={{
            width: '120px',
            padding: '8px',
            background: '#ffe',
            border: '1px solid #ddd',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Try Aura
        </div>
      );

    case AuraState.IDLE_DOCKED:
      return (
        <div
          onClick={() => sendEvent(AuraEvent.CLICK_AURA)}
          style={{
            width: '60px',
            height: '60px',
            background: '#fff',
            border: '2px solid #4ade80',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 600,
            color: '#000',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          Aura
        </div>
      );

    case AuraState.FOCUS_FLOATING:
      return (
        <div
          onClick={() => sendEvent(AuraEvent.USER_INPUT)}
          style={{
            width: '200px',
            height: '100px',
            background: '#eee',
            cursor: 'pointer',
          }}
        >
          Focus
        </div>
      );

    case AuraState.RESPONDING:
      return (
        <div
          onClick={() => sendEvent(AuraEvent.RESPONSE_COMPLETE)}
          style={{
            width: '250px',
            minHeight: '100px',
            background: '#f5f5f5',
            cursor: 'pointer',
            padding: '12px',
            fontSize: '14px',
            lineHeight: '1.4',
          }}
        >
          {responseMessage}
        </div>
      );

    case AuraState.GUIDING_MAP:
      return (
        <div
          style={{
            width: '200px',
            height: '80px',
            background: '#e0f0ff',
            padding: '10px',
            fontSize: '14px',
          }}
        >
          Guiding on map…
        </div>
      );

    case AuraState.CONVERSATION:
      return (
        <div
          style={{
            width: '280px',
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '14px' }}>Aura</span>
            <button
              onClick={() => sendEvent(AuraEvent.USER_DISMISS)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#666',
              }}
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '12px' }}>
            <p style={{ margin: '0 0 12px 0', fontSize: '14px', lineHeight: '1.4' }}>
              {responseMessage}
            </p>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => sendEvent(AuraEvent.START_MAP_GUIDANCE)}
                style={{
                  padding: '8px 12px',
                  background: '#f0f0f0',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  textAlign: 'left',
                }}
              >
                📍 Show me on map
              </button>

              <button
                onClick={() => sendEvent(AuraEvent.USER_INPUT)}
                style={{
                  padding: '8px 12px',
                  background: '#f0f0f0',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  textAlign: 'left',
                }}
              >
                💬 Ask another question
              </button>
            </div>
          </div>
        </div>
      );

    // All other states render nothing
    default:
      return null;
  }
}
