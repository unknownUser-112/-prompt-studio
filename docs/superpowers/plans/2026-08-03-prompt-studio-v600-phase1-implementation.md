# Prompt Studio V600 Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: **Entwurf – ausdrückliche Freigabe ausstehend**

**Goal:** Prompt Studio V600 Phase 1 als modulare, strikt typisierte, vollständig offlinefähige Single-HTML-Anwendung mit V500.6.11-Verhaltensparität, IndexedDB-Persistenz und reproduzierbarem Release bauen.

**Architecture:** Die Implementierung folgt Ports and Adapters mit `bootstrap/` als einzigem Composition Root. UI, Application Services, Domain Engines, Storage-Adapter, Plugins, Profile, Renderer und Diagnostik kommunizieren ausschließlich über freigegebene Contracts; die Constraint Engine ist die einzige Regelquelle und `PromptDocument` der kanonische Prompt-AST.

**Tech Stack:** TypeScript strict, ES Modules, npm mit Lockfile, esbuild-IIFE, Vitest, fake-indexeddb, Playwright Chromium/WebKit, framework-freies DOM, IndexedDB, Node-basierte Build- und Integritätsskripte.

## Global Constraints

- Autoritative Spezifikation: `docs/superpowers/specs/2026-08-03-prompt-studio-v600-phase1-design.md`, Freigabecommit `29e86a342e6fe9c00a941f02d141716e3c607d9f`, Inhaltsbasis `a9e61232ec11e6f4c57b49f89fa23dbd68a12526a3111e28b39ff4aee44dd140`, aktueller Dokumenthash `e95f53e03098c32da01fa27c9c125c7a3a02dc334bbe45f5c0adfda7cf59e60e`.
- Der Freigabecommit liegt zum Planungszeitpunkt nur in der lokalen Dokumentationshistorie; `origin/main` enthält die Spezifikation nicht. Vor Produktionscode muss Task 1 diesen Stand als eigenen Dokumentationscommit auf die Implementierungsbranch übernehmen und den Hash prüfen.
- Autoritative Referenz: `Prompt-Studio-V500.6.11-Binding-Selfie-Open-Garment-State.html`, SHA-256 `d1c2a292d203c8f76116b8b0a330bf677be394f86e044706cc3675a7326ac5c7`, 779.221 Byte, 6.554 Zeilen.
- Autoritativer Referenzbericht: `Prompt-Studio-V500.6.11-Test-Results.json`, SHA-256 `67e71ecb3f401c5d892b4cd21fa1a0f31ab4c858bb35642866e077f244167a63`.
- Historische Zwischenreferenz: `Prompt-Studio-V500.6.1-Compiler-Language-Integrity-Fix.html`, SHA-256 `619e9a73ec2699d94fa22b8cefa5fba87c6fce14678bec036d8de98e76179199`; sie darf keine aktuellen Golden Master erzeugen.
- Produktionscode enthält kein `any`; externe Daten beginnen als `unknown` und werden validiert.
- Nur `bootstrap/` erzeugt konkrete Adapter, Repositories, Services, Plugins und UI-Bindings.
- `AppCore` bleibt Lifecycle-, Registry- und Application-Facade und erzeugt keine konkrete Implementierung.
- Runtime-Werte kommen ausschließlich aus injizierten Providern für Clock, monotone Clock, IDs, Hash, Zufall, Locale und Zeitzone.
- Die Constraint Engine ist die einzige Fachregelquelle. Plugins liefern Fakten, Constraints oder regelneutrale Promptabschnitte; Profile und Renderer erzeugen keine Fachregeln.
- Dauerhafte V600-Daten liegen ausschließlich in IndexedDB. V500-`localStorage` wird nur lesend migriert und niemals verändert oder gelöscht.
- Cloud Sync, KI-Wissensdatenbank und sämtliche Phase-2-UI-Flags bleiben deaktiviert. Es gibt keine Netzwerkzugriffe.
- Das Release ist genau eine CSP-konforme HTML-Datei und funktioniert über `file://` und localhost.
- Zielartefakt: `dist/Prompt-Studio-V600.0.0-Phase1-Foundation.html`; Produktionsbundle kleiner als 1,5 MB.
- Performancebudgets p95 auf M3 Max: Wizard-Boot < 150 ms, Projektladen < 200 ms, Prompt < 100 ms, Autosave < 50 ms, Wizard-Schritt < 50 ms.
- Kein Task verändert V500-Referenzdateien. Keine Phase-2-Datei wird erstellt oder bearbeitet.
- Jeder Task folgt Red-Green-Refactor, führt die angegebenen fokussierten Tests aus und endet mit genau dem angegebenen Zwischen-Commit.

## Ausführungsreihenfolge und Commit-Gates

```text
A1 -> A2 -> A3 -> A4
             |
             v
B1 -> B2 -> B3 -> B4
                   |
                   v
C1 -> C2 -> C3 -> C4
                   |
                   v
D1 -> D2 -> D3 -> D4
                   |
                   v
E1 -> E2 -> E3
              |
              v
F1 -> F2 -> F3
```

Ein Gate darf erst passieren, wenn der aktuelle Worktree sauber ist, der Task-Commit nur die gelisteten Dateien enthält und alle bis dahin verfügbaren Unit-, Contract-, Integrations- und V500-Regressionsprüfungen grün sind. Bei einem fehlgeschlagenen Gate bleibt der letzte grüne Commit erhalten; nicht bestandene Änderungen werden nicht gepusht und nicht mit nachfolgenden Tasks vermischt.

Nach jedem Arbeitspaket werden `npm run typecheck`, alle bis dahin vorhandenen
Vitest-Suites, die verfügbare Golden-Master-Suite und der Produktionsbuild
erneut ausgeführt. Vor den Abnahmen D, E und F läuft zusätzlich die vollständige
216er Profilmatrix. Erst danach wird der jeweilige Paketstand ohne Force-Push
auf die Implementierungsbranch übertragen.

---

## Arbeitspaket A – Referenzaufnahme, Buildsystem und Golden Masters

### Task 1: Freigabebasis und unveränderliche Referenzen materialisieren

**Files:**
- Create: `docs/superpowers/specs/2026-08-03-prompt-studio-v600-phase1-design.md`
- Create: `reference/v500.6.11/Prompt-Studio-V500.6.11-Binding-Selfie-Open-Garment-State.html`
- Create: `reference/v500.6.11/Prompt-Studio-V500.6.11-Test-Results.json`
- Create: `reference/v500.6.11/manifest.json`
- Create: `reference/historical/v500.6.1/Prompt-Studio-V500.6.1-Compiler-Language-Integrity-Fix.html`
- Create: `reference/historical/v500.6.1/manifest.json`
- Create: `scripts/reference/verify-reference.mjs`
- Test: `tests/reference/reference-integrity.test.mjs`

**Interfaces:**
- Consumes: lokales Git-Objekt `29e86a342e6fe9c00a941f02d141716e3c607d9f` und die drei bereits auf `origin/main` liegenden Referenzdateien.
- Produces: prüfsummenvalidierte, schreibgeschützte Referenzmanifeste und einen wiederholbaren Integritätsbefehl für alle späteren Tasks.

- [ ] **Step 1: Freigabespezifikation kontrolliert übernehmen**

Lies die Datei aus dem Freigabecommit, schreibe ausschließlich diesen Inhalt an den Zielpfad und prüfe danach:

```bash
shasum -a 256 docs/superpowers/specs/2026-08-03-prompt-studio-v600-phase1-design.md
```

Expected: `e95f53e03098c32da01fa27c9c125c7a3a02dc334bbe45f5c0adfda7cf59e60e`.

- [ ] **Step 2: Failing reference-integrity test anlegen**

Der Node-Test importiert `verifyReferenceManifest()` und erwartet für V500.6.11 HTML, V500.6.11 JSON und V500.6.1 HTML jeweils Dateiname, Größe und SHA-256. Er muss zunächst mit fehlendem Modul fehlschlagen. Node-Bordmittel vermeiden eine Abhängigkeit von der erst in Task 2 installierten Toolchain.

Run: `node --test tests/reference/reference-integrity.test.mjs`

Expected: FAIL wegen fehlendem `scripts/reference/verify-reference.mjs`.

- [ ] **Step 3: Manifeste und Prüfer implementieren**

Kopiere die drei geprüften Root-Artefakte bytegleich an die gelisteten
`reference/`-Pfade; verschiebe, editiere oder lösche die Root-Dateien nicht.
`manifest.json` enthält nur kanonische relative Pfade, Bytegröße, Zeilenzahl,
SHA-256, Rolle `authoritative` oder `historical` und erwartete
Referenztestzählungen. `verifyReferenceManifest()` liest Root und isolierte
Kopie als Bytes ohne Normalisierung, vergleicht alle Werte und liefert bei der
ersten Abweichung einen stabilen Fehlercode `REFERENCE_INTEGRITY_MISMATCH`.

- [ ] **Step 4: Integrität grün verifizieren**

Run: `node --test tests/reference/reference-integrity.test.mjs`

