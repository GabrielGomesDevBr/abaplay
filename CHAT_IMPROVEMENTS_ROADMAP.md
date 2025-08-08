# 💬 ROADMAP DE MELHORIAS DOS CHATS - ABAplay

## 📋 **ANÁLISE ATUAL DOS PROBLEMAS**

### **🚨 Problemas Identificados**

#### **1. Organização Confusa**
- **ParentTherapistChat**: Pais recebem mensagens de múltiplos terapeutas numa única thread
- **CaseDiscussionChat**: Profissionais discutem casos sem diferenciação por especialidade
- Não há identificação clara da especialidade/role do remetente
- Falta contexto sobre qual terapia está sendo discutida

#### **2. UI/UX Básica**
- Design muito simples (apenas bolhas básicas)
- Não há diferenciação visual entre tipos de usuário
- Interface não intuitiva para contexto profissional
- Falta de personalidade visual

#### **3. Funcionalidades Ausentes**
- Sistema de menções (@usuario)
- Reações com emoji
- Status de entrega/leitura
- Indicador "está digitando"
- Threads/respostas específicas
- Anexos de arquivos
- Busca de mensagens

---

## 🛠️ **ROADMAP DE IMPLEMENTAÇÃO**

### **🎯 FASE 1: Melhorias Rápidas (ALTA PRIORIDADE)**
**Tempo estimado: 2-6 horas de desenvolvimento**
**ROI: Alto impacto + Baixo esforço**

#### **1.1 Badges de Especialidade** ⭐ (30min)
```
ANTES: "Dr. João" 
DEPOIS: "Dr. João [🗣️ Fonoaudiologia]"
```
- Adicionar badge visual na mensagem baseado no user.role/specialty
- Cores específicas: Fono (🟦), Psico (🟢), Music (🟣), etc.
- **Implementação**: Adicionar campo `specialty` no contexto do usuário

#### **1.2 Cores por Role** ⭐ (20min)
```
Terapeuta: Azul (#007bff)
Pai: Verde (#28a745) 
Admin: Vermelho (#dc3545)
```
- Diferenciação visual imediata nas mensagens
- **Implementação**: CSS condicional baseado em user.role

#### **1.3 Reações Básicas com Emoji** ⭐⭐ (2h)
```
👍 👎 ❤️ 😊 🎉
```
- **Para pais**: Reduzir mensagens de "obrigado", "entendi"
- **Para terapeutas**: Feedback rápido em discussões
- Contador de reações por emoji
- **Implementação**: 
  - Nova tabela `message_reactions`
  - Botões de reação na UI
  - WebSocket para tempo real

#### **1.4 Status de Leitura** ⭐ (1h)
```
Enviado: ✓ (cinza)
Entregue: ✓✓ (cinza)  
Lido: ✓✓ (azul)
```
- **Implementação**: Campo `read_at` na tabela de mensagens

#### **1.5 Melhoria Visual da UI** ⭐ (2h)
- Avatar com inicial da especialidade
- Nome completo + especialidade nas mensagens
- Gradientes sutis para diferentes roles
- **Implementação**: CSS aprimorado + componentes melhorados

---

### **🔥 FASE 2: Funcionalidades Principais (MÉDIA PRIORIDADE)**
**Tempo estimado: 4-8 horas de desenvolvimento**

#### **2.1 Sistema de Menções (@)** ⭐⭐ (3h)
- Digite `@` para listar usuários disponíveis
- Destaque visual quando mencionado
- Notificação especial para menções
- **Implementação**: 
  - Parser de texto para detectar @usuario
  - Dropdown de usuários
  - Notificações especiais

#### **2.2 Organização por Disciplina** ⭐⭐⭐ (4h)
**ParentChat com Abas:**
```
[Fonoaudiologia] [Psicologia] [Musicoterapia] [Geral]
```
- **Implementação**: 
  - Filtros por especialidade
  - Component de tabs
  - WebSocket rooms específicas

#### **2.3 Indicador "Está Digitando"** ⭐ (1h)
```
"Dr. João está digitando..."
```
- **Implementação**: WebSocket events de typing

---

### **⭐ FASE 3: Features Avançadas (BAIXA PRIORIDADE)**
**Tempo estimado: 8-16 horas de desenvolvimento**

#### **3.1 Threads/Respostas** (6h)
- Responder mensagem específica
- Mini-thread lateral
- **Implementação**: Nova estrutura de dados + UI complexa

#### **3.2 Anexos de Arquivos** (4h)
- Upload de imagens (raio-x, fotos progresso)
- PDFs (relatórios, avaliações)
- **Implementação**: Sistema de upload + storage

#### **3.3 Busca de Mensagens** (3h)
- Buscar por texto, usuário, data
- **Implementação**: Indexação + API de busca

#### **3.4 Mensagens Fixadas** (1h)
- Fixar instruções importantes
- **Implementação**: Campo `pinned` + UI especial

---

## 💾 **ESTRUTURA DE DADOS NECESSÁRIA**

### **Para Fase 1:**
```sql
-- Adicionar campos à tabela users
ALTER TABLE users ADD COLUMN specialty VARCHAR(50);
ALTER TABLE users ADD COLUMN role_color VARCHAR(7);

-- Nova tabela para reações
CREATE TABLE message_reactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES parent_chats(id),
    user_id INTEGER REFERENCES users(id),
    emoji VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id, emoji)
);

-- Adicionar campo de leitura
ALTER TABLE parent_chats ADD COLUMN read_at TIMESTAMP;
ALTER TABLE case_discussions ADD COLUMN read_at TIMESTAMP;
```

### **Para Fase 2:**
```sql
-- Para menções
CREATE TABLE message_mentions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER,
    mentioned_user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Para typing indicators
CREATE TABLE typing_indicators (
    room_name VARCHAR(100),
    user_id INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(room_name, user_id)
);
```

---

## 🎯 **RECOMENDAÇÃO DE IMPLEMENTAÇÃO**

### **Desenvolvimento Rápido (Estilo Atual):**

**✅ IMPLEMENTAR IMEDIATAMENTE (2-3 horas):**
1. **Badges de Especialidade** - Impacto visual imediato
2. **Cores por Role** - Diferenciação clara
3. **Status de Leitura** - Funcionalidade essencial

**✅ IMPLEMENTAR EM SEGUIDA (3-4 horas):**
4. **Reações Básicas** - Reduce spam de mensagens
5. **UI Aprimorada** - Experiência mais profissional

**🔄 AVALIAR DEPOIS:**
6. **Sistema de Menções** - Se houver necessidade
7. **Organização por Abas** - Para múltiplos terapeutas

---

## 📊 **MÉTRICAS DE SUCESSO**

### **Objetivos Mensuráveis:**
- ✅ **Redução de confusão**: Pais identificam facilmente qual terapeuta está falando
- ✅ **Redução de spam**: 30% menos mensagens de confirmação com reações
- ✅ **Melhoria da experiência**: Interface mais profissional e moderna
- ✅ **Organização clara**: Separação por especialidade quando necessário

### **Feedback dos Usuários:**
- Pais conseguem distinguir terapeutas facilmente?
- Terapeutas acham a interface mais eficiente?
- Redução de mensagens desnecessárias?
- Interface parece mais profissional?

---

## 🚀 **PRÓXIMOS PASSOS**

1. **Decidir quais melhorias implementar primeiro**
2. **Começar pela Fase 1** (alto impacto, baixo esforço)
3. **Testar com usuários reais**
4. **Iterar baseado no feedback**
5. **Expandir para Fase 2 se necessário**

---

*Documento criado em: 2025-01-08*
*Última atualização: 2025-01-08*