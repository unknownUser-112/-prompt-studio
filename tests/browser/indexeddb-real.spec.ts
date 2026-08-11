import { build } from "esbuild";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KNOWN_WEBKIT_VERSION = "26.5";
const KNOWN_WEBKIT_REVISION = "2336";
const KNOWN_PLAYWRIGHT_VERSION = "1.62.1";
const WEBKIT_BLOB_ERROR_MESSAGE = "Error preparing Blob/File data to be stored in object store";
const MAPPED_IMAGE_ASSET_ERROR = "ImageAssets put: storage/unknown IndexedDB UnknownError";
const INSTALLED_TOOLCHAIN = readInstalledToolchain();

interface BrowserErrorDetails {
  readonly name: string;
  readonly message: string;
}

interface BlobProbeResult {
  readonly succeeded: boolean;
  readonly requestError: BrowserErrorDetails | null;
  readonly transactionError: BrowserErrorDetails | null;
}

interface BrowserHarness {
  runRepositoryContractSuite(
    factory: IDBFactory,
    databaseName: string,
  ): Promise<{ readonly checks: readonly string[] }>;
  runAtomicTransactionProbe(factory: IDBFactory, databaseName: string): Promise<void>;
}

test("real IndexedDB satisfies the shared repository contract", async ({ browser, page }, testInfo) => {
  const harnessPath = fileURLToPath(new URL("../helpers/indexeddb-harness.ts", import.meta.url));
  const bundle = await build({
    bundle: true,
    format: "iife",
    globalName: "Task10IndexedDbHarness",
    platform: "browser",
    stdin: {
      contents: `export { runRepositoryContractSuite, runAtomicTransactionProbe } from ${JSON.stringify(harnessPath)};`,
      resolveDir: process.cwd(),
      sourcefile: "task10-browser-entry.ts",
    },
    write: false,
  });

  const server = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end("<!doctype html><html><body>Task 10 IndexedDB test</body></html>");
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Task 10 localhost test server did not expose a TCP port");
    }

    await page.goto(`http://127.0.0.1:${address.port}/task10-indexeddb.html`);
    await page.addScriptTag({ content: bundle.outputFiles[0]?.text });

    const databaseName = `prompt-studio-v600-task10-${testInfo.project.name}-repositories`;
    const blobProbe = await runBlobPersistenceProbe(page, `${databaseName}-blob-probe`);
    const browserVersion = browser.version();
    const harness = async (operation: "contract" | "transaction", name: string) => page.evaluate(
      async ({ operation: browserOperation, database: browserDatabase }) => {
        const api = (globalThis as typeof globalThis & { Task10IndexedDbHarness: BrowserHarness })
          .Task10IndexedDbHarness;
        return browserOperation === "contract"
          ? api.runRepositoryContractSuite(globalThis.indexedDB, browserDatabase)
          : api.runAtomicTransactionProbe(globalThis.indexedDB, browserDatabase);
      },
      { operation, database: name },
    );

    try {
      const result = await harness("contract", databaseName) as { readonly checks: readonly string[] };
      expect(result.checks).toHaveLength(19);
      expect(blobProbe.succeeded).toBe(true);
      await harness("transaction", `${databaseName}-atomic-transaction`);
      if (testInfo.project.name === "webkit") {
        console.log("WEBKIT_BLOB_LIMITATION_RESOLVED");
      }
    } catch (error) {
      if (!isKnownWebKitBlobLimitation(
        testInfo.project.name,
        browserVersion,
        INSTALLED_TOOLCHAIN,
        blobProbe,
        error,
      )) {
        throw error;
      }

      await harness("transaction", `${databaseName}-known-external-limitation-transaction`);
      console.log(
        `KNOWN_EXTERNAL_LIMITATION WebKit ${browserVersion} revision ${INSTALLED_TOOLCHAIN.webkitRevision} ` +
        `Playwright ${INSTALLED_TOOLCHAIN.playwrightVersion}: ${WEBKIT_BLOB_ERROR_MESSAGE}`,
      );
    }
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error === undefined ? resolve() : reject(error)));
    });
  }
});