Expected: drei verifizierte Artefakte, null Fehler.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-08-03-prompt-studio-v600-phase1-design.md reference scripts/reference/verify-reference.mjs tests/reference/reference-integrity.test.mjs
git commit -m "docs: establish V600 phase 1 reference baseline"
```

**Acceptance:** Spezifikation und Referenzen sind hashgeprüft; keine V500-Datei wurde verändert.

**Rollback:** Den Task-Commit revertieren; die unveränderten Dateien auf `origin/main` bleiben erhalten.

### Task 2: Reproduzierbares TypeScript- und Single-HTML-Buildsystem

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/bootstrap/index.ts`
- Create: `src/ui/shell.html`
- Create: `src/ui/styles.css`
- Create: `scripts/build.mjs`
- Create: `scripts/verify-single-html.mjs`
- Test: `tests/build/single-html.test.ts`

**Interfaces:**
- Consumes: Reference-Metadaten aus Task 1.
- Produces: `npm run typecheck`, `npm test`, `npm run build`, `npm run verify:artifact` und die initiale Single-HTML-Pipeline.

- [ ] **Step 1: Toolchain exakt sperren**

Run:

```bash
npm install --save-dev --save-exact typescript esbuild vitest fake-indexeddb @playwright/test
```

`package.json` definiert `type: module` sowie Scripts für `typecheck`, `test`, `test:unit`, `test:integration`, `test:browser`, `build`, `verify:artifact` und `verify`.

- [ ] **Step 2: Failing build contract schreiben**

Der Test erwartet genau eine Datei in `dist/`, keine externen `script`, `link`, Font- oder Netzwerk-URLs, ein IIFE-Script, inline CSS, die V500.6.11-Baseline-Prüfsumme und einen CSP-Meta-Tag.

Run: `npx vitest run tests/build/single-html.test.ts`

Expected: FAIL, weil noch kein Artefakt existiert.

- [ ] **Step 3: Minimalen reproduzierbaren Builder implementieren**

`scripts/build.mjs` bündelt `src/bootstrap/index.ts` als IIFE, escaped `</script`, inlinet CSS und Shell, sortiert Metadaten kanonisch und verwendet nur `SOURCE_DATE_EPOCH`, falls gesetzt. App-Version, Datenbankschema-Version, Plugin-API-Version, Quellhash, V500.6.11-HTML-Hash und Referenzbericht-Hash werden eingebettet. Ausgabe ist ausschließlich `dist/Prompt-Studio-V600.0.0-Phase1-Foundation.html`.

- [ ] **Step 4: Build und Contract verifizieren**

Run:

```bash
npm run typecheck
npm run build
npx vitest run tests/build/single-html.test.ts
npm run verify:artifact
```

