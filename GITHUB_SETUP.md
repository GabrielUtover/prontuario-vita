# 📤 Guia para Fazer Push no GitHub

## ⚠️ Problema de Autenticação

O push falhou porque é necessário autenticar no GitHub. Siga os passos abaixo:

## 🔐 Opção 1: Usar Personal Access Token (Recomendado)

### 1. Criar um Personal Access Token no GitHub

1. Acesse: https://github.com/settings/tokens
2. Clique em **"Generate new token"** > **"Generate new token (classic)"**
3. Dê um nome: `Prontuário-Vita`
4. Selecione os escopos:
   - ✅ `repo` (acesso completo aos repositórios)
5. Clique em **"Generate token"**
6. **COPIE O TOKEN** (você só verá ele uma vez!)

### 2. Fazer Push usando o Token

Abra o terminal no diretório do projeto e execute:

```bash
# Navegar para o diretório
cd "c:\Users\Gabri\OneDrive\Área de Trabalho\Prontuário"

# Fazer push (quando pedir senha, use o TOKEN ao invés da senha)
git push -u origin main
```

**Quando pedir:**
- **Username**: `silafivita` (ou seu username do GitHub)
- **Password**: Cole o **Personal Access Token** (não sua senha do GitHub)

## 🔐 Opção 2: Usar SSH (Alternativa)

### 1. Gerar chave SSH (se ainda não tiver)

```bash
ssh-keygen -t ed25519 -C "seu-email@exemplo.com"
```

Pressione Enter para aceitar o local padrão.

### 2. Adicionar chave SSH ao GitHub

1. Copie a chave pública:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
   (No Windows: `type C:\Users\Gabri\.ssh\id_ed25519.pub`)

2. Acesse: https://github.com/settings/keys
3. Clique em **"New SSH key"**
4. Cole a chave e salve

### 3. Alterar remote para SSH

```bash
cd "c:\Users\Gabri\OneDrive\Área de Trabalho\Prontuário"
git remote set-url origin git@github.com:silafivita/Prontu-rio-Vita.git
git push -u origin main
```

## 🔐 Opção 3: Usar GitHub CLI (Mais Fácil)

### 1. Instalar GitHub CLI

```bash
winget install --id GitHub.cli
```

### 2. Fazer login

```bash
gh auth login
```

Siga as instruções na tela.

### 3. Fazer push

```bash
cd "c:\Users\Gabri\OneDrive\Área de Trabalho\Prontuário"
git push -u origin main
```

## ✅ Verificar se funcionou

Após fazer o push, acesse:
https://github.com/silafivita/Prontu-rio-Vita

Você deve ver todos os arquivos do projeto lá!

## 🆘 Se ainda não funcionar

1. **Verifique se você tem acesso ao repositório:**
   - O repositório pertence à organização `silafivita`
   - Você precisa ser membro ou ter permissão de escrita

2. **Verifique o remote:**
   ```bash
   git remote -v
   ```
   Deve mostrar:
   ```
   origin  https://github.com/silafivita/Prontu-rio-Vita.git (fetch)
   origin  https://github.com/silafivita/Prontu-rio-Vita.git (push)
   ```

3. **Tente novamente com o token:**
   ```bash
   git push -u origin main
   ```

## 📝 Comandos Úteis

```bash
# Ver status
git status

# Ver commits
git log --oneline

# Ver remote configurado
git remote -v

# Fazer push
git push -u origin main
```
