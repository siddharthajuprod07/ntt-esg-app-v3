import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const variablesParam = searchParams.get('variables');
    const leversParam = searchParams.get('levers');
    const pillarsParam = searchParams.get('pillars');

    let whereClause: any = {
      variable: {
        isActive: true
      }
    };

    if (variablesParam) {
      // Count questions from specific variables
      const variableIds = variablesParam.split(',').filter(id => id.trim());
      whereClause.variableId = { in: variableIds };
    } else if (leversParam) {
      // Count questions from variables under selected levers
      const leverIds = leversParam.split(',').filter(id => id.trim());
      whereClause.variable.OR = [
        { leverId: { in: leverIds } },
        { 
          parent: {
            leverId: { in: leverIds }
          }
        }
      ];
    } else if (pillarsParam) {
      // Count questions from variables under selected pillars
      const pillarIds = pillarsParam.split(',').filter(id => id.trim());
      whereClause.variable.OR = [
        {
          lever: {
            pillarId: { in: pillarIds }
          }
        },
        {
          parent: {
            lever: {
              pillarId: { in: pillarIds }
            }
          }
        }
      ];
    }

    const count = await prisma.variableQuestion.count({
      where: whereClause
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error counting questions:', error);
    return NextResponse.json(
      { error: 'Failed to count questions' },
      { status: 500 }
    );
  }
}