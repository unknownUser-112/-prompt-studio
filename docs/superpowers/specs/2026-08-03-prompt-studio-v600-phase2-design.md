# Prompt Studio V600 – Phase 2 Design Specification

Status: **Entwurf – ausdrückliche Freigabe ausstehend**

Datum: 3. August 2026

Zielrelease: `Prompt-Studio-V600.1.0-Phase2-Project-Workspace.html`

## 1. Zweck und Geltungsbereich

Phase 2 macht die in Phase 1 vorbereitete lokale Projektverwaltung sichtbar
und vollständig bedienbar. Die Anwendung erhält einen Project Workspace mit
Dashboard, Projektkarten, Papierkorb, Revisionsoberfläche sowie Storage- und
Recovery-Anzeige. Nach dem Öffnen eines Projekts bleibt der bestehende
zehnstufige Wizard visuell und funktional erhalten.

Diese Spezifikation definiert ausschließlich das Phase-2-Design. Sie ist kein
Implementierungsplan und autorisiert keine Produktionsänderung. Nach ihrem
isolierten Commit endet die Arbeit bis zu einer ausdrücklichen Freigabe.

## 2. Phase-2-Readiness-Bericht

### 2.1 Geprüfter Stand

Geprüfter Repository-HEAD:

`29e86a3` – `docs: record V600 phase 1 approval`

Verbindliche Architekturgrundlage:

`docs/superpowers/specs/2026-08-03-prompt-studio-v600-phase1-design.md`

SHA-256 der aktuellen Phase-1-Spezifikation:

`e95f53e03098c32da01fa27c9c125c7a3a02dc334bbe45f5c0adfda7cf59e60e`

Freigegebene fachliche Inhaltsbasis der Phase-1-Spezifikation:

- Commit `f1baa49ec1280bcf7543469569d5c00091c96a7a`,
- SHA-256 vor Freigabevermerk
  `a9e61232ec11e6f4c57b49f89fa23dbd68a12526a3111e28b39ff4aee44dd140`.

### 2.2 Readiness-Matrix

| Gate | Befund | Status |
|---|---|---|
| Finale Phase-1-Architektur freigegeben | Spezifikation und Freigabevermerk vorhanden | bestanden |
| Finaler Phase-1-Release-Commit | Kein Implementierungs- oder Release-Commit vorhanden | blockiert |
| Arbeitspakete A bis F | Keine Phase-1-Quellen oder Abnahmen vorhanden | blockiert |
| Phase-1-Produktionsartefakt | `Prompt-Studio-V600.0.0-Phase1-Foundation.html` fehlt | blockiert |
| Phase-1-Prüfbericht | fehlt | blockiert |
| Phase-1-Testprotokoll | fehlt | blockiert |
| Phase-1-Changelog | fehlt | blockiert |
| Phase-1-Migrationsbericht | fehlt | blockiert |
| Phase-1-Performancebericht | fehlt | blockiert |
| Verpflichtende Phase-1-Release-Gates | mangels Implementierung nicht ausführbar | blockiert |
| Commands, Queries und ViewModels | nur spezifiziert, nicht implementiert | blockiert |
| Application Services und Repositories | nur spezifiziert, nicht implementiert | blockiert |

### 2.3 Readiness-Entscheidung

Die Phase-1-Architektur ist verbindlich freigegeben, Phase 1 ist jedoch nicht
implementiert oder als Release abgenommen. Damit ist jede
Phase-2-Produktionsimplementierung gesperrt. Zulässig ist ausschließlich die
Vorbereitung dieser Phase-2-Spezifikation.

Vor einem späteren Phase-2-Implementierungsplan muss ein erneuter
Readiness-Check alle blockierten Gates mit konkreten Commits, Artefakten und
Berichten schließen. Eine freigegebene Spezifikation ersetzt keine
Releaseabnahme.

### 2.4 Fremde und unversionierte Dateien

Im Arbeitsbaum befinden sich unversionierte V300-HTML-Dateien, `ai-system/`
und `.DS_Store`-Dateien. Sie sind weder Phase-1-Releasebelege noch Bestandteil
dieser Spezifikation. Sie werden nicht gelesen, verändert, gelöscht, gestaged
oder committed.

### 2.5 Bekannte technische Schulden

Mangels Phase-1-Implementierung können keine neuen Code- oder Laufzeitschulden
bewertet werden. Verbindlich bekannt bleiben die in Phase 1 dokumentierten
V500.6.11-Referenzschulden: veraltete V500.6.10-Anzeige-/Exportmetadaten,
statisch beanstandete Template-IDs und der fehlende reale iPhone-Viewer-Test.
Sie müssen bereits in Phase 1 korrigiert und regressionsgeprüft werden und
dürfen nicht in Phase 2 verschoben werden.

## 3. Verbindliche Ausgangsbasis und Freigabegates

Phase 2 übernimmt unverändert:

- den einzigen Composition Root `bootstrap/`,
- AppCore als Lifecycle-, Registry- und Application-Facade,
- Ports-and-Adapters und alle Importgrenzen,
- Commands, Queries, Application Services und unveränderliche ViewModels,
- IndexedDB-Repositories und Domain-/Persistence-Mapper,
- deterministische Runtime-Provider,
- Plugin- und Diagnosearchitektur,
- Constraint Engine, Resolved State und Prompt-AST,
- alle neun Promptprofile und Golden Master,
- Single-HTML-, Offline-, CSP- und No-Network-Anforderungen.

Eine notwendige Änderung dieser Grenzen erfordert vor der Umsetzung eine
Architecture Decision Record mit Problem, Alternativen, Entscheidung,
Auswirkungsanalyse, angepassten Tests und ausdrücklicher Freigabe. Diese
Spezifikation benötigt keine Aufhebung einer Phase-1-Grenze.

Verbindliche Gates:

1. Diese Spezifikation wird isoliert committed und fachlich freigegeben.
2. Phase 1 wird vollständig implementiert und nach ihren Arbeitspaketen A bis F
   abgenommen.
