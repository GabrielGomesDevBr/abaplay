# 📄 RELATÓRIO DE CADASTRO COMPLETO DE PACIENTE - GUIA DE IMPLEMENTAÇÃO

**Versão:** 1.0
**Data:** 29/09/2025
**Status:** Planejamento aprovado - Pronto para implementação
**Responsável:** Sistema ABAplay

---

## 📖 RESUMO EXECUTIVO

Este documento detalha a implementação da funcionalidade de **Geração de PDF do Cadastro Completo de Paciente**, uma nova ferramenta que permitirá aos administradores gerar um relatório profissional e bem formatado contendo todos os dados expandidos do paciente em um único documento.

**Objetivo Principal:** Criar um PDF profissional com todos os dados do cadastro expandido do paciente, organizado por seções, para uso em reuniões, encaminhamentos e documentação.

**Público-alvo:** Apenas administradores da clínica

---

## 🎯 JUSTIFICATIVA E CASOS DE USO

### **Por que implementar?**

1. **Reuniões com Pais/Responsáveis**
   - Documento impresso com todas as informações do paciente
   - Facilita discussões sobre tratamento e desenvolvimento
   - Material para levar para casa

2. **Encaminhamentos Médicos**
   - Histórico completo para outros profissionais
   - Medicações atuais organizadas
   - Contatos de emergência sempre disponíveis

3. **Relatórios para Escola**
   - Informações educacionais formatadas
   - Adaptações necessárias documentadas
   - Contatos dos responsáveis

4. **Auditorias e Compliance**
   - Documentação completa e organizada
   - Fácil verificação de dados cadastrais
   - Backup físico de informações críticas

5. **Transição de Cuidados**
   - Quando paciente muda de terapeuta
   - Transferência entre clínicas
   - Continuidade do cuidado garantida

---

## 🏗️ ARQUITETURA TÉCNICA

### **Stack Tecnológica**

#### **Biblioteca de PDF**
- **jsPDF** v2.5.1 (já instalado)
- **jspdf-autotable** v3.8.2 (já instalado)
- ✅ **Zero novas dependências necessárias**

#### **Linguagem e Framework**
- React 18 (frontend)
- JavaScript ES6+
- Funções auxiliares já existentes em `pdfGenerator.js`

### **Componentes Envolvidos**

```
┌─────────────────────────────────────────────────┐
│                  FRONTEND                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  ExpandedPatientForm.js                         │
│  └─> Botão "Gerar PDF Completo"                │
│      └─> handleGenerateRegistrationPDF()       │
│          └─> Chama pdfGenerator.js             │
│                                                 │
│  pdfGenerator.js                                │
│  └─> generatePatientRegistrationPDF()          │
│      └─> Formata e gera o PDF                  │
│      └─> Usa dados de expandedPatientApi       │
│                                                 │
│  expandedPatientApi.js                          │
│  └─> getExpandedData(patientId)                │
│      └─> Retorna todos os dados necessários    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### **Fluxo de Dados**

```
1. Administrador abre formulário expandido do paciente
2. Dados são carregados via expandedPatientApi.getExpandedData()
3. Administrador clica em "Gerar PDF Completo"
4. handleGenerateRegistrationPDF() é chamado
5. Dados do formData são passados para generatePatientRegistrationPDF()
6. PDF é gerado e baixado automaticamente
```

---

## 📊 ESTRUTURA DE DADOS DISPONÍVEL

### **1. Dados Básicos do Paciente**

```javascript
{
    id: number,
    name: string,
    dob: date,
    diagnosis: string,
    general_notes: text,
    clinic_name: string,
    created_at: timestamp,
    updated_at: timestamp
}
```

### **2. Dados dos Responsáveis**

#### **Responsável Principal**
```javascript
{
    guardian_name: string,
    guardian_relationship: string,
    guardian_phone: string,
    guardian_email: string,
    guardian_occupation: string,
    guardian_education: string
}
```

#### **Segundo Responsável**
```javascript
{
    second_guardian_name: string,
    second_guardian_relationship: string,
    second_guardian_phone: string,
    second_guardian_email: string,
    second_guardian_occupation: string
}
```

### **3. Endereço**

```javascript
{
    address_street: string,
    address_number: string,
    address_complement: string,
    address_neighborhood: string,
    address_city: string,
    address_state: string (2 chars),
    address_zip: string (9 chars com hífen)
}
```

### **4. Informações Educacionais**

```javascript
{
    school_name: string,
    school_phone: string,
    school_email: string,
    school_teacher: string,
    school_teacher_phone: string,
    school_grade: string,
    school_period: enum ['manhã', 'tarde', 'integral', 'noite'],
    school_special_needs: boolean,
    school_adaptations: text
}
```

### **5. Desenvolvimento e Nascimento**

```javascript
{
    birth_weight: decimal(5,3),     // em kg
    birth_height: decimal(5,2),     // em cm
    birth_complications: text,
    gestational_age: integer,       // em semanas
    delivery_type: enum ['normal', 'cesariana', 'fórceps', 'vácuo'],
    development_concerns: text,
    early_intervention: boolean
}
```

### **6. Dados Médicos Gerais**

```javascript
{
    pediatrician_name: string,
    pediatrician_phone: string,
    pediatrician_email: string,
    health_insurance: string,
    health_insurance_number: string
}
```

### **7. Observações Especiais**

```javascript
{
    allergies: text,
    dietary_restrictions: text,
    behavioral_notes: text,
    communication_preferences: text
}
```

### **8. Medicações (Array)**

```javascript
[
    {
        id: number,
        medication_name: string,
        dosage: string,
        frequency: string,
        administration_time: string,
        prescribing_doctor: string,
        doctor_phone: string,
        doctor_email: string,
        doctor_specialty: string,
        prescription_date: date,
        start_date: date,
        end_date: date,
        notes: text,
        is_current: boolean
    }
]
```

### **9. Contatos de Emergência (Array)**

```javascript
[
    {
        id: number,
        contact_name: string,
        relationship: string,
        phone_primary: string,
        phone_secondary: string,
        email: string,
        address: text,
        priority_order: integer,
        can_authorize_treatment: boolean,
        can_pick_up_patient: boolean,
        notes: text,
        is_active: boolean
    }
]
```

### **10. Histórico Médico (Array)**

```javascript
[
    {
        id: number,
        condition_name: string,
        condition_type: string,
        diagnosis_date: date,
        treating_physician: string,
        physician_specialty: string,
        physician_phone: string,
        treatment_status: enum ['ativo', 'finalizado', 'suspenso'],
        notes: text,
        relevant_for_therapy: boolean
    }
]
```

### **11. Contatos Profissionais (Array)**

```javascript
[
    {
        id: number,
        professional_type: string,
        professional_name: string,
        clinic_name: string,
        phone: string,
        email: string,
        specialty: string,
        frequency_of_visits: string,
        last_appointment: date,
        next_appointment: date,
        notes: text,
        is_current: boolean
    }
]
```

---

## 🎨 ESTRUTURA VISUAL DO PDF

### **Página 1 - Cabeçalho e Dados Principais**

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│          FICHA COMPLETA DE CADASTRO DO PACIENTE              │
│                    [Nome do Paciente]                        │
│                                                              │
│  ID: XXX | Data de Nascimento: DD/MM/YYYY | Idade: XX anos  │
│  Diagnóstico: [Diagnóstico completo]                         │
│  Clínica: [Nome da Clínica]                                  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ╔════════════════════════════════════════════════════════╗ │
│  ║  1. DADOS DOS RESPONSÁVEIS                             ║ │
│  ╚════════════════════════════════════════════════════════╝ │
│                                                              │
│  Responsável Principal:                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Nome:            [Nome completo]                       │ │
│  │ Relacionamento:  [Relação com paciente]                │ │
│  │ Telefone:        [Telefone formatado]                  │ │
│  │ Email:           [Email]                               │ │
│  │ Ocupação:        [Profissão]                           │ │
│  │ Escolaridade:    [Nível de escolaridade]               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Segundo Responsável:                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Nome:            [Nome completo]                       │ │
│  │ Relacionamento:  [Relação com paciente]                │ │
│  │ Telefone:        [Telefone formatado]                  │ │
│  │ Email:           [Email]                               │ │
│  │ Ocupação:        [Profissão]                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  ╔════════════════════════════════════════════════════════╗ │
│  ║  2. ENDEREÇO E CONTATO                                 ║ │
│  ╚════════════════════════════════════════════════════════╝ │
│                                                              │
│  [Rua], [Número] [Complemento]                               │
│  [Bairro] - [Cidade]/[Estado]                                │
│  CEP: [00000-000]                                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
│ Página 1 de X | Gerado em: DD/MM/YYYY HH:MM | CONFIDENCIAL │
└──────────────────────────────────────────────────────────────┘
```

