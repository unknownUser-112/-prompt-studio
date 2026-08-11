# Task 4 – Unabhängiges Review Fixrunde 6

Urteil: `CHANGES_REQUESTED`

## Reproduzierte Findings

1. CSP-Character-References wurden case-insensitive dekodiert: ungültiges
   `&tab;` passierte wie gültiges `&Tab;`. Named References kontextsensitiv
   und case-sensitive behandeln; `tab/newline` negative und `Tab/NewLine`
   positive Regressionen.
2. `</script/>` beendete RAWTEXT im Scanner nicht und versteckte nachfolgendes
   ausführbares Script. `/` als gültigen End-Tag-Delimiter behandeln.
3. Spätere klassische Script-Bindings shadowten frühere Sinks rückwirkend.
   Klassische Scripts mit gemeinsamem, aber zeitlich korrektem Globalzustand
   sequenziell analysieren; Reverse-Order-Test.
4. Writes in nie aufgerufenen verschachtelten Funktionen vergifteten Top-Level-
   Reaching-Values. Writes dem Ausführungskontext des Sinks zuordnen.
5. `document.createElement('a', {})` wurde wegen optionalem zweiten Argument
   nicht als Anchor erkannt. Ein oder zwei Argumente bei statischem erstem
   `a` akzeptieren und alle drei Download-Sinkformen testen.
6. Normativ wirksames `title` im `after head` wurde als Body-Übergang behandelt.
   Normatives after-head-Set vervollständigen und Regression ergänzen.

## Gate

Alle bestätigten Probes zuerst RED und danach GREEN. Änderungsscope bleibt
exakt die drei Task-4-Dateien; keine Assertionslockerung, kein Commit vor
erneutem unabhängigen Review.

