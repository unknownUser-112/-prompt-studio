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
});
