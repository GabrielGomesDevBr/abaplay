import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCalendarAlt, 
  faTimesCircle, 
  faClock, 
  faCalendarWeek,
  faCalendarDay,
  faChartLine,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

const DateRangeSelector = ({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange, 
  onClear,
  showPresets = true,
  showInfo = true 
}) => {
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);

  // Calcula data padrão de 1 mês atrás
  const getDefaultDates = () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  };

  // Inicializa com padrão de 1 mês se não houver datas
  useEffect(() => {
    if (!startDate && !endDate) {
      const defaults = getDefaultDates();
      onStartDateChange(defaults.startDate);
      onEndDateChange(defaults.endDate);
    }
  }, [startDate, endDate, onStartDateChange, onEndDateChange]);

  const presets = [
    {
      label: '7 dias',
      icon: faCalendarWeek,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
      borderColor: 'border-blue-200',
      days: 7,
      description: 'Última semana'
    },
    {
      label: '1 mês',
      icon: faCalendarAlt,
      color: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100',
      borderColor: 'border-green-200',
      days: 30,
      description: 'Último mês (padrão)',
      isDefault: true
    },
    {
      label: '3 meses',
      icon: faChartLine,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 hover:bg-purple-100',
      borderColor: 'border-purple-200',
      days: 90,
      description: 'Últimos 3 meses'
    },
    {
      label: '6 meses',
      icon: faClock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 hover:bg-orange-100',
      borderColor: 'border-orange-200',
      days: 180,
      description: 'Últimos 6 meses'
    }
  ];

  const handlePresetClick = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    
    onStartDateChange(startStr);
    onEndDateChange(endStr);
  };

  const handleClear = () => {
    onStartDateChange('');
    onEndDateChange('');
    if (onClear) onClear();
  };

  const formatDateRange = () => {
    if (!startDate || !endDate) return '';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return `${diffDays} dia${diffDays !== 1 ? 's' : ''} selecionado${diffDays !== 1 ? 's' : ''}`;
  };

  const getCurrentPreset = () => {
    if (!startDate || !endDate) return null;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    
    // Verifica se o end date é hoje (ou próximo)
    const isEndToday = Math.abs(end - today) < 24 * 60 * 60 * 1000;
    
    if (isEndToday) {
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const preset = presets.find(p => Math.abs(p.days - diffDays) <= 1);
      return preset;
    }
    
    return null;
  };

  const currentPreset = getCurrentPreset();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Header com informações */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FontAwesomeIcon icon={faCalendarAlt} className="text-indigo-600" />
          <h3 className="text-sm font-medium text-gray-800">Período dos Gráficos</h3>
          {showInfo && (
            <div className="relative">
              <button
                onMouseEnter={() => setShowInfoTooltip(true)}
                onMouseLeave={() => setShowInfoTooltip(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FontAwesomeIcon icon={faInfoCircle} className="text-xs" />
              </button>
              {showInfoTooltip && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-10">
                  Selecione o período para visualizar os dados dos gráficos
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Status atual */}
        {(startDate || endDate) && (
          <div className="flex items-center space-x-2">
            {currentPreset && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${currentPreset.bgColor} ${currentPreset.color} border ${currentPreset.borderColor}`}>
                {currentPreset.label}
              </span>
            )}
            <span className="text-xs text-gray-500">
              {formatDateRange()}
            </span>
          </div>
        )}
      </div>

      {/* Presets rápidos */}
      {showPresets && (
        <div className="mb-4">
          <p className="text-xs text-gray-600 mb-2">Seleções rápidas:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {presets.map((preset, index) => (
              <button
                key={index}
                onClick={() => handlePresetClick(preset.days)}
                className={`
                  flex flex-col items-center p-3 rounded-lg border transition-all duration-200
                  ${currentPreset?.days === preset.days 
                    ? `${preset.bgColor} ${preset.borderColor} border-2` 
                    : `bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-gray-300`
                  }
                `}
                title={preset.description}
              >
                <FontAwesomeIcon 
                  icon={preset.icon} 
                  className={`text-lg mb-1 ${
                    currentPreset?.days === preset.days ? preset.color : 'text-gray-600'
                  }`} 
                />
                <span className={`text-xs font-medium ${
                  currentPreset?.days === preset.days ? preset.color : 'text-gray-700'
                }`}>
                  {preset.label}
                </span>
                {preset.isDefault && (
                  <span className="text-[10px] text-gray-500 mt-1">padrão</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Seleção personalizada */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-600 mb-3">Ou selecione um período personalizado:</p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">De:</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => onStartDateChange(e.target.value)} 
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Até:</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => onEndDateChange(e.target.value)} 
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {(startDate || endDate) && (
            <button 
              onClick={handleClear} 
              className="flex items-center space-x-1 px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
              title="Limpar filtros"
            >
              <FontAwesomeIcon icon={faTimesCircle} />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DateRangeSelector;