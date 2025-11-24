# Como Reiniciar/Reconstruir o Frontend

## 🐳 Se estiver usando Docker (Produção)

### Opção 1: Reiniciar apenas (se não houver mudanças no código)
```bash
docker-compose restart frontend
```

### Opção 2: Reconstruir completamente (RECOMENDADO após mudanças no código)
```bash
# Parar o frontend
docker-compose stop frontend

# Reconstruir sem cache
docker-compose build --no-cache frontend

# Iniciar novamente
docker-compose up -d frontend
```

### Opção 3: Reconstruir tudo (backend + frontend)
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Ver logs do frontend
```bash
docker-compose logs -f frontend
```

---

## 💻 Se estiver rodando localmente (Desenvolvimento)

### Se estiver usando `pnpm web` ou `vite`:
1. Pare o processo (Ctrl+C no terminal onde está rodando)
2. Inicie novamente:
```bash
pnpm web
```

### Verificar se está rodando:
```bash
# Verificar porta 3000
lsof -i :3000
```

---

## 🔍 Verificar se o gráfico está funcionando

### 1. Testar a rota do backend:
```bash
curl http://localhost:4000/api/ecm/os/tempo-medio-processamento
```

### 2. Verificar no console do navegador:
- Abra o DevTools (F12)
- Vá na aba "Console"
- Procure por erros relacionados a `tempo-medio-processamento` ou `tempoMedioData`

### 3. Verificar no Network:
- Abra o DevTools (F12)
- Vá na aba "Network"
- Recarregue a página
- Procure por uma requisição para `/api/ecm/os/tempo-medio-processamento`
- Verifique se retornou status 200 e dados JSON

---

## ⚠️ Problemas Comuns

### Gráfico não aparece:
1. **Verifique se a rota do backend está funcionando:**
   ```bash
   curl http://localhost:4000/api/ecm/os/tempo-medio-processamento
   ```

2. **Verifique se há dados retornados:**
   - A rota deve retornar um JSON com `{ dados: [...], periodo: {...} }`
   - Se `dados` estiver vazio ou não existir, o gráfico não aparecerá

3. **Verifique os logs do backend:**
   ```bash
   docker-compose logs -f backend
   ```
   - Procure por erros relacionados a `tempo-medio-processamento`

4. **Limpe o cache do navegador:**
   - Pressione Ctrl+Shift+R (ou Cmd+Shift+R no Mac) para recarregar sem cache

5. **Verifique se o frontend foi reconstruído:**
   - Se você fez mudanças no código React, precisa reconstruir o frontend
   - Use `docker-compose build --no-cache frontend`

---

## 📋 Checklist Rápido

- [ ] Backend reiniciado: `docker-compose restart backend`
- [ ] Frontend reconstruído: `docker-compose build --no-cache frontend && docker-compose up -d frontend`
- [ ] Rota do backend funcionando: `curl http://localhost:4000/api/ecm/os/tempo-medio-processamento`
- [ ] Cache do navegador limpo: Ctrl+Shift+R
- [ ] Console do navegador sem erros

