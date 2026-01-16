'use client';

import { useGuideFlow } from '@/hooks/useGuideFlow';
import { Spotlight } from './Spotlight';

export function UIGuideProvider({ children }: { children: React.ReactNode }) {
  const { currentStep, targetElement, dismissGuide } = useGuideFlow();

  return (
    <>
      {children}
      {currentStep && targetElement && (
        <Spotlight
          targetElement={targetElement}
          message={currentStep.message}
          pulseColor={currentStep.pulseColor}
          onDismiss={dismissGuide}
        />
      )}
    </>
  );
}
