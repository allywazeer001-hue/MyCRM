# Reporting & Analytics

The platform has several reporting layers: real-time analytics views, dashboards, saved reports, and pivot tables.

---

## Analytics Views

Analytics views are configurable data queries saved per user or shared with the org. They support:

- **Aggregation**: COUNT, SUM, AVG, MIN, MAX
- **Grouping**: Group results by any field
- **Filtering**: JSON filter conditions with AND/OR logic
- **Sorting**: Multi-column sort

Access via: `GET /analytics/views/list`

### Getting Data

```http
POST /api/v1/analytics/data/:moduleId
{
  "aggregation": "COUNT",
  "groupBy": "status",
  "filters": [
    { "field": "createdAt", "operator": "greaterThan", "value": "2026-01-01" }
  ],
  "sortBy": "count",
  "sortDir": "desc"
}
```

---

## Dashboards

Dashboards (`/analytics/dashboards`) are collections of widgets. Each dashboard can be:
- **Private** (creator only)
- **Shared by role/department/user**
- **Public** (visible to all org members)

### Widget Types

| Type | Description |
|------|-------------|
| `KPI_CARD` | Single metric with trend indicator |
| `BAR_CHART` | Vertical/horizontal bar chart |
| `PIE_CHART` | Pie/donut chart |
| `LINE_CHART` | Time-series line chart |
| `AREA_CHART` | Filled area under line |
| `DONUT_CHART` | Donut variant of pie |
| `TABLE` | Mini data table |
| `FUNNEL` | Funnel/conversion chart |

### Widget Config

Each widget stores its configuration as JSON:
```json
{
  "moduleId": "...",
  "field": "status",
  "aggregation": "COUNT",
  "groupBy": "status",
  "filters": [],
  "dateRange": "last_30_days",
  "colorScheme": "indigo"
}
```

Widgets support drag-resize via `position: { x, y, w, h }` (react-grid-layout style).

---

## Saved Reports

Saved reports (`/reports`) are named queries with:
- Column selection
- Filter conditions
- Sorting + grouping
- Page size
- Sharing (roles, specific users)

They generate tabular output and can be exported to CSV.

### Creating a Report

```http
POST /api/v1/reports
{
  "name": "Monthly Leads by Status",
  "moduleId": "...",
  "moduleName": "Leads",
  "moduleSlug": "leads",
  "columns": ["name", "status", "createdAt"],
  "filters": [{ "field": "status", "operator": "equals", "value": "new" }],
  "sortBy": "createdAt",
  "sortDir": "desc",
  "groupBy": "status",
  "pageSize": 50
}
```

---

## Analytics Targets

Targets track KPI progress toward a goal:

```json
{
  "name": "Q3 Revenue Target",
  "moduleId": "...",
  "fieldName": "amount",
  "aggregation": "SUM",
  "targetValue": 500000,
  "currentValue": 312000,
  "period": "QUARTERLY",
  "periodStart": "2026-07-01",
  "periodEnd": "2026-09-30"
}
```

`POST /analytics/targets/:id/compute` recalculates `currentValue` from live data.

---

## Saved Filters

Filters can be saved and reused:
```json
{
  "name": "High Priority Active",
  "conditions": [
    { "field": "priority", "operator": "equals", "value": "high" },
    { "field": "status", "operator": "notEquals", "value": "closed" }
  ],
  "logic": "AND",
  "context": "analytics"
}
```

---

## Kanban Analytics

```http
POST /api/v1/analytics/kanban/:moduleId
{
  "groupByField": "status",
  "filters": [],
  "sorts": [{ "field": "createdAt", "dir": "desc" }]
}
```

Returns records grouped by the specified field for kanban board rendering.

---

## Pivot Tables

See [Pivot-Table.md](Pivot-Table.md) for cross-tab analysis.

---

## Export

Records can be exported as CSV:
```http
GET /api/v1/modules/:moduleId/records/export/csv?filters=...&columns=name,status,amount
```

Saved reports also support CSV export from the UI.

---

## Performance Tracker

The **Tracker** module (`/tracker`) is a specialized scoring system:

1. Create a Tracker for a module (e.g., "Employee Performance")
2. Define **Criteria** (scored dimensions with weights)
3. Create **Sessions** (time-based scoring periods)
4. Score each record on each criterion per session
5. View **Performance Summary** with band classification

Bands (e.g., "Excellent 90–100", "Good 70–89") are configurable per tracker.

See `GET /tracker/:id/performance` for the summary and `GET /tracker/:id/grid` for the scoring grid.