### **Página 2 - Educação e Desenvolvimento**

```
┌──────────────────────────────────────────────────────────────┐
│  ╔════════════════════════════════════════════════════════╗ │
│  ║  3. INFORMAÇÕES EDUCACIONAIS                           ║ │
│  ╚════════════════════════════════════════════════════════╝ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Escola:           [Nome da escola]                      ││
│  │ Telefone:         [Telefone]                            ││
│  │ Email:            [Email da escola]                     ││
│  │ Professor(a):     [Nome] - Tel: [Telefone]              ││
│  │ Série/Ano:        [Série atual]                         ││
│  │ Período:          [manhã/tarde/integral/noite]          ││
│  │ Necessidades Especiais: [Sim/Não]                       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Adaptações Escolares:                                       │
│  [Texto descritivo das adaptações necessárias]               │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  ╔════════════════════════════════════════════════════════╗ │
│  ║  4. DESENVOLVIMENTO E NASCIMENTO                       ║ │
│  ╚════════════════════════════════════════════════════════╝ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Peso ao Nascer:      [X.XXX] kg                         ││
│  │ Altura ao Nascer:    [XX.X] cm                          ││
│  │ Idade Gestacional:   [XX] semanas                       ││
│  │ Tipo de Parto:       [normal/cesariana/fórceps/vácuo]   ││
│  │ Intervenção Precoce: [Sim/Não]                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Complicações no Nascimento:                                 │
│  [Texto descritivo das complicações]                         │
│                                                              │
│  Preocupações no Desenvolvimento:                            │
│  [Texto descritivo das preocupações]                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
│ Página 2 de X | Gerado em: DD/MM/YYYY HH:MM | CONFIDENCIAL │
└──────────────────────────────────────────────────────────────┘
```

### **Página 3 - Dados Médicos e Medicações**

```
┌──────────────────────────────────────────────────────────────┐
│  ╔════════════════════════════════════════════════════════╗ │
│  ║  5. DADOS MÉDICOS                                      ║ │
│  ╚════════════════════════════════════════════════════════╝ │
│                                                              │
│  Pediatra:                                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Nome:     [Nome do pediatra]                            ││
│  │ Telefone: [Telefone]                                    ││
│  │ Email:    [Email]                                       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Plano de Saúde:                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Operadora: [Nome da operadora]                          ││
│  │ Número:    [Número da carteirinha]                      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  ╔════════════════════════════════════════════════════════╗ │
│  ║  6. MEDICAÇÕES ATUAIS                                  ║ │
│  ╚════════════════════════════════════════════════════════╝ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Medicação          │ Dosagem  │ Frequência │ Horário   │ ││
│  ├────────────────────┼──────────┼────────────┼───────────┤ ││
│  │ [Nome medicação]   │ [Dose]   │ [Freq]     │ [Horário] │ ││
│  │ [Nome medicação]   │ [Dose]   │ [Freq]     │ [Horário] │ ││
│  │ ...                │ ...      │ ...        │ ...       │ ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Detalhes das Medicações:                                    │
│  • [Nome]: Prescrito por Dr(a). [Nome] ([Especialidade])    │
│    Início: [Data] | Notas: [Observações]                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
│ Página 3 de X | Gerado em: DD/MM/YYYY HH:MM | CONFIDENCIAL │
└──────────────────────────────────────────────────────────────┘
```

### **Página 4 - Contatos de Emergência**

```
┌──────────────────────────────────────────────────────────────┐
│  ╔════════════════════════════════════════════════════════╗ │
│  ║  7. CONTATOS DE EMERGÊNCIA                             ║ │
│  ╚════════════════════════════════════════════════════════╝ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Ordem │ Nome          │ Relação │ Telefone     │ Autori.││
│  ├───────┼───────────────┼─────────┼──────────────┼────────┤│
│  │   1   │ [Nome]        │ [Rel]   │ [Tel]        │ [S/N]  ││
│  │   2   │ [Nome]        │ [Rel]   │ [Tel]        │ [S/N]  ││
│  │   3   │ [Nome]        │ [Rel]   │ [Tel]        │ [S/N]  ││
│  │  ...  │ ...           │ ...     │ ...          │ ...    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Legenda: Autori. = Pode autorizar tratamento               │
│                                                              │
│  Detalhes dos Contatos:                                      │
│  1. [Nome Completo] - [Relacionamento]                       │
│     Tel. Principal: [Telefone] | Tel. Secundário: [Telefone]│
│     Email: [Email] | Endereço: [Endereço completo]          │
│     Pode buscar paciente: [Sim/Não]                          │
│     Observações: [Notas adicionais]                          │
│                                                              │
│  2. [Próximo contato...]                                     │
│     [...]                                                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
│ Página 4 de X | Gerado em: DD/MM/YYYY HH:MM | CONFIDENCIAL │
└──────────────────────────────────────────────────────────────┘
```

