# 🧪 CREDENCIAIS DE TESTE - SISTEMA DE MÓDULOS

**Data de Criação**: 06 de Outubro de 2025
**Objetivo**: Validação completa do sistema de módulos por assinatura
**⚠️ IMPORTANTE**: Estas clínicas são APENAS para testes. NÃO DELETAR!

---

## 📅 CLÍNICA 1: PLANO AGENDAMENTO

### Dados da Clínica
- **ID**: 14
- **Nome**: TESTE - Clínica Agendamento
- **Plano**: `scheduling` (Agendamento)
- **Limite de Pacientes**: 10
- **Trial Pro**: Não

### Credenciais de Acesso

#### Administrador
- **Username**: `admin.agendamento`
- **Senha**: `123456`
- **Role**: Terapeuta (is_admin = true)
- **User ID**: 52

#### Terapeuta
- **Username**: `terapeuta.agendamento`
- **Senha**: `123456`
- **Role**: Terapeuta (is_admin = false)
- **User ID**: 54

### Pacientes de Teste
1. **Paciente Teste 1** (ID: 23)
   - DOB: 2018-05-10
   - Diagnóstico: TEA
   - Atribuído ao terapeuta ID 54

2. **Paciente Teste 2** (ID: 24)
   - DOB: 2019-03-15
   - Diagnóstico: TEA
   - Atribuído ao terapeuta ID 54

---

## 🚀 CLÍNICA 2: PLANO PRO

### Dados da Clínica
- **ID**: 15
- **Nome**: TESTE - Clínica Pro
- **Plano**: `pro` (Pro)
- **Limite de Pacientes**: 20
- **Trial Pro**: Não

### Credenciais de Acesso

#### Administrador
- **Username**: `admin.pro`
- **Senha**: `123456`
- **Role**: Terapeuta (is_admin = true)
- **User ID**: 53

#### Terapeuta
- **Username**: `terapeuta.pro`
- **Senha**: `123456`
- **Role**: Terapeuta (is_admin = false)
- **User ID**: 55

### Pacientes de Teste
1. **Paciente Pro 1** (ID: 25)
   - DOB: 2017-08-20
   - Diagnóstico: TEA
   - Atribuído ao terapeuta ID 55

2. **Paciente Pro 2** (ID: 26)
   - DOB: 2020-01-10
   - Diagnóstico: TEA
   - Atribuído ao terapeuta ID 55

---

## ✅ CHECKLIST DE VALIDAÇÃO

### PLANO AGENDAMENTO (Clínica ID 14)

#### ❌ Funcionalidades BLOQUEADAS (devem dar erro 403 ou redirecionar)
- [ ] Acessar rota `/dashboard` (deve redirecionar para home)
- [ ] Acessar rota `/programs` (deve redirecionar para home)
- [ ] Dashboard não aparece no menu Sidebar
- [ ] Tab "Programas Atribuídos" não aparece em Admin
- [ ] Botão "Ver Programas Atribuídos" não aparece em Admin
- [ ] API GET `/api/programs` (deve retornar 403)
- [ ] API GET `/api/assignments` (deve retornar 403)
- [ ] API GET `/api/reports/evolution` (deve retornar 403)

#### ✅ Funcionalidades PERMITIDAS (devem funcionar)
- [ ] Login com `admin.agendamento` / `123456`
- [ ] Ver pacientes na página Admin
- [ ] Criar/editar agendamentos
- [ ] Visualizar agenda do terapeuta
- [ ] Registrar sessão com anotações simples
- [ ] Editar anotações de sessões
- [ ] Ver relatórios de agendamentos
- [ ] Receber notificações de agendamento

### PLANO PRO (Clínica ID 15)

#### ✅ Funcionalidades PERMITIDAS (todas devem funcionar)
- [ ] Login com `admin.pro` / `123456`
- [ ] Acessar Dashboard (rota `/dashboard`)
- [ ] Ver Dashboard no menu Sidebar
- [ ] Acessar Biblioteca de Programas (rota `/programs`)
- [ ] Tab "Programas Atribuídos" aparece em Admin
- [ ] Botão "Ver Programas Atribuídos" aparece em Admin
- [ ] Atribuir programas a pacientes
- [ ] Registrar sessões detalhadas com níveis de prompt
- [ ] Ver relatórios de evolução
- [ ] Gerar relatórios com gráficos
- [ ] Chat com pais (parent chat)
- [ ] Discussões de caso entre terapeutas
- [ ] Editar dados expandidos de pacientes
- [ ] Todas as APIs Pro funcionando

### MIGRAÇÃO DE PLANOS (para testar depois)
- [ ] Upgrade: Agendamento → Pro (preserva dados)
- [ ] Downgrade: Pro → Agendamento (bloqueia features, mantém dados)

---

## 🔍 COMANDOS SQL ÚTEIS

### Verificar plano da clínica
```sql
SELECT id, name, subscription_plan, trial_pro_enabled, trial_pro_expires_at
FROM clinics
WHERE id IN (14, 15);
```

### Mudar plano (para teste de migração)
```sql
-- Upgrade para Pro
UPDATE clinics SET subscription_plan = 'pro' WHERE id = 14;

-- Downgrade para Agendamento
UPDATE clinics SET subscription_plan = 'scheduling' WHERE id = 15;
```

### Ver todos os usuários de teste
```sql
SELECT id, username, clinic_id, role, is_admin
FROM users
WHERE clinic_id IN (14, 15)
ORDER BY clinic_id, is_admin DESC;
```

### Ver pacientes de teste
```sql
SELECT p.id, p.name, p.clinic_id, c.name as clinic_name, c.subscription_plan
FROM patients p
JOIN clinics c ON p.clinic_id = c.id
WHERE p.clinic_id IN (14, 15)
ORDER BY p.clinic_id;
```

### Deletar clínicas de teste (APENAS quando terminar TODOS os testes)
```sql
-- ⚠️ CUIDADO: Só executar quando terminar TODOS os testes!
-- Deletar atribuições
DELETE FROM therapist_patient_assignments WHERE therapist_id IN (54, 55);

-- Deletar pacientes
DELETE FROM patients WHERE clinic_id IN (14, 15);

-- Deletar usuários
DELETE FROM users WHERE clinic_id IN (14, 15);

-- Deletar clínicas
DELETE FROM clinics WHERE id IN (14, 15);
```

---

## 📝 NOTAS DE TESTE

### Badge Visual
- **Plano Agendamento**: Badge azul com "📅 Plano Agendamento"
- **Plano Pro**: Badge verde com "🚀 Plano Pro"

### Formulário de Paciente
- **Plano Agendamento**: Mostra banner azul informativo sobre dados opcionais
- **Plano Pro**: Formulário completo sem restrições

### Diferenças de Interface
- **Sidebar**: Dashboard só aparece no Pro
- **AdminPage**: Tab "Programas Atribuídos" só aparece no Pro
- **Menu Mobile**: Botão "Ver Programas Atribuídos" só aparece no Pro

---

## 🎯 RESUMO DO AMBIENTE DE TESTE

| Item | Clínica Agendamento | Clínica Pro |
|------|---------------------|-------------|
| **Clinic ID** | 14 | 15 |
| **Plano** | scheduling | pro |
| **Admin Username** | admin.agendamento | admin.pro |
| **Terapeuta Username** | terapeuta.agendamento | terapeuta.pro |
| **Senha (todos)** | 123456 | 123456 |
| **Pacientes** | 2 (IDs 23, 24) | 2 (IDs 25, 26) |
| **Limite Pacientes** | 10 | 20 |

---

**✅ Ambiente de teste configurado e pronto para validação!**
