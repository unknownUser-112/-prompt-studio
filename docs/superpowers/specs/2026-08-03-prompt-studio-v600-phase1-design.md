# Prompt Studio V600 – Phase 1 Architecture Specification

Status: **Vollständig und verbindlich freigegeben**

Datum: 3. August 2026

Freigabebasis: Commit `f1baa49ec1280bcf7543469569d5c00091c96a7a`

SHA-256 der geprüften Inhaltsbasis vor diesem Freigabevermerk:
`a9e61232ec11e6f4c57b49f89fa23dbd68a12526a3111e28b39ff4aee44dd140`

Zielrelease: `Prompt-Studio-V600.0.0-Phase1-Foundation.html`

## 1. Zweck und Geltungsbereich

Phase 1 modernisiert Prompt Studio vollständig unterhalb der bestehenden
Benutzeroberfläche. Die visuelle und funktionale Oberfläche der stabilen
V500-Reihe bleibt zunächst erhalten. Die Anwendung wird aus modularen,
typisierten Quellen entwickelt und weiterhin als eine einzige, offlinefähige
HTML-Datei ausgeliefert.

Diese Spezifikation ist die verbindliche Grundlage für die Arbeitspakete A bis
F. Änderungen an den hier definierten Architekturgrenzen benötigen eine
dokumentierte Architekturentscheidung, aktualisierte Tests und eine erneute
Freigabe.

## 2. Autoritative Referenzbasis

Die alleinige autoritative Funktions-, Verhaltens- und Golden-Master-Referenz
ist:

`Prompt-Studio-V500.6.11-Binding-Selfie-Open-Garment-State.html`

Verifizierte Artefaktdaten:

- Quelle: `Alle App Versionen/Zwischenstand 11.zip`, Archiveintrag
  `Zwischenstand 11/Prompt-Studio-V500.6.11-Binding-Selfie-Open-Garment-State.html`,
- Größe: 779.221 Byte und 6.554 Zeilen,
- SHA-256:
  `d1c2a292d203c8f76116b8b0a330bf677be394f86e044706cc3675a7326ac5c7`.

Der zugehörige Referenzbericht
`Prompt-Studio-V500.6.11-Test-Results.json` besitzt 3.319 Byte und die
SHA-256-Prüfsumme
`67e71ecb3f401c5d892b4cd21fa1a0f31ab4c858bb35642866e077f244167a63`.

Bestätigter Ausgangsteststand:

- JavaScript-Syntaxprüfung bestanden,
- laut unverändertem Referenzbericht 941 von 941 integrierten Tests bestanden,
  null Fehler und null Warnungen,
- 11 von 11 gezielten V500.6.11-VM-Regressionen für Selfie Binding, Open
  Garment State, Quality Gate und unveränderte JSON-Behandlung bestanden,
- unabhängiger kompatibilisierter Golden-Master-Harness: 46 von 46
  Funktionsprüfungen sowie drei von drei Zählstands-Metaprüfungen bestanden;
  der öffentliche Einstieg `runSelfTests()` bestätigt 941 von 941
  Selbsttests, null Fehler und null Warnungen,
- die zugrunde liegende kanonische Registry-Pipeline `runAllTests()` bestätigt
  938 von 938 aktiven beziehungsweise kompatiblen Tests; der öffentliche
  Wrapper ergänzt drei V500.6.5-Kompatibilitätsprüfungen und erklärt damit den
  Zählunterschied vollständig,
- 216 von 216 Profilregressionen ohne Laufzeitfehler oder Blockierung,
- alle neun Promptprofile erfolgreich kompiliert,
- Standard JSON und Safe JSON in Deutsch und Englisch gültig; in der
  24-mal-9-Matrix jeweils innerhalb des 12.000-Zeichen-Limits.

Die historischen Lifecycle-Tests sind im bestätigten Releasepfad ausdrücklich
deaktiviert. Bei erzwungener Ausführung schlagen sechs von zehn historischen
Prüfungen erwartungsgemäß fehl, weil sie überholte Versions-, Storage-,
Branding- oder Sprachannahmen prüfen. Sie bleiben Nachweismaterial, dürfen aber
kein V600-Golden-Master-Verhalten definieren.

Der mitgelieferte gezielte V500.6.11-Bericht enthält zusätzlich ein gültiges,
freigegebenes Standard-JSON-Spezialszenario mit 12.047 Zeichen und einer
V500.6.11-Prüfgrenze von 12.100 Zeichen. Golden Master und V600-Regressionsgate
müssen deshalb szenario- und profilbezogen sein und dürfen nicht pauschal aus
einer einzigen Größenmessung abgeleitet werden.

Die statische Integritätsprüfung des Referenzberichts besteht 7 von 9
Prüfungen. Bekannte Referenzschulden sind:

- ein weiterhin auf V500.6.10 lautender Exportdateiname,
- wiederholte `prompt`- und `copy`-IDs in alternativ gerenderten
  Quelltemplates; der statische Quellscanner bewertet dies als Duplikat,
- weiterhin auf V500.6.10 lautende sichtbare Headertexte,
- kein ausgeführter Interaktionstest in einem realen iPhone HTML Viewer.

Diese Befunde sind dokumentierte Ausgangsdefizite, keine zu erhaltenden
V600-Anforderungen. Funktionales Verhalten wird übernommen; inkonsistente
Versionsmetadaten, statisch beanstandete ID-Konstruktionen und fehlende reale
Browserabdeckung werden in V600 korrigiert und regressionsgeprüft.

V500.6.11 wird einschließlich aller kumulativen Änderungen der V500.x-Linie
verbindlich übernommen. Dazu gehören insbesondere:

- Selfie Binding und Additional-Person-Verhalten,
- Open Garment State, Upper-Layer Contract und kleidungsabhängige Logik,
- sämtliche Quality-Gate-Anpassungen,
- Compiler- und Sprachintegrität,
- zentraler Resolved State und dessen Integritätshärtung,
- Adaptive Material Physics, Adaptive Realism und Adaptive Reference,
- Character Sheet, Kamera-, Branding-, Safety- und Modellverhalten,
- Profilbibliothek und alle weiteren Änderungen zwischen V500.6.1 und
  V500.6.11.

`Prompt-Studio-V500.6.1-Compiler-Language-Integrity-Fix.html` mit der
SHA-256-Prüfsumme
`619e9a73ec2699d94fa22b8cefa5fba87c6fce14678bec036d8de98e76179199`
bleibt als historische Zwischenreferenz dokumentiert. V500.6.1 darf weder
alleinige Verhaltensreferenz noch Quelle aktueller Golden Master sein.

V600 besitzt zur Laufzeit keine Abhängigkeit von einer V500-HTML-Datei.

## 3. Ziele

Phase 1 muss:

1. die bestehende V500-Oberfläche optisch und funktional erhalten,
2. alle neun Promptprofile erhalten,
3. die Promptlogik in klar getrennte, typisierte Module überführen,
4. IndexedDB als einzige dauerhafte V600-Datenhaltung verwenden,
5. V500-Projekte und den letzten gültigen V500-Browserzustand migrieren,
6. Autosave, Recovery, Revisionen, Papierkorb und Duplikation bereitstellen,
7. Plugin-, Constraint-, Resolved-State- und Promptarchitektur etablieren,
8. Cloud- und Sync-Erweiterungen vollständig vorbereiten, aber deaktivieren,
9. Diagnose, Tests, Benchmarks und Fehlerstatus pro Modul bereitstellen,
10. einen reproduzierbaren, eigenständigen Single-HTML-Produktionsbuild liefern.

## 4. Nicht-Ziele

Phase 1 implementiert nicht:

- eine neue sichtbare Projekt- oder Bibliotheksoberfläche,
- sichtbare Bedienelemente für Duplikation, Papierkorb oder Revisionsverlauf,
- eine Cloud-Verbindung oder API-Nutzung,
- einen aktiven Cloud-Adapter,
- eine KI-Wissensdatenbank,
- Video-Prompting,
- eine neue visuelle Designsprache,
- eine automatische endgültige Löschung aus dem Papierkorb,
- leere Future-Plugins ohne ausführbare Fachfunktion.

Die Datenmodelle und Verträge für spätere Bibliotheken, erweiterte
Projektverwaltung und Sync-Funktionen werden vorbereitet, bleiben in der
produktiven Oberfläche jedoch verborgen. Die zugehörigen Application Services
sind vollständig ausführbar und getestet; ihre sichtbare Bedienoberfläche ist
Gegenstand einer späteren Phase.

## 5. Technologiestandard