Expected: alle Befehle Exit 0, genau eine HTML-Datei.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts playwright.config.ts src/bootstrap/index.ts src/ui/shell.html src/ui/styles.css scripts/build.mjs scripts/verify-single-html.mjs tests/build/single-html.test.ts
git commit -m "build: add reproducible V600 single HTML pipeline"
```

**Acceptance:** Zwei Builds mit identischem `SOURCE_DATE_EPOCH` sind bytegleich; das Artefakt besitzt keine Runtime-Abhängigkeit.

**Rollback:** Build-Commit revertieren; `dist/` bleibt generiert und unversioniert, sofern Task 19 es nicht explizit als Releaseartefakt aufnimmt.

### Task 3: Golden-Master-Harness und 24-mal-9-Fixtures

**Files:**
- Create: `tests/golden/scenarios.ts`
- Create: `tests/golden/profiles.ts`
- Create: `tests/golden/v500-harness.ts`
- Create: `tests/golden/capture-v500.spec.ts`
- Create: `tests/golden/fixtures/manifest.json`
- Create: `tests/golden/fixtures/v500.6.11/matrix.json`
- Create: `scripts/reference/capture-golden.mjs`
- Test: `tests/golden/golden-manifest.test.ts`

**Interfaces:**
- Consumes: autoritative HTML und Referenzbericht; feste Locale `de-DE`/`en-US`, Zeitzone `Europe/Berlin`, deterministische Szenario-IDs.
- Produces: 24 kanonische Szenarien × 9 Profile, erwartete Texte/JSON, Resolved-State-Indikatoren und szenarienspezifische Längenlimits.

- [ ] **Step 1: Szenarioregistry definieren**

Die Registry enthält genau 24 stabile IDs und deckt Baseline, Character Sheet, Single Reference, Selfie an/aus, Additional Person, Open/Closed Garment, Material Physics, Adaptive Realism, Kamera, Licht, Branding, Safety, Quality Gate, deutsche und englische Ausgabe sowie JSON-Sonderfälle ab.

- [ ] **Step 2: Failing Matrix-Metatest schreiben**

Der Test erwartet 24 eindeutige Szenario-IDs, 9 eindeutige Profile und exakt 216 Kombinationen. JSON-Profile werden geparst; Textprofile bleiben bytegenaue UTF-8-Strings.

Run: `npx vitest run tests/golden/golden-manifest.test.ts`

Expected: FAIL, solange Fixtures fehlen.

- [ ] **Step 3: V500-Harness und Capturer implementieren**

Der Playwright-Harness lädt ausschließlich die lokale Referenzdatei, setzt Eingaben über dokumentierte DOM-Aktionen, wartet deterministisch auf Promptfreigabe und speichert je Kombination Eingabe, Profil, Sprache, Ausgabe, Länge und SHA-256. Er führt zusätzlich `runSelfTests()` aus und verlangt 941/941.

- [ ] **Step 4: Fixtures zweimal erzeugen und Bytegleichheit prüfen**

Run:

```bash
node scripts/reference/capture-golden.mjs
node scripts/reference/capture-golden.mjs --verify-existing
npx vitest run tests/golden/golden-manifest.test.ts
```

Expected: 216/216 Kombinationen, unveränderte Fixture-Hashes, gültiges Standard JSON und Safe JSON.

- [ ] **Step 5: Commit**

```bash
git add tests/golden scripts/reference/capture-golden.mjs
git commit -m "test: capture authoritative V500.6.11 golden masters"
```

**Acceptance:** 941/941 Referenz-Selbsttests, 11/11 gezielte V500.6.11-Fälle und 216/216 Golden-Master-Kombinationen sind reproduzierbar.

**Rollback:** Nur generierte Golden-Fixtures und Harness-Commit revertieren; Referenzdateien bleiben unverändert.

### Task 4: Referenzschulden und Buildintegritätsgates

**Files:**
- Create: `scripts/verify-source-integrity.mjs`
- Create: `scripts/verify-module-boundaries.mjs`
- Create: `scripts/verify-csp.mjs`
- Create: `tests/contracts/reference-debt.contract.test.ts`
- Create: `docs/reports/v500.6.11-reference-debt.md`

**Interfaces:**
- Consumes: V500.6.11-Integritätsbericht und esbuild-Metafile.
- Produces: ausführbare Gates für Versionsmetadaten, Exportnamen, eindeutige statische IDs, Importgrenzen, Zyklen und CSP.

- [ ] **Step 1: Failing Debt-Gates definieren**

Die Contract-Tests müssen V500.6.10-Metadaten, doppelte IDs und fehlende reale mobile Abdeckung als bekannte Referenzschuld klassifizieren, aber im V600-Artefakt als Fehler behandeln.

- [ ] **Step 2: Prüfer implementieren**

`verify-source-integrity.mjs` prüft Versionsstrings, Exportdateinamen, doppelte gerenderte IDs, ungenutzte Exporte und offene Marker. `verify-module-boundaries.mjs` liest den TypeScript-/esbuild-Modulgraphen statt Dateinamenheuristiken. `verify-csp.mjs` parst die finale Policy und verbietet Netzwerkziele.

- [ ] **Step 3: Gates ausführen**

Run:

```bash
npx vitest run tests/contracts/reference-debt.contract.test.ts
node scripts/verify-source-integrity.mjs --baseline
node scripts/verify-module-boundaries.mjs --bootstrap-only
node scripts/verify-csp.mjs dist/Prompt-Studio-V600.0.0-Phase1-Foundation.html
```

Expected: Baselineschulden dokumentiert, V600-Minimalbuild ohne neue Schuld.

- [ ] **Step 4: Commit**

```bash
git add scripts/verify-source-integrity.mjs scripts/verify-module-boundaries.mjs scripts/verify-csp.mjs tests/contracts/reference-debt.contract.test.ts docs/reports/v500.6.11-reference-debt.md
git commit -m "test: enforce V600 source and reference integrity gates"
```

**Work-package A acceptance:** Toolchain, Referenzen, Golden Master und Single-HTML-Minimalbuild sind reproduzierbar; alle A-Tests und bisher verfügbaren V500-Regressionsprüfungen sind grün.

**Work-package A rollback:** Auf den letzten grünen Commit vor A zurücksetzen ist verboten; stattdessen die fehlerhafte A-Teiländerung mit `git revert` rückgängig machen und Referenzmanifeste unverändert erhalten.

---

## Arbeitspaket B – Core, Contracts, Plugin-System und Diagnostik

### Task 5: Core-, Runtime- und Fehlerverträge

**Files:**
- Create: `src/contracts/core/result.ts`
- Create: `src/contracts/core/errors.ts`
- Create: `src/contracts/core/messages.ts`
- Create: `src/contracts/runtime/runtime-environment.ts`
- Create: `src/contracts/runtime/providers.ts`
- Create: `src/infrastructure/runtime/browser-runtime.ts`
- Create: `tests/helpers/fixed-runtime.ts`
- Test: `tests/unit/runtime/runtime-environment.test.ts`
- Test: `tests/contracts/no-direct-runtime-access.contract.test.ts`

**Interfaces:**
- Produces: `Result<T,E>`, `AppError`, `Command`, `Query`, `DomainEvent`, `RuntimeEnvironment`, feste Testprovider und Browserprovider.

- [ ] **Step 1: Failing Provider- und Boundary-Tests schreiben**

Tests erzwingen UTC-ISO-Zeit, monoton nicht fallende Messwerte, namensraumbezogene IDs, kanonische UTF-8-Hashes und verbieten direkte Browser-Runtime-Aufrufe außerhalb `src/infrastructure/runtime/`.

- [ ] **Step 2: Contracts implementieren**

Verwende exakt die Signaturen aus Spezifikationsabschnitt 8. Erwartbare Fehler verlassen Modulgrenzen als `Result`; konkrete Browserfehler werden in stabile Codes übersetzt.

- [ ] **Step 3: Provider implementieren und testen**

Run: `npx vitest run tests/unit/runtime tests/contracts/no-direct-runtime-access.contract.test.ts`

Expected: feste Provider erzeugen wiederholbar identische Werte; Browserprovider sind auf Infrastructure begrenzt.

- [ ] **Step 4: Commit**

```bash
git add src/contracts/core src/contracts/runtime src/infrastructure/runtime tests/helpers/fixed-runtime.ts tests/unit/runtime tests/contracts/no-direct-runtime-access.contract.test.ts
git commit -m "feat: add deterministic core and runtime contracts"
```

**Acceptance:** Keine globale Zeit-, ID-, Hash-, Zufalls-, Locale- oder Zeitzonenquelle außerhalb des Runtime-Adapters.

**Rollback:** Commit revertieren; spätere Tasks dürfen vor grünem Provider-Gate nicht beginnen.

### Task 6: AppCore, Dispatcher, Event Bus und Feature-Flag-Snapshot

**Files:**
- Create: `src/core/app-core.ts`
- Create: `src/core/lifecycle.ts`
- Create: `src/core/registry.ts`
- Create: `src/core/command-dispatcher.ts`
- Create: `src/core/query-dispatcher.ts`
- Create: `src/core/event-bus.ts`
- Create: `src/application/view-models/feature-flags.ts`
- Test: `tests/unit/core/app-core.test.ts`
- Test: `tests/contracts/composition-root.contract.test.ts`

**Interfaces:**
- Consumes: Core- und Runtime-Contracts aus Task 5.
- Produces: injizierbare Handlerregistries, Lifecycle-Facade und tief unveränderlichen `FeatureFlagSnapshot`.

- [ ] **Step 1: Failing Lifecycle- und Composition-Tests schreiben**

Tests verlangen idempotentes Start/Stop, eindeutige Command-/Query-Typen, Eventreihenfolge und beweisen, dass `AppCore` keine konkrete Infrastructure importiert oder erzeugt.

- [ ] **Step 2: Minimalen Core implementieren**

`AppCore` akzeptiert alle Ports im Konstruktor, veröffentlicht nur Lifecycle- und Health-Informationen und kennt keine konkreten Plugins, Profile oder Repositories.

- [ ] **Step 3: Feature Flags fixieren**

Alle Bibliotheks- und Revision-UI-Flags sind `false`; `cloudSync` und `aiKnowledgeBase` sind literal `false`. Der Snapshot wird tief eingefroren.

- [ ] **Step 4: Tests und Commit**

Run: `npx vitest run tests/unit/core tests/contracts/composition-root.contract.test.ts`

```bash
git add src/core src/application/view-models/feature-flags.ts tests/unit/core tests/contracts/composition-root.contract.test.ts
git commit -m "feat: add AppCore lifecycle and dispatch infrastructure"
```

**Acceptance:** `bootstrap/` bleibt der einzige erlaubte vollständige Objektgraph; AppCore ist reine Facade.

**Rollback:** Core-Commit revertieren, ohne Task-5-Contracts zu verändern.

### Task 7: Pluginverträge, Manager und Capability-Graph

**Files:**
- Create: `src/contracts/plugins/plugin-manifest.ts`
- Create: `src/contracts/plugins/plugin-registrar.ts`
- Create: `src/plugins/plugin-manager.ts`
- Create: `src/plugins/capability-graph.ts`
- Create: `tests/fixtures/plugins/valid-prompt-provider.ts`
- Create: `tests/fixtures/plugins/invalid-engine-import.ts`
- Test: `tests/unit/plugins/plugin-manager.test.ts`
- Test: `tests/contracts/plugin-imports.contract.test.ts`

**Interfaces:**
- Produces: `PluginManifest`, `PromptStudioPlugin`, eingeschränkten `PluginRegistrar`, stabile topologische Capability-Reihenfolge und isolierte Fehlerzustände.

- [ ] **Step 1: Failing Pluginmatrix schreiben**

Prüfe doppelte IDs, ungültige SemVer/API-Version, fehlende Capability, doppelte exklusive Provider, Zyklen, required/optional Fehler und von Importreihenfolge unabhängige Sortierung.

- [ ] **Step 2: Contracts und Graph implementieren**

Plugins erhalten nur Registrar-Ports. Gleichstände im Graph werden lexikografisch nach Plugin-ID aufgelöst; optionale Fehler werden isoliert, erforderliche Fehler blockieren Promptgenerierung.

- [ ] **Step 3: Type-only Testplugin kompilieren**

Das gültige Fixture importiert `PromptSectionProvider` ausschließlich mit `import type`; das ungültige Fixture muss vom Boundary-Test abgewiesen werden.

- [ ] **Step 4: Tests und Commit**

Run: `npx vitest run tests/unit/plugins tests/contracts/plugin-imports.contract.test.ts`

```bash
git add src/contracts/plugins src/plugins tests/fixtures/plugins tests/unit/plugins tests/contracts/plugin-imports.contract.test.ts
git commit -m "feat: add isolated plugin and capability system"
```

**Acceptance:** Neue Capabilitys sind ohne Core-Änderung registrierbar; keine Laufzeitkante aus type-only Domain-Contracts.

**Rollback:** Plugin-Commit revertieren; AppCore bleibt lauffähig ohne konkrete Fachplugins.

### Task 8: Moduldiagnostik und tief eingefrorene globale Facade

**Files:**
- Create: `src/contracts/core/module-health.ts`
- Create: `src/diagnostics/diagnostic-registry.ts`
- Create: `src/diagnostics/benchmark-runner.ts`
- Create: `src/diagnostics/public-facade.ts`
- Create: `src/bootstrap/create-app.ts`
- Create: `src/bootstrap/install-diagnostics.ts`
- Modify: `src/bootstrap/index.ts`
- Test: `tests/unit/diagnostics/public-facade.test.ts`
- Test: `tests/contracts/global-state.contract.test.ts`

**Interfaces:**
- Consumes: AppCore, Plugin Manager, RuntimeEnvironment.
- Produces: `window.PromptStudioV600` mit ausschließlich Buildinfo, Health, Selbsttests, Benchmarks, Registry-Zusammenfassung und bereinigtem Diagnoseexport.

- [ ] **Step 1: Failing Deep-Freeze- und Datenschutztests schreiben**

Tests versuchen Mutationen auf jeder Ebene, prüfen fehlende Schreibmethoden und verbieten Projektinhalt, Prompttext, Blobdaten und Importpayloads in Berichten.

- [ ] **Step 2: Registry und Facade implementieren**

Alle Provider werden in `bootstrap/` injiziert. Die Facade liefert tiefe Kopien, wird rekursiv eingefroren und ist das einzige `window`-Anwendungsobjekt.

- [ ] **Step 3: Importgrenzen und Modulgraph prüfen**

Run:

```bash
npx vitest run tests/unit/diagnostics tests/contracts/global-state.contract.test.ts
node scripts/verify-module-boundaries.mjs
```

- [ ] **Step 4: Commit**

```bash
git add src/contracts/core/module-health.ts src/diagnostics src/bootstrap tests/unit/diagnostics tests/contracts/global-state.contract.test.ts
git commit -m "feat: add diagnostics registry and readonly global facade"
```

**Work-package B acceptance:** Core, Provider, Plugins, Diagnostik und einziger Composition Root bestehen Unit- und Contract-Gates; optionale Pluginfehler sind isoliert, required Fehler kontrolliert blockierend.

**Work-package B rollback:** Nur den ersten fehlerhaften B-Commit revertieren und alle abhängigen späteren B-Commits ebenfalls in umgekehrter Reihenfolge revertieren.

---

## Arbeitspaket C – IndexedDB, Repositories und Application Services

### Task 9: Storage-Contracts, Records, Mapper und Schema

**Files:**
- Create: `src/contracts/storage/store-names.ts`
- Create: `src/contracts/storage/records/project.ts`
- Create: `src/contracts/storage/records/project-revision.ts`
- Create: `src/contracts/storage/records/profile.ts`
- Create: `src/contracts/storage/records/library-records.ts`
- Create: `src/contracts/storage/records/generation-history.ts`
- Create: `src/contracts/storage/records/image-asset.ts`
- Create: `src/contracts/storage/records/tag.ts`
- Create: `src/contracts/storage/records/settings.ts`
- Create: `src/contracts/storage/records/trash.ts`
- Create: `src/contracts/storage/records/sync-queue.ts`
- Create: `src/contracts/storage/repositories/project.ts`
- Create: `src/contracts/storage/repositories/project-revision.ts`
- Create: `src/contracts/storage/repositories/profile.ts`
- Create: `src/contracts/storage/repositories/character.ts`
- Create: `src/contracts/storage/repositories/outfit.ts`
- Create: `src/contracts/storage/repositories/scene.ts`
- Create: `src/contracts/storage/repositories/prompt-template.ts`
- Create: `src/contracts/storage/repositories/generation-history.ts`
- Create: `src/contracts/storage/repositories/image-asset.ts`
- Create: `src/contracts/storage/repositories/tag.ts`
- Create: `src/contracts/storage/repositories/settings.ts`
- Create: `src/contracts/storage/repositories/trash.ts`
- Create: `src/contracts/storage/repositories/sync-queue.ts`
- Create: `src/contracts/storage/transaction.ts`
- Create: `src/contracts/storage/storage-errors.ts`
- Create: `src/domain/entities/project.ts`
- Create: `src/domain/entities/project-revision.ts`
- Create: `src/domain/entities/profile.ts`
- Create: `src/domain/entities/libraries.ts`
- Create: `src/domain/entities/generation-history.ts`
- Create: `src/domain/entities/image-asset.ts`
- Create: `src/domain/entities/tag.ts`
- Create: `src/domain/entities/settings.ts`
- Create: `src/domain/entities/trash-entry.ts`
- Create: `src/domain/entities/sync-operation.ts`
- Create: `src/application/mappers/project-mapper.ts`
- Create: `src/application/mappers/project-revision-mapper.ts`
- Create: `src/application/mappers/profile-mapper.ts`
- Create: `src/application/mappers/library-mappers.ts`
- Create: `src/application/mappers/generation-history-mapper.ts`
- Create: `src/application/mappers/image-asset-mapper.ts`
- Create: `src/application/mappers/tag-mapper.ts`
- Create: `src/application/mappers/settings-mapper.ts`
- Create: `src/application/mappers/trash-mapper.ts`
- Create: `src/application/mappers/sync-operation-mapper.ts`
- Create: `src/infrastructure/indexeddb/schema-v1.ts`
- Test: `tests/unit/mappers/record-roundtrip.test.ts`
- Test: `tests/contracts/storage-schema.contract.test.ts`

**Interfaces:**
- Produces: 13 Store-Namen, versionierte Persistence Records, Domain-Entitäten, reine Mapper und typisierte Transaktionsverträge.

- [ ] **Step 1: Failing Schema- und Roundtrip-Tests schreiben**

Tests verlangen exakt `Projects`, `ProjectRevisions`, `Profiles`, `Characters`, `Outfits`, `Scenes`, `PromptTemplates`, `GenerationHistory`, `ImageAssets`, `Tags`, `Settings`, `Trash`, `SyncQueue`, ihre Schlüsselpfade und Spezifikationsindizes.

- [ ] **Step 2: Records und Mapper implementieren**

Mapper sind synchron, rein, deterministisch und versioniert; sie greifen nicht auf IndexedDB oder Runtime-APIs zu. Ungültige Records ergeben stabile Validierungsfehler statt Teilentitäten.

- [ ] **Step 3: Schema-Definition implementieren**

`schema-v1.ts` enthält nur deklarative Store-/Indexdefinitionen. Kein Domain-Typ wird in Infrastructure importiert.

- [ ] **Step 4: Tests und Commit**

Run: `npx vitest run tests/unit/mappers tests/contracts/storage-schema.contract.test.ts`

```bash
git add src/contracts/storage src/domain/entities src/application/mappers src/infrastructure/indexeddb/schema-v1.ts tests/unit/mappers tests/contracts/storage-schema.contract.test.ts
git commit -m "feat: define V600 storage schema and persistence mappers"
```

**Acceptance:** Alle Records roundtrippen bytegleich bei kanonischer Serialisierung; keine Schichtengrenze ist verletzt.

**Rollback:** Schema-/Mapper-Commit revertieren, bevor eine echte V600-Datenbank erzeugt wird.

### Task 10: IndexedDB-Adapter, Transaktionen und Repositories

**Files:**
- Create: `src/infrastructure/indexeddb/indexeddb-adapter.ts`
- Create: `src/infrastructure/indexeddb/transaction-runner.ts`
- Create: `src/infrastructure/indexeddb/error-mapper.ts`
- Create: `src/infrastructure/indexeddb/repositories/project.ts`
- Create: `src/infrastructure/indexeddb/repositories/project-revision.ts`
- Create: `src/infrastructure/indexeddb/repositories/profile.ts`
- Create: `src/infrastructure/indexeddb/repositories/character.ts`
- Create: `src/infrastructure/indexeddb/repositories/outfit.ts`
- Create: `src/infrastructure/indexeddb/repositories/scene.ts`
- Create: `src/infrastructure/indexeddb/repositories/prompt-template.ts`
- Create: `src/infrastructure/indexeddb/repositories/generation-history.ts`
- Create: `src/infrastructure/indexeddb/repositories/image-asset.ts`
- Create: `src/infrastructure/indexeddb/repositories/tag.ts`
- Create: `src/infrastructure/indexeddb/repositories/settings.ts`
- Create: `src/infrastructure/indexeddb/repositories/trash.ts`
- Create: `src/infrastructure/indexeddb/repositories/sync-queue.ts`
- Create: `tests/helpers/indexeddb-harness.ts`
- Test: `tests/integration/indexeddb/repositories.test.ts`
- Test: `tests/integration/indexeddb/transactions.test.ts`
- Test: `tests/browser/indexeddb-real.spec.ts`

**Interfaces:**
- Consumes: Storage-Ports und Schema aus Task 9.
- Produces: konkrete Adapter für alle Repository-Ports und atomare Multi-Store-Transaktionen.

- [ ] **Step 1: Failing Repository-Contract-Suite schreiben**

Eine gemeinsame Suite läuft gegen fake-indexeddb und realen Browser und prüft CRUD, Indizes, Transaktionsrollback, ConstraintError, QuotaError, VersionError und geschlossene Datenbankverbindungen.

- [ ] **Step 2: Adapter und Fehlerübersetzung implementieren**

Konkrete DOMException-Objekte verlassen Infrastructure nie. Die Transaktionsfunktion committed erst nach erfolgreichem Abschluss aller Requests und liefert bei Abort einen stabilen `StorageError`.

- [ ] **Step 3: Alle 13 Repositories implementieren**

Repository-Code validiert Persistence Records, enthält aber keine Domain-Regeln. ImageAsset-Deduplizierung nutzt den injizierten Hashwert aus dem Record.

- [ ] **Step 4: Fake- und Real-Browser-Tests**

Run:

```bash
npx vitest run tests/integration/indexeddb
npx playwright test tests/browser/indexeddb-real.spec.ts --project=chromium
npx playwright test tests/browser/indexeddb-real.spec.ts --project=webkit
```

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/indexeddb tests/helpers/indexeddb-harness.ts tests/integration/indexeddb tests/browser/indexeddb-real.spec.ts
git commit -m "feat: implement transactional IndexedDB repositories"
```

