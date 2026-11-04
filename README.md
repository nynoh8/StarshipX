# Space Game - Multiplayer

Este é um jogo multiplayer em tempo real construído com **React**, **Three.js** (React Three Fiber), **Socket.io** e **Node.js (Express)**. Ele suporta persistência de dados via **PostgreSQL** e autenticação via **Google OAuth**.

## 🚀 Como fazer o deploy em outro servidor (VPS, AWS, DigitalOcean, etc.)

Para hospedar este jogo no seu próprio servidor, siga os passos abaixo:

### 1. Pré-requisitos
Certifique-se de que o seu servidor possui os seguintes softwares instalados:
- **Node.js** (Recomendado versão 20+ ou 22+)
- **NPM** ou **Yarn**
- **PostgreSQL** (Opcional, mas recomendado para salvar as naves e jogadores)
- **Git** (Para clonar o repositório)

### 2. Clonando o projeto
Acesse o seu servidor via SSH e clone o projeto:
```bash
git clone <url-do-seu-repositorio>
cd <nome-da-pasta-do-projeto>
```

### 3. Instalando as dependências
Instale todos os pacotes necessários:
```bash
npm install
```

### 4. Configurando as Variáveis de Ambiente
Copie o arquivo de exemplo e crie o seu `.env`:
```bash
cp .env.example .env
```
Edite o arquivo `.env` (usando `nano .env` ou `vim .env`) e preencha as informações:

- **APP_URL**: A URL pública do seu servidor (ex: `https://meujogo.com` ou `http://123.45.67.89:3000`). **Importante para o OAuth funcionar.**
- **Google OAuth**: Crie as credenciais no [Google Cloud Console](https://console.cloud.google.com/apis/credentials) e adicione o `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`. Lembre-se de adicionar a URL de callback lá (ex: `https://meujogo.com/auth/callback`).
- **Banco de Dados**: Preencha `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` e `DB_PORT` com as credenciais do seu PostgreSQL. Se deixar em branco, o jogo rodará em modo memória (sem salvar).

### 5. Build do Frontend
Gere os arquivos estáticos de produção do React/Vite:
```bash
npm run build
```
Isso criará uma pasta `dist/` que será servida pelo Express.

### 6. Rodando o Servidor em Produção
Para iniciar o servidor, você precisa definir a variável `NODE_ENV` como `production` e rodar o script de start:
```bash
export NODE_ENV=production
npm run start
```

*(Nota: O script `start` roda `node server.ts`. Certifique-se de estar usando uma versão recente do Node que suporte execução direta de arquivos `.ts` ou utilize `npx tsx server.ts`).*

### 7. Mantendo o Servidor Online (Recomendado: PM2)
Se você fechar o terminal, o servidor vai cair. Para manter o jogo rodando em background e reiniciar automaticamente em caso de falhas, use o **PM2**:

```bash
# Instale o PM2 globalmente
npm install -g pm2

# Inicie o servidor com o PM2
NODE_ENV=production pm2 start "npx tsx server.ts" --name "space-game"

# Salve a lista de processos para reiniciar junto com o servidor
pm2 save
pm2 startup
```

### 8. Configurando um Proxy Reverso (Nginx) - Opcional
Por padrão, o jogo roda na porta `3000`. Para rodar na porta `80` ou `443` (com SSL/HTTPS), é recomendado usar o Nginx como proxy reverso:

Exemplo de configuração do Nginx (`/etc/nginx/sites-available/space-game`):
```nginx
server {
    listen 80;
    server_name meujogo.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
*(Lembre-se de configurar o SSL com o Certbot/Let's Encrypt para que o Google OAuth e os Cookies seguros funcionem corretamente).*
