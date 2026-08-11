# SDD Ledger – V600 Phase 1

## Abgeschlossene Tasks

- Task 1: abgeschlossen (`79cb86d`, `14ff489`).
- Task 2: abgeschlossen (`002a01c`).
- Task 3: abgeschlossen und freigegeben (`ff434ef`, `5f93739`).
- Task 4: abgeschlossen; verbindliche Abschlussbasis `b4f97ed`, alle
  Task-4- und Arbeitspaket-A-Gates grün.
- Arbeitspaket A: abgeschlossen.

## Task-4-Verlauf (abgeschlossen)

- Task 4 Basis: `bd921ac`.
- Fixrunde 1: `2b83727`.
- Fixrunde 2 / aktueller HEAD: `ab92b2c`.
- Fixrunde 3 war uncommittet und ging durch OS-Bereinigung des temporären
  Worktrees verloren; fachliche Findings stehen in `task-4-recovery-context.md`.
- Fixrunde 4: aktiv; kein Commit vor unabhängigem Review.
- Fixrunde 4: implementiert und vollständig getestet, aber im unabhängigen
  Review mit `CHANGES_REQUESTED` abgelehnt. Offene Findings: CSP-Markup- und
  Character-Reference-Grenzen, vollständige AST-RHS-/Scope-Auflösung,
  Anchor-Provenance, PNG-Chunk-/Sichtbarkeitsprüfung, Inflate-Ressourcenlimits
  und iterative Aliasauflösung.
- Fixrunde 5: aktiv; neue Regressionstests müssen die reproduzierten Review-
  Probes zunächst RED und nach minimaler Korrektur GREEN nachweisen.
- Fixrunde 5: 30/30 neue Regressionen und vollständige A-Gates grün, im zweiten
  unabhängigen Review dennoch `CHANGES_REQUESTED` wegen sechs weiteren
  reproduzierten Wirksamkeits-/Ressourcengrenzen.
- Fixrunde 6: aktiv; nur die Findings in `task-4-review-round5.md` schließen.
- Fixrunde 6: 26/26 neue Regressionen und vollständige A-Gates grün, im dritten
  unabhängigen Review mit sechs weiteren reproduzierten HTML-/AST-Semantik-
  Findings abgelehnt.
- Fixrunde 7: aktiv; nur `task-4-review-round6.md` schließen.
- Fixrunde 7: 24/24 neue Regressionen und vollständige A-Gates grün, im
  abschließenden Review wegen drei ausführungsrelevanter Script-Tokenizer-/MIME-
  /Async-Reaching-Value-Probes abgelehnt.
- Fixrunde 8: implementiert; die fokale RED-Ausgangslage mit exakt 3/9
  fehlschlagenden Round-8-Probes wurde durch eine minimale Korrektur der
  synchronen Suspensions-/Generator-Erreichbarkeit auf 9/9 GREEN geschlossen.
  Vollständiger Vertrag 176/176, `npm run verify` mit 182/182 Vitest plus 2/2
  Node-Referenztests, Baseline 4/4, Modulgrenzen, Produktions-CSP, Referenz,
  Golden-Manifest, Golden-Capture 216/216 sowie Chromium und WebKit je 11/11
  grün. Browser-Sandboxfehler wurden identisch mit Freigabe wiederholt. Scope
  weiterhin exakt drei versionierte Dateien, HEAD `ab92b2c`, kein Commit/Push;
  unabhängiges Re-Review wurde mit drei reproduzierten Reaching-Value-/HTML-
  Extraktionsfällen als `CHANGES_REQUESTED` abgeschlossen.
- Fixrunde 9: implementiert; neun neue fokale Regressionen schließen
  ausschließlich `task-4-review-round8.md`: Await-/For-Await-Write-Zeitpunkte,
  HTML-zustandsbewusste Script-Extraktion und sequenzielle Generator-Resumption.
  Fokal 9/9, vollständiger Vertrag 185/185, `npm run verify` mit 191/191
  Vitest plus 2/2 Node-Referenztests, Baseline 4/4, Modulgrenzen,
  Produktions-CSP, Referenz, Golden-Manifest, Golden-Capture 216/216 sowie
  Chromium und WebKit je 11/11 grün. Browser-Sandboxfehler wurden identisch mit
  Freigabe wiederholt. Scope weiterhin exakt drei versionierte Dateien, HEAD
  `ab92b2c`, kein Commit/Push; unabhängiges Re-Review steht aus.


- Fixrunde 9: vollständige Gates grün, im unabhängigen Review mit drei
  reproduzierten HTML-Kommentar-/Tagname-/Yield-Fällen abgelehnt.
