# Task 4 – Unabhängiges Review Fixrunde 7

Urteil: `CHANGES_REQUESTED`

## Reproduzierte Findings

1. Script-Data-Escaped-/Double-Escaped-Zustände wurden wie einfaches RAWTEXT
   beendet. Dadurch wurde Schein-CSP gezählt und ausführbares JavaScript nach
   dem Double-Escape-Endübergang übersehen. Beide Scanner müssen für `script`
   die relevanten Tokenizerzustände abbilden; zwei Child-Prozessregressionen.
2. `type="text/javascript; charset=utf-8"` wurde trotz ausführbarer
   JavaScript-MIME-Essence übersprungen. MIME-String parsen und Essence
   vergleichen; bestehende Attribut-/Datenblockregeln erhalten.
3. Generator- und Async-Funktionswrites wurden als synchron vor dem Sink
   ausgeführt behandelt. Nur synchron bis zur Sinkposition erreichbare Writes
   propagieren; Generator ohne `.next()` sowie Async-Write nach `await` negativ
   gegen die bisherige Umgehung testen.

## Gate

Diese drei Findings zuerst fokal RED, anschließend GREEN. Änderungsscope bleibt
exakt die drei Task-4-Dateien; keine Assertionslockerung, kein Commit vor neuem
unabhängigen Review.

