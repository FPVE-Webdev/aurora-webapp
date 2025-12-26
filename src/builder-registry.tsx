'use client';

/**
 * Builder.io Component Registry
 *
 * This file registers custom components that can be used in Builder.io's visual editor.
 * Components registered here become available as drag-and-drop blocks.
 */

import { Builder } from '@builder.io/react';

// Import custom components
import AuroraStatusCard from './components/aurora/AuroraStatusCard';
import ProbabilityGauge from './components/aurora/ProbabilityGauge';
import QuickStats from './components/aurora/QuickStats';
import HourlyForecast from './components/aurora/HourlyForecast';
import BestTimeWindow from './components/aurora/BestTimeWindow';
import DarkHoursInfo from './components/aurora/DarkHoursInfo';
import GoNowAlert from './components/home/GoNowAlert';
import PremiumCTA from './components/shared/PremiumCTA';

/**
 * Register Aurora Components
 */

Builder.registerComponent(AuroraStatusCard, {
  name: 'Aurora Status Card',
  description: 'Displays current aurora status with KP index and probability',
  image: 'https://cdn.builder.io/api/v1/image/assets%2F0e8c89e9b7b4408e92c45789e4a1e063%2F4a2b3c1d4e5f6a7b8c9d0e1f2a3b4c5d',
  inputs: [
    {
      name: 'className',
      type: 'string',
      defaultValue: '',
    }
  ],
});

Builder.registerComponent(ProbabilityGauge, {
  name: 'Probability Gauge',
  description: 'Visual gauge showing aurora probability percentage',
  inputs: [
    {
      name: 'probability',
      type: 'number',
      defaultValue: 75,
      helperText: 'Aurora probability (0-100)',
    },
    {
      name: 'size',
      type: 'string',
      defaultValue: 'md',
      enum: ['sm', 'md', 'lg'],
    }
  ],
});

Builder.registerComponent(QuickStats, {
  name: 'Quick Stats',
  description: 'Compact aurora statistics display',
  inputs: [
    {
      name: 'showKp',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'showProbability',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'showCloudCover',
      type: 'boolean',
      defaultValue: true,
    }
  ],
});

Builder.registerComponent(HourlyForecast, {
  name: 'Hourly Forecast',
  description: 'Hour-by-hour aurora forecast for next 24 hours',
  inputs: [
    {
      name: 'compact',
      type: 'boolean',
      defaultValue: false,
      helperText: 'Use compact layout',
    }
  ],
});

Builder.registerComponent(BestTimeWindow, {
  name: 'Best Time Window',
  description: 'Highlights the best time window for aurora viewing',
  inputs: [],
});

Builder.registerComponent(DarkHoursInfo, {
  name: 'Dark Hours Info',
  description: 'Shows when it will be dark enough to see aurora',
  inputs: [],
});

Builder.registerComponent(GoNowAlert, {
  name: 'Go Now Alert',
  description: 'Urgent alert when aurora is visible right now',
  inputs: [
    {
      name: 'threshold',
      type: 'number',
      defaultValue: 70,
      helperText: 'Probability threshold to show alert',
    }
  ],
});

Builder.registerComponent(PremiumCTA, {
  name: 'Premium CTA',
  description: 'Call-to-action for premium features',
  inputs: [
    {
      name: 'variant',
      type: 'string',
      defaultValue: 'default',
      enum: ['default', 'compact', 'banner'],
    },
    {
      name: 'feature',
      type: 'string',
      defaultValue: 'alerts',
      helperText: 'Which premium feature to highlight',
    }
  ],
});

/**
 * Register built-in components
 */

Builder.register('insertMenu', {
  name: 'Aurora Components',
  items: [
    { name: 'Aurora Status Card' },
    { name: 'Probability Gauge' },
    { name: 'Quick Stats' },
    { name: 'Hourly Forecast' },
    { name: 'Best Time Window' },
    { name: 'Dark Hours Info' },
    { name: 'Go Now Alert' },
    { name: 'Premium CTA' },
  ],
});
