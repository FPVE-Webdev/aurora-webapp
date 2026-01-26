'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'no' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

// Translations
const translations: Record<Language, Record<string, string>> = {
  no: {
    // Navigation & General
    home: 'Hjem',
    map: 'Kart',
    forecast: 'Prognose',
    settings: 'Innstillinger',

    // Home page
    goOutNow: 'GÅ UT NÅ!',
    chanceIn: 'sjanse i',
    probabilityNow: 'Sannsynlighet for nordlys nå',
    loadingData: 'Henter nordlysdata...',
    statusExcellent: 'Utmerket!',
    statusGood: 'Gode forhold!',
    statusModerate: 'Moderat',
    statusPoor: 'Dårlige forhold',

    // Premium
    upgradeToPremiumTitle: 'Oppgrader til Premium',
    getTheMost: 'Få mest ut av nordlysjakten',
    detailedForecast72h: '72-timers detaljert prognose',
    observationPointsWithGps: '50+ observasjonspunkter med GPS',
    pushAlertsGoodConditions: 'Pushvarsler ved gode forhold',
    darkTimeAndSolar: 'Mørketid og solaktivitet',
    tryPremiumNow: 'Prøv Premium nå',
    onlyPerMonth: 'Kun 49 kr/måned',

    // Weather
    temperature: 'Temperatur',
    cloudCover: 'Skydekke',
    kpIndex: 'KP-indeks',
    bestTime: 'Beste tid',

    // Kart3 page
    couldNotFetchBestSpot: 'Kunne ikke hente beste sted nå.',
    couldNotShareImage: 'Kunne ikke lage delingsbilde. Prøv igjen.',
    cloudUnknown: 'Ukjent',
    cloudLow: 'Lav sky',
    cloudMedium: 'Middels sky',
    cloudHigh: 'Høy sky',
    tromsoNow: 'Tromsø nå',
    goToDailyHome: 'Gå til dagens hjem',
    bestSpotNow: 'Best spot nå',
    openInGoogleMaps: 'Åpne i Google Maps',
    seeFullMap: 'Se hele kartet i appen',
    shareStatus: 'Del status',
    creatingShare: 'Lager...',
    driveToSpot: 'Kjør mot {name} (~{minutes} min). Skydekke ca {cloudCoverage}%',
    stayInTromso: 'Tromsø er det beste valget nå – bli i byen.',

    // Main page (page.tsx)
    loadingAuroraData: 'Laster nordlysdata...',
    couldNotLoadAuroraData: 'Kunne ikke laste nordlysdata',
    auroraInTromso: '🌌 Nordlys i Tromsø',
    liveAuroraForecastSubtitle: 'Live nordlysvarsel for Nord-Norge basert på solaktivitet, værmeldinger og geografisk plassering',
    weatherForecast: 'Værprognose',
    realtimeData: 'Sanntidsdata',
    updated: 'Oppdatert:',
    advancedDataForEnthusiasts: '📊 Avanserte data (for entusiaster)',
    seeLiveMap: 'Se live kart',
    creatingImage: 'Lager bilde...',

    // Forecast page
    loadingForecasts: 'Laster prognoser...',
    couldNotLoadForecasts: 'Kunne ikke laste prognoser',
    backToHome: 'Tilbake til forsiden',
    backToRegions: 'Tilbake til regioner',
    back: 'Tilbake',
    auroraForecast: 'Nordlysprognose',
    forecastMode: 'Prognosemodus',
    regionalOverview: 'Regional oversikt for Nord-Norge',
    hourForecastForSpot: '12-timers prognose for {spot}',
    lastUpdated: 'Sist oppdatert:',
    premiumFeature: 'Premium-funksjon',
    detailedForecastsDescription: 'Detaljerte prognoser for individuelle observasjonssteder er tilgjengelig for premium-brukere.',
    allObservationSpots: 'Alle observasjonssteder i Nord-Norge',
    hourDetailedForecast: '12-timers detaljert prognose per sted',
    weatherDataAndVisibility: 'Værdata og visningsmuligheter',
    now: 'Nå',
    windSpeed: 'Vindstyrke',
    aboutForecast: 'Om prognosen',
    forecastDescription: 'Prognosen baseres på NOAA KP-indeks, værmeldinger fra MET.no, og geografisk plassering. Jo høyere KP-indeks og jo mindre skydekke, desto større sjanse for nordlys.',
    noHourlyForecast: 'Ingen timesprognose tilgjengelig',
    legend: 'Forklaring',
    excellent70Plus: 'Utmerket (70%+)',
    veryGoodConditions: 'Svært gode forhold',
    good50to69: 'Gode (50-69%)',
    goodOpportunities: 'Gode muligheter',
    moderate30to49: 'Moderate (30-49%)',
    someChance: 'Noe mulighet',
    poor30Minus: 'Dårlige (<30%)',
    littleChance: 'Liten sjanse',

    // Settings page
    languageChangedToNorwegian: 'Språk endret til norsk',
    languageChangedToEnglish: 'Language changed to English',
    temperatureUnitChanged: 'Temperatureenhet endret til °{unit}',
    language: 'Språk',
    selectPreferredLanguage: 'Velg foretrukket språk',
    norwegian: 'Norsk',
    english: 'English',
    temperatureUnit: 'Temperaturenhet',
    selectCelsiusOrFahrenheit: 'Velg Celsius eller Fahrenheit',
    degreesCelsius: 'Grader Celsius',
    degreesFahrenheit: 'Grader Fahrenheit',
    aboutApp: 'Om appen',
    version: 'Versjon',
    dataSource: 'Datakilde',
    privacy: 'Personvern',
    termsOfUse: 'Vilkår for bruk',

    // Navigation
    liveMap: 'Live Kart',
    nordlysTromso: 'Nordlys Tromsø',
    followingAurora: '{count} følger nordlyset',
    switchToGeekMode: 'Bytt til Geek Mode',
    switchToTouristMode: 'Bytt til Tourist Mode',
    tourist: 'Turist',
    geek: 'Geek',
    touristMode: 'Turist Modus',
    geekMode: 'Geek Modus',

    // Premium CTA
    getMostOutOfApp: 'Få mest ut av appen',
    detailedForecast72Hours: '72 timers detaljert prognose',
    observationPointsGPS: '50+ observasjonspunkter med GPS',
    pushNotificationsGoodConditions: 'Push-varsler ved gode forhold',
    darkHoursAndSolarActivity: 'Mørketider og solaktivitet',
    onlyKrPerMonth: 'Kun 49 kr/måned',

    // AuroraStatusCard
    auroraProbability: 'Nordlyssannsynlighet',
    tonight: 'i kveld',
    probabilityTooltip: 'Prognose basert på solaraktivitet og værdata. Lokale forhold kan variere.',
    next4Hours: 'Neste 4 timer',

    // ProbabilityGauge
    auroraVisibility: 'Aurora synlighet',
    realtimeDataBasedOn: 'Sanntidsdata basert på solaktivitet og værmeldinger',
    tooLightForAurora: 'For lyst for nordlys',
    nextOpportunity: 'Neste mulighet: kl',
    bestTimeTonight: 'Beste tid i kveld: kl',
    chance: 'SJANSE',
    excellentConditions: 'Utmerkede forhold!',
    goodConditions: 'Gode forhold!',
    moderateConditions: 'Moderate forhold',
    goOutNowIfDark: 'Gå ut nå hvis det er mørkt!',

    // FunfactPanel
    didYouKnow: 'Visste du?',

    // AlertSettings
    strictMode: 'Strict Mode',
    strictModeDesc: 'Bare varsle ved perfekte forhold (mørkt + klart + høy aktivitet)',
    eagerMode: 'Eager Mode',
    eagerModeDesc: 'Varsle ved enhver nordlysaktivitet (kan gi flere varsler)',
    off: 'Av',
    offDesc: 'Ingen varsler (du sjekker selv når du vil)',
    smartAlerts: 'Smart Varsler',
    chooseWhenToAlert: 'Velg når du vil varsles',
    active: 'Aktiv',
    comingSoon: 'Kommer snart!',
    pushAndSmsComingSoon: 'Push-varsler og SMS-varsler kommer i neste oppdatering. Dine preferanser blir lagret.',

    // SightingsWidget
    liveObservations: 'Live Observasjoner',
    last30Minutes: 'Siste 30 minutter',
    reports: 'rapporter',
    seeAuroraNow: 'Ser du nordlys nå? Hjelp andre ved å rapportere!',
    reported: 'Rapportert!',
    iSeeAuroraNow: 'Jeg ser nordlys nå!',
    highActivityCount: 'Høy aktivitet! {count} personer ser nordlys akkurat nå',
    noReportsYet: 'Ingen rapporter ennå. Vær den første!',

    // DarkHoursInfo
    daylightTooLight: 'Dagtid - for lyst for nordlys',
    civilTwilightStillLight: 'Skumring - fortsatt for lyst',
    nauticalTwilightFaint: 'Nautisk skumring - svakt nordlys kan ses',
    astronomicalTwilightGood: 'Astronomisk skumring - gode forhold',
    nightOptimal: 'Mørkt - optimale forhold',
    unknown: 'Ukjent',
    darkAllDay: 'Mørkt hele døgnet (mørketid)',
    lightConditions: 'Lysforhold',
    darkHours: 'Mørke timer',
    polarNightBestTime: 'Selv i mørketiden er 22:00-02:00 best for nordlys - da er solen dypest under horisonten.',
    bestWhenSunBelow6: 'Nordlys ses best når solen er mer enn 6° under horisonten (nautisk skumring eller mørkere).',

    // ChatWidget
    loadingStatus: 'Laster status...',
    statusWait: 'VENT',
    chatWithAura: 'Snakk med Aura',
    auroraChance: 'Nordlyssjanse',
    cloudCoverage: 'Skydekke',
    wind: 'Vind',
    generalStatus: 'Status Tromsø (generelt)',
    upgradeForDetails: 'Oppgrader for detaljer',
    considerSpot: 'Vurder {spot} – sjansen er ca {probability}% der',
    freshInfoFor: 'Her er fersk info for {name}',
    strongActivityNow: 'Nordlyset er sterkt akkurat nå! Vil du vite hvor du skal dra?',
    activityBuilding: 'Nordlysaktivitet bygger seg opp. Spør meg når det er beste tidspunkt!',
    checkForecast: 'Sjekk nordlysvarselet – jeg kan hjelpe deg planlegge kvelden.',
    conditionsImproved: 'Forholdene har bedret seg! Nordlyset er nå synlig. Vil du vite hvor?',
    conditionsWorsened: 'Skydekket øker. Forholdene er ikke optimale lenger, men jeg kan hjelpe deg finne best spot.',
    welcomeMessage1: 'Hei! 👋 Jeg er Aura, din personlige nordlys-guide for Tromsø.',
    welcomeMessage2: 'Jeg kan hjelpe deg med å finne beste spot for nordlys, gi værvarsler og real-time råd.',
    welcomeMessage3: 'Prøv å spørre: "Hvor kan jeg se nordlys i kveld?" eller "Hva er beste tidspunkt?"',
    confirmDeleteChat: 'Er du sikker på at du vil slette alle chat-meldinger?',
    enterEmailForReceipt: 'Skriv inn e-postadressen din for kvittering:',
    invalidEmail: 'Ugyldig e-postadresse',
    couldNotOpenPayment: 'Kunne ikke åpne betalingsvindu',
    paymentFailed: 'Betaling feilet, prøv igjen',
    openingStripe: 'Åpner Stripe...',
    clearChatHistory: 'Slett chat-historikk',
    closeChat: 'Lukk chat',
    typeMessage: 'Skriv en melding...',
    sendMessage: 'Send melding',

    // Master Status
    notDarkEnough: 'Ikke mørkt nok',
    notDarkEnoughDesc: 'Nordlys er kun synlig når det er mørkt. Vent til det blir natt.',
    tooManyClouds: 'For mye skyer',
    tooManyCloudsDesc: 'Tykk skydekke blokkerer sikten. Sjekk igjen senere.',
    goOutAndSee: 'Ut og se!',
    goOutAndSeeDesc: 'Gode forhold for nordlys akkurat nå.',
    activityButClouds: 'Aktivitet, men skyer',
    activityButCloudsDesc: 'Solaktiviteten er høy. Sjekk kartet for klarvær.',
    clearButLowActivity: 'Klart, men lav aktivitet',
    clearButLowActivityDesc: 'Klar himmel. Venter på at aktiviteten tar seg opp.',
    unlikelyNow: 'Lite sannsynlig',
    unlikelyNowDesc: 'Lav solaktivitet akkurat nå. Slapp av og prøv igjen senere.',

    // PremiumLock
    preciseDrivingInstructions: 'Presise kjøreinstruksjoner',
    gpsCoordinatesDriveTime: 'GPS-koordinater, kjøretider og beste rute til nordlyset',
    aiGuide: 'AI-guide',
    bestSpotRightNow: 'Beste spot akkurat nå',
    liveMapGpsNavigation: 'Live kart med GPS-navigasjon til klareste himmel',
    forecast24h: '24-timers prognose',
    fullOverviewActivity: 'Full oversikt over aktivitet, skyer og beste tidspunkt',
    forecastLabel: 'Prognose',
    enterEmailForReceipt2: 'Skriv inn e-postadressen din for kvittering:',
    invalidEmailAddress: 'Ugyldig e-postadresse',
    paymentError: 'Betalingsfeil',
    perfectForTonight: 'Perfekt for i kveld',
    bestValuePopular: 'Best value · Populær',
    openingPaymentWindow: 'Åpner betalingsvindu...',
    securePaymentNoSubscription: 'Trygg betaling · Ingen abonnement · Umiddelbar tilgang',
    expired: 'Utløpt',
    hoursRemaining: '{hours}t igjen',
    oneNightPass: '1-Night Pass',
    sevenDayPass: '7-Day Pass',

    // MasterStatusCard
    goOutAndSee2: 'UT OG SE!',
    waitABit: 'VENT LITT',
    unlikely: 'LITE TROLIG',
    refreshStatus: 'Oppdater status',
    perfectNow: 'Nå er det perfekt! Mørkt, klart vær og høy aktivitet.',
    stayUpdated: 'Hold deg oppdatert - det kan komme i løpet av noen timer.',
    tooCloudyOrLowActivity: 'Enten for mye skyer, eller for lav aktivitet. Prøv i morgen.',
    technicalDetails: 'Tekniske detaljer',
    dark: 'Mørkt',
    clouds: 'Skyer',
    updated2: 'Oppdatert:',

    // HourlyForecast
    hourForecast: '{hours}-timers prognose',
    sixHourForecast: '6-timers prognose',

    // BestTimeWindow
    bestViewingTime: 'Beste visningstid',
    excellent: 'Utmerket',
    possible: 'Mulig',
    good: 'Godt',
    moderate: 'Moderat',
    low: 'Lavt',
    quality: 'Kvalitet:',
    highProbabilityWindow: 'Høy sannsynlighet for nordlys i dette tidsvinduet!',

    // RegionalView & SpotSelector
    selectRegion: 'Velg region',
    clickRegionForDetails: 'Klikk på en region for å se detaljerte prognoser',
    selectObservationPoint: 'Velg observasjonspunkt',
  },
  en: {
    // Navigation & General
    home: 'Home',
    map: 'Map',
    forecast: 'Forecast',
    settings: 'Settings',

    // Home page
    goOutNow: 'GO OUT NOW!',
    chanceIn: 'chance in',
    probabilityNow: 'Aurora probability now',
    loadingData: 'Loading aurora data...',
    statusExcellent: 'Excellent!',
    statusGood: 'Good conditions!',
    statusModerate: 'Moderate',
    statusPoor: 'Poor conditions',

    // Premium
    upgradeToPremiumTitle: 'Upgrade to Premium',
    getTheMost: 'Get the most from aurora hunting',
    detailedForecast72h: '72-hour detailed forecast',
    observationPointsWithGps: '50+ observation points with GPS',
    pushAlertsGoodConditions: 'Push notifications for good conditions',
    darkTimeAndSolar: 'Dark hours and solar activity',
    tryPremiumNow: 'Try Premium now',
    onlyPerMonth: 'Only $5/month',

    // Weather
    temperature: 'Temperature',
    cloudCover: 'Cloud cover',
    kpIndex: 'KP Index',
    bestTime: 'Best time',

    // Kart3 page
    couldNotFetchBestSpot: 'Could not fetch best spot right now.',
    couldNotShareImage: 'Could not create share image. Please try again.',
    cloudUnknown: 'Unknown',
    cloudLow: 'Low clouds',
    cloudMedium: 'Moderate clouds',
    cloudHigh: 'High clouds',
    tromsoNow: 'Tromsø now',
    goToDailyHome: 'Go to daily home',
    bestSpotNow: 'Best spot now',
    openInGoogleMaps: 'Open in Google Maps',
    seeFullMap: 'See full map in app',
    shareStatus: 'Share status',
    creatingShare: 'Creating...',
    driveToSpot: 'Drive to {name} (~{minutes} min). Cloud coverage ~{cloudCoverage}%',
    stayInTromso: 'Tromsø is the best choice now – stay in the city.',

    // Main page (page.tsx)
    loadingAuroraData: 'Loading aurora data...',
    couldNotLoadAuroraData: 'Could not load aurora data',
    auroraInTromso: '🌌 Northern Lights in Tromsø',
    liveAuroraForecastSubtitle: 'Live aurora forecast for Northern Norway based on solar activity, weather forecasts and geographic location',
    weatherForecast: 'Weather forecast',
    realtimeData: 'Real-time data',
    updated: 'Updated:',
    advancedDataForEnthusiasts: '📊 Advanced data (for enthusiasts)',
    seeLiveMap: 'See live map',
    creatingImage: 'Creating image...',

    // Forecast page
    loadingForecasts: 'Loading forecasts...',
    couldNotLoadForecasts: 'Could not load forecasts',
    backToHome: 'Back to home',
    backToRegions: 'Back to regions',
    back: 'Back',
    auroraForecast: 'Aurora Forecast',
    forecastMode: 'Forecast mode',
    regionalOverview: 'Regional overview for Northern Norway',
    hourForecastForSpot: '12-hour forecast for {spot}',
    lastUpdated: 'Last updated:',
    premiumFeature: 'Premium feature',
    detailedForecastsDescription: 'Detailed forecasts for individual observation spots are available for premium users.',
    allObservationSpots: 'All observation spots in Northern Norway',
    hourDetailedForecast: '12-hour detailed forecast per location',
    weatherDataAndVisibility: 'Weather data and visibility conditions',
    now: 'Now',
    windSpeed: 'Wind speed',
    aboutForecast: 'About the forecast',
    forecastDescription: 'The forecast is based on NOAA KP index, weather forecasts from MET.no, and geographic location. The higher the KP index and the less cloud cover, the greater the chance of aurora.',
    noHourlyForecast: 'No hourly forecast available',
    legend: 'Legend',
    excellent70Plus: 'Excellent (70%+)',
    veryGoodConditions: 'Very good conditions',
    good50to69: 'Good (50-69%)',
    goodOpportunities: 'Good opportunities',
    moderate30to49: 'Moderate (30-49%)',
    someChance: 'Some chance',
    poor30Minus: 'Poor (<30%)',
    littleChance: 'Little chance',

    // Settings page
    languageChangedToNorwegian: 'Språk endret til norsk',
    languageChangedToEnglish: 'Language changed to English',
    temperatureUnitChanged: 'Temperature unit changed to °{unit}',
    language: 'Language',
    selectPreferredLanguage: 'Select preferred language',
    norwegian: 'Norsk',
    english: 'English',
    temperatureUnit: 'Temperature unit',
    selectCelsiusOrFahrenheit: 'Select Celsius or Fahrenheit',
    degreesCelsius: 'Degrees Celsius',
    degreesFahrenheit: 'Degrees Fahrenheit',
    aboutApp: 'About the app',
    version: 'Version',
    dataSource: 'Data source',
    privacy: 'Privacy',
    termsOfUse: 'Terms of use',

    // Navigation
    liveMap: 'Live Map',
    nordlysTromso: 'Northern Lights Tromsø',
    followingAurora: '{count} tracking the aurora',
    switchToGeekMode: 'Switch to Geek Mode',
    switchToTouristMode: 'Switch to Tourist Mode',
    tourist: 'Tourist',
    geek: 'Geek',
    touristMode: 'Tourist Mode',
    geekMode: 'Geek Mode',

    // Premium CTA
    getMostOutOfApp: 'Get the most out of the app',
    detailedForecast72Hours: '72-hour detailed forecast',
    observationPointsGPS: '50+ observation points with GPS',
    pushNotificationsGoodConditions: 'Push notifications for good conditions',
    darkHoursAndSolarActivity: 'Dark hours and solar activity',
    onlyKrPerMonth: 'Only $5/month',

    // AuroraStatusCard
    auroraProbability: 'Aurora Probability',
    tonight: 'tonight',
    probabilityTooltip: 'Forecast based on solar activity and weather data. Local conditions may vary.',
    next4Hours: 'Next 4 hours',

    // ProbabilityGauge
    auroraVisibility: 'Aurora Visibility',
    realtimeDataBasedOn: 'Real-time data based on solar activity and weather forecasts',
    tooLightForAurora: 'Too light for aurora',
    nextOpportunity: 'Next opportunity: at',
    bestTimeTonight: 'Best time tonight: at',
    chance: 'CHANCE',
    excellentConditions: 'Excellent conditions!',
    goodConditions: 'Good conditions!',
    moderateConditions: 'Moderate conditions',
    goOutNowIfDark: 'Go out now if it\'s dark!',

    // FunfactPanel
    didYouKnow: 'Did you know?',

    // AlertSettings
    strictMode: 'Strict Mode',
    strictModeDesc: 'Only alert for perfect conditions (dark + clear + high activity)',
    eagerMode: 'Eager Mode',
    eagerModeDesc: 'Alert for any aurora activity (may result in more notifications)',
    off: 'Off',
    offDesc: 'No alerts (you check yourself when you want)',
    smartAlerts: 'Smart Alerts',
    chooseWhenToAlert: 'Choose when to be alerted',
    active: 'Active',
    comingSoon: 'Coming soon!',
    pushAndSmsComingSoon: 'Push notifications and SMS alerts coming in the next update. Your preferences will be saved.',

    // SightingsWidget
    liveObservations: 'Live Observations',
    last30Minutes: 'Last 30 minutes',
    reports: 'reports',
    seeAuroraNow: 'Do you see aurora now? Help others by reporting!',
    reported: 'Reported!',
    iSeeAuroraNow: 'I see aurora now!',
    highActivityCount: 'High activity! {count} people see aurora right now',
    noReportsYet: 'No reports yet. Be the first!',

    // DarkHoursInfo
    daylightTooLight: 'Daylight - too light for aurora',
    civilTwilightStillLight: 'Civil twilight - still too light',
    nauticalTwilightFaint: 'Nautical twilight - faint aurora may be visible',
    astronomicalTwilightGood: 'Astronomical twilight - good conditions',
    nightOptimal: 'Dark - optimal conditions',
    unknown: 'Unknown',
    darkAllDay: 'Dark all day (polar night)',
    lightConditions: 'Light Conditions',
    darkHours: 'Dark hours',
    polarNightBestTime: 'Even during polar night, 10 PM - 2 AM is best for aurora - when the sun is deepest below the horizon.',
    bestWhenSunBelow6: 'Aurora is best seen when the sun is more than 6° below the horizon (nautical twilight or darker).',

    // ChatWidget
    loadingStatus: 'Loading status...',
    statusWait: 'WAIT',
    chatWithAura: 'Ask Aura',
    auroraChance: 'Aurora chance',
    cloudCoverage: 'Cloud coverage',
    wind: 'Wind',
    generalStatus: 'Tromsø status (general)',
    upgradeForDetails: 'Upgrade for details',
    considerSpot: 'Consider {spot} – about {probability}% chance there',
    freshInfoFor: 'Fresh info for {name}',
    strongActivityNow: '✨ Aurora is strong right now! Want to know where to go?',
    activityBuilding: '🌌 Aurora activity is building up. Ask me when is the best time!',
    checkForecast: '📊 Check the aurora forecast – I can help you plan your evening.',
    conditionsImproved: '🚀 Conditions have improved! Aurora is now visible. Want to know where?',
    conditionsWorsened: "⚠️ Cloud cover is increasing. Conditions aren't optimal, but I can help you find the best spot.",
    welcomeMessage1: "Hi! 👋 I'm Aura, your personal Northern Lights guide for Tromsø.",
    welcomeMessage2: 'I can help you find the best aurora viewing spots, weather forecasts, and real-time advice.',
    welcomeMessage3: "Try asking: \"Where can I see the Northern Lights tonight?\" or \"What's the best time?\"",
    confirmDeleteChat: 'Are you sure you want to delete all chat messages?',
    enterEmailForReceipt: 'Enter your email address for receipt:',
    invalidEmail: 'Invalid email address',
    couldNotOpenPayment: 'Could not open payment window',
    paymentFailed: 'Payment failed, please try again',
    openingStripe: 'Opening Stripe...',
    clearChatHistory: 'Clear chat history',
    closeChat: 'Close chat',
    typeMessage: 'Type a message...',
    sendMessage: 'Send message',

    // Master Status
    notDarkEnough: 'Not dark enough',
    notDarkEnoughDesc: "Aurora is only visible when it's dark. Wait until nighttime.",
    tooManyClouds: 'Too many clouds',
    tooManyCloudsDesc: 'Heavy cloud cover is blocking the view. Check back later.',
    goOutAndSee: 'Go out and see!',
    goOutAndSeeDesc: 'Good conditions for aurora right now.',
    activityButClouds: 'Activity, but clouds',
    activityButCloudsDesc: 'Solar activity is high. Check the map for clear skies.',
    clearButLowActivity: 'Clear, but low activity',
    clearButLowActivityDesc: 'Clear skies. Waiting for activity to pick up.',
    unlikelyNow: 'Unlikely now',
    unlikelyNowDesc: 'Low solar activity right now. Relax and try again later.',

    // PremiumLock
    preciseDrivingInstructions: 'Precise driving instructions',
    gpsCoordinatesDriveTime: 'GPS coordinates, drive times, and best route to aurora',
    aiGuide: 'AI Guide',
    bestSpotRightNow: 'Best spot right now',
    liveMapGpsNavigation: 'Live map with GPS navigation to clearest skies',
    forecast24h: '24-hour forecast',
    fullOverviewActivity: 'Complete overview of activity, clouds, and best time',
    forecastLabel: 'Forecast',
    enterEmailForReceipt2: 'Enter your email for receipt:',
    invalidEmailAddress: 'Invalid email address',
    paymentError: 'Payment failed',
    perfectForTonight: 'Perfect for tonight',
    bestValuePopular: 'Best value · Popular',
    openingPaymentWindow: 'Opening payment window...',
    securePaymentNoSubscription: 'Secure payment · No subscription · Instant access',
    expired: 'Expired',
    hoursRemaining: '{hours}h remaining',
    oneNightPass: '1-Night Pass',
    sevenDayPass: '7-Day Pass',

    // MasterStatusCard
    goOutAndSee2: 'GO OUT NOW!',
    waitABit: 'WAIT A BIT',
    unlikely: 'UNLIKELY',
    refreshStatus: 'Refresh status',
    perfectNow: 'Perfect right now! Dark, clear skies, and high activity.',
    stayUpdated: 'Stay updated - it might come within a few hours.',
    tooCloudyOrLowActivity: 'Either too cloudy or too low activity. Try tomorrow.',
    technicalDetails: 'Technical details',
    dark: 'Dark',
    clouds: 'Clouds',
    updated2: 'Updated:',

    // HourlyForecast
    hourForecast: '{hours}-hour forecast',
    sixHourForecast: '6-hour forecast',

    // BestTimeWindow
    bestViewingTime: 'Best viewing time',
    excellent: 'Excellent',
    possible: 'Possible',
    good: 'Good',
    moderate: 'Moderate',
    low: 'Low',
    quality: 'Quality:',
    highProbabilityWindow: 'High probability for aurora in this time window!',

    // RegionalView & SpotSelector
    selectRegion: 'Select region',
    clickRegionForDetails: 'Click on a region to see detailed forecasts',
    selectObservationPoint: 'Select observation point',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en'); // Default to English for tourists

  // Load language from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aurora-language') as Language;
      if (saved && (saved === 'no' || saved === 'en')) {
        setLanguageState(saved);
      }
      // If no saved preference, stay with 'en' default (no browser detection)
    }
  }, []);

  // Save language to localStorage when it changes
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aurora-language', lang);
    }
  };

  // Translation function
  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
