import React from 'react';
import ReactDOM from 'react-dom/client';

// 1. Importa o nosso novo ficheiro de estilos globais
import './index.css';

import App from './App';

// Cria a raiz da aplicação React na div com id 'root'
const root = ReactDOM.createRoot(document.getElementById('root'));

// Renderiza o componente principal da aplicação
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