3. Der erneute Phase-2-Readiness-Check ist vollständig grün.
4. Erst danach darf ein separater Implementierungsplan entstehen.
5. Erst nach Freigabe dieses Plans darf Produktionscode geändert werden.

## 4. Ziele

Phase 2 muss:

1. beim regulären App-Start ein bedienbares Dashboard zeigen,
2. lokale Projekte effizient auflisten, suchen, filtern und sortieren,
3. alle Projektaktionen ausschließlich über Commands und Services ausführen,
4. Soft Delete, Wiederherstellung und bestätigte endgültige Löschung anbieten,
5. den Revisionsverlauf sichtbar und verlustfrei wiederherstellbar machen,
6. Dashboard und Wizard an dieselben Import-/Export-Services anbinden,
7. Storage- und Recovery-Zustände verständlich und datenschutzkonform zeigen,
8. den Wizard sowie sämtliche Promptausgaben unverändert erhalten,
9. über `file://` und localhost vollständig offline funktionieren,
10. neue UI-Funktionen barrierefrei, responsiv und messbar performant liefern.

## 5. Nicht-Ziele

Phase 2 implementiert nicht:

- Charakter-, Outfit-, Szenen-, Prompt- oder Bildbibliotheken,
- eine neue Bildaufnahme oder Vorschaubildgenerierung,
- KI-Wissensdatenbank, Cloud Sync oder Benutzerkonten,
- Mehrbenutzerbetrieb, externe APIs oder Telemetrie,
- Video-Prompting,
- vollständigen visuellen oder textuellen Revisions-Diff-Editor,
- URL-Routing oder eine Serverpflicht,
- grundlegende Neugestaltung des Wizards,
- Änderungen an fachlichen Promptregeln,
- vollständige Datenbanksicherungen, weil Phase 1 dafür keinen freigegebenen
  Backup-Contract definiert.

Ein vollständiger Backup-Export benötigt eine spätere Spezifikation oder eine
freigegebene ADR. Phase 2 bietet den bestehenden Projektimport und
Projektexport sichtbar im Dashboard an.

## 6. Bewertete Architekturansätze

### 6.1 Gewählt: integrierte App Shell mit Query-Projektionen

Eine typisierte App Shell steuert Dashboard, Wizard, Papierkorb, Revisionen,
Recovery und Dialoge. Commands und Queries verwenden die Phase-1-Services und
Repositories. Kompakte IndexedDB-Projektionen beschleunigen Listen, ohne
Projektzustände oder Bild-Blobs vollständig zu laden.

Vorteile:

- wahrt alle Phase-1-Grenzen,
- eine einzige Quelle für Projektmutationen,
- skaliert bei größeren lokalen Projektbeständen,
- bleibt Single-HTML- und `file://`-fähig,
- minimiert neue Abstraktionen durch Wiederverwendung bestehender Ports.

### 6.2 Verworfen: UI greift direkt auf Repositories zu

Dieser Ansatz wäre kürzer, verletzt aber den verbindlichen Datenfluss,
ViewModel-Schutz und die Trennung von UI und Persistence. Er wird nicht
verwendet.

### 6.3 Verworfen: separates Dashboard als zweite Anwendung

Ein zweites Bundle oder eine eigene Dashboard-Datenhaltung würde Lifecycle,
Autosave, Feature Flags und Fehlerbehandlung duplizieren. Es gefährdet das
Single-HTML-Artefakt und wird nicht verwendet.

## 7. Architektur und Datenfluss

Verbindlicher Datenfluss:

```text
UI Event
  -> Command oder Query
  -> Application Service
  -> Repository-Port beziehungsweise Domain-Pipeline
  -> ViewModel Query
  -> ViewModel Mapper
  -> tief unveränderliches ViewModel
  -> Render
```

Die UI kennt ausschließlich:

- Command- und Query-Dispatcher,
- Commands, Queries und Resultate,
- unveränderliche ViewModels,
- aufgelöste Feature-Sichtbarkeit,
- dokumentierte UI-Contracts.

Die UI kennt niemals:

- IndexedDB oder konkrete Repositories,
- Persistence Records,
- Domain-Entitäten,
- Constraint-, Prompt- oder Profilinternas,
- Plugin-Implementierungen,
- Storage-Transaktionen.

Phase 2 erweitert vorhandene Ports. Es entsteht kein zweiter Composition Root,
kein zweiter Event Bus und kein paralleler Projektservice.

## 8. IndexedDB-Erweiterung und Projektionen

### 8.1 Schema-Version

Phase 2 erhöht `prompt-studio-v600` von Schema-Version 1 auf 2. Die Migration
ist eine normale, versionierte Erweiterung innerhalb der freigegebenen
Storage- und Migration-Contracts und keine Änderung der Schichtengrenzen.

Neue interne Object Stores:

- `ProjectCatalog`
- `RevisionCatalog`

Diese Stores sind Infrastrukturprojektionen. Sie erhalten keine eigenen
Application-Repositories. Bestehende `ProjectRepository`- und
`ProjectRevisionRepository`-Ports stellen die benötigten Listenmethoden bereit.
Die versionierten Record-Typen liegen unter
`contracts/storage/projections/` und verwenden ausschließlich Storage-Typen
und primitive Rohwerte. Application Mapper übersetzen sie in validierte
Summary-Modelle und anschließend in ViewModels.

### 8.2 ProjectCatalog

Ein Katalogdatensatz enthält ausschließlich listenrelevante Daten:

```ts
interface ProjectCatalogRecord {
  readonly projectId: string;
  readonly schemaVersion: 2;
  readonly normalizedName: string;
  readonly description: string;
  readonly normalizedDescription: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastOpenedAt: string | null;
  readonly favorite: boolean;
  readonly activeProfileId: string;
  readonly tagIds: readonly string[];
  readonly lastWizardStep: number;
  readonly lifecycleStatus: string;
  readonly previewAssetId: string | null;
}
```

Indizes:

