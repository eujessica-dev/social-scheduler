import { PrismaClient, MemberRole, OrganizationPlan } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const user = await prisma.user.upsert({
    where: { email: 'admin@socialscheduler.dev' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@socialscheduler.dev',
      // senha: Admin@123 (Argon2id hash gerado em runtime, aqui é placeholder)
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$placeholder',
      emailVerifiedAt: new Date(),
    },
  })

  const org = await prisma.organization.upsert({
    where: { slug: 'minha-agencia' },
    update: {},
    create: {
      name: 'Minha Agência',
      slug: 'minha-agencia',
      plan: OrganizationPlan.pro,
      members: {
        create: {
          userId: user.id,
          role: MemberRole.owner,
          acceptedAt: new Date(),
        },
      },
    },
  })

  console.log(`Usuário criado: ${user.email}`)
  console.log(`Organização criada: ${org.name}`)
  console.log('Seed concluído.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
