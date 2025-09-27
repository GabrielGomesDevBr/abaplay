# 📊 **SISTEMA DE RELATÓRIOS DE AGENDAMENTO - MVP**

## 📋 **VISÃO GERAL**

Sistema de relatórios flexível para agendamentos que maximiza a reutilização do código existente, fornecendo relatórios executivos e individuais para controle de performance e base para pagamentos.

**Status**: 🚀 Pronto para Implementação
**Estimativa**: 14 horas de desenvolvimento
**Reutilização**: 95% do código existente

---

## 🎯 **OBJETIVOS**

### **Problemas Resolvidos:**
- ✅ Relatórios executivos automáticos para gestão
- ✅ Base objetiva para pagamentos de terapeutas
- ✅ Controle de performance individual e coletiva
- ✅ Análise de previsto vs realizado sem complexidade financeira
- ✅ Flexibilidade de períodos (semanal, mensal, customizado)

### **Benefícios:**
- 🏥 **Para Clínica**: Controle operacional e base para decisões
- 👨‍⚕️ **Para Terapeutas**: Transparência e feedback objetivo
- 💼 **Para Gestão**: Relatórios automáticos e economia de tempo

---

## 🏗️ **ARQUITETURA TÉCNICA**

### **📱 Frontend (4 arquivos)**
```
📁 Modificações/Novos Arquivos:
├── 🔧 SchedulingPage.js (modificar existente)
├── 🆕 ReportConfigModal.js (novo)
├── 🆕 AppointmentReportGenerator.js (novo)
└── ✅ schedulingApi.js (reutilizar existente)

📁 Reutilização:
├── ✅ pdfGenerator.js (estrutura PDF)
├── ✅ DateRangePicker (componente existente)
├── ✅ autoTable (formatação tabelas)
└── ✅ Estilos e formatação padrão
```

### **🔧 Backend**
```
✅ ZERO ARQUIVOS NOVOS
├── ✅ /api/admin/scheduling/appointments (reutilizar)
├── ✅ /api/admin/scheduling/statistics (reutilizar)
├── ✅ View v_scheduled_sessions_complete (reutilizar)
└── ✅ Filtros existentes (período, terapeuta)
```

---

## 📊 **ESPECIFICAÇÃO FUNCIONAL**

### **🎪 Interface Principal**
**Localização**: Página `/scheduling` existente
**Adição**: Um botão "📊 Gerar Relatório" no header

### **⚙️ Modal de Configuração**
```
📊 GERAR RELATÓRIO DE AGENDAMENTOS
┌─────────────────────────────────────────────┐
│ 📅 PERÍODO:                                 │
│ ○ Última Semana    ○ Últimas 2 Semanas     │
│ ○ Último Mês       ○ Último Trimestre      │
│ ● Período Customizado: [DD/MM] a [DD/MM]   │
│                                             │
│ 👥 ESCOPO:                                  │
│ ● Todos os Terapeutas                       │
│ ○ Ana Silva        ○ João Santos            │
│ ○ Maria Oliveira                            │
│                                             │
│ [Cancelar] [📊 Gerar Relatório]             │
└─────────────────────────────────────────────┘
```

### **📋 Conteúdo dos Relatórios**

#### **A) Relatório Geral (Todos os Terapeutas)**
```
🏥 RELATÓRIO DE AGENDAMENTOS - CLÍNICA [Nome]
📅 Período: [Data Início] a [Data Fim]
👥 Escopo: Todos os Terapeutas

═══════════════════════════════════════════

📊 RESUMO EXECUTIVO
├── Total de Agendamentos: 45
├── Sessões Realizadas: 38 (84.4%)
├── Faltas: 5 (11.1%)
├── Cancelamentos: 2 (4.4%)
└── Taxa de Comparecimento: 84.4%

═══════════════════════════════════════════

📈 PREVISTO vs REALIZADO
├── Agendamentos Previstos: 45 sessões
├── Sessões Efetivamente Realizadas: 38 sessões
├── Diferença: -7 sessões (-15.6%)
└── Taxa de Efetivação: 84.4%

═══════════════════════════════════════════

👥 PERFORMANCE POR TERAPEUTA
┌────────────────────────────────────────────┐
│ Terapeuta        │ Agend │ Real │ Faltas │ Taxa% │
├────────────────────────────────────────────┤
│ Ana Silva        │  15   │  14  │   1    │ 93.3% │
│ João Santos      │  18   │  15  │   3    │ 83.3% │
│ Maria Oliveira   │  12   │   9  │   3    │ 75.0% │
├────────────────────────────────────────────┤
│ TOTAL CLÍNICA    │  45   │  38  │   7    │ 84.4% │
└────────────────────────────────────────────┘

═══════════════════════════════════════════

📅 AGENDA DETALHADA
┌──────────────────────────────────────────────────┐
│ Data  │ Hora │ Paciente   │ Terapeuta │ Status   │
├──────────────────────────────────────────────────┤
│ 23/09 │ 09:00│ João Silva │ Ana       │ ✅ Realiz.│
│ 23/09 │ 10:00│ Maria José │ Ana       │ ❌ Falta  │
│ 23/09 │ 14:00│ Pedro Lima │ João      │ ✅ Realiz.│
│ ...   │ ...  │ ...        │ ...       │ ...      │
└──────────────────────────────────────────────────┘
```