- `updatedAt`,
- `lastOpenedAt`,
- `normalizedName`,
- `createdAt`,
- `favorite`,
- `activeProfileId`,
- `lifecycleStatus`,
- `tagIds` als Multi-Entry-Index.

Ein einziger versionierter Mapper erzeugt den Katalogdatensatz aus der
Project-Entität. Jede Projektmutation aktualisiert `Projects` und
`ProjectCatalog` in derselben Transaktion. Katalogdaten dürfen nie zur
fachlichen Wiederherstellung eines Projekts verwendet werden.

Die rohen Stringwerte für Profil, Lebenszyklus und Revisionsgrund sind
Persistence-Daten. Der Application Mapper validiert und übersetzt sie in die
entsprechenden Domain-String-Literal-Typen. Dadurch importiert
`contracts/storage/` keine Typen aus `domain/contracts/`.

### 8.3 RevisionCatalog

Ein Revisionskatalog enthält:

```ts
interface RevisionCatalogRecord {
  readonly revisionId: string;
  readonly projectId: string;
  readonly sequence: number;
  readonly reason: string;
  readonly createdAt: string;
  readonly parentRevisionId: string | null;
  readonly restoredFromRevisionId: string | null;
  readonly snapshotHash: string;
}
```

Indizes:

- `projectId`,
- `[projectId, sequence]`,
- `createdAt`.

Revision und Revisionskatalog werden atomar erzeugt oder gelöscht. Die
Revisionsliste lädt keine vollständigen Projektsnapshots.

### 8.4 Migration 1 nach 2

Die IndexedDB-`versionchange`-Transaktion:

1. erstellt beide Projektionsstores und Indizes,
2. liest bestehende Projects und ProjectRevisions,
3. erzeugt Projektionen über dieselben Mapper wie der Produktivpfad,
4. validiert Anzahl, IDs, Sequenzen und Hashreferenzen,
5. committed vollständig oder bricht vollständig ab.

Bestehende Records werden weder gelöscht noch still umgedeutet. Bei einem
Fehler bleibt Schema 1 intakt und die Anwendung startet kontrolliert im
Recovery-Modus. Die Migration erhält Unit-, fake-indexeddb- und reale
Browser-Tests sowie einen Migrationsbericht.

Eine Diagnose kann Projektionen aus den autoritativen Stores neu aufbauen. Sie
ist nur über einen kontrollierten Application Service erreichbar und wird nie
von der UI direkt ausgeführt.

## 9. Projektmodell-Erweiterungen

Phase 2 ergänzt Projects um:

- optionale Beschreibung,
- Favoritenstatus,
- `lastOpenedAt`,
- referenzierte `previewAssetId`,
- weiterhin vorhandene Tag-IDs,
- den letzten Wizard-Schritt als validierten Wert 0 bis 9.

Projektname und Beschreibung werden getrimmt. Ein Projektname umfasst 1 bis
120 Unicode-Zeichen, eine Beschreibung höchstens 2.000 Zeichen. Projektnamen
müssen nicht eindeutig sein; die stabile Projekt-ID bleibt Identität. Import
und Duplikation erzeugen dennoch sichtbare, deterministisch nummerierte
Namenszusätze, um Verwechslungen zu vermeiden.

Tags bleiben globale Entitäten mit eindeutigem normalisiertem Slug. Das
Entfernen einer Zuordnung löscht einen dadurch verwaisten Tag nicht
automatisch.

## 10. App-View-State

Primäre Views und Overlays werden getrennt modelliert:

```ts
type PrimaryAppView =
  | { readonly kind: "dashboard" }
  | { readonly kind: "wizard"; readonly projectId: string }
  | { readonly kind: "trash" }
  | { readonly kind: "revision-history"; readonly projectId: string }
  | { readonly kind: "recovery"; readonly reasonCode: string };

type AppOverlay =
  | { readonly kind: "none" }
  | { readonly kind: "import-dialog" }
  | { readonly kind: "export-dialog"; readonly projectId: string }
  | { readonly kind: "confirmation-dialog"; readonly requestId: string };

interface AppViewState {
  readonly primary: PrimaryAppView;
  readonly overlay: AppOverlay;
  readonly navigationEpoch: number;
}
```

`navigationEpoch` steigt bei jeder bestätigten Navigation und verhindert, dass
verspätete Query-Antworten eine neuere View überschreiben. Der Zustand wird
nicht über URLs oder History API gesteuert. `file://` bleibt vollständig
funktionsfähig.

Regulär startet die App im Dashboard. Ein kritischer Recovery-Zustand darf
direkt die Recovery-View öffnen. Das automatische Öffnen des zuletzt aktiven
Projekts ist ausschließlich bei aktivierter Einstellung
`openLastProjectOnStart`, gesundem Storage und gültigem Projekt erlaubt. Die
Einstellung ist standardmäßig `false`.

## 11. UI-Informationsarchitektur

### 11.1 Dashboard

Das Dashboard enthält:

- Kopfbereich mit „Neues Projekt“, Import und Export,
- sichtbaren Storage-/Recovery-Status,
- „Zuletzt bearbeitet“ mit höchstens acht Projekten,
- „Favoriten“ mit höchstens acht Projekten,
- „Alle Projekte“ mit Suche, Filtern, Sortierung und Pagination,
- Navigation zum Papierkorb.

Leere Bereiche zeigen einen konkreten nächsten Schritt statt leerer Karten.
Dashboardaktionen verwenden dieselben Services wie der Wizard.
Wird Export ohne geöffnetes Projekt ausgelöst, zeigt das Export-Overlay eine
über `GetProjectCardPageQuery` geladene Projektauswahl. Erst nach Auswahl wird
`PrepareProjectExportQuery` ausgeführt.

### 11.2 Projektkarten

Eine Projektkarte zeigt:

- Projektname,
- Erstellungs- und Änderungsdatum,
- aktives Promptprofil,
- Favoritenstatus,
- Tags,
- letzten Wizard-Schritt,
- Recovery-, Migrations- oder Speicherproblemstatus,
- optional eine vorhandene referenzierte Vorschau.

