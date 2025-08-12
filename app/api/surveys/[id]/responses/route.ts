import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const surveyId = params.id;
    const body = await request.json();
    const { answers } = body; // Array of { questionId, value }

    // Check if survey exists and is published
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        questions: {
          include: {
            variableQuestion: true
          }
        }
      }
    });

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    if (!survey.isPublished) {
      return NextResponse.json({ error: 'Survey is not published' }, { status: 400 });
    }

    // Check if user has already responded (unless anonymous responses are allowed)
    if (!survey.allowAnonymous) {
      const existingResponse = await prisma.response.findUnique({
        where: {
          surveyId_userId: {
            surveyId,
            userId: session.user.id
          }
        }
      });

      if (existingResponse) {
        return NextResponse.json({ error: 'You have already responded to this survey' }, { status: 400 });
      }
    }

    // Check max responses limit
    if (survey.maxResponses) {
      const responseCount = await prisma.response.count({
        where: { surveyId }
      });

      if (responseCount >= survey.maxResponses) {
        return NextResponse.json({ error: 'Survey has reached maximum response limit' }, { status: 400 });
      }
    }

    // Calculate total score
    let totalScore = 0;
    let totalWeight = 0;

    const answersWithScores = answers.map((answer: any) => {
      const question = survey.questions.find(q => q.id === answer.questionId);
      if (!question) {
        throw new Error(`Question not found: ${answer.questionId}`);
      }

      let score = 0;
      if (question.type !== 'text' && question.options) {
        const options = question.options as any[];
        if (question.type === 'single_select') {
          const selectedOption = options.find(opt => opt.text === answer.value);
          score = selectedOption ? selectedOption.absoluteScore : 0;
        } else if (question.type === 'multi_select') {
          const selectedValues = Array.isArray(answer.value) ? answer.value : [answer.value];
          score = selectedValues.reduce((sum: number, value: string) => {
            const option = options.find(opt => opt.text === value);
            return sum + (option ? option.absoluteScore : 0);
          }, 0);
        }
      }

      totalScore += score * question.weight;
      totalWeight += question.weight;

      return {
        questionId: answer.questionId,
        value: typeof answer.value === 'object' ? JSON.stringify(answer.value) : answer.value,
        score
      };
    });

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    // Create response with transaction
    const response = await prisma.$transaction(async (tx) => {
      const newResponse = await tx.response.create({
        data: {
          surveyId,
          userId: session.user.id,
          completedAt: new Date(),
          score: finalScore
        }
      });

      // Create answers
      await tx.answer.createMany({
        data: answersWithScores.map(answer => ({
          responseId: newResponse.id,
          questionId: answer.questionId,
          value: answer.value,
          score: answer.score
        }))
      });

      return newResponse;
    });

    return NextResponse.json({
      responseId: response.id,
      score: finalScore,
      message: 'Response submitted successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error submitting response:', error);
    return NextResponse.json(
      { error: 'Failed to submit response' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const surveyId = params.id;
    
    // Check if user has permission to view responses
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId }
    });

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    if (survey.createdById !== session.user.id && 
        !['SUPER_ADMIN', 'ORG_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const responses = await prisma.response.findMany({
      where: { surveyId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        answers: {
          include: {
            question: {
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
              }
            }
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    return NextResponse.json(responses);
  } catch (error) {
    console.error('Error fetching responses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch responses' },
      { status: 500 }
    );
  }
}