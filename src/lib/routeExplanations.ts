import type { TopologyEdge, TopologyEdgeKind, TopologyNodeKind } from "@/lib/topologyGraph";

/**
 * Plain-language explanations for the signal graph, written for volunteers
 * and technical directors rather than for the parser. Every node and edge
 * kind the graph can produce must have an entry here so the legend can never
 * show a bare technical label with no meaning attached.
 */
export const NODE_KIND_EXPLANATIONS: Record<TopologyNodeKind, { label: string; meaning: string }> = {
  "routing-block": {
    label: "Route Blocks",
    meaning: "Patch groups from the scene file, showing how physical inputs are assigned to channels.",
  },
  input: {
    label: "Inputs",
    meaning: "Sound sources coming into the board: microphones, instruments, and playback.",
  },
  bus: {
    label: "Buses",
    meaning: "Mixes that combine channels for one destination, such as a monitor mix or the main speakers.",
  },
  output: {
    label: "Outputs",
    meaning: "Where audio leaves the console: speakers, livestream, recording, and other feeds.",
  },
};

export const EDGE_KIND_EXPLANATIONS: Record<
  TopologyEdgeKind,
  { verb: string; meaning: string }
> = {
  send: {
    verb: "sends to",
    meaning: "A channel feeds a mix bus at the shown level.",
  },
  "bus-out": {
    verb: "feeds",
    meaning: "A mix bus is sent to a physical output.",
  },
  "direct-out": {
    verb: "routes directly to",
    meaning: "A channel goes straight to an output, bypassing the mix buses.",
  },
  "routes-to": {
    verb: "routes to",
    meaning: "A physical input is patched to this channel.",
  },
};

/**
 * One plain sentence for a graph edge, e.g.
 * "CH 01 Kick sends to Bus 01 (-6 dB)".
 * The edge label (level, tap, or patch source) is kept in parentheses so no
 * parsed detail is lost in the friendlier wording.
 */
export function describeEdge(edge: TopologyEdge, sourceLabel: string, targetLabel: string): string {
  const { verb } = EDGE_KIND_EXPLANATIONS[edge.kind];
  const detail = edge.label ? ` (${edge.label})` : "";
  return `${sourceLabel} ${verb} ${targetLabel}${detail}`;
}
