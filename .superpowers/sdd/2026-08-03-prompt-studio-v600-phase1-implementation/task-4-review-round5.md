# Task 4 – Unabhängiges Review Fixrunde 5

Urteil: `CHANGES_REQUESTED`

## Reproduzierte Findings

1. CSP: Character-Data im Head, zweite Policy im `after head`, `noframes`-
   RAWTEXT, verschachteltes scripting-enabled `noscript` und ressourcenladendes
   `imagesrcset` wurden nicht browserwirksam modelliert. Für jeden Probe ist
   ein eigener Regressionstest erforderlich.
2. Ein Script mit `data-type="text/plain"` wurde wegen ungenauer
   Attributerkennung fälschlich übersprungen. Scriptattribute müssen nach
   exaktem HTML-Attributnamen samt Character-References, First-Attribute-
   Semantik und fail-closed Duplikaten ausgewertet werden.
3. `let`-Writes nach einem Download-Sink machten rückwirkend dessen statischen
   Wert dynamisch. Reaching Values müssen am Referenzindex ausgewertet werden;
   Destructuring- und Loop-Writes sind einzubeziehen.
4. Separate Modul-Scripts wurden in einen Scope verklebt; Import-Bindings
   wurden nicht als lokale Bindings erkannt. Module getrennt analysieren,
   klassische Script-Global-Semantik bewusst behandeln, alle Importformen als
   lexikalische Bindings registrieren.
5. Eine einzige farbige horizontale Pixelzeile bestand die PNG-Variation.
   Sichtbare Mindestflächenabdeckung und Verteilung über beide Achsen fordern;
   einzelne Zeilen/Spalten/dünne Kanten negativ testen.
6. Evidenztext/Base64 wurden vor Größenprüfung vollständig gelesen/dekodiert.
   Dateigröße und codierte Länge vor Lesen/Dekodieren begrenzen sowie
   Chunkanzahl beziehungsweise Zero-Length-IDAT-Amplifikation deckeln.

## Gate

Alle sechs Findings zuerst RED nachweisen, dann minimal und robust GREEN
schließen. Der versionierte Scope bleibt exakt bei den drei freigegebenen
Task-4-Dateien. Keine Gate-/Assertionslockerung und kein Commit vor erneutem
unabhängigem Review.