#### **B) Relatório Individual (Terapeuta Específico)**
```
👤 RELATÓRIO INDIVIDUAL - ANA SILVA
📅 Período: [Data Início] a [Data Fim]

═══════════════════════════════════════════

📊 PERFORMANCE INDIVIDUAL
├── Total de Agendamentos: 15
├── Sessões Realizadas: 14 (93.3%)
├── Faltas: 1 (6.7%)
├── Cancelamentos: 0 (0%)
└── Taxa de Comparecimento: 93.3%

═══════════════════════════════════════════

📈 DETALHAMENTO ESTATÍSTICO
├── Agendamentos por Semana: 3.75 (média)
├── Sessões Realizadas por Semana: 3.5 (média)
├── Maior Sequência de Sucessos: 8 sessões
├── Última Falta Registrada: 20/09/2025
└── Pontualidade Geral: 93.3%

═══════════════════════════════════════════

📅 AGENDA DETALHADA - ANA SILVA
┌──────────────────────────────────────────────────┐
│ Data  │ Hora │ Paciente   │ Programa    │ Status   │
├──────────────────────────────────────────────────┤
│ 23/09 │ 09:00│ João Silva │ Comunicação │ ✅ Realiz.│
│ 23/09 │ 10:00│ Maria José │ Motricidade │ ❌ Falta  │
│ 24/09 │ 14:00│ Pedro Lima │ Socialização│ ✅ Realiz.│
│ ...   │ ...  │ ...        │ ...         │ ...      │
└──────────────────────────────────────────────────┘

═══════════════════════════════════════════

📊 RESUMO PARA PAGAMENTO
├── Total de Sessões Efetivamente Realizadas: 14
├── Período de Referência: [Data Início] a [Data Fim]
├── Taxa de Efetivação: 93.3%
└── Observações: 1 falta justificada (paciente doente)
```

---

## 🔄 **FLUXO DE FUNCIONAMENTO**

### **🎪 Fluxo do Usuário**
```
1. Admin acessa /scheduling (página existente)
   ↓
2. Clica em "📊 Gerar Relatório"
   ↓
3. Modal abre com opções de configuração:
   - Seleciona período (pré-definido ou custom)
   - Seleciona escopo (todos ou terapeuta específico)
   ↓
4. Clica "Gerar Relatório"
   ↓
5. Sistema processa e gera PDF
   ↓
6. Download automático do relatório
```

### **⚡ Fluxo Técnico**
```
Frontend:
1. ReportConfigModal coleta configurações
   ↓
2. AppointmentReportGenerator.js processa:
   - Chama getAppointments() com filtros
   - Chama getClinicStatistics() se necessário
   - Processa dados conforme escopo
   ↓
3. Utiliza pdfGenerator.js existente:
   - Aplica formatação padrão
   - Gera tabelas com autoTable
   - Adiciona header/footer
   ↓
4. Download automático do PDF

Backend:
✅ NENHUMA ALTERAÇÃO NECESSÁRIA
- APIs existentes atendem 100% das necessidades
- Filtros existentes funcionam perfeitamente
- View completa já disponível
```

---

## 🛠️ **PLANO DE IMPLEMENTAÇÃO**

### **📅 Cronograma Detalhado**

#### **DIA 1-2: Modal e Configuração (4 horas)**
**Arquivos:**
- [ ] `ReportConfigModal.js` (criar novo)
- [ ] `SchedulingPage.js` (modificar - adicionar botão + modal)

**Tarefas:**
- [ ] Criar modal com seleções de período
- [ ] Implementar seletor de terapeuta
- [ ] Integrar com página scheduling existente
- [ ] Validações básicas de entrada

#### **DIA 3-4: Geração de Relatórios (6 horas)**
**Arquivos:**
- [ ] `AppointmentReportGenerator.js` (criar novo)

**Tarefas:**
- [ ] Função de busca e processamento de dados
- [ ] Lógica para relatório geral (todos terapeutas)
- [ ] Lógica para relatório individual
- [ ] Cálculos estatísticos (médias, percentuais)
- [ ] Formatação de dados para PDF

