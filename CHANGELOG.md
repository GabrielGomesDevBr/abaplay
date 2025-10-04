# CHANGELOG - ABAplay

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-01-04

### Adicionado
- **Sistema Completo de Agendamentos Recorrentes**
  - Criação de templates de agendamentos recorrentes (semanal, quinzenal, mensal)
  - Geração automática de agendamentos até 4 semanas à frente
  - Pausar/retomar templates com motivos documentados
  - Gerenciamento de exceções e feriados
  - Calendário visual com visualização semanal
  - Lista detalhada de agendamentos com filtros avançados
  - Detecção automática de conflitos de horário
  - Tabelas: `recurring_appointment_templates`, `scheduled_sessions`
  - Arquivos: `SchedulingPage.js`, `TherapistSchedulePage.js`, `RecurringAppointmentModal.js`

- **Detecção Automática de Sessões Órfãs**
  - Job cron executando diariamente às 2 AM
  - Identifica sessões agendadas sem registro de progresso
  - Marca automaticamente como "missed" após período de tolerância
  - Envia notificações aos terapeutas para justificativa
  - Variável de ambiente: `ENABLE_AUTO_DETECTION=true`
  - Arquivo: `backend/src/jobs/sessionMaintenanceJob.js`

- **NotificationsPage Mobile-First**
  - Página dedicada fullscreen para notificações
  - Substituição do bottom sheet modal para melhor UX mobile
  - Agrupamento por data (Hoje, Ontem, Esta semana, Mais antigas)
  - Exibição completa de texto sem truncamento
  - Função "Marcar todas como lidas"
  - Color-coding por tipo (verde/vermelho/azul/amarelo)
  - Navegação direta para páginas/modais relevantes
  - Arquivo: `frontend/src/pages/NotificationsPage.js`

- **Notificações de Agendamento**
  - `appointment_created`: Notificações de novos agendamentos
  - `appointment_cancelled`: Alertas de cancelamento com motivos
  - `scheduling_reminder`: Lembretes de sessão (preparação para futuro)
  - Integração completa com NotificationsPage

### Melhorado
- **Navegação Mobile**
  - Botão Admin movido de Sidebar Tools para BottomNavigation
  - Botão Programas removido do Sidebar Tools (já está em BottomNavigation)
  - Sidebar Tools agora contém: Dashboard, Anotações, Sair
  - Melhor organização para usuários admin em dispositivos móveis
  - Arquivos: `frontend/src/components/layout/BottomNavigation.js`, `Sidebar.js`

- **Sistema de Notificações**
  - Hook centralizado `useNotifications.js` para gerenciamento de estado
  - Polling automático a cada 30 segundos
  - Sincronização em tempo real entre dispositivos via WebSocket
  - Badge de contadores em tempo real
  - Navegação melhorada de notificações para chats

### Corrigido
- **validate-assignment Error 500**
  - Implementado fallback silencioso para validação de assignment
  - Erro não mostra mais mensagem confusa para usuários
  - Validação é "nice to have", não bloqueante
  - Arquivo: `frontend/src/components/scheduling/AppointmentForm.js:367-373`

- **active_programs_count em Sessão Geral**
  - Corrigida view `v_scheduled_sessions_complete` para calcular programas corretamente
  - Sessão Geral (discipline_id = NULL) agora mostra TODOS os programas do paciente
  - Antes: mostrava apenas 1 programa (do terapeuta selecionado)
  - Agora: mostra todos os 14 programas ativos do paciente
  - Sessões específicas por disciplina ainda mostram apenas programas daquela disciplina
  - Migration: `backend/migrations/fix_active_programs_count.sql`

- **Navegação de Notificações de Chat**
  - Notificações `parent_chat` agora navegam para `/parent-chat` (não `/notes`)
  - Notificações `case_discussion` agora navegam para `/case-discussion` (não `/notes`)
  - Paciente é automaticamente selecionado no contexto antes da navegação
  - Arquivo: `frontend/src/pages/NotificationsPage.js:60-95`

### Técnico
- **Banco de Dados**
  - Migration `002_create_recurring_appointments.sql`: criação de tabelas de agendamento
  - Migration `fix_active_programs_count.sql`: correção de view de sessões
  - View `v_scheduled_sessions_complete` atualizada com lógica correta de contagem

