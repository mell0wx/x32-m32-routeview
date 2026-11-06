import type {
  ChannelProcessingSnapshot,
  InputChannel,
  MixerScene,
} from "@/types/routing";
import {
  channelDisplayName,
  channelNumber,
  isActiveSend,
  isDefaultOrUnusedInput,
} from "@/lib/sceneModel";

export type ChangeRisk = "high" | "medium" | "low";
export type ChangeCategory = "inputs" | "buses" | "dcas" | "outputs" | "routing";

export interface SceneChange {
  id: string;
  category: ChangeCategory;
  risk: ChangeRisk;
  summary: string;
  detail?: string;
}

export interface SceneComparison {
  earlierName: string;
  laterName: string;
  changes: SceneChange[];
  counts: {
    total: number;
    high: number;
    medium: number;
    low: number;
    byCategory: Record<ChangeCategory, number>;
  };
  identical: boolean;
}

const PROCESSING_LABELS: { key: keyof ChannelProcessingSnapshot; label: string }[] = [
  { key: "delay", label: "Delay" },
  { key: "preamp", label: "Preamp" },
  { key: "gate", label: "Gate" },
  { key: "dynamics", label: "Dynamics" },
  { key: "insert", label: "Insert" },
  { key: "eq", label: "EQ" },
  { key: "mainMix", label: "Main mix" },
  { key: "automix", label: "Automix" },
];

function isOff(value: string | undefined): boolean {
  if (!value) return true;
  const normalized = value.trim().toUpperCase();
  return normalized === "OFF" || normalized.startsWith("OFF ·") || normalized.includes("· -OO");
}

function channelWasLive(channel: InputChannel): boolean {
  if (!isDefaultOrUnusedInput(channel)) return true;
  if ((channel.sends ?? []).some((send) => isActiveSend(send))) return true;
  const mainMix = channel.processing?.mainMix;
  return !!mainMix && !isOff(mainMix);
}

function processingRisk(key: keyof ChannelProcessingSnapshot, before: string | undefined, after: string | undefined): ChangeRisk {
  if (key === "mainMix" && !isOff(before) && isOff(after)) return "high";
  if ((key === "gate" || key === "dynamics") && !isOff(before) && isOff(after)) return "medium";
  return "low";
}

function compareProcessing(
  changes: SceneChange[],
  channelLabel: string,
  before: ChannelProcessingSnapshot | undefined,
  after: ChannelProcessingSnapshot | undefined,
): void {
  for (const { key, label } of PROCESSING_LABELS) {
    const beforeValue = before?.[key];
    const afterValue = after?.[key];
    if (beforeValue === afterValue) continue;
    if (beforeValue === undefined) {
      changes.push({
        id: `${channelLabel}-processing-${key}-added`,
        category: "inputs",
        risk: "low",
        summary: `${channelLabel} ${label.toLowerCase()} set: ${afterValue}`,
      });
      continue;
    }
    if (afterValue === undefined) {
      changes.push({
        id: `${channelLabel}-processing-${key}-removed`,
        category: "inputs",
        risk: processingRisk(key, beforeValue, undefined),
        summary: `${channelLabel} ${label.toLowerCase()} removed (was ${beforeValue})`,
      });
      continue;
    }
    changes.push({
      id: `${channelLabel}-processing-${key}`,
      category: "inputs",
      risk: processingRisk(key, beforeValue, afterValue),
      summary: `${channelLabel} ${label.toLowerCase()} changed`,
      detail: `${beforeValue} → ${afterValue}`,
    });
  }
}

