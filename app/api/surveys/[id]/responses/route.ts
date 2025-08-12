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

    const responses = await prisma.response.findMany({
      where: { 
        surveyId: params.id
      },
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
              select: {
                id: true,
                text: true,
                type: true,
                order: true
              }
            }
          },
          orderBy: {
            question: {
              order: 'asc'
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { answers, evidences = {}, isDraft = false } = body;

    // Validate survey exists and is published
    const survey = await prisma.survey.findUnique({
      where: { 
        id: params.id,
        isActive: true
      },
      include: {
        questions: {
          include: {
            variableQuestion: true
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    if (!survey.isPublished) {
      return NextResponse.json({ error: 'Survey is not published' }, { status: 400 });
    }

    // Check if survey is within date range
    const now = new Date();
    if (survey.startDate && survey.startDate > now) {
      return NextResponse.json({ error: 'Survey has not started yet' }, { status: 400 });
    }
    if (survey.endDate && survey.endDate < now) {
      return NextResponse.json({ error: 'Survey has ended' }, { status: 400 });
    }

    // Check if user already has a response
    let existingResponse = await prisma.response.findUnique({
      where: {
        surveyId_userId: {
          surveyId: params.id,
          userId: session.user.id
        }
      }
    });

    // If this is a final submission and response already completed, prevent duplicate
    if (!isDraft && existingResponse?.completedAt) {
      return NextResponse.json({ error: 'You have already completed this survey' }, { status: 400 });
    }

    // Calculate total score if not a draft
    let totalScore = null;
    if (!isDraft) {
      totalScore = 0;
      for (const question of survey.questions) {
        const answerValue = answers[question.id];
        if (answerValue && question.options) {
          try {
            const options = Array.isArray(question.options) ? question.options : JSON.parse(question.options as string);
            if (question.type === 'single_select') {
              const selectedOption = options.find((opt: any) => opt.text === answerValue);
              if (selectedOption) {
                totalScore += (selectedOption.absoluteScore || 0) * question.weight;
              }
            } else if (question.type === 'multi_select') {
              const selectedValues = answerValue.split(',').map((v: string) => v.trim());
              for (const value of selectedValues) {
                const selectedOption = options.find((opt: any) => opt.text === value);
                if (selectedOption) {
                  totalScore += (selectedOption.absoluteScore || 0) * question.weight;
                }
              }
            }
          } catch (error) {
            console.error('Error parsing question options:', error);
          }
        }
      }
    }

    // Create or update response
    const responseData = {
      surveyId: params.id,
      userId: session.user.id,
      completedAt: isDraft ? null : new Date(),
      score: totalScore
    };

    let response;
    if (existingResponse) {
      response = await prisma.response.update({
        where: { id: existingResponse.id },
        data: responseData
      });
    } else {
      response = await prisma.response.create({
        data: responseData
      });
    }

    // Delete existing answers if updating
    if (existingResponse) {
      await prisma.answer.deleteMany({
        where: { responseId: response.id }
      });
    }

    // Create answer records
    const answerData = [];
    for (const question of survey.questions) {
      const answerValue = answers[question.id];
      if (answerValue !== undefined && answerValue !== '') {
        let score = null;
        
        // Calculate score for this answer if not a draft
        if (!isDraft && question.options) {
          try {
            const options = Array.isArray(question.options) ? question.options : JSON.parse(question.options as string);
            if (question.type === 'single_select') {
              const selectedOption = options.find((opt: any) => opt.text === answerValue);
              if (selectedOption) {
                score = (selectedOption.absoluteScore || 0) * question.weight;
              }
            } else if (question.type === 'multi_select') {
              score = 0;
              const selectedValues = answerValue.split(',').map((v: string) => v.trim());
              for (const value of selectedValues) {
                const selectedOption = options.find((opt: any) => opt.text === value);
                if (selectedOption) {
                  score += (selectedOption.absoluteScore || 0) * question.weight;
                }
              }
            }
          } catch (error) {
            console.error('Error calculating answer score:', error);
          }
        }

        answerData.push({
          responseId: response.id,
          questionId: question.id,
          value: answerValue,
          evidence: evidences[question.id] || null,
          score: score
        });
      }
    }

    if (answerData.length > 0) {
      await prisma.answer.createMany({
        data: answerData
      });
    }

    // Return the response with answers
    const fullResponse = await prisma.response.findUnique({
      where: { id: response.id },
      include: {
        answers: {
          include: {
            question: {
              select: {
                id: true,
                text: true,
                type: true,
                order: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(fullResponse, { status: 201 });
  } catch (error) {
    console.error('Error creating response:', error);
    return NextResponse.json(
      { error: 'Failed to create response' },
      { status: 500 }
    );
  }
}