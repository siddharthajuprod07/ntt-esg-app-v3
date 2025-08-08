import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const leverSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  pillarId: z.string().min(1, "Pillar ID is required"),
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
    const pillarId = searchParams.get('pillarId')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const whereClause = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(pillarId && { pillarId })
    }

    const levers = await prisma.lever.findMany({
      where: whereClause,
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
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(levers)
  } catch (error) {
    console.error("Error fetching levers:", error)
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

    // Check if user has permission to create levers
    if (!["SUPER_ADMIN", "ORG_ADMIN", "SURVEY_CREATOR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = leverSchema.parse(body)

    // Check if pillar exists
    const pillar = await prisma.pillar.findUnique({
      where: { id: validatedData.pillarId }
    })

    if (!pillar) {
      return NextResponse.json(
        { error: "Pillar not found" },
        { status: 400 }
      )
    }

    // Check if lever name already exists within this pillar
    const existingLever = await prisma.lever.findFirst({
      where: {
        name: validatedData.name,
        pillarId: validatedData.pillarId
      }
    })

    if (existingLever) {
      return NextResponse.json(
        { error: "A lever with this name already exists in this pillar" },
        { status: 400 }
      )
    }

    const lever = await prisma.lever.create({
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

    return NextResponse.json(lever, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating lever:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}