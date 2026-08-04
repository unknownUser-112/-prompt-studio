import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Browser, BrowserContext, Page } from "@playwright/test";

import {
  GOLDEN_PROFILES,
  type GoldenProfile,
  type GoldenProfileId,
} from "./profiles";
import {
  GOLDEN_SCENARIOS,
  type GoldenLanguage,
  type GoldenLocale,
  type GoldenScenario,
} from "./scenarios";

const AUTHORITATIVE_HTML_PATH = resolve(
  "reference/v500.6.11/Prompt-Studio-V500.6.11-Binding-Selfie-Open-Garment-State.html",
);
const AUTHORITATIVE_HTML_URL = pathToFileURL(AUTHORITATIVE_HTML_PATH).href;
const TIMEZONE_ID = "Europe/Berlin";
const AUTHORITATIVE_SOURCE_SHA256 = createHash("sha256")
  .update(readFileSync(AUTHORITATIVE_HTML_PATH))
  .digest("hex");

export interface TargetedRegressionResult {
  readonly id: string;
  readonly ok: boolean;
}

export interface SelfTestSummary {
  readonly passed: number;
  readonly total: number;
  readonly errors: number;
  readonly warnings: number;
  readonly failed: readonly unknown[];
}

export interface GoldenResolvedStateIndicators {
  readonly summary: string;
  readonly resolutions: readonly string[];
  readonly unresolvedConflicts: number;
}

export interface GoldenMatrixEntry {
  readonly scenarioId: string;
  readonly profileId: GoldenProfileId;
  readonly input: Readonly<Record<string, unknown>>;
  readonly profile: {
    readonly id: GoldenProfileId;
    readonly label: string;
    readonly kind: "text" | "json";
  };
  readonly language: GoldenLanguage;
  readonly locale: GoldenLocale;
  readonly timezone: typeof TIMEZONE_ID;
  readonly output: string;
  readonly length: number;
  readonly compactJsonLength: number | null;
  readonly sha256: string;
  readonly maxLength: number;
  readonly released: boolean;
  readonly qualityGateState: string;
  readonly resolvedState: GoldenResolvedStateIndicators;
}

