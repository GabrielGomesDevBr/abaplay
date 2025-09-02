import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBold, faItalic, faListUl, faListOl, 
  faUndo, faRedo, faEye, faEyeSlash
} from '@fortawesome/free-solid-svg-icons';

/**
 * Editor de texto elegante com formatação básica
 * Mantém design minimalista e funcionalidade essencial para relatórios clínicos
 */
const RichTextEditor = ({ 
  value, 
  onChange, 
  placeholder = "Digite sua análise...",
  rows = 6,
  disabled = false
}) => {
  const textareaRef = useRef(null);
  const [showPreview, setShowPreview] = useState(false);
  const [history, setHistory] = useState([value || '']);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Atualizar história quando valor muda externamente
  useEffect(() => {
    if (value !== history[historyIndex]) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(value || '');
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [value]);

  // Função para adicionar texto na posição do cursor
  const insertTextAtCursor = (textToInsert, wrapSelection = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    let newText;
    let newCursorPos;

    if (wrapSelection && selectedText) {
      // Envolver texto selecionado
      newText = value.substring(0, start) + textToInsert + selectedText + textToInsert + value.substring(end);
      newCursorPos = end + (textToInsert.length * 2);
    } else {
      // Inserir texto na posição do cursor
      newText = value.substring(0, start) + textToInsert + value.substring(end);
      newCursorPos = start + textToInsert.length;
    }

    onChange(newText);
    
    // Manter foco e posição do cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Função para adicionar lista
  const insertList = (type = 'bullet') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lines = value.split('\n');
    
    // Encontrar linha atual
    let currentLine = 0;
    let charCount = 0;
    for (let i = 0; i < lines.length; i++) {
      if (charCount + lines[i].length >= start) {
        currentLine = i;
        break;
      }
      charCount += lines[i].length + 1; // +1 para o \n
    }

    const line = lines[currentLine];
    const listPrefix = type === 'bullet' ? '• ' : '1. ';
    
    // Verificar se já é uma lista
    const isBulletList = line.trim().startsWith('• ');
    const isNumberedList = /^\d+\.\s/.test(line.trim());
    
    if (isBulletList || isNumberedList) {
      // Remover formatação de lista
      lines[currentLine] = line.replace(/^(\s*)(•\s|\d+\.\s)/, '$1');
    } else {
      // Adicionar formatação de lista
      const indent = line.match(/^\s*/)[0];
      lines[currentLine] = indent + listPrefix + line.trim();
    }

    const newText = lines.join('\n');
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
    }, 0);
  };

  // Funções de formatação
  const toggleBold = () => insertTextAtCursor('**', true);
  const toggleItalic = () => insertTextAtCursor('*', true);
  const addBulletList = () => insertList('bullet');
  const addNumberedList = () => insertList('numbered');

  // Função para desfazer/refazer
  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
    }
  };

  // Função para converter markdown básico para HTML para preview
  const convertToHTML = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^• (.*$)/gim, '<li>$1</li>')
      .replace(/^(\d+)\. (.*$)/gim, '<li>$1. $2</li>')
      .replace(/\n/g, '<br/>');
  };

  const toolbarButtons = [
    {
      icon: faBold,
      onClick: toggleBold,
      title: 'Negrito (Ctrl+B)',
      active: false
    },
    {
      icon: faItalic,
      onClick: toggleItalic,
      title: 'Itálico (Ctrl+I)',
      active: false
    },
    { divider: true },
    {
      icon: faListUl,
      onClick: addBulletList,
      title: 'Lista com marcadores',
      active: false
    },
    {
      icon: faListOl,
      onClick: addNumberedList,
      title: 'Lista numerada',
      active: false
    },
    { divider: true },
    {
      icon: faUndo,
      onClick: undo,
      title: 'Desfazer (Ctrl+Z)',
      disabled: historyIndex <= 0
    },
    {
      icon: faRedo,
      onClick: redo,
      title: 'Refazer (Ctrl+Y)',
      disabled: historyIndex >= history.length - 1
    },
    { divider: true },
    {
      icon: showPreview ? faEyeSlash : faEye,
      onClick: () => setShowPreview(!showPreview),
      title: showPreview ? 'Ocultar preview' : 'Mostrar preview',
      active: showPreview
    }
  ];

  // Keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          toggleBold();
          break;
        case 'i':
          e.preventDefault();
          toggleItalic();
          break;
        case 'z':
          if (!e.shiftKey) {
            e.preventDefault();
            undo();
          }
          break;
        case 'y':
          e.preventDefault();
          redo();
          break;
        default:
          break;
      }
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg shadow-sm overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-gray-50 px-3 py-2">
        <div className="flex items-center space-x-1">
          {toolbarButtons.map((button, index) => {
            if (button.divider) {
              return <div key={index} className="w-px h-4 bg-gray-300 mx-1" />;
            }

            return (
              <button
                key={index}
                onClick={button.onClick}
                disabled={disabled || button.disabled}
                title={button.title}
                className={`
                  p-1.5 rounded text-sm transition-all duration-200 hover:bg-gray-200
                  ${button.active ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-800'}
                  ${button.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <FontAwesomeIcon icon={button.icon} className="w-3 h-3" />
              </button>
            );
          })}
          
          <div className="ml-auto text-xs text-gray-500">
            {value.length} caracteres
          </div>
        </div>
      </div>

      {/* Editor/Preview */}
      <div className="relative">
        {showPreview ? (
          /* Preview */
          <div 
            className="p-3 min-h-[150px] max-h-64 overflow-y-auto bg-gray-50 border-2 border-dashed border-gray-200"
            style={{ minHeight: `${rows * 1.5}rem` }}
          >
            <div 
              className="text-sm text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: value ? convertToHTML(value) : '<span class="text-gray-400">Nada para mostrar</span>' 
              }} 
            />
          </div>
        ) : (
          /* Editor */
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
            className="w-full px-3 py-3 border-0 resize-none focus:outline-none focus:ring-0 text-sm leading-relaxed"
            style={{ minHeight: `${rows * 1.5}rem` }}
          />
        )}
      </div>

      {/* Footer info */}
      <div className="border-t border-gray-200 bg-gray-50 px-3 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>**texto** = <strong>negrito</strong></span>
            <span>*texto* = <em>itálico</em></span>
            <span>• = lista</span>
          </div>
          <div>
            {showPreview ? 'Modo Preview' : 'Modo Edição'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RichTextEditor;