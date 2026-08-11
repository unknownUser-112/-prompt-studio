# Task 4 – Fixrunde 12 Implementierungsbericht

Stand: 2026-08-11  
Worktree: `/private/tmp/prompt-studio-v600-phase1-foundation-resume`  
Branch: `codex/v600-phase1-foundation`  
Ausgangs- und aktueller HEAD: `ab92b2c6b18704b7780b082d27d2d17b49da3f6a`  
Commit/Push: keiner

## Änderungsscope

Versioniert geändert sind weiterhin ausschließlich:

- `scripts/verify-csp.mjs`
- `scripts/verify-source-integrity.mjs`
- `tests/contracts/reference-debt.contract.test.ts`

Der uncommittete Gesamtdiff der Fixrunden 4–11 blieb die verbindliche Basis.
Fixrunde 12 ergänzte Produktionslogik ausschließlich in den beiden bereits
freigegebenen Prüfern und 18 fokale Verträge in der bestehenden Contract-Datei.

Keine V500-Referenz-, Golden-Master-, Profilmatrix-, Phase-2-, Architektur-,
Plan-, Spezifikations- oder Infrastrukturdatei wurde geändert. `dist/` und die
Playwright-Ergebnisverzeichnisse wurden nur durch Pflichtgates reproduziert und
bleiben ignoriert. Daneben wurden ausschließlich dieser unversionierte Bericht
und das unversionierte Ledger aktualisiert.

## Red-Green-Refactor-Nachweis

### Finding 1 – CSP-Fremdinhalt/CDATA innerhalb `template`

Zwei neue Child-Prozessregressionen für SVG und MathML enthalten ausschließlich
eine CSP-Scheinpolicy in CDATA innerhalb eines `template`. Ein CDATA-internes
`</template>` darf die Inerttiefe nicht reduzieren.

Fokales RED vor Produktionskorrektur:

```text
Test Files  1 failed (1)
Tests       2 failed | 218 skipped (220)
```

Beide Prozesse lieferten fälschlich `CSP_OK`. Ursache war, dass der CSP-Scanner
innerhalb eines Templates keinen Foreign-Content-Zustand führte und `<![CDATA[`
als Bogus Markup bereits am ersten `>` beendete.

GREEN: `scanHtmlTokens` verfolgt nun SVG-/MathML-Wurzeln auch bei aktiver
Template-Tiefe, konsumiert eindeutiges CDATA bis `]]>` beziehungsweise EOF und
nimmt erst nach dem passenden Fremdinhalt-Endtag die normale HTML-Tokenisierung
wieder auf. Der CSP-Tagtoken trägt zugleich ein beim Parsen ermitteltes
Self-Closing-Flag, damit ein echter selbstschließender Fremdtag den Zustand
nicht offen hält.

### Finding 2 – echtes Self-Closing-Flag in beiden Tagparsern

Acht Regressionen schützen beide Richtungen für SVG und MathML im Source- und
CSP-Tagparser:

- `<svg attr/>` beziehungsweise `<math attr/>` schließt den Fremdinhalt und
  lässt ein nachfolgendes echtes Metadatenelement erkennen.
- `<svg / >` beziehungsweise `<math / >` setzt kein Self-Closing-Flag; ein
  nachfolgender CDATA-interner Metadaten-Lookalike bleibt inert.

Fokales RED vor Produktionskorrektur:

```text
Test Files  1 failed (1)
Tests       4 failed | 220 skipped (224)
```

Ursache war zunächst `tag.attributes.trim() === "/"`: Vorhandene Attribute
verhinderten den echten Selbstschluss, während Slash plus Whitespace
fälschlich als Selbstschluss galt. Das unabhängige Review zeigte anschließend,
dass ein bloßer Bytevergleich vor `>` außerdem den Slash eines unquotierten
Attributwerts wie `data-kind=icon/>` fälschlich als Self-Closing-Markierung
wertete. Vier zusätzliche Source-/CSP-Probes waren dafür fokal 4/4 RED bei 231
übersprungenen Verträgen. GREEN verwenden beide Parser nun einen expliziten
Attributzustandsautomaten. `selfClosing` entsteht nur aus dem
Self-Closing-Start-Tag-Zustand mit unmittelbar folgendem `>`; ein Slash im
unquotierten Attributwert bleibt Wertinhalt.

### Finding 3 – Escaped-/Double-Escaped-Dashzustände

Je eine Regression schützt den Metadaten- und CSP-Scanner mit
`<!--<script>-->`: Das folgende `</script>` beendet im Double-Escaped-Zustand
nur die Double-Escape-Phase und nicht das äußere Script-Element.

Fokales RED vor Produktionskorrektur:

```text
Test Files  1 failed (1)
Tests       2 failed | 224 skipped (226)
```