- Sprache: TypeScript im Strict Mode.
- Modulsystem: ES-Module in den Quellen.
- Bundling: esbuild zu einem IIFE-Bundle.
- UI: Framework-freies DOM und Event Delegation.
- Datenbank: IndexedDB über einen eigenen Adapter.
- Unit- und Integrationstests: Vitest.
- IndexedDB-Simulation: fake-indexeddb.
- Browser- und visuelle Regression: Playwright.
- Produktionsartefakt: eine eigenständige HTML-Datei ohne Runtime-Abhängigkeiten.
- Paketmanager: npm mit festgeschriebenem Lockfile.
- Laufzeit: keine CDN-, Font-, Telemetrie- oder Cloud-Abhängigkeit.

Produktionscode verwendet kein `any`. Externe Daten beginnen als `unknown` und
werden vor der Verwendung validiert. Öffentliche Contracts besitzen keine
Magic Strings; IDs und Statuswerte werden über typisierte Konstanten oder
String-Literal-Unionen definiert.

## 6. Schichten und Abhängigkeitsregel

Die Anwendung verwendet Ports and Adapters mit genau einem Composition Root.

```text
UI
  -> Commands / Queries
Application Services
  -> typisierte Ports
Domain Engines
  -> Resultate und Domain Events
Infrastructure Adapters
```

Zulässige Importabhängigkeiten:

```text
contracts/core     -> keine Anwendungsschicht
contracts/storage  -> contracts/core
contracts/runtime  -> contracts/core
domain/contracts   -> contracts/core
contracts/plugins  -> contracts/core sowie domain/contracts ausschließlich
                      type-only
domain/entities    -> contracts/core, domain/contracts
domain/engines     -> contracts/core, domain/contracts, domain/entities
application        -> contracts, domain/contracts, domain/entities
application/mappers -> domain/entities, contracts/storage
infrastructure     -> contracts/storage, contracts/runtime, contracts/core
plugins            -> contracts/core, contracts/plugins, domain/contracts
                      ausschließlich type-only sowie eigene interne Plugin-Typen
profiles           -> contracts/core, domain/contracts ausschließlich type-only
renderers          -> contracts/core, domain/contracts ausschließlich type-only
diagnostics         -> contracts/core
ui                  -> contracts/core und Application-ViewModels
bootstrap           -> alle Schichten ausschließlich zur Komposition
```

`bootstrap/` ist der einzige Composition Root. Ausschließlich dort werden
konkrete Adapter, Repositories, Services, Plugins und UI-Bindings erzeugt,
ausgewählt und miteinander verbunden. Kein anderes Produktionsmodul darf die
vollständige Anwendung komponieren oder einen alternativen Adapter auswählen.
Tests dürfen isolierte Testobjekte und Fakes direkt erzeugen, aber keinen
zweiten vollständigen Anwendungs-Composition-Root definieren oder ausliefern.

Verboten sind:

- UI-Zugriffe auf Engines, Repositories oder IndexedDB,
- Engine-Zugriffe auf andere Engines,
- Engine-Zugriffe auf UI oder konkrete Infrastruktur,
- Profile-Layout-Strategien oder Renderer mit eigenen Fachregeln oder stillen
  Defaults,
- Infrastrukturimporte in Domain-Modulen,
- Persistence-Record-Typen in Domain- oder UI-Modulen,
- Domain-Entitäten in konkreten Storage-Adaptern ohne Mapper-Grenze,
- Plugin-, Profil- oder Renderer-Importe aus `domain/entities/`,
  `domain/engines/` oder anderen Plugin-Implementierungen,
- Wertimporte aus `domain/contracts/`; erlaubt sind dort ausschließlich
  TypeScript-`import type`-Abhängigkeiten,
- Konstruktion konkreter Infrastruktur außerhalb von `bootstrap/`,
- globale mutable Zustände,
- zyklische Modul- oder Capability-Abhängigkeiten.

`domain/contracts/` ist die einzige öffentliche Importfläche des Domain-Layers
für Plugins, Profile und Renderer. Sie enthält ausschließlich deklarative
TypeScript-Typen und Ports, keine Engine-Instanzen, Factories, Registries oder
sonstige Laufzeitwerte. `ResolvedState` liegt unter
`domain/contracts/resolved-state/`; Prompt-AST-Typen und
`PromptSectionProvider` liegen unter `domain/contracts/prompt/`. Diese
Verbraucher verwenden zwingend `import type`. `verbatimModuleSyntax`, ein
Boundary-Test und eine Prüfung des erzeugten Modulgraphen erzwingen, dass aus
diesen Abhängigkeiten keine Laufzeitkante entsteht.

`PluginManifest`, `PromptStudioPlugin` und der zusammengesetzte
`PluginRegistrar` liegen in `contracts/plugins/`. Dieses Integrationscontract
darf die Contribution-Ports aus `domain/contracts/` ausschließlich mit
`import type` referenzieren und enthält selbst keine Implementierung. Dadurch
kann der Registrar `PromptSectionProvider` statisch typisiert annehmen, ohne
dass `contracts/core`, Domain Engines oder konkrete Plugins voneinander
abhängen.

## 7. Quellstruktur

```text
src/
  contracts/
    core/           Schichtübergreifende IDs, Resultate und Lifecycle-Ports
    storage/        Repository Ports, Transaktionen, Records und Storage-Fehler
    runtime/        Clock, IDs, Hashing, Zufall, Locale und Zeitzone
    plugins/        Plugin-Manifeste und typisierte Registrar-Ports
  core/             AppCore, Event Bus, Lifecycle und Registry
  domain/
    contracts/      Öffentliche Resolved-State-, Prompt-AST- und Provider-Typen
    entities/       Domain-Entitäten und fachliche Invarianten
    engines/        Constraint Engine, Resolved State und PromptAstBuilder
  application/
    mappers/        Domain Entity ↔ Persistence Record
    services/       Project-, Settings-, Prompt-, Migration- und Export-Services
    view-models/    Stabile Application-ViewModels für die UI
  infrastructure/  IndexedDB-, Runtime- und deaktivierte Sync-Adapter
  plugins/         Plugin Manager und konkrete Fach-Plugins
  profiles/        Neun reine Profile-Layout-Strategien
  renderers/       Generische Text- und JSON-Renderer
  diagnostics/     Tests, Benchmarks, Health und Fehlerstatus
  ui/              V500-kompatible Oberfläche, ViewModels und Mapper
  bootstrap/       Composition Root und Anwendungsstart
scripts/           Build-, Inline-, Boundary- und Integritätsprüfungen
tests/
  unit/
  integration/
  browser/
  fixtures/
  golden/
reference/
  v500.6.11/       Autoritative, prüfsummenvalidierte Referenzartefakte
  historical/
    v500.6.1/      Historische, nicht autoritative Zwischenreferenz
dist/              Generierte HTML-Datei und Release-Berichte
docs/
  architecture/
  modules/
  reports/
```

## 8. Gemeinsame Contracts

### 8.1 Result und Fehler

```ts
type Result<T, E extends AppError = AppError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

interface AppError {
  readonly code: string;
  readonly moduleId: string;
  readonly severity: "info" | "warning" | "error" | "fatal";
  readonly userMessage: string;
  readonly technicalMessage: string;
  readonly recoverable: boolean;
  readonly recoveryAction?: string;
}
```

Erwartbare Fehler werden als `Result` zurückgegeben. Unerwartete Fehler werden
an einer Modulgrenze in einen `AppError` übersetzt. Console-Ausgaben enthalten
keine Projektinhalte, Prompts, Bilddaten oder Importdateien.

### 8.2 Commands, Queries und Events

```ts
interface Command<TPayload, TResult> {
  readonly type: string;
  readonly payload: Readonly<TPayload>;
}

interface Query<TPayload, TResult> {
  readonly type: string;
  readonly payload: Readonly<TPayload>;
}

interface DomainEvent<TPayload> {
  readonly type: string;
  readonly occurredAt: string;
  readonly payload: Readonly<TPayload>;
}
```

Der Event Bus verteilt Benachrichtigungen wie `ProjectSaved`,
`ProjectCreated`, `ActiveProjectChanged`, `ResolvedStateChanged`, `PluginFailed`
und `MigrationCompleted`. Events ersetzen keine Rückgabewerte und werden nicht
für synchrone Fachabfragen missbraucht.

### 8.3 Infrastructure- und Persistence-Contracts

Die Grenzen sind verbindlich wie folgt getrennt:

```text
contracts/storage/
  Repository Ports
  Transaction Contracts
  Persistence Record Types
  Storage Error Contracts

domain/
  Domain Entities
  Constraint Types
  Resolved State Types

application/mappers/
  Domain Entity ↔ Persistence Record
```