Ohne `previewAssetId` entsteht ein deterministischer lokaler CSS-Platzhalter.
Sein Token wird aus dem SHA-256 von `project-placeholder:<projectId>` abgeleitet
und wählt ausschließlich lokale Design-Tokens. Es wird kein Bild generiert.

Vorschau-Blobs sind nie Teil der Dashboard-Listenquery. Sichtbare Karten
fordern vorhandene Assets verzögert über eine Application Query an. Die UI
erstellt und widerruft Objekt-URLs kontrolliert. Nicht sichtbare Karten laden
keine Blobs.

### 11.3 Wizard

Nach Projektöffnung entspricht der Wizard visuell und funktional dem
Phase-1-Release. Eine schmale, V500-kompatible Navigation erlaubt „Projekt
schließen“, Dashboard und Revisionsverlauf, ohne Wizard-Felder oder
Promptausgabe umzubauen.

## 12. Commands

Alle schreibenden Operationen sind serialisierbare, typisierte Commands:

| Command | Wesentliche Payload | Atomare Wirkung |
|---|---|---|
| `CreateProjectCommand` | optionaler Name | Project, erste `create`-Revision, Katalog, aktiver Verweis |
| `OpenProjectCommand` | `projectId` | vorheriger Flush, `lastOpenedAt`, aktiver Verweis |
| `CloseProjectCommand` | `projectId` | Flush vor Dashboardwechsel |
| `RenameProjectCommand` | `projectId`, Name | Project und Katalog |
| `DuplicateProjectCommand` | `projectId` | neue IDs, erste `duplicate`-Revision, Katalog |
| `SetProjectFavoriteCommand` | `projectId`, boolean | Project und Katalog |
| `AssignProjectTagCommand` | `projectId`, Tagname | Tag, Project und Katalog |
| `RemoveProjectTagCommand` | `projectId`, `tagId` | Project und Katalog |
| `MoveProjectToTrashCommand` | `projectId` | Flush, Trash, Katalog, aktiver Verweis |
| `RestoreProjectFromTrashCommand` | `trashEntryId` | Project, Katalog und Trash |
| `PermanentlyDeleteProjectCommand` | `trashEntryId`, Bestätigung | Trash, Revisionen, Historie, Settings, Assetreferenzen |
| `RestoreRevisionCommand` | `projectId`, `revisionId` | Project, neue `restore`-Revision und beide Kataloge |
| `ImportProjectCommand` | validierter Importkandidat | Project, Revision, Katalog und Importbericht |
| `SetOpenLastProjectOnStartCommand` | boolean | typisierte Einstellung |

Command-Handler prüfen Payloads erneut. UI-Validierung ist keine
Sicherheits- oder Integritätsgrenze. Gleichzeitige Navigation und destruktive
Commands werden pro Projekt serialisiert; erneute Auslösung erzeugt keine
doppelten Records oder Events.

Ohne expliziten Namen verwendet `CreateProjectCommand` den von der
versionierten Phase-1-Project-Factory gelieferten Standardnamen und ergänzt bei
einer sichtbaren Namenskollision deterministisch eine laufende Nummer. Events
für Create, Open, Rename, Favorite, Tag, Trash, Restore, Permanent Delete,
Revision Restore und Import werden ausschließlich nach erfolgreichem Commit
veröffentlicht.

## 13. Queries

Read-only Queries:

- `GetAppShellViewModelQuery`,
- `GetDashboardViewModelQuery`,
- `GetProjectCardPageQuery`,
- `GetProjectPreviewAssetQuery`,
- `GetWizardViewModelQuery`,
- `GetTrashViewModelQuery`,
- `GetRevisionHistoryViewModelQuery`,
- `GetStorageStatusViewModelQuery`,
- `PrepareProjectExportQuery`,
- `GetImportReportViewModelQuery`.

Queries verändern keine Settings, `lastOpenedAt`-Werte oder Projekte. Das
Öffnen eines Projekts bleibt deshalb ein Command. Query-Ergebnisse sind tief
unveränderlich, enthalten keine Persistence Records und werden anhand von
`navigationEpoch` beziehungsweise Request-ID gegen veraltete Antworten
geschützt.

## 14. ViewModels

### 14.1 AppShellViewModel

Enthält:

- aktuelle Primary View und Overlay,
- aufgelöste Navigation,
- Feature-Sichtbarkeit,
- globalen Storage-Status,
- bereinigte Live-Region-Nachrichten,
- Busy- und Blockierungszustände.

### 14.2 DashboardViewModel

Enthält:

- `recentProjects`,
- `favoriteProjects`,
- paginierte `allProjects`,
- Such-, Filter- und Sortierzustand,
- Ergebnisanzahl und Cursor,
- Empty States,
- Storage-/Recovery-Zusammenfassung,
- verfügbare Aktionen.

### 14.3 ProjectCardViewModel

```ts
interface ProjectCardViewModel {
  readonly id: string;
  readonly name: string;
  readonly descriptionExcerpt: string;
  readonly createdLabel: string;
  readonly updatedLabel: string;
  readonly profileLabel: string;
  readonly favorite: boolean;
  readonly tags: readonly TagChipViewModel[];
  readonly lastWizardStepLabel: string;
  readonly health: "normal" | "warning" | "recovery" | "storage-error";
  readonly preview:
    | { readonly kind: "placeholder"; readonly token: string }
    | { readonly kind: "asset"; readonly assetId: string; readonly alt: string };
  readonly actions: readonly ProjectActionViewModel[];
}
```

### 14.4 Weitere ViewModels

- `TrashViewModel` enthält kompakte Trash-Karten und Löschaktionen.
- `RevisionHistoryViewModel` enthält Revisionsmetadaten, niemals Snapshots.
- `StorageStatusViewModel` enthält ausschließlich technische Zustände und
  bereinigte Empfehlungen.
- Dialog-ViewModels enthalten Titel, Beschreibung, sichere Schaltflächen,
  Bestätigungsanforderung und Fokusziel.