### **Página 5 - Histórico Médico e Profissionais**

```
┌──────────────────────────────────────────────────────────────┐
│  ╔════════════════════════════════════════════════════════╗ │
│  ║  8. HISTÓRICO MÉDICO                                   ║ │
│  ╚════════════════════════════════════════════════════════╝ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ • [Condição/Diagnóstico] - [Tipo]                       ││
│  │   Data: [DD/MM/YYYY] | Status: [ativo/finalizado]       ││
│  │   Médico: Dr(a). [Nome] - [Especialidade]               ││
│  │   Tel: [Telefone]                                        ││
│  │   Relevante para terapia: [Sim/Não]                     ││
│  │   Observações: [Notas]                                   ││
│  │                                                          ││
│  │ • [Próxima condição...]                                  ││
│  │   [...]                                                  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  ╔════════════════════════════════════════════════════════╗ │
│  ║  9. PROFISSIONAIS DE ACOMPANHAMENTO                    ║ │
│  ╚════════════════════════════════════════════════════════╝ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Tipo         │ Nome/Clínica   │ Contato    │ Frequência ││
│  ├──────────────┼────────────────┼────────────┼────────────┤│
│  │ Psiquiatra   │ Dr. [Nome]     │ [Tel]      │ Mensal     ││
│  │              │ [Clínica]      │ [Email]    │            ││
│  ├──────────────┼────────────────┼────────────┼────────────┤│
│  │ Fonoaudiólogo│ [Nome]         │ [Tel]      │ Semanal    ││
│  │              │ [Clínica]      │ [Email]    │            ││
│  │  ...         │ ...            │ ...        │ ...        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Consultas Agendadas:                                        │
│  • [Tipo]: Última consulta: [Data] | Próxima: [Data]        │
│    Observações: [Notas]                                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
│ Página 5 de X | Gerado em: DD/MM/YYYY HH:MM | CONFIDENCIAL │
└──────────────────────────────────────────────────────────────┘
```

### **Página 6 - Observações Finais**

```
┌──────────────────────────────────────────────────────────────┐
│  ╔════════════════════════════════════════════════════════╗ │
│  ║  10. OBSERVAÇÕES ESPECIAIS                             ║ │
│  ╚════════════════════════════════════════════════════════╝ │
│                                                              │
│  Alergias:                                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [Descrição detalhada das alergias conhecidas]           ││
│  │ [Ou "Nenhuma alergia conhecida"]                        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Restrições Alimentares:                                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [Descrição das restrições alimentares]                  ││
│  │ [Ou "Sem restrições"]                                   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Notas Comportamentais:                                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [Observações sobre comportamento, gatilhos, estratégias]││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Preferências de Comunicação:                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [Como a família prefere ser contatada, melhores         ││
│  │  horários, idioma, etc.]                                ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Anotações Gerais:                                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [Quaisquer outras observações importantes sobre o       ││
│  │  paciente que não se encaixam nas categorias acima]     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ╔════════════════════════════════════════════════════════╗ │
│  ║  AVISO IMPORTANTE - CONFIDENCIALIDADE                  ║ │
│  ╚════════════════════════════════════════════════════════╝ │
│                                                              │
│  Este documento contém informações confidenciais protegidas  │
│  pela Lei Geral de Proteção de Dados (LGPD - Lei 13.709/18).│
│                                                              │
│  • Uso exclusivo para fins terapêuticos e administrativos   │
│  • Proibida reprodução ou divulgação não autorizada         │
│  • Mantenha em local seguro                                 │
│  • Descarte de forma segura quando não for mais necessário  │
│                                                              │
│  Data de geração: [DD/MM/YYYY às HH:MM:SS]                  │
│  Gerado por: [Nome do administrador]                        │
│  Clínica: [Nome da clínica]                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
│ Página 6 de 6 | Gerado em: DD/MM/YYYY HH:MM | CONFIDENCIAL │
└──────────────────────────────────────────────────────────────┘
```

---

## 💻 IMPLEMENTAÇÃO TÉCNICA

### **Etapa 1: Adicionar Botão no Formulário Expandido**

**Arquivo:** `frontend/src/components/patient/ExpandedPatientForm.js`

**Localização:** Footer do modal, ao lado do botão "Salvar" (aproximadamente linha 520)

```javascript
// Adicionar após o import de ícones existentes
import { faFilePdf } from '@fortawesome/free-solid-svg-icons';

// Adicionar no início do componente, após os outros estados
const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

// Adicionar função de geração
const handleGenerateRegistrationPDF = async () => {
    try {
        setIsGeneratingPDF(true);

        // Importar função dinamicamente
        const { generatePatientRegistrationPDF } = await import('../../utils/pdfGenerator');

        // Gerar PDF com os dados do formulário
        await generatePatientRegistrationPDF({
            patient: {
                id: patient.id,
                name: formData.name,
                dob: formData.dob,
                diagnosis: formData.diagnosis,
                general_notes: formData.general_notes,
                clinic_name: patient.clinic_name
            },
            main: formData.main,
            medications: formData.medications,
            emergencyContacts: formData.emergencyContacts,
            medicalHistory: formData.medicalHistory,
            professionalContacts: formData.professionalContacts
        });

    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert('Erro ao gerar PDF. Por favor, tente novamente.');
    } finally {
        setIsGeneratingPDF(false);
    }
};

// Adicionar botão no footer (antes do botão Salvar)
<button
    onClick={handleGenerateRegistrationPDF}
    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    disabled={isGeneratingPDF || isSaving}
>
    {isGeneratingPDF ? (
        <>
            <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
            Gerando PDF...
        </>
    ) : (
        <>
            <FontAwesomeIcon icon={faFilePdf} className="mr-2" />
            Gerar PDF Completo
        </>
    )}
</button>
```

### **Etapa 2: Criar Função Geradora de PDF**

**Arquivo:** `frontend/src/utils/pdfGenerator.js`

**Adicionar no final do arquivo:**

