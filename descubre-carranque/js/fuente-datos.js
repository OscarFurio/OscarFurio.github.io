/* ==========================================================
   DESCUBRE CARRANQUE · De dónde salen los datos
   - Si config.js tiene Supabase configurado → base de datos
   - Si no → js/datos.js
   Lo usan tanto la web pública como la zona de gestión.
   ========================================================== */
(function () {
  "use strict";
  var CFG = window.CONFIG;

  function supabaseActivo() {
    return !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  }

  // Fila de la base de datos → objeto "lugar" que usa la web
  function filaALugar(f) {
    return {
      id: f.id,
      publicado: f.publicado !== false,
      seccion: f.seccion,
      categoria: f.categoria,
      icono: f.icono || "",
      nombre: f.nombre || "",
      resumen: f.resumen || "",
      descripcion: f.descripcion || "",
      servicios: f.servicios || [],
      direccion: f.direccion || "",
      coordenadas: [Number(f.lat), Number(f.lng)],
      horario: f.horario || {},
      horarioNota: f.horario_nota || "",
      telefono: f.telefono || "",
      whatsapp: f.whatsapp || "",
      email: f.email || "",
      web: f.web || "",
      redes: f.redes || {},
      fotos: f.fotos || [],
      etiquetas: f.etiquetas || [],
      actualizado: f.actualizado || "",
      actualizadoPor: f.actualizado_por || ""
    };
  }

  // Objeto "lugar" → fila para guardar en la base de datos
  function lugarAFila(l) {
    return {
      id: l.id,
      publicado: l.publicado !== false,
      seccion: l.seccion,
      categoria: l.categoria,
      icono: l.icono || "",
      nombre: l.nombre,
      resumen: l.resumen || "",
      descripcion: l.descripcion || "",
      servicios: l.servicios || [],
      direccion: l.direccion || "",
      lat: l.coordenadas[0],
      lng: l.coordenadas[1],
      horario: l.horario || {},
      horario_nota: l.horarioNota || "",
      telefono: l.telefono || "",
      whatsapp: l.whatsapp || "",
      email: l.email || "",
      web: l.web || "",
      redes: l.redes || {},
      fotos: l.fotos || [],
      etiquetas: l.etiquetas || []
    };
  }

  // Carga para la web pública (solo lo publicado). Devuelve una promesa.
  function cargarLugares() {
    if (!supabaseActivo()) return Promise.resolve((window.LUGARES || []).slice());
    var url = CFG.supabaseUrl.replace(/\/+$/, "") + "/rest/v1/lugares?select=*&publicado=eq.true&order=nombre.asc";
    return fetch(url, {
      headers: { apikey: CFG.supabaseAnonKey, Authorization: "Bearer " + CFG.supabaseAnonKey }
    }).then(function (r) {
      if (!r.ok) throw new Error("Error " + r.status + " al cargar los datos");
      return r.json();
    }).then(function (filas) { return filas.map(filaALugar); });
  }

  window.FuenteDatos = {
    supabaseActivo: supabaseActivo,
    filaALugar: filaALugar,
    lugarAFila: lugarAFila,
    cargarLugares: cargarLugares
  };
})();
