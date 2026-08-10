// Limpeza de Service Worker (versão antiga)
// SEGURANÇA: arquivo externo (e não inline) para permitir CSP sem 'unsafe-inline'
var SWV = '3';
if (localStorage.getItem('swv') !== SWV) {
  localStorage.setItem('swv', SWV);
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(r) {
      r.forEach(function(reg) { reg.unregister(); });
    });
  }
  if ('caches' in window) {
    caches.keys().then(function(n) {
      n.forEach(function(name) { caches.delete(name); });
    });
  }
  setTimeout(function() { window.location.reload(); }, 300);
}