function compareSends(
  changes: SceneChange[],
  channelLabel: string,
  before: InputChannel,
  after: InputChannel,
): void {
  const beforeSends = new Map((before.sends ?? []).map((send) => [send.bus, send]));
  const afterSends = new Map((after.sends ?? []).map((send) => [send.bus, send]));
  const buses = new Set([...beforeSends.keys(), ...afterSends.keys()]);

  for (const bus of [...buses].sort((a, b) => a - b)) {
    const beforeSend = beforeSends.get(bus);
    const afterSend = afterSends.get(bus);
    if (!beforeSend && afterSend) {
      changes.push({
        id: `${channelLabel}-send-${bus}-added`,
        category: "inputs",
        risk: "low",
        summary: `${channelLabel} now sends to Bus ${channelNumber(bus)} (${afterSend.level})`,
      });
      continue;
    }
    if (beforeSend && !afterSend) {
      changes.push({
        id: `${channelLabel}-send-${bus}-removed`,
        category: "inputs",
        risk: beforeSend.enabled ? "medium" : "low",
        summary: `${channelLabel} no longer sends to Bus ${channelNumber(bus)}`,
        detail: `was ${beforeSend.enabled ? "ON" : "OFF"} · ${beforeSend.level}`,
      });
      continue;
    }
    if (!beforeSend || !afterSend) continue;
    if (beforeSend.enabled && !afterSend.enabled) {
      changes.push({
        id: `${channelLabel}-send-${bus}-disabled`,
        category: "inputs",
        risk: "medium",
        summary: `${channelLabel} send to Bus ${channelNumber(bus)} disabled`,
        detail: `was ON · ${beforeSend.level}`,
      });
      continue;
    }
    if (beforeSend.level !== afterSend.level) {
      const nowSilent = afterSend.level === "-oo";
      changes.push({
        id: `${channelLabel}-send-${bus}-level`,
        category: "inputs",
        risk: nowSilent ? "medium" : "low",
        summary: `${channelLabel} send to Bus ${channelNumber(bus)} level changed`,
        detail: `${beforeSend.level} → ${afterSend.level}`,
      });
    } else if (beforeSend.tap !== afterSend.tap || beforeSend.pan !== afterSend.pan) {
      changes.push({
        id: `${channelLabel}-send-${bus}-tap-pan`,
        category: "inputs",
        risk: "low",
        summary: `${channelLabel} send to Bus ${channelNumber(bus)} tap/pan changed`,
        detail: `${beforeSend.tap ?? "—"} / ${beforeSend.pan ?? "—"} → ${afterSend.tap ?? "—"} / ${afterSend.pan ?? "—"}`,
      });
    }
  }
}

function compareInputs(changes: SceneChange[], earlier: MixerScene, later: MixerScene): void {
  const earlierInputs = new Map(earlier.inputs.map((input) => [input.number, input]));
  const laterInputs = new Map(later.inputs.map((input) => [input.number, input]));
  const numbers = new Set([...earlierInputs.keys(), ...laterInputs.keys()]);

  for (const number of [...numbers].sort((a, b) => a - b)) {
    const before = earlierInputs.get(number);
    const after = laterInputs.get(number);
    const label = `CH ${channelNumber(number)} ${channelDisplayName(after ?? before ?? { number, name: "" })}`.trim();

    if (!before && after) {
      changes.push({
        id: `input-${number}-added`,
        category: "inputs",
        risk: "low",
        summary: `${label} added`,
      });
      continue;
    }
    if (before && !after) {
      changes.push({
        id: `input-${number}-removed`,
        category: "inputs",
        risk: channelWasLive(before) ? "high" : "low",
        summary: `${label} removed`,
        detail: channelWasLive(before) ? "It had a name or active sends in the earlier scene." : undefined,
      });
      continue;
    }
    if (!before || !after) continue;

    if (before.name !== after.name) {
      changes.push({
        id: `input-${number}-renamed`,
        category: "inputs",
        risk: "low",
        summary: `CH ${channelNumber(number)} renamed`,
        detail: `${before.name || "—"} → ${after.name || "—"}`,
      });
    }
    if ((before.source ?? "") !== (after.source ?? "")) {
      changes.push({
        id: `input-${number}-source`,
        category: "inputs",
        risk: "medium",
        summary: `${label} source changed`,
        detail: `${before.source || "—"} → ${after.source || "—"}`,
      });
    }
    const beforeDcas = [...(before.dcaAssignments ?? [])].sort();
    const afterDcas = [...(after.dcaAssignments ?? [])].sort();
    if (beforeDcas.join(",") !== afterDcas.join(",")) {
      const removed = beforeDcas.filter((dca) => !afterDcas.includes(dca));
      changes.push({
        id: `input-${number}-dcas`,
        category: "inputs",
        risk: removed.length ? "medium" : "low",
        summary: `${label} group assignments changed`,
        detail: `${beforeDcas.join(", ") || "none"} → ${afterDcas.join(", ") || "none"}`,
      });
    }
    compareProcessing(changes, label, before.processing, after.processing);
    compareSends(changes, label, before, after);
  }
}

