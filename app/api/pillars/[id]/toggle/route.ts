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

    // Check if user has permission to toggle pillars
    if (!["SUPER_ADMIN", "ORG_ADMIN", "SURVEY_CREATOR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { isActive } = toggleSchema.parse(body)

    // Check if pillar exists
    const existingPillar = await prisma.pillar.findUnique({
      where: { id: params.id }
    })

    if (!existingPillar) {
      return NextResponse.json({ error: "Pillar not found" }, { status: 404 })
    }

    // If deactivating, also deactivate all child levers
    if (!isActive) {
      await prisma.lever.updateMany({
        where: { pillarId: params.id },
        data: { isActive: false }
      })
    }

    const pillar = await prisma.pillar.update({
      where: { id: params.id },
      data: { isActive },
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
    console.error("Error toggling pillar:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}