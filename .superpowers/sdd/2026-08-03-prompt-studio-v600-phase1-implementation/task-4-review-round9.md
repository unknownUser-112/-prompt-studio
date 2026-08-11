# Task 4 – Unabhängiges Review Fixrunde 9

Urteil: `CHANGES_REQUESTED`

## Reproduzierte Findings

1. HTML-Tag-Namen wurden bei `!` verkürzt. Namen enden nur an ASCII-
   Whitespace, `/` oder `>`; Start-/Endtag-Lookalikes in RAWTEXT, RCDATA,
   Template, Noscript und Script regressiv prüfen.
2. Abrupte Kommentarenden `<!-->` und `--!>` wurden in CSP- und Script-
   Scanner bis EOF konsumiert. Browserkommentarzustände in beiden Verifiern
   korrekt modellieren und reale nachfolgende Scripts/Policies testen.
3. Ein Write im unklammerten `yield`-Operanden wurde dem Segment nach der
   Suspension zugeordnet. Operand-Writes einschließlich gleicher Endposition
   gehören vor die Suspension; Writes nach `yield` erst zur nächsten
   Resumption.

## Gate

Alle drei Findings zuerst RED, dann GREEN. Scope bleibt exakt die drei
Task-4-Dateien; kein Commit vor unabhängigem Re-Review.

