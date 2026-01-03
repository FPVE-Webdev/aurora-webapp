# Claude – arbeidsflyt for alle oppgaver

Alle samtaler og oppgaver i dette prosjektet skal gjennomføres i rekkefølgen:

## Ask → Plan → Build

### Ask
- Still nødvendige avklaringsspørsmål før noe implementeres.
- Hvis informasjon mangler (krav, ønsket resultat, avgrensning, miljø/URL), spør først.

### Plan
- Gi en kort plan før du bruker verktøy/ender kode.
- Planen skal beskrive mål, berørte filer/områder og hvordan det verifiseres.
- Ikke start implementering før planen er tydelig og akseptert (med mindre bruker eksplisitt sier “fortsett”).

### Build
- Utfør endringene i henhold til planen.
- Verifiser resultatet (build/lints/tests og/eller browser-sjekk når relevant).
- Oppsummer endringene kort, med hva som ble gjort og hva som bør sjekkes i prod.


