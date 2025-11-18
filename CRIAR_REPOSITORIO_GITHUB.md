# Como Criar o Repositório no GitHub

## Opção 1: Criar pelo Site do GitHub (Recomendado)

1. **Acesse:** https://github.com/new

2. **Preencha os dados:**
   - **Repository name:** `app-aion-effort`
   - **Description:** (opcional) Sistema de visualização e gestão de equipamentos médicos
   - **Visibility:** Escolha Public ou Private
   - **⚠️ IMPORTANTE:** NÃO marque nenhuma opção:
     - ❌ NÃO marque "Add a README file"
     - ❌ NÃO marque "Add .gitignore"
     - ❌ NÃO marque "Choose a license"
   
   (Já temos esses arquivos no projeto!)

3. **Clique em "Create repository"**

4. **Depois de criar, volte ao terminal e execute:**

```bash
cd /Users/leandroborges/app-aion-effort
git push -u origin main
```

## Opção 2: Criar via GitHub CLI (se tiver instalado)

```bash
# Instalar GitHub CLI (se não tiver)
# brew install gh

# Autenticar
gh auth login

# Criar repositório
gh repo create app-aion-effort --public --source=. --remote=origin --push
```

## Opção 3: Usar um Nome Diferente

Se você quiser usar um nome diferente, atualize o remote:

```bash
# Remover o remote atual
git remote remove origin

# Adicionar novo remote (substitua SEU_USUARIO pelo seu usuário do GitHub)
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPO.git

# Criar o repositório no GitHub com esse nome, depois:
git push -u origin main
```

## Verificar se o Repositório Existe

Antes de fazer push, verifique se o repositório existe acessando:
https://github.com/leandroborgeseng/app-aion-effort

Se aparecer "404 - Not Found", você precisa criar o repositório primeiro.

## Troubleshooting

### Erro: "Repository not found"

**Causa:** O repositório não existe no GitHub ainda.

**Solução:** Crie o repositório no GitHub primeiro (Opção 1 acima).

### Erro: "Permission denied"

**Causa:** Problema de autenticação.

**Solução:** 
```bash
# Verificar autenticação
gh auth status

# Ou usar SSH ao invés de HTTPS
git remote set-url origin git@github.com:leandroborgeseng/app-aion-effort.git
```

### Erro: "Authentication failed"

**Causa:** Precisa autenticar no GitHub.

**Solução:**
- Use GitHub CLI: `gh auth login`
- Ou configure um Personal Access Token
- Ou use SSH keys