**Acceptance:** Gleiche Repository-Suite besteht in fake-indexeddb, Chromium und WebKit; Multi-Store-Fehler hinterlassen keinen Teilcommit.

**Rollback:** Adapter-Commit revertieren; Testdatenbanken verwenden einen Task-spezifischen Namen und werden nicht mit Nutzerdaten vermischt.

### Task 11: Project Service, Autosave, Revisionen, Papierkorb und „Neu“

**Files:**
- Create: `src/application/services/project-service.ts`
- Create: `src/application/services/autosave-service.ts`
- Create: `src/application/services/revision-service.ts`
- Create: `src/application/commands/project-commands.ts`
- Create: `src/application/queries/project-queries.ts`
- Create: `src/domain/entities/project-factory.ts`
- Test: `tests/unit/application/project-service.test.ts`
- Test: `tests/integration/application/create-new-project.test.ts`
- Test: `tests/integration/application/autosave-recovery.test.ts`
- Test: `tests/integration/application/trash-duplicate.test.ts`

**Interfaces:**
- Produces: Create/load/update/duplicate/soft-delete/restore, 750-ms-Autosave, Flush, Revisionen und serialisierten `CreateNewProjectCommand`.

- [ ] **Step 1: Failing „Neu“-Zustandsmatrix schreiben**

