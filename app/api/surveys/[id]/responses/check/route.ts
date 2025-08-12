import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await prisma.response.findUnique({
      where: {
        surveyId_userId: {
          surveyId: params.id,
          userId: session.user.id
        }
      },
      include: {
        answers: {
          include: {
            question: {
              select: {
                id: true,
                order: true
              }
            }
          }
        }
      }
    });

    if (!response) {
      return NextResponse.json({
        hasResponse: false,
        isCompleted: false,
        answers: {}
      });
    }

    // Convert answers to the format expected by the UI
    const answersMap: Record<string, string> = {};
    const evidencesMap: Record<string, string> = {};
    
    response.answers.forEach(answer => {
      if (answer.value) {
        answersMap[answer.questionId] = answer.value;
      }
      if (answer.evidence) {
        evidencesMap[answer.questionId] = answer.evidence;
      }
    });

    return NextResponse.json({
      hasResponse: true,
      isCompleted: !!response.completedAt,
      answers: answersMap,
      evidences: evidencesMap,
      score: response.score,
      completedAt: response.completedAt,
      createdAt: response.createdAt,
      updatedAt: response.updatedAt
    });
  } catch (error) {
    console.error('Error checking response:', error);
    return NextResponse.json(
      { error: 'Failed to check response' },
      { status: 500 }
    );
  }
}