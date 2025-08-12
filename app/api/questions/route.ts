import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const variableId = searchParams.get('variableId');

    const questions = await prisma.variableQuestion.findMany({
      where: variableId ? { variableId } : undefined,
      include: {
        variable: {
          include: {
            lever: {
              include: {
                pillar: true
              }
            }
          }
        }
      },
      orderBy: [
        { variableId: 'asc' },
        { order: 'asc' }
      ]
    });

    return NextResponse.json(questions);
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
        variable: {
          include: {
            lever: {
              include: {
                pillar: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(question, { status: 201 });
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
        variable: {
          include: {
            lever: {
              include: {
                pillar: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(question);
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json(
      { error: 'Failed to update question' },
      { status: 500 }
    );
  }
}