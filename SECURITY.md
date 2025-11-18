# Segurança da Aplicação

Este documento descreve as medidas de segurança implementadas na aplicação.

## Autenticação e Autorização

### Sistema de Login
- **JWT Tokens**: Autenticação baseada em JSON Web Tokens
- **Sessões no Banco**: Tokens são armazenados no banco de dados com expiração
- **Hash de Senhas**: Senhas são armazenadas usando bcrypt (10 rounds)
- **Bloqueio de Conta**: Após 5 tentativas falhadas, conta é bloqueada por 15 minutos
- **Rate Limiting**: Limite de 5 tentativas de login por IP a cada 15 minutos

### Proteção de Rotas
- Todas as rotas da API (exceto `/api/auth/login`) requerem autenticação
- Middleware `authenticateToken` verifica token JWT e sessão no banco
- Frontend redireciona para `/login` se não autenticado

## Medidas de Segurança Implementadas

### 1. Helmet.js
- Headers de segurança HTTP configurados
- Content Security Policy (CSP) implementada
- Prevenção de clickjacking e XSS

### 2. Rate Limiting
- **Login**: 5 tentativas por 15 minutos por IP
- **API Geral**: 100 requisições por minuto por IP

### 3. Validação de Inputs
- Express-validator para validação de dados
- Sanitização de inputs para prevenir XSS
- Validação de email e senha no login

### 4. Proteção de Senhas
- Senhas nunca são retornadas nas respostas da API
- Hash bcrypt com salt automático
- Validação de força de senha (mínimo 8 caracteres, maiúscula, minúscula, número)

### 5. Sessões Seguras
- Tokens JWT com expiração configurável (padrão: 7 dias)
- Sessões armazenadas no banco de dados
- Limpeza automática de sessões expiradas
- Rastreamento de IP e User-Agent

### 6. SQL Injection
- Prisma ORM previne SQL injection automaticamente
- Queries parametrizadas

### 7. CORS
- Configurado para aceitar apenas origem do frontend
- Credenciais habilitadas para cookies/tokens

## Variáveis de Ambiente Necessárias

```env
JWT_SECRET=seu-secret-key-aqui-muito-seguro
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

## Próximos Passos Recomendados

1. **HTTPS**: Usar HTTPS em produção
2. **CSRF Tokens**: Implementar proteção CSRF para formulários
3. **Auditoria**: Logs detalhados de ações sensíveis
4. **2FA**: Autenticação de dois fatores para administradores
5. **Password Policy**: Política mais rigorosa de senhas
6. **Session Management**: Interface para gerenciar sessões ativas

## Checklist de Segurança

- [x] Autenticação JWT
- [x] Hash de senhas (bcrypt)
- [x] Rate limiting
- [x] Validação de inputs
- [x] Headers de segurança (Helmet)
- [x] CORS configurado
- [x] Proteção de rotas
- [x] Bloqueio de conta após tentativas falhadas
- [ ] CSRF protection
- [ ] 2FA
- [ ] Auditoria completa
- [ ] Logs de segurança

