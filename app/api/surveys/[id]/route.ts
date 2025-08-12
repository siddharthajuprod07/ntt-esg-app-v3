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

    const survey = await prisma.survey.findUnique({
      where: { id: params.id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        questions: {
          include: {
            variableQuestion: {
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
            }
          },
          orderBy: {
            order: 'asc'
          }
        },
        _count: {
          select: {
            questions: true,
            responses: true
          }
        }
      }
    });

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    return NextResponse.json(survey);
  } catch (error) {
    console.error('Error fetching survey:', error);
    return NextResponse.json(
      { error: 'Failed to fetch survey' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const survey = await prisma.survey.findUnique({
      where: { id: params.id }
    });

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    // Check permission
    if (survey.createdById !== session.user.id && 
        !['SUPER_ADMIN', 'ORG_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      startDate,
      endDate,
      allowAnonymous,
      maxResponses,
      isActive,
      isPublished,
      selectedQuestions,
      selectedPillars,
      selectedLevers,
      selectedVariables
    } = body;

    const updatedSurvey = await prisma.survey.update({
      where: { id: params.id },
      data: {
        title: title || survey.title,
        description,
        category: category || survey.category,
        startDate: startDate ? new Date(startDate) : survey.startDate,
        endDate: endDate ? new Date(endDate) : survey.endDate,
        allowAnonymous: allowAnonymous ?? survey.allowAnonymous,
        maxResponses,
        isActive: isActive ?? survey.isActive,
        isPublished: isPublished ?? survey.isPublished,
        selectedPillars,
        selectedLevers,
        selectedVariables
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            questions: true,
            responses: true
          }
        }
      }
    });

    // If selectedQuestions is provided, update the survey questions
    if (selectedQuestions && Array.isArray(selectedQuestions)) {
      // Delete existing survey questions
      await prisma.surveyQuestion.deleteMany({
        where: { surveyId: params.id }
      });

      // Add new survey questions if any selected
      if (selectedQuestions.length > 0) {
        const variableQuestions = await prisma.variableQuestion.findMany({
          where: {
            id: { in: selectedQuestions }
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

        const surveyQuestionsData = variableQuestions.map((vq, index) => ({
          surveyId: params.id,
          variableQuestionId: vq.id,
          text: vq.text,
          type: vq.type,
          options: vq.options,
          required: vq.required,
          weight: vq.weightage,
          order: index + 1,
          groupId: vq.groupId,
          isGroupLead: vq.isGroupLead,
          requiresEvidence: vq.requiresEvidence,
          evidenceDescription: vq.evidenceDescription
        }));

        await prisma.surveyQuestion.createMany({
          data: surveyQuestionsData
        });
      }
    }

    return NextResponse.json(updatedSurvey);
  } catch (error) {
    console.error('Error updating survey:', error);
    return NextResponse.json(
      { error: 'Failed to update survey' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const survey = await prisma.survey.findUnique({
      where: { id: params.id }
    });

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    // Check permission
    if (survey.createdById !== session.user.id && 
        !['SUPER_ADMIN', 'ORG_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.survey.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Survey deleted successfully' });
  } catch (error) {
    console.error('Error deleting survey:', error);
    return NextResponse.json(
      { error: 'Failed to delete survey' },
      { status: 500 }
    );
  }
}