Repository-Ports arbeiten ausschließlich mit versionierten Persistence
Records. Domain Engines arbeiten ausschließlich mit Domain-Entitäten und
Domain-Typen. Application Services koordinieren beide Seiten und verwenden
die Mapper für jede Übersetzung über die Persistenzgrenze.

Persistence Records bilden Schlüsselpfade, Indizes, Schema-Versionen und
storagebezogene Metadaten ab. Domain-Entitäten bilden fachliche Invarianten ab.
Kein Typ erfüllt beide Rollen gleichzeitig. Mapper sind rein,
deterministisch, versioniert und besitzen Roundtrip- sowie Fehlerfalltests.
Sie dürfen keine Datenbankzugriffe, fachlichen Defaults oder Constraint-Regeln
enthalten.

Storage-Fehler besitzen stabile, typisierte Codes und werden am Repository-Port
als `Result` zurückgegeben. Konkrete IndexedDB-Ausnahmen verlassen die
Infrastructure-Schicht nicht. Transaktionsverträge definieren beteiligte
Stores, Les-/Schreibmodus, atomaren Commit und vollständigen Rollback; sie
enthalten keine IndexedDB-Typen.

### 8.4 Deterministische Runtime-Provider

Alle nicht aus Fachdaten ableitbaren Laufzeitwerte werden über einen einzigen,
injizierbaren Vertrag bereitgestellt:

```ts
interface Clock {
  now(): string;
}

interface MonotonicClock {
  nowMilliseconds(): number;
}

type IdNamespace =
  | "project"
  | "project-revision"
  | "profile"
  | "character"
  | "outfit"
  | "scene"
  | "prompt-template"
  | "generation-history"
  | "image-asset"
  | "tag"
  | "trash-entry"
  | "sync-operation"
  | "migration"
  | "diagnostic-report";

interface IdGenerator {
  nextId(namespace: IdNamespace): string;
}

interface HashProvider {
  sha256(data: Uint8Array): Promise<string>;
}

interface RandomSource {
  nextBytes(length: number): Uint8Array;
}

interface RuntimeEnvironment {
  readonly clock: Clock;
  readonly monotonicClock: MonotonicClock;
  readonly idGenerator: IdGenerator;
  readonly hashProvider: HashProvider;
  readonly randomSource: RandomSource;
  readonly locale: string;
  readonly timeZone: string;
}
```

`Clock.now()` liefert einen validen UTC-Zeitstempel nach ISO 8601. Die
`MonotonicClock` dient ausschließlich Laufzeitmessungen und liefert
monoton nicht fallende Millisekunden ohne fachliche Zeitbedeutung. `locale` ist
ein kanonischer BCP-47-Sprachtag, `timeZone` ein kanonischer
IANA-Zeitzonenname. Eine Operation übernimmt beim Start genau einen
`RuntimeEnvironment`-Snapshot; Browser- oder Systemeinstellungen dürfen sich
nicht mitten in einer Operation auf deren Ergebnis auswirken.

Produktionsadapter liegen in `infrastructure/runtime/`. Nur dort dürfen
`new Date()`, `Date.now()`, `performance.now()`, `crypto.randomUUID()`,
`crypto.getRandomValues()`, `crypto.subtle`, `Math.random()`,
`navigator.language` und die Ermittlung der Systemzeitzone verwendet werden.
Der Produktions-`IdGenerator` und die Produktions-`RandomSource` verwenden
sichere Browser-APIs. `Math.random()` darf nicht als Produktionsquelle für IDs
oder fachliche Zufallswerte dienen. `bootstrap/` erzeugt das
`RuntimeEnvironment` und injiziert es in alle Verbraucher. Domain-,
Application-, Plugin-, Profil-, Renderer- und Diagnostics-Code darf Zeit, IDs,
Hashes, Zufall, Locale oder Zeitzone weder direkt aus Browser-APIs noch aus
globalem Zustand lesen.

Tests verwenden eine feste Clock, eine kontrollierbare monotone Clock,
deterministische namensraumbezogene IDs, einen reproduzierbar gesetzten
Zufallsstrom sowie feste Locale- und Zeitzonenwerte. Hash-Eingaben bestehen
immer aus kanonisch serialisierten UTF-8-Bytes mit festgelegter
Schlüsselreihenfolge, Zahlenrepräsentation und `LF`-Zeilenenden. Migrationen,
Revisionen, Exporte, Promptresultate, Diagnose-Fixtures und Golden Master
müssen bei identischen Eingaben und identischem Runtime-Snapshot bytegleich
reproduzierbar sein. Kein Test darf durch Überschreiben globaler Browser-APIs
Determinismus simulieren.

## 9. AppCore

`AppCore` ist ausschließlich Lifecycle-Koordinator, Registry und
Application-Facade. Es enthält keine Prompt-, Storage-, UI- oder
Constraint-Fachlogik und ist ausdrücklich kein Composition Root.

Verantwortlichkeiten:

- Plugin-Lifecycle starten und stoppen,
- Command- und Query-Handler registrieren,
- Feature-Flag-Snapshot bereitstellen,
- Startdiagnose ausführen,
- kontrollierten Degraded- oder Recovery-Modus aktivieren.

Alle benötigten Ports, Registry-Einträge und Lifecycle-Komponenten werden
`AppCore` durch `bootstrap/` injiziert. `AppCore` erzeugt keine konkreten
Implementierungen, importiert keine konkreten Adapter oder Repositories,
wählt keinen Storage- oder Sync-Adapter aus und registriert keine konkreten
Plugins aus eigener Kenntnis. Es darf keine konkreten Profil- oder
Constraint-Regeln enthalten.

Es existiert kein zweiter Composition Root. Diese Bedingung wird durch
Importgrenzen, eine Konstruktor-/Factory-Prüfung und einen Buildtest
automatisiert erzwungen.

## 10. Plugin Manager

### 10.1 Pluginvertrag

```ts
interface PluginManifest {
  readonly id: string;
  readonly version: string;
  readonly apiVersion: string;
  readonly required: boolean;
  readonly provides: readonly CapabilityId[];
  readonly requires: readonly CapabilityId[];
}

interface PromptStudioPlugin {
  readonly manifest: PluginManifest;
  register(registrar: PluginRegistrar): void;
}
```

Der `PluginRegistrar` erlaubt ausschließlich die Registrierung von:

- Constraint-Providern,
- Prompt-Section-Providern,
- Profile-Layout-Strategien,
- Text- und JSON-Renderer-Providern,
- UI-Bindings,
- Migrationen,
- Diagnosetests,
- Benchmarks,
- Capabilitys.

Ein Plugin erhält keinen Zugriff auf `AppCore`, konkrete Repositories oder
andere Plugins.

### 10.2 Validierung und Lifecycle

Der Plugin Manager validiert:

- eindeutige Plugin-IDs,
- semantische Versionen,
- kompatible API-Versionen,
- fehlende Capabilitys,
- doppelte exklusive Provider,
- zyklische Capability-Abhängigkeiten,
- Diagnose-, Test- und Benchmark-Metadaten.

Ein optionales fehlerhaftes Plugin erhält den Status `failed` und wird
isoliert. Der Ausfall eines erforderlichen Plugins blockiert die
Promptgenerierung kontrolliert und erzeugt einen Diagnosebericht.

### 10.3 Aktive Phase-1-Plugins

- Prompt Engine
- Character Sheet
- Adaptive Realism
- Adaptive Material Physics
- Camera Engine
- Selfie
- Additional Person
- Brand Manager
- Garment und Open Garment Logic
- Safety
- Model Behaviour
- Diagnostics
- Export und Migration Integration

Ein synthetisches Test-Plugin weist nach, dass neue Capabilitys ohne Änderung
des Core registriert werden können. Future Video, Future AI und Cloud Sync
werden nicht als leere Laufzeit-Plugins implementiert.

## 11. Constraint Engine und Resolved State

### 11.1 Einzige Quelle der Wahrheit

Alle fachlichen Regeln werden von der Constraint Engine erzeugt. Der
`PromptAstBuilder` konsumiert ausschließlich den aufgelösten,
unveränderlichen Zustand. Profilstrategien konsumieren ausschließlich den
daraus erzeugten Prompt-AST.

Die deterministische Pipeline lautet:

```text
Normalize
  -> Facts sammeln
  -> Regeln anwenden
  -> Konflikte auflösen
  -> Modellverhalten auflösen
  -> validieren
  -> ResolvedState tief einfrieren
```

### 11.2 Regelvertrag

Jede Regel besitzt:

