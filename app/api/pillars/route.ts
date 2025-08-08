import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const pillarSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  weightage: z.number().min(0, "Weightage must be positive").default(1.0),
  description: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const whereClause = includeInactive ? {} : { isActive: true }

    const pillars = await prisma.pillar.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { levers: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(pillars)
  } catch (error) {
    console.error("Error fetching pillars:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission to create pillars
    if (!["SUPER_ADMIN", "ORG_ADMIN", "SURVEY_CREATOR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = pillarSchema.parse(body)

    // Check if pillar name already exists
    const existingPillar = await prisma.pillar.findUnique({
      where: { name: validatedData.name }
    })

    if (existingPillar) {
      return NextResponse.json(
        { error: "A pillar with this name already exists" },
        { status: 400 }
      )
    }

    const pillar = await prisma.pillar.create({
      data: validatedData,
      include: {
        _count: {
          select: { levers: true }
        }
      }
    })

    return NextResponse.json(pillar, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating pillar:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}