const { withSentryConfig } = require('@sentry/nextjs');

const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000',
  },

  outputFileTracingRoot: path.join(__dirname),

  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Suppress all logs from Sentry webpack plugin
  silent: true,

  // Only upload source maps in production
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for uploading source maps
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Disable source map upload in development
  disableServerWebpackPlugin: process.env.NODE_ENV !== 'production',
  disableClientWebpackPlugin: process.env.NODE_ENV !== 'production',
};

// Export with Sentry configuration
module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
