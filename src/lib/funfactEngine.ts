/**
 * Fun Fact Engine
 *
 * Educational aurora facts for users
 */

export const FUNFACTS = [
  'Nordlyset oppstår når elektrisk ladede partikler fra solen treffer jordens magnetfelt i en høyde av 100-400 km.',
  'Fargen på nordlyset avhenger av hvilke gasser partiklene kolliderer med. Grønt lys kommer fra oksygen i lavere høyder.',
  'Nordlyset kan sees så langt sør som Nord-Tyskland når solaktiviteten er ekstra høy (KP 7+).',
  'På andre planeter med magnetfelt kan man også se nordlys. Jupiter har spektakulære polarskinn.',
  'Nordlyset lager ingen lyd selv om noen hevder å ha hørt knitrende lyder ved svært sterke nordlys.',
  'Samene hadde mange myter om nordlyset. Noen trodde det var ånder som danset på himmelen.',
  'Den offisielle termen for nordlys er "aurora borealis", oppkalt etter den romerske gudeskikkelsen Aurora.',
  'Tromsø kalles "Nordlysets hovedstad" fordi det ligger perfekt plassert under aurora-sonen.',
  'Sørpollyset kalles "aurora australis" og er like spektakulært som nordlyset på nordpolen.',
  'Den beste tiden å se nordlys er mellom september og april når mørketiden er lengst.',
  'Nordlyset kan bevege seg med hastigheter opp til 1000 km/t langs himmelrommet.',
  'En typisk nordlysforekomst kan vare fra minutter til flere timer avhengig av solaktiviteten.',
  'Rødt nordlys oppstår i større høyder (over 200 km) når partiklene treffer oksygen.',
  'Fiolett og blått nordlys er sjeldnere og kommer fra nitrogen i atmosfæren.',
  'Nordlyset følger en 11-årig syklus som samsvarer med solens aktivitetssyklus.',
];

/**
 * Get random fun facts
 */
export function getRandomFunfacts(count: number = 3): string[] {
  const shuffled = [...FUNFACTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get a single random fun fact
 */
export function getRandomFunfact(): string {
  return FUNFACTS[Math.floor(Math.random() * FUNFACTS.length)];
}