Prüfe Abbruch, erfolgreicher Flush, Flushfehler, Commitfehler, Doppelklick, fehlendes IndexedDB und Ereignisreihenfolge. Erfolg muss altes Projekt bewahren und neues Projekt + erste `create`-Revision + aktiven Settings-Verweis in einer Transaktion anlegen.

- [ ] **Step 2: Project Factory und Service minimal implementieren**

IDs/Zeitstempel kommen aus dem Runtime-Snapshot. Der Standardzustand wird als versionierte Factory definiert und enthält keine Werte oder IDs des alten Projekts.

- [ ] **Step 3: Autosave und Revisionen implementieren**

Debounce 750 ms; sofortiger Flush vor Navigation, Import, Export, `visibilitychange` und Stop. Revision bei Import, Migration, Restore, Meilenstein und spätestens nach fünf Minuten aktiver Änderungen.

- [ ] **Step 4: Papierkorb und Duplikation implementieren**

Soft Delete verschiebt vollständig nach `Trash`. Duplikation erzeugt neue Projekt-/Revisions-IDs, Suffix „Kopie“, erste `duplicate`-Revision und wiederverwendete Assetreferenzen.

- [ ] **Step 5: Testmatrix und Commit**

Run: `npx vitest run tests/unit/application/project-service.test.ts tests/integration/application`

```bash
git add src/application/services src/application/commands src/application/queries src/domain/entities/project-factory.ts tests/unit/application/project-service.test.ts tests/integration/application
git commit -m "feat: add transactional project lifecycle and autosave"
```

**Acceptance:** Kein Pfad überschreibt das alte Projekt oder publiziert Events vor Commit; Recovery behält den letzten bestätigten Stand.

**Rollback:** Commit revertieren; vorhandene V500-Daten werden nie angefasst, V600-Testdatenbanken können über ihren isolierten Testnamen verworfen werden.

### Task 12: Settings, Migration, Import/Export und deaktivierter Sync

**Files:**
- Create: `src/application/services/settings-service.ts`
- Create: `src/application/services/migration-service.ts`
- Create: `src/application/services/export-service.ts`
- Create: `src/contracts/storage/sync.ts`
- Create: `src/infrastructure/sync/local-sync-adapter.ts`
- Create: `src/application/migrations/v500-storage-keys.ts`
- Create: `src/application/migrations/v500-to-v600.ts`
- Create: `src/application/migrations/v600-records.ts`
- Test: `tests/integration/migration/v500-browser-state.test.ts`
- Test: `tests/integration/migration/import-export-roundtrip.test.ts`
- Test: `tests/integration/migration/corrupt-and-oversize.test.ts`
- Test: `tests/contracts/no-cloud-sync.contract.test.ts`

**Interfaces:**
- Produces: idempotentes Migration Ledger, V500-2-MiB- und V600-10-MiB-Limits, deterministischen Export und nur lokalen Sync-Adapter.

- [ ] **Step 1: Failing Migration-Fixtures schreiben**

Fixtures decken den aktuellen V500-Schlüssel, bekannte ältere Schlüssel, identische Wiederholung, beschädigtes JSON, falsche Signatur, Übergröße, ID-Kollision und nicht unterstützte Binärassets ab.

- [ ] **Step 2: Migrationskette implementieren**

Lies V500-`localStorage` nur lesend, wähle den jüngsten gültigen Zustand, migriere in Memory und schreibe Projekt, erste Revision, Settings-Ledger und Bericht atomar. Fingerprint ist SHA-256 der unveränderten Eingabebytes.

- [ ] **Step 3: Import/Export implementieren**

Export verwendet kanonische Feldreihenfolge, Manifestversion, LF-Zeilenenden und Prüfsummen. Eingebettete Binärassets ergeben `IMPORT_ASSET_BUNDLE_UNSUPPORTED`, ohne Datenänderung.

- [ ] **Step 4: Sync deaktiviert absichern**

Es existieren Local-Adapter, Port und SyncQueue-Repository; kein Cloud-Adapter wird erzeugt oder in `bootstrap/` importiert. `cloudSync` bleibt literal `false`.

- [ ] **Step 5: Tests und Commit**

Run:

```bash
npx vitest run tests/integration/migration tests/contracts/no-cloud-sync.contract.test.ts
node scripts/verify-module-boundaries.mjs
```

```bash
git add src/application/services/settings-service.ts src/application/services/migration-service.ts src/application/services/export-service.ts src/application/migrations src/contracts/storage/sync.ts src/infrastructure/sync tests/integration/migration tests/contracts/no-cloud-sync.contract.test.ts
git commit -m "feat: add migration export and disabled sync foundation"
```

**Work-package C acceptance:** Alle Store-, Repository-, Transaktions-, Autosave-, Recovery-, „Neu“-, Migration-, Import-/Export- und Sync-Deaktivierungstests bestehen in Fake und realen Browsern; V500-Einträge bleiben bytegleich.

**Work-package C rollback:** Services in umgekehrter Commitreihenfolge revertieren. Niemals Nutzer- oder Referenzdaten löschen; Schemafehler führen in den Recovery-Modus.

---

## Arbeitspaket D – Constraint Engine, Resolved State und Prompt-Pipeline

### Task 13: Domain-Contracts, Constraint Engine und Resolved State

**Files:**
- Create: `src/domain/contracts/resolved-state/facts.ts`
- Create: `src/domain/contracts/resolved-state/resolution-trace.ts`
- Create: `src/domain/contracts/resolved-state/resolved-state.ts`
- Create: `src/domain/contracts/constraints/rule.ts`
- Create: `src/domain/contracts/constraints/provider.ts`
- Create: `src/domain/contracts/constraints/phases.ts`
- Create: `src/domain/engines/constraint-engine.ts`
- Create: `src/domain/engines/resolved-state-builder.ts`
- Create: `src/domain/engines/resolution-trace.ts`
- Test: `tests/unit/domain/constraint-engine.test.ts`
- Test: `tests/unit/domain/resolved-state.test.ts`
- Test: `tests/contracts/single-rule-source.contract.test.ts`

**Interfaces:**
- Produces: normalisierte Facts, versionierte Regeln, Konfliktauflösung, tief eingefrorenen `ResolvedState`, vollständige Trace und deterministischen State-Hash.

- [ ] **Step 1: Failing Invarianten- und Konflikttests schreiben**

Jeder nicht literale Wert braucht Quellfeld, Regel-ID und Plugin-Version. Regelreihenfolge erfolgt über benannte Phasen; direkte Regeln in Profilen, Renderern oder UI müssen vom Contract-Test gefunden werden.

- [ ] **Step 2: Engine-Pipeline implementieren**

Implementiere exakt `Normalize -> Facts -> Regeln -> Konflikte -> Modellverhalten -> validieren -> tief einfrieren`. Engines erhalten keine anderen Engine-Instanzen, sondern nur Contracts und Eingaben.

- [ ] **Step 3: Hash und Determinismus testen**

Gleiche Eingabe und Runtime-Snapshot ergeben bytegleichen State und Hash; Registrierungsreihenfolge darf das Ergebnis nicht ändern.

- [ ] **Step 4: Commit**

```bash
git add src/domain/contracts/resolved-state src/domain/contracts/constraints src/domain/engines tests/unit/domain tests/contracts/single-rule-source.contract.test.ts
git commit -m "feat: add authoritative constraint and resolved state pipeline"
```

**Acceptance:** Constraint Engine ist nachweislich einzige Regelquelle; jeder Wert ist tracebar.

**Rollback:** Engine-Commit revertieren; Golden Master bleiben unverändert und dienen beim Neuversuch als Gate.

### Task 14: Fachplugins für V500.6.11-Verhalten

**Files:**
- Create: `src/plugins/character-sheet/plugin.ts`, `rules.ts`, `sections.ts`
- Create: `src/plugins/adaptive-realism/plugin.ts`, `rules.ts`, `sections.ts`
- Create: `src/plugins/material-physics/plugin.ts`, `rules.ts`, `sections.ts`
- Create: `src/plugins/camera/plugin.ts`, `rules.ts`, `sections.ts`
- Create: `src/plugins/selfie/plugin.ts`, `rules.ts`, `sections.ts`
- Create: `src/plugins/additional-person/plugin.ts`, `rules.ts`, `sections.ts`
- Create: `src/plugins/brand/plugin.ts`, `rules.ts`, `sections.ts`
- Create: `src/plugins/garment/plugin.ts`, `rules.ts`, `sections.ts`
- Create: `src/plugins/safety/plugin.ts`, `rules.ts`, `sections.ts`
- Create: `src/plugins/model-behaviour/plugin.ts`, `rules.ts`, `sections.ts`
- Test: `tests/unit/plugins/domain/character-sheet.test.ts`
- Test: `tests/unit/plugins/domain/realism-material.test.ts`
- Test: `tests/unit/plugins/domain/camera-selfie.test.ts`
- Test: `tests/unit/plugins/domain/additional-person.test.ts`
- Test: `tests/unit/plugins/domain/brand-garment-safety.test.ts`
- Test: `tests/unit/plugins/domain/model-behaviour.test.ts`
- Test: `tests/integration/domain/v500-rule-parity.test.ts`

