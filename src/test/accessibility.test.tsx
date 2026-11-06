import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
import type { AxeResults } from "axe-core";
import Index from "@/pages/Index";
import { CompareTab } from "@/components/CompareTab";
import { parseSceneText } from "@/parsers/x32M32Parser";
import sundayService from "./fixtures/sunday-service.scn?raw";
import edgeCases from "./fixtures/edge-cases.scn?raw";


// vitest-axe's own matcher does not type-check under Vitest 5 (its types
// target the old global `Vi` namespace, and its matchers entry re-exports
// everything as type-only), so violations are asserted with a plain helper
// instead of expect.extend. The failure message still names each rule.
function expectNoViolations(results: AxeResults) {
  const summary = results.violations
    .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.map((node) => node.target.join(", ")).join("; ")})`)
    .join("\n");
  expect(results.violations, summary).toEqual([]);
}

// jsdom does not implement scrollIntoView; the page calls it after a scene
// loads, so stub it to keep the loaded-state tests quiet.
Element.prototype.scrollIntoView = () => {};

// Note: axe-core's color-contrast rule needs real layout, which jsdom does
// not provide, so it reports "incomplete" rather than a violation here.
// Contrast of the hero text and risk badges is a manual check, not covered
// by these tests.

describe("accessibility", () => {
  it("the empty page has no axe violations", async () => {
    const { container } = render(<Index />);
    expectNoViolations(await axe(container));
  });

  // axe over the full loaded page takes ~2.5s on its own and longer when the
  // suite runs in parallel, so this test gets a roomier timeout.
  it(
    "the loaded page has no axe violations",
    async () => {
      const { container } = await loadDemoSceneAndReturn();
      expectNoViolations(await axe(container));
    },
    15000,
  );

  it("the advanced tools tabs move focus with arrow keys", async () => {
    await loadDemoSceneAndReturn();
    const inputsTab = screen.getByRole("tab", { name: "Inputs" });
    inputsTab.focus();
    fireEvent.keyDown(inputsTab, { key: "ArrowRight" });
    // Radix moves focus in a setTimeout, so the focus change is async.
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Monitor Mixes" }));
    });
  });

  it("the upload dropzone is a plain drag target and the file button is the control", async () => {
    render(<Index />);
    expect(screen.getByRole("button", { name: /choose file/i })).toBeInTheDocument();
    // The zone itself must not pretend to be a button: a button inside a
    // button is a nested-interactive violation and confuses screen readers.
    expect(screen.queryByRole("button", { name: /upload an x32 or m32 scene file/i })).toBeNull();
  });

  it("the compare tab has no axe violations and its risk filters are toggle buttons", async () => {
    const earlier = parseSceneText(sundayService, { fileName: "sunday-service.scn" });
    const { container } = render(<CompareTab scene={earlier} />);

    const laterInput = container.querySelector('input[aria-label="Upload later scene file"]') as HTMLInputElement;
    const laterFile = new File([edgeCases], "edge-cases.scn", { type: "text/plain" });
    fireEvent.change(laterInput, { target: { files: [laterFile] } });

    await waitFor(() => {
      expect(screen.getByText(/high-risk change/i)).toBeInTheDocument();
    });

    expectNoViolations(await axe(container));

    const highFilter = screen.getByRole("button", { name: /high \(/i });
    expect(highFilter).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(highFilter);
    expect(highFilter).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText(/small tweaks/i)).toBeNull();
  });
});

async function loadDemoSceneAndReturn() {
  const rendered = render(<Index />);
  fireEvent.click(screen.getByRole("button", { name: /preview with demo/i }));
  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Volunteer guide" })).toBeInTheDocument();
  });
  return rendered;
}
