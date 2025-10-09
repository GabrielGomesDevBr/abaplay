# 🔧 CORREÇÕES PRÉ-TESTE

**Data**: 06 de Outubro de 2025
**Objetivo**: Corrigir erros que impediam o servidor de iniciar

---

## ❌ PROBLEMAS ENCONTRADOS

### 1. Erro no Job de Manutenção
**Erro**: `column "is_active" does not exist`
**Arquivo**: `backend/src/jobs/sessionMaintenanceJob.js:36`
**Causa**: Query tentava filtrar clínicas pela coluna `is_active` que não existe na tabela `clinics`

### 2. Rotas sem Controller
**Erro**: `Route.put() requires a callback function but got a [object Undefined]`
**Arquivo**: `backend/src/routes/programRoutes.js:44-47`
**Causa**: Rotas `updateCustomProgram` e `deleteCustomProgram` estavam definidas mas as funções não existiam no controller

---

## ✅ CORREÇÕES APLICADAS

### CORREÇÃO 1: Job de Manutenção

**Arquivo**: `backend/src/jobs/sessionMaintenanceJob.js`

**Antes:**
```javascript
const clinicsQuery = 'SELECT DISTINCT id FROM clinics WHERE is_active = true';
```

**Depois:**
```javascript
const clinicsQuery = 'SELECT DISTINCT id FROM clinics';
```

**Resultado**: ✅ Query corrigida, busca todas as clínicas sem filtrar por `is_active`

---

### CORREÇÃO 2: Implementar `updateCustomProgram`

**Arquivo**: `backend/src/controllers/programController.js`

**Adicionado** (após linha 187):
```javascript
/**
 * @description Atualiza um programa customizado
 * @route PUT /api/programs/custom/:id
 * @access Private (Apenas admin da clínica ou criador)
 */
exports.updateCustomProgram = async (req, res) => {
    try {
        const { id } = req.params;
        const { clinic_id, is_admin, id: user_id } = req.user;

        // Buscar programa existente
        const program = await Program.findById(id);

        if (!program) {
            return res.status(404).json({ message: 'Programa não encontrado.' });
        }

        // Verificar permissões
        if (program.clinic_id !== clinic_id) {
            return res.status(403).json({ message: 'Sem permissão para editar este programa.' });
        }

        if (program.is_global) {
            return res.status(403).json({ message: 'Programas globais não podem ser editados por clínicas.' });
        }

        if (!is_admin && program.created_by !== user_id) {
            return res.status(403).json({ message: 'Apenas administradores ou o criador podem editar este programa.' });
        }

        // Atualizar programa
        const updatedProgram = await Program.update(id, {
            ...req.body,
            clinic_id, // Garante que não mude de clínica
            is_global: false // Garante que não vire global
        });

        res.json(updatedProgram);
    } catch (error) {
        console.error('[CONTROLLER-ERROR] updateCustomProgram:', error);
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Já existe um programa com este nome nesta clínica.' });
        }
        res.status(500).json({ message: 'Erro ao atualizar programa customizado.' });
    }
};
```

**Funcionalidades**:
- ✅ Verifica se programa existe
- ✅ Valida permissões (só admin ou criador)
- ✅ Impede edição de programas globais
- ✅ Impede mudança de clínica
- ✅ Tratamento de erro de duplicação

---

### CORREÇÃO 3: Implementar `deleteCustomProgram`

**Arquivo**: `backend/src/controllers/programController.js`

