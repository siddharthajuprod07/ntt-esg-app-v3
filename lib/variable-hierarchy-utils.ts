import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Utility functions for managing hierarchical variables
 */

export interface VariableNode {
  id: string;
  name: string;
  weightage: number;
  description?: string | null;
  level: number;
  path?: string | null;
  parentId?: string | null;
  leverId?: string | null;
  children?: VariableNode[];
  questions?: any[];
  aggregationType?: string | null;
}

/**
 * Build a complete variable tree from a lever
 */
export async function getVariableTree(leverId: string): Promise<VariableNode[]> {
  const rootVariables = await prisma.variable.findMany({
    where: {
      leverId: leverId,
      parentId: null
    },
    include: {
      questions: true,
      children: {
        include: {
          questions: true,
          children: {
            include: {
              questions: true,
              children: {
                include: {
                  questions: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: [
      { order: 'asc' },
      { name: 'asc' }
    ]
  });

  return rootVariables;
}

/**
 * Get all ancestors of a variable
 */
export async function getVariableAncestors(variableId: string): Promise<VariableNode[]> {
  const ancestors: VariableNode[] = [];
  let currentVariable = await prisma.variable.findUnique({
    where: { id: variableId },
    include: { parent: true }
  });

  while (currentVariable?.parent) {
    ancestors.unshift(currentVariable.parent);
    currentVariable = await prisma.variable.findUnique({
      where: { id: currentVariable.parent.id },
      include: { parent: true }
    });
  }

  return ancestors;
}

/**
 * Get all descendants of a variable
 */
export async function getVariableDescendants(variableId: string): Promise<VariableNode[]> {
  const variable = await prisma.variable.findUnique({
    where: { id: variableId },
    include: {
      children: {
        include: {
          children: {
            include: {
              children: {
                include: {
                  children: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!variable) return [];

  const descendants: VariableNode[] = [];
  
  function collectDescendants(node: any) {
    if (node.children) {
      for (const child of node.children) {
        descendants.push(child);
        collectDescendants(child);
      }
    }
  }

  collectDescendants(variable);
  return descendants;
}

/**
 * Create a variable with automatic path and level calculation
 */
export async function createVariable(data: {
  name: string;
  description?: string;
  weightage?: number;
  parentId?: string;
  leverId?: string;
  order?: number;
  aggregationType?: string;
}) {
  let level = 0;
  let path = data.name;

  if (data.parentId) {
    const parent = await prisma.variable.findUnique({
      where: { id: data.parentId }
    });
    
    if (parent) {
      level = parent.level + 1;
      path = parent.path ? `${parent.path}/${data.name}` : data.name;
    }
  }

  return await prisma.variable.create({
    data: {
      ...data,
      level,
      path,
      weightage: data.weightage || 1.0,
      order: data.order || 0
    }
  });
}

/**
 * Move a variable to a new parent (or make it a root variable)
 */
export async function moveVariable(
  variableId: string,
  newParentId?: string,
  newLeverId?: string
) {
  const variable = await prisma.variable.findUnique({
    where: { id: variableId },
    include: { children: true }
  });

  if (!variable) {
    throw new Error('Variable not found');
  }

  // Calculate new level and path
  let newLevel = 0;
  let newPath = variable.name;

  if (newParentId) {
    const newParent = await prisma.variable.findUnique({
      where: { id: newParentId }
    });
    
    if (newParent) {
      newLevel = newParent.level + 1;
      newPath = newParent.path ? `${newParent.path}/${variable.name}` : variable.name;
    }
  }

  // Update the variable
  const updated = await prisma.variable.update({
    where: { id: variableId },
    data: {
      parentId: newParentId || null,
      leverId: newParentId ? null : newLeverId, // Only set leverId if no parent
      level: newLevel,
      path: newPath
    }
  });

  // Recursively update all descendants' paths and levels
  if (variable.children.length > 0) {
    await updateDescendantPaths(variableId, newPath, newLevel);
  }

  return updated;
}

/**
 * Recursively update paths and levels for all descendants
 */
async function updateDescendantPaths(
  parentId: string,
  parentPath: string,
  parentLevel: number
) {
  const children = await prisma.variable.findMany({
    where: { parentId }
  });

  for (const child of children) {
    const newPath = `${parentPath}/${child.name}`;
    const newLevel = parentLevel + 1;

    await prisma.variable.update({
      where: { id: child.id },
      data: {
        path: newPath,
        level: newLevel
      }
    });

    // Recursively update this child's descendants
    await updateDescendantPaths(child.id, newPath, newLevel);
  }
}

/**
 * Calculate aggregate score for a variable based on its children and questions
 */
export async function calculateVariableScore(
  variableId: string,
  responseId: string
): Promise<number> {
  const variable = await prisma.variable.findUnique({
    where: { id: variableId },
    include: {
      questions: true,
      children: true
    }
  });

  if (!variable) return 0;

  let score = 0;
  let totalWeight = 0;

  // Calculate score from direct questions
  if (variable.questions.length > 0) {
    for (const question of variable.questions) {
      const answer = await prisma.answer.findUnique({
        where: {
          responseId_questionId: {
            responseId,
            questionId: question.id
          }
        }
      });

      if (answer?.score) {
        score += answer.score * question.weightage;
        totalWeight += question.weightage;
      }
    }
  }

  // Calculate score from child variables
  if (variable.children.length > 0) {
    for (const child of variable.children) {
      const childScore = await calculateVariableScore(child.id, responseId);
      score += childScore * child.weightage;
      totalWeight += child.weightage;
    }
  }

  // Apply aggregation type
  if (totalWeight > 0) {
    switch (variable.aggregationType) {
      case 'AVERAGE':
      case 'WEIGHTED_AVERAGE':
        return score / totalWeight;
      case 'SUM':
      default:
        return score;
    }
  }

  return 0;
}

/**
 * Get variable statistics (count of children, questions, total descendants)
 */
export async function getVariableStats(variableId: string) {
  const variable = await prisma.variable.findUnique({
    where: { id: variableId },
    include: {
      questions: true,
      children: true
    }
  });

  if (!variable) return null;

  const descendants = await getVariableDescendants(variableId);

  return {
    directChildren: variable.children.length,
    directQuestions: variable.questions.length,
    totalDescendants: descendants.length,
    totalQuestions: descendants.reduce((sum, desc: any) => 
      sum + (desc.questions?.length || 0), variable.questions.length
    ),
    level: variable.level,
    path: variable.path
  };
}

/**
 * Validate that moving a variable won't create a circular reference
 */
export async function canMoveVariable(
  variableId: string,
  newParentId: string
): Promise<boolean> {
  if (variableId === newParentId) return false;

  const descendants = await getVariableDescendants(variableId);
  return !descendants.some(d => d.id === newParentId);
}

/**
 * Clone a variable tree (useful for creating similar structures)
 */
export async function cloneVariableTree(
  sourceVariableId: string,
  targetLeverId?: string,
  targetParentId?: string
): Promise<VariableNode> {
  const source = await prisma.variable.findUnique({
    where: { id: sourceVariableId },
    include: {
      questions: true,
      children: {
        include: {
          questions: true,
          children: true
        }
      }
    }
  });

  if (!source) {
    throw new Error('Source variable not found');
  }

  // Create the root clone
  const cloned = await createVariable({
    name: `${source.name} (Copy)`,
    description: source.description,
    weightage: source.weightage,
    leverId: targetLeverId,
    parentId: targetParentId,
    aggregationType: source.aggregationType
  });

  // Clone questions
  for (const question of source.questions) {
    await prisma.variableQuestion.create({
      data: {
        variableId: cloned.id,
        text: question.text,
        type: question.type,
        options: question.options,
        required: question.required,
        weightage: question.weightage,
        order: question.order,
        formula: question.formula
      }
    });
  }

  // Recursively clone children
  for (const child of source.children) {
    await cloneVariableTree(child.id, undefined, cloned.id);
  }

  return cloned as VariableNode;
}