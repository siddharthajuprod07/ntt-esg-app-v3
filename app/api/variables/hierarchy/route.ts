import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  getVariableTree, 
  createVariable, 
  moveVariable,
  getVariableStats,
  canMoveVariable,
  cloneVariableTree
} from '@/lib/variable-hierarchy-utils';

/**
 * GET /api/variables/hierarchy
 * Get hierarchical variable tree for a lever
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const leverId = searchParams.get('leverId');
    const variableId = searchParams.get('variableId');
    const action = searchParams.get('action');

    // Get stats for a specific variable
    if (variableId && action === 'stats') {
      const stats = await getVariableStats(variableId);
      return NextResponse.json(stats);
    }

    // Get tree for a lever
    if (leverId) {
      const tree = await getVariableTree(leverId);
      return NextResponse.json(tree);
    }

    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching variable hierarchy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch variable hierarchy' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/variables/hierarchy
 * Create a new variable in the hierarchy
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    // Clone a variable tree
    if (action === 'clone') {
      const { sourceVariableId, targetLeverId, targetParentId } = data;
      const cloned = await cloneVariableTree(
        sourceVariableId,
        targetLeverId,
        targetParentId
      );
      return NextResponse.json(cloned);
    }

    // Create a new variable
    const variable = await createVariable(data);
    return NextResponse.json(variable);
  } catch (error) {
    console.error('Error creating variable:', error);
    return NextResponse.json(
      { error: 'Failed to create variable' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/variables/hierarchy
 * Move or update a variable in the hierarchy
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { variableId, newParentId, newLeverId, action } = body;

    // Check if move is valid (no circular references)
    if (action === 'validate-move' && newParentId) {
      const canMove = await canMoveVariable(variableId, newParentId);
      return NextResponse.json({ canMove });
    }

    // Move the variable
    const moved = await moveVariable(variableId, newParentId, newLeverId);
    return NextResponse.json(moved);
  } catch (error) {
    console.error('Error moving variable:', error);
    return NextResponse.json(
      { error: 'Failed to move variable' },
      { status: 500 }
    );
  }
}