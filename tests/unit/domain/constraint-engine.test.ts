import { describe, expect, it } from "vitest";

import type { ConstraintProvider } from "../../../src/domain/contracts/constraints/provider";
import { ConstraintEngine } from "../../../src/domain/engines/constraint-engine";
import { createResolvedStateBuilder } from "../../../src/domain/engines/resolved-state-builder";
import { createFixedRuntime } from "../../helpers/fixed-runtime";

function provider(id: string, rules: ConstraintProvider["rules"]): ConstraintProvider {
  return { id, sourcePluginId: id, version: "1.0.0", rules };
}

describe("ConstraintEngine", () => {
  it("resolves named phases independently of provider registration order and records every rule source", async () => {
    const runtime = createFixedRuntime().runtime;
    const providers = [
      provider("z.camera", () => [{
        id: "camera.from-subject",
        version: "1.0.0",
        sourcePluginId: "z.camera",
        phase: "constraints",
        conflictStrategy: "reject",
        description: "Derives camera framing from the subject.",
        evaluate: () => [{ path: "camera.framing", sourceField: "subject", value: "portrait" }],
      }]),
      provider("a.safety", () => [{
        id: "safety.from-subject",
        version: "1.0.0",
        sourcePluginId: "a.safety",
        phase: "validation",
        conflictStrategy: "reject",
        description: "Derives safety mode from the subject.",
        evaluate: () => [{ path: "safety.mode", sourceField: "subject", value: "safe" }],
      }]),
    ];
    const engine = new ConstraintEngine({ runtime, stateBuilder: createResolvedStateBuilder() });

    const first = await engine.resolve({ subject: "Ada" }, providers);
    const second = await engine.resolve({ subject: "Ada" }, [...providers].reverse());

    expect(first).toEqual(second);
    expect(first.values).toEqual({ camera: { framing: "portrait" }, safety: { mode: "safe" } });
    expect(first.trace.entries).toEqual([
      expect.objectContaining({ path: "camera.framing", ruleId: "camera.from-subject", sourceField: "subject", pluginVersion: "1.0.0" }),
      expect.objectContaining({ path: "safety.mode", ruleId: "safety.from-subject", sourceField: "subject", pluginVersion: "1.0.0" }),
    ]);
    expect(first.stateHash).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("uses the declared conflict strategy instead of registration order", async () => {
    const engine = new ConstraintEngine({
      runtime: createFixedRuntime().runtime,
      stateBuilder: createResolvedStateBuilder(),
    });
    const first = provider("a.first", () => [{
      id: "first", version: "1.0.0", sourcePluginId: "a.first", phase: "constraints", conflictStrategy: "preserve", description: "First value.",
      evaluate: () => [{ path: "camera.mode", sourceField: "subject", value: "first" }],
    }]);
    const second = provider("b.second", () => [{
      id: "second", version: "1.0.0", sourcePluginId: "b.second", phase: "constraints", conflictStrategy: "replace", description: "Replacement value.",
      evaluate: () => [{ path: "camera.mode", sourceField: "subject", value: "second" }],
    }]);

    const result = await engine.resolve({ subject: "Ada" }, [second, first]);

    expect(result.values).toEqual({ camera: { mode: "second" } });
    expect(result.trace.entries).toHaveLength(1);
    expect(result.trace.entries[0]).toMatchObject({ ruleId: "second", path: "camera.mode" });
  });

  it("passes only the already resolved immutable values into later rules", async () => {
    const engine = new ConstraintEngine({
      runtime: createFixedRuntime().runtime,
      stateBuilder: createResolvedStateBuilder(),
    });
    const providerWithTwoPhases = provider("dependent", () => [
      {
        id: "subject.base", version: "1.0.0", sourcePluginId: "dependent", phase: "facts", conflictStrategy: "reject", description: "Initial resolved value.",
        evaluate: () => [{ path: "subject.kind", sourceField: "subject", value: "person" }],
      },
      {
        id: "subject.derived", version: "1.0.0", sourcePluginId: "dependent", phase: "constraints", conflictStrategy: "reject", description: "Derived resolved value.",
        evaluate: (context) => {
          const subject = context.resolvedValues.subject;
          if (subject === null || Array.isArray(subject) || typeof subject !== "object") {
            throw new Error("Expected a resolved subject object");
          }
          return [{ path: "subject.summary", sourceField: "subject", value: subject.kind ?? null }];
        },
      },
    ]);

    const result = await engine.resolve({ subject: "Ada" }, [providerWithTwoPhases]);

    expect(result.values).toEqual({ subject: { kind: "person", summary: "person" } });
  });

  it("rejects ancestor and descendant resolved paths before an unrepresentable trace is created", async () => {
    const engine = new ConstraintEngine({
      runtime: createFixedRuntime().runtime,
      stateBuilder: createResolvedStateBuilder(),
    });
    const conflicting = provider("paths", () => [
      {
        id: "paths.ancestor", version: "1.0.0", sourcePluginId: "paths", phase: "constraints", conflictStrategy: "replace", description: "Writes an ancestor.",
        evaluate: () => [{ path: "subject", sourceField: "subject", value: "Ada" }],
      },
      {
        id: "paths.descendant", version: "1.0.0", sourcePluginId: "paths", phase: "constraints", conflictStrategy: "replace", description: "Writes a descendant.",
        evaluate: () => [{ path: "subject.name", sourceField: "subject", value: "Ada" }],
      },
    ]);

    await expect(engine.resolve({ subject: "Ada" }, [conflicting])).rejects.toThrow(
      /Resolved path conflict: subject and subject\.name/u,
    );
  });

  it("accepts, validates, and canonically traces multiple source facts", async () => {
    const engine = new ConstraintEngine({
      runtime: createFixedRuntime().runtime,
      stateBuilder: createResolvedStateBuilder(),
    });
    const derived = provider("derived", () => [{
      id: "derived.context", version: "1.0.0", sourcePluginId: "derived", phase: "constraints", conflictStrategy: "reject", description: "Combines supplied facts.",
      evaluate: () => [{
        path: "derived.context",
        sourceFields: ["pose.position", "camera.device", "garment.material"],
        value: "combined",
      }],
    }]);
    const input = { camera: { device: "phone" }, garment: { material: "denim" }, pose: { position: "standing" } };

    const state = await engine.resolve(input, [derived]);

    expect(state.trace.entries).toEqual([expect.objectContaining({
      id: "derived.context:derived.context",
      sourceFields: ["camera.device", "garment.material", "pose.position"],
    })]);
    expect(state.trace.entries[0]).not.toHaveProperty("sourceField");
  });

  it("rejects invalid multi-source declarations and unknown source facts", async () => {
    const engine = new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() });
    const resolveAssignment = (assignment: unknown) => engine.resolve(
      { camera: { device: "phone" }, pose: { position: "standing" } },
      [provider("invalid", () => [{
        id: "invalid.sources", version: "1.0.0", sourcePluginId: "invalid", phase: "constraints", conflictStrategy: "reject", description: "Invalid source declaration.",
        evaluate: () => [assignment] as never,
      }])],
    );

    await expect(resolveAssignment({ path: "derived.value", sourceFields: [], value: "x" })).rejects.toThrow(/at least two source fields/u);
    await expect(resolveAssignment({ path: "derived.value", sourceFields: ["camera.device"], value: "x" })).rejects.toThrow(/at least two source fields/u);
    await expect(resolveAssignment({ path: "derived.value", sourceFields: ["camera.device", "camera.device"], value: "x" })).rejects.toThrow(/duplicate source field/u);
    await expect(resolveAssignment({ path: "derived.value", sourceField: "camera.device", sourceFields: ["camera.device", "pose.position"], value: "x" })).rejects.toThrow(/exactly one source declaration/u);
    await expect(resolveAssignment({ path: "derived.value", sourceFields: ["camera.device", "lighting.source"], value: "x" })).rejects.toThrow(/unknown source fact: lighting\.source/u);
  });
});
