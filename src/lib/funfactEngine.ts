/**
 * Fun Fact Engine
 *
 * Educational aurora facts for users
 */

export const FUNFACTS = [
  {
    no: 'Nordlyset oppstår når elektrisk ladede partikler fra solen treffer jordens magnetfelt i en høyde av 100-400 km.',
    en: 'The Northern Lights occur when electrically charged particles from the sun collide with Earth\'s magnetic field at altitudes of 100-400 km.'
  },
  {
    no: 'Fargen på nordlyset avhenger av hvilke gasser partiklene kolliderer med. Grønt lys kommer fra oksygen i lavere høyder.',
    en: 'The color of the aurora depends on which gases the particles collide with. Green light comes from oxygen at lower altitudes.'
  },
  {
    no: 'Nordlyset kan sees så langt sør som Nord-Tyskland når solaktiviteten er ekstra høy (KP 7+).',
    en: 'The aurora can be seen as far south as Northern Germany when solar activity is extremely high (KP 7+).'
  },
  {
    no: 'På andre planeter med magnetfelt kan man også se nordlys. Jupiter har spektakulære polarskinn.',
    en: 'On other planets with magnetic fields, auroras can also be observed. Jupiter has spectacular polar lights.'
  },
  {
    no: 'Nordlyset lager ingen lyd selv om noen hevder å ha hørt knitrende lyder ved svært sterke nordlys.',
    en: 'The aurora makes no sound, although some claim to have heard crackling noises during very strong displays.'
  },
  {
    no: 'Samene hadde mange myter om nordlyset. Noen trodde det var ånder som danset på himmelen.',
    en: 'The Sami people had many myths about the aurora. Some believed they were spirits dancing in the sky.'
  },
  {
    no: 'Den offisielle termen for nordlys er "aurora borealis", oppkalt etter den romerske gudeskikkelsen Aurora.',
    en: 'The official term for the Northern Lights is "aurora borealis", named after the Roman goddess Aurora.'
  },
  {
    no: 'Tromsø kalles "Nordlysets hovedstad" fordi det ligger perfekt plassert under aurora-sonen.',
    en: 'Tromsø is called "The Capital of the Northern Lights" because it is perfectly positioned under the aurora zone.'
  },
  {
    no: 'Sørpollyset kalles "aurora australis" og er like spektakulært som nordlyset på nordpolen.',
    en: 'The Southern Lights are called "aurora australis" and are just as spectacular as the Northern Lights.'
  },
  {
    no: 'Den beste tiden å se nordlys er mellom september og april når mørketiden er lengst.',
    en: 'The best time to see the aurora is between September and April when the dark period is longest.'
  },
  {
    no: 'Nordlyset kan bevege seg med hastigheter opp til 1000 km/t langs himmelrommet.',
    en: 'The aurora can move at speeds up to 1000 km/h across the sky.'
  },
  {
    no: 'En typisk nordlysforekomst kan vare fra minutter til flere timer avhengig av solaktiviteten.',
    en: 'A typical aurora display can last from minutes to several hours depending on solar activity.'
  },
  {
    no: 'Rødt nordlys oppstår i større høyder (over 200 km) når partiklene treffer oksygen.',
    en: 'Red aurora occurs at higher altitudes (above 200 km) when particles collide with oxygen.'
  },
  {
    no: 'Fiolett og blått nordlys er sjeldnere og kommer fra nitrogen i atmosfæren.',
    en: 'Purple and blue aurora are rarer and come from nitrogen in the atmosphere.'
  },
  {
    no: 'Nordlyset følger en 11-årig syklus som samsvarer med solens aktivitetssyklus.',
    en: 'The aurora follows an 11-year cycle that corresponds with the sun\'s activity cycle.'
  },
];

/**
 * Get random fun facts
 */
export function getRandomFunfacts(count: number = 3, language: 'no' | 'en' = 'en'): string[] {
  const shuffled = [...FUNFACTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(fact => fact[language]);
}

/**
 * Get a single random fun fact
 */
export function getRandomFunfact(language: 'no' | 'en' = 'en'): string {
  const fact = FUNFACTS[Math.floor(Math.random() * FUNFACTS.length)];
  return fact[language];
}
