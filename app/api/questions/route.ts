import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// Helper function to get lever and pillar for a variable (including hierarchical)
async function getVariableHierarchy(variableId: string) {
  let currentVariable = await prisma.variable.findUnique({
    where: { id: variableId },
    include: {
      lever: {
        include: {
          pillar: true
        }
      }
    }
  });

  console.log(`Checking variable ${variableId}, has lever: ${!!currentVariable?.lever}, parentId: ${currentVariable?.parentId}`);

  // If the variable has a lever directly, return it
  if (currentVariable?.lever) {
    return {
      lever: currentVariable.lever,
      pillar: currentVariable.lever.pillar
    };
  }

  // Otherwise, traverse up the hierarchy to find the root variable with a lever
  let depth = 0;
  while (currentVariable && !currentVariable.lever && currentVariable.parentId && depth < 10) {
    console.log(`Traversing up to parent: ${currentVariable.parentId}`);
    currentVariable = await prisma.variable.findUnique({
      where: { id: currentVariable.parentId },
      include: {
        lever: {
          include: {
            pillar: true
          }
        }
      }
    });
    depth++;
    console.log(`Parent found: ${currentVariable?.name}, has lever: ${!!currentVariable?.lever}`);
  }

  return {
    lever: currentVariable?.lever || null,
    pillar: currentVariable?.lever?.pillar || null
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const variableId = searchParams.get('variableId');
    const variablesParam = searchParams.get('variables');
    const leversParam = searchParams.get('levers');
    const pillarsParam = searchParams.get('pillars');

    let whereClause: any = {
      variable: {
        isActive: true
      }
    };

    if (variableId) {
      whereClause.variableId = variableId;
    } else if (variablesParam) {
      // Get questions from specific variables
      const variableIds = variablesParam.split(',').filter(id => id.trim());
      whereClause.variableId = { in: variableIds };
    } else if (leversParam) {
      // Get questions from variables under selected levers (including hierarchical)
      const leverIds = leversParam.split(',').filter(id => id.trim());
      
      // First get all variables under these levers (including hierarchical children)
      const allVariables = await prisma.variable.findMany({
        where: { isActive: true }
      });
      
      const relevantVariableIds = allVariables.filter(variable => {
        if (variable.leverId && leverIds.includes(variable.leverId)) {
          return true; // Direct child of selected lever
        }
        
        // Check if it's a hierarchical child
        let current = variable;
        while (current.parentId) {
          const parent = allVariables.find(v => v.id === current.parentId);
          if (!parent) break;
          if (parent.leverId && leverIds.includes(parent.leverId)) {
            return true;
          }
          current = parent;
        }
        
        return false;
      }).map(v => v.id);
      
      whereClause.variableId = { in: relevantVariableIds };
    } else if (pillarsParam) {
      // Get questions from variables under selected pillars (including hierarchical)
      const pillarIds = pillarsParam.split(',').filter(id => id.trim());
      
      // Get relevant levers
      const relevantLevers = await prisma.lever.findMany({
        where: { pillarId: { in: pillarIds } }
      });
      const relevantLeverIds = relevantLevers.map(l => l.id);
      
      // Get all variables under these levers (including hierarchical children)
      const allVariables = await prisma.variable.findMany({
        where: { isActive: true }
      });
      
      const relevantVariableIds = allVariables.filter(variable => {
        if (variable.leverId && relevantLeverIds.includes(variable.leverId)) {
          return true; // Direct child of relevant lever
        }
        
        // Check if it's a hierarchical child
        let current = variable;
        while (current.parentId) {
          const parent = allVariables.find(v => v.id === current.parentId);
          if (!parent) break;
          if (parent.leverId && relevantLeverIds.includes(parent.leverId)) {
            return true;
          }
          current = parent;
        }
        
        return false;
      }).map(v => v.id);
      
      whereClause.variableId = { in: relevantVariableIds };
    }

    const questions = await prisma.variableQuestion.findMany({
      where: whereClause,
      include: {
        variable: true
      },
      orderBy: [
        { variableId: 'asc' },
        { order: 'asc' }
      ]
    });

    // Enrich questions with lever and pillar information
    const enrichedQuestions = await Promise.all(
      questions.map(async (question) => {
        const hierarchy = await getVariableHierarchy(question.variableId);
        
        // Debug logging
        if (question.variable.name?.includes('Scope')) {
          console.log(`Variable: ${question.variable.name}, Lever: ${hierarchy.lever?.name}, Pillar: ${hierarchy.pillar?.name}`);
        }
        
        return {
          ...question,
          variable: {
            ...question.variable,
            lever: hierarchy.lever,
            pillar: hierarchy.pillar
          }
        };
      })
    );

    return NextResponse.json(enrichedQuestions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      type,
      options,
      required,
      weightage,
      order,
      groupId,
      isGroupLead,
      requiresEvidence,
      evidenceDescription,
      variableId
    } = body;

    // Validate required fields
    if (!text || !type || !variableId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['single_select', 'multi_select', 'text'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid question type' },
        { status: 400 }
      );
    }

    // For non-text questions, validate options
    if (type !== 'text' && (!options || !Array.isArray(options) || options.length === 0)) {
      return NextResponse.json(
        { error: 'Options are required for select type questions' },
        { status: 400 }
      );
    }

    const question = await prisma.variableQuestion.create({
      data: {
        text,
        type,
        options: type !== 'text' ? options : null,
        required: required ?? true,
        weightage: weightage ?? 1.0,
        order: order ?? 1,
        groupId: groupId || null,
        isGroupLead: isGroupLead ?? false,
        requiresEvidence: requiresEvidence ?? false,
        evidenceDescription: evidenceDescription || null,
        variableId
      },
      include: {
        variable: true
      }
    });

    // Enrich with lever and pillar information
    const hierarchy = await getVariableHierarchy(question.variableId);
    const enrichedQuestion = {
      ...question,
      variable: {
        ...question.variable,
        lever: hierarchy.lever,
        pillar: hierarchy.pillar
      }
    };

    return NextResponse.json(enrichedQuestion, { status: 201 });
  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json(
      { error: 'Failed to create question' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      text,
      type,
      options,
      required,
      weightage,
      order,
      groupId,
      isGroupLead,
      requiresEvidence,
      evidenceDescription,
      variableId
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }

    const question = await prisma.variableQuestion.update({
      where: { id },
      data: {
        text,
        type,
        options: type !== 'text' ? options : null,
        required,
        weightage,
        order,
        groupId: groupId || null,
        isGroupLead,
        requiresEvidence,
        evidenceDescription: evidenceDescription || null,
        variableId
      },
      include: {
        variable: true
      }
    });

    // Enrich with lever and pillar information
    const hierarchy = await getVariableHierarchy(question.variableId);
    const enrichedQuestion = {
      ...question,
      variable: {
        ...question.variable,
        lever: hierarchy.lever,
        pillar: hierarchy.pillar
      }
    };

    return NextResponse.json(enrichedQuestion);
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json(
      { error: 'Failed to update question' },
      { status: 500 }
    );
  }
}