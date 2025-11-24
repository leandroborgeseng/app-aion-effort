# ✅ Solução Rápida - Adicionar Usuário na Produção

## Comando Único (Copiar e Colar)

No servidor de produção, execute:

```bash
cd /opt/apps/app-aion-effort && \
git pull origin main && \
sqlite3 prisma/dev.db "INSERT INTO User (id, email, name, password, role, active, canImpersonate, loginAttempts, lockedUntil, createdAt, updatedAt) SELECT 'cmialo5je0000s5ofpexp2i2r', 'leandro.borges@aion.eng.br', 'Leandro Borges', '\$2b\$10\$xwEyGdljbR6ix1k6fbtDv.j4qmYmcgMskeizLR7RmgRffr4pDOy1i', 'admin', 1, 1, 0, NULL, datetime('now'), datetime('now') WHERE NOT EXISTS (SELECT 1 FROM User WHERE email = 'leandro.borges@aion.eng.br');" && \
echo "✅ Usuário adicionado!" && \
sqlite3 prisma/dev.db "SELECT email, name, role, active FROM User WHERE email = 'leandro.borges@aion.eng.br';" && \
docker-compose restart backend
```

## Ou use o script

```bash
cd /opt/apps/app-aion-effort
git pull origin main
chmod +x adicionar-usuario-sql.sh
./adicionar-usuario-sql.sh
```

## Verificar se funcionou

```bash
sqlite3 prisma/dev.db "SELECT email, name, role, active FROM User WHERE email = 'leandro.borges@aion.eng.br';"
```

Deve mostrar:
```
leandro.borges@aion.eng.br|Leandro Borges|admin|1
```

## Fazer login

- **Email:** `leandro.borges@aion.eng.br`
- **Senha:** (a mesma que você usa no ambiente local)

## Se precisar instalar sqlite3

```bash
apt-get update
apt-get install -y sqlite3
```

