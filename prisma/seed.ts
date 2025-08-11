import { PrismaClient, Role } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seeding...')

  // Create default admin user
  const adminPassword = await bcrypt.hash('Admin@123456', 10)
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@esg.com' },
    update: {},
    create: {
      email: 'admin@esg.com',
      password: adminPassword,
      name: 'System Administrator',
      role: Role.SUPER_ADMIN,
      organization: 'ESG System',
      department: 'Administration',
      isActive: true,
    },
  })

  console.log('Created admin user:', adminUser.email)

  // Create default ESG pillars
  const pillars = [
    {
      name: 'Environmental',
      description: 'Environmental sustainability and climate impact',
      weightage: 1.0,
    },
    {
      name: 'Social',
      description: 'Social responsibility and community impact',
      weightage: 1.0,
    },
    {
      name: 'Governance',
      description: 'Corporate governance and ethical practices',
      weightage: 1.0,
    },
  ]

  for (const pillarData of pillars) {
    const pillar = await prisma.pillar.upsert({
      where: { name: pillarData.name },
      update: {},
      create: pillarData,
    })

    console.log('Created pillar:', pillar.name)

    // Create sample levers and hierarchical variables for each pillar
    if (pillar.name === 'Environmental') {
      const levers = [
        { name: 'Carbon Emissions', description: 'GHG emissions and carbon footprint' },
        { name: 'Resource Management', description: 'Water, waste, and energy management' },
        { name: 'Biodiversity', description: 'Impact on ecosystems and biodiversity' },
      ]

      for (const leverData of levers) {
        const lever = await prisma.lever.upsert({
          where: { 
            pillarId_name: {
              pillarId: pillar.id,
              name: leverData.name
            }
          },
          update: {},
          create: {
            ...leverData,
            pillarId: pillar.id,
            weightage: 1.0,
          },
        })
        console.log(`  Created lever: ${lever.name}`)

        // Create hierarchical variables for Carbon Emissions lever
        if (lever.name === 'Carbon Emissions') {
          // Root variable - Total Emissions
          const totalEmissions = await prisma.variable.upsert({
            where: { id: `total-emissions-${lever.id}` },
            update: {},
            create: {
              id: `total-emissions-${lever.id}`,
              name: 'Total Emissions',
              description: 'Complete carbon footprint assessment',
              weightage: 1.0,
              leverId: lever.id,
              level: 0,
              path: 'Total Emissions',
              aggregationType: 'SUM',
            },
          })

          // Child variables - Direct and Indirect Emissions
          const directEmissions = await prisma.variable.upsert({
            where: { id: `direct-emissions-${lever.id}` },
            update: {},
            create: {
              id: `direct-emissions-${lever.id}`,
              name: 'Direct Emissions',
              description: 'Scope 1 and 2 emissions under direct control',
              weightage: 0.6,
              parentId: totalEmissions.id,
              level: 1,
              path: 'Total Emissions/Direct Emissions',
              aggregationType: 'WEIGHTED_AVERAGE',
              order: 1,
            },
          })

          const indirectEmissions = await prisma.variable.upsert({
            where: { id: `indirect-emissions-${lever.id}` },
            update: {},
            create: {
              id: `indirect-emissions-${lever.id}`,
              name: 'Indirect Emissions',
              description: 'Scope 3 emissions from value chain',
              weightage: 0.4,
              parentId: totalEmissions.id,
              level: 1,
              path: 'Total Emissions/Indirect Emissions',
              aggregationType: 'WEIGHTED_AVERAGE',
              order: 2,
            },
          })

          // Grandchild variables - Scope 1 and Scope 2
          const scope1 = await prisma.variable.upsert({
            where: { id: `scope1-${lever.id}` },
            update: {},
            create: {
              id: `scope1-${lever.id}`,
              name: 'Scope 1 Emissions',
              description: 'Direct GHG emissions from owned sources',
              weightage: 0.5,
              parentId: directEmissions.id,
              level: 2,
              path: 'Total Emissions/Direct Emissions/Scope 1 Emissions',
              aggregationType: 'SUM',
              order: 1,
            },
          })

          const scope2 = await prisma.variable.upsert({
            where: { id: `scope2-${lever.id}` },
            update: {},
            create: {
              id: `scope2-${lever.id}`,
              name: 'Scope 2 Emissions',
              description: 'Indirect GHG emissions from purchased energy',
              weightage: 0.5,
              parentId: directEmissions.id,
              level: 2,
              path: 'Total Emissions/Direct Emissions/Scope 2 Emissions',
              aggregationType: 'SUM',
              order: 2,
            },
          })

          const scope3 = await prisma.variable.upsert({
            where: { id: `scope3-${lever.id}` },
            update: {},
            create: {
              id: `scope3-${lever.id}`,
              name: 'Scope 3 Emissions',
              description: 'Other indirect GHG emissions from value chain',
              weightage: 1.0,
              parentId: indirectEmissions.id,
              level: 2,
              path: 'Total Emissions/Indirect Emissions/Scope 3 Emissions',
              aggregationType: 'SUM',
              order: 1,
            },
          })

          // Add questions to leaf variables
          await prisma.variableQuestion.upsert({
            where: { id: `scope1-fleet-${lever.id}` },
            update: {},
            create: {
              id: `scope1-fleet-${lever.id}`,
              variableId: scope1.id,
              text: 'What are your annual fleet emissions (tons CO2e)?',
              type: 'text',
              required: true,
              weightage: 0.6,
              order: 1,
            },
          })

          await prisma.variableQuestion.upsert({
            where: { id: `scope1-facilities-${lever.id}` },
            update: {},
            create: {
              id: `scope1-facilities-${lever.id}`,
              variableId: scope1.id,
              text: 'What are your annual facility emissions (tons CO2e)?',
              type: 'text',
              required: true,
              weightage: 0.4,
              order: 2,
            },
          })

          await prisma.variableQuestion.upsert({
            where: { id: `scope2-electricity-${lever.id}` },
            update: {},
            create: {
              id: `scope2-electricity-${lever.id}`,
              variableId: scope2.id,
              text: 'What are your purchased electricity emissions (tons CO2e)?',
              type: 'text',
              required: true,
              weightage: 0.8,
              order: 1,
            },
          })

          await prisma.variableQuestion.upsert({
            where: { id: `scope2-heating-${lever.id}` },
            update: {},
            create: {
              id: `scope2-heating-${lever.id}`,
              variableId: scope2.id,
              text: 'What are your purchased heating/cooling emissions (tons CO2e)?',
              type: 'text',
              required: true,
              weightage: 0.2,
              order: 2,
            },
          })

          await prisma.variableQuestion.upsert({
            where: { id: `scope3-supply-${lever.id}` },
            update: {},
            create: {
              id: `scope3-supply-${lever.id}`,
              variableId: scope3.id,
              text: 'What are your supply chain emissions (tons CO2e)?',
              type: 'text',
              required: true,
              weightage: 0.7,
              order: 1,
            },
          })

          await prisma.variableQuestion.upsert({
            where: { id: `scope3-travel-${lever.id}` },
            update: {},
            create: {
              id: `scope3-travel-${lever.id}`,
              variableId: scope3.id,
              text: 'What are your business travel emissions (tons CO2e)?',
              type: 'text',
              required: true,
              weightage: 0.3,
              order: 2,
            },
          })

          console.log(`    Created hierarchical variables for ${lever.name}`)
        }
      }
    } else if (pillar.name === 'Social') {
      const levers = [
        { name: 'Employee Wellbeing', description: 'Health, safety, and employee satisfaction' },
        { name: 'Community Engagement', description: 'Local community development and support' },
        { name: 'Diversity & Inclusion', description: 'Workplace diversity and inclusive practices' },
      ]

      for (const leverData of levers) {
        const lever = await prisma.lever.upsert({
          where: { 
            pillarId_name: {
              pillarId: pillar.id,
              name: leverData.name
            }
          },
          update: {},
          create: {
            ...leverData,
            pillarId: pillar.id,
            weightage: 1.0,
          },
        })
        console.log(`  Created lever: ${lever.name}`)
      }
    } else if (pillar.name === 'Governance') {
      const levers = [
        { name: 'Business Ethics', description: 'Ethical business conduct and compliance' },
        { name: 'Risk Management', description: 'Enterprise risk management and controls' },
        { name: 'Transparency', description: 'Disclosure and reporting practices' },
      ]

      for (const leverData of levers) {
        const lever = await prisma.lever.upsert({
          where: { 
            pillarId_name: {
              pillarId: pillar.id,
              name: leverData.name
            }
          },
          update: {},
          create: {
            ...leverData,
            pillarId: pillar.id,
            weightage: 1.0,
          },
        })
        console.log(`  Created lever: ${lever.name}`)
      }
    }
  }

  console.log('Database seeding completed successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('Error during seeding:', e)
    await prisma.$disconnect()
    process.exit(1)
  })