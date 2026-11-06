import { describe, expect, it } from "vitest";
import { parseSceneText } from "@/parsers/x32M32Parser";
import { compareScenes } from "@/lib/sceneComparison";
import { combinedCSV, sceneToHtml, sceneToJson, sceneToMarkdown } from "@/lib/exporters";
import { buildVolunteerGuide } from "@/lib/volunteerGuide";
import type { MixerScene } from "@/types/routing";

// Budgets are deliberately generous: they exist to catch a pathological
// regression (quadratic blowup, accidental re-parse per row), not to police
// a few milliseconds of machine noise. Timings are logged so a slowdown is
// visible in test output before it ever trips a threshold.
const BUDGET_MS = 2000;

function buildLargeSceneText(): string {
  const lines: string[] = [];
  lines.push('#4.3 "Large Sunday"');
  lines.push("/config/chlink 0 0 0 0 0 0 0 0");
  for (let ch = 1; ch <= 32; ch++) {
    const n = String(ch).padStart(2, "0");
    lines.push(`/ch/${n}/config "Ch ${ch}" 1 YE ${30 + ch}`);
    lines.push(`/ch/${n}/preamp +3.0 ON OFF 80 66`);
    lines.push(`/ch/${n}/delay ON 1.5`);
    lines.push(`/ch/${n}/gate ON -50.0 3.0 5.0 100.0 250.0 0 0`);
    lines.push(`/ch/${n}/dyn ON -24.0 2.0 10.0 100.0 250.0 0 0`);
    lines.push(`/ch/${n}/insert ON POST 1`);
    lines.push(`/ch/${n}/eq ON 1 100.0 1.0 0.0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0`);
    lines.push(`/ch/${n}/automix OFF 0.0`);
    lines.push(`/ch/${n}/mix ON -3.0 +0 POST 0`);
    for (let bus = 1; bus <= 16; bus++) {
      lines.push(`/ch/${n}/mix/${String(bus).padStart(2, "0")} ON -12.0 +0 PRE 0`);
    }
  }
  for (let bus = 1; bus <= 16; bus++) {
    const n = String(bus).padStart(2, "0");
    lines.push(`/bus/${n}/config "Mix ${bus}" 1 CY`);
    lines.push(`/bus/${n}/mix ON -6.0 +0 POST 0`);
  }
  for (let dca = 1; dca <= 8; dca++) {
    lines.push(`/dca/${dca}/config "Group ${dca}" 1 CY`);
    lines.push(`/dca/${dca}/fader -10.0`);
  }
  for (let out = 1; out <= 8; out++) {
    lines.push(`/outputs/main/${String(out).padStart(2, "0")} 1 POST OFF`);
  }
  for (let out = 1; out <= 4; out++) {
    lines.push(`/outputs/aux/${String(out).padStart(2, "0")} 16 POST OFF`);
  }
  lines.push("/outputs/p16/01 4 POST OFF");
  lines.push("/outputs/aes/01 4 POST OFF");
  lines.push("/outputs/rec/01 26 POST OFF");
  lines.push('/mtx/01/config "Matrix 1" 1 WH');
  lines.push('/main/st/config "Main" 1 RD');
  lines.push("/config/routing/IN AN1-8 AN9-16 AES50A-1-8 AES50A-9-16");
  lines.push("/config/routing/OUT MAIN AUX1-6");
  lines.push("/config/routing/MATRIX MTX1-6");
  for (let i = 0; i < 50; i++) {
    lines.push(`/weird/custom/thing${i} 1 2 3`);
  }
  lines.push('/scene/001/name "Large Sunday"');
  return lines.join("\n");
}

function timed<T>(label: string, fn: () => T): { result: T; ms: number } {
  const start = performance.now();
  const result = fn();
  const ms = performance.now() - start;
  return { result, ms };
}

describe("large-scene performance", () => {
  const text = buildLargeSceneText();

  it("parses a full 32-channel scene fast and completely", () => {
    const { result: scene, ms } = timed("parse", () => parseSceneText(text, { fileName: "large.scn" }));
    console.log(`parse: ${ms.toFixed(1)}ms (${text.split("\n").length} lines)`);

    expect(scene.inputs.length).toBe(32);
    expect(scene.buses.length).toBe(16);
    expect(scene.dcas.length).toBe(8);
    expect(scene.outputs.length).toBeGreaterThanOrEqual(16);
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  it("exports a full scene fast", () => {
    const scene = parseSceneText(text, { fileName: "large.scn" });
    const options = { includeChannelProcessing: true, includeChannelSends: true, includeRawUnrecognized: true };

    const md = timed("markdown", () => sceneToMarkdown(scene, options));
    const html = timed("html", () => sceneToHtml(scene, options));
    const json = timed("json", () => sceneToJson(scene));
    const csv = timed("csv", () => combinedCSV(scene, options));
    const guide = timed("guide", () => buildVolunteerGuide(scene));
    console.log(
      `exports: markdown ${md.ms.toFixed(1)}ms, html ${html.ms.toFixed(1)}ms, json ${json.ms.toFixed(1)}ms, csv ${csv.ms.toFixed(1)}ms, guide ${guide.ms.toFixed(1)}ms`,
    );

    expect(md.result.length).toBeGreaterThan(10_000);
    expect(html.result.length).toBeGreaterThan(10_000);
    expect(json.result.length).toBeGreaterThan(10_000);
    expect(csv.result.length).toBeGreaterThan(5_000);
    expect(guide.result.counts.inputs).toBe(32);
    for (const { ms } of [md, html, json, csv, guide]) {
      expect(ms).toBeLessThan(BUDGET_MS);
    }
  });

  it("compares two full scenes fast", () => {
    const earlier = parseSceneText(text, { fileName: "large-earlier.scn" });
    const laterText = text.replace('"Ch 1"', '"Kick Renamed"').replace("/ch/01/mix/01 ON -12.0", "/ch/01/mix/01 OFF -oo");
    const later = parseSceneText(laterText, { fileName: "large-later.scn" });

    const { result: comparison, ms } = timed("compare", () => compareScenes(earlier, later));
    console.log(`compare: ${ms.toFixed(1)}ms, ${comparison.counts.total} changes`);

    expect(comparison.counts.total).toBeGreaterThan(0);
    expect(comparison.changes.some((change) => change.summary.includes("Kick Renamed"))).toBe(true);
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  it("scales near-linearly: doubling the scene costs well under double the budget", () => {
    const doubled = `${text}\n${text.replace(/Large Sunday/g, "Large Sunday 2")}`;
    const { result: scene, ms } = timed("parse-doubled", () => parseSceneText(doubled, { fileName: "doubled.scn" }));
    console.log(`parse doubled (${doubled.split("\n").length} lines): ${ms.toFixed(1)}ms`);

    expect(scene.inputs.length).toBe(32);
    expect(ms).toBeLessThan(BUDGET_MS);
  });
});