- stabile Regel-ID,
- Version,
- Quell-Plugin,
- definierte Auflösungsphase,
- Eingabeanforderungen,
- Konfliktstrategie,
- Fehler- oder Warnschwere,
- Diagnosebeschreibung,
- eigene Tests.

Regelreihenfolgen werden durch benannte Phasen und explizite Konfliktstrategien
bestimmt, nicht durch unkommentierte numerische Prioritäten.

### 11.3 Resolved State

Der `ResolvedState` enthält mindestens:

- normalisierte Projektidentität,
- Subject und Character,
- Outfit und Garments,
- Material Physics,
- Pose und Additional Person,
- Selfie- und Character-Sheet-Modus,
- Kamera und Composition,
- Szene, Licht und Umgebung,
- Adaptive Realism,
- Branding,
- Safety,
- modellabhängiges Verhalten,
- Ausgabesprache und freigegebenen Locale-Kontext,
- Konflikte, Warnungen und blockierende Fehler,
- vollständige Resolution Trace,
- deterministischen State-Hash.

Jeder aufgelöste Wert ist auf Quellfeld, Regel-ID und Plugin-Version
zurückführbar.

## 12. Prompt Builder und Profile

Die folgenden gemeinsamen Typen und Ports sind die öffentliche,
implementierungsfreie API aus `domain/contracts/prompt/`. Der dabei verwendete
`ResolvedState` stammt aus `domain/contracts/resolved-state/`.

```ts
type ProfileId =
  | "universal"
  | "gemini-natural"
  | "gemini-pro"
  | "nano-banana-pro"
  | "gpt-image-2"
  | "flux"
  | "sdxl"
  | "standard-json"
  | "safe-json";

type PromptLanguage = "de" | "en";
type PromptOutputFormat = "text" | "json";

type CorePromptSectionType =
  | "subject"
  | "character"
  | "outfit"
  | "garments"
  | "material-physics"
  | "pose"
  | "additional-person"
  | "selfie"
  | "character-sheet"
  | "camera"
  | "composition"
  | "scene"
  | "lighting"
  | "environment"
  | "adaptive-realism"
  | "branding"
  | "safety"
  | "model-behaviour"
  | "negative-prompt"
  | "quality"
  | "metadata";

type PromptSectionType =
  | CorePromptSectionType
  | `plugin:${string}:${string}`;

type PromptJsonValue =
  | null
  | string
  | number
  | boolean
  | readonly PromptJsonValue[]
  | { readonly [key: string]: PromptJsonValue };

type PromptTextFragment =
  | { readonly kind: "literal"; readonly text: string }
  | {
      readonly kind: "resolved-value";
      readonly value: string | number | boolean;
      readonly traceRef: string;
    };

type PromptTextBlock =
  | {
      readonly kind: "paragraph";
      readonly fragments: readonly PromptTextFragment[];
    }
  | {
      readonly kind: "list";
      readonly items: readonly (readonly PromptTextFragment[])[];
    }
  | {
      readonly kind: "field";
      readonly name: string;
      readonly value: PromptJsonValue;
      readonly traceRefs: readonly string[];
    };

type PromptSectionContent =
  | { readonly kind: "text"; readonly blocks: readonly PromptTextBlock[] }
  | { readonly kind: "json"; readonly value: PromptJsonValue };

interface PromptSection {
  readonly id: string;
  readonly sourcePluginId: string;
  readonly slotId: string;
  readonly semanticType: PromptSectionType;
  readonly order: number;
  readonly language: PromptLanguage;
  readonly content: PromptSectionContent;
  readonly resolutionTraceRefs: readonly string[];
  readonly profileAllowlist?: readonly ProfileId[];
}

interface PromptDocument {
  readonly id: string;
  readonly astVersion: string;
  readonly language: PromptLanguage;
  readonly stateHash: string;
  readonly sections: readonly PromptSection[];
}

interface ProfileSectionLayout {
  readonly sectionId: string;
  readonly order: number;
  readonly presentation: "paragraph" | "list" | "field" | "json-field";
  readonly localizedHeading?: string;
  readonly jsonPath?: readonly string[];
}

interface ProfileLayout {
  readonly profileId: ProfileId;
  readonly profileVersion: string;
  readonly outputFormat: PromptOutputFormat;
  readonly language: PromptLanguage;
  readonly sections: readonly ProfileSectionLayout[];
}

interface PromptSectionDraft {
  readonly sourcePluginId: string;
  readonly slotId: string;
  readonly semanticType: PromptSectionType;
  readonly language: PromptLanguage;
  readonly content: PromptSectionContent;
  readonly resolutionTraceRefs: readonly string[];
  readonly profileAllowlist?: readonly ProfileId[];
}

interface PromptSectionProvider {
  readonly id: string;
  readonly version: string;
  readonly sourcePluginId: string;
  provide(state: Readonly<ResolvedState>): Result<readonly PromptSectionDraft[]>;
}

interface PromptAstBuilder {
  build(state: Readonly<ResolvedState>): Result<PromptDocument>;
}

interface PromptProfileStrategy {
  readonly id: ProfileId;
  readonly version: string;
  createLayout(document: Readonly<PromptDocument>): Result<ProfileLayout>;
}

interface PromptRenderer {
  readonly format: PromptOutputFormat;
  render(
    document: Readonly<PromptDocument>,
    layout: Readonly<ProfileLayout>
  ): Result<RenderedPrompt>;
}

type RenderedPrompt =
  | { readonly format: "text"; readonly text: string }
  | {
      readonly format: "json";
      readonly value: PromptJsonValue;
      readonly serialized: string;
    };

type PromptResult =
  | {
      readonly format: "text";
      readonly profileId: ProfileId;
      readonly language: PromptLanguage;
      readonly documentId: string;
      readonly stateHash: string;
      readonly contentHash: string;
      readonly text: string;
    }
  | {
      readonly format: "json";
      readonly profileId: ProfileId;
      readonly language: PromptLanguage;
      readonly documentId: string;
      readonly stateHash: string;
      readonly contentHash: string;
      readonly value: PromptJsonValue;
      readonly serialized: string;
    };

interface PromptBuilder {
  build(
    state: Readonly<ResolvedState>,
    profile: PromptProfileStrategy
  ): Promise<Result<PromptResult>>;
}
```

`PromptDocument` ist der kanonische, unveränderliche Prompt-AST und niemals
ein bereits zusammengesetzter Gesamtstring. Die verbindliche Pipeline lautet:

```text
ResolvedState
  -> PromptAstBuilder
  -> PromptDocument / Prompt-AST
  -> ProfileLayout
  -> TextRenderer oder JsonRenderer
  -> PromptResult
```

Registrierte `PromptSectionProvider` projizieren ausschließlich bereits
aufgelöste Werte ihres Plugins in regelneutrale `PromptSectionDrafts`. Sie
dürfen keine Constraints erneut auswerten, fachliche Defaults erzeugen,
Profilentscheidungen treffen oder finale Strings zusammensetzen. Der
`PromptAstBuilder` validiert und vereinigt die Drafts in stabiler
Registry-Reihenfolge, weist IDs und lückenlose nullbasierte `order`-Werte zu und
erzeugt daraus das tief eingefrorene `PromptDocument`.

Die Registry-Reihenfolge ergibt sich deterministisch aus der topologischen
Capability-Reihenfolge; Gleichstände werden zuerst nach `sourcePluginId`, dann
nach Provider-ID lexikografisch aufgelöst. Der AST-Validator verlangt, dass
Provider- und Draft-`sourcePluginId` identisch sind, und verwirft doppelte
Plugin-/Slot-Kombinationen. Registrierungs- oder Importreihenfolge darf das
Ergebnis nicht beeinflussen.

Innerhalb der Drafts eines Providers ignoriert der `PromptAstBuilder` die
gelieferte Array-Reihenfolge und sortiert vor der Vergabe der globalen
`order`-Werte kanonisch aufsteigend nach `slotId`. `slotId` ist auf
ASCII-Kleinbuchstaben, Ziffern sowie einzelne Punkte oder Bindestriche zwischen
Segmenten beschränkt und muss dem Muster
`^[a-z0-9]+(?:[.-][a-z0-9]+)*$` entsprechen. Verglichen wird byteweise nach
ASCII-Codepunkt. Damit erzeugen unterschiedlich angeordnete, ansonsten
identische Provider-Drafts bytegleiche Prompt-Dokumente.

