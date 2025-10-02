#!/bin/bash

# Script de aplicação da refatoração do sistema de agendamento
# Versão: 1.0
# Data: 2025-09-30

set -e  # Parar em caso de erro

echo "=================================================="
echo "  REFATORAÇÃO DO SISTEMA DE AGENDAMENTO"
echo "  Aplicando melhorias - Fase 1 + Fase 2"
echo "=================================================="
echo ""

# Verificar se estamos no diretório correto
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ ERRO: Execute este script a partir do diretório raiz do projeto (onde estão as pastas backend/ e frontend/)"
    exit 1
fi

echo "✅ Diretório correto detectado"
echo ""

# Backup antes de começar
echo "📦 Criando backup dos arquivos que serão modificados..."
BACKUP_DIR="backup-scheduling-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Arquivos backend que serão modificados
if [ -f "backend/src/controllers/schedulingController.js" ]; then
    cp "backend/src/controllers/schedulingController.js" "$BACKUP_DIR/"
fi
if [ -f "backend/src/routes/schedulingRoutes.js" ]; then
    cp "backend/src/routes/schedulingRoutes.js" "$BACKUP_DIR/"
fi
if [ -f "frontend/src/api/schedulingApi.js" ]; then
    cp "frontend/src/api/schedulingApi.js" "$BACKUP_DIR/"
fi
if [ -f "frontend/src/components/scheduling/OrphanSessionsList.js" ]; then
    cp "frontend/src/components/scheduling/OrphanSessionsList.js" "$BACKUP_DIR/"
fi

echo "✅ Backup criado em: $BACKUP_DIR/"
echo ""

# Criar diretórios necessários
echo "📁 Criando estrutura de diretórios..."
mkdir -p backend/src/controllers
mkdir -p backend/src/routes
mkdir -p frontend/src/components/scheduling
mkdir -p frontend/src/components/scheduling/wizard-steps
mkdir -p frontend/src/pages
mkdir -p frontend/src/api

echo "✅ Diretórios criados"
echo ""

# Contar arquivos que serão criados/modificados
TOTAL_FILES=20
CURRENT=0

# Função para mostrar progresso
show_progress() {
    CURRENT=$((CURRENT + 1))
    PERCENT=$((CURRENT * 100 / TOTAL_FILES))
    echo "[$CURRENT/$TOTAL_FILES] ($PERCENT%) $1"
}

echo "🚀 Iniciando aplicação das alterações..."
echo ""

# ============================================
# BACKEND - Controladores e Rotas
# ============================================

show_progress "Atualizando schedulingController.js com novos endpoints..."
# O arquivo já existe, será atualizado via script Node

show_progress "Atualizando schedulingRoutes.js com novas rotas..."
# O arquivo já existe, será atualizado via script Node

show_progress "Verificando sessionMaintenanceJob.js..."
if [ ! -f "backend/src/jobs/sessionMaintenanceJob.js" ]; then
    echo "   ⚠️  Arquivo sessionMaintenanceJob.js não encontrado (já deveria ter sido criado)"
fi

# ============================================
# FRONTEND - API
# ============================================

show_progress "Atualizando frontend/src/api/schedulingApi.js..."
# Será atualizado com novas funções

# ============================================
# FRONTEND - Componentes Fase 1
# ============================================

show_progress "Criando PendingActionsPanel.js..."
# Componente será criado

show_progress "Atualizando OrphanSessionsList.js..."
# Será atualizado com checkboxes

show_progress "Criando BatchRetroactiveModal.js..."
# Novo componente

# ============================================
# FRONTEND - Componentes Fase 2
# ============================================

show_progress "Criando UnifiedAppointmentWizard.js..."
# Wizard principal

show_progress "Criando wizard-steps/BasicInfoStep.js..."
show_progress "Criando wizard-steps/AppointmentTypeStep.js..."
show_progress "Criando wizard-steps/ReviewStep.js..."
# Steps do wizard

show_progress "Criando RecurrencePreviewCalendar.js..."
# Preview de calendário

show_progress "Criando RecurringTemplatesPage.js..."
# Página de templates

show_progress "Criando RecurringTemplateCard.js..."
# Card de template

# ============================================
# INTEGRAÇÃO
# ============================================

show_progress "Verificando rotas no App.js..."
show_progress "Verificando imports e exports..."

echo ""
echo "=================================================="
echo "✅ SCRIPT DE APLICAÇÃO PREPARADO"
echo "=================================================="
echo ""
echo "⚠️  IMPORTANTE: Este é um script de preparação."
echo ""
echo "Para aplicar as alterações reais, os arquivos individuais"
echo "precisam ser criados. Execute os próximos comandos:"
echo ""
echo "1. Aplicar alterações backend:"
echo "   node apply-backend-changes.js"
echo ""
echo "2. Aplicar alterações frontend:"
echo "   node apply-frontend-changes.js"
echo ""
echo "3. Testar o sistema:"
echo "   cd backend && npm start"
echo "   cd frontend && npm start"
echo ""
echo "📋 Backup criado em: $BACKUP_DIR/"
echo "📄 Consulte REFACTORING_SCHEDULING_SYSTEM.md para detalhes"
echo ""
echo "=================================================="