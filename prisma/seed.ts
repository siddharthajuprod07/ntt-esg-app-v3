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

    // Create sample levers for each pillar
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