/* ==========================================================
   DESCUBRE CARRANQUE · Lógica de la web
   (no es necesario tocar este archivo para añadir comercios)
   ========================================================== */
(function () {
  "use strict";

  var CFG = window.CONFIG;
  var CATS = {};
  window.CATEGORIAS.forEach(function (c) { CATS[c.id] = c; });
  var LUGARES = window.LUGARES.filter(function (l) { return l && l.id && l.coordenadas; });

  var DIAS = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];
  var NOMBRE_DIA = { lun: "Lunes", mar: "Martes", mie: "Miércoles", jue: "Jueves", vie: "Viernes", sab: "Sábado", dom: "Domingo" };
  var REDES = [
    ["instagram", "Instagram", "📸"], ["facebook", "Facebook", "👍"], ["tiktok", "TikTok", "🎵"],
    ["youtube", "YouTube", "▶️"], ["x", "X (Twitter)", "✖️"]
  ];
  var conRaton = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  var estado = { seccion: "todo", categoria: null, texto: "" };
  var marcadores = {};   // id -> L.Marker
  var elemLista = {};    // id -> botón de la lista
  var activo = null;

  /* ---------- Utilidades ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function normalizar(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }
  function cat(l) { return CATS[l.categoria] || { nombre: "", icono: "📍", color: "#b5562d" }; }
  function icono(l) { return l.icono || cat(l).icono; }
  function urlSegura(u) { return /^(https?:|mailto:|tel:)/i.test(u || "") ? u : ""; }

  /* ---------- Horarios ---------- */
  function aMin(hhmm) { var p = hhmm.split(":"); return (+p[0]) * 60 + (+p[1] || 0); }
  function tramos(txt) {
    return String(txt || "").split(",").map(function (t) { return t.trim(); }).filter(Boolean).map(function (t) {
      var p = t.split("-"); return { ini: aMin(p[0]), fin: aMin(p[1] || p[0]), txt: t };
    });
  }
  function bonito(hhmm) { return hhmm.replace(/^0(\d)/, "$1"); }
  function textoHorario(txt) {
    var t = tramos(txt);
    if (!t.length) return "Cerrado";
    if (t.length === 1 && t[0].ini === 0 && t[0].fin >= 1439) return "24 horas";
    return t.map(function (x) {
      var p = x.txt.split("-"); return bonito(p[0]) + " – " + bonito(p[1] || "");
    }).join(" y ");
  }
  function diaHoy(fecha) { return DIAS[(fecha.getDay() + 6) % 7]; }
  function abiertoAhora(l) {
    if (!l.horario) return null;
    var algo = DIAS.some(function (d) { return (l.horario[d] || "").trim(); });
    if (!algo) return null;
    var ahora = new Date();
    var min = ahora.getHours() * 60 + ahora.getMinutes();
    var hoy = diaHoy(ahora);
    var ayer = DIAS[(DIAS.indexOf(hoy) + 6) % 7];
    var abierto = tramos(l.horario[hoy]).some(function (t) {
      if (t.fin < t.ini) return min >= t.ini;              // cruza medianoche
      return min >= t.ini && min <= t.fin;
    }) || tramos(l.horario[ayer]).some(function (t) {
      return t.fin < t.ini && min <= t.fin;                 // viene de anoche
    });
    return abierto;
  }
  function badgeEstado(l) {
    var a = abiertoAhora(l);
    if (a === null) return "";
    return a ? '<span class="estado abierto">Abierto ahora</span>' : '<span class="estado cerrado">Cerrado ahora</span>';
  }

  /* ---------- Fotos ---------- */
  function fotosHTML(l, clase) {
    if (l.fotos && l.fotos.length) {
      return l.fotos.map(function (f, i) {
        return '<img src="' + esc(f) + '" alt="' + esc(l.nombre) + ' – foto ' + (i + 1) + '" loading="lazy">';
      }).join("");
    }
    return '<div class="placeholder-foto ' + (clase || "") + '" aria-hidden="true">' + icono(l) + "</div>";
  }

  /* ---------- Tarjeta (pop-up) ---------- */
  function tarjetaHTML(l) {
    var c = cat(l);
    var hoy = l.horario ? textoHorario(l.horario[diaHoy(new Date())]) : "";
    return '<div class="tarjeta" role="button" tabindex="0" data-abrir="' + esc(l.id) + '" style="--c:' + c.color + '">' +
      '<div class="tarjeta-foto">' + fotosHTML(l) + "</div>" +
      '<div class="tarjeta-cuerpo">' +
        '<div class="tarjeta-cat">' + esc(c.nombre) + (l.ejemplo ? ' <span class="etiqueta-ejemplo">Ejemplo</span>' : "") + "</div>" +
        '<h3 class="tarjeta-nombre">' + esc(l.nombre) + "</h3>" +
        (l.resumen ? '<p class="tarjeta-resumen">' + esc(l.resumen) + "</p>" : "") +
        (l.direccion ? '<p class="tarjeta-linea">📍 ' + esc(l.direccion) + "</p>" : "") +
        (hoy ? '<p class="tarjeta-linea">🕒 Hoy: ' + esc(hoy) + " " + badgeEstado(l) + "</p>" : "") +
        '<span class="tarjeta-mas">Ver ficha completa →</span>' +
      "</div></div>";
  }

  /* ---------- Mapa ---------- */
  var mapa = L.map("mapa", { zoomControl: true, tap: true }).setView(CFG.centroMapa, CFG.zoomInicial);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    maxZoom: 20, subdomains: "abcd",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(mapa);
  var capa = L.layerGroup().addTo(mapa);

  function crearMarcador(l, retraso) {
    var c = cat(l);
    var ic = L.divIcon({
      className: "marcador",
      html: '<div class="pin" style="--c:' + c.color + ';--d:' + retraso + 'ms"><span>' + icono(l) + "</span></div>",
      iconSize: [46, 46], iconAnchor: [4, 50], popupAnchor: [20, -46]
    });
    var m = L.marker(l.coordenadas, { icon: ic, title: l.nombre, alt: l.nombre, riseOnHover: true, keyboard: true });
    m.bindPopup(tarjetaHTML(l), { className: "tarjeta-popup", closeButton: !conRaton, autoPan: true, autoPanPadding: [16, 16], maxWidth: 300, minWidth: 280 });

    var temporizador = null;
    function cerrarPronto() { temporizador = setTimeout(function () { m.closePopup(); }, 350); }
    function mantener() { clearTimeout(temporizador); }

    if (conRaton) {
      // Ordenador: la tarjeta se abre solo con pasar el ratón por encima
      m.on("mouseover", function () { mantener(); m.openPopup(); });
      m.on("mouseout", cerrarPronto);
      m.on("click", function () { abrirFicha(l.id); });
    }
    m.on("popupopen", function (e) {
      marcarActivo(l.id);
      var el = e.popup.getElement();
      if (!el) return;
      el.onmouseenter = mantener;
      el.onmouseleave = conRaton ? cerrarPronto : null;
      var t = el.querySelector("[data-abrir]");
      if (t) {
        t.onclick = function () { abrirFicha(l.id); };
        t.onkeydown = function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); abrirFicha(l.id); } };
      }
    });
    m.on("popupclose", function () { if (activo === l.id) marcarActivo(null); });
    m.on("keypress", function (ev) { if (ev.originalEvent.key === "Enter") abrirFicha(l.id); });
    return m;
  }

  function marcarActivo(id) {
    if (activo && elemLista[activo]) elemLista[activo].classList.remove("activo");
    activo = id;
    if (id && elemLista[id]) elemLista[id].classList.add("activo");
  }

  /* ---------- Filtrado ---------- */
  function coincide(l) {
    if (estado.seccion !== "todo" && l.seccion !== estado.seccion) return false;
    if (estado.categoria && l.categoria !== estado.categoria) return false;
    if (estado.texto) {
      var c = cat(l);
      var bolsa = normalizar([l.nombre, l.resumen, l.descripcion, l.direccion, c.nombre, (l.etiquetas || []).join(" "), (l.servicios || []).join(" ")].join(" "));
      return normalizar(estado.texto).split(/\s+/).filter(Boolean).every(function (p) { return bolsa.indexOf(p) !== -1; });
    }
    return true;
  }

  function pintar(ajustarVista) {
    var visibles = LUGARES.filter(coincide).sort(function (a, b) { return a.nombre.localeCompare(b.nombre, "es"); });
    capa.clearLayers();
    marcadores = {};
    visibles.forEach(function (l, i) {
      var m = crearMarcador(l, Math.min(i * 45, 900));
      marcadores[l.id] = m;
      capa.addLayer(m);
    });

    // Lista
    var ul = document.getElementById("lista");
    ul.innerHTML = "";
    elemLista = {};
    visibles.forEach(function (l) {
      var c = cat(l);
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "item";
      b.style.setProperty("--c", c.color);
      b.innerHTML = '<span class="item-icono" aria-hidden="true">' + icono(l) + "</span>" +
        '<span class="item-texto"><span class="item-nombre">' + esc(l.nombre) + "</span>" +
        '<span class="item-detalle">' + esc(c.nombre) + (l.direccion ? " · " + esc(l.direccion) : "") + "</span></span>";
      b.addEventListener("click", function () { enfocar(l.id); });
      b.addEventListener("mouseenter", function () { if (conRaton && marcadores[l.id]) marcadores[l.id].openPopup(); });
      li.appendChild(b);
      ul.appendChild(li);
      elemLista[l.id] = b;
    });
    if (!visibles.length) {
      ul.innerHTML = '<li class="vacio">No hemos encontrado nada con esa búsqueda.<br>Prueba con otra palabra 🙂</li>';
    }
    document.getElementById("contador").textContent =
      visibles.length === 1 ? "1 lugar encontrado" : visibles.length + " lugares encontrados";

    if (ajustarVista && visibles.length) {
      var b2 = L.latLngBounds(visibles.map(function (l) { return l.coordenadas; }));
      mapa.flyToBounds(b2, { padding: [60, 60], maxZoom: 17, duration: .6 });
    }
  }

  function enfocar(id) {
    var m = marcadores[id];
    if (!m) return;
    mapa.flyTo(m.getLatLng(), Math.max(mapa.getZoom(), 17), { duration: .5 });
    mapa.once("moveend", function () { m.openPopup(); });
    if (window.innerWidth <= 860) document.getElementById("mapa").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- Pestañas y categorías ---------- */
  function pintarPestanas() {
    var nav = document.getElementById("pestanas");
    nav.innerHTML = "";
    CFG.secciones.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pestana";
      b.setAttribute("aria-pressed", s.id === estado.seccion ? "true" : "false");
      b.innerHTML = '<span aria-hidden="true">' + s.icono + "</span> " + esc(s.nombre);
      b.addEventListener("click", function () {
        estado.seccion = s.id; estado.categoria = null;
        pintarPestanas(); pintarChips(); pintar(true);
      });
      nav.appendChild(b);
    });
  }

  function pintarChips() {
    var cont = document.getElementById("chips");
    cont.innerHTML = "";
    if (!CFG.mostrarFiltrosCategoria || estado.seccion === "todo") return;
    var usadas = {};
    LUGARES.forEach(function (l) { if (l.seccion === estado.seccion) usadas[l.categoria] = true; });
    window.CATEGORIAS.filter(function (c) { return c.seccion === estado.seccion && usadas[c.id]; }).forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.style.setProperty("--c", c.color);
      b.setAttribute("aria-pressed", estado.categoria === c.id ? "true" : "false");
      b.innerHTML = '<span aria-hidden="true">' + c.icono + "</span> " + esc(c.nombre);
      b.addEventListener("click", function () {
        estado.categoria = estado.categoria === c.id ? null : c.id;
        pintarChips(); pintar(true);
      });
      cont.appendChild(b);
    });
  }

  /* ---------- Buscador ---------- */
  var input = document.getElementById("buscar");
  var borrar = document.getElementById("borrar-busqueda");
  var tBusqueda;
  input.addEventListener("input", function () {
    borrar.hidden = !input.value;
    clearTimeout(tBusqueda);
    tBusqueda = setTimeout(function () { estado.texto = input.value.trim(); pintar(true); }, 180);
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      var primero = LUGARES.filter(coincide)[0];
      if (primero) enfocar(primero.id);
      input.blur();
    }
  });
  borrar.addEventListener("click", function () {
    input.value = ""; borrar.hidden = true; estado.texto = ""; pintar(true); input.focus();
  });
  document.getElementById("btn-centrar").addEventListener("click", function () {
    mapa.closePopup(); pintar(true);
  });

  /* ---------- Ficha completa (landing) ---------- */
  var ficha = document.getElementById("ficha");
  var fondo = document.getElementById("ficha-fondo");
  var focoPrevio = null;

  function fichaHTML(l) {
    var c = cat(l);
    var hoy = diaHoy(new Date());
    var h = '<div class="ficha-barra">' +
      '<button type="button" class="btn" data-cerrar>← Volver al mapa</button>' +
      '<button type="button" class="btn" data-compartir aria-label="Compartir">🔗 Compartir</button></div>';
    h += '<div class="ficha-galeria" style="--c:' + c.color + '">' + fotosHTML(l) + "</div>";
    h += '<div class="ficha-cuerpo" style="--c:' + c.color + '">';
    h += '<div class="ficha-cat">' + icono(l) + " " + esc(c.nombre) + (l.ejemplo ? ' <span class="etiqueta-ejemplo">Datos de ejemplo</span>' : "") + "</div>";
    h += '<h2 id="ficha-nombre">' + esc(l.nombre) + "</h2>";
    if (l.resumen) h += '<p class="ficha-resumen">' + esc(l.resumen) + "</p>";
    h += badgeEstado(l);

    if (l.descripcion) {
      h += "<section><h3>Quiénes somos</h3>" + String(l.descripcion).split(/\n\s*\n/).map(function (p) {
        return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>";
      }).join("") + "</section>";
    }
    if (l.servicios && l.servicios.length) {
      h += '<section><h3>Qué ofrecemos</h3><ul class="servicios">' + l.servicios.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul></section>";
    }
    if (l.horario && DIAS.some(function (d) { return (l.horario[d] || "").trim(); })) {
      h += '<section><h3>🕒 Horario</h3><table class="horario"><tbody>' + DIAS.map(function (d) {
        return '<tr class="' + (d === hoy ? "hoy" : "") + '"><td>' + NOMBRE_DIA[d] + (d === hoy ? " (hoy)" : "") + "</td><td>" + esc(textoHorario(l.horario[d])) + "</td></tr>";
      }).join("") + "</tbody></table>" + (l.horarioNota ? '<p class="nota">' + esc(l.horarioNota) + "</p>" : "") + "</section>";
    }
    if (l.direccion) {
      var dest = l.coordenadas[0] + "," + l.coordenadas[1];
      h += "<section><h3>📍 Dónde estamos</h3><p>" + esc(l.direccion) + '</p><div class="acciones">' +
        '<button type="button" class="btn" data-ver-mapa>🗺️ Ver en el mapa</button>' +
        '<a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(dest) + '">🚶 Cómo llegar</a>' +
        "</div></section>";
    }
    var contacto = [];
    if (l.telefono) contacto.push('<a class="btn btn-primario" href="tel:' + esc(l.telefono.replace(/\s+/g, "")) + '">📞 Llamar · ' + esc(l.telefono) + "</a>");
    if (l.whatsapp) contacto.push('<a class="btn" target="_blank" rel="noopener" href="https://wa.me/34' + esc(String(l.whatsapp).replace(/\D/g, "").replace(/^34(?=\d{9}$)/, "")) + '">💬 WhatsApp</a>');
    if (l.email) contacto.push('<a class="btn" href="mailto:' + esc(l.email) + '">✉️ ' + esc(l.email) + "</a>");
    if (urlSegura(l.web)) contacto.push('<a class="btn" target="_blank" rel="noopener" href="' + esc(l.web) + '">🌐 Página web</a>');
    if (contacto.length) h += '<section><h3>Contacto</h3><div class="acciones">' + contacto.join("") + "</div></section>";

    var redes = REDES.filter(function (r) { return l.redes && urlSegura(l.redes[r[0]]); });
    if (redes.length) {
      h += '<section><h3>Síguenos en redes</h3><div class="redes">' + redes.map(function (r) {
        return '<a class="btn" target="_blank" rel="noopener" href="' + esc(l.redes[r[0]]) + '"><span aria-hidden="true">' + r[2] + "</span> " + r[1] + "</a>";
      }).join("") + "</div></section>";
    }
    h += "</div>";
    return h;
  }

  function abrirFicha(id) {
    if (location.hash !== "#lugar=" + id) { location.hash = "lugar=" + id; return; } // hashchange llama a mostrar
    mostrarFicha(id);
  }

  function mostrarFicha(id) {
    var l = LUGARES.filter(function (x) { return x.id === id; })[0];
    if (!l) return cerrarFicha(true);
    mapa.closePopup();
    if (ficha.hidden) focoPrevio = document.activeElement;
    ficha.innerHTML = fichaHTML(l);
    ficha.hidden = false; fondo.hidden = false;
    document.body.style.overflow = "hidden";
    ficha.scrollTop = 0;
    document.title = l.nombre + " · " + CFG.titulo;
    ficha.focus();

    ficha.querySelector("[data-cerrar]").onclick = function () { cerrarFicha(); };
    var vm = ficha.querySelector("[data-ver-mapa]");
    if (vm) vm.onclick = function () {
      cerrarFicha();
      if (!marcadores[id]) { estado = { seccion: "todo", categoria: null, texto: "" }; input.value = ""; borrar.hidden = true; pintarPestanas(); pintarChips(); pintar(false); }
      setTimeout(function () { enfocar(id); }, 50);
    };
    ficha.querySelector("[data-compartir]").onclick = function () {
      var url = location.href;
      if (navigator.share) { navigator.share({ title: l.nombre, url: url }).catch(function () {}); }
      else if (navigator.clipboard) { navigator.clipboard.writeText(url).then(function () { alert("Enlace copiado"); }); }
      else { prompt("Copia este enlace:", url); }
    };
  }

  function cerrarFicha(soloOcultar) {
    if (!soloOcultar && location.hash) {
      history.pushState("", document.title, location.pathname + location.search);
    }
    ficha.hidden = true; fondo.hidden = true; ficha.innerHTML = "";
    document.body.style.overflow = "";
    document.title = CFG.titulo;
    if (focoPrevio && focoPrevio.focus) focoPrevio.focus();
  }

  function leerHash() {
    var m = location.hash.match(/^#lugar=(.+)$/);
    if (m) mostrarFicha(decodeURIComponent(m[1])); else if (!ficha.hidden) cerrarFicha(true);
  }
  window.addEventListener("hashchange", leerHash);
  window.addEventListener("popstate", leerHash);
  fondo.addEventListener("click", function () { cerrarFicha(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !ficha.hidden) cerrarFicha(); });

  /* ---------- Arranque ---------- */
  document.getElementById("titulo-texto").textContent = CFG.titulo;
  document.getElementById("subtitulo-texto").textContent = CFG.subtitulo;
  document.getElementById("aviso-ejemplo").hidden = !LUGARES.some(function (l) { return l.ejemplo; });
  pintarPestanas();
  pintarChips();
  pintar(false);
  leerHash();
})();
