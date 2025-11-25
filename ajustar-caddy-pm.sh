#!/bin/bash

echo "🔧 AJUSTANDO CADDY PARA ACESSAR AGILEPM-WEB"
echo "============================================"
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Verificando redes Docker..."
echo ""
docker network ls
echo ""

echo "2. Verificando em qual rede está o agilepm-web..."
AGILEPM_NETWORK=$(docker inspect agilepm-web --format='{{range $net,$v := .NetworkSettings.Networks}}{{$net}}{{end}}' 2>/dev/null | head -1)
echo "   Rede do agilepm-web: $AGILEPM_NETWORK"
echo ""

echo "3. Verificando nome do container e porta..."
AGILEPM_NAME=$(docker ps --filter "name=agilepm" --filter "status=running" --format "{{.Names}}" | grep -i web | head -1)
echo "   Nome do container: $AGILEPM_NAME"
echo ""

if [ -z "$AGILEPM_NAME" ]; then
    echo "   ❌ Container agilepm-web não encontrado rodando!"
    exit 1
fi

echo "4. Parando o Caddy para fazer alterações..."
docker-compose stop caddy
echo ""

echo "5. Conectando Caddy à rede do agilepm..."
if [ -n "$AGILEPM_NETWORK" ] && [ "$AGILEPM_NETWORK" != "null" ]; then
    echo "   Conectando aion-effort-caddy à rede: $AGILEPM_NETWORK"
    docker network connect "$AGILEPM_NETWORK" aion-effort-caddy 2>/dev/null || echo "   (Rede já conectada ou erro ao conectar)"
else
    echo "   Tentando conectar à rede padrão do Docker..."
    docker network connect bridge aion-effort-caddy 2>/dev/null || echo "   (Rede já conectada ou erro ao conectar)"
fi
echo ""

echo "6. Verificando se pode acessar o container..."
docker exec aion-effort-caddy ping -c 1 $AGILEPM_NAME > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Caddy pode acessar $AGILEPM_NAME via Docker network"
else
    echo "   ⚠️  Não conseguiu fazer ping, mas isso pode ser normal se o container não responde ping"
fi
echo ""

echo "7. Atualizando Caddyfile para usar o nome correto do container..."
# O Caddyfile já deve estar atualizado com agilepm-web:80
echo "   Verificando Caddyfile..."
if grep -q "agilepm-web:80" Caddyfile; then
    echo "   ✅ Caddyfile já configurado para agilepm-web:80"
else
    echo "   ⚠️  Caddyfile precisa ser atualizado"
    echo "   Atualizando Caddyfile..."
    sed -i 's/host.docker.internal:8080/agilepm-web:80/g' Caddyfile
    echo "   ✅ Caddyfile atualizado"
fi
echo ""

echo "8. Iniciando Caddy..."
docker-compose up -d caddy
echo ""

echo "9. Aguardando Caddy inicializar..."
sleep 5
echo ""

echo "10. Verificando status do Caddy..."
docker-compose ps caddy
echo ""

echo "11. Verificando logs do Caddy..."
docker-compose logs --tail=20 caddy | grep -i "pm.aion\|error\|warn" || echo "   Nenhum log relevante encontrado"
echo ""

echo "12. Testando conexão..."
echo "   Testando se o Caddy pode acessar o agilepm-web..."
docker exec aion-effort-caddy wget -O- -T 5 http://$AGILEPM_NAME:80 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Caddy consegue acessar agilepm-web:80"
else
    echo "   ⚠️  Caddy não conseguiu acessar diretamente, tentando via host..."
    docker exec aion-effort-caddy wget -O- -T 5 http://host.docker.internal:8080 > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "   ✅ Caddy consegue acessar via host.docker.internal:8080"
        echo "   Atualizando Caddyfile para usar host.docker.internal:8080..."
        sed -i 's/agilepm-web:80/host.docker.internal:8080/g' Caddyfile
        docker-compose restart caddy
        sleep 3
    else
        echo "   ❌ Caddy não consegue acessar de nenhuma forma"
        echo "   Você precisará verificar manualmente as redes Docker"
    fi
fi
echo ""

echo "✅ CONFIGURAÇÃO CONCLUÍDA!"
echo ""
echo "💡 Próximos passos:"
echo "   1. Verifique os logs: docker-compose logs -f caddy"
echo "   2. Teste: curl -I https://pm.aion.eng.br"
echo "   3. Se não funcionar, verifique as redes: docker network inspect <nome-da-rede>"
echo ""

