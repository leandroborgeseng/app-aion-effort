// scripts/createAdminUser.ts
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'admin@aion.com';
  const password = process.argv[3] || 'admin123';
  const name = process.argv[4] || 'Administrador';

  console.log(`Criando usuário administrador: ${email}`);

  // Verificar se usuário já existe
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log('Usuário já existe. Atualizando senha...');
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        password: hashedPassword,
        role: 'admin',
        active: true,
        canImpersonate: true,
      },
    });
    console.log('✅ Senha atualizada com sucesso!');
  } else {
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'admin',
        active: true,
        canImpersonate: true,
      },
    });
    console.log('✅ Usuário administrador criado com sucesso!');
  }

  console.log(`\nCredenciais:`);
  console.log(`Email: ${email}`);
  console.log(`Senha: ${password}`);
  console.log(`\n⚠️  IMPORTANTE: Altere a senha após o primeiro login!`);
}

main()
  .catch((e) => {
    console.error('Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