- **Backend**
  - Novo controller: `schedulingController.js`
  - Novo model: `scheduledSessionModel.js`, `recurringAppointmentModel.js`
  - Novo job: `sessionMaintenanceJob.js`
  - Nova rota: `schedulingRoutes.js`

- **Frontend**
  - Nova página: `NotificationsPage.js`, `SchedulingPage.js`, `TherapistSchedulePage.js`
  - Novos componentes: `RecurringAppointmentModal.js`, `AppointmentForm.js`, `AppointmentsList.js`
  - Novo hook: `useNotifications.js`
  - Nova API: `schedulingApi.js`

## [1.1.0] - 2024-12-16

### Adicionado
- **Sincronização Multi-Dispositivo de Dados Profissionais**
  - Nova API `GET /auth/profile` para buscar perfil completo do usuário
  - Sincronização automática de dados profissionais (registros, qualificações, assinaturas) entre todos os dispositivos/navegadores
  - Sistema de cache inteligente com localStorage e fallback robusto
  - Integração seamless sem quebrar funcionalidades existentes

### Melhorado
- **Segurança de Produção**
  - Auditoria completa da aplicação com sanitização de logs sensíveis
  - Remoção de dados sensíveis (tokens JWT, IDs de pacientes, credenciais) do console do navegador
  - Conversão de 157+ logs detalhados para comentários seguros
  - Proteção contra vazamento de dados via console em produção

- **AuthContext Aprimorado**
  - Processo de login assíncrono com busca de dados do perfil
  - Sincronização automática no startup da aplicação
  - Fallback inteligente para localStorage quando backend indisponível
  - Manutenção de backward compatibility total

- **API e Backend**
  - Novo controller `authController.getUserProfile()` para perfil completo
  - Rota `authRoutes.js` expandida com endpoint de perfil
  - Logs sanitizados em todos os controllers e models
  - Error handling melhorado sem exposição de dados sensíveis

### Corrigido
- **Resiliência da Aplicação**
  - Sistema de retry automático para sincronização de dados
  - Graceful degradation quando há problemas de conectividade
  - Prevenção de quebras durante falhas de API
  - Sincronização assíncrona sem bloqueio da interface

### Técnico
- **Arquitetura**
  - Implementação de padrão de "single source of truth" no backend
  - Cache inteligente com localStorage como layer de performance
  - Mecanismos de fallback para garantir disponibilidade contínua
  - Código preparado para produção com logs seguros

## [1.0.0] - 2024-12-01

### Funcionalidades Principais
- **Sistema Completo de Relatórios de Evolução Terapêutica**
  - Relatórios profissionais multidisciplinares
  - Análise automática baseada em dados reais das sessões
  - Geração de PDFs com formatação profissional
  - Preview editável antes da geração final

- **Sistema de Níveis de Prompting ABA**
  - 6 níveis de prompting com indicadores visuais
  - Pontuação automática de progresso
  - Interface intuitiva para registro de sessões

- **Comunicação em Tempo Real**
  - Chat terapeuta-pai via Socket.IO
  - Discussões de caso entre profissionais
  - Sistema de notificações em tempo real

- **Gerenciamento Avançado de Pacientes**
  - Dashboard completo para terapeutas
  - Visualização de progresso por área de intervenção
  - Gráficos interativos com Chart.js

- **Arquitetura Robusta**
  - Backend Node.js/Express com PostgreSQL
  - Frontend React 18 com Context API
  - Autenticação JWT stateless
  - Sistema de permissões baseado em roles

### Segurança
- Hash de senhas com bcrypt
- Validação de entrada com express-validator
- Headers de segurança com Helmet
- Controle de acesso com middleware

### Performance
- Pool de conexões PostgreSQL
- Context API otimizado para gerenciamento de estado
- Lazy loading de componentes
- Otimização de bundle com React Scripts

---

## Notas de Versão

### Para Desenvolvedores
- **v1.1.0**: Foco em sincronização multi-dispositivo e segurança de produção
- **v1.0.0**: Release inicial com funcionalidades completas

### Para Usuários
- **v1.1.0**: Dados profissionais agora sincronizam automaticamente entre dispositivos
- **v1.0.0**: Plataforma completa para clínicas de intervenção pediátrica