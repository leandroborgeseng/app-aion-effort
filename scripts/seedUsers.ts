// scripts/seedUsers.ts
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Senha padrão para todos os usuários de teste
const DEFAULT_PASSWORD = 'senha123';

// Setores de exemplo para atribuir aos usuários
const setores = [
  { id: 101, name: 'UTI 1' },
  { id: 102, name: 'UTI 2' },
  { id: 103, name: 'Emergência' },
  { id: 104, name: 'Centro Cirúrgico' },
  { id: 105, name: 'Radiologia' },
  { id: 106, name: 'Cardiologia' },
  { id: 107, name: 'Neurologia' },
  { id: 108, name: 'Pediatria' },
];

async function seedUsers() {
  try {
    console.log('🌱 Criando usuários de teste...\n');

    // Limpar usuários existentes (opcional - descomente se quiser resetar)
    // await prisma.user.deleteMany({});
    // console.log('✅ Usuários anteriores removidos\n');

    const users = [
      {
        email: 'admin@teste.com',
        name: 'Administrador Sistema',
        role: 'admin',
        active: true,
        canImpersonate: true,
        sectors: [],
      },
      {
        email: 'gerente1@teste.com',
        name: 'Gerente UTI',
        role: 'gerente',
        active: true,
        canImpersonate: true,
        sectors: [],
      },
      {
        email: 'gerente2@teste.com',
        name: 'Gerente Emergência',
        role: 'gerente',
        active: true,
        canImpersonate: true,
        sectors: [],
      },
      {
        email: 'usuario1@teste.com',
        name: 'Usuário UTI 1',
        role: 'comum',
        active: true,
        canImpersonate: false,
        sectors: [101], // UTI 1
      },
      {
        email: 'usuario2@teste.com',
        name: 'Usuário UTI 2',
        role: 'comum',
        active: true,
        canImpersonate: false,
        sectors: [102], // UTI 2
      },
      {
        email: 'usuario3@teste.com',
        name: 'Usuário Emergência',
        role: 'comum',
        active: true,
        canImpersonate: false,
        sectors: [103], // Emergência
      },
      {
        email: 'usuario4@teste.com',
        name: 'Usuário Centro Cirúrgico',
        role: 'comum',
        active: true,
        canImpersonate: false,
        sectors: [104], // Centro Cirúrgico
      },
      {
        email: 'usuario5@teste.com',
        name: 'Usuário Múltiplos Setores',
        role: 'comum',
        active: true,
        canImpersonate: false,
        sectors: [105, 106, 107], // Radiologia, Cardiologia, Neurologia
      },
    ];

    const createdUsers: any[] = [];

    for (const userData of users) {
      // Verificar se o usuário já existe
      const existing = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      // Hash da senha padrão
      const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

      if (existing) {
        console.log(`⏭️  Usuário já existe: ${userData.email}`);
        // Atualizar senha se não tiver ou se for diferente
        if (!existing.password || existing.password.length < 20) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { password: hashedPassword },
          });
          console.log(`   ✅ Senha atualizada para: ${DEFAULT_PASSWORD}`);
        }
        createdUsers.push(existing);
        continue;
      }

      const user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          password: hashedPassword,
          role: userData.role,
          active: userData.active,
          canImpersonate: userData.canImpersonate,
          sectors: {
            create: userData.sectors.map((sectorId) => ({
              sectorId,
              sectorName: setores.find((s) => s.id === sectorId)?.name,
            })),
          },
        },
        include: {
          sectors: true,
        },
      });

      console.log(`✅ Criado: ${user.name} (${user.email}) - ${user.role}`);
      if (user.sectors.length > 0) {
        console.log(`   Setores: ${user.sectors.map((s) => s.sectorName || `Setor ${s.sectorId}`).join(', ')}`);
      }
      createdUsers.push(user);
    }

    // Atribuir usuários aos gerentes
    // Buscar usuários com setores incluídos
    const gerente1 = await prisma.user.findUnique({
      where: { email: 'gerente1@teste.com' },
      include: { sectors: true },
    });
    const gerente2 = await prisma.user.findUnique({
      where: { email: 'gerente2@teste.com' },
      include: { sectors: true },
    });
    
    // Buscar todos os usuários comuns com setores para atribuir aos gerentes
    const allUsers = await prisma.user.findMany({
      where: { role: 'comum' },
      include: { sectors: true },
    });
    
    const usuariosUTI = allUsers.filter((u) => u.sectors && u.sectors.some((s: any) => s.sectorId === 101 || s.sectorId === 102));
    const usuariosEmergencia = allUsers.filter((u) => u.sectors && u.sectors.some((s: any) => s.sectorId === 103));

    if (gerente1 && usuariosUTI.length > 0) {
      for (const usuario of usuariosUTI) {
        if (usuario.role === 'comum') {
          await prisma.userManager.upsert({
            where: {
              managerId_userId: {
                managerId: gerente1.id,
                userId: usuario.id,
              },
            },
            create: {
              managerId: gerente1.id,
              userId: usuario.id,
            },
            update: {},
          });
        }
      }
      console.log(`\n✅ Gerente 1 (UTI) agora gerencia ${usuariosUTI.length} usuário(s)`);
    }

    if (gerente2 && usuariosEmergencia.length > 0) {
      for (const usuario of usuariosEmergencia) {
        if (usuario.role === 'comum') {
          await prisma.userManager.upsert({
            where: {
              managerId_userId: {
                managerId: gerente2.id,
                userId: usuario.id,
              },
            },
            create: {
              managerId: gerente2.id,
              userId: usuario.id,
            },
            update: {},
          });
        }
      }
      console.log(`✅ Gerente 2 (Emergência) agora gerencia ${usuariosEmergencia.length} usuário(s)`);
    }

    console.log('\n✨ Seed concluído!');
    console.log(`\n📊 Resumo:`);
    console.log(`   - Total de usuários: ${createdUsers.length}`);
    console.log(`   - Administradores: ${createdUsers.filter((u) => u.role === 'admin').length}`);
    console.log(`   - Gerentes: ${createdUsers.filter((u) => u.role === 'gerente').length}`);
    console.log(`   - Usuários comuns: ${createdUsers.filter((u) => u.role === 'comum').length}`);
    console.log(`\n🔐 Credenciais de Login:`);
    console.log(`   ⚠️  Senha padrão para TODOS os usuários: ${DEFAULT_PASSWORD}`);
    console.log(`\n📋 Usuários criados:`);
    createdUsers.forEach((u) => {
      console.log(`   - ${u.email} (${u.name}) - Role: ${u.role}`);
    });
    console.log(`\n⚠️  IMPORTANTE: Altere as senhas após o primeiro login!`);
  } catch (error) {
    console.error('❌ Erro ao criar usuários:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedUsers()
  .then(() => {
    console.log('\n🎉 Processo finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  });

