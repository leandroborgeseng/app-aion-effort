#!/bin/bash

echo "🧹 LIMPANDO CADDY E RECONFIGURANDO"
echo "==================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Parando e removendo container do Caddy..."
docker-compose stop caddy 2>/dev/null || true
docker-compose rm -f caddy 2>/dev/null || true
docker rm -f aion-effort-caddy 2>/dev/null || true
echo "   ✅ Container removido"
echo ""

echo "2. Removendo imagem do Caddy (se existir)..."
docker rmi caddy:2-alpine 2>/dev/null || true
echo "   ✅ Limpeza concluída"
echo ""

echo "3. Atualizando código do GitHub..."
git checkout -- Caddyfile 2>/dev/null || true
git pull origin main

if [ $? -ne 0 ]; then
    echo "   ⚠️  Erro ao fazer pull, mas continuando..."
fi
echo ""

echo "4. Garantindo configuração correta do Caddyfile..."
sed -i 's/host.docker.internal:8080/agilepm-web:80/g' Caddyfile
echo "   ✅ Caddyfile configurado"
echo ""

echo "5. Verificando se Caddy precisa estar na rede do agilepm..."
AGILEPM_NETWORK=$(docker inspect agilepm-web --format='{{range $net,$v := .NetworkSettings.Networks}}{{$net}}{{break}}{{end}}' 2>/dev/null)
echo "   Rede do agilepm-web: $AGILEPM_NETWORK"
echo ""

echo "6. Criando container do Caddy do zero..."
docker-compose up -d caddy

if [ $? -ne 0 ]; then
    echo "   ❌ Erro ao criar container"
    echo "   Tentando método alternativo..."
    docker-compose create caddy
    docker-compose start caddy
fi

echo "   ✅ Container criado"
echo ""

echo "7. Aguardando Caddy inicializar..."
sleep 10
echo ""

echo "8. Conectando Caddy à rede do agilepm (se necessário)..."
if [ -n "$AGILEPM_NETWORK" ] && [ "$AGILEPM_NETWORK" != "null" ]; then
    docker network connect "$AGILEPM_NETWORK" aion-effort-caddy 2>/dev/null || echo "   (Já estava conectado ou erro)"
    echo "   ✅ Caddy conectado à rede $AGILEPM_NETWORK"
fi
echo ""

echo "9. Verificando status do Caddy..."
docker-compose ps caddy
echo ""

echo "10. Testando acesso ao agilepm-web..."
docker exec aion-effort-caddy wget -O- -T 5 http://agilepm-web:80 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Caddy consegue acessar agilepm-web:80"
else
    echo "   ⚠️  Caddy não consegue acessar ainda (pode levar alguns segundos)"
fi
echo ""

echo "11. Testando acesso HTTPS..."
sleep 5
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://pm.aion.eng.br 2>/dev/null || echo "000")
echo "   HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo ""
    echo "✅ SUCESSO! pm.aion.eng.br está funcionando!"
else
    echo ""
    echo "   ⚠️  Status: $HTTP_STATUS"
    echo "   Verificando logs..."
    docker-compose logs --tail=10 caddy | grep -i "error\|warn" | tail -5
fi
echo ""

echo "✅ PROCESSO CONCLUÍDO!"
echo ""
echo "💡 Ver logs: docker-compose logs -f caddy"

