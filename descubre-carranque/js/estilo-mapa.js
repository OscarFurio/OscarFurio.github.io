/* ==========================================================
   DESCUBRE CARRANQUE · Estilo del mapa (minimalista)
   ----------------------------------------------------------
   Mapa vectorial de OpenFreeMap (gratuito, sin clave) con
   datos de OpenStreetMap. Aquí se cambian los colores:
   sin edificios, calles color hueso, parques en verde y
   fondo azul bebé.
   ========================================================== */
(function () {
  var C = {
    fondo:        "#dcebf6",   // azul bebé (zonas sin nada)
    zonas:        "#e6f0f8",   // zonas urbanas, un azul aún más claro
    parque:       "#cfe6c3",   // parques y jardines: verdecito
    agua:         "#a9cde8",
    calle:        "#f4ecdc",   // calles: color hueso / crudo
    calleBorde:   "#d8c6a6",   // borde de las calles: marrón clarito
    callePrinc:   "#efe2c8",   // carreteras principales, hueso algo más tostado
    texto:        "#6b5843",   // nombres de calles
    textoHalo:    "#f8f3e9",
    textoPueblo:  "#5a4632"
  };

  var ancho = function (z14, z18) {
    return ["interpolate", ["exponential", 1.6], ["zoom"], 12, z14 * 0.35, 14, z14, 18, z18];
  };
  var principales = ["motorway", "trunk", "primary", "secondary", "tertiary"];
  var menores = ["minor", "service", "residential", "living_street", "unclassified"];

  window.ESTILO_MAPA = {
    version: 8,
    name: "Descubre Carranque",
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      osm: { type: "vector", url: "https://tiles.openfreemap.org/planet" }
    },
    layers: [
      { id: "fondo", type: "background", paint: { "background-color": C.fondo } },

      { id: "zonas-urbanas", type: "fill", source: "osm", "source-layer": "landuse",
        filter: ["in", ["get", "class"], ["literal", ["residential", "commercial", "retail", "industrial", "school", "hospital"]]],
        paint: { "fill-color": C.zonas } },

      { id: "parques", type: "fill", source: "osm", "source-layer": "park",
        paint: { "fill-color": C.parque } },
      { id: "verdes", type: "fill", source: "osm", "source-layer": "landcover",
        filter: ["in", ["get", "subclass"], ["literal", ["park", "garden", "recreation_ground", "village_green", "golf_course", "playground"]]],
        paint: { "fill-color": C.parque } },
      { id: "deporte", type: "fill", source: "osm", "source-layer": "landuse",
        filter: ["in", ["get", "class"], ["literal", ["pitch", "playground", "stadium", "garden"]]],
        paint: { "fill-color": C.parque } },

      { id: "agua", type: "fill", source: "osm", "source-layer": "water", paint: { "fill-color": C.agua } },
      { id: "rios", type: "line", source: "osm", "source-layer": "waterway",
        paint: { "line-color": C.agua, "line-width": ["interpolate", ["linear"], ["zoom"], 12, 1, 18, 5] } },

      // Caminos y sendas: línea fina discontinua
      { id: "caminos", type: "line", source: "osm", "source-layer": "transportation", minzoom: 14,
        filter: ["in", ["get", "class"], ["literal", ["path", "track"]]],
        paint: { "line-color": C.calleBorde, "line-width": 1.2, "line-dasharray": [2, 2] } },

      // Bordes (marrón clarito)
      { id: "calles-borde", type: "line", source: "osm", "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", menores]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": C.calleBorde, "line-width": ancho(7, 26) } },
      { id: "principales-borde", type: "line", source: "osm", "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", principales]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": C.calleBorde, "line-width": ancho(10, 34) } },

      // Relleno (hueso)
      { id: "calles", type: "line", source: "osm", "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", menores]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": C.calle, "line-width": ancho(5, 22) } },
      { id: "principales", type: "line", source: "osm", "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", principales]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": C.callePrinc, "line-width": ancho(8, 30) } },

      // Nombres de las calles
      { id: "nombres-calles", type: "symbol", source: "osm", "source-layer": "transportation_name", minzoom: 14,
        layout: {
          "symbol-placement": "line",
          "text-field": ["coalesce", ["get", "name:es"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 14, 11, 18, 15],
          "text-max-angle": 30,
          "symbol-spacing": 280
        },
        paint: { "text-color": C.texto, "text-halo-color": C.textoHalo, "text-halo-width": 1.6 } },

      // Nombres de parques
      { id: "nombres-parques", type: "symbol", source: "osm", "source-layer": "poi", minzoom: 15,
        filter: ["in", ["get", "class"], ["literal", ["park", "garden"]]],
        layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Italic"], "text-size": 13 },
        paint: { "text-color": "#4f7a45", "text-halo-color": C.textoHalo, "text-halo-width": 1.4 } },

      // Nombre del pueblo y alrededores
      { id: "nombres-pueblos", type: "symbol", source: "osm", "source-layer": "place", maxzoom: 15,
        filter: ["in", ["get", "class"], ["literal", ["town", "village", "city"]]],
        layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Bold"], "text-size": 15, "text-transform": "uppercase", "text-letter-spacing": 0.15 },
        paint: { "text-color": C.textoPueblo, "text-halo-color": C.textoHalo, "text-halo-width": 2 } }
    ]
  };
})();
