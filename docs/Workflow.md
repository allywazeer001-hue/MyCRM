# Workflow Automation

Workflows automate actions when records change. They run in the background via BullMQ.

---

## Concepts

| Term | Description |
|------|-------------|
| **Workflow** | A named automation rule: trigger + conditions + actions |
| **Trigger** | The event that starts the workflow |
| **Conditions** | Optional filters — workflow only runs if these pass |
| **Actions** | What to do (ordered list) |
| **Execution** | A log of one workflow run (stored in `WorkflowExecution`) |

---

## Triggers

| Trigger | When it fires |
|---------|--------------|
| `RECORD_CREATED` | New record created in the module |
| `RECORD_UPDATED` | Any field updated |
| `FIELD_CHANGED` | Specific field changes to a specific value |
| `RECORD_DELETED` | Record soft-deleted |
| `SCHEDULED` | Time-based (cron expression in `triggerConfig`) |
| `MANUAL` | Triggered explicitly from the UI or API |
| `WEBHOOK` | Incoming HTTP webhook call |
| `FORM_SUBMITTED` | A linked form receives a submission |

---

## Conditions

Conditions are JSON arrays applied before actions run:
```json
[
  { "field": "status", "operator": "equals", "value": "approved" },
  { "field": "amount", "operator": "greaterThan", "value": 10000 }
]
```

Operators: `equals`, `notEquals`, `contains`, `startsWith`, `greaterThan`, `lessThan`, `isEmpty`, `isNotEmpty`, `in`, `notIn`.

---

## Action Types

| Type | What it does |
|------|-------------|
| `SET_FIELD` | Update a field on the current record |
| `UPDATE_RECORD` | Update fields on a related/linked record |
| `SEND_NOTIFICATION` | Push in-app notification to users/roles/departments |
| `ASSIGN_USER` | Set a user assignment field on the record |
| `TAG` | Add/remove tags from the record |
| `CREATE_RECORD` | Create a new record in the same or another module |
| `CHANGE_STATUS` | Update a STATUS field to a specific value |
| `SEND_EMAIL` | Send email via SMTP using a template or inline body |
| `WEBHOOK` | HTTP POST to an external URL with record data |
| `UPDATE_RELATED` | Update records in a related module |
| `CREATE_TASK` | Create a workspace task |
| `DELAY` | Wait N minutes/hours/days before the next action |
| `TRIGGER_WORKFLOW` | Start another workflow (chaining) |

Each action has a `config` JSON object with action-specific parameters and an `order` integer for sequencing.

### SEND_EMAIL Action Config

```json
{
  "templateId": "template-id",     // optional: use existing template
  "subject": "Your {{name}} record was updated",
  "body": "<p>Dear {{name}}, your record status is now {{status}}.</p>",
  "recipientType": "field",        // "field" | "users" | "roles" | "email"
  "recipientField": "email",       // field name that holds the recipient email
  "mergeFields": ["name", "status", "id"]
}
```

Merge tags use `{{fieldName}}` syntax and are resolved from the record's data at execution time.

---

## Repeatable Workflows

`isRepeatable: Boolean` controls whether a workflow fires every time its trigger occurs, or only once per record. Set to `false` for one-time actions like "send welcome email on creation."

---

## Workflow Execution Log

Each run creates a `WorkflowExecution` row:
```json
{
  "workflowId": "...",
  "recordId": "...",
  "status": "completed",    // pending | running | completed | failed
  "input": { ... },         // trigger context
  "output": { ... },        // results per action
  "error": null,
  "startedAt": "...",
  "finishedAt": "..."
}
```

View via: `GET /workflows/:id/executions`.

---

## Testing a Workflow

```http
POST /api/v1/workflows/:id/execute-on-record
{
  "recordId": "record-cuid"
}
```

Immediately executes the workflow against the specified record, bypassing the trigger condition. Useful for debugging.

---

## Blueprint Tasks vs. Workflows

| Feature | Workflow | Blueprint |
|---------|----------|-----------|
| Trigger | Event-based | Stage transition |
| Approval | No | Yes — human task |
| Field lock | No | Yes — per stage |
| Visualization | Execution log | Stage tree |
| Use case | Auto-send email | Multi-stage approval process |

Use **Workflows** for automated data manipulation and notifications.
Use **Blueprints** when human review/approval is required between stages.

---

## Blueprint (Stage Workflow)

Blueprints define a stage machine for records (e.g., Draft → Review → Approved → Published).

### Structure

```json
{
  "phases": [
    { "id": "draft", "name": "Draft", "color": "#gray" },
    { "id": "review", "name": "Under Review", "color": "#blue" },
    { "id": "approved", "name": "Approved", "color": "#green" }
  ],
  "transitions": [
    {
      "id": "t1",
      "from": "draft",
      "to": "review",
      "name": "Submit for Review",
      "requiresApproval": true,
      "assignedRole": "MANAGER"
    }
  ],
  "fieldLocks": {
    "review": ["amount", "description"]  // locked fields in this stage
  }
}
```

### Executing a Transition

```http
POST /api/v1/blueprints/execute-transition
{
  "recordId": "...",
  "transitionId": "t1",
  "comment": "Ready for review"
}
```

If `requiresApproval`, a `BlueprintTask` is created for the assigned role. The approver sees it in their task queue (`GET /blueprints/my-pending-tasks`).

### Approval/Rejection

```http
POST /api/v1/blueprints/pending-tasks/:id/action
{
  "action": "approve",    // or "reject"
  "comment": "Looks good"
}
```
