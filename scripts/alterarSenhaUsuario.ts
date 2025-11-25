// scripts/alterarSenhaUsuario.ts
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error('Uso: pnpm tsx scripts/alterarSenhaUsuario.ts <email> <nova-senha>');
    console.error('Exemplo: pnpm tsx scripts/alterarSenhaUsuario.ts leandro.borges@aion.eng.br minhasenha123');
    process.exit(1);
  }

  console.log(`Buscando usuário: ${email}`);

  // Buscar usuário
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
    },
  });

  if (!user) {
    console.error(`❌ Usuário não encontrado: ${email}`);
    process.exit(1);
  }

  console.log('\n📋 Usuário encontrado:');
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Nome: ${user.name}`);
  console.log(`   Role: ${user.role}`);
  console.log(`   Ativo: ${user.active ? 'Sim' : 'Não'}`);

  // Gerar hash da nova senha
  console.log(`\n🔐 Gerando hash da nova senha...`);
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Atualizar senha
  console.log(`\n💾 Atualizando senha...`);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      // Resetar bloqueio de login se houver
      loginAttempts: 0,
      lockedUntil: null,
    },
  });

  console.log('\n✅ Senha alterada com sucesso!');
  console.log(`\n📋 Credenciais:`);
  console.log(`   Email: ${email}`);
  console.log(`   Nova senha: ${newPassword}`);
  console.log(`\n⚠️  IMPORTANTE: Informe ao usuário a nova senha!`);
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