Dokument- und Abschnitts-IDs sind deterministisch stabil: Die Dokument-ID wird
aus AST-Version und `stateHash`, jede Abschnitts-ID aus AST-Version,
`sourcePluginId` und dem innerhalb dieses Plugins stabilen `slotId` abgeleitet.
Dadurch bleiben IDs auch bei Inhaltsänderungen oder dem Einfügen anderer
Abschnitte stabil. Für diese IDs werden weder `IdGenerator` noch Zufallswerte
verwendet. `slotId` muss pro Plugin eindeutig sein. Jede nicht rein literale
Ausgabe ist über mindestens eine `resolutionTraceRefs`- oder
Fragment-`traceRef`-Referenz auf den `ResolvedState` zurückführbar.

Core-Abschnittstypen sind geschlossen und versioniert. Plugins dürfen neue
Typen nur im Format `plugin:<pluginId>:<sectionName>` registrieren; Plugin
Manager und AST-Validator prüfen Eigentümer, Format und Eindeutigkeit. Eine
optionale `profileAllowlist` wird ausschließlich vom `PromptAstBuilder` aus
bereits aufgelösten Freigaben übernommen. Sie ist keine Gelegenheit für
Profilcode, neue Fachregeln einzuführen, und muss, falls vorhanden, mindestens
ein Profil enthalten. `PromptJsonValue` enthält nur valide JSON-Werte;
`undefined`, `NaN`, Unendlichkeiten, Funktionen und zyklische Objekte sind
unzulässig.

Profilstrategien dürfen:

- freigegebene AST-Abschnitte auswählen,
- deren Reihenfolge bestimmen,
- Überschriften lokalisieren,
- ein `ProfileLayout` für Text oder JSON erzeugen,
- profilabhängige Darstellung deklarieren.

Sie dürfen keine Fachregeln, Konfliktauflösungen oder stillen Defaults
erzeugen, keine AST-Inhalte verändern und keinen fertigen Gesamtstring
zusammensetzen. Auswahlentscheidungen dürfen ausschließlich auf stabilen
Abschnittsmetadaten, `profileAllowlist` und registrierter Profilkonfiguration
beruhen, niemals auf einer erneuten fachlichen Interpretation der Inhalte. Der
`PromptBuilder` validiert Abschnittsreferenzen, Freigabelisten, eindeutige
Reihenfolgen, Sprache und Ausgabeformat, wählt den passenden generischen
Renderer aus und bildet den SHA-256-`contentHash` über den injizierten
`HashProvider`. Layout- und Dokumentensprache müssen identisch sein.

Der `TextRenderer` ist allein für die finale Textverkettung zuständig. Der
`JsonRenderer` erzeugt ausschließlich gültige `PromptJsonValue`-Bäume und eine
kanonische Serialisierung mit expliziter Feldreihenfolge. Ein Renderer darf
keine Abschnitte ergänzen, fachliche Werte umdeuten, Defaults einsetzen oder
Profilentscheidungen treffen. Text- und JSON-Ergebnis tragen Dokument-ID,
Profil-ID, Sprache, State-Hash und Inhalts-Hash für Diagnose und Golden Master.
Bei Text wird der Hash über die UTF-8-Bytes von `text`, bei JSON über die
UTF-8-Bytes von `serialized` gebildet; `value` muss dem Ergebnis von
`JSON.parse(serialized)` strukturell entsprechen.

Phase 1 unterstützt:

- Universal
- Gemini Natural
- Gemini Pro
- Nano Banana Pro
- GPT Image 2
- FLUX
- SDXL
- Standard JSON
- Safe JSON

Standard JSON und Safe JSON werden vor der Freigabe geparst und gegen ihre
Schemas geprüft. Sprachprüfungen untersuchen ausschließlich natürlichsprachige
Felder.

## 13. Datenbank und Storage Engine

### 13.1 Datenbank

Name: `prompt-studio-v600`

Initiale IndexedDB-Version: `1`

Object Stores:

- `Projects`
- `ProjectRevisions`
- `Profiles`
- `Characters`
- `Outfits`
- `Scenes`
- `PromptTemplates`
- `GenerationHistory`
- `ImageAssets`
- `Tags`
- `Settings`
- `Trash`
- `SyncQueue`

### 13.2 Gemeinsame Metadaten

```ts
interface EntityMetadata {
  readonly id: string;
  readonly schemaVersion: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly revision: number;
}
```

IDs werden ausschließlich über den injizierten `IdGenerator` erzeugt.
Zeitstempel stammen ausschließlich aus `Clock.now()` und verwenden UTC sowie
ISO 8601. Hashes und zufallsabhängige Werte stammen aus den entsprechenden
Runtime-Providern nach Abschnitt 8.4; Storage-, Domain- und Application-Code
ruft dafür keine Browser-API direkt auf.

### 13.3 Store-Verantwortlichkeiten und Indizes

#### Projects

Enthält Projektname, aktuellen Fachzustand, aktuellen Revisionsverweis,
Autosave-Zeitpunkt, Lebenszyklusstatus und Tag-IDs.

Indizes: `updatedAt`, `name`, `lifecycleStatus`.

#### ProjectRevisions

Enthält vollständigen Projektsnapshot, Sequenznummer, Grund,
Elternrevision und SHA-256-Prüfsumme.

Indizes: `projectId`, `[projectId, sequence]`, `createdAt`.

#### Profiles

Enthält benutzerdefinierte Profilkonfigurationen und unveränderliche Referenzen
auf eingebaute Profile. Eingebaute Strategien bleiben Quellcode und werden
nicht aus der Datenbank ausgeführt.

Indizes: `kind`, `name`, `updatedAt`.

#### Characters, Outfits, Scenes und PromptTemplates

Enthalten versionierte Bibliotheksentitäten mit Name, Fachpayload, Tag-IDs und
Quellprojekt. Die Oberfläche bleibt in Phase 1 verborgen.

Indizes: `name`, `updatedAt`, `sourceProjectId`.

#### GenerationHistory

Enthält Projekt-ID, Profil-ID, PromptResult, Resolved-State-Hash,
Diagnosezusammenfassung und Erstellungszeitpunkt.

Indizes: `projectId`, `profileId`, `createdAt`.

#### ImageAssets

Enthält Blob, MIME-Typ, Maße, SHA-256-Prüfsumme und referenzierende
Entitäts-IDs. Identische Assets werden anhand der Prüfsumme wiederverwendet.

Indizes: `sha256`, `createdAt`.

#### Tags

Enthält eindeutigen normalisierten Slug, Anzeigenamen und optionale Farbe.

Indizes: eindeutiger `slug`, `name`.

#### Settings

Enthält typisierte globale oder projektspezifische Einstellungen,
Feature-Flag-Konfiguration, den persistenten Verweis auf das aktive Projekt und
das Migration Ledger.

Schlüsselpfad: `key`. Indizes: `scope`, `projectId`.

#### Trash

Enthält Original-Store, Entitätstyp, vollständigen Payload, ursprüngliche ID,
Löschzeitpunkt und Wiederherstellungsmetadaten.

Indizes: `entityType`, `deletedAt`, `originalId`.

#### SyncQueue

Enthält operationale Änderungen mit Entität, Operation, Basisrevision,
Payload-Hash und Status. Phase 1 sendet keine Einträge.

Indizes: `status`, `createdAt`, `[entityType, entityId]`.

## 14. Repository Layer

Der `IndexedDbStorageAdapter` kapselt Öffnung, Schema-Upgrades, Transaktionen
und Fehlerübersetzung. Services kennen IndexedDB nicht. Der Adapter
implementiert ausschließlich Ports aus `contracts/storage/` und arbeitet mit
Persistence Records; er importiert keine Domain-Entitäten.

Repository-Ports:

- `ProjectRepository`
- `ProjectRevisionRepository`
- `ProfileRepository`
- `CharacterRepository`
- `OutfitRepository`
- `SceneRepository`
- `PromptTemplateRepository`
- `GenerationHistoryRepository`
- `ImageAssetRepository`
- `TagRepository`
- `SettingsRepository`
- `TrashRepository`
- `SyncQueueRepository`

Mehrere zusammengehörige Schreibvorgänge laufen in einer expliziten
Multi-Store-Transaktion. Ein Transaktionsfehler verwirft die gesamte Änderung.
Application Services übersetzen Records ausschließlich über die zugehörigen
Mapper in `application/mappers/`. Repository-Implementierungen enthalten weder
Fachvalidierung noch Constraint-Auflösung.

## 15. Application Services

### Project Service

- Projekte erstellen, laden und aktualisieren,
- Duplikate mit neuen IDs erzeugen,
- Autosave koordinieren,
- Revisionen erstellen und wiederherstellen,
- Soft Delete und Wiederherstellung ausführen,
- Domain Events veröffentlichen.

### Settings Service

