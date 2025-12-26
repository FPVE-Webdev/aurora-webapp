'use client';

/**
 * Builder.io Component Registry
 *
 * This file registers simple, builder-friendly components.
 * Complex aurora components require live data and are not suitable for Builder.io.
 *
 * For marketing pages, use basic HTML/CSS components instead.
 */

import { Builder } from '@builder.io/react';

/**
 * Simple Text Hero Component
 * Builder-friendly alternative to complex aurora components
 */
function SimpleHero({
  title = 'Nordlys i Tromsø',
  subtitle = 'Sanntids nordlysvarsel',
  className = ''
}: {
  title?: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={`text-center py-16 ${className}`}>
      <h1 className="text-4xl md:text-6xl font-bold mb-4">{title}</h1>
      <p className="text-xl text-gray-600">{subtitle}</p>
    </div>
  );
}

Builder.registerComponent(SimpleHero, {
  name: 'Simple Hero',
  description: 'Simple hero section with title and subtitle',
  inputs: [
    {
      name: 'title',
      type: 'string',
      defaultValue: 'Nordlys i Tromsø',
    },
    {
      name: 'subtitle',
      type: 'string',
      defaultValue: 'Sanntids nordlysvarsel',
    },
    {
      name: 'className',
      type: 'string',
      defaultValue: '',
    }
  ],
});

/**
 * Feature Card Component
 */
function FeatureCard({
  icon = '🌌',
  title = 'Feature Title',
  description = 'Feature description',
  className = ''
}: {
  icon?: string;
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={`p-6 bg-white rounded-lg shadow-md ${className}`}>
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

Builder.registerComponent(FeatureCard, {
  name: 'Feature Card',
  description: 'Card with icon, title and description',
  inputs: [
    {
      name: 'icon',
      type: 'string',
      defaultValue: '🌌',
      helperText: 'Emoji or icon',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: 'Feature Title',
    },
    {
      name: 'description',
      type: 'string',
      defaultValue: 'Feature description',
    },
    {
      name: 'className',
      type: 'string',
      defaultValue: '',
    }
  ],
});

/**
 * CTA Button Component
 */
function CTAButton({
  text = 'Get Started',
  href = '#',
  variant = 'primary',
  className = ''
}: {
  text?: string;
  href?: string;
  variant?: 'primary' | 'secondary';
  className?: string;
}) {
  const baseClasses = 'px-6 py-3 rounded-lg font-semibold transition-colors';
  const variantClasses = variant === 'primary'
    ? 'bg-blue-600 text-white hover:bg-blue-700'
    : 'bg-gray-200 text-gray-900 hover:bg-gray-300';

  return (
    <a href={href} className={`${baseClasses} ${variantClasses} ${className}`}>
      {text}
    </a>
  );
}

Builder.registerComponent(CTAButton, {
  name: 'CTA Button',
  description: 'Call-to-action button',
  inputs: [
    {
      name: 'text',
      type: 'string',
      defaultValue: 'Get Started',
    },
    {
      name: 'href',
      type: 'string',
      defaultValue: '#',
    },
    {
      name: 'variant',
      type: 'string',
      defaultValue: 'primary',
      enum: ['primary', 'secondary'],
    },
    {
      name: 'className',
      type: 'string',
      defaultValue: '',
    }
  ],
});

/**
 * Register custom insert menu
 */
Builder.register('insertMenu', {
  name: 'Marketing Components',
  items: [
    { name: 'Simple Hero' },
    { name: 'Feature Card' },
    { name: 'CTA Button' },
  ],
});
