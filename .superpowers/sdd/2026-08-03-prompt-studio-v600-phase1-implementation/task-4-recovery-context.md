# Task 4 – Recovery Context

## Verbindlicher Ausgangspunkt

- Branch: `codex/v600-phase1-foundation`
- HEAD: `ab92b2c`
- Task 1 und Task 2 sind abgeschlossen.
- Task 3 ist freigegeben.
- Task 4 wird ohne Plan-, Architektur- oder Spezifikationsänderung fortgesetzt.
- V500-Referenzdateien und sämtliche Phase-2-Dateien bleiben unverändert.

Ein früherer uncommitteter Fix-Zwischenstand ging durch die Bereinigung eines
temporären Worktrees verloren. Die folgenden fachlich bereits eingegrenzten
Punkte sind deshalb testgetrieben ab `ab92b2c` wiederherzustellen.

## Erlaubter Änderungsscope

Nur diese drei versionierten Dateien dürfen geändert werden:

- `scripts/verify-csp.mjs`
- `scripts/verify-source-integrity.mjs`
- `tests/contracts/reference-debt.contract.test.ts`

Kein Commit vor dem unabhängigen Review.

## Noch offene Review-Findings

### 1. Effektive CSP-Meta-Policy

Der CSP-Verifier akzeptiert ausschließlich genau eine wirksame frühe
`<meta http-equiv="Content-Security-Policy">` innerhalb des echten `<head>`.
Er ignoriert Schein-Tags in Kommentaren, Raw-Text von `script`/`style`, inertem
`template`/`noscript` und im `body`. Eine Policy nach Script-, Style- oder
ressourcenladendem Inhalt schlägt fehl. Malformed, quoted/unquoted und doppelte
relevante Attribute müssen fail-closed behandelt werden.

### 2. Lexikalische statische Bindungsauflösung

Die statische Scriptauflösung muss am jeweiligen Sink-Index lexikalisch und
scope-bewusst arbeiten. `const`-Shadowing sowie Alias-Zyklen dürfen weder
Endlosschleifen noch globale Fehlauflösung verursachen. Ein äußerer ungültiger
V500-DOM-Label- oder Exportname darf nicht durch eine innere gleichnamige
Konstante beziehungsweise einen Alias-Zyklus verdeckt werden.

### 3. Anchor-spezifische Exportdateinamen

Exportdateinamen werden nur in echten Anchor-/Download-Kontexten geprüft, die
statisch an `document.createElement('a')` gebunden sind. Lokale Anchor-Aliase,
Bracket-Zugriff auf `download` und `setAttribute('download', ...)` müssen
erkannt werden. `settings.download = 'notes.json'` sowie `setAttribute` auf
Nicht-Ankern dürfen keinen Fehlalarm auslösen.

### 4. Strukturelle PNG-Evidenzvalidierung

Die iPhone-Evidenz bleibt exakt eine Markdown-Datei gemäß Task-19-Grenze; die
Screenshots bleiben eingebettete Data-URIs. Akzeptiert werden nur strukturell
valide PNGs mit:

- korrekter Signatur,
- gültigen Chunk-Grenzen und CRCs,
- exakt einem gültigen IHDR,
- mindestens 640 × 1000 Pixeln im Hochformat,
- 8 Bit RGB oder RGBA, ohne Interlacing,
- IDAT und IEND,
- erfolgreich inflatebaren IDAT-Daten,
- korrekter Scanline-Länge und gültigen Filterbytes,
- nichttrivialer Bildvariation,
- unterschiedlichen Payload-Hashes für Safari und Viewer.

1×1, Magic-only, abgeschnittene Daten, fehlerhafte CRC, JPEG/WebP und identische
Screenshots müssen fehlschlagen. Der positive Vertragstest erzeugt zwei
deterministische valide PNGs zur Laufzeit ausschließlich in einer temporären
Fixture; keine zusätzlichen Repository-Dateien.

## Bekannter vorheriger Teststand

- CSP-State-Parser: 12/12 grün.
- Scope-/Anchor-Auflösung: 15/15 grün.
- PNG-Evidenzvalidator: erwartete RED-Tests vorhanden, Implementierung offen.

Dieser Stand ist durch neue RED-Tests erneut nachzuweisen, anschließend GREEN
und Refactor. Danach alle Task-4- und Arbeitspaket-A-Gates vollständig ausführen.

