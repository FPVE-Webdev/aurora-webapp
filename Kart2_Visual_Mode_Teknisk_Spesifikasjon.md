# Kart2 – Visual Mode (Live Aurora Rendering)
## Teknisk spesifikasjon (v2)

Denne dokumentasjonen beskriver hvordan Kart2 utvides med et live, atmosfærisk visualiseringslag som gir samme UX-følelse som demobildet, uten å endre eksisterende logikk, data eller beslutninger.

## Formål
Visual Mode gir emosjonell forståelse av nordlysforhold basert på live-data, uten prediksjon eller rådgivning.

## Arkitektur
Mapbox GL JS → Kart2 v1 (uendret) → Visual Mode (WebGL) → UI / Snapshot / OG-image

## Teknologi
- WebGL Canvas overlay
- GPU-akselerert
- Isolert render-lag

## Datainnganger
- Kp-indeks
- Aurora-sannsynlighet
- Skydekke
- Tid
- Tromsø-koordinater

## Aurora-rendering
Volumetrisk lysfelt basert på Kp + sannsynlighet. Rolig, kontinuerlig bevegelse.

## Tromsø-fokus
Radial glød og myk puls rundt Tromsø som emosjonelt anker.

## Værvisualisering
Skydekke som dis/slør. Klarvær gir økt kontrast.

## UX-kontroller
Visual Mode ON/OFF (default OFF). Forklaring alltid synlig.

## Snapshot & deling
Snapshot fryser visuell tilstand. OG-image stemningsbasert.

## Ytelse
60 FPS desktop / 30 FPS mobil. Deaktiveres ved redusert ytelse.

## Tillit
Ingen anbefalinger. Ingen presise lokasjoner. All visualisering merket.

## Akseptanse
UX matcher demobildet. Kart2 v1 forblir uendret.

## Konklusjon
Kart2 v1 er sannheten. Visual Mode er følelsen av sannheten.
