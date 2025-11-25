// scripts/verUsuario.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('Uso: pnpm tsx scripts/verUsuario.ts <email>');
    console.error('Exemplo: pnpm tsx scripts/verUsuario.ts leandro.borges@aion.eng.br');
    process.exit(1);
  }

  console.log(`Buscando usuário: ${email}\n`);

  // Buscar usuário
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      sectors: {
        select: {
          sectorId: true,
          sectorName: true,
        },
      },
      sessions: {
        where: {
          expiresAt: {
            gt: new Date(),
          },
        },
        select: {
          id: true,
          ipAddress: true,
          createdAt: true,
          lastUsedAt: true,
          expiresAt: true,
        },
        orderBy: {
          lastUsedAt: 'desc',
        },
        take: 5,
      },
    },
  });

  if (!user) {
    console.error(`❌ Usuário não encontrado: ${email}`);
    process.exit(1);
  }

  console.log('📋 Informações do Usuário:');
  console.log('─'.repeat(60));
  console.log(`ID:              ${user.id}`);
  console.log(`Email:           ${user.email}`);
  console.log(`Nome:            ${user.name}`);
  console.log(`Telefone:        ${user.phone || '(não informado)'}`);
  console.log(`Role:            ${user.role}`);
  console.log(`Ativo:           ${user.active ? '✅ Sim' : '❌ Não'}`);
  console.log(`Pode personificar: ${user.canImpersonate ? 'Sim' : 'Não'}`);
  console.log(`Último login:    ${user.lastLogin ? user.lastLogin.toLocaleString('pt-BR') : '(nunca)'}`);
  console.log(`Tentativas login: ${user.loginAttempts}`);
  console.log(`Bloqueado até:   ${user.lockedUntil ? user.lockedUntil.toLocaleString('pt-BR') : '(não bloqueado)'}`);
  console.log(`Criado em:       ${user.createdAt.toLocaleString('pt-BR')}`);
  console.log(`Atualizado em:   ${user.updatedAt.toLocaleString('pt-BR')}`);
  console.log('─'.repeat(60));

  // Hash da senha (apenas confirmar que existe, não mostrar)
  if (user.password) {
    const hashPreview = user.password.substring(0, 20) + '...';
    console.log(`Hash da senha:   ${hashPreview} (${user.password.length} caracteres)`);
    console.log('─'.repeat(60));
  }

  // Setores
  if (user.sectors && user.sectors.length > 0) {
    console.log('\n🏢 Setores vinculados:');
    user.sectors.forEach((sector) => {
      console.log(`   - ${sector.sectorName || `Setor ${sector.sectorId}`} (ID: ${sector.sectorId})`);
    });
  } else {
    console.log('\n🏢 Setores: Nenhum setor vinculado');
  }

  // Sessões ativas
  if (user.sessions && user.sessions.length > 0) {
    console.log('\n🔐 Sessões ativas:');
    user.sessions.forEach((session) => {
      console.log(`   - ${session.ipAddress || 'IP desconhecido'} | Criada: ${session.createdAt.toLocaleString('pt-BR')} | Última uso: ${session.lastUsedAt.toLocaleString('pt-BR')}`);
    });
  } else {
    console.log('\n🔐 Sessões: Nenhuma sessão ativa');
  }

  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

