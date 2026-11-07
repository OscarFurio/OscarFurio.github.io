/* ==========================================================
   DESCUBRE CARRANQUE · Configuración general
   ----------------------------------------------------------
   Este es el único archivo de "ajustes". Los datos de cada
   comercio / asociación están en js/datos.js
   ========================================================== */

window.CONFIG = {
  // Título que aparece arriba del todo
  titulo: "Descubre Carranque",
  subtitulo: "Comercios, asociaciones y cultura de Carranque (Toledo)",

  // Dirección pública de la web. Es la que se codifica en el QR.
  // ¡Una vez impreso el QR, esta dirección NO debe cambiar!
  urlPublica: "https://oscarfurio.github.io/descubre-carranque/",

  // Centro y zoom inicial del mapa (centro urbano de Carranque)
  centroMapa: [40.1695, -3.9010],
  zoomInicial: 16,

  // ¿Mostrar al público los filtros por categoría (Belleza, Alimentación…)?
  //   true  → aparecen botones de categoría debajo de las pestañas
  //   false → solo pestañas (Comercios / Asociaciones / Cultura) + buscador.
  //           Evita mostrar "competencia directa" entre comercios del mismo tipo.
  mostrarFiltrosCategoria: true,

  // Secciones (pestañas) principales
  secciones: [
    { id: "todo",         nombre: "Todo",          icono: "🧭" },
    { id: "comercios",    nombre: "Comercios",     icono: "🛍️" },
    { id: "asociaciones", nombre: "Asociaciones",  icono: "🤝" },
    { id: "cultura",      nombre: "Cultura y servicios", icono: "🏛️" }
  ]
};
