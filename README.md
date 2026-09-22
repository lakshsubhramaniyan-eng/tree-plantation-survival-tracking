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

The API server uses MongoDB through Mongoose. Copy `.env.example` to `.env` and set `MONGODB_URI` before starting it:

```bash
npm start
```

Available database-backed routes:

- `GET /api/sites` reads active plantation sites.
- `POST /api/sites` creates a plantation site from a JSON body.
- `PUT /api/sites/:siteId` updates an active plantation site.
- `GET /api/sites/:siteId/observations` reads observations for a site.
- `POST /api/sites/:siteId/observations` creates an observation after verifying the site exists.
- `PUT /api/sites/:siteId/observations/:observationId` updates an observation belonging to the site.
- `GET /health` reports API and database connection status.

POST request bodies are JSON objects. A site accepts `name`, `region`, `plantedTrees`,
`targetSurvivalRate`, and `status`. An observation accepts `plotId`, `observedAt`,
`observedBy`, `survivingTrees`, `notes`, and `source`; its `siteId` comes from the URL.
Validation failures return `400`, missing active sites return `404`, and duplicate site
names within a region return `409`.

### Video walkthrough outline

Use the linked wireframe for a 3-5 minute recording:

1. Introduce the problem: field teams need to know which plantations are surviving and where replanting is needed.
2. Show the dashboard scan and explain the KPI hierarchy.
3. Apply region and period filters, then drill into the highlighted site.
4. Explain the plot comparison and observation history.
5. Open Add observation, demonstrate the upload/manual entry path, and point out validation.
6. Show the empty and error recovery states and close with the end-to-end decision flow.
