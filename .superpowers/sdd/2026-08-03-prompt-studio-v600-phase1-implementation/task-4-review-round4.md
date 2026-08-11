# Task 4 – Unabhängiges Review Fixrunde 4

Urteil: `CHANGES_REQUESTED`

## Reproduzierte Findings

1. Der CSP-Scanner akzeptierte einen Head nach geöffnetem Body, `< head>`,
   CSP-Scheinmarkup in CDATA/Bogus-Comment, eine zweite Policy mit
   `Content-Security-Polic&#x79` ohne Semikolon sowie NBSP-Character-References
   als CSP-Whitespace. Gefordert sind HTML-konforme Zustände, ausschließlich
   CSP-konformes ASCII-Whitespace und fail-closed Mehrdeutigkeiten.
2. Die RHS-Auflösung wertete nur das erste Token aus. Ein gültiger String mit
   anschließendem Binary-/Member-/Call-Tail durfte nicht als vollständiger
   statischer Wert gelten.
3. Das Scope-Modell behandelte Loop-Scope, Parameter und `let`-Bindings nicht
   korrekt. Gefordert ist AST-basierte lexikalische Binding-Auflösung mit
   Sink-Index, TDZ-artigem Shadowing und Aliaszyklen.
4. Anchor-Provenance übersah direkte `document.createElement('a')`-Receiver,
   klassifizierte abgeleitete Memberwerte als Anchor und ignorierte lokales
   Shadowing von `document`. Nur direkte Calls und reine lokale Aliase eines
   unüberschatteten globalen `document` sind gültig.
5. PNG-Chunktypen wurden via ASCII-Maskierung fehlinterpretiert; unsichtbare
   RGBA-Variation und extrem spärliche Variation passierten. Rohe Typbytes,
   Reserved-Bit sowie sichtbare und räumlich relevante Variation sind zu
   prüfen.
6. Synchrones Inflate war unbeschränkt. Erwartete Ausgabegröße, Dimensionen,
   Pixel- und Payloadlimits sowie `maxOutputLength` müssen vor dem Inflate
   gesetzt werden.
7. Tiefe Alias-Ketten führten durch Rekursion und Set-Kopien zum Stackoverflow.
   Gefordert ist iterative, zyklussichere Auflösung samt Deep-Chain- und
   Timeout-Test.

## Gate

Jedes Finding erhält einen präzisen Regressionstest. Die neuen Tests müssen
vor der Korrektur RED nachgewiesen werden. Assertions und Pflichtgates dürfen
nicht gelockert werden. Änderungsscope bleibt exakt die drei bereits
freigegebenen Task-4-Dateien. Kein Commit vor erneutem unabhängigen Review.

