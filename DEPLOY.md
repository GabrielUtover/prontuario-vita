# 🚀 Guia Rápido de Deploy - Vercel

## Pré-requisitos

1. Conta na [Vercel](https://vercel.com) (gratuita)
2. Conta no [Supabase](https://supabase.com) (gratuita)
3. Código no GitHub (recomendado) ou pronto para fazer deploy via CLI

## Passo a Passo

### 1. Preparar o Projeto

Certifique-se de que:
- ✅ O arquivo `vercel.json` existe na raiz
- ✅ O arquivo `.env.example` existe (para referência)
- ✅ O `.env` está no `.gitignore` (não será commitado)
- ✅ O código está commitado no Git

### 2. Deploy via Dashboard da Vercel (Mais Fácil)

1. **Acesse [vercel.com](https://vercel.com)** e faça login

2. **Clique em "Add New Project"**

3. **Importe seu repositório do GitHub**
   - Se não estiver conectado, conecte sua conta do GitHub
   - Selecione o repositório do projeto

4. **Configure o projeto:**
   - **Framework Preset**: `Vite` (deve detectar automaticamente)
   - **Root Directory**: `./` (raiz do projeto)
   - **Build Command**: `npm run build` (já configurado)
   - **Output Directory**: `dist` (já configurado)
   - **Install Command**: `npm install` (padrão)

5. **Configure as Variáveis de Ambiente:**
   
   Antes de fazer o deploy, adicione as variáveis:
   
   - Clique em **"Environment Variables"**
   - Adicione:
     ```
     VITE_SUPABASE_URL = sua_url_do_supabase
     VITE_SUPABASE_ANON_KEY = sua_chave_anon_do_supabase
     ```
   - Selecione os ambientes: **Production**, **Preview**, **Development**
   - Clique em **"Save"**

6. **Clique em "Deploy"**

7. **Aguarde o build** (geralmente 1-2 minutos)

8. **Acesse sua aplicação** através da URL fornecida pela Vercel

### 3. Deploy via CLI (Alternativa)

```bash
# 1. Instalar CLI da Vercel
npm i -g vercel

# 2. Fazer login
vercel login

# 3. Deploy (primeira vez)
vercel

# 4. Configurar variáveis de ambiente
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# 5. Deploy em produção
vercel --prod
```

## 🔧 Configuração das Variáveis de Ambiente

### Onde obter as credenciais do Supabase:

1. Acesse [app.supabase.com](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Settings** (⚙️) > **API**
4. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

### Configurar na Vercel:

**Via Dashboard:**
- Settings > Environment Variables
- Adicione cada variável
- Selecione os ambientes (Production, Preview, Development)

**Via CLI:**
```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
```

## ✅ Verificação Pós-Deploy

Após o deploy, verifique:

1. ✅ A aplicação carrega sem erros
2. ✅ O login funciona corretamente
3. ✅ As requisições ao Supabase estão funcionando
4. ✅ Não há erros no console do navegador

## 🔄 Atualizações Futuras

Após o primeiro deploy, qualquer push para a branch principal fará deploy automático:

```bash
git add .
git commit -m "Atualização"
git push origin main
```

A Vercel detectará automaticamente e fará um novo deploy.

## 🐛 Troubleshooting

### Erro: "Environment variables not found"
- Verifique se as variáveis foram adicionadas na Vercel
- Certifique-se de que os nomes estão corretos: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- Verifique se foram adicionadas para o ambiente correto (Production)

### Erro: "Build failed"
- Verifique os logs de build na Vercel
- Certifique-se de que todas as dependências estão no `package.json`
- Verifique se não há erros de TypeScript: `npm run build` localmente

### Erro: "404 Not Found" nas rotas
- O arquivo `vercel.json` já está configurado com rewrites
- Se persistir, verifique se o `vercel.json` está na raiz do projeto

### Aplicação não conecta ao Supabase
- Verifique se as variáveis de ambiente estão configuradas
- Verifique se a URL e a chave estão corretas
- Verifique as configurações de CORS no Supabase (Settings > API > CORS)

## 📚 Recursos

- [Documentação da Vercel](https://vercel.com/docs)
- [Documentação do Supabase](https://supabase.com/docs)
- [Vite + Vercel](https://vercel.com/docs/frameworks/vite)
