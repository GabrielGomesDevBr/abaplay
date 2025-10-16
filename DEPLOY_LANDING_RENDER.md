# Deploy da Landing Page no Render

## Estrutura Atual

O projeto agora tem **duas aplicações**:
1. **Backend/Frontend Principal** (ABAPlay): `/backend` + `/frontend`
2. **Landing Page** (Página de Vendas): `/landing`

## Variáveis de Ambiente

### Backend Principal (já existente)
Continua com suas variáveis normais:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`
- `NODE_ENV`

### Landing Page (NOVAS - adicionar no Render)
Você precisa adicionar essas 3 variáveis de ambiente **no mesmo serviço do backend** no Render:

```env
OPENAI_API_KEY=SUA_OPENAI_API_KEY
RESEND_API_KEY=SUA_RESEND_API_KEY
SALES_TEAM_EMAIL=seu-email-de-vendas@exemplo.com
```

**Por que adicionar no backend?**
- A landing page roda na mesma aplicação Node.js do backend
- O arquivo `landing/api/index.js` é servido pelo mesmo servidor Express
- Todas as variáveis devem estar no mesmo lugar

## URLs e Subdomínios

### Opção Recomendada: Subdomínio Separado

**Backend/Frontend Principal:**
- URL: `https://abaplay.app.br` (aplicação principal e login)

**Landing Page:**
- URL: `https://info.abaplay.app.br` (página de vendas/informações)
- Servida como site estático separado

### Como configurar no Render:

#### 1. **Criar um novo Static Site no Render**
   - Nome: `abaplay-landing`
   - Repositório: mesmo repositório do backend
   - Branch: `main`
   - Root Directory: `landing/public`
   - Build Command: `echo "Static site, no build needed"`
   - Publish Directory: `.` (ponto, significa o próprio diretório)

#### 2. **Configurar Custom Domain**
   - No Static Site, vá em Settings → Custom Domains
   - Adicione: `info.abaplay.app.br`
   - Configure o DNS conforme instruções do Render

#### 3. **Backend da Landing (API)**
   No seu Web Service principal (backend), as rotas `/api/chat` e `/api/notify-abandoned` já vão funcionar quando você acessar `info.abaplay.app.br/api/chat`.

### Alternativa Simples (Sem subdomínio separado)
Se não quiser criar Static Site separado, pode servir tudo do mesmo servidor:

1. No `backend/src/server.js`, adicione:
```javascript
// Servir landing page
app.use('/saiba-mais', express.static(path.join(__dirname, '../../landing/public')));

// Ou servir na raiz:
app.use('/', express.static(path.join(__dirname, '../../landing/public')));
```

2. Acesse via: `https://app.abaplay.app.br/saiba-mais`

## Atualizar Links da Página de Login

✅ **JÁ ATUALIZADO!** Links atualizados em:
- `frontend/src/pages/LoginPage.js` (linhas 586 e 644)
- URL: `https://info.abaplay.app.br`

## Google Analytics e Meta Pixel

### NÃO PRECISA ALTERAR!

Os IDs já estão corretos no código:
- **Google Analytics**: `G-LS59FN1REY` (linha 31 do index.html)
- **Meta Pixel**: `1430368504274711` (linha 49 do index.html)

**Por que não precisa alterar?**
- Google Analytics e Meta Pixel funcionam por **domínio configurado nas plataformas**
- Mesmo mudando a URL, os mesmos IDs continuam funcionando
- Você só precisa **adicionar o novo domínio** nas configurações:
  - **Google Analytics**: Analytics → Admin → Property → Data Streams → Web → Configure → Add Domain
  - **Meta Pixel**: Events Manager → Settings → Add Domains

### Passos nas Plataformas:

#### Google Analytics
1. Acesse: https://analytics.google.com/
2. Vá em: Admin (canto inferior esquerdo) → Property Settings → Data Streams
3. Clique no stream existente (`G-LS59FN1REY`)
4. Em "Configure tag settings" → "Configure your domains"
5. Adicione o novo domínio: `info.abaplay.app.br`

#### Meta Pixel
1. Acesse: https://business.facebook.com/events_manager2/
2. Selecione o Pixel: `1430368504274711`
3. Vá em: Settings → Add Platform → Website
4. Adicione o novo domínio: `info.abaplay.app.br`

## Resumo das Ações

✅ **Fazer:**
1. Adicionar 3 variáveis de ambiente no Render (OPENAI, RESEND, SALES_TEAM_EMAIL)
2. Criar Static Site no Render para landing page OU servir via Express
3. Configurar custom domain no Render
4. Atualizar links em `LoginPage.js` para novo domínio
5. Adicionar novo domínio no Google Analytics (nas configurações)
6. Adicionar novo domínio no Meta Pixel (nas configurações)

❌ **NÃO fazer:**
- ❌ Alterar IDs do Google Analytics ou Meta Pixel no código
- ❌ Criar novos pixels ou properties (usar os existentes)
- ❌ Preocupar com tracking quebrar (funcionará automaticamente após adicionar domínio)

## Testando Localmente

Para testar a landing page localmente antes do deploy:

```bash
cd landing
npm install
npm start  # Roda na porta 3002
```

Depois acesse: `http://localhost:3002`

## Notas Finais

- A landing page é **independente** do backend principal em termos de código
- Mas **compartilha** as variáveis de ambiente quando rodando no Render
- O chat usa OpenAI e envia emails com Resend
- Todos os eventos de tracking já estão instrumentados no código
- Deploy é mais simples do que parece - Render cuida do resto!
