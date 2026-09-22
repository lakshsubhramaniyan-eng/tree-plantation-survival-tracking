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

### Video walkthrough outline

Use the linked wireframe for a 3-5 minute recording:

1. Introduce the problem: field teams need to know which plantations are surviving and where replanting is needed.
2. Show the dashboard scan and explain the KPI hierarchy.
3. Apply region and period filters, then drill into the highlighted site.
4. Explain the plot comparison and observation history.
5. Open Add observation, demonstrate the upload/manual entry path, and point out validation.
6. Show the empty and error recovery states and close with the end-to-end decision flow.