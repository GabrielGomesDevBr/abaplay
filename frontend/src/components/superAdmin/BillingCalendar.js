// frontend/src/components/superAdmin/BillingCalendar.js

import React, { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChevronLeft, faChevronRight, faCalendarAlt, 
  faCircle, faEye, faCreditCard, faEdit, faTable, faList
} from '@fortawesome/free-solid-svg-icons';

const BillingCalendar = ({ billings, onViewBilling, onRecordPayment, onEditDueDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // month, week, day

  // Navegação do calendário (removido pois não é usado)
  // const navigateMonth foi removido - usar navigatePeriod

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Gerar dias do mês
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    // const lastDay = new Date(year, month + 1, 0); // removido pois não é usado
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Domingo da primeira semana
    
    const days = [];
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 42); // 6 semanas
    
    for (let date = new Date(startDate); date < endDate; date.setDate(date.getDate() + 1)) {
      days.push(new Date(date));
    }
    
    return days;
  };

  // Gerar dias da semana
  const generateWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  };

  // Navegação baseada na view
  const navigatePeriod = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() + direction);
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + (direction * 7));
    } else if (viewMode === 'day') {
      newDate.setDate(currentDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  // Agrupar cobranças por data
  const billingsByDate = useMemo(() => {
    const grouped = {};
    
    billings.forEach(billing => {
      const date = new Date(billing.due_date).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(billing);
    });
    
    return grouped;
  }, [billings]);

  // Obter status da data
  const getDateStatus = (date, bills) => {
    if (!bills || bills.length === 0) return 'normal';
    
    const today = new Date();
    const isOverdue = date < today;
    const isPaid = bills.every(bill => bill.status === 'paid');
    const hasPending = bills.some(bill => bill.status === 'pending');
    const hasOverdue = bills.some(bill => bill.status === 'overdue');
    
    if (isPaid) return 'paid';
    if (hasOverdue || (isOverdue && hasPending)) return 'overdue';
    if (hasPending) return 'pending';
    return 'normal';
  };

  // Estilos por status
  const getStatusStyles = (status, isToday, isCurrentMonth) => {
    const baseClasses = `relative w-full h-32 border border-gray-200 hover:bg-gray-50 transition-colors ${
      isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'
    }`;
    
    let statusClasses = '';
    
    if (isToday) {
      statusClasses = 'ring-2 ring-blue-500';
    }
    
    switch (status) {
      case 'paid':
        statusClasses += ' bg-green-50 border-green-200';
        break;
      case 'overdue':
        statusClasses += ' bg-red-50 border-red-300';
        break;
      case 'pending':
        statusClasses += ' bg-yellow-50 border-yellow-200';
        break;
      default:
        break;
    }
    
    return `${baseClasses} ${statusClasses}`;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  // const days = generateCalendarDays(); // removido pois não é usado neste contexto
  const today = new Date();
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header do Calendário */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-blue-600" />
              Calendário de Cobranças
            </h3>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Hoje
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Seletor de View */}
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 text-sm flex items-center transition-colors ${
                  viewMode === 'month' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FontAwesomeIcon icon={faTable} className="mr-1" />
                Mês
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 text-sm flex items-center transition-colors ${
                  viewMode === 'week' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FontAwesomeIcon icon={faCalendarAlt} className="mr-1" />
                Semana
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1 text-sm flex items-center transition-colors ${
                  viewMode === 'day' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FontAwesomeIcon icon={faList} className="mr-1" />
                Dia
              </button>
            </div>
            
            {/* Legenda */}
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <FontAwesomeIcon icon={faCircle} className="text-green-500 mr-1" />
                <span>Pago</span>
              </div>
              <div className="flex items-center">
                <FontAwesomeIcon icon={faCircle} className="text-yellow-500 mr-1" />
                <span>Pendente</span>
              </div>
              <div className="flex items-center">
                <FontAwesomeIcon icon={faCircle} className="text-red-500 mr-1" />
                <span>Vencido</span>
              </div>
            </div>
            
            {/* Navegação */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigatePeriod(-1)}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              
              <span className="font-medium text-gray-900 min-w-48 text-center">
                {viewMode === 'month' && `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
                {viewMode === 'week' && `Semana de ${currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
                {viewMode === 'day' && currentDate.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              
              <button
                onClick={() => navigatePeriod(1)}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo do Calendário */}
      {viewMode === 'month' && (
        <MonthView 
          days={generateCalendarDays()}
          currentDate={currentDate}
          today={today}
          billingsByDate={billingsByDate}
          weekDays={weekDays}
          getDateStatus={getDateStatus}
          getStatusStyles={getStatusStyles}
          formatCurrency={formatCurrency}
          onViewBilling={onViewBilling}
          onEditDueDate={onEditDueDate}
          onRecordPayment={onRecordPayment}
        />
      )}
      
      {viewMode === 'week' && (
        <WeekView 
          days={generateWeekDays()}
          currentDate={currentDate}
          today={today}
          billingsByDate={billingsByDate}
          weekDays={weekDays}
          getDateStatus={getDateStatus}
          formatCurrency={formatCurrency}
          onViewBilling={onViewBilling}
          onEditDueDate={onEditDueDate}
          onRecordPayment={onRecordPayment}
        />
      )}
      
      {viewMode === 'day' && (
        <DayView 
          date={currentDate}
          today={today}
          billingsByDate={billingsByDate}
          formatCurrency={formatCurrency}
          onViewBilling={onViewBilling}
          onEditDueDate={onEditDueDate}
          onRecordPayment={onRecordPayment}
        />
      )}

      {/* Resumo no rodapé */}
      <div className="bg-gray-50 border-t border-gray-200 p-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-600">Total de Cobranças</div>
            <div className="font-bold text-lg text-gray-900">{billings.length}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Pagas</div>
            <div className="font-bold text-lg text-green-600">
              {billings.filter(b => b.status === 'paid').length}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Pendentes</div>
            <div className="font-bold text-lg text-yellow-600">
              {billings.filter(b => b.status === 'pending').length}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Vencidas</div>
            <div className="font-bold text-lg text-red-600">
              {billings.filter(b => b.status === 'overdue').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente de Visualização Mensal
const MonthView = ({ days, currentDate, today, billingsByDate, weekDays, getDateStatus, getStatusStyles, formatCurrency, onViewBilling, onEditDueDate, onRecordPayment }) => {
  return (
    <div className="grid grid-cols-7 gap-0">
      {/* Cabeçalho dos dias da semana */}
      {weekDays.map(day => (
        <div key={day} className="bg-gray-100 p-3 text-center font-medium text-gray-700 border-b border-gray-200">
          {day}
        </div>
      ))}
      
      {/* Dias do mês */}
      {days.map((date, index) => {
        const dateString = date.toDateString();
        const billsForDay = billingsByDate[dateString] || [];
        const isToday = date.toDateString() === today.toDateString();
        const isCurrentMonth = date.getMonth() === currentDate.getMonth();
        const status = getDateStatus(date, billsForDay);
        
        return (
          <div
            key={index}
            className={getStatusStyles(status, isToday, isCurrentMonth)}
          >
            <div className="p-2">
              <div className={`text-sm font-medium ${
                isToday 
                  ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' 
                  : ''
              }`}>
                {date.getDate()}
              </div>
            </div>
            
            {billsForDay.length > 0 && (
              <div className="absolute inset-x-1 bottom-1 space-y-1 max-h-20 overflow-y-auto">
                {billsForDay.slice(0, 3).map((billing) => (
                  <BillingItem 
                    key={billing.id}
                    billing={billing}
                    formatCurrency={formatCurrency}
                    onViewBilling={onViewBilling}
                    onEditDueDate={onEditDueDate}
                    onRecordPayment={onRecordPayment}
                  />
                ))}
                {billsForDay.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{billsForDay.length - 3} mais
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Componente de Visualização Semanal
const WeekView = ({ days, today, billingsByDate, weekDays, formatCurrency, onViewBilling, onEditDueDate, onRecordPayment }) => {
  return (
    <div className="grid grid-cols-7 gap-4">
      {days.map((date, index) => {
        const dateString = date.toDateString();
        const billsForDay = billingsByDate[dateString] || [];
        const isToday = date.toDateString() === today.toDateString();
        
        return (
          <div key={index} className={`bg-white border rounded-lg p-4 min-h-64 ${
            isToday ? 'ring-2 ring-blue-500' : 'border-gray-200'
          }`}>
            <div className="text-center mb-3">
              <div className="text-sm font-medium text-gray-600">{weekDays[date.getDay()]}</div>
              <div className={`text-lg font-bold ${
                isToday 
                  ? 'bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto' 
                  : 'text-gray-900'
              }`}>
                {date.getDate()}
              </div>
            </div>
            
            <div className="space-y-2">
              {billsForDay.map((billing) => (
                <BillingItem 
                  key={billing.id}
                  billing={billing}
                  formatCurrency={formatCurrency}
                  onViewBilling={onViewBilling}
                  onEditDueDate={onEditDueDate}
                  onRecordPayment={onRecordPayment}
                  compact={false}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Componente de Visualização Diária
const DayView = ({ date, today, billingsByDate, formatCurrency, onViewBilling, onEditDueDate, onRecordPayment }) => {
  const dateString = date.toDateString();
  const billsForDay = billingsByDate[dateString] || [];
  const isToday = date.toDateString() === today.toDateString();
  
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className={`p-6 border-b border-gray-200 ${
        isToday ? 'bg-blue-50' : 'bg-gray-50'
      }`}>
        <h3 className="text-xl font-bold text-gray-900">
          {date.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {billsForDay.length} cobrança{billsForDay.length !== 1 ? 's' : ''} {billsForDay.length > 0 ? 'programada' + (billsForDay.length > 1 ? 's' : '') : 'programadas'}
        </p>
      </div>
      
      <div className="p-6">
        {billsForDay.length > 0 ? (
          <div className="space-y-4">
            {billsForDay.map((billing) => (
              <div key={billing.id} className={`p-4 rounded-lg border ${
                billing.status === 'paid' 
                  ? 'bg-green-50 border-green-200' 
                  : billing.status === 'overdue'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{billing.clinic_name}</h4>
                    <p className="text-lg font-bold text-gray-800">{formatCurrency(billing.amount)}</p>
                    <p className="text-sm text-gray-600">
                      Status: {billing.status === 'paid' ? 'Pago' : billing.status === 'overdue' ? 'Vencido' : 'Pendente'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onViewBilling && onViewBilling(billing)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-white rounded transition-colors"
                      title="Ver detalhes"
                    >
                      <FontAwesomeIcon icon={faEye} />
                    </button>
                    <button
                      onClick={() => onEditDueDate && onEditDueDate(billing)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-white rounded transition-colors"
                      title="Editar data de vencimento"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    {billing.status !== 'paid' && (
                      <button
                        onClick={() => onRecordPayment && onRecordPayment(billing)}
                        className="p-2 text-gray-600 hover:text-green-600 hover:bg-white rounded transition-colors"
                        title="Registrar pagamento"
                      >
                        <FontAwesomeIcon icon={faCreditCard} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FontAwesomeIcon icon={faCalendarAlt} className="text-4xl text-gray-400 mb-4" />
            <p className="text-gray-500">Nenhuma cobrança programada para este dia.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente reutilizável para itens de cobrança
const BillingItem = ({ billing, formatCurrency, onViewBilling, onEditDueDate, onRecordPayment, compact = true }) => {
  return (
    <div
      className={`${compact ? 'text-xs' : 'text-sm'} p-${compact ? '1' : '3'} rounded cursor-pointer group relative ${
        billing.status === 'paid' 
          ? 'bg-green-100 text-green-800' 
          : billing.status === 'overdue'
            ? 'bg-red-100 text-red-800'
            : 'bg-yellow-100 text-yellow-800'
      }`}
      onClick={() => onViewBilling && onViewBilling(billing)}
    >
      <div className="flex items-center justify-between">
        <span className={`truncate font-medium ${!compact ? 'text-base' : ''}`}>
          {billing.clinic_name}
        </span>
        <div className={`flex items-center space-x-1 ${compact ? 'opacity-0 group-hover:opacity-100' : ''} transition-opacity`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewBilling && onViewBilling(billing);
            }}
            className="text-gray-600 hover:text-blue-600"
            title="Ver detalhes"
          >
            <FontAwesomeIcon icon={faEye} className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditDueDate && onEditDueDate(billing);
            }}
            className="text-gray-600 hover:text-blue-600"
            title="Editar data de vencimento"
          >
            <FontAwesomeIcon icon={faEdit} className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
          </button>
          {billing.status !== 'paid' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRecordPayment && onRecordPayment(billing);
              }}
              className="text-gray-600 hover:text-green-600"
              title="Registrar pagamento"
            >
              <FontAwesomeIcon icon={faCreditCard} className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
            </button>
          )}
        </div>
      </div>
      <div className={`${compact ? 'text-xs' : 'text-sm'} opacity-75`}>
        {formatCurrency(billing.amount)}
      </div>
    </div>
  );
};

export default BillingCalendar;