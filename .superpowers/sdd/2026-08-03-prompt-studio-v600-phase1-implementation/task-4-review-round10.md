# Task 4 – Unabhängiges Review Fixrunde 10

Urteil: `CHANGES_REQUESTED`

## Reproduziertes Finding

SVG-CDATA wurde am ersten `>` statt an `]]>` beendet. Dadurch konnte ein
innerhalb CDATA liegendes Build-Metadaten-Lookalike als echtes HTML-Script
gezählt werden. SVG/MathML-Fremdinhalt samt CDATA korrekt modellieren oder bei
Ambiguität fail-closed abbrechen. Ohne echtes Metadaten-Script müssen alle drei
Metadatenfehler gemeldet werden.

## Gate

Zuerst fokal RED, anschließend GREEN. Scope bleibt exakt bei den drei
Task-4-Dateien; kein Commit vor unabhängigem Re-Review.

