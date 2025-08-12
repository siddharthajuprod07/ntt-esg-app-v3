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

          // Add questions to leaf variables with new features
          await prisma.variableQuestion.upsert({
            where: { id: `scope1-reduction-${lever.id}` },
            update: {},
            create: {
              id: `scope1-reduction-${lever.id}`,
              variableId: scope1.id,
              text: 'What is your Scope 1 emissions reduction target?',
              type: 'single_select',
              options: [
                { text: 'No target set', absoluteScore: 0, internalScore: 0 },
                { text: '10-20% reduction', absoluteScore: 5, internalScore: 4 },
                { text: '20-40% reduction', absoluteScore: 8, internalScore: 7 },
                { text: '>40% reduction', absoluteScore: 10, internalScore: 10 }
              ],
              required: true,
              weightage: 2.0,
              order: 1,
              groupId: 'scope1-emissions',
              isGroupLead: true,
              requiresEvidence: true,
              evidenceDescription: 'Please upload your Scope 1 emissions reduction strategy document'
            },
          })

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
              order: 2,
              groupId: 'scope1-emissions',
              isGroupLead: false,
              requiresEvidence: true,
              evidenceDescription: 'Upload fleet emissions report'
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
              order: 3,
              groupId: 'scope1-emissions',
              isGroupLead: false,
              requiresEvidence: false,
              evidenceDescription: null
            },
          })

          await prisma.variableQuestion.upsert({
            where: { id: `scope2-renewable-${lever.id}` },
            update: {},
            create: {
              id: `scope2-renewable-${lever.id}`,
              variableId: scope2.id,
              text: 'What renewable energy sources do you use?',
              type: 'multi_select',
              options: [
                { text: 'Solar', absoluteScore: 3, internalScore: 3 },
                { text: 'Wind', absoluteScore: 3, internalScore: 3 },
                { text: 'Hydro', absoluteScore: 2, internalScore: 2 },
                { text: 'Geothermal', absoluteScore: 2, internalScore: 2 },
                { text: 'Biomass', absoluteScore: 2, internalScore: 2 }
              ],
              required: false,
              weightage: 1.5,
              order: 1,
              groupId: null,
              isGroupLead: false,
              requiresEvidence: false,
              evidenceDescription: null
            },
          })

          await prisma.variableQuestion.upsert({
            where: { id: `scope2-electricity-${lever.id}` },
            update: {},
            create: {
              id: `scope2-electricity-${lever.id}`,
              variableId: scope2.id,
              text: 'What percentage of electricity comes from renewable sources?',
              type: 'single_select',
              options: [
                { text: '0-10%', absoluteScore: 2, internalScore: 2 },
                { text: '10-30%', absoluteScore: 5, internalScore: 4 },
                { text: '30-50%', absoluteScore: 7, internalScore: 6 },
                { text: '>50%', absoluteScore: 10, internalScore: 10 }
              ],
              required: true,
              weightage: 0.8,
              order: 2,
              groupId: null,
              isGroupLead: false,
              requiresEvidence: true,
              evidenceDescription: 'Upload renewable energy certificates or purchase agreements'
            },
          })

          await prisma.variableQuestion.upsert({
            where: { id: `scope3-tracking-${lever.id}` },
            update: {},
            create: {
              id: `scope3-tracking-${lever.id}`,
              variableId: scope3.id,
              text: 'Do you track Scope 3 emissions across your value chain?',
              type: 'single_select',
              options: [
                { text: 'Yes, comprehensively', absoluteScore: 10, internalScore: 10 },
                { text: 'Partially', absoluteScore: 5, internalScore: 5 },
                { text: 'No', absoluteScore: 0, internalScore: 0 }
              ],
              required: true,
              weightage: 2.0,
              order: 1,
              groupId: 'scope3-emissions',
              isGroupLead: true,
              requiresEvidence: true,
              evidenceDescription: 'Upload Scope 3 emissions tracking methodology'
            },
          })

          await prisma.variableQuestion.upsert({
            where: { id: `scope3-categories-${lever.id}` },
            update: {},
            create: {
              id: `scope3-categories-${lever.id}`,
              variableId: scope3.id,
              text: 'Which Scope 3 categories do you track?',
              type: 'multi_select',
              options: [
                { text: 'Purchased goods and services', absoluteScore: 2, internalScore: 2 },
                { text: 'Capital goods', absoluteScore: 2, internalScore: 2 },
                { text: 'Fuel and energy activities', absoluteScore: 2, internalScore: 2 },
                { text: 'Transportation and distribution', absoluteScore: 2, internalScore: 2 },
                { text: 'Waste generated', absoluteScore: 1, internalScore: 1 },
                { text: 'Business travel', absoluteScore: 1, internalScore: 1 },
                { text: 'Employee commuting', absoluteScore: 1, internalScore: 1 },
                { text: 'Use of sold products', absoluteScore: 2, internalScore: 2 },
                { text: 'End-of-life treatment', absoluteScore: 1, internalScore: 1 }
              ],
              required: false,
              weightage: 1.5,
              order: 2,
              groupId: 'scope3-emissions',
              isGroupLead: false,
              requiresEvidence: false,
              evidenceDescription: null
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