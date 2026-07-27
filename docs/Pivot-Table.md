# Pivot Tables

The pivot table feature provides cross-tabular analysis of module records.

---

## Overview

A pivot table aggregates record data across two dimensions:
- **Rows**: Grouped by one field (e.g., Region)
- **Columns**: Grouped by another field (e.g., Product Category)
- **Values**: Aggregated metric (e.g., SUM of Revenue)

---

## API

```http
GET /api/v1/pivot/:moduleId/data?rowField=region&colField=category&valueField=revenue&aggregation=SUM
```

### Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `rowField` | Yes | Field name for row grouping |
| `colField` | Yes | Field name for column grouping |
| `valueField` | No | Field to aggregate (required for SUM/AVG/MIN/MAX) |
| `aggregation` | Yes | `COUNT`, `SUM`, `AVG`, `MIN`, `MAX` |
| `filters` | No | JSON filter array |

### Response

```json
{
  "rows": ["North", "South", "East"],
  "columns": ["Electronics", "Clothing", "Food"],
  "data": {
    "North": {
      "Electronics": 125000,
      "Clothing": 45000,
      "Food": 32000
    },
    "South": {
      "Electronics": 98000,
      "Clothing": 67000,
      "Food": 28000
    }
  },
  "totals": {
    "rowTotals": { "North": 202000, "South": 193000 },
    "colTotals": { "Electronics": 223000, "Clothing": 112000 }
  }
}
```

---

## UI

The pivot table UI is at `/analytics/pivot` in the dashboard. Features:
- Field selector dropdowns for rows, columns, values
- Aggregation type selector
- Filter panel (reuses the standard filter builder)
- Export to CSV
- Transpose (swap rows/columns)

---

## Limitations

- Pivot data is computed on-the-fly from `records.data` JSON — large datasets (>10k records) may be slow. Consider adding database indexes on frequently pivoted fields.
- Only works with fields that have discrete values (SELECT, STATUS, RADIO) as row/column dimensions. Number fields work as value fields only.
- Date fields can be used as dimensions if grouped by month/quarter — this is configured in the pivot UI.

---

## Example Use Cases

| Row | Column | Value | Aggregation |
|-----|--------|-------|-------------|
| Sales Rep | Month | Revenue | SUM |
| Product | Region | Units Sold | SUM |
| Department | Status | Count | COUNT |
| Lead Source | Stage | Conversion | COUNT |
