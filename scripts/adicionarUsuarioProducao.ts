// scripts/adicionarUsuarioProducao.ts
// Script para adicionar ou atualizar usuário no banco de produção

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] || 'Usuário';
  const role = process.argv[5] || 'admin';

  if (!email || !password) {
    console.error('❌ Uso: pnpm tsx scripts/adicionarUsuarioProducao.ts <email> <senha> [nome] [role]');
    console.log('');
    console.log('Exemplo:');
    console.log('  pnpm tsx scripts/adicionarUsuarioProducao.ts leandro.borges@aion.eng.br senha123 "Leandro Borges" admin');
    console.log('');
    process.exit(1);
  }

  console.log(`🔧 Adicionando/Atualizando usuário: ${email}`);
  console.log(`   Nome: ${name}`);
  console.log(`   Role: ${role}`);
  console.log('');

  try {
    // Verificar se usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      console.log(`⚠️  Usuário já existe. Atualizando...`);
      
      // Hash da nova senha
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          password: hashedPassword,
          role: role as any,
          active: true,
          loginAttempts: 0,
          lockedUntil: null,
        },
      });

      console.log('✅ Usuário atualizado com sucesso!');
      console.log(`   Email: ${email}`);
      console.log(`   Nome: ${name}`);
      console.log(`   Role: ${role}`);
      console.log(`   Ativo: Sim`);
      console.log(`   Tentativas de login: Resetadas para 0`);
      console.log(`   Bloqueio: Removido`);
    } else {
      console.log(`➕ Criando novo usuário...`);
      
      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name,
          password: hashedPassword,
          role: role as any,
          active: true,
          loginAttempts: 0,
          lockedUntil: null,
        },
      });

      console.log('✅ Usuário criado com sucesso!');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Nome: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Ativo: Sim`);
    }

    console.log('');
    console.log('💡 Agora você pode fazer login com:');
    console.log(`   Email: ${email}`);
    console.log(`   Senha: ${password}`);
    
  } catch (error: any) {
    console.error('❌ Erro ao adicionar/atualizar usuário:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

