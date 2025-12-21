# Aurora.tromso.ai - Aurora Forecast Web Application

> Standalone Next.js web application for aurora forecasting at [aurora.tromso.ai](https://aurora.tromso.ai)

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

## 🌌 Overview

Aurora.tromso.ai serves three main purposes:

1. **Web Application** - Public-facing aurora forecast website
2. **API Backend** - RESTful API for aurora-watcher iOS app
3. **Widget Platform** - Embeddable widgets for B2B customers (planned)

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and data flow
- **[WIDGET_INTEGRATION.md](./WIDGET_INTEGRATION.md)** - Widget SDK and B2B SaaS plan
- **[PRE_DEPLOY_CHECKLIST.md](./PRE_DEPLOY_CHECKLIST.md)** - Deployment checklist
- **[MIGRATION_PLAN.md](./MIGRATION_PLAN.md)** - Feature migration plan

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm 9.x or higher
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/fpve-webdev/aurora-webapp.git
cd aurora-webapp

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your API keys
nano .env.local
```

### Environment Variables

Create a `.env.local` file with the following required variables:

```env
# Required
NEXT_PUBLIC_API_URL=https://tromso.ai
TROMSO_AI_API_KEY=your-api-key-here

# Optional (for full functionality)
NEXT_PUBLIC_SUPABASE_URL=https://byvcabgcjkykwptzmwsl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

See [.env.example](./.env.example) for all available options.

### Development

```bash
# Start development server
npm run dev

# Open browser
open http://localhost:3000
```

### Production Build

```bash
# Create production build
npm run build

# Start production server
npm start
```

## 🏗️ Project Structure

```
aurora-webapp/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Home page
│   │   ├── live/               # Live map page
│   │   ├── forecast/           # Multi-day forecast
│   │   ├── settings/           # User settings
│   │   └── api/                # API routes
│   │       └── aurora/         # Aurora API endpoints
│   │           ├── now/        # Current conditions
│   │           ├── tonight/    # Tonight's forecast
│   │           ├── forecast/   # Multi-day forecast
│   │           ├── hourly/     # Hourly timeline
│   │           └── oval/       # Aurora oval data
│   ├── components/             # React components
│   │   ├── aurora/             # Aurora-specific components
│   │   ├── map/                # Map components
│   │   └── ui/                 # Shared UI components
│   ├── contexts/               # React contexts
│   │   ├── LanguageContext.tsx # NO/EN language support
│   │   └── TemperatureContext.tsx # °C/°F preference
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuroraData.ts    # Main aurora data hook
│   │   └── useAuroraLive.ts    # Live oval data
│   ├── services/               # API clients
│   │   ├── tromsoAIService.ts  # Tromsø AI API client
│   │   └── weatherService.ts   # MET.no weather API
│   ├── types/                  # TypeScript definitions
│   │   ├── aurora.ts           # Aurora data types
│   │   └── tromsoAI.ts         # Tromsø AI response types
│   └── lib/                    # Utilities
│       ├── constants.ts        # Observation spots, regions
│       ├── auroraCalculations.ts # KP calculations
│       └── utils.ts            # Helper functions
├── public/                     # Static assets
├── ARCHITECTURE.md             # System architecture docs
├── WIDGET_INTEGRATION.md       # Widget SDK documentation
├── package.json                # Dependencies
├── next.config.js              # Next.js configuration
├── tailwind.config.js          # Tailwind CSS config
└── tsconfig.json               # TypeScript config
```

## 🔌 API Endpoints

All endpoints are available at `/api/aurora/*`:

### GET /api/aurora/now
Returns current aurora conditions

**Query Parameters:**
- `lang` - Language (no|en), default: `no`

**Response:**
```json
{
  "score": 72,
  "level": "good",
  "confidence": "high",
  "headline": "Gode sjanser for nordlys i kveld",
  "summary": "Sterk solvind og lav skydekke...",
  "best_time": "Mellom 21:00 og 02:00",
  "tips": ["Finn et sted med lite lys", ...],
  "updated": "2025-12-21T20:30:00.000Z",
  "meta": {
    "cached": true,
    "cache_age": 120
  }
}
```

### GET /api/aurora/tonight
Same as `/now`, optimized for tonight's viewing

### GET /api/aurora/forecast
Multi-day aurora forecast

**Query Parameters:**
- `days` - Number of days (1-7), default: `3`
- `lang` - Language (no|en), default: `no`

### GET /api/aurora/hourly
Hourly forecast for timeline/animation

**Query Parameters:**
- `hours` - Number of hours (1-72), default: `12`
- `location` - Location ID, default: `tromso`
- `lang` - Language (no|en), default: `no`

### GET /api/aurora/oval
Live aurora oval coordinates for map visualization

**Query Parameters:**
- `resolution` - Data resolution (low|medium|high), default: `medium`

## 🗺️ Features

### Implemented
- ✅ Current aurora forecast display
- ✅ Interactive map with 30+ observation spots
- ✅ Live aurora oval overlay
- ✅ Hourly forecast timeline
- ✅ Multi-language support (Norwegian/English)
- ✅ Temperature units (Celsius/Fahrenheit)
- ✅ Responsive design (mobile/desktop)
- ✅ Server-side caching (5-30 min TTL)
- ✅ Fallback to mock data on API failure

### Planned
- ⏳ Widget SDK for B2B customers
- ⏳ Premium features (72h forecast, push notifications)
- ⏳ AI chat assistant
- ⏳ User authentication
- ⏳ Stripe billing integration

## 🔧 Development

### Code Style

- TypeScript strict mode enabled
- ESLint for code quality
- Prettier for formatting (automatic)
- 2 spaces for indentation
- camelCase for variables/functions
- PascalCase for components/classes

### Testing

```bash
# Run linter
npm run lint

# Type check
npx tsc --noEmit
```

## 🚢 Deployment

### Vercel (Recommended)

1. **Connect to GitHub:**
   ```bash
   git remote add origin https://github.com/fpve-webdev/aurora-webapp.git
   git push -u origin main
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import GitHub repository
   - Configure environment variables
   - Deploy

3. **Custom Domain:**
   - Add domain in Vercel dashboard: `aurora.tromso.ai`
   - Configure DNS:
     ```
     Type: CNAME
     Name: aurora
     Value: cname.vercel-dns.com
     ```

### Environment Variables (Production)

Set these in Vercel dashboard:

```env
NEXT_PUBLIC_API_URL=https://tromso.ai
TROMSO_AI_API_KEY=<production-key>
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
```

## 📊 Performance

- **API Response Time:** <500ms (p95, cached)
- **Page Load Time:** <3s (p95)
- **Cache Hit Rate:** ~80% (5-30 min TTL)
- **Build Size:** ~200KB (gzipped)

## 🔐 Security

- ✅ No hardcoded secrets in codebase
- ✅ Environment variables for all sensitive data
- ✅ Server-side API key validation
- ⏳ CORS configuration (pending)
- ⏳ Rate limiting (pending)
- ⏳ API key management system (pending)

## 🤝 Integration

### aurora-watcher iOS App

The iOS app should point to this backend:

```typescript
// aurora-watcher/src/services/tromsoAIService.ts
const BASE_URL = 'https://aurora.tromso.ai/api/aurora';
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full integration details.

### Widget Integration

For embedding widgets on external sites, see [WIDGET_INTEGRATION.md](./WIDGET_INTEGRATION.md).

## 📝 License

Private - © 2025 FPV Experience / Tromsø AI

## 🙋 Support

For issues or questions:
- Email: support@tromso.ai
- Documentation: [docs.tromso.ai](https://docs.tromso.ai)

---

**Built with ❤️ in Tromsø, Norway** 🇳🇴
