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

    // Check if user has permission to toggle variables
    if (!["SUPER_ADMIN", "ORG_ADMIN", "SURVEY_CREATOR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { isActive } = toggleSchema.parse(body)

    // Check if variable exists
    const existingVariable = await prisma.variable.findUnique({
      where: { id: params.id },
      include: {
        lever: {
          select: {
            isActive: true,
            pillar: {
              select: {
                isActive: true
              }
            }
          }
        }
      }
    })

    if (!existingVariable) {
      return NextResponse.json({ error: "Variable not found" }, { status: 404 })
    }

    // Cannot activate variable if parent lever or pillar is inactive
    if (isActive && (!existingVariable.lever.isActive || !existingVariable.lever.pillar.isActive)) {
      return NextResponse.json(
        { error: "Cannot activate variable when parent lever or pillar is inactive" },
        { status: 400 }
      )
    }

    // Note: Questions don't have isActive field yet, so no need to cascade deactivation

    const variable = await prisma.variable.update({
      where: { id: params.id },
      data: { isActive },
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
    console.error("Error toggling variable:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}