```javascript
/**
 * Gera PDF completo do cadastro expandido do paciente
 * @param {object} data - Dados completos do paciente
 */
export const generatePatientRegistrationPDF = async (data) => {
    const { patient, main, medications = [], emergencyContacts = [],
            medicalHistory = [], professionalContacts = [] } = data;

    if (!patient || !patient.name) {
        alert("Dados do paciente inválidos.");
        return;
    }

    try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const margin = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const contentWidth = pageWidth - margin * 2;
        let y = margin + 10;
        let pageCount = 1;

        // ============================================
        // FUNÇÕES AUXILIARES
        // ============================================

        const addFooter = (currentPage) => {
            doc.setFontSize(8);
            doc.setTextColor(100);

            // Rodapé esquerdo
            doc.text(`Gerado em: ${formatDate(new Date().toISOString())}`,
                    margin, pageHeight - margin / 2);

            // Rodapé central
            doc.text(`Página ${currentPage}`,
                    pageWidth / 2, pageHeight - margin / 2, { align: 'center' });

            // Rodapé direito
            doc.text('CONFIDENCIAL',
                    pageWidth - margin, pageHeight - margin / 2, { align: 'right' });

            doc.setTextColor(0);
        };

        const checkAndAddPage = (currentY, requiredHeight = 20, preserveFormatting = true) => {
            if (currentY > pageHeight - margin - requiredHeight - 10) {
                const currentFontSize = doc.internal.getFontSize();
                const currentFont = doc.internal.getFont();
                const currentTextColor = doc.internal.getTextColor();

                addFooter(pageCount);
                doc.addPage();
                pageCount++;

                if (preserveFormatting) {
                    doc.setFontSize(currentFontSize);
                    doc.setFont(currentFont.fontName, currentFont.fontStyle);
                    doc.setTextColor(currentTextColor);
                }

                return margin + 10;
            }
            return currentY;
        };

        const addTextBlock = (text, x, startY, maxWidth, lineHeight = 5) => {
            if (!text || text.trim() === '') return startY;
            const lines = doc.splitTextToSize(text, maxWidth);
            let currentY = startY;

            for (let i = 0; i < lines.length; i++) {
                currentY = checkAndAddPage(currentY, lineHeight + 5, true);
                doc.text(lines[i], x, currentY);
                currentY += lineHeight;
            }

            return currentY;
        };

        const addSectionHeader = (title, currentY) => {
            currentY = checkAndAddPage(currentY, 15);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, currentY - 5, contentWidth, 8, 'F');
            doc.text(title, margin + 2, currentY);
            return currentY + 10;
        };

        const formatValue = (value, defaultText = 'Não informado') => {
            if (value === null || value === undefined || value === '') return defaultText;
            if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
            return String(value);
        };

        const calculateAge = (dob) => {
            if (!dob) return null;
            const birthDate = new Date(dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age;
        };

        // ============================================
        // CABEÇALHO PRINCIPAL
        // ============================================

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('FICHA COMPLETA DE CADASTRO DO PACIENTE', pageWidth / 2, y, { align: 'center' });
        y += 8;

        doc.setFontSize(14);
        doc.text(patient.name.toUpperCase(), pageWidth / 2, y, { align: 'center' });
        y += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        const age = calculateAge(patient.dob);
        const ageText = age !== null ? ` | Idade: ${age} anos` : '';

        doc.text(`ID: ${patient.id} | Data de Nascimento: ${formatDate(patient.dob)}${ageText}`,
                pageWidth / 2, y, { align: 'center' });
        y += 5;

        doc.text(`Diagnóstico: ${formatValue(patient.diagnosis)}`,
                pageWidth / 2, y, { align: 'center' });
        y += 5;

        if (patient.clinic_name) {
            doc.text(`Clínica: ${patient.clinic_name}`,
                    pageWidth / 2, y, { align: 'center' });
            y += 6;
        }

        y += 5;
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;

        // ============================================
        // 1. DADOS DOS RESPONSÁVEIS
        // ============================================

        y = addSectionHeader('1. DADOS DOS RESPONSÁVEIS', y);

        // Responsável Principal
        if (main.guardian_name || main.guardian_relationship) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Responsável Principal:', margin, y);
            y += 6;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            const guardianData = [
                ['Nome:', formatValue(main.guardian_name)],
                ['Relacionamento:', formatValue(main.guardian_relationship)],
                ['Telefone:', formatValue(main.guardian_phone)],
                ['Email:', formatValue(main.guardian_email)],
                ['Ocupação:', formatValue(main.guardian_occupation)],
                ['Escolaridade:', formatValue(main.guardian_education)]
            ];

            guardianData.forEach(([label, value]) => {
                y = checkAndAddPage(y, 5);
                doc.setFont('helvetica', 'bold');
                doc.text(`  ${label}`, margin + 2, y);
                doc.setFont('helvetica', 'normal');
                doc.text(value, margin + 35, y);
                y += 5;
            });

            y += 3;
        }

        // Segundo Responsável
        if (main.second_guardian_name || main.second_guardian_relationship) {
            y = checkAndAddPage(y, 30);

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Segundo Responsável:', margin, y);
            y += 6;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            const secondGuardianData = [
                ['Nome:', formatValue(main.second_guardian_name)],
                ['Relacionamento:', formatValue(main.second_guardian_relationship)],
                ['Telefone:', formatValue(main.second_guardian_phone)],
                ['Email:', formatValue(main.second_guardian_email)],
                ['Ocupação:', formatValue(main.second_guardian_occupation)]
            ];

            secondGuardianData.forEach(([label, value]) => {
                y = checkAndAddPage(y, 5);
                doc.setFont('helvetica', 'bold');
                doc.text(`  ${label}`, margin + 2, y);
                doc.setFont('helvetica', 'normal');
                doc.text(value, margin + 35, y);
                y += 5;
            });

            y += 5;
        }

        if (!main.guardian_name && !main.second_guardian_name) {
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text('Nenhum responsável cadastrado.', margin + 2, y);
            doc.setTextColor(0);
            y += 8;
        }

        // ============================================
        // 2. ENDEREÇO E CONTATO
        // ============================================

        y = addSectionHeader('2. ENDEREÇO E CONTATO', y);

        if (main.address_street || main.address_city) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            let address = '';
            if (main.address_street) address += main.address_street;
            if (main.address_number) address += `, ${main.address_number}`;
            if (main.address_complement) address += ` ${main.address_complement}`;

            if (address) {
                y = addTextBlock(address, margin + 2, y, contentWidth - 4);
            }

            let cityState = '';
            if (main.address_neighborhood) cityState += main.address_neighborhood;
            if (main.address_city) {
                cityState += (cityState ? ' - ' : '') + main.address_city;
            }
            if (main.address_state) {
                cityState += `/${main.address_state}`;
            }

            if (cityState) {
                y = addTextBlock(cityState, margin + 2, y, contentWidth - 4);
            }

            if (main.address_zip) {
                y = checkAndAddPage(y, 5);
                doc.text(`CEP: ${main.address_zip}`, margin + 2, y);
                y += 8;
            }
        } else {
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text('Endereço não informado.', margin + 2, y);
            doc.setTextColor(0);
            y += 8;
        }

        // ============================================
        // 3. INFORMAÇÕES EDUCACIONAIS
        // ============================================

        y = addSectionHeader('3. INFORMAÇÕES EDUCACIONAIS', y);

        if (main.school_name) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            const schoolData = [
                ['Escola:', formatValue(main.school_name)],
                ['Telefone:', formatValue(main.school_phone)],
                ['Email:', formatValue(main.school_email)],
                ['Professor(a):', formatValue(main.school_teacher)],
                ['Telefone Prof.:', formatValue(main.school_teacher_phone)],
                ['Série/Ano:', formatValue(main.school_grade)],
                ['Período:', formatValue(main.school_period)],
                ['Necessidades Especiais:', formatValue(main.school_special_needs)]
            ];

            schoolData.forEach(([label, value]) => {
                y = checkAndAddPage(y, 5);
                doc.setFont('helvetica', 'bold');
                doc.text(`  ${label}`, margin + 2, y);
                doc.setFont('helvetica', 'normal');
                doc.text(value, margin + 50, y);
                y += 5;
            });

            if (main.school_adaptations) {
                y = checkAndAddPage(y, 10);
                doc.setFont('helvetica', 'bold');
                doc.text('Adaptações Escolares:', margin + 2, y);
                y += 5;
                doc.setFont('helvetica', 'normal');
                y = addTextBlock(main.school_adaptations, margin + 4, y, contentWidth - 6);
            }

            y += 5;
        } else {
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text('Informações educacionais não informadas.', margin + 2, y);
            doc.setTextColor(0);
            y += 8;
        }

        // ============================================
        // 4. DESENVOLVIMENTO E NASCIMENTO
        // ============================================

        y = addSectionHeader('4. DESENVOLVIMENTO E NASCIMENTO', y);

        if (main.birth_weight || main.gestational_age) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            const developmentData = [
                ['Peso ao Nascer:', main.birth_weight ? `${main.birth_weight} kg` : 'Não informado'],
                ['Altura ao Nascer:', main.birth_height ? `${main.birth_height} cm` : 'Não informado'],
                ['Idade Gestacional:', main.gestational_age ? `${main.gestational_age} semanas` : 'Não informado'],
                ['Tipo de Parto:', formatValue(main.delivery_type)],
                ['Intervenção Precoce:', formatValue(main.early_intervention)]
            ];

            developmentData.forEach(([label, value]) => {
                y = checkAndAddPage(y, 5);
                doc.setFont('helvetica', 'bold');
                doc.text(`  ${label}`, margin + 2, y);
                doc.setFont('helvetica', 'normal');
                doc.text(value, margin + 50, y);
                y += 5;
            });

            if (main.birth_complications) {
                y = checkAndAddPage(y, 10);
                doc.setFont('helvetica', 'bold');
                doc.text('Complicações no Nascimento:', margin + 2, y);
                y += 5;
                doc.setFont('helvetica', 'normal');
                y = addTextBlock(main.birth_complications, margin + 4, y, contentWidth - 6);
            }

            if (main.development_concerns) {
                y = checkAndAddPage(y, 10);
                doc.setFont('helvetica', 'bold');
                doc.text('Preocupações no Desenvolvimento:', margin + 2, y);
                y += 5;
                doc.setFont('helvetica', 'normal');
                y = addTextBlock(main.development_concerns, margin + 4, y, contentWidth - 6);
            }

            y += 5;
        } else {
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text('Informações de desenvolvimento não informadas.', margin + 2, y);
            doc.setTextColor(0);
            y += 8;
        }

        // ============================================
        // 5. DADOS MÉDICOS
        // ============================================

        y = addSectionHeader('5. DADOS MÉDICOS', y);

        if (main.pediatrician_name || main.health_insurance) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            if (main.pediatrician_name) {
                doc.setFont('helvetica', 'bold');
                doc.text('Pediatra:', margin + 2, y);
                y += 5;
                doc.setFont('helvetica', 'normal');

                const pediatricianData = [
                    ['  Nome:', formatValue(main.pediatrician_name)],
                    ['  Telefone:', formatValue(main.pediatrician_phone)],
                    ['  Email:', formatValue(main.pediatrician_email)]
                ];

                pediatricianData.forEach(([label, value]) => {
                    y = checkAndAddPage(y, 5);
                    doc.text(label, margin + 4, y);
                    doc.text(value, margin + 30, y);
                    y += 5;
                });

                y += 3;
            }

            if (main.health_insurance) {
                y = checkAndAddPage(y, 15);
                doc.setFont('helvetica', 'bold');
                doc.text('Plano de Saúde:', margin + 2, y);
                y += 5;
                doc.setFont('helvetica', 'normal');

                const insuranceData = [
                    ['  Operadora:', formatValue(main.health_insurance)],
                    ['  Número:', formatValue(main.health_insurance_number)]
                ];

                insuranceData.forEach(([label, value]) => {
                    y = checkAndAddPage(y, 5);
                    doc.text(label, margin + 4, y);
                    doc.text(value, margin + 30, y);
                    y += 5;
                });

                y += 5;
            }
        } else {
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text('Dados médicos não informados.', margin + 2, y);
            doc.setTextColor(0);
            y += 8;
        }

        // ============================================
        // 6. MEDICAÇÕES ATUAIS
        // ============================================

        y = addSectionHeader('6. MEDICAÇÕES ATUAIS', y);

        const currentMeds = medications.filter(med => med.is_current !== false);

        if (currentMeds.length > 0) {
            // Tabela resumida
            const tableData = currentMeds.map(med => [
                med.medication_name || 'Não informado',
                med.dosage || '-',
                med.frequency || '-',
                med.administration_time || '-'
            ]);

            autoTable(doc, {
                startY: y,
                head: [['Medicação', 'Dosagem', 'Frequência', 'Horário']],
                body: tableData,
                theme: 'grid',
                styles: { fontSize: 9 },
                headStyles: { fillColor: [66, 139, 202], textColor: 255 },
                margin: { left: margin, right: margin }
            });

            y = doc.lastAutoTable.finalY + 8;

            // Detalhes de cada medicação
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Detalhes das Medicações:', margin + 2, y);
            y += 6;

            doc.setFont('helvetica', 'normal');
            currentMeds.forEach((med, index) => {
                y = checkAndAddPage(y, 15);

                doc.setFont('helvetica', 'bold');
                doc.text(`• ${med.medication_name || 'Medicação não informada'}`, margin + 4, y);
                y += 5;

                doc.setFont('helvetica', 'normal');
                if (med.prescribing_doctor) {
                    const doctorText = `  Prescrito por: Dr(a). ${med.prescribing_doctor}`;
                    const specialtyText = med.doctor_specialty ? ` (${med.doctor_specialty})` : '';
                    y = addTextBlock(doctorText + specialtyText, margin + 6, y, contentWidth - 8, 4);
                }

                if (med.start_date) {
                    doc.text(`  Início: ${formatDate(med.start_date)}`, margin + 6, y);
                    y += 4;
                }

                if (med.notes) {
                    doc.text('  Observações:', margin + 6, y);
                    y += 4;
                    y = addTextBlock(med.notes, margin + 8, y, contentWidth - 10, 4);
                }

                y += 3;
            });

            y += 3;
        } else {
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text('Nenhuma medicação cadastrada.', margin + 2, y);
            doc.setTextColor(0);
            y += 8;
        }

        // ============================================
        // 7. CONTATOS DE EMERGÊNCIA
        // ============================================

        y = addSectionHeader('7. CONTATOS DE EMERGÊNCIA', y);

        const activeContacts = emergencyContacts
            .filter(contact => contact.is_active !== false)
            .sort((a, b) => (a.priority_order || 99) - (b.priority_order || 99));

        if (activeContacts.length > 0) {
            // Tabela resumida
            const tableData = activeContacts.map(contact => [
                String(contact.priority_order || '-'),
                contact.contact_name || 'Não informado',
                contact.relationship || '-',
                contact.phone_primary || '-',
                contact.can_authorize_treatment ? 'Sim' : 'Não'
            ]);

            autoTable(doc, {
                startY: y,
                head: [['Ordem', 'Nome', 'Relação', 'Telefone', 'Autoriza']],
                body: tableData,
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [220, 53, 69], textColor: 255 },
                columnStyles: {
                    0: { cellWidth: 15 },
                    4: { cellWidth: 20 }
                },
                margin: { left: margin, right: margin }
            });

            y = doc.lastAutoTable.finalY + 8;

            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text('Legenda: "Autoriza" = Pode autorizar tratamento', margin + 2, y);
            doc.setTextColor(0);
            y += 8;

            // Detalhes de cada contato
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Detalhes dos Contatos:', margin + 2, y);
            y += 6;

            doc.setFont('helvetica', 'normal');
            activeContacts.forEach((contact, index) => {
                y = checkAndAddPage(y, 20);

                doc.setFont('helvetica', 'bold');
                doc.text(`${contact.priority_order || (index + 1)}. ${contact.contact_name || 'Nome não informado'}`,
                        margin + 4, y);
                doc.setFont('helvetica', 'normal');
                doc.text(`- ${contact.relationship || 'Relação não informada'}`,
                        margin + 55, y);
                y += 5;

                const contactDetails = [];
                if (contact.phone_primary) {
                    contactDetails.push(`Tel. Principal: ${contact.phone_primary}`);
                }
                if (contact.phone_secondary) {
                    contactDetails.push(`Tel. Secundário: ${contact.phone_secondary}`);
                }
                if (contactDetails.length > 0) {
                    doc.text(`   ${contactDetails.join(' | ')}`, margin + 6, y);
                    y += 4;
                }

                if (contact.email) {
                    doc.text(`   Email: ${contact.email}`, margin + 6, y);
                    y += 4;
                }

                if (contact.address) {
                    doc.text(`   Endereço: ${contact.address}`, margin + 6, y);
                    y += 4;
                }

                const permissions = [];
                if (contact.can_pick_up_patient) permissions.push('Pode buscar paciente');
                if (contact.can_authorize_treatment) permissions.push('Pode autorizar tratamento');

                if (permissions.length > 0) {
                    doc.text(`   Permissões: ${permissions.join(', ')}`, margin + 6, y);
                    y += 4;
                }

                if (contact.notes) {
                    doc.text('   Observações:', margin + 6, y);
                    y += 4;
                    y = addTextBlock(contact.notes, margin + 8, y, contentWidth - 10, 4);
                }

                y += 3;
            });

            y += 3;
        } else {
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text('Nenhum contato de emergência cadastrado.', margin + 2, y);
            doc.setTextColor(0);
            y += 8;
        }

        // ============================================
        // 8. HISTÓRICO MÉDICO
        // ============================================

        y = addSectionHeader('8. HISTÓRICO MÉDICO', y);

        if (medicalHistory.length > 0) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            medicalHistory.forEach((item, index) => {
                y = checkAndAddPage(y, 20);

                doc.setFont('helvetica', 'bold');
                const conditionTitle = `• ${item.condition_name || 'Condição não informada'}`;
                const conditionType = item.condition_type ? ` - ${item.condition_type}` : '';
                doc.text(conditionTitle + conditionType, margin + 4, y);
                y += 5;

                doc.setFont('helvetica', 'normal');

                const historyDetails = [];
                if (item.diagnosis_date) {
                    historyDetails.push(`Data: ${formatDate(item.diagnosis_date)}`);
                }
                if (item.treatment_status) {
                    historyDetails.push(`Status: ${item.treatment_status}`);
                }
                if (historyDetails.length > 0) {
                    doc.text(`   ${historyDetails.join(' | ')}`, margin + 6, y);
                    y += 4;
                }

                if (item.treating_physician) {
                    const physicianText = `   Médico: Dr(a). ${item.treating_physician}`;
                    const specialtyText = item.physician_specialty ? ` - ${item.physician_specialty}` : '';
                    doc.text(physicianText + specialtyText, margin + 6, y);
                    y += 4;
                }

                if (item.physician_phone) {
                    doc.text(`   Tel: ${item.physician_phone}`, margin + 6, y);
                    y += 4;
                }

                if (item.relevant_for_therapy !== null && item.relevant_for_therapy !== undefined) {
                    doc.text(`   Relevante para terapia: ${item.relevant_for_therapy ? 'Sim' : 'Não'}`,
                            margin + 6, y);
                    y += 4;
                }

                if (item.notes) {
                    doc.text('   Observações:', margin + 6, y);
                    y += 4;
                    y = addTextBlock(item.notes, margin + 8, y, contentWidth - 10, 4);
                }

                y += 4;
            });

            y += 3;
        } else {
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text('Nenhum histórico médico cadastrado.', margin + 2, y);
            doc.setTextColor(0);
            y += 8;
        }

        // ============================================
        // 9. PROFISSIONAIS DE ACOMPANHAMENTO
        // ============================================

        y = addSectionHeader('9. PROFISSIONAIS DE ACOMPANHAMENTO', y);

        const currentProfessionals = professionalContacts.filter(prof => prof.is_current !== false);

        if (currentProfessionals.length > 0) {
            // Tabela de profissionais
            const tableData = currentProfessionals.map(prof => [
                prof.professional_type || 'Não informado',
                `${prof.professional_name || '-'}${prof.clinic_name ? `\n${prof.clinic_name}` : ''}`,
                `${prof.phone || '-'}${prof.email ? `\n${prof.email}` : ''}`,
                prof.frequency_of_visits || '-'
            ]);

            autoTable(doc, {
                startY: y,
                head: [['Tipo', 'Nome/Clínica', 'Contato', 'Frequência']],
                body: tableData,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [40, 167, 69], textColor: 255 },
                margin: { left: margin, right: margin }
            });

            y = doc.lastAutoTable.finalY + 8;

            // Consultas agendadas
            const professionalsWithAppointments = currentProfessionals.filter(
                prof => prof.last_appointment || prof.next_appointment
            );

            if (professionalsWithAppointments.length > 0) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('Consultas Agendadas:', margin + 2, y);
                y += 6;

                doc.setFont('helvetica', 'normal');
                professionalsWithAppointments.forEach(prof => {
                    y = checkAndAddPage(y, 12);

                    const appointments = [];
                    if (prof.last_appointment) {
                        appointments.push(`Última: ${formatDate(prof.last_appointment)}`);
                    }
                    if (prof.next_appointment) {
                        appointments.push(`Próxima: ${formatDate(prof.next_appointment)}`);
                    }

                    doc.text(`• ${prof.professional_type || 'Profissional'}: ${appointments.join(' | ')}`,
                            margin + 4, y);
                    y += 4;

                    if (prof.notes) {
                        doc.text('  Observações:', margin + 6, y);
                        y += 4;
                        y = addTextBlock(prof.notes, margin + 8, y, contentWidth - 10, 4);
                    }

                    y += 2;
                });

                y += 5;
            }
        } else {
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text('Nenhum profissional de acompanhamento cadastrado.', margin + 2, y);
            doc.setTextColor(0);
            y += 8;
        }

        // ============================================
        // 10. OBSERVAÇÕES ESPECIAIS
        // ============================================

        y = addSectionHeader('10. OBSERVAÇÕES ESPECIAIS', y);

        let hasObservations = false;

        if (main.allergies) {
            hasObservations = true;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Alergias:', margin + 2, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            y = addTextBlock(main.allergies, margin + 4, y, contentWidth - 6);
            y += 5;
        }

        if (main.dietary_restrictions) {
            hasObservations = true;
            y = checkAndAddPage(y, 15);
            doc.setFont('helvetica', 'bold');
            doc.text('Restrições Alimentares:', margin + 2, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            y = addTextBlock(main.dietary_restrictions, margin + 4, y, contentWidth - 6);
            y += 5;
        }

        if (main.behavioral_notes) {
            hasObservations = true;
            y = checkAndAddPage(y, 15);
            doc.setFont('helvetica', 'bold');
            doc.text('Notas Comportamentais:', margin + 2, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            y = addTextBlock(main.behavioral_notes, margin + 4, y, contentWidth - 6);
            y += 5;
        }

        if (main.communication_preferences) {
            hasObservations = true;
            y = checkAndAddPage(y, 15);
            doc.setFont('helvetica', 'bold');
            doc.text('Preferências de Comunicação:', margin + 2, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            y = addTextBlock(main.communication_preferences, margin + 4, y, contentWidth - 6);
            y += 5;
        }

        if (patient.general_notes) {
            hasObservations = true;
            y = checkAndAddPage(y, 15);
            doc.setFont('helvetica', 'bold');
            doc.text('Anotações Gerais:', margin + 2, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            y = addTextBlock(patient.general_notes, margin + 4, y, contentWidth - 6);
            y += 5;
        }

        if (!hasObservations) {
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text('Nenhuma observação especial cadastrada.', margin + 2, y);
            doc.setTextColor(0);
            y += 8;
        }

        // ============================================
        // AVISO DE CONFIDENCIALIDADE
        // ============================================

        y = checkAndAddPage(y, 50);
        y += 10;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(255, 243, 205);
        doc.rect(margin, y - 5, contentWidth, 8, 'F');
        doc.text('AVISO IMPORTANTE - CONFIDENCIALIDADE', pageWidth / 2, y, { align: 'center' });
        y += 10;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        const confidentialityText = [
            'Este documento contém informações confidenciais protegidas pela',
            'Lei Geral de Proteção de Dados (LGPD - Lei 13.709/18).',
            '',
            '• Uso exclusivo para fins terapêuticos e administrativos',
            '• Proibida reprodução ou divulgação não autorizada',
            '• Mantenha em local seguro',
            '• Descarte de forma segura quando não for mais necessário'
        ];

        confidentialityText.forEach(line => {
            y = checkAndAddPage(y, 5);
            if (line.startsWith('•')) {
                doc.text(line, margin + 4, y);
            } else {
                doc.text(line, margin + 2, y);
            }
            y += 5;
        });

        y += 5;
        doc.setFontSize(8);
        doc.setTextColor(100);
        const now = new Date();
        doc.text(`Data de geração: ${formatDate(now.toISOString())} às ${now.toLocaleTimeString('pt-BR')}`,
                margin + 2, y);
        y += 4;
        if (patient.clinic_name) {
            doc.text(`Clínica: ${patient.clinic_name}`, margin + 2, y);
        }
        doc.setTextColor(0);

        // ============================================
        // SALVAR PDF
        // ============================================

        addFooter(pageCount);

        const fileName = `Ficha_Completa_${patient.name.replace(/\s+/g, '_')}_${patient.id}.pdf`;
        doc.save(fileName);

        console.log(`PDF gerado com sucesso: ${fileName}`);

    } catch (error) {
        console.error('Erro ao gerar PDF de cadastro:', error);
        throw error;
    }
};
```

