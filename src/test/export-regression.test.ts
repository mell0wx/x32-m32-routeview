import { describe, expect, it } from "vitest";
import { parseSceneText } from "@/parsers/x32M32Parser";
import {
  combinedCSV,
  sceneToHtml,
  sceneToJson,
  sceneToMarkdown,
  sceneToPlainText,
} from "@/lib/exporters";
import type { MixerScene } from "@/types/routing";
import sundayService from "./fixtures/sunday-service.scn?raw";
import edgeCases from "./fixtures/edge-cases.scn?raw";

const sunday = () => parseSceneText(sundayService, { fileName: "sunday-service.scn" });
const edge = () => parseSceneText(edgeCases, { fileName: "edge-cases.scn" });

describe("export regression: Sunday service fixture", () => {
  it("markdown carries the scene's inputs, buses, DCAs, and outputs", () => {
    const md = sceneToMarkdown(sunday());

    expect(md).toContain("# sunday-service.scn Volunteer Console Guide");
    expect(md).toContain("Kick");
    expect(md).toContain("Vox Lead");
    expect(md).toContain("Acoustic");
    expect(md).toContain("IEM Vox");
    expect(md).toContain("Main L");
    expect(md).toContain("## Professional Condensed Routing Chart");
    expect(md).toContain("## Input Channels");
  });

  it("channel processing is opt-in and carries the parsed summaries", () => {
    const scene = sunday();
    expect(sceneToMarkdown(scene)).not.toContain("## Channel Processing");

    const md = sceneToMarkdown(scene, { includeChannelProcessing: true });
    expect(md).toContain("## Channel Processing");
    expect(md).toContain("ON · 1.5 ms"); // Kick delay
    expect(md).toContain("ON · Thr -50.0"); // Kick gate
    expect(md).toContain("ON · POST · Sel 1"); // Kick insert
  });

  it("channel sends are opt-in and list the bus sends", () => {
    const scene = sunday();
    expect(sceneToMarkdown(scene)).not.toContain("## Channel Sends");

    const md = sceneToMarkdown(scene, { includeChannelSends: true });
    expect(md).toContain("## Channel Sends");
    expect(md).toContain("Bus 1");
    expect(md).toContain("-12.0");
  });

  it("unrecognized lines stay out unless the matching option is on", () => {
    const scene = edge();
    expect(scene.unrecognizedLines).toContain("/weird/custom/thing 1 2 3");

    expect(sceneToMarkdown(scene)).not.toContain("/weird/custom/thing");
    expect(sceneToMarkdown(scene, { includeRawUnrecognized: true })).toContain("### Unknown Scene Line Sample");
    expect(sceneToMarkdown(scene, { includeRawUnrecognized: true })).toContain("/weird/custom/thing 1 2 3");
    expect(sceneToMarkdown(scene, { includeUnrecognizedSummary: true })).toContain(
      "### Items RouteView Could Not Fully Explain",
    );
    expect(sceneToMarkdown(scene, { includeUnrecognizedSummary: true })).toContain("Miscellaneous");
  });

  it("JSON round-trips the parsed scene exactly", () => {
    const scene = sunday();
    const parsed = JSON.parse(sceneToJson(scene)) as { generatedBy: string; scene: MixerScene };

    expect(parsed.generatedBy).toBe("RouteView");
    expect(parsed.scene).toEqual(scene);
  });

  it("exports are deterministic: same scene, same bytes", () => {
    const scene = sunday();
    const options = { includeChannelProcessing: true, includeChannelSends: true, includeRawUnrecognized: true };

    expect(sceneToMarkdown(scene, options)).toBe(sceneToMarkdown(scene, options));
    expect(sceneToHtml(scene, options)).toBe(sceneToHtml(scene, options));
    expect(sceneToJson(scene)).toBe(sceneToJson(scene));
    expect(combinedCSV(scene, options)).toBe(combinedCSV(scene, options));
    expect(sceneToPlainText(scene, options)).toBe(sceneToPlainText(scene, options));
  });

  it("CSV carries one row per input, bus, DCA, and output", () => {
    const csv = combinedCSV(sunday());
    const lines = csv.split("\n");

    expect(csv).toContain("## INPUTS");
    expect(csv).toContain("## BUSES");
    expect(csv).toContain("## DCAs");
    expect(csv).toContain("## OUTPUTS");
    expect(lines.filter((line) => line.startsWith("1,Kick,")).length).toBe(1);
    expect(lines.filter((line) => line.startsWith("2,Vox Lead,")).length).toBe(1);
    expect(lines.filter((line) => line.startsWith("5,IEM Vox,")).length).toBe(1);
  });

  it("plain text strips markdown formatting", () => {
    const text = sceneToPlainText(sunday());
    expect(text).not.toContain("# ");
    expect(text).not.toContain("**");
    expect(text).not.toContain("`");
    expect(text).not.toContain("|");
    expect(text).toContain("Kick");
    expect(text).toContain("sunday-service.scn");
  });
});

describe("export regression: hostile names", () => {
  const tricky: MixerScene = {
    mixerType: "X32/M32",
    fileName: "tricky.scn",
    parsedAt: "2026-11-05T00:00:00.000Z",
    status: "Parsed",
    inputs: [
      { number: 1, name: 'Vox <b>& "Lead"', source: "AN1", sends: [{ bus: 1, enabled: true, level: "-6.0" }] },
      { number: 2, name: "Kick, Snare", source: "AN2" },
    ],
    buses: [{ number: 1, name: "Mon 1", type: "Monitor" }],
    dcas: [],
    outputs: [{ outputType: "XLR", number: 1, source: "Main L" }],
    routingBlocks: [],
    warnings: [],
    unrecognizedLines: [],
  };

  it("HTML escapes markup in channel names", () => {
    const html = sceneToHtml(tricky);
    expect(html).toContain("Vox &lt;b&gt;&amp; &quot;Lead&quot;");
    expect(html).not.toContain("Vox <b>");
    expect(html).not.toContain("<b>&");
  });

  it("CSV quotes names containing commas", () => {
    const csv = combinedCSV(tricky);
    expect(csv).toContain('"Kick, Snare"');
    expect(csv).toContain('2,"Kick, Snare",AN2');
  });

  it("markdown keeps the raw names", () => {
    const md = sceneToMarkdown(tricky);
    expect(md).toContain('Vox <b>& "Lead"');
    expect(md).toContain("Kick, Snare");
  });
});