- typisierte Einstellungen lesen und schreiben,
- Feature Flags auflösen,
- Migration Ledger verwalten,
- ungültige Werte auf dokumentierte Defaults normalisieren.

### Migration Service

- V500-Browserzustände und Projektdateien erkennen,
- versionierte, idempotente Migrationen ausführen,
- Migrationsberichte erzeugen,
- beschädigte Eingaben isolieren.

### Export Engine

- V600-Projekte deterministisch exportieren,
- V500-kompatible Importdateien lesen,
- Exportmanifest und Prüfsummen erzeugen,
- Objekt-URLs nach Download freigeben.

### Sync Interface

Definiert Local Adapter, Cloud Adapter und Sync Engine. In Phase 1 wird nur der
Local Adapter komponiert. `cloudSync` ist unveränderlich deaktiviert;
`connect-src 'none'` verhindert Netzwerkzugriffe zusätzlich auf Browser-Ebene.

## 16. Autosave, Recovery und Revisionen

- Eingaben werden nach 750 ms Inaktivität gespeichert.
- Vor Wizard-Schrittwechsel, Import, Export, `visibilitychange` und
  kontrolliertem Anwendungsstopp wird sofort geflusht.
- Autosave aktualisiert den aktuellen Projektdatensatz transaktional.
- Autosave erzeugt nicht bei jedem Tastendruck eine Revision.
- Eine Revision entsteht bei Import, Migration, Wiederherstellung, manuellem
  Meilenstein und spätestens nach fünf Minuten aktiver Änderungen.
- Der aktuelle Projektdatensatz und die letzte Revision bleiben getrennte
  Wiederherstellungsoptionen.
- Nach einem fehlgeschlagenen Schreibvorgang bleibt der letzte bestätigte Stand
  unverändert.
- Beim Start werden unvollständige Transaktionen, Autosave-Zeitpunkt und letzte
  Revision geprüft. Ein abweichender Autosave-Stand wird als Recovery-Option
  angeboten.

### 16.1 Verbindliches Verhalten der Schaltfläche „Neu“

Die sichtbare V500-Schaltfläche „Neu“ und ihre Bestätigungsabfrage bleiben in
Phase 1 erhalten. Abbrechen beendet den Vorgang ohne Zustandsänderung. Der
zugehörige `CreateNewProjectCommand` wird serialisiert; solange er läuft, ist
„Neu“ deaktiviert und weitere Auslösungen erzeugen weder ein zweites Projekt
noch zusätzliche Revisionen. Nach der Bestätigung gilt zwingend diese
Reihenfolge:

1. Ein ausstehender Autosave des aktuellen Projekts wird vollständig in einer
   atomaren Transaktion geflusht. Schlägt der Flush fehl, bleibt der letzte
   bestätigte persistente Stand unverändert, das aktuelle Projekt bleibt aktiv
   und die Neuanlage wird mit sichtbarer Fehlermeldung abgebrochen.
2. Der `Project Service` erzeugt über eine versionierte Domain-Factory eine
   neue `Project`-Entität mit Standardzustand, neuer ID und Runtime-Zeitstempeln.
   Der Standardzustand entspricht fachlich exakt dem Ergebnis der bestätigten
   V500.6.11-Neu-/Reset-Aktion, wird in das aktuelle V600-Schema überführt und
   übernimmt keine Werte oder IDs aus dem bisherigen Projekt.
3. Neues Projekt, erste vollständige Revision mit Grund `create` und der in
   `Settings` gespeicherte Verweis auf das aktive Projekt werden gemeinsam in
   genau einer Multi-Store-Transaktion gespeichert.
4. Erst nach erfolgreichem Commit wechselt das ViewModel auf das neue Projekt,
   rendert den ersten Wizard-Schritt und veröffentlicht in dieser Reihenfolge
   `ProjectCreated` und `ActiveProjectChanged`.

Das bisherige Projekt bleibt einschließlich seines erfolgreich geflushten
Stands und seiner Revisionen vollständig gespeichert. Es wird weder
überschrieben, archiviert noch in den Papierkorb verschoben. Schlägt die
Neuanlage oder ihr Commit fehl, existiert kein partielles neues Projekt, der
aktive Projektverweis und die UI bleiben beim bisherigen Projekt, und es
werden weder `create`-Revision noch Erfolgsereignisse veröffentlicht. IDs und
Zeitstempel stammen aus dem injizierten `RuntimeEnvironment`; feste Provider
machen den gesamten Ablauf reproduzierbar testbar. Ist persistentes Speichern
nicht verfügbar, schlägt der Command kontrolliert fehl und verändert den
aktuellen In-Memory-Zustand nicht.

## 17. Papierkorb und Duplikation

Löschen ist ausschließlich Soft Delete. Die vollständige Entität wird
transaktional nach `Trash` verschoben. Es existiert keine automatische
endgültige Löschung. Eine spätere permanente Löschung benötigt eine
ausdrückliche Bestätigung.

Bei Projektduplikation:

- werden Projekt- und Revisions-IDs neu erzeugt,
- wird der Fachzustand tief kopiert,
- erhält der Name den Zusatz „Kopie“,
- werden Bildassets referenziert statt physisch dupliziert,
- wird eine erste Revision mit dem Grund `duplicate` angelegt.

Duplikation, Papierkorb und Revisionswiederherstellung sind in Phase 1 über
Commands und Application Services vollständig funktionsfähig und automatisiert
getestet. Sie werden nicht über die globale Diagnose-API mutierbar gemacht und
erhalten in Phase 1 keine neuen sichtbaren Bedienelemente. Ein Recovery-Hinweis
nach einem tatsächlichen Fehler oder Absturz gilt als notwendiger
Betriebszustand, nicht als Neugestaltung der regulären V500-Oberfläche.

## 18. V500-Migration

### 18.1 Browserzustand

Der Migration Service prüft lesend den aktuellen V500-Schlüssel
`prompt-studio-v500-5-1-diagnostic-pipeline-fix` und die bekannten älteren
V500-Schlüssel.

Ablauf:

1. Eingabegröße begrenzen und JSON defensiv parsen.
2. Form und Anwendungssignatur validieren.
3. Jüngsten gültigen Zustand bestimmen.
4. Versionierte Migrationskette bis zum V600-Schema ausführen.
5. V600-Projekt, erste Revision und Migrationsbericht transaktional speichern.
6. SHA-256-Fingerprint im Migration Ledger ablegen.
7. Wiederholte Migration desselben Zustands verhindern.

Alte `localStorage`-Einträge werden weder verändert noch gelöscht. V600
verwendet `localStorage` nach Abschluss der Migration nicht dauerhaft.

### 18.2 Dateien

V500-Projekt-JSON bleibt importierbar. Die bestehende Schutzgrenze von 2 MiB
gilt für V500-Projekt-JSON. V600-Projekt-JSON ist auf 10 MiB begrenzt und
verwendet ein versioniertes Manifest. Binäre `ImageAssets` werden in Phase 1
nicht in Projektdateien eingebettet oder importiert, weil die Bildbibliothek
deaktiviert und für V500-Projekte kein Bildasset-Verweis vorhanden ist. Ein
V600-Import mit eingebetteten Binärassets wird mit dem stabilen Fehlercode
`IMPORT_ASSET_BUNDLE_UNSUPPORTED` abgewiesen, ohne vorhandene Daten zu ändern.

Beschädigte Daten werden nicht still repariert oder überschrieben. Der Import
liefert einen Fehlerbericht mit erkannten und nicht migrierbaren Feldern.

## 19. UI und ViewModel Layer

Phase 1 übernimmt visuell und funktional:

- zehn Wizard-Schritte,
- die Schaltfläche „Neu“ mit bestehender Bestätigungsabfrage und der
  transaktionalen Semantik aus Abschnitt 16.1,
- Feldreihenfolge und Bezeichnungen,
- Navigation und Fortschrittsanzeige,
- Profilwahl,
- Import und Export,
- Promptausgabe,
- Qualitätsanzeige,
- Diagnose- und Benchmark-Schaltflächen,
- Responsive- und Accessibility-Regeln.

Die UI kennt weder Modelllogik noch Promptregeln. Sie erhält Profiloptionen als
ViewModel-Daten, zeigt deren Labels an und sendet eine opake `profileId` zurück.
Sie enthält keine Verzweigungen wie `if (Gemini)` oder profilabhängige
Constraint-Logik.

```text
Domain Model
  -> ViewModel Mapper
  -> WizardViewModel
  -> UI
```

Die UI arbeitet niemals direkt mit `Project`-Entitäten. Änderungen des
Datenbankschemas dürfen keine UI-Änderungen erzwingen.