function compareBuses(changes: SceneChange[], earlier: MixerScene, later: MixerScene): void {
  const earlierBuses = new Map(earlier.buses.map((bus) => [bus.number, bus]));
  const laterBuses = new Map(later.buses.map((bus) => [bus.number, bus]));
  const numbers = new Set([...earlierBuses.keys(), ...laterBuses.keys()]);

  for (const number of [...numbers].sort((a, b) => a - b)) {
    const before = earlierBuses.get(number);
    const after = laterBuses.get(number);
    const label = `Bus ${channelNumber(number)} ${after?.name ?? before?.name ?? ""}`.trim();

    if (!before && after) {
      changes.push({ id: `bus-${number}-added`, category: "buses", risk: "low", summary: `${label} added` });
      continue;
    }
    if (before && !after) {
      const hadSends = earlier.inputs.some((input) => (input.sends ?? []).some((send) => send.bus === number));
      changes.push({
        id: `bus-${number}-removed`,
        category: "buses",
        risk: hadSends ? "high" : "low",
        summary: `${label} removed`,
        detail: hadSends ? "Channels were sending to it in the earlier scene." : undefined,
      });
      continue;
    }
    if (before && after && before.name !== after.name) {
      changes.push({
        id: `bus-${number}-renamed`,
        category: "buses",
        risk: "low",
        summary: `Bus ${channelNumber(number)} renamed`,
        detail: `${before.name || "—"} → ${after.name || "—"}`,
      });
    }
  }
}

function compareDcas(changes: SceneChange[], earlier: MixerScene, later: MixerScene): void {
  const earlierDcas = new Map(earlier.dcas.map((dca) => [dca.number, dca]));
  const laterDcas = new Map(later.dcas.map((dca) => [dca.number, dca]));
  const numbers = new Set([...earlierDcas.keys(), ...laterDcas.keys()]);

  for (const number of [...numbers].sort((a, b) => a - b)) {
    const before = earlierDcas.get(number);
    const after = laterDcas.get(number);
    const label = `DCA ${number} ${after?.name ?? before?.name ?? ""}`.trim();

    if (!before && after) {
      changes.push({ id: `dca-${number}-added`, category: "dcas", risk: "low", summary: `${label} added` });
      continue;
    }
    if (before && !after) {
      changes.push({
        id: `dca-${number}-removed`,
        category: "dcas",
        risk: (before.assignedChannels ?? []).length ? "medium" : "low",
        summary: `${label} removed`,
        detail: (before.assignedChannels ?? []).length
          ? `It controlled channels ${(before.assignedChannels ?? []).join(", ")}.`
          : undefined,
      });
      continue;
    }
    if (!before || !after) continue;
    if (before.name !== after.name) {
      changes.push({
        id: `dca-${number}-renamed`,
        category: "dcas",
        risk: "low",
        summary: `DCA ${number} renamed`,
        detail: `${before.name || "—"} → ${after.name || "—"}`,
      });
    }
    const beforeMembers = [...(before.assignedChannels ?? [])].sort((a, b) => a - b);
    const afterMembers = [...(after.assignedChannels ?? [])].sort((a, b) => a - b);
    if (beforeMembers.join(",") !== afterMembers.join(",")) {
      const removed = beforeMembers.filter((ch) => !afterMembers.includes(ch));
      changes.push({
        id: `dca-${number}-members`,
        category: "dcas",
        risk: removed.length ? "medium" : "low",
        summary: `${label} membership changed`,
        detail: `Channels ${beforeMembers.join(", ") || "none"} → ${afterMembers.join(", ") || "none"}`,
      });
    }
  }
}

function compareOutputs(changes: SceneChange[], earlier: MixerScene, later: MixerScene): void {
  const key = (output: MixerScene["outputs"][number]) => `${output.outputType}:${String(output.number)}`;
  const earlierOutputs = new Map(earlier.outputs.map((output) => [key(output), output]));
  const laterOutputs = new Map(later.outputs.map((output) => [key(output), output]));
  const keys = new Set([...earlierOutputs.keys(), ...laterOutputs.keys()]);

  for (const outputKey of [...keys].sort()) {
    const before = earlierOutputs.get(outputKey);
    const after = laterOutputs.get(outputKey);
    const label = `${after?.outputType ?? before?.outputType} ${after?.number ?? before?.number}`;

    if (!before && after) {
      changes.push({ id: `output-${outputKey}-added`, category: "outputs", risk: "low", summary: `${label} added` });
      continue;
    }
    if (before && !after) {
      const wasOff = !before.source || before.source === "Off" || before.source === "—";
      changes.push({
        id: `output-${outputKey}-removed`,
        category: "outputs",
        risk: wasOff ? "low" : "high",
        summary: `${label} removed`,
        detail: wasOff ? undefined : `It was fed by ${before.source}.`,
      });
      continue;
    }
    if (before && after && before.source !== after.source) {
      changes.push({
        id: `output-${outputKey}-source`,
        category: "outputs",
        risk: "high",
        summary: `${label} source changed`,
        detail: `${before.source || "—"} → ${after.source || "—"}`,
      });
    }
  }
}