**Interfaces:**
- Consumes: Constraint- und Plugin-Registrar-Contracts.
- Produces: Facts, Regeln, Diagnoseprovider und später nutzbare PromptSectionProvider je Fachplugin.

- [ ] **Step 1: Paritätsfälle aus Golden Master als failing Tests parametrisieren**

Die Matrix muss Selfie Binding, Additional Person, Open Garment State, Upper-Layer Contract, Material Physics, Adaptive Realism/Reference, Kamera, Licht, Branding, Safety, Character Sheet, Quality Gate und modellabhängiges Verhalten abdecken.

- [ ] **Step 2: Plugins in fachlicher Reihenfolge implementieren**

Implementiere pro Plugin Manifest, ConstraintProvider, stabile Regel-IDs, Diagnose und Unit-Tests. Kein Plugin importiert ein anderes Plugin oder eine Engine.

- [ ] **Step 3: Konflikt- und Trace-Parität prüfen**

Run: `npx vitest run tests/unit/plugins/domain tests/integration/domain/v500-rule-parity.test.ts`

Expected: alle referenzierten V500-Szenarien ergeben gleiche Freigaben, Blockierungen und tracebare Werte.

- [ ] **Step 4: Commit**

```bash
git add src/plugins tests/unit/plugins/domain tests/integration/domain/v500-rule-parity.test.ts
git commit -m "feat: port V500.6.11 behavior into constraint plugins"
```

**Acceptance:** Keine Fachregel liegt außerhalb Constraint-Providern; Referenzschulden werden nicht repliziert.

**Rollback:** Fachplugin-Commit revertieren; Constraint-Core bleibt separat testbar.

### Task 15: PromptDocument, AST-Builder und generische Renderer

**Files:**
- Create: `src/domain/contracts/prompt/prompt-document.ts`
- Create: `src/domain/contracts/prompt/providers.ts`
- Create: `src/domain/contracts/prompt/layout.ts`
- Create: `src/domain/engines/prompt-ast-builder.ts`
- Create: `src/renderers/text-renderer.ts`
- Create: `src/renderers/json-renderer.ts`
- Create: `src/application/services/prompt-service.ts`
- Test: `tests/unit/domain/prompt-ast-builder.test.ts`
- Test: `tests/unit/renderers/text-renderer.test.ts`
- Test: `tests/unit/renderers/json-renderer.test.ts`
- Test: `tests/contracts/prompt-pipeline.contract.test.ts`

**Interfaces:**
- Produces: vollständige Spec-Signaturen für `PromptDocument`, `PromptSectionDraft`, `PromptSectionProvider`, `ProfileLayout`, Renderer und `PromptResult`.

- [ ] **Step 1: Failing AST-Invarianten schreiben**

Prüfe Slot-ID-Muster, doppelte Plugin-/Slot-Kombinationen, sourcePluginId-Gleichheit, kanonische Provider- und Draft-Sortierung, stabile IDs, lückenlose nullbasierte Order, Trace-Abdeckung, gültige JSON-Werte und tiefe Unveränderlichkeit.

- [ ] **Step 2: AST-Builder implementieren**

Dokument-ID stammt deterministisch aus AST-Version und State-Hash; Abschnitts-ID aus AST-Version, Plugin-ID und Slot-ID. Weder Zufall noch IdGenerator werden benutzt.

- [ ] **Step 3: Renderer implementieren**

TextRenderer verkettet nur Layoutabschnitte. JsonRenderer erzeugt kanonisches JSON und garantiert `JSON.parse(serialized)` strukturell gleich `value`. Kein Renderer ergänzt Werte oder Defaults.

- [ ] **Step 4: Contract-Tests und Commit**

Run: `npx vitest run tests/unit/domain/prompt-ast-builder.test.ts tests/unit/renderers tests/contracts/prompt-pipeline.contract.test.ts`

```bash
git add src/domain/contracts/prompt src/domain/engines/prompt-ast-builder.ts src/renderers src/application/services/prompt-service.ts tests/unit/domain/prompt-ast-builder.test.ts tests/unit/renderers tests/contracts/prompt-pipeline.contract.test.ts
git commit -m "feat: add canonical prompt AST and generic renderers"
```

**Acceptance:** Pipeline ist ausschließlich `ResolvedState -> PromptDocument -> ProfileLayout -> Renderer -> PromptResult`.

**Rollback:** AST-/Renderer-Commit revertieren; Constraint-Plugins bleiben unabhängig.

### Task 16: Neun Profilstrategien und vollständige Promptparität

**Files:**
- Create: `src/profiles/profile-ids.ts`
- Create: `src/profiles/universal.ts`
- Create: `src/profiles/gemini-natural.ts`
- Create: `src/profiles/gemini-pro.ts`
- Create: `src/profiles/nano-banana-pro.ts`
- Create: `src/profiles/gpt-image-2.ts`
- Create: `src/profiles/flux.ts`
- Create: `src/profiles/sdxl.ts`
- Create: `src/profiles/standard-json.ts`
- Create: `src/profiles/safe-json.ts`
- Create: `src/renderers/schemas/standard-json.schema.ts`
- Create: `src/renderers/schemas/safe-json.schema.ts`
- Test: `tests/golden/v600-parity.test.ts`
- Test: `tests/integration/prompt/profile-matrix.test.ts`

**Interfaces:**
- Consumes: unveränderliches PromptDocument.
- Produces: neun reine Layoutstrategien ohne Regeln und beide JSON-Schemas.

- [ ] **Step 1: Golden-Master-Tests gegen leere Strategien rot ausführen**

Run: `npx vitest run tests/golden/v600-parity.test.ts tests/integration/prompt/profile-matrix.test.ts`

Expected: alle noch nicht implementierten Profile werden eindeutig gemeldet.

- [ ] **Step 2: Profile einzeln implementieren**

Jede Strategie selektiert nur freigegebene AST-Sektionen, deklariert Reihenfolge, Überschriften und Ausgabeformat. Nach jedem Profil laufen dessen 24 Szenarien, bevor das nächste beginnt.

- [ ] **Step 3: JSON und Sprachintegrität prüfen**

Standard JSON und Safe JSON werden in Deutsch und Englisch geparst und schemavalidiert. Natürlichsprachige Prüfungen laufen nur über sprachtragende Felder; das 12.047-Zeichen-Spezialszenario verwendet sein freigegebenes 12.100-Gate.

- [ ] **Step 4: Volle Matrix und Commit**

Run:

```bash
npx vitest run tests/golden/v600-parity.test.ts
npx vitest run tests/integration/prompt/profile-matrix.test.ts
```

Expected: 216/216 Profilkombinationen, null Laufzeitfehler, alle Golden Master bytegleich.

```bash
git add src/profiles src/renderers/schemas tests/golden/v600-parity.test.ts tests/integration/prompt/profile-matrix.test.ts
git commit -m "feat: add nine V500-compatible prompt profiles"
```

**Work-package D acceptance:** Alle Constraint-, AST-, Renderer-, JSON-, Golden-Master- und 24-mal-9-Tests bestehen; Profile enthalten keine Fachregeln.

**Work-package D rollback:** Das zuletzt eingeführte Profil oder Fachplugin per Revert entfernen; Golden Master niemals an eine unbegründete Abweichung anpassen.

---

## Arbeitspaket E – V500-kompatible Wizard-Oberfläche

### Task 17: DOM-, CSS- und visuelle Wizard-Basis

**Files:**
- Modify: `src/ui/shell.html`
- Modify: `src/ui/styles.css`
- Create: `src/ui/wizard/wizard-view.ts`
- Create: `src/ui/wizard/steps.ts`
- Create: `src/ui/dom/dom-ids.ts`
- Create: `tests/browser/wizard-visual.spec.ts`
- Create: `tests/browser/fixtures/v500.6.11-screenshots/wizard-desktop.png`
- Create: `tests/browser/fixtures/v500.6.11-screenshots/wizard-mobile.png`
- Create: `tests/browser/fixtures/v500.6.11-screenshots/dialogs-and-output.png`
- Test: `tests/contracts/dom-integrity.contract.test.ts`

**Interfaces:**
- Produces: zehnstufiges, V500-kompatibles DOM mit eindeutigen IDs und reiner Renderfunktion.

- [ ] **Step 1: Referenzscreenshots und DOM-Vertrag erfassen**

Erfasse Desktop und Mobile für alle zehn Schritte, Profilwahl, Promptausgabe, Diagnose und Bestätigungsdialog mit stabiler Viewport-/Fontkonfiguration.

- [ ] **Step 2: Failing DOM- und Visual-Tests schreiben**

Tests erwarten zehn Schritte, V500-Bezeichnungen/-Reihenfolge, eindeutige IDs, keine Phase-2-Navigation und definierte visuelle Schwellenwerte.

- [ ] **Step 3: Shell, Styles und statischen View portieren**

Übernimm sichtbare Gestaltung, nicht die V500-Produktionslogik. Korrigiere V500.6.10-Versionsanzeigen und statische ID-Duplikate; verwende keine externen Fonts oder Assets.

- [ ] **Step 4: Chromium/WebKit visuell prüfen und committen**

Run:

