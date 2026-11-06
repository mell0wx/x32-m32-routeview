import { describe, expect, it } from "vitest";
import { parseSceneText } from "@/parsers/x32M32Parser";
import {
  compareScenes,
  comparisonToMarkdown,
  riskHeadline,
  type SceneChange,
} from "@/lib/sceneComparison";
import type { InputChannel, MixerScene } from "@/types/routing";
import sundayService from "./fixtures/sunday-service.scn?raw";
import edgeCases from "./fixtures/edge-cases.scn?raw";

function makeScene(overrides: Partial<MixerScene> & { inputs?: InputChannel[] }): MixerScene {
  return {
    mixerType: "X32/M32",
    fileName: "scene.scn",
    parsedAt: "2026-11-05T00:00:00.000Z",
    status: "Parsed",
    inputs: [],
    buses: [],
    dcas: [],
    outputs: [],
    routingBlocks: [],
    warnings: [],
    unrecognizedLines: [],
    ...overrides,
  };
}

function find(changes: SceneChange[], id: string): SceneChange | undefined {
  return changes.find((change) => change.id === id);
}

describe("compareScenes", () => {
  it("reports identical scenes as identical", () => {
    const a = parseSceneText(sundayService, { fileName: "sunday-service.scn" });
    const b = parseSceneText(sundayService, { fileName: "sunday-service.scn" });
    const comparison = compareScenes(a, b);

    expect(comparison.identical).toBe(true);
    expect(comparison.counts.total).toBe(0);
    expect(riskHeadline(comparison.counts)).toBe("Scenes match — nothing changed.");
  });

  it("diffs the two fixtures and flags removed live channels as high risk", () => {
    const earlier = parseSceneText(sundayService, { fileName: "sunday-service.scn" });
    const later = parseSceneText(edgeCases, { fileName: "edge-cases.scn" });
    const comparison = compareScenes(earlier, later);

    expect(comparison.identical).toBe(false);
    expect(comparison.counts.high).toBeGreaterThan(0);
    expect(find(comparison.changes, "input-3-removed")?.risk).toBe("high");
    expect(find(comparison.changes, "input-3-removed")?.summary).toContain("Acoustic");
    expect(find(comparison.changes, "bus-1-removed")?.risk).toBe("high");
    expect(find(comparison.changes, "output-XLR:1-removed")).toBeDefined();
  });

  it("treats the reverse direction as additions, not removals", () => {
    const earlier = parseSceneText(edgeCases, { fileName: "edge-cases.scn" });
    const later = parseSceneText(sundayService, { fileName: "sunday-service.scn" });
    const comparison = compareScenes(earlier, later);

    expect(find(comparison.changes, "input-3-added")?.risk).toBe("low");
    expect(comparison.changes.some((change) => change.id.endsWith("-removed"))).toBe(false);
  });

  it("flags a main mix turned off as high risk", () => {
    const earlier = makeScene({
      inputs: [{ number: 1, name: "Kick", processing: { mainMix: "ON · -3.0" } }],
    });
    const later = makeScene({
      inputs: [{ number: 1, name: "Kick", processing: { mainMix: "OFF · -oo" } }],
    });
    const comparison = compareScenes(earlier, later);

    expect(find(comparison.changes, "CH 01 Kick-processing-mainMix")?.risk).toBe("high");
    expect(find(comparison.changes, "CH 01 Kick-processing-mainMix")?.detail).toBe("ON · -3.0 → OFF · -oo");
  });

  it("flags a removed enabled send as medium risk and a level tweak as low", () => {
    const earlier = makeScene({
      inputs: [
        {
          number: 1,
          name: "Kick",
          sends: [
            { bus: 1, enabled: true, level: "-12.0", tap: "PRE-FADER" },
            { bus: 2, enabled: true, level: "-6.0", tap: "PRE-FADER" },
          ],
        },
      ],
    });
    const later = makeScene({
      inputs: [
        {
          number: 1,
          name: "Kick",
          sends: [{ bus: 2, enabled: true, level: "-9.0", tap: "PRE-FADER" }],
        },
      ],
    });
    const comparison = compareScenes(earlier, later);

    expect(find(comparison.changes, "CH 01 Kick-send-1-removed")?.risk).toBe("medium");
    expect(find(comparison.changes, "CH 01 Kick-send-2-level")?.risk).toBe("low");
    expect(find(comparison.changes, "CH 01 Kick-send-2-level")?.detail).toBe("-6.0 → -9.0");
  });

  it("flags an output source change as high risk and a rename as low", () => {
    const earlier = makeScene({
      inputs: [{ number: 1, name: "Vox" }],
      outputs: [{ outputType: "XLR", number: 1, source: "Main L" }],
    });
    const later = makeScene({
      inputs: [{ number: 1, name: "Vox Lead" }],
      outputs: [{ outputType: "XLR", number: 1, source: "Bus 3" }],
    });
    const comparison = compareScenes(earlier, later);

    expect(find(comparison.changes, "output-XLR:1-source")?.risk).toBe("high");
    expect(find(comparison.changes, "output-XLR:1-source")?.detail).toBe("Main L → Bus 3");
    expect(find(comparison.changes, "input-1-renamed")?.risk).toBe("low");
  });

  it("flags a gate turned off as medium and a dynamics tweak as low", () => {
    const earlier = makeScene({
      inputs: [{ number: 1, name: "Vox", processing: { gate: "ON · Thr -50.0", dynamics: "ON · Thr -18.0" } }],
    });
    const later = makeScene({
      inputs: [{ number: 1, name: "Vox", processing: { gate: "OFF · Thr -50.0", dynamics: "ON · Thr -24.0" } }],
    });
    const comparison = compareScenes(earlier, later);

    expect(find(comparison.changes, "CH 01 Vox-processing-gate")?.risk).toBe("medium");
    expect(find(comparison.changes, "CH 01 Vox-processing-dynamics")?.risk).toBe("low");
  });

  it("flags a removed live channel as high and a removed unused channel as low", () => {
    const earlier = makeScene({
      inputs: [
        { number: 1, name: "Kick", sends: [{ bus: 1, enabled: true, level: "-6.0" }] },
        { number: 2, name: "Ch 2" },
      ],
    });
    const later = makeScene({ inputs: [] });
    const comparison = compareScenes(earlier, later);

    expect(find(comparison.changes, "input-1-removed")?.risk).toBe("high");
    expect(find(comparison.changes, "input-2-removed")?.risk).toBe("low");
  });

  it("flags DCA membership and routing block changes as medium", () => {
    const earlier = makeScene({
      dcas: [{ number: 1, name: "Drums", assignedChannels: [1, 2] }],
      routingBlocks: [{ blockName: "IN", assignments: ["AN1-8", "AN9-16"] }],
    });
    const later = makeScene({
      dcas: [{ number: 1, name: "Drums", assignedChannels: [1] }],
      routingBlocks: [{ blockName: "IN", assignments: ["AES50A-1-8", "AN9-16"] }],
    });
    const comparison = compareScenes(earlier, later);

    expect(find(comparison.changes, "dca-1-members")?.risk).toBe("medium");
    expect(find(comparison.changes, "routing-IN-changed")?.risk).toBe("medium");
  });

  it("sorts high-risk changes first", () => {
    const earlier = makeScene({
      inputs: [
        { number: 1, name: "A" },
        { number: 2, name: "B", processing: { mainMix: "ON · -3.0" } },
      ],
    });
    const later = makeScene({
      inputs: [
        { number: 1, name: "A Renamed" },
        { number: 2, name: "B", processing: { mainMix: "OFF · -oo" } },
      ],
    });
    const comparison = compareScenes(earlier, later);

    expect(comparison.changes[0].risk).toBe("high");
    expect(riskHeadline(comparison.counts)).toContain("1 high-risk change");
  });
});

describe("comparisonToMarkdown", () => {
  it("writes a shareable report grouped by risk", () => {
    const earlier = makeScene({
      fileName: "last-week.scn",
      inputs: [{ number: 1, name: "Kick", processing: { mainMix: "ON · -3.0" } }],
      outputs: [{ outputType: "XLR", number: 1, source: "Main L" }],
    });
    const later = makeScene({
      fileName: "this-week.scn",
      inputs: [{ number: 1, name: "Kick", processing: { mainMix: "OFF · -oo" } }],
      outputs: [{ outputType: "XLR", number: 1, source: "Bus 3" }],
    });
    const markdown = comparisonToMarkdown(compareScenes(earlier, later));

    expect(markdown).toContain("# Scene Comparison: last-week.scn → this-week.scn");
    expect(markdown).toContain("## Check before service");
    expect(markdown).toContain("main mix changed");
    expect(markdown).toContain("source changed");
  });

  it("says so when scenes match", () => {
    const scene = makeScene({});
    const markdown = comparisonToMarkdown(compareScenes(scene, scene));

    expect(markdown).toContain("No differences were found");
  });
});
