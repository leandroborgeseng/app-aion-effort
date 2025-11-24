# Troubleshooting - Página em Branco com Caddy

## Problema: Página HTML carrega mas fica em branco

### Diagnóstico

1. **Abra o console do navegador (F12)**
   - Vá em "Console"
   - Veja se há erros relacionados a arquivos JS não encontrados
   - Exemplo: `Failed to load resource: net::ERR_XXX`

2. **Verifique a aba Network (Rede)**
   - Veja se os arquivos `/assets/index-*.js` estão sendo carregados
   - Veja o código HTTP retornado (200 = OK, 404 = Não encontrado)

3. **Execute no servidor:**

```bash
cd /opt/apps/app-aion-effort

# Verificar se os assets existem no container
docker-compose exec frontend ls -la /usr/share/nginx/html/assets/

# Verificar se o HTML referencia os assets corretamente
docker-compose exec frontend cat /usr/share/nginx/html/index.html | grep "assets"

# Testar acesso direto aos assets via Caddy
curl -I https://av.aion.eng.br/assets/index-D_HPpwo0.js
```

### Soluções Comuns

#### 1. Frontend não foi buildado ou precisa ser rebuildado

```bash
# Rebuildar o frontend
docker-compose build frontend
docker-compose up -d frontend

# Aguardar alguns segundos e verificar
docker-compose logs frontend
```

#### 2. Assets não estão no caminho correto

```bash
# Verificar estrutura de arquivos
docker-compose exec frontend find /usr/share/nginx/html -type f | head -20
```

#### 3. Problema de permissões no nginx

```bash
# Verificar logs do nginx no frontend
docker-compose logs frontend | grep -i "error\|permission\|denied"
```

#### 4. Problema de cache do navegador

- Tente acessar em modo anônimo/privado
- Ou limpe o cache do navegador (Ctrl+Shift+Delete)

#### 5. Verificar se o Caddy está passando todas as requisições corretamente

```bash
# Ver logs do Caddy em tempo real
docker-compose logs -f caddy

# Tentar acessar um asset diretamente via curl
curl -v https://av.aion.eng.br/assets/index-D_HPpwo0.js
```

### Verificação Rápida

Execute o script de diagnóstico:

```bash
./verificar-frontend.sh
```

Isso vai verificar:
- ✅ Status do container frontend
- ✅ Se o HTML está sendo servido
- ✅ Se os assets JS existem
- ✅ Se os assets são acessíveis
- ✅ Se o Caddy consegue acessar o frontend