- Fixrunde 10: aktiv; ausschließlich `task-4-review-round9.md` schließen.
- Fixrunde 10: implementiert; 27 neue fokale Regressionen schließen
  ausschließlich die drei Findings aus `task-4-review-round9.md`: vollständige
  HTML-Tagname-Grenzen einschließlich RAWTEXT/RCDATA/Template/Noscript/Script,
  abrupte Kommentarenden in CSP- und Script-Scanner sowie die Yield-Operand-
  Segmentgrenze. Sieben gleichklassige Review-Probes härten zusätzlich die
  zustandsbewusste Metadata-Extraktion und ungeschlossene Script-/Style-
  Sichttextbereiche bis EOF. Fokal 27/27, vollständiger Vertrag 212/212 (alle
  bisherigen 185 weiterhin grün), `npm run verify` mit 218/218 Vitest plus 2/2
  Node-Referenztests, Baseline 4/4, Modulgrenzen, Produktions-CSP, Referenz,
  Golden-Manifest, Golden-Capture 216/216 sowie Chromium und WebKit je 11/11
  grün. Browser-Sandboxfehler wurden identisch mit Freigabe wiederholt. Scope
  weiterhin exakt drei versionierte Dateien, HEAD `ab92b2c`, kein Commit/Push;
  abschließendes unabhängiges Re-Review ohne Findings, bereit zur Freigabe.

- Fixrunde 10: vollständige Gates grün, unabhängiges Review mit einem
  reproduzierten SVG-CDATA-Metadatenfinding abgelehnt.
- Fixrunde 11: aktiv; ausschließlich `task-4-review-round10.md` schließen.
- Fixrunde 11: implementiert; sechs fokale SVG-/MathML-CDATA-Verträge wurden
  zunächst in zwei RED-Gruppen mit 4/4 und 2/2 Fehlern sowie nach
  zustandsbewusster Fremdinhalt-/CDATA-Behandlung 6/6 GREEN nachgewiesen.
  Ohne echtes Build-Metadatenelement entstehen alle drei Metadatenfehler;
  echte Elemente außerhalb geschlossenen Fremdinhalts bleiben erkennbar und
  CDATA-interne Template-Endtag-Lookalikes bleiben inert. Komplexe
  Integrations-/Breakout-/Script-Fälle brechen konservativ fail-closed ab.
  Vollvertrag 218/218, `npm run verify` mit 224/224 Vitest plus 2/2
  Node-Referenztests, Baseline 4/4, Modulgrenzen,
  Produktions-CSP, Referenz, Golden-Manifest, Golden-Capture 216/216 sowie
  Chromium und WebKit je 11/11 grün. Browser-Sandboxfehler wurden identisch
  mit Freigabe wiederholt. Scope weiterhin exakt drei versionierte Dateien,
  HEAD `ab92b2c`, kein Commit/Push; unabhängiges Re-Review steht aus.

- Fixrunde 11: vollständige Gates grün, unabhängiges Review mit fünf
  reproduzierten Foreign-Content-/Script-/Generator-/Closure-Findings abgelehnt.
- Fixrunde 12: aktiv; ausschließlich `task-4-review-round11.md` schließen.
- Fixrunde 12: implementiert; 18 fokale Regressionen schließen ausschließlich
  die fünf Findings aus `task-4-review-round11.md`: CSP-Fremdinhalt/CDATA im
  Template, echtes Foreign-Content-Self-Closing-Flag, getrennte Escaped-/
  Double-Escaped-Dashzustände in beiden Scannern, statisch begrenzte
  `yield*`-Resumptions und invocation-zeitliche globale Bindungsauflösung für
  klassische Cross-Script-Closures ohne Top-Level-Rückwirkung. Die fünf
  RED-Gruppen waren 2/2, 4/4, 2/2, 2/3 und 1/2 rot; anschließend fokal 13/13
  grün. Das unabhängige Handoff-Review fand zwei weitere wichtige Randfälle:
  Slash im unquotierten Attributwert und eine vor `yield*` mutierte
  `const`-Arrayidentität. Zusätzliche RED-Gruppen mit 4/4 und 1/1 Fehlern
  wurden durch Attributzustandsautomaten in beiden Parsern und konservative
  Delegatenbegrenzung geschlossen. Final fokal 18/18 und Vollvertrag 236/236
  grün (alle bisherigen 218 weiterhin grün). `npm run verify` bestand mit
  242/242 Vitest plus 2/2 Node-Referenztests;
  Baseline 4/4, Modulgrenzen, Produktions-CSP, Referenz, Golden-Manifest,
  Golden-Capture 216/216 sowie Chromium und WebKit je 11/11 sind grün.
  Browser-Sandboxfehler wurden identisch mit Freigabe wiederholt. Scope
  weiterhin exakt drei versionierte Dateien, HEAD `ab92b2c`, kein Commit/Push;
  unabhängiges Re-Review abschließend `NO_FINDINGS`.

- Formaler Abschluss: Task 4 und Arbeitspaket A am 2026-08-11 auf Basis des
  Checkpoints `b4f97ed` abgeschlossen. Task 5, Arbeitspaket B und Phase 2
  wurden nicht begonnen.

## Verbindliche Gates

- Red-Green-Refactor.
- Nur der definierte Task-4-Scope.
- Vollständige Arbeitspaket-A-Regression.
- Unabhängiges Re-Review.
- Commit und Push nur bei vollständig grünem Gate.
