# 📁 Database Migrations - ABAPlay

## 📋 Estrutura

```
migrations/
├── legacy/          # Migrations originais (histórico - NÃO executar)
├── hotfixes/        # Correções pontuais aplicadas (histórico - NÃO executar)
└── README_MIGRATIONS.md
```

## ⚠️ IMPORTANTE

### Para Banco de Dados EXISTENTE
**NÃO EXECUTE NENHUMA MIGRATION!**

O banco de dados em produção já possui todas as tabelas, views, funções e triggers necessários. As migrations foram aplicadas incrementalmente durante o desenvolvimento e estão documentadas aqui apenas para **referência histórica**.

### Para Banco de Dados NOVO
Se você está configurando um ambiente completamente novo do zero:

1. **Crie o banco PostgreSQL** vazio
2. **Execute o schema completo** (quando disponível como dump SQL)
3. **OU** consulte a equipe de desenvolvimento para obter o schema consolidado atual

## 📂 Diretórios

### `/legacy/` - Migrations Originais (19 arquivos)
Migrations aplicadas durante o desenvolvimento incremental do projeto:

- `001_create_scheduled_sessions.sql` - Sistema de agendamento
- `002_create_recurring_appointments.sql` - Agendamentos recorrentes
- `003_expand_patient_registration_fixed.sql` - Expansão de cadastro de pacientes
- `004-005_*_notification.sql` - Notificações de agendamento
- `006_add_subscription_plans.sql` - Sistema de planos
- `008_*.sql` - Campos de cancelamento (3 versões)
- `009-010_*.sql` - Agendamento inteligente e views
- `011_create_therapist_stats_function.sql` - Função de estatísticas
- `012_add_availability_permissions.sql` - Permissões de disponibilidade
- `013_create_orphan_sessions_view.sql` - View de sessões órfãs
- `014_add_therapist_availability_validation.sql` - Validação de disponibilidade
- `015_add_status_to_therapist_absences.sql` - Status de ausências

**Status:** ✅ Todas aplicadas em produção

### `/hotfixes/` - Correções Pontuais (3 arquivos)
Correções aplicadas após o deployment inicial:

- `cleanup_duplicate_appointments.sql` - Limpeza de duplicatas
- `fix_active_programs_count.sql` - Correção de contagem de programas
- `fix_recurring_appointments_duplicates.sql` - Fix de recorrências duplicadas

**Status:** ✅ Todas aplicadas em produção

## 🔍 Histórico de Numeração

Durante o desenvolvimento, a numeração das migrations ficou **inconsistente** devido a múltiplas correções e ajustes:

- Numeração pulou do 007 para 008 (sem 007)
- Múltiplos arquivos com mesmo número (008, 009, 010)
- Hotfixes sem numeração

**Isso é normal em desenvolvimento ágil.** O importante é que:
- ✅ Todas as migrations foram aplicadas na ordem correta
- ✅ O schema atual está funcional e testado
- ✅ Histórico está preservado para referência

## 📊 Schema Atual

O banco de dados em produção possui:

### Tabelas Principais
- `clinics`, `users`, `patients` - Entidades base
- `disciplines`, `program_areas`, `program_sub_areas`, `programs` - Hierarquia de programas
- `therapist_patient_assignments`, `patient_program_assignments` - Relacionamentos
- `scheduled_sessions`, `recurring_appointment_templates` - Agendamento
- `therapist_availability`, `therapist_absences`, `therapist_specialties` - Disponibilidade
- `patient_program_progress` - Registro de sessões
- `case_discussions`, `parent_chats`, `notifications` - Comunicação
- `subscription_plans`, `clinic_subscriptions` - Assinaturas

### Views
- `v_scheduled_sessions_complete` - Visão completa de sessões agendadas
- `v_orphan_sessions` - Sessões órfãs (agendadas sem registro)
- `v_clinic_subscription_details` - Detalhes de assinaturas

### Funções SQL
- `search_available_slots()` - Busca inteligente de horários disponíveis
- `get_therapist_stats()` - Estatísticas de terapeutas
- `activate_trial_pro()` - Ativação de trial PRO
- `check_session_conflict()` - Verificação de conflitos

### Triggers
- Verificação de conflitos de agendamento
- Validação de disponibilidade de terapeutas

## 🛠️ Para Desenvolvedores

### Como consultar o schema atual?
```bash
# Conectar ao banco
psql -h <host> -U <user> -d <database>

# Listar todas as tabelas
\dt

# Descrever estrutura de uma tabela
\d table_name

# Listar todas as views
\dv

# Listar todas as funções
\df

# Ver definição de uma view
\d+ view_name

# Ver código de uma função
\sf function_name
```

### Como fazer backup?
```bash
# Backup completo (schema + data)
pg_dump -h <host> -U <user> -d <database> > abaplay_backup_$(date +%Y%m%d).sql

# Backup apenas do schema
pg_dump -h <host> -U <user> -d <database> --schema-only > abaplay_schema_$(date +%Y%m%d).sql
```

### Como criar uma nova migration?
**NÃO CRIE MIGRATIONS INCREMENTAIS PARA O BANCO ATUAL.**

Para alterações no schema:
1. Aplique diretamente via SQL no banco de produção (com backup!)
2. Documente a alteração no CHANGELOG.md
3. Se necessário, crie um arquivo SQL em `/hotfixes/` para histórico

## 📞 Dúvidas?

Consulte a equipe de desenvolvimento antes de executar qualquer alteração no banco de dados de produção.

---

**Última atualização:** 2025-10-23
**Versão do Schema:** 2.2.0
