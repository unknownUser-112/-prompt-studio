import { describe, expect, it } from "vitest";

import { AppCore } from "../../../src/core/app-core";
import { CommandDispatcher } from "../../../src/core/command-dispatcher";
import { EventBus } from "../../../src/core/event-bus";
import { LifecycleFacade } from "../../../src/core/lifecycle";
import { QueryDispatcher } from "../../../src/core/query-dispatcher";
import { HandlerRegistry } from "../../../src/core/registry";
import { featureFlagSnapshot } from "../../../src/application/view-models/feature-flags";

describe("AppCore", () => {
  it("starts and stops injected lifecycle components exactly once and publishes their health", async () => {
    const calls: string[] = [];
    const registry = new HandlerRegistry();
    const lifecycle = new LifecycleFacade([
      {
        id: "storage",
        async start() {
          calls.push("storage:start");
        },
        async stop() {
          calls.push("storage:stop");
        },
      },
      {
        id: "plugins",
        async start() {
          calls.push("plugins:start");
        },
        async stop() {
          calls.push("plugins:stop");
        },
      },
    ]);
    const core = new AppCore({
      commandDispatcher: new CommandDispatcher(registry),
      lifecycle,
      queryDispatcher: new QueryDispatcher(registry),
      runtime: {
        clock: { now: () => "2026-01-01T00:00:00.000Z" },
        hashProvider: { sha256: async () => "hash" },
        idGenerator: { nextId: () => "id" },
        locale: "en-GB",
        monotonicClock: { nowMilliseconds: () => 0 },
        randomSource: { nextBytes: (length) => new Uint8Array(length) },
        timeZone: "UTC",
      },
    });

    await core.start();
    await core.start();
    expect(core.health).toEqual({ lifecycle: "started" });
    await core.stop();
    await core.stop();

    expect(calls).toEqual([
      "storage:start",
      "plugins:start",
      "plugins:stop",
      "storage:stop",
    ]);
    expect(core.health).toEqual({ lifecycle: "stopped" });
  });

  it("dispatches unique command and query handlers, delivers events in subscription order, and freezes phase-one flags", async () => {
    const registry = new HandlerRegistry();
    registry.registerCommand({
      type: "project.create",
      handle: (command: { readonly payload: { readonly title: string } }) => command.payload.title,
    });
    registry.registerQuery({
      type: "project.by-id",
      handle: (query: { readonly payload: { readonly id: string } }) => query.payload.id,
    });

    await expect(
      new CommandDispatcher(registry).dispatch({
        type: "project.create",
        payload: { title: "Launch" },
      }),
    ).resolves.toBe("Launch");
    await expect(
      new QueryDispatcher(registry).dispatch({
        type: "project.by-id",
        payload: { id: "project-1" },
      }),
    ).resolves.toBe("project-1");
    expect(() =>
      registry.registerCommand({
        type: "project.create",
        handle: () => "duplicate",
      }),
    ).toThrow(/duplicate command/i);
    expect(() =>
      registry.registerQuery({
        type: "project.by-id",
        handle: () => "duplicate",
      }),
    ).toThrow(/duplicate query/i);

    const eventBus = new EventBus();
    const deliveries: string[] = [];
    eventBus.subscribe(async () => {
      await Promise.resolve();
      deliveries.push("first");
    });
    eventBus.subscribe(() => {
      deliveries.push("second");
    });
    await eventBus.publish({
      occurredAt: "2026-01-01T00:00:00.000Z",
      payload: { id: "project-1" },
      type: "project.created",
    });

    expect(deliveries).toEqual(["first", "second"]);
    expect(featureFlagSnapshot).toEqual({
      aiKnowledgeBase: false,
      characterLibrary: false,
      cloudSync: false,
      imageLibrary: false,
      outfitLibrary: false,
      promptLibrary: false,
      revisionHistoryUi: false,
      sceneLibrary: false,
    });
    expect(Object.isFrozen(featureFlagSnapshot)).toBe(true);
  });
});