Der Source-Prüfer akzeptierte ein reines Metadaten-Lookalike, der CSP-Prüfer
zählte eine zweite Scheinpolicy. Ursache war der zustandsunabhängige Übergang
`-->` nach Script Data. GREEN trennt in beiden Scannern `escaped-dash`,
`escaped-dash-dash`, `double-escaped-dash` und
`double-escaped-dash-dash`: Nur der Escaped-Dash-Dash-Zustand kehrt bei `>`
nach Script Data zurück; Double Escaped bleibt Double Escaped.

### Finding 4 – statisch begrenzte `yield*`-Resumptions

Vier Regressionen schützen die Delegationsgrenze:

- Zwei `.next()`-Aufrufe erreichen den Write hinter `yield* [1, 2, 3]` nicht.
- Der vierte Aufruf erreicht den Write nach der statisch belegbaren
  Dreierdelegation.
- Eine unbekannte Delegation gilt auch nach mehreren `.next()`-Aufrufen nicht
  als statisch abgeschlossen.
- Eine per `const` gebundene, vor dem Aufruf mutierte Arrayidentität gilt nicht
  aufgrund ihrer Initializer-Länge als statisch abgeschlossen.

Fokales RED vor Produktionskorrektur:

```text
Test Files  1 failed (1)
Tests       2 failed | 1 passed | 226 skipped (229)
```

Ursache war, dass jedes `YieldExpression` pauschal genau eine Suspension
beitrug. GREEN speichert pro Yield Position, Delegationsflag und Operand. Für
statisch begrenzbare Array-/Stringdelegaten wird die endliche Yield-Anzahl in
die Resume-Anforderung eingerechnet. Ist ein vorheriger `yield*`-Delegat nicht
vollständig statisch begrenzbar, liefert die Erreichbarkeitsanalyse
konservativ keine synchrone Resume-Anforderung und wendet den nachfolgenden
Write nicht an. Das unabhängige Review deckte zusätzlich die veränderliche
`const`-Arrayidentität auf; die neue Probe war 1/1 RED bei 235 übersprungenen
Verträgen. GREEN werden nur noch unmittelbar am `yield*`-Ort statisch belegte
Arrayliterale sowie statisch auflösbare Strings begrenzt. Eine Objektidentität
bleibt trotz `const`-Binding konservativ unbekannt.

### Finding 5 – invocation-zeitliche klassische Cross-Script-Closures

Zwei Regressionen schützen beide zeitlichen Richtungen:

- Eine Closure aus Script 1 sieht die in Script 2 vor `save()` initialisierte
  globale Konstante und meldet deren ungültigen Exportnamen.
- Ein früher Top-Level-Sink aus Script 1 sieht dieselbe erst in Script 2
  deklarierte Bindung nicht rückwirkend.

Fokales RED vor Produktionskorrektur:

```text
Test Files  1 failed (1)
Tests       1 failed | 1 passed | 229 skipped (231)
```

Ursache war die Sinkauswertung unmittelbar nach jedem einzelnen klassischen
Script sowie die ausschließlich lexikalische Scriptindex-Prüfung. GREEN baut
zuerst den vollständigen gemeinsamen Deklarationsraum aller klassischen
Scripts auf und analysiert danach die Sinks. Eine spätere globale Bindung darf
eine frühere Closure nur über eine statisch belegte Aufrufkette erreichen, die
nach der Deklaration aus dem Root-Kontext startet. Frühere Top-Level-Referenzen
bleiben zeitlich unverändert.

### Gemeinsamer Vertragsstand

```text
npx vitest run tests/contracts/reference-debt.contract.test.ts -t "round-twelve"
Test Files  1 passed (1)
Tests       18 passed | 218 skipped (236)

npx vitest run tests/contracts/reference-debt.contract.test.ts
Test Files  1 passed (1)
Tests       236 passed (236)
```

Alle bisherigen 218 Verträge bleiben grün. Beide Task-4-Prüfer bestehen frisch
`node --check`; `git diff --check` ist ohne Ausgabe.

## Fokale Task-4-Gates

| Befehl | Finales Ergebnis |
|---|---|
| `npx vitest run tests/contracts/reference-debt.contract.test.ts` | 1 Datei, 236/236 grün |
| `node scripts/verify-source-integrity.mjs --baseline` | exakt 4/4 freigegebene Referenzschulden, `SOURCE_INTEGRITY_BASELINE_OK` |
| `node scripts/verify-module-boundaries.mjs --bootstrap-only` | `MODULE_BOUNDARIES_OK 1 modules` |
| `node scripts/verify-csp.mjs dist/Prompt-Studio-V600.0.0-Phase1-Foundation.html` | `CSP_OK` |
| `node --check scripts/verify-csp.mjs` | Exit 0 |
| `node --check scripts/verify-source-integrity.mjs` | Exit 0 |

Die vier unveränderten Baselineschulden:

- `REFERENCE_VERSION_METADATA_STALE`
- `REFERENCE_EXPORT_FILENAME_STALE`
- `REFERENCE_DUPLICATE_RENDERED_IDS`
- `REFERENCE_REAL_MOBILE_COVERAGE_MISSING`

## Arbeitspaket-A-Gates

### Toolchain, Build, Tests und Single HTML

