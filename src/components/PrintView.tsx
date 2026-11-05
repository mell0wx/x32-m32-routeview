import type { MixerScene } from "@/types/routing";
import { ProductionSheet } from "@/components/ProductionSheet";
import { pageSizeForPaper, type PrintOptions } from "@/lib/printOptions";
import type { CSSProperties } from "react";

export function PrintView({ scene, options }: { scene: MixerScene; options: PrintOptions }) {
  const style = { "--print-accent": options.accentColor } as CSSProperties;
  // The print stylesheet defaults to A4. A style element here overrides the
  // page size for the paper the user picked, because @page rules cannot be
  // scoped with a data attribute.
  const pageStyle = `@page { size: ${pageSizeForPaper(options.paper)}; margin: 11mm 10mm 15mm; }`;
  return (
    <div
      className="print-view hidden print:block"
      data-theme={options.theme}
      data-density={options.density}
      data-paper={options.paper}
      style={style}
    >
      <style>{pageStyle}</style>
      <ProductionSheet scene={scene} printMode printOptions={options} />
    </div>
  );
}
