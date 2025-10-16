# ABAPlay Landing Page

Landing page oficial do ABAPlay hospedada em `vendas.abaplay.app.br`

## 📁 Estrutura

```
landing/
├── public/              # Arquivos estáticos (HTML, CSS, JS, assets)
│   ├── index.html      # Página principal
│   ├── politica-de-privacidade.html
│   ├── css/
│   ├── js/
│   └── assets/
├── api/                 # API do chat especialista
│   └── index.js
├── package.json
└── README.md
```

## 🚀 Tecnologias

### Frontend
- **HTML5** - Estrutura semântica
- **Tailwind CSS** (via CDN) - Estilização
- **Alpine.js** - Interatividade leve
- **Font Awesome** - Ícones
- **Google Analytics** - Métricas
- **Meta Pixel (Facebook)** - Tracking de conversão

### Backend (API do Chat)
- **Node.js + Express** - Servidor
- **OpenAI GPT** - Inteligência artificial do chat
- **Resend** - Envio de emails
- **dotenv** - Variáveis de ambiente

## 🛠️ Desenvolvimento

### Instalar dependências da API
```bash
cd landing
npm install
```

### Configurar variáveis de ambiente
Criar arquivo `.env` na pasta `landing/`:

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Resend (Email)
RESEND_API_KEY=re_...

# Configuração
PORT=3002
NODE_ENV=development
```

### Rodar API do chat
```bash
npm start
# Servidor rodando em http://localhost:3002
```

### Testar landing page
Abra `public/index.html` diretamente no navegador ou use um servidor estático:

```bash
# Opção 1: Python
cd public
python3 -m http.server 8080

# Opção 2: npx serve
npx serve public -p 8080
```

Acesse: http://localhost:8080

## 📦 Deploy

### Estrutura de Deploy

```
Servidor:
├── /var/www/abaplay/landing/public/     → vendas.abaplay.app.br
└── API rodando em localhost:3002        → proxy via nginx
```

### Nginx Config

```nginx
# Landing Page (vendas.abaplay.app.br)
server {
    listen 80;
    server_name vendas.abaplay.app.br;
    root /var/www/abaplay/landing/public;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API do chat
    location /api {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### PM2 (API do Chat)

```bash
cd /var/www/abaplay/landing
pm2 start api/index.js --name abaplay-chat-api
pm2 save
```

## 🎨 Estrutura da Página

### Seções
1. **Hero** - Chamada principal com CTA
2. **Vídeo** - Apresentação de 90 segundos
3. **Vantagens** - 3 pilares (Operacional, Clínica, Aliança)
4. **Níveis de Ajuda** - Sistema de prompts com cores
5. **Plataforma** - Detalhes dos recursos
6. **Diferencial** - Comparação (antes vs depois)
7. **CTA Final** - Convite para conversar

### Chat Especialista Virtual
- Modal integrado com Alpine.js
- Powered by GPT (OpenAI)
- Coleta dados: nome, clínica, interesse
- Envia lead por email via Resend
- Tracking de conversões (GA + Meta Pixel)

## 📊 Analytics

### Google Analytics (G-LS59FN1REY)
- Pageviews
- Scroll depth (25%, 50%, 75%, 100%)
- Section views
- Time on page
- Video plays
- CTA clicks
- Chat interactions

### Meta Pixel (Facebook)
- PageView
- Lead (CTA clicks)
- Conversões personalizadas

## 🔄 Atualização Futura (Fase 2)

A landing page será atualizada para refletir:
- ✅ Sistema de 2 planos (Pro vs Scheduling)
- ✅ Preços: R$ 35/paciente (Pro) e R$ 10/paciente (Scheduling)
- ✅ Sistema de trials
- ✅ Novos recursos (agendamento recorrente, relatórios, etc)
- ✅ Screenshots atualizados

## 📝 Notas

- Landing page **HTML estático** para máxima performance e SEO
- API de chat **separada** da API principal do aplicativo
- Uso de **CDNs** para Tailwind e Alpine (sem build necessário)
- Totalmente **responsiva** (mobile-first)

## 🔗 Links

- **Landing:** vendas.abaplay.app.br
- **App Principal:** app.abaplay.app.br
- **API Principal:** app.abaplay.app.br/api
- **Chat API:** vendas.abaplay.app.br/api
