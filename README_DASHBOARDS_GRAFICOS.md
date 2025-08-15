# 📊 Dashboard e Gráficos do ABAplay - Guia Completo

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Dashboard Terapeuta (DashboardPage.js)](#dashboard-terapeuta)
3. [Dashboard Pai/Responsável (ParentDashboardPage.js)](#dashboard-pairesponsável)
4. [Sistema de Níveis de Prompting ABA](#sistema-de-níveis-de-prompting-aba)
5. [Sistema de Alertas e Recomendações Automáticas](#sistema-de-alertas-e-recomendações-automáticas)
6. [Sistema de Notificações e Progressos](#sistema-de-notificações-e-progressos)
7. [Geração de Relatórios PDF](#geração-de-relatórios-pdf)
8. [Métricas e Cálculos ABA](#métricas-e-cálculos-aba)
9. [Interface de Chat em Tempo Real](#interface-de-chat-em-tempo-real)
10. [FAQ e Resolução de Problemas](#faq-e-resolução-de-problemas)

---

## 🎯 Visão Geral

O ABAplay possui dois dashboards especializados que apresentam análises detalhadas do progresso dos pacientes usando metodologias ABA (Applied Behavior Analysis). O sistema gera automaticamente recomendações clínicas baseadas nos dados registrados e oferece visualizações interativas para acompanhamento do desenvolvimento.

### Características Principais:
- **Análise baseada em evidências ABA** com cálculos automáticos de progresso
- **Recomendações clínicas automáticas** baseadas em algoritmos especializados
- **Sistema de alertas inteligentes** para programas prontos para domínio
- **Visualizações interativas** com gráficos Chart.js avançados
- **Relatórios PDF profissionais** com dados consolidados
- **Interface de comunicação em tempo real** entre terapeutas e pais

---

## 👨‍⚕️ Dashboard Terapeuta

### Localização: `/frontend/src/pages/DashboardPage.js`

O dashboard do terapeuta é uma ferramenta analítica avançada que fornece insights profundos sobre o progresso dos pacientes.

### 📈 Funcionalidades Principais

#### 1. **Guia de Métricas ABA**
Uma seção educativa que explica todas as métricas utilizadas no sistema:

- **Progresso Médio**: Média de todas as sessões de intervenção (meta: ≥70%)
- **Taxa de Aquisição**: Percentual de programas que atingiram critério recentemente (meta: ≥30%)
- **Frequência Semanal**: Número de dias únicos com sessões por semana (ideal ABA: 3-5 dias)
- **Estabilidade**: Consistência da performance (alta: ≥80%)
- **Programas na Meta**: Quantidade que atingiu ≥80% de desempenho
- **Dias até Critério**: Tempo médio para dominar habilidades

#### 2. **Sistema de Interpretação Visual**
```javascript
const interpretations = {
  overallAverage: parseFloat(overallAverage) >= 70 ? 'good' : 
                  parseFloat(overallAverage) >= 50 ? 'attention' : 'critical',
  sessionFrequency: parseFloat(sessionFrequency) >= 3 ? 'good' : 
                   parseFloat(sessionFrequency) >= 2 ? 'attention' : 'critical',
  // ... outros critérios
};
```

**Cores dos Indicadores:**
- 🟢 **Verde (Bom)**: Dentro das metas estabelecidas
- 🟡 **Amarelo (Atenção)**: Monitoramento necessário
- 🔴 **Vermelho (Crítico)**: Ação imediata necessária

#### 3. **Recomendações Clínicas Automáticas**
O sistema gera recomendações baseadas nos dados:

```javascript
const recommendations = [];
if (interpretations.overallAverage === 'critical') 
  recommendations.push('Revisar estratégias de intervenção - progresso abaixo do esperado');
if (interpretations.sessionFrequency === 'critical') 
  recommendations.push('Aumentar frequência de atendimentos para acelerar aquisições');
if (parseFloat(acquisitionRate) < 20) 
  recommendations.push('Analisar critérios de domínio - poucos programas atingindo metas');
if (regressionAlerts > 0) 
  recommendations.push(`Atenção: ${regressionAlerts} programa(s) apresentando regressão`);
```

#### 4. **Análise por Disciplina**
Visualização do progresso agrupado por áreas de intervenção:
- Fonoaudiologia
- Psicologia  
- Musicoterapia
- Terapia Ocupacional
- Psicomotricidade
- Psicopedagogia

#### 5. **Gráficos Individuais por Programa**
Cada programa possui um gráfico detalhado mostrando:
- **Evolução temporal** do progresso
- **Níveis de prompting** utilizados (codificados por cores)
- **Sessões de linha de base** (marcadas com estrelas)
- **Meta de 80%** (linha de referência)

---

## 👪 Dashboard Pai/Responsável

### Localização: `/frontend/src/pages/ParentDashboardPage.js`

Interface simplificada e acessível para pais acompanharem o progresso dos filhos.

### 📊 Funcionalidades

#### 1. **Interface de Chat Integrada**
Sistema de comunicação em tempo real com toda a equipe terapêutica:

```javascript
// Funcionalidades do Chat
- Mensagens em tempo real via Socket.IO
- Sistema de menções (@terapeuta)
- Notificações visuais de mensagens não lidas
- Interface responsiva e moderna
```

#### 2. **Gráficos de Progresso Simplificados**
- **Visualizações por área** de intervenção
- **Legenda educativa** explicando níveis de prompting
- **Tooltips informativos** com detalhes das sessões
- **Cores padronizadas** para fácil interpretação

#### 3. **Filtros de Período**
Componente `DateRangeSelector` permite:
- Visualizar progressos por período específico
- Comparar diferentes fases do tratamento
- Acompanhar evolução ao longo do tempo

---

## 🎯 Sistema de Níveis de Prompting ABA

### Localização: `/backend/src/utils/promptLevels.js`

O ABAplay implementa o sistema padrão de prompting da análise comportamental aplicada.

### 📊 Hierarquia dos Níveis

```javascript
const PROMPT_LEVELS = {
    5: {
        name: 'Independente',
        description: 'Realiza a tarefa sem qualquer ajuda',
        color: '#10b981', // Verde
        weight: 100
    },
    4: {
        name: 'Dica Verbal', 
        description: 'Precisa de instrução verbal',
        color: '#8b5cf6', // Roxo
        weight: 75
    },
    3: {
        name: 'Dica Gestual',
        description: 'Precisa de gesto ou apontamento', 
        color: '#3b82f6', // Azul
        weight: 50
    },
    2: {
        name: 'Ajuda Física Parcial',
        description: 'Precisa de ajuda física reduzida',
        color: '#eab308', // Amarelo
        weight: 25
    },
    1: {
        name: 'Ajuda Física Total',
        description: 'Precisa de controle total do movimento',
        color: '#f97316', // Laranja
        weight: 0
    },
    0: {
        name: 'Não realizou',
        description: 'Não tentou ou se recusou',
        color: '#ef4444', // Vermelho
        weight: 0
    }
};
```

### 🔢 Cálculo de Progresso

```javascript
// Fórmula do Score de Progresso
const calculateProgressScore = (levelId, successRate) => {
    const level = getPromptLevel(levelId);
    // Score = taxa de acerto × peso do nível
    return Math.round(successRate * level.weight * 100) / 100;
};
```

**Exemplo Prático:**
- Paciente acerta 8 de 10 tentativas (80% de sucesso)
- Nível de prompting: Independente (peso 100)
- Score final: 80 × 1.00 = 80%

---

## 🚨 Sistema de Alertas e Recomendações Automáticas

### Localização: `/backend/src/utils/progressAlerts.js`

Sistema inteligente que identifica programas prontos para serem marcados como dominados.

### 🔍 Critérios para Alerta

```javascript
async calculateProgramProgress(assignmentId, minSessions = 5) {
    // Busca últimas 10 sessões do programa
    // Verifica se tem pelo menos 5 sessões
    // Calcula média de progresso
    // Retorna dados para análise
}

async getProgramsNeedingAlert(therapistId, threshold = 80) {
    // Busca programas ativos do terapeuta
    // Filtra programas com média ≥80% E ≥5 sessões
    // Retorna lista de candidatos a domínio
}
```

### ⚠️ Quando um Alerta é Gerado

1. **Programa ativo** do terapeuta
2. **Mínimo 5 sessões** registradas
3. **Média de progresso ≥80%** nas sessões
4. **Status "active"** no sistema

### 🎯 Como Funciona o Botão "Verificar Progresso"

```javascript
// No Dashboard (linha 1024-1032)
<button
  onClick={() => window.dispatchEvent(new CustomEvent('checkProgressAlerts'))}
  className="bg-amber-600 text-white px-3 py-2 rounded-lg..."
>
  <FontAwesomeIcon icon={faBullseye} />
  <span>Verificar Progresso</span>
</button>
```

**Fluxo de Funcionamento:**
1. Terapeuta clica em "Verificar Progresso"
2. Sistema busca programas com critérios de alerta
3. Modal `ProgressAlert` exibe programas candidatos
4. Terapeuta pode marcar como "Dominado"
5. Programa é automaticamente arquivado

---

## 🔔 Sistema de Notificações e Progressos

### Localização: `/backend/src/controllers/notificationController.js`

Gerencia todos os tipos de notificações do sistema.

### 📱 Tipos de Notificações

1. **Chat entre Pais e Terapeutas** (`parent_chat`)
2. **Discussões de Casos** (`case_discussion`) 
3. **Alertas de Progresso** (calculados dinamicamente)

### 🔧 Funcionalidades Principais

```javascript
// Buscar alertas de progresso
notificationController.getProgressAlerts = async (req, res) => {
    const therapistId = req.user.id;
    const threshold = parseInt(req.query.threshold) || 80;
    const programs = await ProgressAlerts.getProgramsNeedingAlert(therapistId, threshold);
    res.status(200).json(programs);
};

// Marcar programa como dominado
notificationController.markProgramAsCompleted = async (req, res) => {
    const { assignmentId, patientId } = req.body;
    // Arquiva o programa automaticamente
    await Assignment.updateStatus(assignmentId, 'archived');
    res.status(200).json({ message: 'Programa marcado como dominado com sucesso.' });
};
```

---

## 📄 Geração de Relatórios PDF

### Localização: `/frontend/src/utils/pdfGenerator.js`

Sistema avançado de geração de relatórios em PDF com gráficos incorporados.

### 📊 Tipos de Relatório

#### 1. **Grade de Programas Ativos** (`generateProgramGradePDF`)
- Lista organizada por especialidade
- Objetivos de cada programa
- Critérios de avanço
- Formatação profissional

#### 2. **Folha de Registro Semanal** (`generateWeeklyRecordSheetPDF`)
- Tabela para registro manual de sessões
- Organizada por dias da semana
- Inclui número de tentativas por programa

#### 3. **Relatório Consolidado** (`generateConsolidatedReportPDF`)
- Análise textual do terapeuta
- Gráficos de progresso individuais por programa
- Legendas explicativas dos níveis de prompting
- Símbolos para identificar linha de base vs sessões regulares

### 🎨 Características dos Relatórios

```javascript
// Configuração de gráficos para PDF
const chartOptions = {
    animation: false,           // Desabilitado para PDF
    responsive: false,          // Tamanho fixo
    devicePixelRatio: 2,       // Alta qualidade
    plugins: { 
        legend: { display: false },
        tooltip: { enabled: false }  // Não funciona em PDF
    }
};
```

**Elementos Visuais:**
- **Cores padronizadas** por nível de prompting
- **Símbolos únicos**: Estrelas para linha de base, círculos para sessões regulares
- **Layout responsivo** com quebra de página automática
- **Legendas educativas** explicando a codificação visual

---

## 📊 Métricas e Cálculos ABA

### 🧮 Algoritmos de Análise

#### 1. **Cálculo de Taxa de Aquisição**
```javascript
// Programas que atingiram critério recentemente
let recentMasteries = 0;
Object.values(programStats).forEach(program => {
    const recentSessions = program.sessions.slice(-5); // últimas 5 sessões
    const recentAverage = recentSessions.reduce((sum, s) => sum + s.score, 0) / recentSessions.length;
    
    if (recentAverage >= 80 && recentSessions.length >= 3) {
        recentMasteries++;
    }
});
const acquisitionRate = totalPrograms > 0 ? ((recentMasteries / totalPrograms) * 100).toFixed(1) : '--';
```

#### 2. **Índice de Estabilidade**
```javascript
// Baseado no desvio padrão das últimas sessões
Object.values(programStats).forEach(program => {
    if (program.scores.length >= 5) {
        const recentScores = program.scores.slice(-5);
        const avg = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
        const variance = recentScores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / recentScores.length;
        const stdDev = Math.sqrt(variance);
        const stability = Math.max(0, 100 - stdDev * 2); // Inverte: menos desvio = mais estabilidade
    }
});
```

#### 3. **Detecção de Regressão**
```javascript
// Compara primeira vs última terça parte das sessões
if (program.sessions.length >= 6) {
    const firstThird = program.sessions.slice(0, Math.floor(program.sessions.length / 3));
    const lastThird = program.sessions.slice(-Math.floor(program.sessions.length / 3));
    const firstAvg = firstThird.reduce((sum, s) => sum + s.score, 0) / firstThird.length;
    const lastAvg = lastThird.reduce((sum, s) => sum + s.score, 0) / lastThird.length;
    
    if (firstAvg - lastAvg > 10) regressionAlerts++; // Declínio >10%
}
```

#### 4. **Frequência Semanal Corrigida**
```javascript
// Conta dias únicos, não sessões totais
const uniqueDates = [...new Set(sessionDates.map(date => date.toDateString()))];
const totalDays = Math.max((sessionDates[sessionDates.length - 1] - sessionDates[0]) / (1000 * 60 * 60 * 24), 1);
const totalWeeks = Math.max(totalDays / 7, 1);
const sessionFrequency = totalWeeks > 0 ? (uniqueDates.length / totalWeeks).toFixed(1) : '--';
```

---

## 💬 Interface de Chat em Tempo Real

### Funcionalidades do Sistema de Chat

#### 1. **Chat Pais-Terapeutas**
```javascript
// Componente ParentTherapistChat integrado no ParentDashboardPage
<ParentTherapistChat 
    patientId={selectedPatient.id} 
    patientName={selectedPatient.name} 
/>
```

**Características:**
- Comunicação em tempo real via Socket.IO
- Sistema de menções com @nome
- Interface moderna com gradientes
- Notificações visuais de mensagens não lidas
- Indicadores de status (tempo real, notificações)

#### 2. **Design e UX**
```javascript
// Cabeçalho com design sofisticado (linhas 363-403)
<div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700...">
    {/* Elementos decorativos de fundo */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
    
    {/* Conteúdo informativo */}
    <p className="text-blue-100 font-medium text-lg">
        💬 Converse diretamente com todos os terapeutas do seu filho
    </p>
    
    <div className="bg-white/10 backdrop-blur-sm rounded-xl...">
        <p className="text-white text-sm">
            ✨ Use <span className="bg-white/20...">@nome</span> para mencionar um terapeuta específico
        </p>
    </div>
</div>
```

---

## ❓ FAQ e Resolução de Problemas

### 🔧 Problemas Comuns

#### **P: Por que não aparecem recomendações no dashboard?**
**R:** As recomendações só aparecem quando:
- Há dados suficientes para análise (mín. 5 sessões por programa)
- Existem métricas com interpretação "critical" ou "attention"
- Há alertas de regressão detectados

#### **P: O que significa "Programa apresentando regressão"?**
**R:** O sistema detecta regressão quando:
- Programa tem ≥6 sessões registradas
- Média do primeiro terço das sessões > média do último terço
- Diferença é superior a 10 pontos percentuais

#### **P: Quando um programa aparece no alerta de progresso?**
**R:** Critérios obrigatórios:
1. Status "active" no sistema
2. Mínimo 5 sessões registradas
3. Média das sessões ≥80%
4. Atribuído ao terapeuta logado

#### **P: Por que alguns gráficos aparecem sem dados?**
**R:** Possíveis causas:
- Filtro de período muito restritivo
- Programa sem sessões registradas no período
- Dados ainda não sincronizados no banco

### 🛠️ Soluções Técnicas

#### **Problema de Performance no Dashboard**
```javascript
// Use useMemo para cálculos pesados
const analytics = useMemo(() => calculateAnalytics(), [filteredSessionData, allAssignedPrograms]);

// Limite dados por período para evitar sobrecarga
const filteredSessionData = useMemo(() => {
    return selectedPatient.sessionData.filter(session => {
        const sessionDate = new Date(session.session_date);
        if (start && sessionDate < start) return false;
        if (end && sessionDate > end) return false;
        return true;
    });
}, [selectedPatient, startDate, endDate]);
```

#### **Otimização de Gráficos**
```javascript
// Configurações otimizadas para Chart.js
const chartOptions = {
    interaction: { mode: 'index', intersect: false },
    scales: { 
        y: { display: true, min: 0, max: 105 },
        x: { display: true }
    },
    plugins: { 
        legend: { display: false }, // Reduz overhead
        tooltip: { enabled: true } // Só quando necessário
    }
};
```

---

## 🚀 Implementações Futuras Sugeridas

### 📈 Melhorias de Analytics
1. **Machine Learning**: Predição de tempo para domínio
2. **Análise Comparativa**: Benchmarks entre pacientes similares
3. **Alertas Preditivos**: Identificação precoce de dificuldades

### 🎨 UX/UI
1. **Dashboard Customizável**: Widgets arrastar-e-soltar
2. **Temas Personalizados**: Modo escuro, cores por disciplina  
3. **Exportação Avançada**: Excel, CSV com formatação

### 🔔 Notificações
1. **Push Notifications**: Alertas via navegador
2. **Email Reports**: Relatórios periódicos automáticos
3. **SMS Urgente**: Para alertas críticos

---

## 📞 Suporte e Contato

Para dúvidas específicas sobre funcionalidades ou implementação:

- **Documentação Técnica**: Consulte os comentários no código-fonte
- **Issues**: Reporte problemas via sistema de tickets interno
- **Treinamento**: Solicite sessões de capacitação para a equipe

---

*Este documento foi gerado automaticamente com base na análise do código-fonte do ABAplay. Última atualização: 15/08/2025*

🎯 **ABAplay - Transformando dados em insights clínicos**