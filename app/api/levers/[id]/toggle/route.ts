import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const toggleSchema = z.object({
  isActive: z.boolean(),
})

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission to toggle levers
    if (!["SUPER_ADMIN", "ORG_ADMIN", "SURVEY_CREATOR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { isActive } = toggleSchema.parse(body)

    // Check if lever exists
    const existingLever = await prisma.lever.findUnique({
      where: { id: params.id },
      include: {
        pillar: {
          select: {
            isActive: true
          }
        }
      }
    })

    if (!existingLever) {
      return NextResponse.json({ error: "Lever not found" }, { status: 404 })
    }

    // Cannot activate lever if parent pillar is inactive
    if (isActive && !existingLever.pillar.isActive) {
      return NextResponse.json(
        { error: "Cannot activate lever when parent pillar is inactive" },
        { status: 400 }
      )
    }

    // If deactivating, also deactivate all child variables
    if (!isActive) {
      await prisma.variable.updateMany({
        where: { leverId: params.id },
        data: { isActive: false }
      })
    }

    const lever = await prisma.lever.update({
      where: { id: params.id },
      data: { isActive },
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
    console.error("Error toggling lever:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}