---

## ⚙️ CONFIGURAÇÕES E CONSTANTES

### **Cores do PDF**

```javascript
// Cores das seções
const COLORS = {
    headerGray: [240, 240, 240],
    responsibles: [66, 139, 202],    // Azul
    emergency: [220, 53, 69],         // Vermelho
    professionals: [40, 167, 69],     // Verde
    warning: [255, 243, 205],         // Amarelo claro
    textGray: [100, 100, 100]
};
```

### **Margens e Espaçamentos**

```javascript
const LAYOUT = {
    margin: 15,
    lineHeight: 5,
    sectionSpacing: 10,
    subsectionSpacing: 8,
    itemSpacing: 3
};
```

---

## 🧪 TESTES RECOMENDADOS

### **Teste 1: Paciente com Todos os Dados**
- Preencher todos os campos do formulário expandido
- Gerar PDF
- Verificar se todas as seções aparecem corretamente
- **Resultado esperado:** PDF com 5-7 páginas, bem formatado

### **Teste 2: Paciente com Dados Mínimos**
- Cadastrar paciente apenas com nome
- Gerar PDF
- Verificar se mensagens "Não informado" aparecem
- **Resultado esperado:** PDF com 3-4 páginas, sem erros

### **Teste 3: Paciente Antigo (Legado)**
- Selecionar paciente cadastrado antes da expansão
- Gerar PDF
- Verificar tratamento de campos nulos
- **Resultado esperado:** PDF gerado sem erros, campos vazios tratados