`npm run verify` war auf dem finalen Stand vollständig grün:

- TypeScript: `tsc --noEmit`, Exit 0
- Build: `dist/Prompt-Studio-V600.0.0-Phase1-Foundation.html` reproduziert
- Vitest: 3 Dateien, 242/242 Tests grün
- Node-Referenztests: 2/2 grün
- Single-HTML-Verifier: Artefakt verifiziert

### Referenz-, Manifest- und Golden-Capture-Gates

| Befehl | Finales Ergebnis |
|---|---|
| `node scripts/reference/verify-reference.mjs` | 3 Referenzartefakte verifiziert |
| `npx vitest run tests/golden/golden-manifest.test.ts` | 2/2 grün |
| `node scripts/reference/capture-golden.mjs --verify-existing` | nach Browserfreigabe 1/1 grün; 216/216 Kombinationen |

Golden-Master-/Profilmatrix:

- 24 Szenarien
- 9 autoritative Profile
- 216/216 Kombinationen
- Matrix-SHA-256:
  `ecf1b394353d411818fbbb9e27bb1aba532a81097276587a642d29342274460c`
- Keine Golden-Master- oder Profilmatrixdatei geändert

### Playwright-Kompatibilitätsprojekte

| Befehl | Finales Ergebnis |
|---|---|
| `npx playwright test tests/golden/v500-targeted-regressions.spec.ts --project=chromium` | nach Browserfreigabe 11/11 grün |
| `npx playwright test tests/golden/v500-targeted-regressions.spec.ts --project=webkit` | nach Browserfreigabe 11/11 grün |

### Sandboxfehler und identische freigegebene Wiederholungen

Alle drei Browserbefehle wurden zunächst unverändert in der macOS-Sandbox
ausgeführt. Kein inhaltlicher Browser-Test begann:

1. Golden Capture: Chromium-Start bei 0 ms abgebrochen,
   `MachPortRendezvousServer ... Permission denied (1100)`, Gate Exit 1.
2. Chromium Targeted: 11/11 Fälle jeweils bei 0 ms am Browserstart mit
   derselben `Permission denied (1100)`-Signatur abgebrochen, Gate Exit 1.
3. WebKit Targeted: 11/11 Fälle jeweils bei 0 ms beim Start von `pw_run.sh` mit
   `Abort trap: 6` abgebrochen; Browserprozess Exit 134, Gate Exit 1.

Diese Sandboxfehler wurden nicht als Testergebnisse gewertet. Exakt dieselben
Befehle wurden mit der erforderlichen Browserfreigabe wiederholt:

```text
Golden Capture
1 passed (11.7s)
Verified 216/216 golden combinations; matrix SHA-256
ecf1b394353d411818fbbb9e27bb1aba532a81097276587a642d29342274460c.

Chromium Targeted
11 passed (1.9s)

WebKit Targeted
11 passed (4.1s)
```

## Git-Status und Scopeprüfung

`git diff --check` war ohne Ausgabe, Exit 0. `git diff --name-only` enthielt
exakt die drei freigegebenen versionierten Dateien. Der bestehende Gesamtdiff
der Fixrunden 4–12 umfasst:

```text
scripts/verify-csp.mjs                          |  767 ++++++-
scripts/verify-source-integrity.mjs             | 2138 +++++++++++++++++--
tests/contracts/reference-debt.contract.test.ts | 2608 ++++++++++++++++++++++-
3 files changed, 5216 insertions(+), 297 deletions(-)
```

HEAD blieb `ab92b2c6b18704b7780b082d27d2d17b49da3f6a`. Es wurde weder
committed noch gepusht.

## Risiken und Reststatus

- Kein offener Pflichtgate-Fehler: Nach der erforderlichen Browserfreigabe
  sind sämtliche lokal verfügbaren Task-4- und Arbeitspaket-A-Gates grün.
- Unbekannte `yield*`-Delegaten bleiben absichtlich konservativ außerhalb der
  begrenzten Resumption-Analyse; nur statisch endliche Delegaten erhalten eine
  Resume-Anzahl.
- Cross-Script-Aufrufzeitpunkte werden nur über statisch belegte synchrone
  Aufrufketten propagiert; spätere Deklarationen bleiben für frühere
  Top-Level-Sinks unsichtbar.
- Die autoritative 24×9-Matrix blieb byteinhaltlich unverändert und wurde
  vollständig mit demselben SHA-256 verifiziert.
- Die macOS-Sandbox kann Chromium/WebKit ohne Browserfreigabe physisch nicht
  starten; künftige Browserläufe benötigen dieselbe Freigabe.
- Das unabhängige Task-4-Handoff-Review meldete zunächst zwei reproduzierbare
  wichtige Randfälle (Slash im unquotierten Attributwert und mutierbare
  `const`-Arraydelegation). Beide wurden per zusätzlichem RED/GREEN geschlossen;
  das anschließende unabhängige Re-Review endete mit `NO_FINDINGS`.
- Kein Commit/Push.
