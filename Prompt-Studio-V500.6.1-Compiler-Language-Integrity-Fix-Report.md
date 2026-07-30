# Prompt Studio V500.6.1 – Compiler & Language Integrity Fix

## Ergebnis

Die zwei beauftragten Fehlerbereiche wurden gezielt korrigiert. Die bestehenden Quality-Gate-, Reference- und Accordion-Fixes bleiben erhalten.

## Implementierte Änderungen

- Nano Banana Pro verwendet nun einen kompakten autoritativen Compilerpfad:
  - kanonisierter und konfliktbereinigter Projektzustand
  - früher Block `NON-NEGOTIABLE SPECIFICATIONS`
  - genau ein verbindlicher Outfit-und-Material-Block
  - ein Subjekt-, Aufnahme-, Umgebungs-/Licht- und kompakter Realismusblock
- Für Nano Banana Pro werden keine zusätzlichen langen Blöcke `ADAPTIVE MATERIAL PHYSICS`, `ADAPTIVE REALISM` oder `ADAPTIVE PHYSICAL CONTEXT` mehr angehängt.
- Haarphysik wird aus der tatsächlich ausgewählten Frisur abgeleitet. Ein hoher Pferdeschwanz erzeugt keine Zopf-/Braids-Physik.
- Nicht ausgewählte Kleidungsstücke und zusätzliche Schichten werden im autoritativen Outfitpfad nicht ergänzt.
- Das englische Mapping `the strands are locker organized` wurde zu `the strands are loosely organized` korrigiert.
- Englische Restmappings für `locker`, `Viskose`, `Baumwolle`, `Spitze` und `Tüll` wurden bereinigt.
- JSON-Profile werden zuerst geparst. Bei ungültigem JSON entsteht genau ein JSON-Fehler.
- Die Sprachprüfung untersucht in JSON nur natürlichsprachliche Felder (`prompt`, `negativePrompt`, `instructions`, `text`, `content`, `description`).
- Technische Metadaten, Registry-IDs und deutsche UI-Labels außerhalb dieser Felder werden nicht als Sprachfehler gewertet.
- JSON-Sprachfunde enthalten Begriff, Feldpfad und Kontext und werden stabil dedupliziert.
- Die JSON-Vorschau wird formatiert mit `JSON.stringify(parsed, null, 2)`.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis |
|---|---:|
| Gezielte Start-, UI-, Compiler-, JSON- und Integritätstests | 46/46 bestanden |
| Integrierte Selbsttests | 862/862 bestanden |
| Selbsttestfehler | 0 |
| Selbsttestwarnungen | 0 |
| Profilregression, 24 Konfigurationen × 9 Profile | 216/216 ohne Blockierung |
| Laufzeitfehler in der Profilregression | 0 |
| Standard JSON, Deutsch/Englisch | gültig |
| Safe JSON, Deutsch/Englisch | gültig |
| JavaScript-Syntaxprüfung | bestanden |

Die Nano-Banana-Standardausgabe sank im geprüften Vergleich auf 2.872 Zeichen, ohne die verbindlichen Outfit-, Frisur-, Pose- oder Framing-Angaben zu verlieren.

## Abgedeckte Konfliktfälle

- hoher Pferdeschwanz + unzulässige Braids-Physik
- offene Bluse + widersprüchliche geschlossene Bluse
- keine Schichtung + zusätzlich erzeugte Kleidung
- ausgewählter String + automatisch ergänzte Hose
- doppelte Materialbeschreibung
- gleiche verbindliche Eigenschaft in mehreren Promptabschnitten
- `locker organized` gegenüber `loosely organized`
- deutsches Wort im JSON-Promptfeld
- deutsche UI-/Metadaten außerhalb natürlicher JSON-Felder
- ungültiges JSON mit genau einem Fehler

## Verbleibende Risiken

- Die automatisierten UI-Prüfungen liefen in einer isolierten DOM-/Browser-Simulation. Betriebssystemspezifische Zwischenablageberechtigungen wurden nicht auf realer Hardware geprüft.
- Historische adaptive Compilerblöcke bleiben für andere Profile und für Kompatibilität im Quelltext erhalten; der Nano-Banana-Produktionspfad überspringt sie gezielt.

## Integrität

SHA-256:

`619e9a73ec2699d94fa22b8cefa5fba87c6fce14678bec036d8de98e76179199`
