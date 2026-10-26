# Tree Plantation Survival Tracking System

## Mock UX Design

Mock UX link: [Open the interactive wireframe](docs/mock-ux.html)

This low-fidelity product prototype shows how a field coordinator monitors plantation survival, filters sites, investigates an underperforming plot, uploads field observations, and handles empty and connection-error states. It is designed around the daily workflow of turning field data into a replanting decision.

### Primary user journey

1. Open the Dashboard to scan survival rate, surviving trees, and sites needing attention.
2. Filter by region, site, and reporting period.
3. Select an underperforming site to inspect plot-level survival and recent observations.
4. Record or upload a field observation, then return to the dashboard.

### Screen coverage

- Dashboard: monitor KPIs, survival trend, site comparison, filters, export, and drill-down.
- Site detail: investigate a site, compare plots, review observations, and create an observation.
- Add observation: upload a CSV or enter a field visit manually with validation and success states.
- Empty and error states: no matching sites, no observations, and failed data refresh with recovery actions.

The design is intentionally a functional wireframe rather than a finished visual design. Labels describe behavior and data requirements for implementation.

## Database API

The API server uses MongoDB through Mongoose. Copy `.env.example` to `.env`, set `MONGODB_URI`, replace `JWT_SECRET` with a private random value of at least 32 bytes, and set `GOOGLE_CLIENT_ID` before starting it:

```bash
npm start
```

Authentication routes:

- `POST /api/auth/register` accepts `{ "username": "...", "password": "..." }`, creates an account with a bcrypt-hashed password, and returns a signed token.
- `POST /api/auth/login` accepts the same credentials and returns a signed token.
- `POST /api/auth/google` accepts `{ "credential": "<Google ID token>" }`, verifies the token with Google, and returns a Treebase JWT. Verified Google emails are linked to existing accounts or used to create an account on first sign-in.
- `GET /api/auth/me` returns the authenticated username when sent an `Authorization: Bearer <token>` header.

Passwords must contain at least 8 characters; usernames must be 3-24 letters, numbers, or underscores. All `/api` site and observation routes require the bearer token returned by registration, login, or Google sign-in. Tokens expire after 7 days.

Available database-backed routes (all require authentication):

- `GET /api/sites` reads active plantation sites.
- `GET /api/sites/:siteId` returns an active site with its related plots and observations.
- `POST /api/sites` creates a plantation site from a JSON body.
- `PUT /api/sites/:siteId` updates an active plantation site.
- `GET /api/sites/:siteId/observations` reads observations for a site.
- `POST /api/sites/:siteId/observations` creates an observation after verifying the site exists.
- `POST /api/sites/:siteId/observations/upload` imports CSV observations for an active site using multipart form field `file`.
- `PUT /api/sites/:siteId/observations/:observationId` updates an observation belonging to the site.
- `GET /health` reports API and database connection status.

POST request bodies are JSON objects. A site accepts `name`, `region`, `plantedTrees`,
`targetSurvivalRate`, and `status`. An observation accepts `plotId`, `observedAt`,
`observedBy`, `survivingTrees`, `notes`, and `source`; its `siteId` comes from the URL.
Validation failures return `400`, missing active sites return `404`, and duplicate site
names within a region return `409`.
Observation writes validate that any supplied `plotId` belongs to the requested site;
invalid or unrelated plots return `400` or `404`.

### CSV observation uploads

The upload endpoint requires the same bearer JWT as other `/api` routes. Select an active site in the dashboard, choose a `.csv` file, and submit it. Files are limited to 2 MB and 500 rows. The required CSV headers are `observedBy` and `survivingTrees`; `observedAt`, `plotId`, and `notes` are optional. Dates must be parseable, tree counts must be non-negative whole numbers, and supplied plot IDs must belong to the selected site. The endpoint validates all rows before inserting observations and marks each imported record with `source: "csv"`.

### Video walkthrough outline

Use the linked wireframe for a 3-5 minute recording:

1. Introduce the problem: field teams need to know which plantations are surviving and where replanting is needed.
2. Show the dashboard scan and explain the KPI hierarchy.
3. Apply region and period filters, then drill into the highlighted site.
4. Explain the plot comparison and observation history.
5. Open Add observation, demonstrate the upload/manual entry path, and point out validation.
6. Show the empty and error recovery states and close with the end-to-end decision flow.

### Google OAuth setup

1. Create a Google OAuth client ID for a **Web application** in Google Cloud Console.
2. Add `http://localhost:5173` as an authorized JavaScript origin.
3. Copy `.env.example` to `.env` and set `GOOGLE_CLIENT_ID` to the client ID. Keep `JWT_SECRET` private.
4. Copy `client/.env.example` to `client/.env` and set `VITE_GOOGLE_CLIENT_ID` to the same client ID. This browser client ID is public; never place a client secret in a `VITE_` variable.
5. Start the API with `npm start`, then run the client from the `client` directory with `npm run dev`.

The client sends the Google ID token to the API; the API verifies it and issues the application's own JWT. Google credentials are not accepted as API authorization tokens.
