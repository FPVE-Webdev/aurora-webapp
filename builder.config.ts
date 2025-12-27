/**
 * Builder.io Configuration
 *
 * This file configures Builder.io settings for the project.
 */

export const builderConfig = {
  /**
   * API Key (loaded from environment)
   */
  apiKey: process.env.NEXT_PUBLIC_BUILDER_API_KEY,

  /**
   * Content Models
   * Define which content types are available in Builder.io
   */
  models: [
    {
      name: 'page',
      kind: 'page',
    },
    {
      name: 'section',
      kind: 'section',
    },
    {
      name: 'symbol',
      kind: 'symbol',
    },
  ],

  /**
   * Custom Fields
   * Add custom input fields to Builder.io editor
   */
  customFields: {
    // Aurora-specific fields
    auroraThreshold: {
      name: 'Aurora Threshold',
      type: 'number',
      defaultValue: 70,
      helperText: 'Probability threshold (0-100)',
    },
    showMetrics: {
      name: 'Show Metrics',
      type: 'boolean',
      defaultValue: true,
    },
  },

  /**
   * Preview URL
   * URL for live preview in Builder.io editor
   */
  previewUrl: process.env.NODE_ENV === 'production'
    ? 'https://aurora.tromso.ai'
    : 'http://localhost:3000',

  /**
   * Editor Settings
   */
  editor: {
    // Enable drag-and-drop for all registered components
    dragAndDrop: true,

    // Enable inline editing
    inlineEditing: true,

    // Show custom component panel
    showCustomComponents: true,
  },
};

export default builderConfig;
