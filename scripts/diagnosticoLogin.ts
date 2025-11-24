// scripts/diagnosticoLogin.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.log('📋 Listando todos os usuários do sistema:');
    console.log('==========================================\n');
    
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          loginAttempts: true,
          lockedUntil: true,
          lastLogin: true,
          createdAt: true,
        },
        orderBy: { email: 'asc' },
      });

      if (users.length === 0) {
        console.log('❌ Nenhum usuário encontrado no banco de dados!');
        console.log('\n💡 Para criar um usuário admin:');
        console.log('   pnpm create:admin');
        process.exit(1);
      }

      console.log(`Total de usuários: ${users.length}\n`);
      
      users.forEach((user, index) => {
        const locked = user.lockedUntil && user.lockedUntil > new Date();
        const status = !user.active 
          ? '❌ INATIVO' 
          : locked 
            ? '🔒 BLOQUEADO' 
            : user.loginAttempts >= 3 
              ? '⚠️  MUITAS TENTATIVAS' 
              : '✅ OK';

        console.log(`${index + 1}. ${user.email} (${user.name})`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Status: ${status}`);
        console.log(`   Ativo: ${user.active ? 'Sim' : 'Não'}`);
        console.log(`   Tentativas de login: ${user.loginAttempts}/5`);
        
        if (user.lockedUntil) {
          const now = new Date();
          const lockedUntil = new Date(user.lockedUntil);
          const minutesLeft = Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000);
          
          if (minutesLeft > 0) {
            console.log(`   🔒 Bloqueado até: ${lockedUntil.toLocaleString('pt-BR')} (${minutesLeft} minutos restantes)`);
          } else {
            console.log(`   ✅ Bloqueio expirado`);
          }
        }
        
        if (user.lastLogin) {
          console.log(`   Último login: ${new Date(user.lastLogin).toLocaleString('pt-BR')}`);
        } else {
          console.log(`   Último login: Nunca`);
        }
        
        console.log('');
      });

      console.log('\n💡 Para diagnosticar um usuário específico:');
      console.log('   pnpm tsx scripts/diagnosticoLogin.ts email@exemplo.com');
      console.log('\n💡 Para desbloquear um usuário:');
      console.log('   pnpm unlock:user email@exemplo.com');
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar usuários:', error.message);
      process.exit(1);
    }
  } else {
    console.log(`🔍 Diagnosticando usuário: ${email}`);
    console.log('==========================================\n');

    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          sectors: {
            select: {
              sectorId: true,
              sectorName: true,
            },
          },
        },
      });

      if (!user) {
        console.error(`❌ Usuário não encontrado: ${email}`);
        console.log('\n📋 Usuários disponíveis:');
        const allUsers = await prisma.user.findMany({
          select: { email: true, name: true },
          orderBy: { email: 'asc' },
        });
        allUsers.forEach((u) => {
          console.log(`   - ${u.email} (${u.name})`);
        });
        process.exit(1);
      }

      const now = new Date();
      const isLocked = user.lockedUntil && new Date(user.lockedUntil) > now;
      const lockedUntil = user.lockedUntil ? new Date(user.lockedUntil) : null;
      const minutesLeft = lockedUntil && isLocked
        ? Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000)
        : null;

      console.log('📊 Informações do Usuário:');
      console.log('----------------------------');
      console.log(`Email: ${user.email}`);
      console.log(`Nome: ${user.name}`);
      console.log(`Role: ${user.role}`);
      console.log(`Ativo: ${user.active ? '✅ Sim' : '❌ Não'}`);
      console.log(`Criado em: ${new Date(user.createdAt).toLocaleString('pt-BR')}`);
      
      if (user.lastLogin) {
        console.log(`Último login: ${new Date(user.lastLogin).toLocaleString('pt-BR')}`);
      } else {
        console.log('Último login: Nunca');
      }
      
      console.log('\n🔐 Status de Segurança:');
      console.log('------------------------');
      console.log(`Tentativas de login: ${user.loginAttempts}/5`);
      
      if (isLocked && minutesLeft) {
        console.log(`🔒 BLOQUEADO até: ${lockedUntil?.toLocaleString('pt-BR')}`);
        console.log(`   ⏱️  Tempo restante: ${minutesLeft} minutos`);
        console.log('\n💡 Para desbloquear:');
        console.log(`   pnpm unlock:user ${user.email}`);
      } else if (user.loginAttempts >= 3) {
        console.log(`⚠️  ATENÇÃO: ${user.loginAttempts} tentativas falhadas (limite: 5)`);
        console.log('   O usuário será bloqueado na próxima tentativa falha.');
      } else {
        console.log('✅ Usuário não está bloqueado');
      }

      console.log('\n📋 Setores Associados:');
      console.log('----------------------');
      if (user.sectors && user.sectors.length > 0) {
        user.sectors.forEach((sector) => {
          console.log(`   - Setor ${sector.sectorId}: ${sector.sectorName || 'Sem nome'}`);
        });
      } else {
        console.log('   Nenhum setor associado');
        if (user.role === 'admin') {
          console.log('   (Admin tem acesso a todos os setores)');
        }
      }

      console.log('\n💡 Possíveis Problemas e Soluções:');
      console.log('-----------------------------------');
      
      if (!user.active) {
        console.log('❌ Usuário inativo');
        console.log('   Solução: Ativar o usuário no banco de dados');
      }
      
      if (isLocked) {
        console.log(`❌ Conta bloqueada por ${minutesLeft} minutos`);
        console.log('   Solução: Aguardar ou desbloquear manualmente');
        console.log(`   Comando: pnpm unlock:user ${user.email}`);
      }
      
      if (user.loginAttempts >= 5) {
        console.log('❌ Muitas tentativas de login falhadas');
        console.log('   Solução: Desbloquear e verificar senha');
        console.log(`   Comando: pnpm unlock:user ${user.email}`);
      }

      console.log('\n✅ Se nenhum problema acima, verifique:');
      console.log('   - Email digitado corretamente');
      console.log('   - Senha correta');
      console.log('   - Servidor backend rodando');
      console.log('   - Logs do servidor para mais detalhes');

    } catch (error: any) {
      console.error('❌ Erro ao diagnosticar usuário:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  await prisma.$disconnect();
}

main();