export interface GoldenMatrix {
  readonly schemaVersion: 1;
  readonly referenceVersion: "V500.6.11";
  readonly source: {
    readonly path: string;
    readonly sha256: string;
  };
  readonly timezone: typeof TIMEZONE_ID;
  readonly scenarioCount: number;
  readonly profileCount: number;
  readonly combinationCount: number;
  readonly selfTests: SelfTestSummary;
  readonly scenarioIds: readonly string[];
  readonly profileIds: readonly GoldenProfileId[];
  readonly entries: readonly GoldenMatrixEntry[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredNumber(
  source: Record<string, unknown>,
  key: string,
): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Self-test result ${key} is not a finite number`);
  }
  return value;
}

function parseSelfTestSummary(value: unknown): SelfTestSummary {
  if (!isRecord(value) || !Array.isArray(value.failed)) {
    throw new Error("runSelfTests() returned an invalid result");
  }
  return {
    passed: requiredNumber(value, "passed"),
    total: requiredNumber(value, "total"),
    errors: requiredNumber(value, "errors"),
    warnings: requiredNumber(value, "warnings"),
    failed: value.failed,
  };
}

export class V500Harness {
  readonly #page: Page;
  readonly #networkAttempts: string[];

  constructor(page: Page, networkAttempts: string[]) {
    this.#page = page;
    this.#networkAttempts = networkAttempts;
  }

  assertNoNetwork(): void {
    if (this.#networkAttempts.length > 0) {
      throw new Error(
        `Authoritative V500 attempted network access: ${this.#networkAttempts.join(", ")}`,
      );
    }
  }

  async runTargetedRegression(id: string): Promise<TargetedRegressionResult> {
    const result = await this.#page.evaluate((targetId) => {
      const host = window as unknown as {
        PromptStudioV500?: { V5611_BINDING_TESTS?: unknown };
      };
      const definitions = host.PromptStudioV500?.V5611_BINDING_TESTS;
      if (!Array.isArray(definitions)) {
        throw new Error("V5611_BINDING_TESTS is unavailable");
      }
      const matches = definitions.filter((value: unknown) => {
        return (
          typeof value === "object" &&
          value !== null &&
          "id" in value &&
          value.id === targetId
        );
      });
      if (matches.length !== 1) {
        throw new Error(
          `Expected one browser regression definition for ${targetId}, got ${matches.length}`,
        );
      }
      const definition = matches[0] as Record<string, unknown>;
      if (typeof definition.run !== "function") {
        throw new Error(`Browser regression ${targetId} has no run function`);
      }
      return { id: targetId, ok: definition.run() === true };
    }, id);

    this.assertNoNetwork();
    return result;
  }

  async runSelfTests(): Promise<SelfTestSummary> {
    const raw = await this.#page.evaluate(() => {
      const host = window as unknown as { runSelfTests?: () => unknown };
      if (typeof host.runSelfTests !== "function") {
        throw new Error("Global runSelfTests() is unavailable");
      }
      return host.runSelfTests();
    });
    const summary = parseSelfTestSummary(raw);
    if (
      summary.passed !== 941 ||
      summary.total !== 941 ||
      summary.errors !== 0 ||
      summary.warnings !== 0 ||
      summary.failed.length !== 0
    ) {
      throw new Error(
        `Authoritative self-tests are ${summary.passed}/${summary.total}, ` +
          `${summary.errors} errors, ${summary.warnings} warnings`,
      );
    }
    this.assertNoNetwork();
    return summary;
  }

  async captureScenario(
    scenario: GoldenScenario,
    profiles: readonly GoldenProfile[],
  ): Promise<readonly GoldenMatrixEntry[]> {
    const input = {
      ...scenario.input,
      promptLanguage: scenario.language,
      profile: "Universal",
      step: 9,
    } satisfies Record<string, unknown>;
    const project = {
      application: "Prompt Studio",
      version: "V500.6.11",
      data: input,
    };

    await this.#page.locator("#new").click();
    await this.#page.locator('[data-profile-gate="new"]').click();
    await this.#page.locator("#prompt").waitFor({ state: "detached" });
    await this.#page.locator("#importFile").setInputFiles({
      name: `${scenario.id}.json`,
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(project), "utf8"),
    });
    await this.#page.locator("#prompt").waitFor({ state: "attached" });

    const visibleLanguage = (
      await this.#page
        .locator('[data-dd="promptLanguage"] .compact-value')
        .textContent()
    )?.trim();
    if (visibleLanguage !== scenario.language) {
      throw new Error(
        `Scenario ${scenario.id} rendered language ${visibleLanguage ?? "<missing>"}`,
      );
    }

    const entries: GoldenMatrixEntry[] = [];
    for (const profile of profiles) {
      const button = this.#page.locator(
        `[data-profile="${profile.label}"]`,
      );
      await button.click();
      await this.#page.waitForFunction((profileLabel) => {
        const selected = document.querySelector(
          `[data-profile="${profileLabel}"].active`,
        );
        const prompt = document.querySelector<HTMLTextAreaElement>("#prompt");
        return selected !== null && Boolean(prompt?.value);
      }, profile.label);

      const output = await this.#page.locator("#prompt").inputValue();
      const maxLength =
        scenario.maxLengthByProfile?.[profile.id] ?? profile.maxLength;
      if (output.length > maxLength) {
        throw new Error(
          `${scenario.id}/${profile.id} has ${output.length} characters, max ${maxLength}`,
        );
      }
      const parsedJson =
        profile.kind === "json" ? (JSON.parse(output) as unknown) : undefined;
      const compactJsonLength =
        parsedJson === undefined ? null : JSON.stringify(parsedJson).length;

      const released = await this.#page.locator("#copy").isEnabled();
      const qualityGateState = (
        await this.#page.locator(".quality-gate .gate-state").textContent()
      )?.trim();
      if (!qualityGateState) {
        throw new Error(
          `${scenario.id}/${profile.id} has no rendered quality-gate state`,
        );
      }
      if (profile.kind === "json" && !released) {
        throw new Error(
          `${scenario.id}/${profile.id} is valid JSON but is not released by the authoritative gate`,
        );
      }
      if (!released) {
        const gate = (
          await this.#page.locator(".quality-gate").textContent()
        )?.trim();
        throw new Error(
          `${scenario.id}/${profile.id} was blocked by V500 quality gate: ${gate ?? "unknown"}`,
        );
      }

      const summary = (
        await this.#page
          .locator(".resolved-state-panel summary small")
          .textContent()
      )?.trim();
      if (!summary) {
        throw new Error(`${scenario.id}/${profile.id} has no Resolved State summary`);
      }
      const resolutions = (
        await this.#page
          .locator(".resolved-state-panel .resolution-row")
          .allTextContents()
      ).map((value) => value.trim());
      const unresolvedConflicts = await this.#page
        .locator(".resolved-state-panel .resolution-row.error")
        .count();

      entries.push({
        scenarioId: scenario.id,
        profileId: profile.id,
        input,
        profile: { id: profile.id, label: profile.label, kind: profile.kind },
        language: scenario.language,
        locale: scenario.locale,
        timezone: TIMEZONE_ID,
        output,
        length: output.length,
        compactJsonLength,
        sha256: createHash("sha256").update(output, "utf8").digest("hex"),
        maxLength,
        released,
        qualityGateState,
        resolvedState: { summary, resolutions, unresolvedConflicts },
      });
    }

    this.assertNoNetwork();
    return entries;
  }
}