Die Neuanlage eines zusätzlichen persistenten Projekts ersetzt den historischen
V500-Reset hinter der Schaltfläche „Neu“. Dies ist eine ausdrücklich
festgelegte Persistenzkorrektur für das Mehrprojektmodell; Beschriftung,
Bestätigungsdialog, Fokusführung und sichtbarer Bedienablauf bleiben
V500-kompatibel.

Beispielhafter Ereignisfluss:

```text
UI Event
  -> UpdateProjectFieldCommand
  -> Project Service
  -> Constraint Pipeline
  -> GetWizardViewModelQuery
  -> Render
```

## 20. Feature Flags

```ts
interface FeatureFlagSnapshot {
  readonly characterLibrary: boolean;
  readonly outfitLibrary: boolean;
  readonly sceneLibrary: boolean;
  readonly promptLibrary: boolean;
  readonly imageLibrary: boolean;
  readonly revisionHistoryUi: boolean;
  readonly cloudSync: false;
  readonly aiKnowledgeBase: false;
}
```

Bibliotheks- und Revision-UI-Flags sind in Phase 1 standardmäßig `false`.
`cloudSync` und `aiKnowledgeBase` können in Phase 1 weder durch UI noch Import
aktiviert werden. Die UI erhält ausschließlich aufgelöste Sichtbarkeit im
ViewModel und liest Feature Flags nicht direkt.

## 21. Globales Diagnoseobjekt

Es existiert genau ein globales Anwendungsobjekt:

`window.PromptStudioV600`

Es ist tief eingefroren und bietet ausschließlich eine dokumentierte,
schreibgeschützte Diagnose-API:

- Versions- und Buildinformationen,
- aggregierter Health-Status,
- Start der freigegebenen Selbsttests,
- Start der Benchmarks,
- schreibgeschützte Registry- und Capability-Zusammenfassungen,
- Erstellung eines bereinigten Diagnoseberichts.

Die API gibt unveränderliche Kopien zurück und besitzt keine Methoden zum
Ändern von Projekten, Settings, Feature Flags oder Datenbankinhalten. Der
übrige Anwendungscode verwendet keine globalen Zustände.

## 22. Single-HTML-Build

Der Entwicklungsbuild verwendet modulare TypeScript-Quellen. Der
Produktionsbuild erzeugt:

`dist/Prompt-Studio-V600.0.0-Phase1-Foundation.html`

Eigenschaften:

- genau eine HTML-Datei,
- gebündeltes IIFE-JavaScript,
- inline eingebettetes CSS,
- keine externen Fonts oder Assets,
- keine Runtime-Abhängigkeiten,
- offlinefähig,
- direkt über `file://` und localhost verwendbar,
- Source Maps nur im Entwicklungsbuild,
- reproduzierbarer Produktionsbuild.

Eingebettete Build-Metadaten:

- App-Version,
- Datenbankschema-Version,
- Plugin-API-Version,
- Quellhash,
- autoritative V500.6.11-Baseline-Prüfsumme,
- Prüfsumme des zugehörigen V500.6.11-Testberichts.

Der Build enthält keine aktuelle Uhrzeit, sofern nicht ein festes
`SOURCE_DATE_EPOCH` übergeben wird.

## 23. Content Security Policy

Der Produktionsbuild verwendet mindestens:

```text
default-src 'none';
script-src 'unsafe-inline';
style-src 'unsafe-inline';
img-src data: blob:;
connect-src 'none';
font-src 'none';
object-src 'none';
base-uri 'none';
form-action 'none';
worker-src blob:
```

Es werden keine Netzwerkverbindungen aufgebaut. Import erfolgt ausschließlich
über lokale Dateiauswahl. Export erfolgt über lokale Blob-Downloads.

Wenn IndexedDB im aktuellen Browserkontext nicht verfügbar ist, startet V600
im nicht-persistenten Recovery-Modus, weist sichtbar darauf hin und ermöglicht
manuellen Export. Ein stiller Rückfall auf `localStorage` ist verboten.

## 24. Moduldiagnostik

```ts
interface ModuleHealthContract {
  readonly moduleId: string;
  readonly version: string;
  readonly status: "ready" | "degraded" | "failed" | "disabled";
  diagnose(): Promise<DiagnosticReport>;
  benchmark(): Promise<BenchmarkReport>;
  readonly tests: readonly DiagnosticTestDefinition[];
}
```

Diagnostics erhält Provider über den Plugin Manager und greift nicht auf
Modul-Interna zu. Jeder Bericht enthält Modul-ID, Modulversion, Testversion,
Start- und Endzeit, Resultat, Schwere und bereinigte Fehlerdetails.
Benchmarks messen ausschließlich über die injizierte `MonotonicClock`;
fachliche Zeitstempel in Berichten stammen aus `Clock`.

Der Vertrag gilt auch für Core-Services und Infrastrukturadapter, die keine
Fach-Plugins sind. Sie liefern ihre Health-, Test- und Benchmark-Provider als
Contracts aus; ausschließlich `bootstrap/` verbindet diese Provider während
der Komposition mit Diagnostics. Damit
besitzen AppCore, Storage Engine, Repository Layer, Project Service, Settings
Service, Migration Service, Export Engine und Sync Interface jeweils Version,
Diagnose, Tests, Benchmark und Fehlerstatus.

## 25. Performance-Budgets

Die Release-Gates werden als p95 auf dem MacBook Pro M3 Max mit einem
repräsentativen Projekt gemessen:

| Vorgang | Budget |
|---|---:|
| Wizard nach ausgeführtem App-Boot interaktiv | < 150 ms |
| Projekt aus IndexedDB laden | < 200 ms |
| Prompt erzeugen | < 100 ms |
| Autosave ohne Bildassets | < 50 ms |
| Wizard-Schritt wechseln | < 50 ms |
| Produktionsbundle | < 1,5 MB |

Einmalige IndexedDB-Upgrades, Browserprozessstart und große
Bildasset-Transaktionen werden separat ausgewiesen. Ein überschrittenes Budget
blockiert den Release, sofern keine dokumentierte und freigegebene
Budgetänderung vorliegt.

## 26. Teststrategie

Verbindliche Prüfgruppen:

1. TypeScript-, Contract- und Runtime-Provider-Prüfung einschließlich eines
   Verbots direkter Zeit-, UUID-, Zufalls-, Locale-, Zeitzonen- und
   Hash-Browserzugriffe außerhalb von `infrastructure/runtime/`.
2. Importgrenzen und Zyklenerkennung einschließlich eines kompilierenden
   Test-Plugins mit `PromptSectionProvider`, ausschließlich type-only Imports
   aus `contracts/plugins/` und `domain/contracts/`, verbotenen Engine-Importen
   sowie Prüfung auf fehlende Laufzeitkanten.
3. Unit-Tests jeder Engine.
4. Plugin-Registrierung, Capabilitys und Fehlerisolation.
5. Constraint-Regeln und Resolution Trace.
6. Repository- und Multi-Store-Transaktionen.
7. IndexedDB mit fake-indexeddb und realem Browser.
8. V500-Migration aller bekannten Schlüssel.
9. Migration beschädigter und übergroßer Daten.
10. Autosave, Flush, Recovery, Revisionen sowie die atomare Schaltfläche „Neu“
    in Erfolgs-, Abbruch-, Wiederholungs- und Fehlerfällen.
11. Papierkorb und Wiederherstellung.
12. Projektduplikation und Asset-Wiederverwendung.
13. V500- und V600-Import-/Export-Roundtrip.
14. Alle zehn Wizard-Schritte vorwärts und rückwärts.
15. Tastaturbedienung, Fokus und mobile Breakpoints.
16. Prompt-AST-Invarianten, stabile Plugin- und Slot-IDs, Trace-Abdeckung,
    beide Renderer und alle neun Profile.
17. 24 Konfigurationen mal neun Profile.
18. Character Sheet und Einzelreferenz.
19. Selfie und Additional Person.
20. Adaptive Material Physics und Adaptive Realism.
21. Open Garment, Kamera, Branding und Safety.
22. Standard JSON und Safe JSON in Deutsch und Englisch.
23. DOM- und visuelle V500-Parität.
24. `file://`- und localhost-Produktionsbuild.
25. CSP-, Offline- und No-Network-Prüfung.
26. Performance-Budget-Gates.

Nach jedem Arbeitspaket laufen dessen vollständige Unit-, Contract- und
Integrationstests sowie die bis dahin verfügbare V500-Regressionssuite. Vor der
Abnahme von Arbeitspaket D, E und F läuft jeweils die vollständige
24-mal-9-Profilmatrix. Arbeitspaket F führt abschließend alle 26 Prüfgruppen
ohne Auslassung aus.

