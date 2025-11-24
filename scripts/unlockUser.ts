// scripts/unlockUser.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Por favor, forneça o email do usuário:');
    console.log('   pnpm unlock:user email@exemplo.com');
    process.exit(1);
  }

  console.log(`🔓 Desbloqueando usuário: ${email}`);

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      console.error(`❌ Usuário não encontrado: ${email}`);
      process.exit(1);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
      },
    });

    console.log('✅ Usuário desbloqueado com sucesso!');
    console.log(`   Email: ${user.email}`);
    console.log(`   Nome: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Ativo: ${user.active ? 'Sim' : 'Não'}`);
    console.log('\n⚠️  Nota: O rate limiter por IP ainda pode bloquear por 15 minutos');
    console.log('   Se ainda não conseguir fazer login, aguarde alguns minutos.');
  } catch (error: any) {
    console.error('❌ Erro ao desbloquear usuário:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

