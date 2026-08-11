### Task 4: Referenzschulden und Buildintegritätsgates

**Files:**
- Create: `scripts/verify-source-integrity.mjs`
- Create: `scripts/verify-module-boundaries.mjs`
- Create: `scripts/verify-csp.mjs`
- Create: `tests/contracts/reference-debt.contract.test.ts`
- Create: `docs/reports/v500.6.11-reference-debt.md`

**Interfaces:**
- Consumes: V500.6.11-Integritätsbericht und esbuild-Metafile.
- Produces: ausführbare Gates für Versionsmetadaten, Exportnamen, eindeutige statische IDs, Importgrenzen, Zyklen und CSP.

- [ ] **Step 1: Failing Debt-Gates definieren**

Die Contract-Tests müssen V500.6.10-Metadaten, doppelte IDs und fehlende reale mobile Abdeckung als bekannte Referenzschuld klassifizieren, aber im V600-Artefakt als Fehler behandeln.

- [ ] **Step 2: Prüfer implementieren**

`verify-source-integrity.mjs` prüft Versionsstrings, Exportdateinamen, doppelte gerenderte IDs, ungenutzte Exporte und offene Marker. `verify-module-boundaries.mjs` liest den TypeScript-/esbuild-Modulgraphen statt Dateinamenheuristiken. `verify-csp.mjs` parst die finale Policy und verbietet Netzwerkziele.

- [ ] **Step 3: Gates ausführen**

Run:

```bash
npx vitest run tests/contracts/reference-debt.contract.test.ts
node scripts/verify-source-integrity.mjs --baseline
node scripts/verify-module-boundaries.mjs --bootstrap-only
node scripts/verify-csp.mjs dist/Prompt-Studio-V600.0.0-Phase1-Foundation.html
```

Expected: Baselineschulden dokumentiert, V600-Minimalbuild ohne neue Schuld.

- [ ] **Step 4: Commit**

```bash
git add scripts/verify-source-integrity.mjs scripts/verify-module-boundaries.mjs scripts/verify-csp.mjs tests/contracts/reference-debt.contract.test.ts docs/reports/v500.6.11-reference-debt.md
git commit -m "test: enforce V600 source and reference integrity gates"
```

**Work-package A acceptance:** Toolchain, Referenzen, Golden Master und Single-HTML-Minimalbuild sind reproduzierbar; alle A-Tests und bisher verfügbaren V500-Regressionsprüfungen sind grün.

**Work-package A rollback:** Auf den letzten grünen Commit vor A zurücksetzen ist verboten; stattdessen die fehlerhafte A-Teiländerung mit `git revert` rückgängig machen und Referenzmanifeste unverändert erhalten.

---

## Arbeitspaket B – Core, Contracts, Plugin-System und Diagnostik