async function loadAuthoritativePage(
  context: BrowserContext,
  networkAttempts: string[],
): Promise<Page> {
  await context.route(/^(?:https?|wss?):/u, async (route) => {
    networkAttempts.push(route.request().url());
    await route.abort("blockedbyclient");
  });

  const page = await context.newPage();
  await page.goto(AUTHORITATIVE_HTML_URL, { waitUntil: "load" });
  if (page.url() !== AUTHORITATIVE_HTML_URL) {
    throw new Error(`Loaded unexpected V500 URL: ${page.url()}`);
  }
  await page.waitForFunction(() => {
    const host = window as unknown as {
      PromptStudioV500?: { V5611_BINDING_TESTS?: unknown };
    };
    return Array.isArray(host.PromptStudioV500?.V5611_BINDING_TESTS);
  });
  await page.locator('[data-profile-gate="new"]').click();
  await page.locator("#profileGate").waitFor({ state: "hidden" });
  return page;
}

export async function withAuthoritativeV500<T>(
  browser: Browser,
  locale: GoldenLocale,
  run: (harness: V500Harness) => Promise<T>,
): Promise<T> {
  const context = await browser.newContext({
    locale,
    timezoneId: TIMEZONE_ID,
    viewport: { width: 1440, height: 1100 },
  });
  const networkAttempts: string[] = [];
  try {
    const page = await loadAuthoritativePage(context, networkAttempts);
    const harness = new V500Harness(page, networkAttempts);
    const result = await run(harness);
    harness.assertNoNetwork();
    return result;
  } finally {
    await context.close();
  }
}

export async function captureAuthoritativeMatrix(
  browser: Browser,
): Promise<GoldenMatrix> {
  let selfTests: SelfTestSummary | undefined;
  const captured = new Map<string, GoldenMatrixEntry>();

  for (const locale of ["de-DE", "en-US"] as const) {
    const scenarios = (GOLDEN_SCENARIOS as readonly GoldenScenario[]).filter(
      (scenario) => scenario.locale === locale,
    );
    await withAuthoritativeV500(browser, locale, async (harness) => {
      if (!selfTests) selfTests = await harness.runSelfTests();
      for (const scenario of scenarios) {
        const entries = await harness.captureScenario(
          scenario,
          GOLDEN_PROFILES as readonly GoldenProfile[],
        );
        for (const entry of entries) {
          captured.set(`${entry.scenarioId}\u0000${entry.profileId}`, entry);
        }
      }
    });
  }

  if (!selfTests) {
    throw new Error("Authoritative self-tests did not run");
  }
  const entries = (GOLDEN_SCENARIOS as readonly GoldenScenario[]).flatMap(
    (scenario) =>
      (GOLDEN_PROFILES as readonly GoldenProfile[]).map((profile) => {
        const key = `${scenario.id}\u0000${profile.id}`;
        const entry = captured.get(key);
        if (!entry) throw new Error(`Missing captured matrix entry ${key}`);
        return entry;
      }),
  );
  if (entries.length !== 216 || captured.size !== 216) {
    throw new Error(
      `Authoritative matrix has ${entries.length} ordered and ${captured.size} unique entries`,
    );
  }

  return {
    schemaVersion: 1,
    referenceVersion: "V500.6.11",
    source: {
      path: "reference/v500.6.11/Prompt-Studio-V500.6.11-Binding-Selfie-Open-Garment-State.html",
      sha256: AUTHORITATIVE_SOURCE_SHA256,
    },
    timezone: TIMEZONE_ID,
    scenarioCount: GOLDEN_SCENARIOS.length,
    profileCount: GOLDEN_PROFILES.length,
    combinationCount: entries.length,
    selfTests,
    scenarioIds: GOLDEN_SCENARIOS.map(({ id }) => id),
    profileIds: GOLDEN_PROFILES.map(({ id }) => id),
    entries,
  };
}