Kein ViewModel enthält Promptinhalte, vollständige Projektzustände,
ImageAsset-Blobs in Listen oder technische IndexedDB-Fehlerobjekte.

## 15. Projektaktionen und Navigation

### 15.1 Neues Projekt

`CreateProjectCommand` übernimmt vollständig die in Phase 1 definierte
„Neu“-Semantik. Ausstehende Änderungen werden zuerst geflusht. Neues Project,
erste `create`-Revision, Katalogdatensätze und aktiver Projektverweis werden
atomar gespeichert. Erst danach öffnet der neue Wizard. Das bisherige Projekt
bleibt vollständig erhalten.

Bei Flush-, Validierungs-, Quota- oder Commitfehlern bleibt die aktuelle View
unverändert und es entsteht kein partielles Projekt.

### 15.2 Projekt öffnen und wechseln

Der serialisierte Ablauf lautet:

1. Navigation sperren und Fokusauslöser merken.
2. Ausstehenden Autosave des aktuell geöffneten Projekts flushen.
3. Zielfprojekt und Katalogkonsistenz lesen und validieren.
4. WizardViewModel des Ziels für dessen letzten Schritt erzeugen.
5. `lastOpenedAt` in Project und ProjectCatalog sowie den aktiven
   Projektverweis atomar aktualisieren.
6. Nach Commit die View wechseln, Scrollposition kontrolliert setzen und Fokus
   auf die Wizardüberschrift verschieben.

Ein nicht behebbarer Flush- oder Lesefehler blockiert den Wechsel. Ein
„Trotzdem wechseln“-Pfad mit möglichem Datenverlust existiert nicht.

### 15.3 Projekt schließen

Schließen flusht ausstehende Änderungen und wechselt danach zum Dashboard. Der
persistente aktive Projektverweis darf als zuletzt aktives Projekt erhalten
bleiben und wird nur bei aktivierter Opt-in-Einstellung automatisch geöffnet.
Schlägt der Flush fehl, bleibt der Wizard geöffnet.

### 15.4 Umbenennen, Favorit und Tags

Umbenennen validiert den Namen und aktualisiert Project sowie Katalog atomar.
Favoritenstatus und Tagzuordnungen aktualisieren dieselben Stores. Ein neuer
Tag wird anhand seines normalisierten Slugs wiederverwendet oder in derselben
Transaktion angelegt. Events werden erst nach Commit veröffentlicht.

### 15.5 Duplikation

Duplikation verwendet ausschließlich die Phase-1-Semantik:

- neue Project- und Revisions-IDs,
- tiefe Kopie des Fachzustands,
- neue erste Revision mit Grund `duplicate`,
- referenzierte statt kopierte ImageAssets,
- deterministischer Name „<Name> Kopie“, „<Name> Kopie 2“ und so weiter.

## 16. Suche, Filter und Sortierung

### 16.1 Suchnormalisierung

Suche umfasst Projektname, Beschreibung und aufgelöste Tagnamen. Eingaben
werden getrimmt, Unicode-NFKC-normalisiert und mit dem injizierten festen
Locale-Kontext kleingeschrieben. Leere Suche liefert alle passenden Projekte.

### 16.2 Filter

Unterstützt werden:

- Favoriten,
- zuletzt bearbeitet,
- Profil,
- Lebenszyklusstatus,
- ein oder mehrere Tags.

Mehrere Filtergruppen werden mit UND, mehrere Werte derselben Gruppe mit ODER
verknüpft. Der ViewModel-Text macht diese Semantik sichtbar.
„Zuletzt bearbeitet“ bedeutet `updatedAt` innerhalb der letzten 30 mal 24
Stunden relativ zur injizierten `Clock`; die Grenze wird einmal pro Query als
UTC-Zeitpunkt bestimmt. Lebenszyklusoptionen kommen als opake IDs und Labels
aus der Application Query und sind nicht in der UI hart codiert.

### 16.3 Sortierungen

Unterstützt werden:

- zuletzt geändert absteigend,
- zuletzt geöffnet absteigend, nie geöffnete Projekte zuletzt,
- Name aufsteigend anhand der kanonischen Normalform,
- Erstellungsdatum absteigend.

Gleichstände werden deterministisch durch `projectId` aufgelöst.

### 16.4 Abfrageverhalten

Standardseitengröße ist 50, maximal 100. Filter und Sortierung verwenden
Katalogindizes und stabile Cursor. Suche wird nach 100 ms Eingaberuhe
ausgeführt, ältere Requests werden verworfen. Keine Listenabfrage öffnet
`ImageAssets` oder lädt Projektsnapshots.

## 17. Papierkorb und endgültige Löschung

### 17.1 Soft Delete

Soft Delete flusht ein geöffnetes Projekt, verschiebt den vollständigen
Project-Datensatz in `Trash`, entfernt den ProjectCatalog-Eintrag und bereinigt
einen ungültigen aktiven Projektverweis. Revisionen, Historie und Assets
bleiben bis zur endgültigen Löschung erhalten.

### 17.2 Papierkorb-View

Sie zeigt:

- Projektname,
- Löschzeitpunkt,
- ursprüngliche ID und Metadaten,
- Wiederherstellen,
- endgültig löschen.

Es gibt keine automatische Leerung und keine zeitbasierte Löschung.

### 17.3 Wiederherstellung

Wiederherstellung entfernt den Trash-Eintrag und stellt Project sowie Katalog
atomar mit derselben Projekt-ID wieder her. Existiert diese ID bereits, wird
der Vorgang blockiert und mit einem stabilen Konfliktcode gemeldet; es erfolgt
keine stille ID-Änderung. Favorit, Tags und Revisionen bleiben erhalten.

### 17.4 Endgültige Löschung

Der Bestätigungsdialog nennt den exakten Projektnamen, erklärt die
Unwiderruflichkeit und verlangt eine zweite destruktive Bestätigung. Danach
prüft der Service alle Assetreferenzen.

Eine Multi-Store-Transaktion entfernt:

