# Silafi Vita - Prontuário Eletrônico

Sistema de prontuário eletrônico para uma jornada clínica segura e organizada.

## 🚀 Tecnologias

- **React 19** - Biblioteca JavaScript para construção de interfaces
- **TypeScript** - Superset JavaScript com tipagem estática
- **Vite** - Build tool e dev server
- **Supabase** - Backend como serviço (BaaS) para autenticação e banco de dados
- **React Router** - Roteamento para aplicações React
- **TipTap** - Editor de texto rico

## 📋 Pré-requisitos

- Node.js 18+ e npm
- Conta no Supabase
- Git

## 🔧 Instalação Local

1. **Clone o repositório**
   ```bash
   git clone <url-do-repositorio>
   cd Prontuário
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**
   
   Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
   ```env
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
   ```
   
   Você pode usar o arquivo `.env.example` como referência:
   ```bash
   cp .env.example .env
   ```
   
   Para obter essas informações:
   - Acesse o [painel do Supabase](https://app.supabase.com)
   - Vá em **Settings > API**
   - Copie a **Project URL** e a **anon/public key**

4. **Execute o projeto em desenvolvimento**
   ```bash
   npm run dev
   ```

5. **Acesse a aplicação**
   
   Abra [http://localhost:5173](http://localhost:5173) no navegador

## 🏗️ Build para Produção

```bash
npm run build
```

O build será gerado na pasta `dist/`.

## 🚀 Deploy na Vercel

### Opção 1: Deploy via CLI da Vercel (Recomendado)

1. **Instale a CLI da Vercel**
   ```bash
   npm i -g vercel
   ```

2. **Faça login na Vercel**
   ```bash
   vercel login
   ```

3. **Deploy do projeto**
   ```bash
   vercel
   ```
   
   Siga as instruções no terminal. Na primeira vez, você precisará:
   - Conectar seu projeto ao Git (opcional)
   - Configurar as variáveis de ambiente

4. **Configure as variáveis de ambiente**
   
   Após o primeiro deploy, configure as variáveis de ambiente:
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```
   
   Ou configure diretamente no painel da Vercel:
   - Acesse seu projeto na Vercel
   - Vá em **Settings > Environment Variables**
   - Adicione:
     - `VITE_SUPABASE_URL` = sua URL do Supabase
     - `VITE_SUPABASE_ANON_KEY` = sua chave anon do Supabase

5. **Deploy em produção**
   ```bash
   vercel --prod
   ```

### Opção 2: Deploy via GitHub (Integração Contínua)

1. **Faça push do código para o GitHub**
   ```bash
   git add .
   git commit -m "Preparar para deploy"
   git push origin main
   ```

2. **Conecte o repositório na Vercel**
   - Acesse [vercel.com](https://vercel.com)
   - Clique em **Add New Project**
   - Importe seu repositório do GitHub
   - Configure o projeto:
     - **Framework Preset**: Vite
     - **Root Directory**: `./` (raiz)
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`

3. **Configure as variáveis de ambiente**
   - No painel do projeto na Vercel
   - Vá em **Settings > Environment Variables**
   - Adicione:
     - `VITE_SUPABASE_URL` = sua URL do Supabase
     - `VITE_SUPABASE_ANON_KEY` = sua chave anon do Supabase

4. **Deploy automático**
   
   A Vercel fará deploy automaticamente a cada push para a branch principal.

## 📁 Estrutura do Projeto

```
Prontuário/
├── public/              # Arquivos estáticos
├── src/
│   ├── components/      # Componentes React
│   │   ├── LoginPage.tsx
│   │   ├── PacientesPage.tsx
│   │   ├── ReceitasPage.tsx
│   │   └── ...
│   ├── contexts/        # Contextos React (Auth, etc)
│   ├── lib/            # Bibliotecas e configurações
│   │   └── supabase.ts # Cliente Supabase
│   ├── types/          # Definições de tipos TypeScript
│   ├── App.tsx         # Componente principal
│   └── main.tsx        # Ponto de entrada
├── .env.example        # Exemplo de variáveis de ambiente
├── .gitignore          # Arquivos ignorados pelo Git
├── package.json        # Dependências e scripts
├── vercel.json         # Configuração do Vercel
└── vite.config.ts      # Configuração do Vite
```

## 🔐 Variáveis de Ambiente

| Variável | Descrição | Onde obter |
|----------|-----------|------------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase | Settings > API > Project URL |
| `VITE_SUPABASE_ANON_KEY` | Chave pública do Supabase | Settings > API > anon/public key |

## 📝 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria o build de produção
- `npm run preview` - Preview do build de produção
- `npm run lint` - Executa o linter

## 🗄️ Banco de Dados

O projeto utiliza Supabase (PostgreSQL) com as seguintes tabelas principais:

- `usuarios` - Usuários do sistema
- `profissionais` - Dados profissionais de saúde
- `pacientes` - Cadastro de pacientes
- `receitas` - Receitas médicas
- `receita_itens` - Itens das receitas
- `medicacoes` - Lista de medicamentos
- `unidades` - Unidades de medida
- `apresentacoes` - Apresentações de medicamentos
- `vias` - Vias de administração
- `posologias` - Posologias
- `receita_padroes` - Padrões de receitas

## 🔒 Segurança

- Autenticação via Supabase Auth
- Row Level Security (RLS) habilitado nas tabelas
- Variáveis de ambiente não commitadas no Git

## 📄 Licença

Este projeto é privado e de uso interno.

## 🆘 Suporte

Para problemas ou dúvidas, entre em contato com a equipe de desenvolvimento.
