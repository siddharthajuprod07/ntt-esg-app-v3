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
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const createdByMe = searchParams.get('createdByMe') === 'true';

    const whereClause: any = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(createdByMe ? { createdById: session.user.id } : {})
    };

    const surveys = await prisma.survey.findMany({
      where: whereClause,
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
        },
        responses: {
          select: {
            id: true,
            completedAt: true
          }
        }
      },
      orderBy: [
        { updatedAt: 'desc' }
      ]
    });

    // Add separate counts for total responses, completed responses, and drafts
    const surveysWithCounts = surveys.map(survey => {
      const completedResponses = survey.responses.filter(r => r.completedAt !== null).length;
      const draftResponses = survey.responses.filter(r => r.completedAt === null).length;
      
      return {
        ...survey,
        _count: {
          ...survey._count,
          responses: survey.responses.length, // Total responses including drafts
          completedResponses: completedResponses,
          draftResponses: draftResponses
        },
        responses: undefined // Remove the responses array from the response
      };
    });

    return NextResponse.json(surveysWithCounts);
  } catch (error) {
    console.error('Error fetching surveys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch surveys' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to create surveys
    if (!['SUPER_ADMIN', 'ORG_ADMIN', 'SURVEY_CREATOR'].includes(session.user.role)) {
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
      selectedQuestions,
      selectedPillars,
      selectedLevers,
      selectedVariables
    } = body;

    // Validate required fields
    if (!title || !category) {
      return NextResponse.json(
        { error: 'Title and category are required' },
        { status: 400 }
      );
    }

    // Get questions based on direct selection or hierarchy
    let questionIds: string[] = [];
    
    if (selectedQuestions && selectedQuestions.length > 0) {
      // Use directly selected questions
      questionIds = selectedQuestions;
    } else if (selectedVariables && selectedVariables.length > 0) {
      // Get questions from specific variables
      const questions = await prisma.variableQuestion.findMany({
        where: {
          variableId: { in: selectedVariables },
          variable: {
            isActive: true
          }
        },
        orderBy: [
          { variableId: 'asc' },
          { order: 'asc' }
        ]
      });
      questionIds = questions.map(q => q.id);
    } else if (selectedLevers && selectedLevers.length > 0) {
      // Get questions from variables under selected levers
      const questions = await prisma.variableQuestion.findMany({
        where: {
          variable: {
            OR: [
              { leverId: { in: selectedLevers } },
              { 
                parent: {
                  leverId: { in: selectedLevers }
                }
              }
            ],
            isActive: true
          }
        },
        orderBy: [
          { variableId: 'asc' },
          { order: 'asc' }
        ]
      });
      questionIds = questions.map(q => q.id);
    } else if (selectedPillars && selectedPillars.length > 0) {
      // Get questions from variables under selected pillars
      const questions = await prisma.variableQuestion.findMany({
        where: {
          variable: {
            OR: [
              {
                lever: {
                  pillarId: { in: selectedPillars }
                }
              },
              {
                parent: {
                  lever: {
                    pillarId: { in: selectedPillars }
                  }
                }
              }
            ],
            isActive: true
          }
        },
        orderBy: [
          { variableId: 'asc' },
          { order: 'asc' }
        ]
      });
      questionIds = questions.map(q => q.id);
    }

    const survey = await prisma.survey.create({
      data: {
        title,
        description,
        category,
        createdById: session.user.id,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        allowAnonymous: allowAnonymous || false,
        maxResponses,
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

    // Create survey questions from selected variable questions
    if (questionIds.length > 0) {
      const variableQuestions = await prisma.variableQuestion.findMany({
        where: {
          id: { in: questionIds }
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
        surveyId: survey.id,
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

    return NextResponse.json(survey, { status: 201 });
  } catch (error) {
    console.error('Error creating survey:', error);
    return NextResponse.json(
      { error: 'Failed to create survey' },
      { status: 500 }
    );
  }
}