# Sunday-service handoff example

This example shows how a church AV team or venue engineer can use RouteView
for a service, rehearsal, or guest-engineer handoff. It uses only the current
UI terminology and a sanitized example: no real showfile, venue name, network
detail, or performer information is included.

## The scenario

It is Sunday morning. The regular engineer is away, and a replacement operator
needs to run the service from the current X32 or M32 scene. Instead of opening
the scene on the console or in editor software, the team hands over a RouteView
production sheet generated from that scene.

## Step 1: Upload Scene File

1. Open RouteView and go to **Upload Scene File**.
2. Drag and drop the current `.scn` file, use **Choose File**, or paste scene
   text and click **Parse Text**.
3. If no real scene is available for practice, click **Try Demo Data** to load
   the built-in demo scene (`demo_sunday_service.scn`).

RouteView parses the scene locally in the browser. It does not connect to a
console, upload scene data, or modify the source file.

## Step 2: RouteView Analyzes It

After parsing, review these views in order:

- **Review Volunteer Guide** (the production sheet): channel names, DCA
  groupings, bus roles, and mapped outputs, with search, jump links, and
  collapsible sections.
- **Routing Summary**: which channels feed each bus and which channels are
  assigned to each DCA.
- **Signal Flow** and **Signal Graph**: how signal traces move from inputs
  through buses to outputs.
- **Warnings**: anything the parser flagged for attention before the service.
- **Route Coverage**: which routes are documented and which are missing.
- **Parser Buckets** (engineering view): commands the parser summarized as
  unsupported or partially interpreted, shown instead of guessed.

If a channel, bus, or output looks wrong here, fix it in the console scene and
re-upload — RouteView documents the scene, it does not change it.

## Step 3: Export and Share

From **Export and Share**:

1. Click **Export PDF** (or **Open Print View**) to save a PDF production
   sheet for offline use at the console.
2. Use Markdown or HTML exports for a documentation binder or team chat, and
   JSON, plain-text, or CSV exports for automation or record-keeping.
3. File names are based on the scene name and date, so the handoff packet is
   easy to find later.

## Volunteer onboarding checklist

For a volunteer who has never run this scene before:

- [ ] Can you find every input channel by name on the production sheet?
- [ ] Can you name each DCA group and the channels assigned to it?
- [ ] Can you name each monitor mix bus, who it feeds, and which outputs it
      maps to?
- [ ] Can you trace one input (for example, a lead vocal) from its channel
      through its buses to its outputs in **Signal Flow**?
- [ ] Have you read the **Warnings** panel and asked about anything unclear?
- [ ] Do you have the exported PDF at the console, not just on a phone?

## Pre-service verification checklist

Run through this list before doors open:

- [ ] The uploaded scene is the current one, not last week's file.
- [ ] All expected inputs, DCAs, buses, and outputs appear on the production
      sheet — nothing expected is missing.
- [ ] **Warnings** contains nothing unexplained; parser buckets marked as
      unsupported are understood, not ignored.
- [ ] Monitor mixes and main outputs map to the outputs the team expects.
- [ ] The exported PDF matches the scene on screen (re-export after any
      scene change).
- [ ] A replacement operator could run the service from the packet alone.

## Privacy note

Do not commit real showfiles, venue network details, credentials, or
venue-specific sensitive routing data to this repository or to any shared
handoff packet. Use the built-in demo data or a sanitized `.scn` file for
public examples. Scene content stays in the browser while RouteView runs.

## Related documentation

- [Demo workflow](demo-workflow.md)
- [Architecture](architecture.md)
- [Deployment](deployment.md)
- [Roadmap](roadmap.md)