```bash
npx playwright test tests/browser/wizard-visual.spec.ts --project=chromium
npx playwright test tests/browser/wizard-visual.spec.ts --project=webkit
npx vitest run tests/contracts/dom-integrity.contract.test.ts
```

```bash
git add src/ui tests/browser/wizard-visual.spec.ts tests/browser/fixtures/v500.6.11-screenshots tests/contracts/dom-integrity.contract.test.ts
git commit -m "feat: port V500-compatible ten-step wizard shell"
```

**Acceptance:** Zehn Schritte, Labels, Reihenfolge, Responsive-Verhalten und zulässige visuelle Parität; keine bekannte Referenzschuld wurde übernommen.

**Rollback:** UI-Commit revertieren; Domain und Services bleiben headless testbar.

### Task 18: ViewModels, Commands, Navigation und Promptausgabe

**Files:**
- Create: `src/application/view-models/wizard-view-model.ts`
- Create: `src/application/mappers/wizard-view-model-mapper.ts`
- Create: `src/ui/wizard/wizard-controller.ts`
- Create: `src/ui/wizard/event-bindings.ts`
- Create: `src/ui/wizard/focus-manager.ts`
- Modify: `src/bootstrap/create-app.ts`
- Test: `tests/unit/ui/wizard-view-model.test.ts`
- Test: `tests/browser/wizard-navigation.spec.ts`
- Test: `tests/contracts/ui-model-isolation.contract.test.ts`

**Interfaces:**
- Consumes: Commands/Queries und tief unveränderliches WizardViewModel.
- Produces: Event Delegation, sichere Navigation, Zustandserhalt und Promptanzeige ohne Domain-/Profilwissen in der UI.

- [ ] **Step 1: Failing ViewModel- und Isolationstests schreiben**

UI darf keine Project-Entität, Persistence Records, Engine oder Profilverzweigung importieren. ViewModel enthält opake Profil-IDs, Labels, Felder, Status und freigegebene Aktionen.

- [ ] **Step 2: Mapper und Controller implementieren**

Der Controller dispatcht `UpdateProjectFieldCommand`, `CreateNewProjectCommand`, Navigation, Import, Export und Promptquery. Nach jeder Mutation wird neu queried und gerendert.

- [ ] **Step 3: Fokus und „Neu“-Interaktion anbinden**

Bestätigungsdialog, Abbruch, Busy-Zustand, Doppelauslösung und Rückkehrfokus entsprechen V500; sichtbarer Wechsel erfolgt erst nach erfolgreichem Commit.

- [ ] **Step 4: Browsermatrix und Commit**

Run:

```bash
npx vitest run tests/unit/ui tests/contracts/ui-model-isolation.contract.test.ts
npx playwright test tests/browser/wizard-navigation.spec.ts
```

```bash
git add src/application/view-models/wizard-view-model.ts src/application/mappers/wizard-view-model-mapper.ts src/ui/wizard src/bootstrap/create-app.ts tests/unit/ui tests/browser/wizard-navigation.spec.ts tests/contracts/ui-model-isolation.contract.test.ts
git commit -m "feat: connect wizard through immutable view models"
```

**Acceptance:** Alle zehn Schritte funktionieren vorwärts/rückwärts, Promptausgabe bleibt profilgleich, UI besitzt keine Modellkenntnis.

**Rollback:** Controller-/ViewModel-Commit revertieren; statische UI aus Task 17 bleibt testbar.

### Task 19: Import/Export, Autosave-Status, Accessibility und Phase-2-Sperre

**Files:**
- Create: `src/ui/status/save-status-view.ts`
- Create: `src/ui/dialogs/import-dialog.ts`
- Create: `src/ui/dialogs/export-dialog.ts`
- Create: `src/ui/dialogs/recovery-dialog.ts`
- Create: `src/ui/accessibility/live-region.ts`
- Test: `tests/browser/import-export.spec.ts`
- Test: `tests/browser/accessibility.spec.ts`
- Test: `tests/browser/mobile.spec.ts`
- Test: `tests/contracts/phase2-disabled.contract.test.ts`
- Create: `docs/reports/phase1-iphone-viewer.md`

**Interfaces:**
- Consumes: Application-Resultate und FeatureFlagSnapshot.
- Produces: sichtbare Save-/Recovery-Fehler, lokale Dateiimporte/-exporte, Tastatur- und Mobile-Parität.

- [ ] **Step 1: Failing Browser- und Accessibility-Tests schreiben**

Prüfe Tastaturpfade, Fokusfalle/-rückgabe, Status-Live-Region, Touchziele, kleine Viewports, Dateigrößenfehler, Recovery ohne IndexedDB und lokale Downloads.

- [ ] **Step 2: Dialoge und Statusviews implementieren**

Fehler zeigen bereinigte UserMessages; technische IndexedDB-Objekte bleiben verborgen. Objekt-URLs werden nach Download widerrufen.

- [ ] **Step 3: Phase-2-Sperre beweisen**

Contract-Test verbietet Dashboard, sichtbare Bibliotheken, Revisions-UI, Cloud- und AI-Aktivierung in DOM, Flags, Importen und Bootstrapgraph.

- [ ] **Step 4: Physisches iPhone-Viewer-Gate ausführen**

Übertrage ausschließlich das gebaute Single-HTML-Artefakt per lokaler Datei auf ein physisches iPhone, öffne es in Safari und einem installierten HTML Viewer und prüfe App-Start, zehn Wizard-Schritte, „Neu“-Dialog, Profile, Promptausgabe, Import/Export sowie Fokus nach Dialogschluss. Dokumentiere Gerätemodell, iOS-Version, Viewer-Version, Ergebnis und Screenshots in `docs/reports/phase1-iphone-viewer.md`. Ist kein physisches Gerät verfügbar oder schlägt ein Pfad fehl, bleibt Arbeitspaket E blockiert.

- [ ] **Step 5: Browsertests, 216er Regression und Commit**

Run:

```bash
npx playwright test tests/browser/import-export.spec.ts tests/browser/accessibility.spec.ts tests/browser/mobile.spec.ts
npx vitest run tests/contracts/phase2-disabled.contract.test.ts
npx vitest run tests/golden/v600-parity.test.ts tests/integration/prompt/profile-matrix.test.ts
```

```bash
git add src/ui/status src/ui/dialogs src/ui/accessibility tests/browser/import-export.spec.ts tests/browser/accessibility.spec.ts tests/browser/mobile.spec.ts tests/contracts/phase2-disabled.contract.test.ts docs/reports/phase1-iphone-viewer.md
git commit -m "feat: complete accessible V500-compatible wizard workflows"
```

**Work-package E acceptance:** Funktionale, DOM- und visuelle Wizard-Parität in Chromium/WebKit; Import, Export, Autosave, Recovery, Tastatur und Mobile funktionieren; Phase 2 bleibt vollständig deaktiviert.

**Work-package E rollback:** Den kleinsten fehlerhaften UI-Commit revertieren; keine Domain- oder Storage-Golden-Master ändern.

---

## Arbeitspaket F – Regression, Performance, Migration und Release

### Task 20: Vollständige automatisierte Release-Matrix

**Files:**
- Create: `scripts/run-release-tests.mjs`
- Create: `tests/browser/file-protocol.spec.ts`
- Create: `tests/browser/localhost.spec.ts`
- Create: `tests/browser/no-network.spec.ts`
- Create: `tests/browser/csp.spec.ts`
- Create: `tests/browser/migration-recovery.spec.ts`
- Create: `docs/reports/phase1-test-protocol.md`

**Interfaces:**
- Consumes: alle Testgruppen A–E.
- Produces: maschinenlesbare Resultate je Prüfgruppe und ein generiertes Testprotokoll mit Anzahl bestanden/fehlgeschlagen.

- [ ] **Step 1: Release-Runner definieren**

Der Runner führt TypeScript, Unit, Contract, Repository, fake-indexeddb, reale Browser-IndexedDB, Chromium, WebKit, Golden Master, 216er Matrix, Visual, CSP, No-Network, `file://`, localhost, Migration, Recovery und statische Integrität aus. Er beendet beim ersten infrastrukturellen Fehler, sammelt aber alle fachlichen Testfehler derselben Suite.

- [ ] **Step 2: Protokolltests rot ausführen**

Der Metatest verlangt für jede der 26 Spezifikationsprüfgruppen mindestens einen konkreten Testbefehl und verbietet ausgelassene oder als übersprungen markierte Pflichtgruppen.

- [ ] **Step 3: Browserprotokolltests implementieren**

No-Network fängt `request`, WebSocket, EventSource und Worker-Netzwerk ab. `file://` lädt das reale Artefakt direkt; localhost verwendet einen kurzlebigen Loopback-Server ohne externe Requests.

- [ ] **Step 4: Volle Matrix ausführen**

Run: `node scripts/run-release-tests.mjs`

Expected: alle 26 Prüfgruppen grün, null Pflicht-Skips.

- [ ] **Step 5: Commit**

```bash
git add scripts/run-release-tests.mjs tests/browser/file-protocol.spec.ts tests/browser/localhost.spec.ts tests/browser/no-network.spec.ts tests/browser/csp.spec.ts tests/browser/migration-recovery.spec.ts docs/reports/phase1-test-protocol.md
git commit -m "test: add complete V600 phase 1 release matrix"
```

