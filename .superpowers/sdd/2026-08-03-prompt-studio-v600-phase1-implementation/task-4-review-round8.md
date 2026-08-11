# Task 4 – Unabhängiges Review Fixrunde 8

Urteil: `CHANGES_REQUESTED`

## Reproduzierte Findings

1. `lhs = await rhs` und das Ziel von `for await (lhs of values)` wurden vor
   der Suspension als Write verbucht. Diese Writes liegen nach der Suspension;
   `await (lhs = rhs)` bleibt dagegen vor der Suspension.
2. Ein `<script>`-Lookalike innerhalb `style`-RAWTEXT maskierte ein späteres
   echtes ausführbares Script. Script-Extraktion muss HTML-Zustände verwenden
   und Lookalikes in RAWTEXT/RCDATA sowie inertem Template/Noscript ignorieren.
3. Generatoranalyse modellierte nur die erste `.next()`-Resumption. Statisch
   belegte sequenzielle `.next()`-Aufrufe müssen die jeweiligen Segmente bis
   zum nächsten `yield` synchron ausführen.

## Gate

Alle drei Findings zunächst RED, dann GREEN; bestehende Verträge unverändert.
Versionierter Scope bleibt exakt bei den drei Task-4-Dateien. Kein Commit vor
erneutem unabhängigem Review.

