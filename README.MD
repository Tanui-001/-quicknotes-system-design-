# QuickNotes

QuickNotes is a note-taking service. This repository contains the **front-end API client** (built against the JSONPlaceholder practice API) and the **system design documents** for the real backend.

## Running the API client

1. Clone the repo:
   ```bash
   git clone https://github.com/your-username/quicknotes-system-design.git
   cd quicknotes-system-design
   ```
2. Open `index.html` in a browser, or serve it locally:
   ```bash
   python3 -m http.server 8000
   # then visit http://localhost:8000
   ```
3. Click **Load notes** to GET 10 notes, use the form to POST a new note, and click **Delete** on any note.

> Note: JSONPlaceholder does not persist created/deleted notes. The UI manages a local list so you can see the full lifecycle, and the limitation is documented in `api.js`.

## Design documents

- [API design](docs/api-design.md)
- [Data model](docs/data-model.md)
- [Architecture](docs/architecture.md)

## What I learned

1. **Reusable request handling pays off.** A single `request()` helper that checks `response.ok` and throws keeps every caller's try/catch small and consistent, and made the loading/success/error states trivial to wire up.
2. **Disabling buttons during requests is essential UX.** Without it, users double-submit forms and fire duplicate requests; combining disabled state with a `finally` block guarantees the UI always recovers, even on errors.
3. **`textContent` is the safe default for user input.** Building DOM nodes with `document.createElement` and assigning `textContent` avoids XSS entirely, versus interpolating strings into `innerHTML`.
4. **Designing the API first clarifies the data model.** Writing the endpoint table before the SQL revealed that tags needed a join table and that listing notes always filters by `user_id` — which drove the composite index choice.
5. **Load estimates keep architecture honest.** Doing the 1M-user math showed reads dominate writes (~10×), which justifies prioritizing a read replica and cache over sharding the primary.