function compareRoutingBlocks(changes: SceneChange[], earlier: MixerScene, later: MixerScene): void {
  const earlierBlocks = new Map(earlier.routingBlocks.map((block) => [block.blockName, block]));
  const laterBlocks = new Map(later.routingBlocks.map((block) => [block.blockName, block]));
  const names = new Set([...earlierBlocks.keys(), ...laterBlocks.keys()]);

  for (const name of [...names].sort()) {
    const before = earlierBlocks.get(name);
    const after = laterBlocks.get(name);
    if (!before && after) {
      changes.push({ id: `routing-${name}-added`, category: "routing", risk: "low", summary: `Routing block ${name} added` });
      continue;
    }
    if (before && !after) {
      changes.push({ id: `routing-${name}-removed`, category: "routing", risk: "medium", summary: `Routing block ${name} removed` });
      continue;
    }
    if (!before || !after) continue;
    if (before.assignments.join(" ") !== after.assignments.join(" ")) {
      changes.push({
        id: `routing-${name}-changed`,
        category: "routing",
        risk: "medium",
        summary: `Routing block ${name} changed`,
        detail: `${before.assignments.join(" ") || "—"} → ${after.assignments.join(" ") || "—"}`,
      });
    }
  }
}

export function riskHeadline(counts: SceneComparison["counts"]): string {
  if (counts.total === 0) return "Scenes match — nothing changed.";
  if (counts.high > 0) {
    return `${counts.high} high-risk change${counts.high === 1 ? "" : "s"} — check before service.`;
  }
  return `No high-risk changes — ${counts.total} smaller tweak${counts.total === 1 ? "" : "s"}.`;
}

export function compareScenes(earlier: MixerScene, later: MixerScene): SceneComparison {
  const changes: SceneChange[] = [];
  compareInputs(changes, earlier, later);
  compareBuses(changes, earlier, later);
  compareDcas(changes, earlier, later);
  compareOutputs(changes, earlier, later);
  compareRoutingBlocks(changes, earlier, later);

  const riskOrder: Record<ChangeRisk, number> = { high: 0, medium: 1, low: 2 };
  changes.sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk] || a.summary.localeCompare(b.summary));

  const byCategory: Record<ChangeCategory, number> = { inputs: 0, buses: 0, dcas: 0, outputs: 0, routing: 0 };
  for (const change of changes) byCategory[change.category] += 1;

  const counts = {
    total: changes.length,
    high: changes.filter((change) => change.risk === "high").length,
    medium: changes.filter((change) => change.risk === "medium").length,
    low: changes.filter((change) => change.risk === "low").length,
    byCategory,
  };

  return {
    earlierName: earlier.fileName ?? "Earlier scene",
    laterName: later.fileName ?? "Later scene",
    changes,
    counts,
    identical: changes.length === 0,
  };
}

const RISK_HEADINGS: Record<ChangeRisk, string> = {
  high: "Check before service",
  medium: "Worth a look",
  low: "Small tweaks",
};

/** A shareable Markdown report of the comparison, for the handoff packet. */
export function comparisonToMarkdown(comparison: SceneComparison): string {
  const lines: string[] = [];
  lines.push(`# Scene Comparison: ${comparison.earlierName} → ${comparison.laterName}`, "");
  lines.push(riskHeadline(comparison.counts), "");
  lines.push(
    `High-risk: ${comparison.counts.high} · Medium: ${comparison.counts.medium} · Low: ${comparison.counts.low} · Total: ${comparison.counts.total}`,
    "",
  );
  if (comparison.identical) {
    lines.push("No differences were found between the two scenes.");
    return lines.join("\n");
  }
  for (const risk of ["high", "medium", "low"] as ChangeRisk[]) {
    const group = comparison.changes.filter((change) => change.risk === risk);
    if (!group.length) continue;
    lines.push(`## ${RISK_HEADINGS[risk]}`, "");
    for (const change of group) {
      lines.push(`- ${change.summary}${change.detail ? ` — ${change.detail}` : ""}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
