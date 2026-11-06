# RouteView roadmap

This roadmap separates the released application from future work. Items below are
not promises or currently shipped features unless listed under **Implemented**.

## Implemented in v1.0.0

- local X32/M32 `.scn` upload and conservative parsing
- normalized channels, buses, DCAs, outputs, and routing views
- volunteer-facing production sheet and handoff workflow
- Markdown, HTML, JSON, plain-text, CSV, and browser print/PDF exports
- demo scene, upload validation, loading status, replacement flow, and empty states
- parser, scene-model, topology, upload, export, routing, and metadata tests
- route-graph legend and plain-language route sentences, plus a how-to-read note on the printed routing chart
- print pagination consistency: paper-size-aware page setup, widows/orphans control, and keep-together rules for section titles, summary grids, and table headers
- channel processing parsed into the channel processing snapshot (delay, gate, dynamics, insert, EQ, automix, main mix) and shown in exports, including the Insert column
- sanitized `.scn` fixture corpus (`src/test/fixtures/`): a full Sunday service scene and an edge-case scene, parsed by tests; mute-group lines now categorize as Mute Groups instead of Console Config
- scene-to-scene comparison with routing-risk summaries: upload an earlier and a later scene, see added/removed/changed inputs, buses, DCAs, outputs, and routing blocks grouped by risk (check before service / worth a look / small tweaks), plus a downloadable Markdown report
- browser-level accessibility checks (`src/test/accessibility.test.tsx`): axe-core runs over the empty and loaded pages and the Compare tab, plus keyboard navigation of the advanced-tools tabs and toggle state of the risk filters; fixed a nested-interactive upload dropzone, an unlabeled file input, and a role-less aria-label on the print palette swatches
- import/export regression checks (`src/test/export-regression.test.ts`): the Sunday fixture's facts survive into Markdown/HTML/JSON/CSV/plain-text exports, opt-in sections stay out unless enabled, JSON round-trips the parsed scene exactly, exports are byte-for-byte deterministic, and hostile channel names are escaped in HTML and quoted in CSV
- large-scene performance measurement (`src/test/performance.test.ts`, baseline in `docs/performance.md`): a generated 921-line full scene (32 inputs, 16 buses, 8 DCAs, 16 outputs) parses in ~9 ms and exports in ~30 ms worst case, each operation budgeted at 2,000 ms to catch pathological regressions

## Near-term candidates

- expand the fixture corpus further across editor exports and firmware variations
- parser coverage for the remaining categorized-only groups: bus/matrix/main processing, aux inputs, and FX returns
- measure large valid scenes on representative lower-power laptops

## Future ideas

- richer routing-map visual layers
- additional handoff and print presets
- separate typed adapters for other console families, only if the domain model remains clear
- optional offline installability that preserves local-only scene processing

Unknown commands will continue to be surfaced rather than guessed. Collaboration or
sharing work must remain explicitly opt-in and must not weaken the current privacy
boundary.
