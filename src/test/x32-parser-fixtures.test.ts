import { describe, expect, it } from "vitest";
import { parseSceneText } from "@/parsers/x32M32Parser";
import sundayService from "./fixtures/sunday-service.scn?raw";
import edgeCases from "./fixtures/edge-cases.scn?raw";

function categoryNames(scene: ReturnType<typeof parseSceneText>): string[] {
  return (scene.unrecognizedCategories ?? []).map((category) => category.category);
}

describe("parseSceneText with the Sunday service fixture", () => {
  const scene = parseSceneText(sundayService, { fileName: "sunday-service.scn" });

  it("parses the full scene", () => {
    expect(scene.status).toBe("Parsed");
    expect(scene.inputs).toHaveLength(6);
    expect(scene.buses).toHaveLength(3);
    expect(scene.dcas).toHaveLength(2);
    expect(scene.outputs).toHaveLength(7);
    expect(scene.routingBlocks).toHaveLength(2);
    expect(scene.warnings).toEqual([]);
  });

  it("parses channel processing into the processing snapshot", () => {
    const kick = scene.inputs[0];
    expect(kick).toMatchObject({ number: 1, name: "Kick", source: "Local In 1", dcaAssignments: ["Drums"] });
    expect(kick.processing).toMatchObject({
      delay: "ON · 1.5 ms",
      preamp: expect.stringContaining("Gain +0.0"),
      gate: "ON · Thr -50.0",
      dynamics: "ON · Thr -24.0",
      insert: "ON · POST · Sel 1",
      eq: "ON",
      mainMix: "ON · -3.0",
      automix: "OFF · 0.0",
    });
    expect(kick.sends).toEqual([
      { bus: 1, enabled: true, level: "-12.0", pan: "+0", tap: "PRE-FADER" },
      { bus: 11, enabled: true, level: "-20.0", pan: "+0", tap: "POST-FADER" },
    ]);

    const vox = scene.inputs[1];
    expect(vox.dcaAssignments).toEqual(["Vocals"]);
    expect(vox.processing).toMatchObject({
      gate: "OFF · Thr -60.0",
      dynamics: "ON · Thr -18.0",
      insert: "OFF · PRE · Sel 0",
      automix: "ON · 0.5",
    });

    const keys = scene.inputs[3];
    expect(keys.processing).toMatchObject({ dynamics: "OFF · Thr -24.0", mainMix: "OFF · -oo" });

    const pastor = scene.inputs[4];
    expect(pastor.processing).toMatchObject({ automix: "ON · 0.8" });

    expect(scene.inputs[5].processing).toBeUndefined();
  });

  it("keeps bus sends and main mixes apart", () => {
    const acoustic = scene.inputs[2];
    expect(acoustic.processing?.mainMix).toBe("ON · -8.0");
    expect(acoustic.sends).toEqual([{ bus: 5, enabled: true, level: "-10.0", pan: "-10", tap: "PRE-FADER" }]);
  });

  it("categorizes advanced lines instead of dropping them silently", () => {
    const categories = categoryNames(scene);
    for (const expected of [
      "Bus Processing",
      "Matrix Processing",
      "Main/Mono Processing",
      "Aux Channel Processing",
      "FX Return Processing",
      "Output Detail Settings",
      "User Routing",
      "User Controls",
      "Talkback",
      "DP48",
      "Mute Groups",
      "Console Config",
      "Effects Rack",
      "Headamp",
      "Scene Metadata",
    ]) {
      expect(categories).toContain(expected);
    }
    expect(categories).not.toContain("Miscellaneous");
  });

  it("keeps the matrix routing line as a matrix output patch", () => {
    expect(scene.outputs).toContainEqual(
      expect.objectContaining({ outputType: "Matrix", number: "block", source: "MTX1-6" }),
    );
  });
});

describe("parseSceneText with the edge-cases fixture", () => {
  const scene = parseSceneText(edgeCases, { fileName: "edge-cases.scn" });

  it("marks a section-less scene partial", () => {
    expect(scene.status).toBe("Partial");
    expect(scene.inputs).toHaveLength(2);
    expect(scene.buses).toHaveLength(0);
    expect(scene.outputs).toHaveLength(0);
    expect(scene.warnings.some((warning) => warning.includes("Some sections"))).toBe(true);
  });

  it("keeps only the last send when a bus send is repeated", () => {
    expect(scene.inputs[0].sends).toEqual([
      { bus: 1, enabled: true, level: "-30.0", pan: "+0", tap: "PRE-FADER" },
    ]);
    expect(scene.inputs[1].sends).toBeUndefined();
  });

  it("flags genuinely unknown lines as miscellaneous", () => {
    expect(categoryNames(scene)).toContain("Miscellaneous");
    expect(scene.unrecognizedCategories?.find((category) => category.category === "Miscellaneous")?.examples).toEqual([
      "/weird/custom/thing 1 2 3",
    ]);
    expect(scene.warnings.some((warning) => warning.includes("1 uncategorized parser line(s)"))).toBe(true);
  });
});

describe("parseChannelProcessing edge cases", () => {
  it("records EQ state even when the band data is not modeled", () => {
    const scene = parseSceneText('/ch/01/config "X" 1 WH 33\n/ch/01/eq OFF');
    expect(scene.inputs[0].processing?.eq).toBe("OFF");
  });

  it("does not mistake a bus send for a main mix", () => {
    const scene = parseSceneText('/ch/01/config "X" 1 WH 33\n/ch/01/mix/02 ON -12.0 +0 PRE 0');
    expect(scene.inputs[0].processing?.mainMix).toBeUndefined();
    expect(scene.inputs[0].sends).toHaveLength(1);
  });
});