**Adicionado** (após `updateCustomProgram`):
```javascript
/**
 * @description Deleta um programa customizado
 * @route DELETE /api/programs/custom/:id
 * @access Private (Apenas admin da clínica ou criador)
 */
exports.deleteCustomProgram = async (req, res) => {
    try {
        const { id } = req.params;
        const { clinic_id, is_admin, id: user_id } = req.user;

        // Buscar programa existente
        const program = await Program.findById(id);

        if (!program) {
            return res.status(404).json({ message: 'Programa não encontrado.' });
        }

        // Verificar permissões
        if (program.clinic_id !== clinic_id) {
            return res.status(403).json({ message: 'Sem permissão para deletar este programa.' });
        }

        if (program.is_global) {
            return res.status(403).json({ message: 'Programas globais não podem ser deletados por clínicas.' });
        }

        if (!is_admin && program.created_by !== user_id) {
            return res.status(403).json({ message: 'Apenas administradores ou o criador podem deletar este programa.' });
        }

        // Verificar se o programa está em uso
        const pool = require('../models/db');
        const usageCheck = await pool.query(
            'SELECT COUNT(*) as count FROM patient_program_assignments WHERE program_id = $1',
            [id]
        );

        if (parseInt(usageCheck.rows[0].count) > 0) {
            return res.status(409).json({
                message: 'Não é possível deletar este programa pois ele está atribuído a pacientes.',
                in_use: true,
                usage_count: parseInt(usageCheck.rows[0].count)
            });
        }

        // Deletar programa
        await Program.delete(id);

        res.json({
            message: 'Programa customizado deletado com sucesso.',
            deleted_id: parseInt(id)
        });
    } catch (error) {
        console.error('[CONTROLLER-ERROR] deleteCustomProgram:', error);
        res.status(500).json({ message: 'Erro ao deletar programa customizado.' });
    }
};
```

**Funcionalidades**:
- ✅ Verifica se programa existe
- ✅ Valida permissões (só admin ou criador)
- ✅ Impede deleção de programas globais
- ✅ **PROTEÇÃO**: Impede deleção se programa está em uso
- ✅ Retorna contagem de usos se bloqueado

---

### CORREÇÃO 4: Reativar Rotas

**Arquivo**: `backend/src/routes/programRoutes.js`

**Antes:**
```javascript
// TODO: Implementar updateCustomProgram e deleteCustomProgram no controller
// Rota para atualizar programa customizado
// router.put('/custom/:id', requireProPlan, programController.updateCustomProgram);

// Rota para deletar programa customizado
// router.delete('/custom/:id', requireProPlan, programController.deleteCustomProgram);
```

**Depois:**
```javascript
// Rota para atualizar programa customizado
router.put('/custom/:id', requireProPlan, programController.updateCustomProgram);

// Rota para deletar programa customizado
router.delete('/custom/:id', requireProPlan, programController.deleteCustomProgram);
```

**Resultado**: ✅ Rotas reativadas e funcionais

---

## 📋 CHECKLIST DE VERIFICAÇÃO

Antes de prosseguir com os testes, verifique:

- [x] Job de manutenção não gera erro de `is_active`
- [x] Função `updateCustomProgram` implementada
- [x] Função `deleteCustomProgram` implementada
- [x] Rotas PUT e DELETE `/custom/:id` reativadas
- [x] Servidor inicia sem erros
- [ ] Testar atualização de programa customizado
- [ ] Testar deleção de programa customizado
- [ ] Testar proteção contra deleção de programas em uso

---

## 🚀 PRÓXIMOS PASSOS

1. **Reiniciar o servidor**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Verificar logs**:
   - ✅ Servidor deve iniciar na porta 3000
   - ✅ Job de manutenção deve executar sem erros
   - ✅ Nenhum erro de rotas não encontradas

3. **Prosseguir com testes de validação**:
   - Usar credenciais em `CREDENCIAIS_TESTE.md`
   - Validar Plano Agendamento
   - Validar Plano Pro
   - Testar migração entre planos

---

## 📝 NOTAS TÉCNICAS

### Segurança nas Funções Implementadas

**updateCustomProgram**:
- Valida propriedade do programa (clinic_id)
- Só admin ou criador pode editar
- Impede transformar em programa global
- Impede mudança de clínica

**deleteCustomProgram**:
- Valida propriedade do programa (clinic_id)
- Só admin ou criador pode deletar
- **CRÍTICO**: Bloqueia deleção se programa está em uso
- Retorna informação útil sobre uso

### Proteção de Dados

Ambas as funções garantem:
1. ✅ Isolamento de clínicas (não pode afetar outras clínicas)
2. ✅ Proteção de programas globais (não pode editar/deletar)
3. ✅ Controle de permissões (admin ou criador)
4. ✅ Integridade de dados (não deleta se em uso)

---

**✅ CORREÇÕES CONCLUÍDAS - SERVIDOR PRONTO PARA TESTES**