async function runBlobPersistenceProbe(
  page: Parameters<Parameters<typeof test>[1]>[0]["page"],
  databaseName: string,
): Promise<BlobProbeResult> {
  return page.evaluate(async (name) => {
    const errorDetails = (error: DOMException | null): BrowserErrorDetails | null =>
      error === null ? null : { name: error.name, message: error.message };
    const deleteDatabase = (): Promise<void> => new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error(`Delete blocked for ${name}`));
    });

    await deleteDatabase();
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore("ImageAssets", { keyPath: "id" });
        store.createIndex("sha256", "sha256", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    try {
      return await new Promise<BlobProbeResult>((resolve) => {
        const transaction = database.transaction("ImageAssets", "readwrite");
        const request = transaction.objectStore("ImageAssets").put({
          id: "image-blob-probe",
          schemaVersion: 1,
          createdAt: "2026-08-11T08:00:00.000Z",
          updatedAt: "2026-08-11T08:01:00.000Z",
          revision: 0,
          blob: new Blob(["asset"], { type: "image/png" }),
          mimeType: "image/png",
          width: 640,
          height: 480,
          sha256: "image-blob-probe-hash",
          referencedEntityIds: ["project-1"],
        });
        let requestError: BrowserErrorDetails | null = null;
        let transactionError: BrowserErrorDetails | null = null;

        request.onerror = () => {
          requestError = errorDetails(request.error);
        };
        transaction.onerror = () => {
          transactionError = errorDetails(transaction.error);
        };
        transaction.oncomplete = () => resolve({ succeeded: true, requestError, transactionError });
        transaction.onabort = () => resolve({
          succeeded: false,
          requestError,
          transactionError: transactionError ?? errorDetails(transaction.error),
        });
      });
    } finally {
      database.close();
      await deleteDatabase();
    }
  }, databaseName);
}

function isKnownWebKitBlobLimitation(
  projectName: string,
  browserVersion: string,
  toolchain: { readonly playwrightVersion: string; readonly webkitRevision: string },
  blobProbe: BlobProbeResult,
  contractError: unknown,
): boolean {
  const errorMessage = contractError instanceof Error ? contractError.message : String(contractError);
  return projectName === "webkit" &&
    browserVersion === KNOWN_WEBKIT_VERSION &&
    toolchain.playwrightVersion === KNOWN_PLAYWRIGHT_VERSION &&
    toolchain.webkitRevision === KNOWN_WEBKIT_REVISION &&
    blobProbe.succeeded === false &&
    blobProbe.requestError?.name === "UnknownError" &&
    blobProbe.requestError.message.includes(WEBKIT_BLOB_ERROR_MESSAGE) &&
    blobProbe.transactionError?.name === "UnknownError" &&
    blobProbe.transactionError.message.includes(WEBKIT_BLOB_ERROR_MESSAGE) &&
    errorMessage.includes(MAPPED_IMAGE_ASSET_ERROR);
}

function readInstalledToolchain(): { readonly playwrightVersion: string; readonly webkitRevision: string } {
  const require = createRequire(import.meta.url);
  const playwrightPackage: unknown = require("@playwright/test/package.json");
  const playwrightCorePackagePath = require.resolve("playwright-core/package.json");
  const browserManifest: unknown = JSON.parse(
    readFileSync(join(dirname(playwrightCorePackagePath), "browsers.json"), "utf8"),
  );
  const playwrightVersion = readStringProperty(playwrightPackage, "version", "Playwright package version");

  if (!isRecord(browserManifest) || !Array.isArray(browserManifest.browsers)) {
    throw new Error("Playwright browser manifest is invalid");
  }
  const webkit = browserManifest.browsers.find(
    (entry: unknown) => isRecord(entry) && entry.name === "webkit",
  );
  const webkitRevision = readStringProperty(webkit, "revision", "Playwright WebKit revision");
  return { playwrightVersion, webkitRevision };
}

function readStringProperty(value: unknown, key: string, label: string): string {
  if (!isRecord(value) || typeof value[key] !== "string") {
    throw new Error(`${label} is unavailable`);
  }
  return value[key];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}
