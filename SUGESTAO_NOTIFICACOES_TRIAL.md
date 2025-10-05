# 📧 Sugestão: Sistema de Notificações de Trial

## 📊 Comportamento Atual

### ✅ O que já funciona (AUTOMÁTICO):
1. **Job Cron** executa diariamente às 3 AM
2. **Função `expire_trials()`** desativa trials expirados automaticamente
3. **Acesso Pro é REMOVIDO** automaticamente da clínica
4. **Histórico e analytics** são atualizados

### ⚠️ O que NÃO funciona (ainda):
- **Notificações por Email**: Não implementadas
- **Notificações no App**: Não implementadas
- **SuperAdmin não é notificado**: Precisa acessar a aba manualmente

---

## 🎯 Cenários de Notificação Recomendados

### 1. **Alerta Antecipado (3 dias antes)**
**Para**: Admin da clínica
**Quando**: 3 dias antes do trial expirar
**Conteúdo**:
```
Assunto: Seu trial Pro expira em 3 dias

Olá [Nome Admin],

Seu período de teste do plano Pro expira em 3 dias (dia [Data]).

Para continuar com acesso total:
1. Acesse sua conta
2. Vá em Configurações > Plano
3. Escolha entre:
   - Plano Pro (R$ 35/paciente)
   - Plano Agenda (R$ 10/paciente)

Dúvidas? Entre em contato.
```

### 2. **Alerta de Expiração (no dia)**
**Para**: Admin da clínica + SuperAdmin
**Quando**: Quando o trial expira (às 3 AM)
**Conteúdo para Clínica**:
```
Assunto: Seu trial Pro expirou

Olá [Nome Admin],

Seu período de teste do plano Pro expirou hoje.

Seu acesso foi ajustado para o plano [Plano Atual].

Para fazer upgrade: [Link]
```

**Conteúdo para SuperAdmin**:
```
Assunto: Trial expirado - [Nome Clínica]

Trial da clínica [Nome] expirou.

Status:
- Plano atual: [scheduling/pro]
- Pacientes: [X]
- Último admin: [Nome] ([Email])

Ações disponíveis:
- Renovar trial
- Converter para Pro
- Contatar clínica
```

### 3. **Notificação In-App (Banner)**
**Para**: Admin da clínica
**Quando**: Login após expiração
**Conteúdo**:
```
⚠️ Seu trial Pro expirou
Você agora tem acesso ao plano [Scheduling/Pro].
[Ver Planos] [Fazer Upgrade]
```

---

## 🛠️ Implementação Sugerida

### Opção 1: **SendGrid** (Recomendado)
```javascript
// Em trialExpirationJob.js (linha 58)
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Enviar email ao admin da clínica
const msg = {
  to: clinic.admin_email,
  from: 'noreply@abaplay.com.br',
  subject: 'Seu trial Pro expirou - ABAplay',
  html: `
    <h2>Olá ${clinic.admin_name},</h2>
    <p>Seu período de teste do plano Pro expirou hoje.</p>
    <p>Plano atual: <strong>${clinic.subscription_plan}</strong></p>
    <a href="https://abaplay.com.br/upgrade">Fazer Upgrade</a>
  `
};

await sgMail.send(msg);
```

### Opção 2: **Nodemailer** (Gratuito, SMTP)
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

await transporter.sendMail({
  from: '"ABAplay" <noreply@abaplay.com.br>',
  to: clinic.admin_email,
  subject: 'Trial expirado',
  html: '...'
});
```

### Opção 3: **Notificação In-App** (Já tem sistema!)
```javascript
// Em trialExpirationJob.js
const notificationModel = require('../models/notificationModel');

// Criar notificação no app
await notificationModel.create({
  userId: clinic.admin_id,
  type: 'trial_expired',
  title: 'Seu trial Pro expirou',
  message: `Seu acesso foi ajustado para o plano ${clinic.subscription_plan}. Faça upgrade para continuar com recursos Pro.`,
  priority: 'high'
});
```

---

## 📅 Cronograma de Notificações Sugerido

| Momento | Email Clínica | Email SuperAdmin | In-App |
|---------|---------------|------------------|--------|
| **7 dias antes** | ⚠️ Alerta | - | ⚠️ Banner |
| **3 dias antes** | ⚠️ Alerta urgente | - | ⚠️ Banner |
| **1 dia antes** | ⚠️ Último aviso | - | ⚠️ Banner |
| **No dia (3 AM)** | ✅ Expirou | ✅ Expirou | ✅ Notification |
| **3 dias depois** | 💡 Lembrete upgrade | - | - |

---

## 🔧 Alterações Necessárias

### 1. Adicionar dependência:
```bash
npm install @sendgrid/mail
# ou
npm install nodemailer
```

### 2. Adicionar variáveis no `.env`:
```bash
# SendGrid
SENDGRID_API_KEY=SG.xxxxx

# ou Nodemailer
EMAIL_USER=seu_email@dominio.com.br
EMAIL_PASSWORD=sua_senha_ou_app_password
EMAIL_FROM=noreply@dominio.com.br
```

### 3. Atualizar `trialExpirationJob.js`:
- Implementar envio de email na linha 58
- Adicionar função `sendTrialExpirationEmail()`
- Adicionar função `sendExpiringTrialAlert()`

### 4. Criar agendamento de alertas antecipados:
```javascript
// Novo job: verificar trials que expiram em 3 dias
cron.schedule('0 9 * * *', async () => {
  const expiringTrials = await subscriptionModel.getExpiringTrials(3);
  for (const trial of expiringTrials) {
    await sendExpiringTrialAlert(trial);
  }
});
```

---

## 💡 Resumo da Resposta

### **Sua pergunta**:
> "Passado o período de testes da versão pro, o sistema interrompe o acesso ou o super admin tem que fazer manualmente?"

### **Resposta**:
✅ **INTERROMPE AUTOMATICAMENTE** - O job cron às 3 AM desativa o trial e a clínica perde acesso Pro instantaneamente.

❌ **SuperAdmin NÃO precisa fazer nada** - É 100% automático.

⚠️ **MAS**: Atualmente só registra logs. **Não envia emails nem notificações no app** (fácil de implementar seguindo este guia).

---

## 🎯 Ação Recomendada

1. **Curto Prazo**: Implementar notificação in-app (já tem o sistema pronto)
2. **Médio Prazo**: Adicionar emails com SendGrid
3. **Longo Prazo**: Dashboard de conversão de trials no SuperAdmin

---

_Documento criado em 2025-10-05_
