import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const variableUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  weightage: z.number().min(0, "Weightage must be positive").optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resolvedParams = await params

    const variable = await prisma.variable.findUnique({
      where: { id: resolvedParams.id },
      include: {
        lever: {
          select: {
            id: true,
            name: true,
            pillar: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        questions: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { questions: true }
        }
      }
    })

    if (!variable) {
      return NextResponse.json({ error: "Variable not found" }, { status: 404 })
    }

    return NextResponse.json(variable)
  } catch (error) {
    console.error("Error fetching variable:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission to update variables
    if (!["SUPER_ADMIN", "ORG_ADMIN", "SURVEY_CREATOR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = variableUpdateSchema.parse(body)

    const resolvedParams = await params

    // Check if variable exists
    const existingVariable = await prisma.variable.findUnique({
      where: { id: resolvedParams.id }
    })

    if (!existingVariable) {
      return NextResponse.json({ error: "Variable not found" }, { status: 404 })
    }

    // Check if name already exists within the same lever (if updating name)
    if (validatedData.name && validatedData.name !== existingVariable.name) {
      const nameExists = await prisma.variable.findFirst({
        where: {
          name: validatedData.name,
          leverId: existingVariable.leverId
        }
      })

      if (nameExists) {
        return NextResponse.json(
          { error: "A variable with this name already exists in this lever" },
          { status: 400 }
        )
      }
    }

    const variable = await prisma.variable.update({
      where: { id: resolvedParams.id },
      data: validatedData,
      include: {
        lever: {
          select: {
            id: true,
            name: true,
            pillar: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: { questions: true }
        }
      }
    })

    return NextResponse.json(variable)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error updating variable:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission to delete variables
    if (!["SUPER_ADMIN", "ORG_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const resolvedParams = await params
    const { searchParams } = new URL(request.url)
    const forceHardDelete = searchParams.get('force') === 'true'

    // Check if variable exists with detailed information
    const existingVariable = await prisma.variable.findUnique({
      where: { id: resolvedParams.id },
      include: {
        children: {
          select: {
            id: true,
            name: true,
            isActive: true,
            _count: {
              select: { questions: true }
            }
          }
        },
        questions: {
          select: {
            id: true,
            text: true,
            type: true,
            required: true
          }
        },
        _count: {
          select: { 
            questions: true,
            children: true
          }
        }
      }
    })

    if (!existingVariable) {
      return NextResponse.json({ error: "Variable not found" }, { status: 404 })
    }

    // If variable is active, do soft delete (first click)
    if (existingVariable.isActive) {
      const updatedVariable = await prisma.variable.update({
        where: { id: resolvedParams.id },
        data: { isActive: false }
      })

      return NextResponse.json({ 
        message: "Variable deactivated successfully",
        type: "soft_delete",
        variable: updatedVariable
      })
    }

    // If variable is already inactive and force=true, do hard delete (second click)
    if (!existingVariable.isActive && forceHardDelete) {
      // Note: Since VariableQuestions don't directly relate to Answers in our current schema,
      // we can't count affected responses. This would need to be implemented if we had
      // a relationship between survey responses and variable questions.
      const responseCount = 0

      // Start transaction for hard delete
      await prisma.$transaction(async (tx) => {
        // Note: VariableQuestions don't have direct Answer relationships in our schema
        // Answers relate to Survey Questions, not VariableQuestions
        // If there were answers to delete, we would need to find them through a different relationship
        
        // Delete all questions belonging to this variable
        await tx.variableQuestion.deleteMany({
          where: {
            variableId: resolvedParams.id
          }
        })

        // Update children to point to this variable's parent (or remove parent)
        await tx.variable.updateMany({
          where: {
            parentId: resolvedParams.id
          },
          data: {
            parentId: existingVariable.parentId,
            level: existingVariable.parentId ? existingVariable.level : 0,
            // Note: path would need to be recalculated, but this is complex in raw SQL
          }
        })

        // Finally delete the variable itself
        await tx.variable.delete({
          where: {
            id: resolvedParams.id
          }
        })
      })

      return NextResponse.json({ 
        message: "Variable permanently deleted",
        type: "hard_delete",
        deletedQuestions: existingVariable._count.questions,
        affectedResponses: responseCount,
        childrenReassigned: existingVariable._count.children
      })
    }

    // If variable is inactive but no force flag, return deletion preview
    if (!existingVariable.isActive && !forceHardDelete) {
      // Note: Since VariableQuestions don't directly relate to Answers in our current schema,
      // we can't count affected responses. This would need to be implemented if we had
      // a relationship between survey responses and variable questions.
      const responseCount = 0

      return NextResponse.json({
        message: "Variable is ready for permanent deletion",
        type: "delete_preview",
        preview: {
          variable: {
            id: existingVariable.id,
            name: existingVariable.name,
            level: existingVariable.level
          },
          questionsToDelete: existingVariable.questions,
          childrenToReassign: existingVariable.children,
          affectedResponseCount: responseCount,
          totalQuestions: existingVariable._count.questions,
          totalChildren: existingVariable._count.children
        }
      })
    }

    return NextResponse.json({ error: "Invalid delete operation" }, { status: 400 })
  } catch (error) {
    console.error("Error deleting variable:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}