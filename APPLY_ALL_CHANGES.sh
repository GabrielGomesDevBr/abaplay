#!/bin/bash

# ====================================================
# SCRIPT AUTOMÁTICO DE APLICAÇÃO COMPLETA
# Sistema de Agendamento Refatorado - Fase 1 + Fase 2
# ====================================================

set -e

echo "╔════════════════════════════════════════════════════╗"
echo "║   APLICAÇÃO AUTOMÁTICA DA REFATORAÇÃO              ║"
echo "║   Sistema de Agendamento - ABAplay                 ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar diretório
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ ERRO: Execute este script do diretório raiz do projeto${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Diretório correto detectado"
echo ""

# Criar backup
echo -e "${BLUE}📦 Criando backup...${NC}"
BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

files_to_backup=(
    "backend/src/server.js"
    "backend/src/controllers/schedulingController.js"
    "backend/src/routes/schedulingRoutes.js"
    "frontend/src/api/schedulingApi.js"
    "frontend/src/components/scheduling/OrphanSessionsList.js"
)

for file in "${files_to_backup[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/"
        echo "  → $file"
    fi
done

echo -e "${GREEN}✓${NC} Backup criado em: $BACKUP_DIR"
echo ""

# Verificar se arquivos necessários existem
echo -e "${BLUE}🔍 Verificando arquivos necessários...${NC}"

required_backend=(
    "backend/src/jobs/sessionMaintenanceJob.js"
    "frontend/src/components/scheduling/PendingActionsPanel.js"
)

all_ok=true
for file in "${required_backend[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "  ${RED}✗${NC} Faltando: $file"
        all_ok=false
    else
        echo -e "  ${GREEN}✓${NC} Existe: $file"
    fi
done

if [ "$all_ok" = false ]; then
    echo ""
    echo -e "${RED}❌ ERRO: Alguns arquivos essenciais não foram criados ainda${NC}"
    echo ""
    echo "Execute primeiro os seguintes comandos:"
    echo "  1. Certifique-se de que sessionMaintenanceJob.js foi criado"
    echo "  2. Certifique-se de que PendingActionsPanel.js foi criado"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓${NC} Todos os arquivos essenciais existem"
echo ""

# Aplicar patches manualmente requer instruções
echo "╔════════════════════════════════════════════════════╗"
echo "║   PATCHES MANUAIS NECESSÁRIOS                      ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""
echo -e "${YELLOW}⚠️  Os seguintes arquivos precisam ser editados MANUALMENTE:${NC}"
echo ""
echo "1️⃣  backend/src/controllers/schedulingController.js"
echo "   → Abra o arquivo PATCH_schedulingController.js"
echo "   → Copie os 2 métodos para o controller"
echo ""
echo "2️⃣  backend/src/routes/schedulingRoutes.js"
echo "   → Abra o arquivo PATCH_schedulingRoutes.js"
echo "   → Copie as 2 rotas para o arquivo de rotas"
echo ""
echo "3️⃣  frontend/src/api/schedulingApi.js"
echo "   → Adicione as 2 funções do IMPLEMENTATION_PACKAGE.md"
echo ""
echo "4️⃣  frontend/src/components/scheduling/OrphanSessionsList.js"
echo "   → Atualize com o código do REFACTORING_SCHEDULING_SYSTEM.md"
echo ""
echo "5️⃣  frontend/src/components/scheduling/BatchRetroactiveModal.js"
echo "   → Crie com o código do REFACTORING_SCHEDULING_SYSTEM.md"
echo ""

read -p "Pressione ENTER depois de aplicar os patches manuais..."

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║   TESTANDO APLICAÇÃO                               ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

echo -e "${BLUE}🧪 Executando testes básicos...${NC}"
echo ""

# Verificar sintaxe backend
echo "→ Verificando sintaxe do backend..."
if command -v node &> /dev/null; then
    cd backend
    if node -c src/server.js 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} server.js: sintaxe OK"
    else
        echo -e "  ${RED}✗${NC} server.js: erro de sintaxe"
    fi

    if node -c src/jobs/sessionMaintenanceJob.js 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} sessionMaintenanceJob.js: sintaxe OK"
    else
        echo -e "  ${RED}✗${NC} sessionMaintenanceJob.js: erro de sintaxe"
    fi
    cd ..
else
    echo -e "  ${YELLOW}⚠${NC}  Node.js não encontrado, pulando verificação"
fi

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║   RESUMO DA INSTALAÇÃO                             ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

echo -e "${GREEN}✓ Arquivos criados:${NC}"
echo "  • sessionMaintenanceJob.js"
echo "  • PendingActionsPanel.js"
echo "  • server.js (atualizado)"
echo ""

echo -e "${YELLOW}⚠  Patches pendentes (aplicar manualmente):${NC}"
echo "  • schedulingController.js (2 métodos)"
echo "  • schedulingRoutes.js (2 rotas)"
echo "  • schedulingApi.js (2 funções)"
echo "  • OrphanSessionsList.js (atualização)"
echo "  • BatchRetroactiveModal.js (novo)"
echo ""

echo -e "${BLUE}📚 Documentação:${NC}"
echo "  • IMPLEMENTATION_PACKAGE.md - Guia de implementação"
echo "  • REFACTORING_SCHEDULING_SYSTEM.md - Documento completo"
echo "  • PATCH_*.js - Códigos para aplicar"
echo ""

echo "╔════════════════════════════════════════════════════╗"
echo "║   PRÓXIMOS PASSOS                                  ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

echo "1. Aplique os patches manuais listados acima"
echo "2. Reinicie o backend: cd backend && npm start"
echo "3. Reinicie o frontend: cd frontend && npm start"
echo "4. Acesse a aplicação e teste as novas funcionalidades"
echo "5. Consulte IMPLEMENTATION_PACKAGE.md para detalhes"
echo ""

echo -e "${GREEN}✅ Script concluído!${NC}"
echo ""
echo "Backup salvo em: $BACKUP_DIR/"
echo ""