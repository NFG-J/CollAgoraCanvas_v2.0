# CollAgora Canvas v2.0

CollAgora Canvas is a lightweight, local-first educational canvas tool for students, teachers and innovation teams. It is intended as a small open MVP rather than a full Miro/Mural replacement.

## What v1.0 included

- Browser-only HTML, CSS and vanilla JavaScript.
- Built-in templates: Blank, Business Model Canvas, Lean Canvas, and Triple Bottom Line Co-creation Canvas.
- Sticky notes with editable text, colour and 1-5 vote score.
- Link/video cards with required short description.
- Image cards with required alt text.
- Drag-and-drop placement on a large canvas.
- Local save/load through `localStorage`.
- Import/export of full projects as JSON.
- Export as structured Markdown grouped by canvas section.
- Export as PNG through `html2canvas`.
- Simple template studio: add sections and export a template JSON.

## What v2.0 adds

1. **Resizable notes and sections** - drag the small handle in the bottom-right corner of any sticky note, link card, image card or template section to resize it.
2. **Undo/redo history** - every committed change (move, resize, text edit, vote, colour, add/delete, template change) is tracked. Use the toolbar Undo/Redo buttons or `Ctrl/Cmd+Z` and `Ctrl/Cmd+Shift+Z` (or `Ctrl/Cmd+Y`).
3. **Fully offline PNG export** - `html2canvas` is now vendored locally in `vendor/html2canvas.min.js`; no CDN/internet access is required.
4. **PDF export** - a new "Export PDF" button renders the canvas to a single-page PDF using the locally vendored `jsPDF` (`vendor/jspdf.umd.min.js`).
5. **Optional lightweight server for shared workshops** - `server/server.js` is a small Node.js + `ws` server you can run so multiple devices on the same network see the same live canvas during a session. It is entirely optional; the app keeps working fully offline without it.
6. **AI prompt helpers** - the "AI prompt helper" panel builds a ready-to-paste prompt (instructions + your Markdown or JSON export) for analysing the canvas with an external AI tool, and copies it to the clipboard (or downloads it as `.txt` if the clipboard API is unavailable).

## Run locally

Open `index.html` in a modern browser. Everything, including PNG/PDF export, works fully offline because `html2canvas` and `jsPDF` are vendored under `vendor/`.

## Optional shared-workshop server

To let several devices on the same network see the same live canvas:

```bash
npm install
npm run server          # starts on http://localhost:8787 by default
node server/server.js 9000   # or pass a custom port
```

Then, in the app's "Shared workshop" panel, set the Server URL (e.g. `ws://<host-ip>:8787`) and a Room code, and click Connect on each device. The server only keeps the latest project JSON for each room in memory - nothing is written to disk, and the app works fully offline without it.

## Suggested Codex task

> Improve CollAgora Canvas v1.0 while keeping it browser-only and local-first. Preserve JSON project compatibility. Add tests for save/load, note creation, voting and Markdown export before adding new features.

## Repository structure

```text
CollAgoraCanvas_v2.0/
  index.html
  styles.css
  app.js
  vendor/
    html2canvas.min.js
    jspdf.umd.min.js
  server/
    server.js
  templates/
    blank.json
    business-model-canvas.json
    lean-canvas.json
    tbl-co-creation.json
  examples/
    example-project.json
  test/
    app.test.js
  docs/
    SPEC.md
  package.json
```

## JSON model

A saved project has this shape:

```json
{
  "projectVersion": "1.0",
  "projectTitle": "Example group workshop",
  "updatedAt": "2026-06-29T00:00:00.000Z",
  "templateId": "lean-canvas",
  "canvas": { "width": 1800, "height": 1100 },
  "sections": [],
  "items": []
}
```

Item types:

- `sticky-note`
- `link-card`
- `image-card`

## Recommended next steps after v2.0

1. Multi-page / tiled PDF export for very large canvases.
2. True real-time collaborative editing (operational transform / CRDT) instead of last-write-wins sync.
3. Accounts and per-room access control for the shared-workshop server.
4. Richer AI prompt templates and direct API integration (optional, still off by default).

## License

MIT. Adapt as needed for your course or project context.

`html2canvas` and `jsPDF`, vendored under `vendor/`, are each distributed under the MIT License by their respective authors.
