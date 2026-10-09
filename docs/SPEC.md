# CollAgora Canvas v1.0 Specification

## Purpose

CollAgora Canvas should make it easy to conduct structured brainstorming, idea development, group reflection, business modelling and planning without requiring users to register, install complex software or depend on commercial canvas platforms.

## v1.0 scope

CollAgora Canvas v1.0 is a local-first educational MVP. It is not a real-time collaboration tool yet.

### Must have

1. Local browser use with HTML, CSS and vanilla JavaScript.
2. Adjustable canvas size.
3. Built-in templates:
   - Blank canvas
   - Business Model Canvas
   - Lean Canvas
   - Triple Bottom Line Co-creation Canvas
   - Function Designer (structured worksheet for designing a function/class: header, variable list, flowchart/algorithm, input, output, references, reflection)
4. Sticky notes with editable text, colour and 1-5 vote score.
5. Images with required alt text.
6. Link/video cards with short description.
7. Notes/cards stay where they are placed.
8. Save/load in browser localStorage.
9. Import/export project JSON.
10. Export structured Markdown grouped by section.
11. Export visual canvas as PNG.
12. Simple custom template creation through adding sections and exporting template JSON.

### Explicitly outside v1.0

1. Real-time online collaboration.
2. User accounts/login.
3. Server/database backend.
4. Full drawing editor.
5. Word export.
6. AI agents inside the app.
7. Permissions and roles.
8. Template marketplace.

## Acceptance criteria

1. A user can open the app locally in a browser without running a server.
2. A user can choose at least three predefined templates.
3. A user can add, edit, move, duplicate and delete sticky notes.
4. A user can upload an image only after providing alt text.
5. A user can add a URL/video link as a card with a description.
6. A user can assign a 1-5 vote score to a selected item.
7. A user can save the project locally and reload it.
8. A user can export/import the full project as JSON.
9. A user can export a structured Markdown/list version grouped by section.
10. A user can export a visual PNG of the canvas.
11. Sticky notes preserve their position and section membership after import/reload.
12. The solution works in current Chrome, Edge and Firefox.
13. Core utility functions are covered by tests.
14. The final version is reviewed by a human in a realistic workshop or classroom scenario.

## Project JSON

```json
{
  "projectVersion": "1.0",
  "projectTitle": "Example CollAgora Project",
  "updatedAt": "2026-06-29T00:00:00.000Z",
  "templateId": "lean-canvas",
  "canvas": {
    "width": 1800,
    "height": 1100
  },
  "sections": [
    {
      "id": "problem",
      "title": "Problem",
      "x": 20,
      "y": 20,
      "width": 340,
      "height": 360
    }
  ],
  "items": [
    {
      "id": "note-001",
      "type": "sticky-note",
      "text": "Students need a simpler way to structure early ideas.",
      "x": 70,
      "y": 90,
      "width": 190,
      "height": 130,
      "color": "#fff7a8",
      "votes": 5,
      "sectionId": "problem",
      "tags": ["student", "need"]
    }
  ]
}
```

## AI-support principle for v1.0

AI is supported outside the app through JSON and Markdown export. Example prompt:

```text
You are helping us analyse a completed CollAgora Canvas. Group the ideas by theme, identify overlaps, suggest missing perspectives, and propose the three most realistic next experiments. Use vote scores, but do not rely only on them.
```

## v2.0 additions

v2.0 builds on the v1.0 MVP without breaking the v1.0 project JSON format:

1. **Resizable notes and sections** - `width`/`height` on items and sections are now user-adjustable via a resize handle, not just fixed defaults. Existing v1.0 project files remain compatible; missing `width`/`height` fall back to the v1.0 defaults.
2. **Undo/redo history** - an in-memory history stack (not persisted) snapshots `projectTitle`, `templateId`, `canvas`, `sections` and `items` after every committed change.
3. **Fully offline PNG export** - `html2canvas` is vendored under `vendor/` instead of loaded from a CDN.
4. **PDF export** - a new export path renders the canvas to PNG and embeds it in a single-page PDF via a locally vendored `jsPDF`.
5. **Optional lightweight server for shared workshops** - `server/server.js` is explicitly optional. It serves the static app and relays the latest project JSON per "room" over WebSocket (last-write-wins). No accounts, no persistence to disk, no real-time operational-transform merging - still out of scope for v2.0.
6. **AI prompt helpers** - the app can assemble a ready-to-paste prompt (instructions + Markdown/JSON export) and copy it to the clipboard, building directly on the v1.0 "AI-support principle" above.

### Still explicitly outside v2.0

1. True real-time collaborative editing with conflict resolution (CRDT/OT).
2. User accounts, login or permissions for the shared-workshop server.
3. A full drawing editor.
4. Word export.
5. AI agents running inside the app itself (prompt helpers only prepare text for external tools).
6. A template marketplace.
