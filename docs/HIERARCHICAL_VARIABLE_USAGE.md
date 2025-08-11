# How to Use Hierarchical Variables

## Creating Variables with the Enhanced Form

### 1. Root Variables (Under Levers)
To create a root variable directly under a lever:

1. Click **"Create Variable"**
2. Select **"Root Variable (under lever)"**
3. Choose a **Lever** from the dropdown
4. Fill in variable details:
   - **Name**: e.g., "Total Carbon Footprint"
   - **Weightage**: Relative importance (default: 1.0)
   - **Aggregation Type**: How child variables will be combined
     - **Sum**: Add all child values
     - **Average**: Mean of all child values  
     - **Weighted Average**: Child values weighted by their weightage
     - **Maximum**: Highest child value
     - **Minimum**: Lowest child value
   - **Description**: Optional explanation

### 2. Child Variables (Under Other Variables)
To create a child variable under another variable:

1. Click **"Create Variable"** 
2. Select **"Child Variable (under another variable)"**
3. Choose a **Parent Variable** from the dropdown
4. Fill in variable details (same as above)

## Hierarchical Structure Example

```
Environmental Pillar
└── Carbon Emissions Lever
    └── Total Emissions (Root Variable - SUM aggregation)
        ├── Direct Emissions (Child Variable - WEIGHTED_AVERAGE)
        │   ├── Scope 1 Emissions (Child Variable - SUM)
        │   │   └── Questions: Fleet emissions, Facility emissions
        │   └── Scope 2 Emissions (Child Variable - SUM)
        │       └── Questions: Electricity, Heating
        └── Indirect Emissions (Child Variable - WEIGHTED_AVERAGE)  
            └── Scope 3 Emissions (Child Variable - SUM)
                └── Questions: Supply chain, Business travel
```

## Variable Display Features

### Visual Indicators
- **Path Display**: Shows full hierarchy (e.g., "Total Emissions/Direct Emissions/Scope 1")
- **Level Badges**: L0, L1, L2 indicate depth in hierarchy
- **Aggregation Badges**: Shows how child scores combine (SUM, AVERAGE, etc.)
- **Pillar/Lever Tags**: Shows inherited or direct pillar and lever

### Editing Variables
- When editing, the form automatically detects if variable is root (has lever) or child (has parent)
- Parent type is pre-selected based on current variable structure
- All hierarchical relationships are preserved

## Best Practices

### 1. Planning Your Hierarchy
- Start with broad concepts at the top (root variables)
- Break down into more specific aspects (child variables)
- Keep hierarchy depth reasonable (3-5 levels max)

### 2. Weightage Strategy
- Use consistent weightage scales within sibling groups
- Consider relative importance when setting weights
- Child weightages combine based on parent's aggregation type

### 3. Aggregation Types
- **SUM**: Good for additive metrics (emissions, costs)
- **WEIGHTED_AVERAGE**: Good for scored assessments
- **AVERAGE**: Simple mean when all children are equal
- **MAX/MIN**: For threshold-based evaluations

### 4. Question Placement
- Questions can be attached at any level
- Leaf variables (no children) typically have most questions
- Parent variables can have summary questions

## Scoring Example

```
Total Emissions (SUM aggregation)
├── Direct Emissions (weight: 0.6, WEIGHTED_AVERAGE)
│   ├── Scope 1 (weight: 0.5, score: 85)
│   └── Scope 2 (weight: 0.5, score: 90)
│   Result: (85×0.5 + 90×0.5) / 1.0 = 87.5
└── Indirect Emissions (weight: 0.4, WEIGHTED_AVERAGE)
    └── Scope 3 (weight: 1.0, score: 70)
    Result: 70

Final Total: (87.5×0.6) + (70×0.4) = 52.5 + 28 = 80.5
```

This hierarchical system allows for complex ESG assessments while maintaining clarity and flexibility in scoring methodologies.