- den Trash-Eintrag,
- ProjectRevisions und RevisionCatalog,
- GenerationHistory des Projekts,
- projektspezifische Settings,
- Referenzen des Projekts in ImageAssets.

Ein ImageAsset-Blob wird nur gelöscht, wenn nach Entfernung der Projektbezüge
keine andere Entität darauf verweist. Tags bleiben bestehen. Unklare oder
inkonsistente Assetreferenzen blockieren die gesamte Löschung. Es gibt keinen
Teilcommit.

## 18. Revisionsverlauf

`revisionHistoryUi` ist in Phase 2 aktiviert. Die View zeigt:

- Sequenznummer,
- Zeitstempel,
- Revisionsgrund,
- Elternrevision,
- Quellrevision einer Wiederherstellung,
- Aktion „Diese Revision wiederherstellen“.

Wiederherstellung überschreibt keine Revision. Nach einem Flush wird der
Zielsnapshot validiert, auf das aktuelle Schema migriert und als aktueller
Fachzustand übernommen. Gleichzeitig entsteht eine neue Revision mit Grund
`restore`, Elternverweis auf die bisher aktuelle Revision und
`restoredFromRevisionId` auf die gewählte Revision.

Projekt-ID, `createdAt`, Favoritenstatus, Tags, Vorschau und `lastOpenedAt`
werden nicht zurückgesetzt. Der im Snapshot versionierte Projektname,
Wizard-Schritt und Promptzustand werden wiederhergestellt. Erst nach Commit
aktualisiert sich der Wizard.

## 19. Import und Export

Dashboard und Wizard verwenden dieselben Application Services.

Unterstützt werden:

- V500-Projektimport,
- V600-Projektimport,
- V600-Projektexport.

Der Importablauf:

1. Größe und Dateityp prüfen.
2. Eingabe als `unknown` parsen und Anwendungssignatur validieren.
3. vollständige versionierte Migration im Speicher ausführen.
4. IDs und Referenzen gegen den Bestand prüfen.
5. bei ID-Kollision immer neue IDs erzeugen und interne Referenzen abbilden.
6. bei Namenskollision einen sichtbaren nummerierten „Import“-Zusatz vergeben.
7. Project, erste `import`-Revision und Kataloge atomar speichern.
8. einen bereinigten Importbericht ausgeben.

Kein Import überschreibt ein bestehendes Projekt. Fehler brechen vor dem
Commit oder die gesamte Transaktion ab. Binäre Asset-Bundles bleiben gemäß
Phase 1 mit `IMPORT_ASSET_BUNDLE_UNSUPPORTED` abgewiesen.

`PrepareProjectExportQuery` erzeugt das deterministische Exportmanifest und
den Inhalt. Ein UI-Downloadadapter erzeugt und widerruft die Blob-URL. Export
verändert weder Projekt noch Revisionshistorie.

## 20. Storage- und Recovery-Anzeige

Ein neuer `StorageEstimatePort` in `contracts/storage/` wird in der
Infrastructure-Schicht implementiert und ausschließlich in `bootstrap/`
komponiert. Er kapselt optionale Browser-Schätzungen; fehlende oder
unzuverlässige Werte bleiben `null` und werden nicht erfunden.

```ts
interface StorageStatusViewModel {
  readonly mode: "persistent" | "recovery";
  readonly health: "healthy" | "warning" | "critical";
  readonly lastConfirmedSaveLabel: string | null;
  readonly autosave: "idle" | "pending" | "saving" | "failed";
  readonly usageBytes: number | null;
  readonly quotaBytes: number | null;
  readonly availableBytes: number | null;
  readonly estimateIsApproximate: boolean;
  readonly recommendExport: boolean;
  readonly message: string;
}
```

Ab 85 Prozent geschätzter Belegung oder nach einem Quota-Schreibfehler ist der
Status mindestens `warning`; ein nicht persistierbarer Schreibpfad ist
`critical`. Schätzwerte werden als ungefähr gekennzeichnet. Bei kritischem
Zustand empfiehlt die UI einen Projektexport.

`availableBytes` wird nur gesetzt, wenn Usage und Quota zuverlässig vorhanden
sind, und entspricht `max(0, quotaBytes - usageBytes)`. Andernfalls bleiben
alle nicht belastbaren Schätzfelder `null`.

Recovery-Modus erlaubt lesenden Zugriff und manuellen Export, aber keine
scheinbar erfolgreichen Schreibaktionen. Projektinhalte, Prompts, Dateinamen
aus Importen oder Blobdaten gelangen nicht in Console- oder Diagnoseausgaben.

## 21. Feature Flags

Phase 2 erweitert den aufgelösten Snapshot:

```ts
interface FeatureFlagSnapshotV2 extends FeatureFlagSnapshot {
  readonly projectDashboard: true;
  readonly projectSearch: true;
  readonly projectTrashUi: true;
  readonly revisionHistoryUi: true;
  readonly characterLibrary: false;
  readonly outfitLibrary: false;
  readonly sceneLibrary: false;
  readonly promptLibrary: false;
  readonly imageLibrary: false;
  readonly cloudSync: false;
  readonly aiKnowledgeBase: false;
}
```

Die vier Phase-2-Funktionen sind im Zielrelease verbindlich aktiv. Die UI liest
keine Flags aus Settings, sondern ausschließlich aufgelöste Sichtbarkeit im
AppShellViewModel. Importdateien können keine Flags aktivieren.

## 22. Visuelles Design und Accessibility

Das Dashboard führt die vorhandene Farbwelt, Typografie, Rundungen,
Oberflächen und Fokusdarstellung fort. Der Wizard bleibt weitgehend identisch
zur autoritativen V500.6.11- beziehungsweise Phase-1-Oberfläche.

Verbindlich sind:

