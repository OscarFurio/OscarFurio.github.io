/* ==========================================================
   DESCUBRE CARRANQUE · Zona de gestión
   Inicio de sesión, lista de lugares y formulario de ficha.
   ========================================================== */
(function () {
  "use strict";

  var CFG = window.CONFIG;
  var FD = window.FuenteDatos;
  var CATS = window.CATEGORIAS;
  var DIAS = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];
  var NOMBRE_DIA = { lun: "Lunes", mar: "Martes", mie: "Miércoles", jue: "Jueves", vie: "Viernes", sab: "Sábado", dom: "Domingo" };
  var REDES = ["instagram", "facebook", "tiktok", "youtube", "x"];
  var MAX_FOTOS = 6;
  var BUCKET = "fotos";

  var $ = function (id) { return document.getElementById(id); };
  var form = $("vista-form");
  var sb = null;          // cliente de Supabase
  var lugares = [];       // todos (publicados y borradores)
  var editando = null;    // lugar original que se edita (null = nuevo)
  var fotos = [];         // URLs de fotos en el formulario
  var fotosSubidasAhora = [];  // subidas en esta edición (se borran si se cancela)
  var coords = null;      // [lat, lng]
  var cambiosSinGuardar = false;
  var mapaForm = null, chincheta = null;

  /* ---------- Utilidades ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function normalizar(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function slug(s) { return normalizar(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "lugar"; }
  function cat(id) { return CATS.filter(function (c) { return c.id === id; })[0] || { nombre: id, icono: "📍", color: "#8a6546" }; }
  function avisar(txt, ms) {
    var a = $("g-aviso");
    a.textContent = txt; a.hidden = false;
    clearTimeout(avisar.t);
    avisar.t = setTimeout(function () { a.hidden = true; }, ms || 3500);
  }
  function mostrar(vista) {
    ["vista-sin-config", "vista-login", "vista-sin-permiso", "vista-lista", "vista-form"].forEach(function (v) {
      $(v).hidden = v !== vista;
    });
    window.scrollTo(0, 0);
  }
  function traducirError(err) {
    var m = (err && (err.message || err.error_description || err.msg)) || String(err);
    if (/Invalid login credentials/i.test(m)) return "Email o contraseña incorrectos.";
    if (/Email not confirmed/i.test(m)) return "Este email aún no está confirmado. Revisa tu correo.";
    if (/row-level security|permission denied|violates row-level/i.test(m)) return "No tienes permiso para hacer esto.";
    if (/duplicate key/i.test(m)) return "Ya existe un lugar con ese identificador.";
    if (/Payload too large|exceeded the maximum/i.test(m)) return "La foto es demasiado grande.";
    if (/Failed to fetch|NetworkError|network/i.test(m)) return "No hay conexión. Comprueba tu internet e inténtalo de nuevo.";
    if (/Password should be/i.test(m)) return "La contraseña debe tener al menos 6 caracteres.";
    return m;
  }

  /* ---------- Arranque y sesión ---------- */
  if (!FD.supabaseActivo()) { mostrar("vista-sin-config"); return; }
  sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);

  sb.auth.getSession().then(function (r) {
    if (r.data && r.data.session) entrar(r.data.session); else mostrar("vista-login");
  });

  $("form-login").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = $("login-email").value.trim(), clave = $("login-clave").value;
    var err = $("login-error");
    err.hidden = true;
    if (!email || !clave) { err.textContent = "Escribe tu email y tu contraseña."; err.hidden = false; return; }
    $("login-boton").disabled = true;
    sb.auth.signInWithPassword({ email: email, password: clave }).then(function (r) {
      $("login-boton").disabled = false;
      if (r.error) { err.textContent = traducirError(r.error); err.hidden = false; return; }
      $("login-clave").value = "";
      entrar(r.data.session);
    });
  });

  $("btn-salir").addEventListener("click", function () {
    if (cambiosSinGuardar && !confirm("Tienes cambios sin guardar. ¿Salir de todas formas?")) return;
    sb.auth.signOut().then(function () { location.reload(); });
  });

  $("btn-clave").addEventListener("click", function () {
    var nueva = prompt("Escribe la nueva contraseña (mínimo 8 caracteres):");
    if (nueva == null) return;
    if (nueva.length < 8) { alert("La contraseña debe tener al menos 8 caracteres."); return; }
    var repetir = prompt("Repite la nueva contraseña:");
    if (repetir !== nueva) { alert("Las contraseñas no coinciden."); return; }
    sb.auth.updateUser({ password: nueva }).then(function (r) {
      if (r.error) alert(traducirError(r.error)); else avisar("Contraseña cambiada ✔");
    });
  });

  function entrar(sesion) {
    $("g-email").textContent = sesion.user.email;
    $("g-usuario").hidden = false;
    sb.rpc("es_gestor").then(function (r) {
      if (r.error || r.data !== true) { mostrar("vista-sin-permiso"); return; }
      cargarLista();
    });
  }

  /* ---------- Lista ---------- */
  CFG.secciones.filter(function (s) { return s.id !== "todo"; }).forEach(function (s) {
    var o = document.createElement("option"); o.value = s.id; o.textContent = s.nombre;
    $("lista-seccion").appendChild(o);
  });
  $("lista-buscar").addEventListener("input", pintarLista);
  $("lista-seccion").addEventListener("change", pintarLista);
  $("btn-nuevo").addEventListener("click", function () { abrirFormulario(null); });

  function cargarLista() {
    mostrar("vista-lista");
    $("lista-contador").textContent = "Cargando…";
    sb.from("lugares").select("*").order("nombre").then(function (r) {
      if (r.error) { $("lista-contador").textContent = "Error: " + traducirError(r.error); return; }
      lugares = r.data.map(FD.filaALugar);
      pintarLista();
    });
  }

  function pintarLista() {
    var q = normalizar($("lista-buscar").value.trim());
    var sec = $("lista-seccion").value;
    var vis = lugares.filter(function (l) {
      return (!sec || l.seccion === sec) && (!q || normalizar(l.nombre + " " + l.direccion).indexOf(q) !== -1);
    });
    var ul = $("g-lista");
    ul.innerHTML = "";
    $("lista-contador").textContent = lugares.length
      ? vis.length + " de " + lugares.length + " lugares"
      : "Todavía no hay ningún lugar. Pulsa «Añadir lugar» para crear el primero.";
    vis.forEach(function (l) {
      var c = cat(l.categoria);
      var li = document.createElement("li");
      li.className = "g-item";
      li.style.setProperty("--c", c.color);
      var fecha = l.actualizado ? new Date(l.actualizado).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "";
      li.innerHTML =
        '<div class="g-item-foto">' + (l.fotos[0] ? '<img src="' + esc(l.fotos[0]) + '" alt="" loading="lazy">' : (l.icono || c.icono)) + "</div>" +
        '<div class="g-item-texto"><div class="g-item-nombre">' + esc(l.nombre) +
          (l.publicado ? "" : ' <span class="insignia borrador">Borrador</span>') + "</div>" +
          '<div class="g-item-detalle">' + esc(c.nombre) + (fecha ? " · Modificado el " + fecha : "") + (l.actualizadoPor ? " por " + esc(l.actualizadoPor) : "") + "</div></div>" +
        '<div class="g-item-acciones">' +
          (l.publicado ? '<a class="btn btn-peq" target="_blank" rel="noopener" href="../#lugar=' + encodeURIComponent(l.id) + '">👁️ Ver</a>' : "") +
          '<button type="button" class="btn btn-peq btn-primario">✏️ Editar</button></div>';
      li.querySelector("button").addEventListener("click", function () { abrirFormulario(l); });
      ul.appendChild(li);
    });
  }

  /* ---------- Formulario: selects y sugerencias ---------- */
  var selSeccion = form.elements.seccion, selCategoria = form.elements.categoria;
  CFG.secciones.filter(function (s) { return s.id !== "todo"; }).forEach(function (s) {
    var o = document.createElement("option"); o.value = s.id; o.textContent = s.icono + " " + s.nombre;
    selSeccion.appendChild(o);
  });
  function rellenarCategorias(seleccion) {
    selCategoria.innerHTML = "";
    CATS.filter(function (c) { return c.seccion === selSeccion.value; }).forEach(function (c) {
      var o = document.createElement("option"); o.value = c.id; o.textContent = c.icono + " " + c.nombre;
      selCategoria.appendChild(o);
    });
    if (seleccion) selCategoria.value = seleccion;
  }
  selSeccion.addEventListener("change", function () { rellenarCategorias(); });

  ["🥖", "🎂", "☕", "🍕", "🍺", "🌸", "👗", "👟", "📚", "🐾", "🔑", "🏋️", "🦷", "👓", "🧺", "🎨"].forEach(function (e) {
    var b = document.createElement("button");
    b.type = "button"; b.textContent = e; b.setAttribute("aria-label", "Usar icono " + e);
    b.addEventListener("click", function () { form.elements.icono.value = e; cambiosSinGuardar = true; });
    $("icono-sugerencias").appendChild(b);
  });

  var resumen = form.elements.resumen;
  function contarResumen() {
    form.querySelector('[data-para="resumen"]').textContent = resumen.value.length + " / 120";
  }
  resumen.addEventListener("input", contarResumen);
  form.addEventListener("input", function (e) {
    cambiosSinGuardar = true;
    if (e.target.classList) e.target.classList.remove("invalido");
  });
  form.addEventListener("change", function (e) { if (e.target.classList) e.target.classList.remove("invalido"); });

  /* ---------- Horario ---------- */
  function pintarHorario(h) {
    var cont = $("horario-form");
    cont.innerHTML = "";
    DIAS.forEach(function (d) {
      var tr = String((h && h[d]) || "").split(",").map(function (t) { return t.trim(); }).filter(Boolean)
        .map(function (t) { var p = t.split("-"); return [p[0] || "", p[1] || ""]; });
      var abierto = tr.length > 0;
      var div = document.createElement("div");
      div.className = "dia" + (abierto ? "" : " cerrado");
      div.dataset.dia = d;
      div.innerHTML =
        '<label class="check"><input type="checkbox" class="dia-abierto"' + (abierto ? " checked" : "") + "><span>" + NOMBRE_DIA[d] + "</span></label>" +
        '<div class="tramos">' +
          '<span class="tramo">Mañana <input type="time" class="t1a" value="' + esc((tr[0] || [])[0] || "") + '"> a <input type="time" class="t1b" value="' + esc((tr[0] || [])[1] || "") + '"></span>' +
          '<span class="tramo">Tarde <input type="time" class="t2a" value="' + esc((tr[1] || [])[0] || "") + '"> a <input type="time" class="t2b" value="' + esc((tr[1] || [])[1] || "") + '"></span>' +
        "</div>";
      div.querySelector(".dia-abierto").addEventListener("change", function (e) {
        div.classList.toggle("cerrado", !e.target.checked);
      });
      cont.appendChild(div);
    });
  }
  function leerHorario() {
    var h = {}, errores = [];
    DIAS.forEach(function (d) {
      var div = $("horario-form").querySelector('[data-dia="' + d + '"]');
      if (!div.querySelector(".dia-abierto").checked) { h[d] = ""; return; }
      var tramos = [];
      [["t1a", "t1b"], ["t2a", "t2b"]].forEach(function (p) {
        var a = div.querySelector("." + p[0]).value, b = div.querySelector("." + p[1]).value;
        if (a && b) tramos.push(a + "-" + b);
        else if (a || b) errores.push(NOMBRE_DIA[d] + ": falta la hora de apertura o de cierre.");
      });
      if (!tramos.length) errores.push(NOMBRE_DIA[d] + " está marcado como abierto pero no tiene horas.");
      h[d] = tramos.join(",");
    });
    return { horario: h, errores: errores };
  }
  $("btn-copiar-lunes").addEventListener("click", function () {
    var cont = $("horario-form");
    var lun = cont.querySelector('[data-dia="lun"]');
    ["mar", "mie", "jue", "vie"].forEach(function (d) {
      var div = cont.querySelector('[data-dia="' + d + '"]');
      var ab = lun.querySelector(".dia-abierto").checked;
      div.querySelector(".dia-abierto").checked = ab;
      div.classList.toggle("cerrado", !ab);
      ["t1a", "t1b", "t2a", "t2b"].forEach(function (c) { div.querySelector("." + c).value = lun.querySelector("." + c).value; });
    });
    cambiosSinGuardar = true;
    avisar("Horario del lunes copiado de martes a viernes");
  });
  $("btn-24h").addEventListener("click", function () {
    var h = {}; DIAS.forEach(function (d) { h[d] = "00:00-23:59"; });
    pintarHorario(h); cambiosSinGuardar = true;
  });

  /* ---------- Fotos ---------- */
  function pintarFotos() {
    var cont = $("fotos");
    cont.innerHTML = "";
    fotos.forEach(function (url, i) {
      var div = document.createElement("div");
      div.className = "foto" + (i === 0 ? " foto-principal" : "");
      div.innerHTML = '<img src="' + esc(url) + '" alt="Foto ' + (i + 1) + '">' +
        (i === 0 ? '<span class="etiqueta-principal">Principal</span>' : "") +
        '<div class="foto-acciones">' +
          '<button type="button" data-f="izq" aria-label="Mover a la izquierda"' + (i === 0 ? " disabled" : "") + ">◀</button>" +
          '<button type="button" data-f="borrar" aria-label="Quitar foto">✕</button>' +
          '<button type="button" data-f="der" aria-label="Mover a la derecha"' + (i === fotos.length - 1 ? " disabled" : "") + ">▶</button>" +
        "</div>";
      div.querySelector('[data-f="izq"]').onclick = function () { mover(i, -1); };
      div.querySelector('[data-f="der"]').onclick = function () { mover(i, 1); };
      div.querySelector('[data-f="borrar"]').onclick = function () {
        if (!confirm("¿Quitar esta foto?")) return;
        fotos.splice(i, 1); cambiosSinGuardar = true; pintarFotos();
      };
      cont.appendChild(div);
    });
    $("btn-subir").hidden = fotos.length >= MAX_FOTOS;
  }
  function mover(i, d) {
    var j = i + d; if (j < 0 || j >= fotos.length) return;
    var t = fotos[i]; fotos[i] = fotos[j]; fotos[j] = t;
    cambiosSinGuardar = true; pintarFotos();
  }

  // Reduce la foto a 1600 px como máximo y la convierte a JPEG
  function reducir(archivo) {
    return new Promise(function (ok, ko) {
      var img = new Image();
      var url = URL.createObjectURL(archivo);
      img.onload = function () {
        var max = 1600, w = img.naturalWidth, h = img.naturalHeight;
        var k = Math.min(1, max / Math.max(w, h));
        var cv = document.createElement("canvas");
        cv.width = Math.round(w * k); cv.height = Math.round(h * k);
        var cx = cv.getContext("2d");
        cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height);
        cx.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        cv.toBlob(function (b) { b ? ok(b) : ko(new Error("No se pudo procesar la imagen")); }, "image/jpeg", 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); ko(new Error("Formato de imagen no válido")); };
      img.src = url;
    });
  }

  $("input-fotos").addEventListener("change", function (e) {
    var archivos = Array.prototype.slice.call(e.target.files || []);
    e.target.value = "";
    var hueco = MAX_FOTOS - fotos.length;
    if (archivos.length > hueco) { avisar("Solo se pueden añadir " + hueco + " fotos más"); archivos = archivos.slice(0, hueco); }
    var estado = $("fotos-estado");
    var hechas = 0;
    $("btn-guardar").disabled = true;
    archivos.reduce(function (p, archivo) {
      return p.then(function () {
        estado.textContent = "Subiendo foto " + (hechas + 1) + " de " + archivos.length + "…";
        return reducir(archivo).then(function (blob) {
          var ruta = "lugares/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ".jpg";
          return sb.storage.from(BUCKET).upload(ruta, blob, { contentType: "image/jpeg", cacheControl: "31536000" }).then(function (r) {
            if (r.error) throw r.error;
            var pub = sb.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl;
            fotos.push(pub); fotosSubidasAhora.push(pub); hechas++;
            cambiosSinGuardar = true;
            pintarFotos();
          });
        });
      });
    }, Promise.resolve()).then(function () {
      estado.textContent = hechas ? "✔ " + (hechas === 1 ? "Foto añadida" : hechas + " fotos añadidas") + ". Recuerda pulsar «Guardar»." : "";
    }).catch(function (err) {
      estado.textContent = "⚠️ " + traducirError(err);
    }).then(function () { $("btn-guardar").disabled = false; });
  });

  function rutaDeUrl(url) {
    var marca = "/storage/v1/object/public/" + BUCKET + "/";
    var i = String(url).indexOf(marca);
    return i === -1 ? null : decodeURIComponent(url.slice(i + marca.length));
  }
  function borrarFotos(urls) {
    var rutas = urls.map(rutaDeUrl).filter(Boolean);
    if (!rutas.length) return Promise.resolve();
    return sb.storage.from(BUCKET).remove(rutas).catch(function () {});
  }

  /* ---------- Ubicación ---------- */
  function ponerCoords(c, centrar) {
    coords = [Math.round(c[0] * 1e6) / 1e6, Math.round(c[1] * 1e6) / 1e6];
    $("coords-texto").textContent = "📍 Punto marcado: " + coords[0] + ", " + coords[1];
    if (!mapaForm) return;
    if (!chincheta) {
      chincheta = new maplibregl.Marker({ color: "#8a6546", draggable: true }).setLngLat([coords[1], coords[0]]).addTo(mapaForm);
      chincheta.on("dragend", function () { var p = chincheta.getLngLat(); ponerCoords([p.lat, p.lng]); cambiosSinGuardar = true; });
    } else {
      chincheta.setLngLat([coords[1], coords[0]]);
    }
    if (centrar) mapaForm.flyTo({ center: [coords[1], coords[0]], zoom: Math.max(mapaForm.getZoom(), 17) });
  }
  function iniciarMapaForm() {
    if (mapaForm) { mapaForm.resize(); return; }
    mapaForm = new maplibregl.Map({
      container: "mapa-form", style: window.ESTILO_MAPA,
      center: [CFG.centroMapa[1], CFG.centroMapa[0]], zoom: CFG.zoomInicial - 1,
      dragRotate: false, pitchWithRotate: false, attributionControl: { compact: true }
    });
    mapaForm.touchZoomRotate.disableRotation();
    mapaForm.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
    mapaForm.on("click", function (e) { ponerCoords([e.lngLat.lat, e.lngLat.lng]); cambiosSinGuardar = true; });
  }
  $("coords-pegar").addEventListener("change", function (e) {
    var m = e.target.value.match(/(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)/);
    if (!m) { avisar("No reconozco esas coordenadas. Deben ser como: 40.1701, -3.9022"); return; }
    var lat = parseFloat(m[1].replace(",", ".")), lng = parseFloat(m[2].replace(",", "."));
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) { avisar("Coordenadas fuera de rango"); return; }
    ponerCoords([lat, lng], true); cambiosSinGuardar = true; e.target.value = "";
  });
  $("btn-geocodificar").addEventListener("click", function () {
    var dir = form.elements.direccion.value.trim();
    if (!dir) { avisar("Escribe primero la dirección"); return; }
    var q = /carranque/i.test(dir) ? dir : dir + ", Carranque";
    var url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=es&accept-language=es&q=" + encodeURIComponent(q + ", Toledo");
    var b = $("btn-geocodificar"); b.disabled = true;
    fetch(url).then(function (r) { return r.json(); }).then(function (res) {
      if (!res.length) { avisar("No he encontrado esa dirección. Marca el punto tocando en el mapa."); return; }
      ponerCoords([parseFloat(res[0].lat), parseFloat(res[0].lon)], true);
      cambiosSinGuardar = true;
      avisar("Comprueba que el punto está bien colocado; si no, toca el sitio exacto en el mapa", 5000);
    }).catch(function () { avisar("No se pudo buscar la dirección. Marca el punto tocando en el mapa."); })
      .then(function () { b.disabled = false; });
  });

  /* ---------- Abrir / rellenar formulario ---------- */
  function abrirFormulario(l) {
    editando = l;
    fotosSubidasAhora = [];
    var v = l || { seccion: "comercios", categoria: "", publicado: true, horario: {}, redes: {}, fotos: [], servicios: [], etiquetas: [] };
    $("form-titulo").textContent = l ? "Editar: " + l.nombre : "Nuevo lugar";
    $("btn-eliminar").hidden = !l;
    $("form-error").hidden = true;
    var el = form.elements;
    el.nombre.value = v.nombre || "";
    el.seccion.value = v.seccion || "comercios";
    rellenarCategorias(v.categoria);
    el.icono.value = v.icono || "";
    el.publicado.checked = v.publicado !== false;
    el.resumen.value = v.resumen || "";
    el.descripcion.value = v.descripcion || "";
    el.servicios.value = (v.servicios || []).join("\n");
    el.etiquetas.value = (v.etiquetas || []).join(", ");
    el.direccion.value = v.direccion || "";
    el.horarioNota.value = v.horarioNota || "";
    el.telefono.value = v.telefono || "";
    el.whatsapp.value = v.whatsapp || "";
    el.email.value = v.email || "";
    el.web.value = v.web || "";
    REDES.forEach(function (r) { el["red-" + r].value = (v.redes || {})[r] || ""; });
    fotos = (v.fotos || []).slice();
    pintarFotos();
    $("fotos-estado").textContent = "";
    pintarHorario(v.horario);
    contarResumen();
    Array.prototype.forEach.call(form.querySelectorAll(".invalido"), function (x) { x.classList.remove("invalido"); });

    mostrar("vista-form");
    iniciarMapaForm();
    coords = null;
    $("coords-texto").textContent = "Aún no se ha marcado el punto en el mapa.";
    if (chincheta) { chincheta.remove(); chincheta = null; }
    if (v.coordenadas && isFinite(v.coordenadas[0])) {
      ponerCoords(v.coordenadas);
      mapaForm.jumpTo({ center: [v.coordenadas[1], v.coordenadas[0]], zoom: 17 });
    } else {
      mapaForm.jumpTo({ center: [CFG.centroMapa[1], CFG.centroMapa[0]], zoom: CFG.zoomInicial - 1 });
    }
    cambiosSinGuardar = false;
  }

  function volverALista() {
    if (cambiosSinGuardar && !confirm("Tienes cambios sin guardar. ¿Salir sin guardar?")) return;
    if (fotosSubidasAhora.length) borrarFotos(fotosSubidasAhora);  // limpiar fotos que no se llegaron a guardar
    fotosSubidasAhora = [];
    cambiosSinGuardar = false;
    mostrar("vista-lista");
  }
  Array.prototype.forEach.call(form.querySelectorAll('[data-accion="volver"]'), function (b) { b.addEventListener("click", volverALista); });
  window.addEventListener("beforeunload", function (e) { if (cambiosSinGuardar) { e.preventDefault(); e.returnValue = ""; } });

  /* ---------- Guardar ---------- */
  function lista(txt, sep) { return String(txt || "").split(sep).map(function (s) { return s.trim(); }).filter(Boolean); }
  function urlOk(u) { return !u || /^https?:\/\/\S+\.\S+/i.test(u); }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var el = form.elements, errores = [];
    Array.prototype.forEach.call(form.querySelectorAll(".invalido"), function (x) { x.classList.remove("invalido"); });
    function falta(campo, msg) { errores.push(msg); if (campo) campo.classList.add("invalido"); }

    if (!el.nombre.value.trim()) falta(el.nombre, "Falta el nombre.");
    if (!el.categoria.value) falta(el.categoria, "Elige una categoría.");
    if (!el.resumen.value.trim()) falta(el.resumen, "Falta la frase corta de presentación.");
    if (!el.direccion.value.trim()) falta(el.direccion, "Falta la dirección.");
    if (!coords) falta(null, "Marca en el mapa dónde está el local.");
    if (el.email.value.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.email.value.trim())) falta(el.email, "El email no es válido.");
    if (!urlOk(el.web.value.trim())) falta(el.web, "La página web debe empezar por https://");
    REDES.forEach(function (r) { if (!urlOk(el["red-" + r].value.trim())) falta(el["red-" + r], "El enlace de " + r + " debe empezar por https://"); });
    var h = leerHorario();
    errores = errores.concat(h.errores);

    var caja = $("form-error");
    if (errores.length) {
      caja.innerHTML = "<strong>Revisa lo siguiente:</strong><br>" + errores.map(esc).join("<br>");
      caja.hidden = false;
      caja.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    caja.hidden = true;

    var id = editando ? editando.id : (function () {
      var base = slug(el.nombre.value), id2 = base, n = 2;
      var usados = {}; lugares.forEach(function (x) { usados[x.id] = true; });
      while (usados[id2]) id2 = base + "-" + (n++);
      return id2;
    })();
    var redes = {};
    REDES.forEach(function (r) { redes[r] = el["red-" + r].value.trim(); });

    var lugar = {
      id: id,
      publicado: el.publicado.checked,
      seccion: el.seccion.value,
      categoria: el.categoria.value,
      icono: el.icono.value.trim(),
      nombre: el.nombre.value.trim(),
      resumen: el.resumen.value.trim(),
      descripcion: el.descripcion.value.trim(),
      servicios: lista(el.servicios.value, /\n/),
      etiquetas: lista(el.etiquetas.value, /,/),
      direccion: el.direccion.value.trim(),
      coordenadas: coords,
      horario: h.horario,
      horarioNota: el.horarioNota.value.trim(),
      telefono: el.telefono.value.trim(),
      whatsapp: el.whatsapp.value.trim(),
      email: el.email.value.trim(),
      web: el.web.value.trim(),
      redes: redes,
      fotos: fotos.slice()
    };

    var boton = $("btn-guardar");
    boton.disabled = true; boton.textContent = "Guardando…";
    var fila = FD.lugarAFila(lugar);
    var peticion = editando
      ? sb.from("lugares").update(fila).eq("id", id).select()
      : sb.from("lugares").insert(fila).select();
    peticion.then(function (r) {
      boton.disabled = false; boton.textContent = "💾 Guardar";
      if (r.error) { caja.textContent = "No se ha podido guardar: " + traducirError(r.error); caja.hidden = false; return; }
      // Borrar del almacén las fotos que se han quitado
      var quitadas = ((editando && editando.fotos) || []).filter(function (u) { return fotos.indexOf(u) === -1; });
      borrarFotos(quitadas);
      fotosSubidasAhora = [];
      cambiosSinGuardar = false;
      avisar(lugar.publicado ? "✔ Guardado. Ya se ve en la web." : "✔ Guardado como borrador (no se ve en la web).");
      cargarLista();
    });
  });

  /* ---------- Eliminar ---------- */
  $("btn-eliminar").addEventListener("click", function () {
    if (!editando) return;
    if (!confirm("¿Seguro que quieres ELIMINAR «" + editando.nombre + "»?\n\nDesaparecerá de la web y se borrarán sus fotos. No se puede deshacer.")) return;
    var l = editando;
    sb.from("lugares").delete().eq("id", l.id).then(function (r) {
      if (r.error) { alert("No se ha podido eliminar: " + traducirError(r.error)); return; }
      borrarFotos((l.fotos || []).concat(fotosSubidasAhora));
      fotosSubidasAhora = [];
      cambiosSinGuardar = false;
      avisar("Eliminado");
      cargarLista();
    });
  });
})();
