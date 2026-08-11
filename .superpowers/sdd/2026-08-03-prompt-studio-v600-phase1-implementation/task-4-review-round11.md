# Task 4 – Unabhängiges Review Fixrunde 11

Urteil: `CHANGES_REQUESTED`

## Reproduzierte Findings

1. CSP-Lookalike in SVG/MathML-CDATA innerhalb Template wurde wirksam gezählt.
   Foreign-Content-/CDATA-Zustand auch im Template modellieren.
2. Foreign-Content-Self-Closing wurde über `attributes.trim() === '/'`
   fehlklassifiziert. Echtes Self-Closing-Flag beim Tagparsen bestimmen;
   `<svg attr/>` positiv, `<svg / >` negativ.
3. `-->` beendete Double-Escaped-Scriptzustand fälschlich. Escaped- und
   Double-Escaped-Dashzustände in beiden Scannern trennen.
4. `yield*` wurde pauschal als eine Resumption modelliert. Ohne vollständig
   statisch ausgewerteten Delegaten konservativ als nicht begrenzt resumierbar
   behandeln.
5. Closure aus frühem klassischen Script sah später vorhandene globale
   Bindung beim Aufruf nicht. Vollständigen klassischen Deklarationsraum und
   invocation-zeitliche Auflösung modellieren, ohne spätere Bindungen auf
   frühere Top-Level-Sinks rückwirken zu lassen.

## Gate

Alle fünf Findings zuerst RED, dann GREEN. Scope bleibt exakt bei den drei
Task-4-Dateien; kein Commit vor unabhängigem Re-Review.