- Landmarken für Header, Navigation und Hauptinhalt,
- semantische Listen beziehungsweise Grid-Beschreibungen für Projektkarten,
- eindeutige zugängliche Namen für Karten- und Menüaktionen,
- vollständige Tastaturbedienung ohne Hover-Zwang,
- sichtbarer Fokus und logische Tab-Reihenfolge,
- Fokusfalle und Fokuswiederherstellung in Dialogen,
- `aria-live`-Status für Speichern, Import, Löschung und Recovery,
- keine ausschließlich farbbasierte Statusvermittlung,
- Touch-Ziele von mindestens 44 mal 44 CSS-Pixeln,
- Einspaltenlayout auf kleinen Smartphones,
- Reduced-Motion ohne informationsrelevante Animation,
- kontrollierte Fokus- und Scrollposition bei Viewwechseln.

Projektkarten verwenden einen primären Öffnen-Button und ein getrenntes,
zugängliches Aktionsmenü. Verschachtelte interaktive Elemente sind verboten.

## 23. Fehlerbehandlung

Erwartbare Fehler verwenden stabile `AppError`-Codes, unter anderem:

- `PROJECT_NOT_FOUND`,
- `PROJECT_FLUSH_FAILED`,
- `PROJECT_SWITCH_BLOCKED`,
- `PROJECT_VALIDATION_FAILED`,
- `PROJECT_RESTORE_ID_CONFLICT`,
- `PROJECT_DELETE_CONFIRMATION_REQUIRED`,
- `PROJECT_PERMANENT_DELETE_FAILED`,
- `ASSET_REFERENCE_INTEGRITY_FAILED`,
- `REVISION_NOT_FOUND`,
- `REVISION_RESTORE_FAILED`,
- `IMPORT_VALIDATION_FAILED`,
- `IMPORT_TRANSACTION_FAILED`,
- `STORAGE_UNAVAILABLE`,
- `STORAGE_QUOTA_WARNING`,
- `STORAGE_QUOTA_CRITICAL`.

Fehler werden an Modulgrenzen bereinigt. Die UI erhält Benutzertext,
Wiederherstellbarkeit und sichere Aktion, aber keine Projektpayloads,
Stacktraces oder IndexedDB-Objekte.

## 24. Prompt- und Regressionskompatibilität

Phase 2 verändert nicht:

- Constraint Engine und Resolved State,
- PromptDocument und Prompt-AST,
- PromptSectionProvider,
- Profilstrategien,
- TextRenderer und JsonRenderer,
- Modellverhalten und Quality Gate,
- Selfie Binding und Open Garment State,
- Additional Person und Character Sheet,
- Adaptive Material Physics und Adaptive Realism,
- Branding, Safety, Kamera und Lichtlogik.

Alle Phase-1-Golden-Master-Ausgaben bleiben bytegleich. Vor Phase-2-Release
laufen alle Phase-1-Tests und die vollständige 24-mal-9-Profilmatrix. Eine
Promptabweichung blockiert den Release und kann nicht als Dashboardänderung
freigegeben werden.

## 25. Performance-Budgets

Alle Phase-1-Budgets einschließlich des Produktionsbundle-Limits von 1,5 MB
bleiben unverändert. Zusätzliche Phase-2-Budgets werden als p95 auf dem
MacBook Pro M3 Max gemessen.

Repräsentativer Bestand:

- 500 aktive Projekte,
- 50 Favoriten,
- 50 Tags,
- 25 Trash-Einträge,
- 100 Revisionen für das geöffnete Projekt,
- 20 referenzierte Vorschauassets, die im Listenbenchmark nicht geladen
  werden.

| Vorgang | p95-Budget |
|---|---:|
| Dashboard nach App-Boot interaktiv, erste 50 Karten | < 250 ms |
| ProjectCatalog-Abfrage für 500 Projekte | < 120 ms |
| 50 Projektkarten rendern | < 100 ms |
| Suche nach Eingaberuhe aktualisieren | < 100 ms |
| Filter oder Sortierung anwenden | < 100 ms |
| Projekt öffnen | < 220 ms |
| Projekt mit erfolgreichem Flush wechseln | < 300 ms |
| Papierkorb öffnen | < 150 ms |
| Revisionsliste mit 100 Einträgen öffnen | < 150 ms |
| Neues Projekt erstellen und öffnen | < 250 ms |

Kaltstart, Warmstart, Schema-Migration und tatsächliches Laden eines
Vorschau-Blobs werden getrennt ausgewiesen. Gemessen wird mit injizierter
`MonotonicClock`; Browser- und Testversion sowie Datenfixture werden im
Performancebericht festgehalten. Eine Budgetänderung benötigt Freigabe.

## 26. Teststrategie

Alle Phase-1-Testgruppen bleiben Pflicht. Zusätzlich gelten:

1. Dashboard-Boot und Rendering.
2. Projekt erstellen.
3. Projekt öffnen und schließen.
4. Projektwechsel mit ausstehendem Autosave.
5. Projekt umbenennen.
6. Projekt duplizieren.
7. Favoriten setzen und entfernen.
8. Tags hinzufügen und entfernen.
9. Suche einschließlich Normalisierung und veralteter Requests.
10. Filter einschließlich kombinierter Semantik.
11. Sortierung und deterministische Gleichstände.
12. Soft Delete.
13. Papierkorb.
14. Wiederherstellung und ID-Konflikt.
15. endgültige Löschung und Bestätigung.
16. Asset-Referenzprüfung beim Löschen.
17. Revisionsliste ohne Snapshot-Laden.
18. Revisionswiederherstellung als neue Revision.
19. Import vom Dashboard.
20. Export vom Dashboard.
21. ID- und Namenskonflikte beim Import.
22. Recovery-Modus.
23. Storage- und Quota-Fehler.
24. Tastaturbedienung und Fokusmanagement.
25. Screenreader-Statusmeldungen.
26. mobile Breakpoints und Touch-Ziele.
27. visuelle Regression des Wizards.
28. No-Network- und CSP-Prüfung.
29. `file://`- und localhost-Prüfung.
30. vollständige 24-mal-9-Promptregression.
31. Phase-1- und Phase-2-Performance-Gates.

Zusätzliche Contract-Tests prüfen:

