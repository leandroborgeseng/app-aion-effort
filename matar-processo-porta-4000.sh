#!/bin/bash

echo "🔍 Procurando processo na porta 4000..."

# Encontrar PID do processo na porta 4000
PID=$(lsof -ti :4000)

if [ -z "$PID" ]; then
    echo "✅ Nenhum processo encontrado na porta 4000"
    exit 0
fi

echo "📋 Processo encontrado: PID $PID"
echo ""
ps -p $PID -o pid,ppid,command

echo ""
read -p "Deseja matar este processo? (s/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "🛑 Matando processo $PID..."
    kill -9 $PID
    echo "✅ Processo $PID finalizado!"
    
    # Verificar se ainda está rodando
    sleep 1
    if lsof -ti :4000 > /dev/null 2>&1; then
        echo "⚠️  Processo ainda está rodando, tentando novamente..."
        kill -9 $PID 2>/dev/null || true
    else
        echo "✅ Porta 4000 liberada!"
    fi
else
    echo "❌ Operação cancelada"
fi

