import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const leverUpdateSchema = z.object({
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

    const lever = await prisma.lever.findUnique({
      where: { id: params.id },
      include: {
        pillar: {
          select: {
            id: true,
            name: true
          }
        },
        variables: {
          where: { isActive: true },
          include: {
            _count: {
              select: { questions: true }
            }
          },
          orderBy: { name: 'asc' }
        },
        _count: {
          select: { variables: true }
        }
      }
    })

    if (!lever) {
      return NextResponse.json({ error: "Lever not found" }, { status: 404 })
    }

    return NextResponse.json(lever)
  } catch (error) {
    console.error("Error fetching lever:", error)
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

    // Check if user has permission to update levers
    if (!["SUPER_ADMIN", "ORG_ADMIN", "SURVEY_CREATOR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = leverUpdateSchema.parse(body)

    // Check if lever exists
    const existingLever = await prisma.lever.findUnique({
      where: { id: params.id }
    })

    if (!existingLever) {
      return NextResponse.json({ error: "Lever not found" }, { status: 404 })
    }

    // Check if name already exists within the same pillar (if updating name)
    if (validatedData.name && validatedData.name !== existingLever.name) {
      const nameExists = await prisma.lever.findFirst({
        where: {
          name: validatedData.name,
          pillarId: existingLever.pillarId
        }
      })

      if (nameExists) {
        return NextResponse.json(
          { error: "A lever with this name already exists in this pillar" },
          { status: 400 }
        )
      }
    }

    const lever = await prisma.lever.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        pillar: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: { variables: true }
        }
      }
    })

    return NextResponse.json(lever)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error updating lever:", error)
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

    // Check if user has permission to delete levers
    if (!["SUPER_ADMIN", "ORG_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if lever exists
    const existingLever = await prisma.lever.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { variables: true }
        }
      }
    })

    if (!existingLever) {
      return NextResponse.json({ error: "Lever not found" }, { status: 404 })
    }

    // Check if lever has any variables
    if (existingLever._count.variables > 0) {
      return NextResponse.json(
        { error: "Cannot delete lever with existing variables. Delete variables first." },
        { status: 400 }
      )
    }

    // Soft delete by setting isActive to false
    const lever = await prisma.lever.update({
      where: { id: params.id },
      data: { isActive: false }
    })

    return NextResponse.json({ message: "Lever deleted successfully" })
  } catch (error) {
    console.error("Error deleting lever:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}