**Acceptance:** Tatsächliche Ausgaben belegen jede Pflichtgruppe; Testzahlen werden aus Reportergebnissen erzeugt, nicht manuell behauptet.

**Rollback:** Release-Runner-Commit revertieren; keine fehlschlagende Pflichtgruppe durch Skip oder gelockertes Gate umgehen.

### Task 21: Performance-, Bundle- und Reproduzierbarkeitsgates

**Files:**
- Create: `tests/performance/phase1-budgets.spec.ts`
- Create: `scripts/measure-bundle.mjs`
- Create: `scripts/verify-reproducible-build.mjs`
- Create: `docs/reports/phase1-performance.md`

**Interfaces:**
- Produces: p95-Messungen auf M3 Max, Bundlebytezahl, esbuild-Metafile-Analyse und Doppelbuild-Hashvergleich.

- [ ] **Step 1: Failing Budgettests schreiben**

Fixtures verwenden repräsentative Projekte ohne Bildassets und messen 30 Warmdurchläufe nach 5 Aufwärmläufen mit injizierter MonotonicClock.

- [ ] **Step 2: Mess- und Reproduzierbarkeitsskripte implementieren**

Bundlelimit ist 1.572.864 Byte. Zwei saubere Builds mit identischem `SOURCE_DATE_EPOCH` müssen denselben SHA-256 liefern; Buildmetadaten dürfen keine aktuelle Uhrzeit enthalten.

- [ ] **Step 3: Budgets messen**

Run:

```bash
npx playwright test tests/performance/phase1-budgets.spec.ts --project=chromium
node scripts/measure-bundle.mjs
node scripts/verify-reproducible-build.mjs
```

Expected: alle sechs Spezifikationsbudgets innerhalb Grenze, Bundle < 1,5 MiB, Doppelbuild bytegleich.

- [ ] **Step 4: Commit**

```bash
git add tests/performance scripts/measure-bundle.mjs scripts/verify-reproducible-build.mjs docs/reports/phase1-performance.md
git commit -m "test: enforce V600 phase 1 performance budgets"
```

**Acceptance:** Bericht enthält p50/p95, Stichprobe, Browser, Fixture, Hardware, Bundlegröße und Hash.

**Rollback:** Performance-Commit revertieren ist nur zur Korrektur des Messharness erlaubt; Budgets werden nicht ohne neue Architekturfreigabe erhöht.

### Task 22: Releaseartefakt, Berichte und Phase-1-Abnahme

**Files:**
- Create: `dist/Prompt-Studio-V600.0.0-Phase1-Foundation.html`
- Create: `dist/Prompt-Studio-V600.0.0-Phase1-Foundation.sha256`
- Create: `docs/reports/phase1-verification-report.md`
- Create: `docs/reports/phase1-changelog.md`
- Create: `docs/architecture/phase1-overview.md`
- Create: `docs/modules/phase1-modules.md`
- Create: `docs/reports/phase1-migration-report.md`
- Create: `docs/reports/phase1-risk-register.md`
- Create: `docs/reports/phase1-acceptance.md`
- Create: `docs/reports/phase1-hash-list.sha256`
- Create: `docs/reports/phase2-improvements-after-phase1.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: grüne Resultate aller Tasks und generierte Messdaten.
- Produces: vollständigen Phase-1-Lieferumfang und eine belegte Releaseentscheidung.

- [ ] **Step 1: Sauberen Produktionsbuild erzeugen**

Run:

```bash
npm ci
npm run typecheck
node scripts/run-release-tests.mjs
npm run build
npm run verify:artifact
```

Expected: alle Befehle Exit 0 und keine uncommitteten Quelländerungen.

- [ ] **Step 2: Artefakt hashen und Metadaten prüfen**

Run:

```bash
shasum -a 256 dist/Prompt-Studio-V600.0.0-Phase1-Foundation.html
wc -c dist/Prompt-Studio-V600.0.0-Phase1-Foundation.html
node scripts/verify-source-integrity.mjs --release
node scripts/verify-csp.mjs dist/Prompt-Studio-V600.0.0-Phase1-Foundation.html
```

Die Artefakt-`.sha256`-Datei enthält exakt Hash, zwei Leerzeichen und Artefaktname plus LF. `docs/reports/phase1-hash-list.sha256` enthält zusätzlich sortierte Hashes des Artefakts, der Referenzmanifeste, Golden-Master-Matrix und aller finalen Berichte.

- [ ] **Step 3: Berichte aus tatsächlichen Resultaten erstellen**

Prüfbericht und Abnahmebericht listen jeden Befehl, Exit-Code, Testanzahl, Golden-Master-Ergebnis, 216er Matrix, Browser, physischen iPhone-Viewer, `file://`, localhost, CSP, No-Network, Migration, Recovery, Performance, Bundle und bekannte Restprobleme. Der Changelog nennt die korrigierten V500.6.11-Referenzschulden. Architektur- und Moduldokumentation beschreiben alle öffentlichen Contracts und Diagnoseversionen. `phase2-improvements-after-phase1.md` enthält ausschließlich Empfehlungen aus nachgewiesenen Phase-1-Erfahrungen und aktiviert oder implementiert keine Phase-2-Funktion.

- [ ] **Step 4: Release-Gate wiederholen**

Run:

```bash
git diff --check
node scripts/run-release-tests.mjs
node scripts/verify-reproducible-build.mjs
git status --short
```

Expected: alle Tests grün; Status enthält ausschließlich die ausdrücklich gelisteten Release- und Berichtdateien.

- [ ] **Step 5: Finalen Phase-1-Commit erstellen**

```bash
git add dist/Prompt-Studio-V600.0.0-Phase1-Foundation.html dist/Prompt-Studio-V600.0.0-Phase1-Foundation.sha256 docs/reports docs/architecture docs/modules README.md
git commit -m "release: add Prompt Studio V600 phase 1 foundation"
```

**Work-package F acceptance:** Alle 26 Prüfgruppen, 216/216 Profilkombinationen, Golden Master, Chromium/WebKit, `file://`, localhost, CSP, No-Network, Migration, Recovery, Performance und Bundlelimit sind belegt bestanden; keine kritischen oder hohen Restfehler.

**Work-package F rollback:** Bei einem Releasefehler wird nur der Releasecommit revertiert. Die letzte grüne Vorabversion bleibt erhalten; das Artefakt wird neu gebaut statt manuell editiert.

---

## Paketübergreifende Abnahmekriterien

- A: Referenzhashes, 941/941 Selbsttests, 11/11 gezielte Regressionen, 216 Golden Master und reproduzierbare Single-HTML-Pipeline.
- B: deterministische Provider, AppCore-Facade, einziger Composition Root, Pluginfehlerisolation, Capability-Zyklenprüfung und tief eingefrorene Diagnose-API.
- C: 13 IndexedDB-Stores, atomare Repositories, Autosave/Recovery, Revisionen, „Neu“, Papierkorb, Duplikation, Migration, Import/Export und deaktivierter Sync.
- D: alleinige Constraint-Regelquelle, tracebarer Resolved State, kanonischer Prompt-AST, generische Renderer und alle neun bytegleichen Profile.
- E: V500-kompatibler zehnstufiger Wizard, ViewModel-Isolation, Import/Export, Save-/Recovery-Status, Accessibility und mobile Parität ohne Phase-2-UI.
- F: vollständige Release-Matrix, Performancebudgets, Bundlelimit, reproduzierbares CSP-/Offline-Artefakt und vollständige Berichte.

## Rückfall- und Stoppregeln

1. Keine fehlgeschlagene Pflichtprüfung wird übersprungen, gelockert oder durch Fixture-Neuschreiben verdeckt.
2. Golden Master werden nur nach dokumentierter fachlicher Abweichung, semantischem Vergleich, Constraint-Paritätsprüfung, neuem Regressionstest und ausdrücklicher Freigabe geändert.
3. Referenz- und V500-Browserdaten werden niemals überschrieben oder gelöscht.
4. Datenbankschemafehler führen zu vollständigem Transaktionsabbruch und Recovery-Modus, nicht zu Teilmigration oder `localStorage`-Fallback.
5. Jeder Rückfall erfolgt mit `git revert` eines klaren Zwischen-Commits; kein Force-Push und kein Umschreiben veröffentlichter Commits.
6. Bei Netzwerk-, Authentifizierungs-, Browser- oder Toolchain-Blockern wird der vollständige Fehler protokolliert und die Ausführung gestoppt.
7. Phase 2 bleibt bis zu einem ausdrücklich freigegebenen Phase-1-Abnahmebericht vollständig gesperrt.

## Freigabegate vor Ausführung

Dieser Plan ist selbst kein Implementierungsauftrag. Nach seinem Commit und Push endet die aktuelle Arbeit. Produktionscode beginnt erst nach ausdrücklicher Freigabe dieses Dokuments und auf einer neuen Implementierungsbranch `codex/v600-phase1-foundation`, die von aktuellem `origin/main` abzweigt.
