// Se ejecuta antes de que la página se dibuje, para que no parpadee el tema equivocado.
// Es un archivo aparte (y no un script dentro del HTML) porque la política de seguridad
// de contenido (CSP) solo permite scripts del propio sitio.
(function () {
  try {
    var theme = localStorage.getItem('taskflow-theme');
    if (theme !== 'light' && theme !== 'dark') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.dataset.theme = theme;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#151311' : '#F3EEE3');
  } catch (e) {
    /* sin almacenamiento disponible: se queda el tema claro */
  }
})();
