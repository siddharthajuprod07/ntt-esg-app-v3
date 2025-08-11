# Hierarchical Variables System

## Overview

The hierarchical variables system allows you to create complex, nested variable structures where:
- Variables can have parent-child relationships
- Questions can be attached at any level
- Scores can be aggregated up the hierarchy
- Each variable can have its own aggregation strategy

## Database Schema

### Key Changes to Variable Model

```prisma
model Variable {
  // Self-referential relationship
  parentId    String?
  parent      Variable?  @relation("VariableHierarchy", fields: [parentId], references: [id])
  children    Variable[] @relation("VariableHierarchy")
  
  // Hierarchy metadata
  level       Int       // 0 = root, 1 = first level, etc.
  path        String?   // "root/child1/child2" for efficient queries
  order       Int       // Order among siblings
  
  // Either has a lever (root) OR a parent
  leverId     String?
  lever       Lever?
  
  // Aggregation settings
  aggregationType String?  // SUM, AVERAGE, WEIGHTED_AVERAGE, MAX, MIN
}
```

## Use Cases

### 1. Multi-Level ESG Assessment

```
Environmental (Pillar)
└── Carbon Management (Lever)
    └── Emissions Tracking (Root Variable)
        ├── Direct Emissions (Child Variable)
        │   ├── Scope 1 Emissions (Grandchild)
        │   │   └── Questions: Fleet emissions, Facility emissions
        │   └── Scope 2 Emissions (Grandchild)
        │       └── Questions: Purchased electricity, Heating
        └── Indirect Emissions (Child Variable)
            └── Scope 3 Emissions
                └── Questions: Supply chain, Business travel
```

### 2. Weighted Scoring System

Each variable can have:
- **Weightage**: Importance relative to siblings
- **Aggregation Type**: How child scores combine
- **Questions**: Direct assessment points

Example scoring:
```
Carbon Management Score = 
  (Direct Emissions × 0.6) + (Indirect Emissions × 0.4)
  
Where Direct Emissions = 
  AVERAGE(Scope 1 Questions) × 0.5 + AVERAGE(Scope 2 Questions) × 0.5
```

## API Endpoints

### Get Variable Tree
```typescript
GET /api/variables/hierarchy?leverId={leverId}
// Returns complete hierarchical tree
```

### Create Variable
```typescript
POST /api/variables/hierarchy
{
  "name": "Scope 1 Emissions",
  "parentId": "parent-variable-id",  // Optional
  "leverId": "lever-id",             // Required if no parent
  "weightage": 1.0,
  "aggregationType": "WEIGHTED_AVERAGE"
}
```

### Move Variable
```typescript
PUT /api/variables/hierarchy
{
  "variableId": "variable-to-move",
  "newParentId": "new-parent-id",    // Optional
  "newLeverId": "new-lever-id"       // If making it a root
}
```

### Clone Variable Tree
```typescript
POST /api/variables/hierarchy
{
  "action": "clone",
  "sourceVariableId": "template-variable",
  "targetParentId": "destination-parent"
}
```

## Utility Functions

### Calculate Variable Score
```typescript
const score = await calculateVariableScore(variableId, responseId);
// Recursively calculates score based on children and questions
```

### Get Variable Statistics
```typescript
const stats = await getVariableStats(variableId);
// Returns: directChildren, totalDescendants, totalQuestions, etc.
```

### Validate Move Operation
```typescript
const canMove = await canMoveVariable(variableId, newParentId);
// Prevents circular references
```

## Component Usage

### Variable Tree View
```tsx
import VariableTreeView from '@/components/variables/VariableTreeView';

<VariableTreeView 
  leverId="lever-id"
  onVariableSelect={(variable) => {
    // Handle variable selection
  }}
/>
```

## Benefits

1. **Flexibility**: Create any depth of hierarchy
2. **Reusability**: Clone entire variable structures
3. **Granularity**: Questions at any level
4. **Aggregation**: Multiple scoring strategies
5. **Performance**: Path-based queries for efficiency

## Migration Strategy

To migrate existing flat variables to hierarchical:

1. Keep existing variables as root level (level = 0)
2. Gradually add child variables as needed
3. Questions remain attached to any variable
4. Backward compatible with existing surveys

## Best Practices

1. **Limit Depth**: Keep hierarchy under 5 levels for usability
2. **Clear Naming**: Use descriptive names showing relationship
3. **Consistent Aggregation**: Use similar types within a branch
4. **Weight Normalization**: Ensure sibling weights sum to meaningful values
5. **Path Indexing**: Index path field for query performance

## Example: Creating a Complex Structure

```typescript
// Create root variable
const emissions = await createVariable({
  name: "Total Emissions",
  leverId: "carbon-lever-id",
  aggregationType: "SUM"
});

// Add child variables
const direct = await createVariable({
  name: "Direct Emissions",
  parentId: emissions.id,
  weightage: 0.6,
  aggregationType: "WEIGHTED_AVERAGE"
});

const scope1 = await createVariable({
  name: "Scope 1",
  parentId: direct.id,
  weightage: 0.5
});

// Attach questions to any level
await createVariableQuestion({
  variableId: scope1.id,
  text: "What are your fleet emissions (tons CO2)?",
  type: "number",
  weightage: 1.0
});
```

## Database Queries

### Get All Descendants
```sql
-- Using path pattern
SELECT * FROM Variable 
WHERE path LIKE 'root/parent/%'

-- Using recursive CTE
WITH RECURSIVE descendants AS (
  SELECT * FROM Variable WHERE id = 'parent-id'
  UNION ALL
  SELECT v.* FROM Variable v
  JOIN descendants d ON v.parentId = d.id
)
SELECT * FROM descendants;
```

### Calculate Aggregate Score
```sql
-- Aggregate scores up the tree
SELECT 
  v.id,
  v.name,
  v.aggregationType,
  SUM(
    CASE 
      WHEN v.aggregationType = 'SUM' THEN child_score * child_weight
      WHEN v.aggregationType = 'AVERAGE' THEN child_score / COUNT(*)
      ELSE child_score * child_weight / SUM(child_weight)
    END
  ) as total_score
FROM Variable v
LEFT JOIN scores ON scores.variableId = v.id
GROUP BY v.id;
```