### **Teste 4: Paciente com Muitas Medicações/Contatos**
- Cadastrar 10+ medicações
- Cadastrar 5+ contatos de emergência
- Gerar PDF
- Verificar paginação e tabelas
- **Resultado esperado:** Tabelas bem formatadas, quebra de página correta

### **Teste 5: Textos Longos**
- Preencher campos de texto com conteúdo extenso (500+ caracteres)
- Gerar PDF
- Verificar quebra de linha e página
- **Resultado esperado:** Texto quebra corretamente, sem sobreposição

### **Teste 6: Caracteres Especiais**
- Usar acentos, cedilha, símbolos
- Gerar PDF
- Verificar renderização de caracteres
- **Resultado esperado:** Todos caracteres renderizados corretamente

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### **Preparação**
- [ ] Backup do código atual
- [ ] Ambiente de desenvolvimento funcionando
- [ ] Acesso de administrador para testes

### **Frontend - Componente**
- [ ] Importar ícone `faFilePdf`
- [ ] Adicionar estado `isGeneratingPDF`
- [ ] Criar função `handleGenerateRegistrationPDF`
- [ ] Adicionar botão no footer do modal
- [ ] Testar visibilidade do botão (apenas admin)

### **Frontend - Gerador PDF**
- [ ] Criar função `generatePatientRegistrationPDF` em `pdfGenerator.js`
- [ ] Implementar cabeçalho do PDF
- [ ] Implementar seção 1 (Responsáveis)
- [ ] Implementar seção 2 (Endereço)
- [ ] Implementar seção 3 (Educação)
- [ ] Implementar seção 4 (Desenvolvimento)
- [ ] Implementar seção 5 (Dados Médicos)
- [ ] Implementar seção 6 (Medicações)
- [ ] Implementar seção 7 (Contatos Emergência)
- [ ] Implementar seção 8 (Histórico Médico)
- [ ] Implementar seção 9 (Profissionais)
- [ ] Implementar seção 10 (Observações)
- [ ] Implementar aviso de confidencialidade
- [ ] Implementar rodapé com paginação

