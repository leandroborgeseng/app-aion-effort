# 📦 Workflows GitHub Actions

Este diretório contém os workflows de CI/CD do projeto.

## 🚀 Workflows Disponíveis

### 1. CI - Validação e Build (`ci.yml`)

**Quando executa**: A cada push e pull request

**O que faz**:
- ✅ Valida sintaxe TypeScript
- ✅ Valida schema Prisma
- ✅ Build do backend Docker
- ✅ Build do frontend Docker
- ✅ Verifica formatação (quando configurado)

**Tempo estimado**: 5-8 minutos

### 2. CD - Deploy Produção (`cd-producao.yml`)

**Quando executa**: Push para branch `main`

**O que faz**:
- 🔄 Atualiza código no servidor
- 💾 Faz backup do banco de dados
- 🔍 Detecta mudanças (schema, frontend, backend)
- 🔨 Rebuild apenas quando necessário
- 🚀 Reinicia serviços
- ✅ Verifica saúde dos containers

**Tempo estimado**: 3-5 minutos

### 3. Validação de PR (`pr-validation.yml`)

**Quando executa**: Pull requests para `main` ou `develop`

**O que faz**:
- ✅ Valida código TypeScript
- ✅ Build frontend
- 📊 Estatísticas de mudanças
- ⚠️ Verifica arquivos sensíveis

**Tempo estimado**: 3-5 minutos

### 4. Deploy Manual (`manual-deploy.yml`)

**Quando executa**: Manualmente via GitHub Actions UI

**O que faz**:
- 🚀 Deploy sob demanda
- 🔨 Opção de rebuild forçado
- 📊 Status detalhado

**Tempo estimado**: 3-5 minutos (sem rebuild) ou 10-15 minutos (com rebuild)

## 🔄 Fluxo Visual

```
┌─────────────────────────────────────────────────────────────┐
│                     DESENVOLVIMENTO                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ├─── Push para branch feature
                        │    └─── [CI] Validação ✅
                        │
                        ├─── Abrir Pull Request
                        │    └─── [CI] Validação ✅
                        │    └─── [PR] Validação extra ✅
                        │         └─── Verifica arquivos sensíveis ⚠️
                        │
                        ├─── Merge para main
                        │    └─── [CI] Validação ✅
                        │    └─── [CD] Deploy Automático 🚀
                        │         ├─── Backup banco 💾
                        │         ├─── Atualiza código 📥
                        │         ├─── Detecta mudanças 🔍
                        │         ├─── Rebuild (se necessário) 🔨
                        │         ├─── Restart serviços 🔄
                        │         └─── Verifica saúde ✅
                        │
                        └─── Deploy Manual (via UI)
                             └─── [Manual] Deploy sob demanda 🚀
```

## 🔧 Configuração

Veja `CI_CD_SETUP.md` na raiz do projeto para instruções completas de configuração.

## 📊 Status Badge

Adicione este badge ao README para mostrar o status do CI:

```markdown
![CI](https://github.com/seu-usuario/seu-repo/actions/workflows/ci.yml/badge.svg)
```

## 🐛 Troubleshooting

Veja a seção de troubleshooting em `CI_CD_SETUP.md`.

## 📝 Notas

- Todos os workflows usam Node.js 20
- Docker é usado para builds
- SSH é usado para deploy no servidor
- Secrets são gerenciados via GitHub Secrets

