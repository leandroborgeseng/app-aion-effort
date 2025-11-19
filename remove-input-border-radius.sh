#!/bin/bash

# Script para remover borderRadius de todos os campos de texto (input, textarea, select)

find src/web -name "*.tsx" -type f | while read file; do
  # Remover borderRadius de inputs, textareas e selects
  # Padrão: borderRadius: theme.borderRadius.sm, ou .xs, ou .md seguido de vírgula ou fechamento de objeto
  
  # Substituir em linhas que contêm input, textarea ou select E borderRadius
  sed -i '' \
    -e '/\(input\|textarea\|select\)/{
      /borderRadius: theme\.borderRadius\.\(xs\|sm\|md\|lg\|xl\)/{
        s/borderRadius: theme\.borderRadius\.\(xs\|sm\|md\|lg\|xl\),\?//g
        s/,\s*,\s*/,/g
        s/,\s*$//
      }
    }' "$file"
done

echo "✅ Removidas bordas arredondadas de campos de texto"