### **Testes**
- [ ] Teste 1: Paciente completo
- [ ] Teste 2: Paciente mínimo
- [ ] Teste 3: Paciente legado
- [ ] Teste 4: Muitos dados relacionais
- [ ] Teste 5: Textos longos
- [ ] Teste 6: Caracteres especiais
- [ ] Teste de desempenho (geração < 3 segundos)
- [ ] Teste de usabilidade com administrador

### **Documentação**
- [ ] Comentários no código
- [ ] Atualizar CLAUDE.md com nova funcionalidade
- [ ] Screenshots do PDF gerado (para referência)

### **Deploy**
- [ ] Code review
- [ ] Merge para branch principal
- [ ] Deploy em ambiente de produção
- [ ] Comunicar novidade para administradores

---

## 🚨 POSSÍVEIS PROBLEMAS E SOLUÇÕES

### **Problema 1: PDF muito grande**
**Sintoma:** Geração lenta, arquivo > 5MB
**Solução:**
- Verificar se há imagens sendo incluídas
- Otimizar tabelas (reduzir fontSize se necessário)
- Considerar compressão do jsPDF

### **Problema 2: Quebra de página no meio de seção**
**Sintoma:** Título de seção na última linha da página
**Solução:**
- Aumentar `requiredHeight` em `checkAndAddPage()`
- Usar `checkAndAddPage(y, 30)` antes de cada seção

