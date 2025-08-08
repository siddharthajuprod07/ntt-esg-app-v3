import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const variableSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  leverId: z.string().min(1, "Lever ID is required"),
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
    const leverId = searchParams.get('leverId')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const whereClause = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(leverId && { leverId })
    }

    const variables = await prisma.variable.findMany({
      where: whereClause,
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
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(variables)
  } catch (error) {
    console.error("Error fetching variables:", error)
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

    // Check if user has permission to create variables
    if (!["SUPER_ADMIN", "ORG_ADMIN", "SURVEY_CREATOR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = variableSchema.parse(body)

    // Check if lever exists
    const lever = await prisma.lever.findUnique({
      where: { id: validatedData.leverId }
    })

    if (!lever) {
      return NextResponse.json(
        { error: "Lever not found" },
        { status: 400 }
      )
    }

    // Check if variable name already exists within this lever
    const existingVariable = await prisma.variable.findFirst({
      where: {
        name: validatedData.name,
        leverId: validatedData.leverId
      }
    })

    if (existingVariable) {
      return NextResponse.json(
        { error: "A variable with this name already exists in this lever" },
        { status: 400 }
      )
    }

    const variable = await prisma.variable.create({
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

    return NextResponse.json(variable, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating variable:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}