- keine UI-Imports aus Repositories oder Persistence,
- atomare Project-/Catalog- und Revision-/Catalog-Schreibvorgänge,
- Migration 1 nach 2 und kontrollierten Abbruch,
- keine Blob-Ladevorgänge in Listenqueries,
- Feature Flags nur über ViewModels,
- keine Promptmodule im Phase-2-Änderungsumfang.

Storage-Tests verwenden fake-indexeddb und reale Browser-IndexedDB.
Playwright prüft Chromium und den auf dem Ziel-Mac verfügbaren WebKit-Pfad.

## 27. Arbeitspakete

Diese Pakete definieren nur den Spezifikationsumfang. Konkrete Dateien,
Testreihenfolge und Commits werden erst im später freizugebenden
Implementierungsplan festgelegt.

### A – Phase-1-Readiness und UI-Contracts

- alle Phase-1-Gates erneut prüfen,
- Phase-2-Contracts, Schema-Migration und ViewModel-Grenzen abnehmen.

### B – App-View-State, Commands, Queries und ViewModels

- App Shell und View-State,
- Commands, Queries, Mapper und Fehlerverträge.

### C – Dashboard, Projektliste, Suche, Filter und Sortierung

- Projektionen und Listenqueries,
- Dashboard und Projektkarten,
- Suche, Filter, Sortierung und Vorschau-Lazy-Loading.

### D – Projektaktionen, Papierkorb und endgültige Löschung

- Erstellen, Wechsel, Umbenennen, Duplizieren, Favoriten und Tags,
- Soft Delete, Restore und referenzsichere endgültige Löschung.

### E – Revisionsoberfläche, Import, Export und Recovery

- RevisionCatalog und Revisions-UI,
- gemeinsame Import-/Exportpfade,
- Storage- und Recovery-Anzeige.

### F – Accessibility, Regression, Performance und Release

- Accessibility und mobile/visuelle Regression,
- alle Phase-1- und Phase-2-Gates,
- Produktionsartefakt und vollständiger Lieferumfang.

## 28. Risiken und Gegenmaßnahmen

### Phase 2 wird vor Phase 1 implementiert

Gegenmaßnahme: harter Readiness-Gate mit Release-Commit, Artefakt, Berichten und
vollständiger Phase-1-Abnahme.

### Projektionsstores driften vom autoritativen Zustand ab

Gegenmaßnahme: ein Mapper, atomare Schreibvorgänge, Integritätsdiagnose und
getesteter Rebuild.

### Autosave und Projektwechsel konkurrieren

Gegenmaßnahme: serialisierte Commands, verpflichtender Flush und kein
datenverlustbehafteter Force-Wechsel.

### Endgültige Löschung entfernt gemeinsam verwendete Assets

Gegenmaßnahme: transaktionale Referenzprüfung, Löschung nur bei null
verbleibenden Referenzen und Abbruch bei Inkonsistenz.

### Große Bestände verlangsamen das Dashboard

Gegenmaßnahme: kompakte Projektionen, Indizes, Cursor, Pagination, Lazy Loading
und verbindliche 500-Projekte-Benchmarks.

### Dashboard verändert den Wizard oder Prompts

Gegenmaßnahme: getrennte ViewModels, unveränderte Promptmodule, visuelle
Wizard-Regression, Golden Master und 24-mal-9-Matrix.

### Storage-Schätzungen täuschen Genauigkeit vor

Gegenmaßnahme: optionale Werte, Kennzeichnung als ungefähr und Vorrang realer
Schreibfehler vor Schätzwerten.

### Single-HTML-Budget wird überschritten

Gegenmaßnahme: keine UI-Frameworks, bestehende Tokens und Komponenten,
esbuild-Metadatenanalyse und unverändertes 1,5-MB-Gate.

## 29. Lieferumfang nach vollständiger Umsetzung

1. `Prompt-Studio-V600.1.0-Phase2-Project-Workspace.html`
2. vollständiger Prüfbericht
3. Testprotokoll
4. Changelog
5. aktualisierte Architekturübersicht
6. Dokumentation der Commands, Queries und ViewModels
7. Dokumentation der Projektverwaltung
8. Papierkorb- und Recovery-Dokumentation
9. Performancebericht
10. Migrationsbericht für Schema-Version 2
11. Liste möglicher Verbesserungen für Phase 3

## 30. Definition of Done

Phase 2 ist abgeschlossen, wenn:

- Phase 1 vollständig implementiert und abgenommen ist,
- alle Readiness-Gates nachweislich bestanden sind,
- Dashboard, Wizard, Papierkorb, Revisionen und Recovery über den typisierten
  App-View-State bedienbar sind,
- alle schreibenden Aktionen ausschließlich Commands und Services verwenden,
- UI, Domain und Persistence getrennt bleiben,
- Projects und ProjectCatalog sowie ProjectRevisions und RevisionCatalog atomar
  konsistent bleiben,
- Suche, Filter und Sortierung die definierte Semantik erfüllen,
- endgültige Löschung bestätigt, atomar und assetreferenzsicher ist,
- Wiederherstellung eine neue Revision erzeugt und Historie bewahrt,
- Import niemals bestehende Projekte still überschreibt,
- Storage- und Recovery-Zustände verständlich und datenschutzkonform sind,
- alle neun Promptprofile und Golden Master bytegleich bleiben,
- alle Phase-1- und Phase-2-Tests bestanden sind,
- alle Performance-Budgets eingehalten sind,
- das Single-HTML-Artefakt offline über `file://` und localhost funktioniert,
- keine Netzwerkverbindung oder Cloud/API-Nutzung erfolgt,
- der vollständige Lieferumfang vorliegt,
- keine bekannten kritischen oder hohen Fehler verbleiben.

## 31. Nächste Freigabeentscheidung

Nach Commit dieser Spezifikation endet die Arbeit. Der nächste zulässige
Schritt ist ausschließlich ihre fachliche Prüfung.

Erst nach ausdrücklicher Freigabe darf ein detaillierter Implementierungsplan
erstellt werden. Produktionscode und Arbeitspaket A bleiben bis zur separaten
Freigabe dieses Plans gesperrt.
