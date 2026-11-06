import { useMemo, useRef, useState, type ReactNode } from "react";
import type { MixerScene } from "@/types/routing";
import { parseSceneText } from "@/parsers/x32M32Parser";
import { validateSceneFile } from "@/lib/uploadValidation";
import {
  compareScenes,
  comparisonToMarkdown,
  riskHeadline,
  type ChangeRisk,
  type SceneComparison,
} from "@/lib/sceneComparison";
import { downloadText } from "@/lib/exporters";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, Download, FileUp } from "lucide-react";

type RiskFilter = "all" | ChangeRisk;

const RISK_SECTIONS: { risk: ChangeRisk; heading: string }[] = [
  { risk: "high", heading: "Check before service" },
  { risk: "medium", heading: "Worth a look" },
  { risk: "low", heading: "Small tweaks" },
];

const RISK_BADGE: Record<ChangeRisk, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground",
};

export function CompareTab({ scene }: { scene: MixerScene }) {
  const [earlier, setEarlier] = useState<MixerScene>(scene);
  const [later, setLater] = useState<MixerScene | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<RiskFilter>("all");
  const earlierInputRef = useRef<HTMLInputElement>(null);
  const laterInputRef = useRef<HTMLInputElement>(null);

  const comparison: SceneComparison | null = useMemo(
    () => (later ? compareScenes(earlier, later) : null),
    [earlier, later],
  );

  const readFile = (file: File, slot: "earlier" | "later") => {
    const validationError = validateSceneFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseSceneText(String(reader.result ?? ""), { fileName: file.name, fileSize: file.size });
      if (parsed.status === "Unsupported") {
        setError("That file does not look like an X32/M32 .scn scene.");
        return;
      }
      setError(null);
      if (slot === "earlier") setEarlier(parsed);
      else setLater(parsed);
    };
    reader.onerror = () => setError("RouteView could not read that file. Try exporting the scene again.");
    reader.readAsText(file);
  };

  const swap = () => {
    if (!later) return;
    setEarlier(later);
    setLater(earlier);
  };

  const visibleChanges = (comparison?.changes ?? []).filter((change) => filter === "all" || change.risk === filter);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold">Compare Two Scenes</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload last week&apos;s scene and this week&apos;s scene to see what changed — and what to check before
          service. Everything stays in your browser.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm" role="alert">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <SceneSlot
          label="Earlier scene"
          scene={earlier}
          onChoose={() => earlierInputRef.current?.click()}
          action={
            earlier !== scene ? (
              <Button variant="ghost" size="sm" onClick={() => setEarlier(scene)}>
                Use loaded scene
              </Button>
            ) : undefined
          }
        />
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={swap} disabled={!later} aria-label="Swap scenes">
            <ArrowLeftRight className="mr-1.5 h-4 w-4" /> Swap
          </Button>
        </div>
        <SceneSlot
          label="Later scene"
          scene={later}
          onChoose={() => laterInputRef.current?.click()}
        />
      </div>
      <input
        ref={earlierInputRef}
        type="file"
        accept=".scn"
        className="hidden"
        aria-label="Upload earlier scene file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) readFile(file, "earlier");
          event.target.value = "";
        }}
      />
      <input
        ref={laterInputRef}
        type="file"
        accept=".scn"
        className="hidden"
        aria-label="Upload later scene file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) readFile(file, "later");
          event.target.value = "";
        }}
      />

      {!comparison ? (
        <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
          Upload the later scene to see the comparison. The earlier scene starts as the one you already loaded.
        </div>
      ) : (
        <>
          <div className="rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">{riskHeadline(comparison.counts)}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {comparison.earlierName} → {comparison.laterName}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const date = new Date().toISOString().slice(0, 10);
                  downloadText(`scene-comparison-${date}.md`, comparisonToMarkdown(comparison), "text/markdown");
                }}
              >
                <Download className="mr-1.5 h-4 w-4" /> Download report
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <FilterButton label={`All (${comparison.counts.total})`} active={filter === "all"} onClick={() => setFilter("all")} />
              <FilterButton label={`High (${comparison.counts.high})`} active={filter === "high"} onClick={() => setFilter("high")} />
              <FilterButton label={`Medium (${comparison.counts.medium})`} active={filter === "medium"} onClick={() => setFilter("medium")} />
              <FilterButton label={`Low (${comparison.counts.low})`} active={filter === "low"} onClick={() => setFilter("low")} />
            </div>
          </div>

          {comparison.identical ? (
            <div className="rounded-lg border bg-muted/20 p-4 text-sm">
              No differences were found between the two scenes.
            </div>
          ) : visibleChanges.length === 0 ? (
            <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
              No changes at this risk level. Try another filter.
            </div>
          ) : (
            RISK_SECTIONS.map(({ risk, heading }) => {
              const group = visibleChanges.filter((change) => change.risk === risk);
              if (!group.length) return null;
              return (
                <div key={risk} className="rounded-lg border">
                  <div className="border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {heading} ({group.length})
                  </div>
                  <div className="divide-y">
                    {group.map((change) => (
                      <div key={change.id} className="flex flex-wrap items-start gap-2 px-4 py-3 text-sm">
                        <span className={`rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide ${RISK_BADGE[risk]}`}>
                          {risk}
                        </span>
                        <span>
                          <span className="font-semibold">{change.summary}</span>
                          {change.detail ? <span className="text-muted-foreground"> — {change.detail}</span> : null}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}

function SceneSlot({
  label,
  scene,
  onChoose,
  action,
}: {
  label: string;
  scene: MixerScene | null;
  onChoose: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      {scene ? (
        <>
          <div className="mt-1 font-mono text-sm font-semibold">{scene.fileName ?? "Unnamed scene"}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {scene.inputs.length} inputs · {scene.buses.length} buses · {scene.outputs.length} outputs ·{" "}
            {scene.status}
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">No scene uploaded yet.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onChoose}>
          <FileUp className="mr-1.5 h-4 w-4" /> {scene ? "Choose a different file" : "Choose a .scn file"}
        </Button>
        {action}
      </div>
    </div>
  );
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${active ? "bg-primary text-primary-foreground" : "bg-background"}`}
    >
      {label}
    </button>
  );
}
