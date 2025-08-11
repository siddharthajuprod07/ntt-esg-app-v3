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

    // Await params to fix Next.js 15 issue
    const resolvedParams = await params

    // Check if variable exists - include both lever and parent for hierarchical support
    const existingVariable = await prisma.variable.findUnique({
      where: { id: resolvedParams.id },
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
        },
        parent: {
          select: {
            isActive: true,
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
        }
      }
    })

    if (!existingVariable) {
      return NextResponse.json({ error: "Variable not found" }, { status: 404 })
    }

    // Check parent hierarchy before activation
    if (isActive) {
      // For root variables (have lever), check lever and pillar
      if (existingVariable.lever) {
        if (!existingVariable.lever.isActive || !existingVariable.lever.pillar.isActive) {
          return NextResponse.json(
            { error: "Cannot activate variable when parent lever or pillar is inactive" },
            { status: 400 }
          )
        }
      }
      // For child variables (have parent), check parent and its hierarchy
      else if (existingVariable.parent) {
        if (!existingVariable.parent.isActive) {
          return NextResponse.json(
            { error: "Cannot activate variable when parent variable is inactive" },
            { status: 400 }
          )
        }
        // Check the parent's lever/pillar if it exists
        if (existingVariable.parent.lever) {
          if (!existingVariable.parent.lever.isActive || !existingVariable.parent.lever.pillar.isActive) {
            return NextResponse.json(
              { error: "Cannot activate variable when ancestor lever or pillar is inactive" },
              { status: 400 }
            )
          }
        }
      }
    }

    // Update the variable
    const variable = await prisma.variable.update({
      where: { id: resolvedParams.id },
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
        parent: {
          select: {
            id: true,
            name: true,
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