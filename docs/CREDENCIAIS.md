# Credenciais de Login

## 🔐 Senha Padrão
**TODOS os usuários de teste usam a mesma senha padrão: `senha123`**

⚠️ **IMPORTANTE**: Altere as senhas após o primeiro login!

## 📋 Usuários Disponíveis

### Administrador
- **Email**: `admin@teste.com`
- **Nome**: Administrador Sistema
- **Role**: `admin`
- **Permissões**: Acesso total ao sistema, pode personificar outros usuários
- **Senha**: `senha123`

### Gerentes

#### Gerente UTI
- **Email**: `gerente1@teste.com`
- **Nome**: Gerente UTI
- **Role**: `gerente`
- **Permissões**: Pode personificar usuários, gerencia usuários de UTI
- **Senha**: `senha123`

#### Gerente Emergência
- **Email**: `gerente2@teste.com`
- **Nome**: Gerente Emergência
- **Role**: `gerente`
- **Permissões**: Pode personificar usuários, gerencia usuários de Emergência
- **Senha**: `senha123`

### Usuários Comuns

#### Usuário UTI 1
- **Email**: `usuario1@teste.com`
- **Nome**: Usuário UTI 1
- **Role**: `comum`
- **Setores**: UTI 1 (ID: 101)
- **Senha**: `senha123`

#### Usuário UTI 2
- **Email**: `usuario2@teste.com`
- **Nome**: Usuário UTI 2
- **Role**: `comum`
- **Setores**: UTI 2 (ID: 102)
- **Senha**: `senha123`

#### Usuário Emergência
- **Email**: `usuario3@teste.com`
- **Nome**: Usuário Emergência
- **Role**: `comum`
- **Setores**: Emergência (ID: 103)
- **Senha**: `senha123`

#### Usuário Centro Cirúrgico
- **Email**: `usuario4@teste.com`
- **Nome**: Usuário Centro Cirúrgico
- **Role**: `comum`
- **Setores**: Centro Cirúrgico (ID: 104)
- **Senha**: `senha123`

#### Usuário Múltiplos Setores
- **Email**: `usuario5@teste.com`
- **Nome**: Usuário Múltiplos Setores
- **Role**: `comum`
- **Setores**: Radiologia (ID: 105), Cardiologia (ID: 106), Neurologia (ID: 107)
- **Senha**: `senha123`

## 🚀 Como Criar Novos Usuários

### Opção 1: Usar o script de seed
```bash
pnpm seed:users
```

### Opção 2: Criar um administrador específico
```bash
pnpm create:admin <email> <senha> <nome>
# Exemplo:
pnpm create:admin admin@exemplo.com minhaSenha123 Administrador
```

## 📝 Notas

- Todos os usuários de teste foram criados com a senha padrão `senha123`
- Os usuários comuns só podem ver dados dos setores atribuídos a eles
- Administradores e gerentes podem ver todos os dados
- Gerentes podem personificar usuários que gerenciam
- Administradores podem personificar qualquer usuário

## 🔒 Segurança

- As senhas são armazenadas usando hash bcrypt (10 rounds)
- Após 5 tentativas de login falhadas, a conta é bloqueada por 15 minutos
- Sessões expiram após 7 dias
- Tokens JWT são usados para autenticação

