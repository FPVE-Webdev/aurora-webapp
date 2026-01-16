'use client';

import { useState, useCallback, useEffect } from 'react';

export interface GuideStep {
  elementId: string;
  message: string;
  pulseColor?: string;
}

export function useGuideFlow() {
  const [currentStep, setCurrentStep] = useState<GuideStep | null>(null);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  // Find element by ID or data-guide-id attribute
  const findElement = useCallback((elementId: string): HTMLElement | null => {
    // Try by ID first
    let element = document.getElementById(elementId);

    // Try by data-guide-id attribute
    if (!element) {
      element = document.querySelector(`[data-guide-id="${elementId}"]`);
    }

    return element;
  }, []);

  // Show a guide step
  const showGuide = useCallback((step: GuideStep) => {
    const element = findElement(step.elementId);

    if (!element) {
      console.warn('[useGuideFlow] Element not found:', step.elementId);
      return false;
    }

    setCurrentStep(step);
    setTargetElement(element);

    // Scroll element into view
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center'
    });

    return true;
  }, [findElement]);

  // Dismiss current guide
  const dismissGuide = useCallback(() => {
    setCurrentStep(null);
    setTargetElement(null);
  }, []);

  // Listen for aura-ui-guide events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleGuideEvent = (event: Event) => {
      const custom = event as CustomEvent<GuideStep>;
      const detail = custom.detail;

      if (!detail?.elementId) return;

      showGuide(detail);
    };

    window.addEventListener('aura-ui-guide', handleGuideEvent as EventListener);

    return () => {
      window.removeEventListener('aura-ui-guide', handleGuideEvent as EventListener);
    };
  }, [showGuide]);

  return {
    currentStep,
    targetElement,
    showGuide,
    dismissGuide,
    isActive: currentStep !== null,
  };
}
