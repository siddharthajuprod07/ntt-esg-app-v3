import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const pillarUpdateSchema = z.object({
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

    const pillar = await prisma.pillar.findUnique({
      where: { id: params.id },
      include: {
        levers: {
          where: { isActive: true },
          include: {
            _count: {
              select: { variables: true }
            }
          },
          orderBy: { name: 'asc' }
        },
        _count: {
          select: { levers: true }
        }
      }
    })

    if (!pillar) {
      return NextResponse.json({ error: "Pillar not found" }, { status: 404 })
    }

    return NextResponse.json(pillar)
  } catch (error) {
    console.error("Error fetching pillar:", error)
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

    // Check if user has permission to update pillars
    if (!["SUPER_ADMIN", "ORG_ADMIN", "SURVEY_CREATOR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = pillarUpdateSchema.parse(body)

    // Check if pillar exists
    const existingPillar = await prisma.pillar.findUnique({
      where: { id: params.id }
    })

    if (!existingPillar) {
      return NextResponse.json({ error: "Pillar not found" }, { status: 404 })
    }

    // Check if name already exists (if updating name)
    if (validatedData.name && validatedData.name !== existingPillar.name) {
      const nameExists = await prisma.pillar.findUnique({
        where: { name: validatedData.name }
      })

      if (nameExists) {
        return NextResponse.json(
          { error: "A pillar with this name already exists" },
          { status: 400 }
        )
      }
    }

    const pillar = await prisma.pillar.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        _count: {
          select: { levers: true }
        }
      }
    })

    return NextResponse.json(pillar)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error updating pillar:", error)
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

    // Check if user has permission to delete pillars
    if (!["SUPER_ADMIN", "ORG_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if pillar exists
    const existingPillar = await prisma.pillar.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { levers: true }
        }
      }
    })

    if (!existingPillar) {
      return NextResponse.json({ error: "Pillar not found" }, { status: 404 })
    }

    // Check if pillar has any levers
    if (existingPillar._count.levers > 0) {
      return NextResponse.json(
        { error: "Cannot delete pillar with existing levers. Delete levers first." },
        { status: 400 }
      )
    }

    // Soft delete by setting isActive to false
    const pillar = await prisma.pillar.update({
      where: { id: params.id },
      data: { isActive: false }
    })

    return NextResponse.json({ message: "Pillar deleted successfully" })
  } catch (error) {
    console.error("Error deleting pillar:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}