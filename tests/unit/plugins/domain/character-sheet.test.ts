import { describe, expect, it } from "vitest";

import { characterSheetProvider } from "../../../../src/plugins/character-sheet/rules";
import { cameraProvider } from "../../../../src/plugins/camera/rules";
import { ConstraintEngine } from "../../../../src/domain/engines/constraint-engine";
import { createResolvedStateBuilder } from "../../../../src/domain/engines/resolved-state-builder";
import { createFixedRuntime } from "../../../helpers/fixed-runtime";
import { createCanonicalProjectStateV5Values } from "../../../../src/domain/entities/project-factory";
import { characterSheetSection } from "../../../../src/plugins/character-sheet/sections";

const resolve = (input: unknown) => new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(input, [characterSheetProvider]);
const resolveWithOrder = (input: unknown, reversed = false) => new ConstraintEngine({ runtime: createFixedRuntime().runtime, stateBuilder: createResolvedStateBuilder() }).resolve(
  input,
  reversed ? [cameraProvider, characterSheetProvider] : [characterSheetProvider, cameraProvider],
);

describe("character-sheet plugin", () => {
  it("records an adult character-sheet identity from the supplied facts", async () => {
    const state = await resolve({ character: { age: 29, name: "Ada" } });

    expect(state.values).toEqual({ character: { age: 29, name: "Ada", adult: true } });
    expect(new Set(state.trace.entries.map((entry) => entry.ruleId))).toEqual(new Set(["character-sheet.identity", "character-sheet.adult-status"]));
  });

  it("projects position, gaze, and expression with stable trace metadata", async () => {
    const input = {
      pose: {
        position: "pose.standing",
        gaze: "gaze.left_camera",
        expression: "expression.relaxed",
      },
    };

    const state = await resolve(input);

    expect(state.values).toEqual(input);
    expect(state.trace.entries.map(({ id, path, ruleId, sourceField }) => ({ id, path, ruleId, sourceField }))).toEqual([
      poseTrace("expression"),
      poseTrace("gaze"),
      poseTrace("position"),
    ]);
  });

  it("does not invent missing pose facts and remains independent of provider order", async () => {
    const input = { pose: { position: "pose.standing" } };

    const normal = await resolveWithOrder(input);
    const reversed = await resolveWithOrder(input, true);

    expect(normal.values).toEqual(input);
    expect(reversed).toEqual(normal);
  });

  it("projects all persisted face facts with stable trace metadata", async () => {
    const input = {
      character: {
        faceShape: "faceShape.oval",
        eyeShape: "eyeShape.almond",
        noseShape: "noseShape.straight",
        faceAge: "faceAge.adult",
      },
    };

    const state = await resolve(input);

    expect(state.values).toEqual(input);
    expect(state.trace.entries.map(({ id, path, ruleId, sourceField }) => ({ id, path, ruleId, sourceField }))).toEqual([
      characterTrace("eyeShape"),
      characterTrace("faceAge"),
      characterTrace("faceShape"),
      characterTrace("noseShape"),
    ]);
  });

  it("does not invent absent face facts and resolves them independently of provider order", async () => {
    const input = { character: { faceShape: "faceShape.user" } };

    const normal = await resolveWithOrder(input);
    const reversed = await resolveWithOrder(input, true);

    expect(normal.values).toEqual(input);
    expect(reversed).toEqual(normal);
  });

  it.each(["Deutsch", "English"])("exposes deterministic semantic character fragments without universal headings in %s", async (promptLanguage) => {
    const state = await resolve({ ...createCanonicalProjectStateV5Values(), promptLanguage });
    const first = characterSheetSection.provide(state);
    const second = characterSheetSection.provide(state);
    const fragments = first.flatMap((draft) => draft.fragments ?? []);

    expect(first).toEqual(second);
    expect(fragments.map(({ id }) => id)).toEqual([
      "character.subject",
      "realism.skin",
      "pose.action",
      "character.facial-features",
    ]);
    expect(fragments.every(({ text }) => !/^(PERSON|SUBJECT|HAUTREALISMUS|SKIN REALISM|POSE|GESICHTSMERKMALE|FACIAL FEATURES)\n/u.test(text))).toBe(true);
    expect(fragments.every(({ traceIds }) => traceIds.length > 0)).toBe(true);
    expect(new Set(fragments.flatMap(({ traceIds }) => traceIds))).toEqual(new Set(first.flatMap(({ traceIds }) => traceIds)));
  });
});

function poseTrace(field: string) {
  return {
    id: `pose.${field}:character-sheet.pose-${field}`,
    path: `pose.${field}`,
    ruleId: `character-sheet.pose-${field}`,
    sourceField: `pose.${field}`,
  };
}

function characterTrace(field: string) {
  return {
    id: `character.${field}:character-sheet.${field}`,
    path: `character.${field}`,
    ruleId: `character-sheet.${field}`,
    sourceField: `character.${field}`,
  };
}
