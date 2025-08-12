import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

// Helper function to get lever and pillar for a variable (including hierarchical)
async function getVariableHierarchy(variableId: string) {
  let currentVariable = await prisma.variable.findUnique({
    where: { id: variableId },
    include: {
      lever: {
        include: {
          pillar: true
        }
      }
    }
  });

  // If the variable has a lever directly, return it
  if (currentVariable?.lever) {
    return {
      lever: currentVariable.lever,
      pillar: currentVariable.lever.pillar
    };
  }

  // Otherwise, traverse up the hierarchy to find the root variable with a lever
  let depth = 0;
  while (currentVariable && !currentVariable.lever && currentVariable.parentId && depth < 10) {
    currentVariable = await prisma.variable.findUnique({
      where: { id: currentVariable.parentId },
      include: {
        lever: {
          include: {
            pillar: true
          }
        }
      }
    });
    depth++;
  }

  return {
    lever: currentVariable?.lever || null,
    pillar: currentVariable?.lever?.pillar || null
  };
}

const variableSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  leverId: z.string().optional(),
  parentId: z.string().optional(),
  weightage: z.number().min(0, "Weightage must be positive").default(1.0),
  description: z.string().optional(),
  aggregationType: z.string().optional(),
  level: z.number().optional(),
  path: z.string().optional(),
  order: z.number().optional(),
}).refine((data) => data.leverId || data.parentId, {
  message: "Either leverId or parentId is required",
  path: ["leverId"],
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
      },
      orderBy: [
        { level: 'asc' },
        { path: 'asc' },
        { name: 'asc' }
      ]
    })

    // Enrich variables with lever and pillar information from hierarchy
    const enrichedVariables = await Promise.all(
      variables.map(async (variable) => {
        const hierarchy = await getVariableHierarchy(variable.id);
        
        return {
          ...variable,
          lever: hierarchy.lever || variable.lever,
          parent: {
            ...variable.parent,
            lever: variable.parent?.lever || hierarchy.lever
          }
        };
      })
    );

    return NextResponse.json(enrichedVariables)
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

    // Check if lever exists (for root variables) or parent exists (for child variables)
    if (validatedData.leverId) {
      const lever = await prisma.lever.findUnique({
        where: { id: validatedData.leverId }
      })

      if (!lever) {
        return NextResponse.json(
          { error: "Lever not found" },
          { status: 400 }
        )
      }
    }

    if (validatedData.parentId) {
      const parent = await prisma.variable.findUnique({
        where: { id: validatedData.parentId }
      })

      if (!parent) {
        return NextResponse.json(
          { error: "Parent variable not found" },
          { status: 400 }
        )
      }
    }

    // Calculate level and path if not provided
    let level = validatedData.level || 0
    let path = validatedData.path || validatedData.name

    if (validatedData.parentId) {
      const parent = await prisma.variable.findUnique({
        where: { id: validatedData.parentId }
      })
      if (parent) {
        level = parent.level + 1
        path = parent.path ? `${parent.path}/${validatedData.name}` : validatedData.name
      }
    }

    const variable = await prisma.variable.create({
      data: {
        ...validatedData,
        level,
        path,
      },
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