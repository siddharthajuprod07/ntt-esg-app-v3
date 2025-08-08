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

    const variable = await prisma.variable.findUnique({
      where: { id: params.id },
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

    // Check if variable exists
    const existingVariable = await prisma.variable.findUnique({
      where: { id: params.id }
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
      where: { id: params.id },
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

    // Check if variable exists
    const existingVariable = await prisma.variable.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    })

    if (!existingVariable) {
      return NextResponse.json({ error: "Variable not found" }, { status: 404 })
    }

    // Check if variable has any questions
    if (existingVariable._count.questions > 0) {
      return NextResponse.json(
        { error: "Cannot delete variable with existing questions. Delete questions first." },
        { status: 400 }
      )
    }

    // Soft delete by setting isActive to false
    const variable = await prisma.variable.update({
      where: { id: params.id },
      data: { isActive: false }
    })

    return NextResponse.json({ message: "Variable deleted successfully" })
  } catch (error) {
    console.error("Error deleting variable:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}