#### **DIA 5: Refinamento (3 horas)**
**Tarefas:**
- [ ] Ajustar formatação PDF (header, footer, estilos)
- [ ] Testes com diferentes cenários
- [ ] Tratamento de casos extremos (sem dados, etc.)
- [ ] Otimizações de performance

#### **DIA 6: Deploy (1 hora)**
**Tarefas:**
- [ ] Teste final integrado
- [ ] Verificação em diferentes browsers
- [ ] Deploy em produção
- [ ] Documentação básica de uso

---

## 📋 **ESPECIFICAÇÕES TÉCNICAS**

### **🔧 APIs Utilizadas (Existentes)**
```javascript
// Buscar agendamentos com filtros
getAppointments({
  start_date: '2025-09-01',
  end_date: '2025-09-30',
  therapist_id: 123, // opcional
  status: ['scheduled', 'completed', 'missed'] // opcional
})

// Estatísticas da clínica
getClinicStatistics('2025-09-01', '2025-09-30')
```

### **📊 Estrutura de Dados**
```javascript
// Configuração do relatório
const reportConfig = {
  period: {
    type: 'custom', // 'week', '2weeks', 'month', 'quarter', 'custom'
    startDate: '2025-09-01',
    endDate: '2025-09-30'
  },
  scope: {
    type: 'all', // 'all' ou 'individual'
    therapistId: null // null para todos, ID para individual
  }
}

// Dados processados
const reportData = {
  summary: {
    totalScheduled: 45,
    completed: 38,
    missed: 5,
    cancelled: 2,
    completionRate: 84.4
  },
  byTherapist: [
    {
      therapistId: 123,
      therapistName: 'Ana Silva',
      scheduled: 15,
      completed: 14,
      missed: 1,
      rate: 93.3
    }
  ],
  appointments: [...] // lista detalhada
}
```

### **🎨 Formatação PDF**
```javascript
// Reutilizar estrutura existente em pdfGenerator.js
const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

// Header padrão (reutilizar)
addHeader(doc, 'RELATÓRIO DE AGENDAMENTOS', clinicName);

// Tabelas (reutilizar autoTable)
autoTable(doc, {
  head: [['Terapeuta', 'Agend', 'Real', 'Faltas', 'Taxa%']],
  body: tableData,
  theme: 'grid',
  headStyles: { fillColor: [66, 139, 202] }
});

// Footer padrão (reutilizar)
addFooter(doc, `Gerado em ${new Date().toLocaleString('pt-BR')}`);
```

---

## ✅ **CRITÉRIOS DE SUCESSO**

### **🎯 Funcionalidades Obrigatórias**
- [ ] Modal de configuração funcionando
- [ ] Seleção de períodos (pré-definidos + custom)
- [ ] Seleção de escopo (todos + individual)
- [ ] Geração de relatório geral em PDF
- [ ] Geração de relatório individual em PDF
- [ ] Download automático do arquivo
- [ ] Formatação profissional consistente

### **📊 Qualidade dos Dados**
- [ ] Cálculos estatísticos corretos
- [ ] Filtros funcionando adequadamente
- [ ] Dados ordenados cronologicamente
- [ ] Status formatados corretamente
- [ ] Nomes e informações legíveis

### **🔧 Aspectos Técnicos**
- [ ] Reutilização máxima de código existente
- [ ] Performance adequada (< 3 segundos para gerar)
- [ ] Compatibilidade com browsers principais
- [ ] Tratamento de erros adequado
- [ ] Interface responsiva

---

## 🚀 **PRÓXIMOS PASSOS**

### **Imediatos (Pós-MVP)**
1. **Testes com usuários reais**
2. **Ajustes baseados em feedback**
3. **Documentação de usuário**

### **Evoluções Futuras (Opcionais)**
1. **Agendamento automático** de relatórios
2. **Envio por email** automático
3. **Exportação em Excel** (CSV)
4. **Gráficos visuais** no PDF
5. **Comparativos** com períodos anteriores

---

## 📝 **NOTAS DE IMPLEMENTAÇÃO**

### **🔄 Reutilização Máxima**
- **95% do código** já existe e será reutilizado
- **Zero modificações** no backend
- **Componentes existentes** serão aproveitados
- **Padrões estabelecidos** serão mantidos

### **⚡ Performance**
- Utilizar APIs existentes (já otimizadas)
- Processamento local dos dados
- Geração PDF assíncrona
- Cache de configurações do usuário

### **🛡️ Segurança**
- Mesmo nível de segurança das páginas existentes
- Filtros automáticos por clínica
- Validação de permissões (apenas admins)
- Dados sensíveis tratados adequadamente

---

**📋 Documento criado em**: 27/09/2025
**🎯 Status**: Pronto para implementação
**⏱️ Estimativa total**: 14 horas
**🚀 ROI esperado**: Alto (máxima reutilização, valor imediato)