## 27. Golden-Master-Strategie

Die autoritative V500.6.11-Referenz erzeugt deterministische Golden Master für:

- 24 bestehende Regressionskonfigurationen,
- alle neun Profile,
- Character-Sheet- und Single-Reference-Szenarien,
- Material-, Kamera-, Branding-, Safety- und Garment-Konflikte,
- Selfie Binding, Additional Person und Open Garment State,
- Quality-Gate-Freigabe und -Blockierung,
- Compiler- und Sprachintegrität sowie die bestehenden Adaptive Engines,
- deutsche und englische Ausgabe,
- Standard JSON und Safe JSON.

Deterministische Ausgaben bleiben bytegleich. Eine notwendige bewusste
Abweichung benötigt:

1. dokumentierte fachliche Begründung,
2. semantischen Vorher-Nachher-Vergleich,
3. Constraint-Paritätsprüfung,
4. Changelog-Eintrag,
5. zusätzlichen Regressionstest,
6. Freigabe im Prüfbericht.

## 28. Arbeitspakete

### Arbeitspaket A – Referenz und Build Foundation

- V500.6.11-HTML- und Testbericht-Prüfsummen verifizieren.
- Unveränderte Referenzartefakte isolieren.
- Golden-Master-Harness reproduzierbar machen.
- TypeScript-, esbuild-, Vitest- und Playwright-Grundlage schaffen.
- Entwicklungs- und Produktionsbuild erzeugen.
- Importgrenzen automatisiert prüfen.

Abnahme: Referenztests laufen unverändert; eine minimale modulare App wird als
eine HTML-Datei gebaut; kein produktiver V500-Code wurde verändert.

### Arbeitspaket B – Core, Contracts, Plugins und Diagnostics

- gemeinsame Contracts implementieren,
- `RuntimeEnvironment`, Produktionsprovider und deterministische Testprovider
  implementieren,
- AppCore und Lifecycle implementieren,
- `bootstrap/` als einzigen Composition Root implementieren,
- Command-, Query- und Event-Infrastruktur implementieren,
- Plugin Manager und Capability-Graph implementieren,
- Diagnose-, Test- und Benchmark-Registry implementieren,
- tief eingefrorene globale Diagnose-API bereitstellen.

Abnahme: erforderliche und optionale Pluginfehler, doppelte IDs, fehlende
Capabilitys und Zyklen werden korrekt erkannt und getestet.

### Arbeitspaket C – IndexedDB und Application Services

- Storage Engine und Datenbankschema implementieren,
- Repositories implementieren,
- Project und Settings Services implementieren,
- Autosave, Revisionen, Recovery, Papierkorb und Duplikation implementieren,
- die transaktionale „Neu“-Semantik einschließlich erster `create`-Revision
  implementieren,
- Migration und Export Engine implementieren,
- deaktivierte Sync-Contracts und SyncQueue implementieren.

Abnahme: alle Transaktions-, Recovery-, Migrations-, Import- und Exporttests
bestehen; alte V500-Daten bleiben unverändert.

### Arbeitspaket D – Constraints, Resolved State und Promptprofile

- V500-Fachlogik in Constraint-Provider überführen,
- Resolved-State-Modell und Trace implementieren,
- alle aktiven Fach-Plugins implementieren,
- Prompt-AST, Prompt Builder sowie generische Text- und JSON-Renderer
  implementieren,
- neun reine Profile-Layout-Strategien implementieren,
- JSON-Schemas und Sprachintegrität implementieren.

Abnahme: Golden-Master-, Constraint-, JSON- und 24-mal-9-Profiltests bestehen.

### Arbeitspaket E – V500-kompatible UI

- CSS und DOM-Struktur übernehmen,
- ViewModel Mapper implementieren,
- Commands und Queries anbinden,
- Wizard, Profile, Import, Export, Promptausgabe und Diagnose verbinden,
- Feature Flags auf ViewModel-Ebene anwenden,
- Accessibility und Responsive-Parität prüfen.

Abnahme: funktionale, DOM- und visuelle Parität zur autoritativen
V500.6.11-Referenz. Dokumentierte V500.6.11-Referenzschulden werden nicht als
gewünschte Parität behandelt, sondern durch explizite Regressionen korrigiert.

### Arbeitspaket F – Release und vollständige Regression

- vollständige Testsuite ausführen,
- Performance-Gates prüfen,
- CSP-, Offline-, `file://`- und localhost-Prüfungen ausführen,
- Produktionsbuild erzeugen und hashen,
- Prüfbericht, Testprotokoll, Changelog, Architekturübersicht,
  Moduldokumentation, Migrationsbericht und Phase-2-Empfehlungen erstellen.

Abnahme: keine kritischen oder hohen Fehler, alle Pflichtregressionen bestanden,
alle Performance-Budgets eingehalten und vollständiger Lieferumfang vorhanden.

## 29. Phase-1-Lieferumfang

1. `Prompt-Studio-V600.0.0-Phase1-Foundation.html`
2. vollständiger Prüfbericht
3. Testprotokoll
4. Changelog
5. Architekturübersicht
6. Dokumentation aller neuen Module und Contracts
7. Migrationsdokumentation
8. Performancebericht
9. Liste möglicher Verbesserungen für Phase 2

## 30. Risiken und Gegenmaßnahmen

### Verhaltensabweichungen beim Portieren

Gegenmaßnahme: Golden Master, 24-mal-9-Regressionsmatrix und verpflichtende
Abweichungsfreigabe.

### IndexedDB-Unterschiede zwischen Browsern und `file://`

Gegenmaßnahme: reale Browserprüfungen, kontrollierter Recovery-Modus und kein
stiller Storage-Fallback.

### AppCore wird zum neuen Monolithen

Gegenmaßnahme: AppCore enthält ausschließlich Lifecycle, Registry und
Application-Facade. Nur `bootstrap/` komponiert konkrete Implementierungen;
Importgrenzen, Konstruktorprüfungen und Größenprüfungen werden automatisiert
getestet.

### Zweiter Composition Root entsteht schleichend

Gegenmaßnahme: Nur `bootstrap/` darf konkrete Adapter und vollständige
Anwendungsgraphen erzeugen. Boundary-Tests blockieren konkrete
Infrastructure-Konstruktionen und Adapterauswahl in allen anderen
Produktionsmodulen.

### Plugins umgehen die Constraint Engine

Gegenmaßnahme: eingeschränkter `PluginRegistrar`, keine Engine-Referenzen und
Contract-Tests für alle Contributions.

### Zu viele Revisionen oder große Datenbank

Gegenmaßnahme: zeitbasierte Checkpoints statt Revision pro Eingabe,
Asset-Deduplizierung und Diagnose der Store-Größen.

### Single-HTML-Bundle wächst unkontrolliert

Gegenmaßnahme: 1,5-MB-Release-Budget, esbuild-Metadatenanalyse und keine
Runtime-Abhängigkeiten.

### Versehentliche Cloud- oder API-Nutzung

Gegenmaßnahme: Cloud nicht komponieren, Flags unveränderlich deaktivieren,
`connect-src 'none'` und No-Network-Browsertest.

## 31. Definition of Done

Phase 1 ist abgeschlossen, wenn:

- alle Arbeitspakete A bis F abgenommen sind,
- alle neun Promptprofile funktionsfähig sind,
- V500-Migration, Import, Export, Autosave, Recovery, Revisionen, Papierkorb
  und Duplikation getestet sind,
- Constraint Engine und Resolved State die einzige Regelquelle bilden,
- `PromptDocument` als kanonischer Prompt-AST zwischen Resolved State,
  Profile Layout und Renderer verwendet wird,
- alle Laufzeitwerte über injizierte Runtime-Provider bezogen werden und die
  deterministischen Reproduzierbarkeitstests bestehen,
- „Neu“ ein zusätzliches Projekt mit erster `create`-Revision atomar anlegt,
  ohne das bisherige Projekt zu überschreiben,
- Plugins ausschließlich über `contracts/core/`, `contracts/plugins/` und die
  type-only API aus `domain/contracts/` kommunizieren,
- UI und Promptlogik vollständig getrennt sind,
- die V500-Oberfläche regressionsgeprüft erhalten bleibt,
- die Single-HTML-Datei offline über `file://` und localhost funktioniert,
- keine Cloud- oder API-Anfrage erfolgt,
- alle Performance-Budgets eingehalten werden,
- Prüfbericht, Testprotokoll, Changelog, Architektur- und Moduldokumentation
  vollständig vorliegen,
- keine bekannten kritischen oder hohen Fehler verbleiben.