### **Problema 3: Tabela não renderiza**
**Sintoma:** autoTable não aparece no PDF
**Solução:**
- Verificar se `jspdf-autotable` está importado
- Checar se array de dados não está vazio
- Validar estrutura de `tableData`

### **Problema 4: Caracteres especiais aparecem errados**
**Sintoma:** Acentos viram símbolos estranhos
**Solução:**
- jsPDF usa helvetica por padrão (suporta português)
- Se problema persistir, tentar fonte customizada

### **Problema 5: Dados não aparecem**
**Sintoma:** Seções vazias mesmo com dados no formulário
**Solução:**
- Verificar estrutura de `formData` passado para função
- Adicionar `console.log()` para debug
- Validar que `main.campo` está sendo acessado corretamente

---

## 📊 MÉTRICAS DE SUCESSO

### **Quantitativas**
- ✅ Geração de PDF em < 3 segundos
- ✅ PDF com tamanho < 2MB (sem imagens)
- ✅ Taxa de erro < 1%
- ✅ 90%+ dos administradores usam a funcionalidade

### **Qualitativas**
- ✅ Feedback positivo de administradores
- ✅ PDF legível e profissional
- ✅ Informações organizadas e fáceis de encontrar
- ✅ Nenhum bug crítico reportado em 30 dias

---

## 🔄 MELHORIAS FUTURAS (OPCIONAL)

### **V2.0 - Customização**
- Opção de escolher quais seções incluir
- Modo "resumido" vs "completo"
- Logo da clínica no cabeçalho

### **V2.1 - Assinatura Digital**
- Campo para assinatura do responsável
- QR Code de verificação
- Timestamp criptográfico

### **V2.2 - Idiomas**
- Opção de gerar em inglês/espanhol
- Útil para clínicas internacionais

### **V2.3 - Email Automático**
- Opção de enviar PDF por email
- Enviar para responsáveis diretamente

---

## 📞 CONTATO E SUPORTE

**Documentação Técnica:** Este arquivo MD
**Código Fonte:** `frontend/src/utils/pdfGenerator.js` e `frontend/src/components/patient/ExpandedPatientForm.js`
**Testes:** Realizar com dados da clínica 01 apenas

---

## 📝 HISTÓRICO DE VERSÕES

| Versão | Data       | Autor              | Mudanças                                      |
|--------|------------|-------------------|-----------------------------------------------|
| 1.0    | 29/09/2025 | Sistema ABAplay   | Documento inicial - Planejamento completo     |

---

**STATUS DO DOCUMENTO:** ✅ **APROVADO PARA IMPLEMENTAÇÃO**
**PRÓXIMO PASSO:** Aguardar confirmação do usuário para iniciar codificação

---

*Este documento serve como guia completo para a implementação da funcionalidade de geração de PDF do cadastro expandido de paciente no sistema ABAplay. Todas as decisões técnicas, estruturas de dados e layouts visuais estão documentados para referência futura e manutenção.*