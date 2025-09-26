/**
 * Script para limpeza de cache relacionado aos prompt levels
 * Execute no console do navegador se houver problemas persistentes
 */

console.log('🧹 Iniciando limpeza de cache ABAplay...');

// 1. Limpar localStorage específico
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.includes('promptLevel') || key.includes('prompt_level'))) {
    keysToRemove.push(key);
  }
}

keysToRemove.forEach(key => {
  localStorage.removeItem(key);
  console.log(`❌ Removido do localStorage: ${key}`);
});

// 2. Limpar sessionStorage
sessionStorage.clear();
console.log('❌ sessionStorage limpo');

// 3. Limpar indexedDB relacionado
if ('indexedDB' in window) {
  try {
    // Tentar deletar possíveis bancos de dados do cache
    const dbNames = ['abaplay-cache', 'prompt-levels-cache', 'abaplay-prompt-cache'];
    dbNames.forEach(dbName => {
      const deleteReq = indexedDB.deleteDatabase(dbName);
      deleteReq.onsuccess = () => console.log(`❌ IndexedDB '${dbName}' removido`);
      deleteReq.onerror = () => console.log(`⚠️  IndexedDB '${dbName}' não encontrado ou já removido`);
    });
  } catch (error) {
    console.log('⚠️  Erro ao limpar IndexedDB:', error);
  }
}

// 4. Limpar cache do service worker se existir
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
      console.log('❌ Service Worker desregistrado');
    });
  });
}

// 5. Forçar reload para garantir limpeza
console.log('🔄 Forçando reload da página...');
setTimeout(() => {
  window.location.reload(true);
}, 1000);

console.log('✅ Limpeza de cache concluída! A página será recarregada.');