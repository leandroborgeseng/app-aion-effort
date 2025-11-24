# Como Reiniciar o Backend

## 🐳 Se estiver usando Docker (Produção)

### Reiniciar apenas o backend:
```bash
docker-compose restart backend
```

### Ou parar e iniciar novamente:
```bash
docker-compose stop backend
docker-compose start backend
```

### Reiniciar com rebuild (quando há mudanças no código):
```bash
docker-compose stop backend
docker-compose build --no-cache backend
docker-compose up -d backend
```

### Ver logs do backend:
```bash
docker-compose logs -f backend
```

### Ver status dos containers:
```bash
docker-compose ps
```

---

## 💻 Se estiver rodando localmente (Desenvolvimento)

### Se estiver usando `pnpm dev`:
1. Pare o processo (Ctrl+C no terminal onde está rodando)
2. Inicie novamente:
```bash
pnpm dev
```

### Se estiver usando `pnpm start`:
1. Pare o processo (Ctrl+C)
2. Inicie novamente:
```bash
pnpm start
```

### Se estiver usando `pnpm real`:
1. Pare o processo (Ctrl+C)
2. Inicie novamente:
```bash
pnpm real
```

### Verificar se está rodando:
```bash
# Ver processos Node.js rodando
ps aux | grep "node.*server.ts"

# Ou verificar porta 4000
lsof -i :4000
```

### Matar processo se necessário:
```bash
# Encontrar PID do processo
lsof -i :4000

# Matar processo (substitua PID pelo número encontrado)
kill -9 PID
```

---

## 🔍 Verificar se o backend está funcionando

### Testar endpoint de health:
```bash
curl http://localhost:4000/health
```

### Ver logs em tempo real (Docker):
```bash
docker-compose logs -f backend
```

### Ver logs em tempo real (local):
Os logs aparecem diretamente no terminal onde você rodou o comando.

---

## 📋 Comandos Rápidos

### Docker - Reinício rápido:
```bash
docker-compose restart backend
```

### Docker - Rebuild completo:
```bash
docker-compose down backend
docker-compose build --no-cache backend
docker-compose up -d backend
```

### Local - Reinício rápido:
```bash
# Pare (Ctrl+C) e depois:
pnpm dev
```

