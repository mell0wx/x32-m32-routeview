import { describe, expect, it } from "vitest";
import type { TopologyEdge, TopologyEdgeKind, TopologyNodeKind } from "@/lib/topologyGraph";
import { describeEdge, EDGE_KIND_EXPLANATIONS, NODE_KIND_EXPLANATIONS } from "@/lib/routeExplanations";

const NODE_KINDS: TopologyNodeKind[] = ["routing-block", "input", "bus", "output"];
const EDGE_KINDS: TopologyEdgeKind[] = ["send", "bus-out", "direct-out", "routes-to"];

function edge(kind: TopologyEdgeKind, label?: string): TopologyEdge {
  return { id: `edge:${kind}`, kind, source: "source", target: "target", label, searchableText: "" };
}

describe("route explanations", () => {
  it("explains every node kind the graph can produce", () => {
    for (const kind of NODE_KINDS) {
      expect(NODE_KIND_EXPLANATIONS[kind].label.length).toBeGreaterThan(0);
      expect(NODE_KIND_EXPLANATIONS[kind].meaning.length).toBeGreaterThan(0);
    }
  });

  it("explains every edge kind the graph can produce", () => {
    for (const kind of EDGE_KINDS) {
      expect(EDGE_KIND_EXPLANATIONS[kind].verb.length).toBeGreaterThan(0);
      expect(EDGE_KIND_EXPLANATIONS[kind].meaning.length).toBeGreaterThan(0);
    }
  });

  it("writes a plain sentence for a channel send", () => {
    expect(describeEdge(edge("send", "-6 dB"), "CH 01 Kick", "Bus 01")).toBe(
      "CH 01 Kick sends to Bus 01 (-6 dB)",
    );
  });

  it("writes a plain sentence for a bus feeding an output", () => {
    expect(describeEdge(edge("bus-out", "Main LR"), "Bus 01", "XLR 01")).toBe("Bus 01 feeds XLR 01 (Main LR)");
  });

  it("writes a plain sentence for a direct output route", () => {
    expect(describeEdge(edge("direct-out"), "CH 02 Vocal", "XLR 02")).toBe(
      "CH 02 Vocal routes directly to XLR 02",
    );
  });

  it("writes a plain sentence for a patch assignment", () => {
    expect(describeEdge(edge("routes-to", "Mic 1"), "IN block", "CH 01")).toBe("IN block routes to CH 01 (Mic 1)");
  });

  it("omits the detail when an edge has no label", () => {
    expect(describeEdge(edge("send"), "CH 03", "Bus 02")).toBe("CH 03 sends to Bus 02");
  });
});
