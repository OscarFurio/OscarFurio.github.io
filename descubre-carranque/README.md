# 📍 Descubre Carranque

Mapa interactivo de comercios, asociaciones y lugares de cultura y servicios de Carranque (Toledo).

**Dirección pública:** https://oscarfurio.github.io/descubre-carranque/
**Página del código QR:** https://oscarfurio.github.io/descubre-carranque/qr.html
**Zona de gestión (con usuario y contraseña):** https://oscarfurio.github.io/descubre-carranque/gestion/

> ⚠️ Ahora mismo las fichas son **datos de ejemplo**, con nombres, direcciones y teléfonos ficticios. Hay que cambiarlas por las reales antes de presentar la web.

---

## Cómo funciona para el visitante

1. Al entrar ve el título **Descubre Carranque**, el **buscador con lupa** y el **mapa**.
2. Arriba elige qué quiere ver: **Todo · Comercios · Asociaciones · Cultura y servicios**.
3. Cada lugar tiene en el mapa **su propio icono** (🐄 carnicería, 🍷 bar, 🔧 taller, ⛽ gasolinera, ✉️ correos, 🎁 regalos…).
4. **Al pasar el ratón** por encima de un icono se abre una **tarjeta pequeña** con foto, nombre, a qué se dedica, la dirección, el horario de hoy y si está abierto en ese momento. En el móvil la tarjeta se abre al tocar el icono.
5. **Al pulsar la tarjeta** se abre la **ficha completa** del lugar, que funciona como su propia página: descripción, servicios, horario de toda la semana, cómo llegar, teléfono, WhatsApp, email y redes sociales.
6. Cada ficha tiene su propio enlace (por ejemplo `…/descubre-carranque/#lugar=bar-ejemplo`), así que un comercio puede compartir el enlace directo a su ficha.

## Archivos

| Archivo | Para qué sirve | ¿Se toca? |
|---|---|---|
| `gestion/` | **Zona de gestión**: formulario para añadir y editar fichas y subir fotos | Se usa desde el navegador |
| `js/config.js` | Título, centro del mapa, dirección del QR, filtros por categoría y **conexión con Supabase** | Una vez, al configurar |
| `js/datos.js` | Las **categorías** (iconos y colores) y las fichas de ejemplo, que se usan mientras Supabase no esté conectado | Solo para añadir categorías nuevas |
| `supabase/instalacion.sql` | Crea la base de datos, el almacén de fotos y los permisos | Se ejecuta una vez en Supabase |
| `index.html`, `css/`, `js/app.js` | Diseño y funcionamiento | No hace falta |
| `qr.html` | Genera, descarga e imprime el cartel con el QR | No hace falta |

---

## Zona de gestión (Supabase)

La web tiene una zona privada en **`/gestion/`** donde los gestores entran con **email y contraseña** y pueden:

- añadir, editar y eliminar comercios, asociaciones y lugares;
- rellenar la ficha con un formulario: datos, presentación, servicios, horario día a día, contacto y redes;
- **subir fotos** desde el móvil o el ordenador, que se reducen de tamaño solas, y elegir cuál es la principal;
- marcar el sitio exacto **tocando en el mapa**, buscando la dirección o pegando las coordenadas de Google Maps;
- guardar una ficha como **borrador**, que no se ve en la web hasta que se publica.

Los cambios se ven en la web **al momento**, sin tocar GitHub. Los datos y las fotos se guardan en [Supabase](https://supabase.com), que es gratuito para un proyecto de este tamaño.

### Puesta en marcha (una sola vez, unos 10 minutos)

**1. Crear el proyecto**
1. Entra en https://supabase.com y pulsa **Start your project**. Puedes registrarte con tu cuenta de GitHub.
2. Pulsa **New project**. Ponle de nombre `descubre-carranque`, inventa una contraseña para la base de datos (guárdala, aunque no la usarás en la web) y elige la región **West EU (Paris)** o la más cercana.
3. Espera uno o dos minutos a que se cree.

**2. Crear la base de datos**
1. En el menú de la izquierda entra en **SQL Editor** y pulsa **New query**.
2. Abre el archivo `supabase/instalacion.sql` de este repositorio, copia **todo** su contenido y pégalo.
3. **Al final del texto, cambia `tu-email@ejemplo.com` por tu email.** Ese será el primer gestor.
4. Pulsa **Run**. Debe aparecer *Success*.

**3. Desactivar el registro libre (importante)**
1. Ve a **Authentication → Sign In / Providers** (en algunas versiones, **Authentication → Providers → Email**).
2. Desactiva **Allow new users to sign up** y guarda.

Así nadie puede crearse una cuenta por su cuenta. Aunque alguien lo consiguiera, no podría modificar nada si su email no está en la lista de gestores.

**4. Crear tu usuario**
1. Ve a **Authentication → Users → Add user → Create new user**.
2. Escribe **el mismo email** del paso 2 y una contraseña. Marca **Auto Confirm User** y pulsa **Create user**.

**5. Conectar la web**
1. Ve a **Project Settings → API** (o **Data API** / **API Keys**).
2. Copia la **Project URL** (algo como `https://abcdxyz.supabase.co`) y la clave **anon public**. Es una clave pública y puede ir en la web sin problema.
3. En GitHub, edita `descubre-carranque/js/config.js` y pégalas:
   ```js
   supabaseUrl: "https://abcdxyz.supabase.co",
   supabaseAnonKey: "eyJhbGciOi...",
   ```
4. Pulsa **Commit changes**. En uno o dos minutos ya puedes entrar en `…/descubre-carranque/gestion/`.

> Al conectar Supabase, la web deja de mostrar las fichas de ejemplo de `js/datos.js` y pasa a mostrar las de la base de datos, que al principio estará vacía. Añade los comercios reales desde la zona de gestión.

### Dar acceso a otro gestor
1. En Supabase → **Table Editor → gestores → Insert row**, escribe su email y su nombre.
2. En **Authentication → Users → Add user**, créale el usuario con ese mismo email y una contraseña provisional, con **Auto Confirm User** marcado.
3. Pásale la dirección de la zona de gestión y su contraseña. Podrá cambiarla con el botón **🔑 Cambiar contraseña**.

Para **quitar** el acceso a alguien, borra su fila de la tabla `gestores` o borra su usuario.

### Bueno saber
- **Pausa por inactividad:** el plan gratuito pausa el proyecto si pasa 7 días sin ninguna visita. Con la web publicada y el QR en la calle no debería ocurrir. Si pasa, entra en supabase.com y pulsa **Restore project**.
- **Copias de seguridad:** en **Table Editor → lugares** puedes exportar todos los datos a CSV desde el botón **Export**. Conviene hacerlo de vez en cuando.
- **Seguridad:** solo los emails de la tabla `gestores` pueden crear, cambiar o borrar fichas y fotos. Cualquier visitante solo puede **leer** las fichas publicadas.

---

## Gestión manual (sin Supabase)

Mientras Supabase no esté conectado, las fichas se escriben a mano en `js/datos.js`.

### Cómo se trabaja

1. Cada comercio o asociación rellena la **ficha de recogida de datos** (la plantilla está más abajo).
2. La persona encargada los introduce en la zona de gestión (o, sin Supabase, en `js/datos.js`).
3. Si más adelante un comercio quiere cambiar algo, **se lo comunica a la persona encargada**, que actualiza su ficha.
4. Para guardar un cambio en GitHub: abre el archivo → ✏️ **Edit** → cambia el texto → **Commit changes**. La web se actualiza sola en uno o dos minutos.

### Estructura de una ficha (todas iguales)

Copia un bloque `{ … },` de `js/datos.js`, pégalo y cambia los valores. Si un campo no se va a usar, déjalo vacío (`""` o `[]`) y no aparecerá en la ficha.

```js
{
  id: "panaderia-la-espiga",          // único, en minúsculas y sin espacios (forma el enlace a la ficha)
  seccion: "comercios",               // "comercios" | "asociaciones" | "cultura"
  categoria: "panaderia",             // un id de la lista CATEGORIAS (arriba del archivo)
  icono: "",                          // opcional: un emoji propio, por ejemplo "🎂". Vacío = icono de la categoría
  nombre: "Panadería La Espiga",
  resumen: "Pan artesano de horno de leña.",       // 1 frase corta → sale en la tarjeta pequeña
  descripcion: "Texto largo…\n\nOtro párrafo…",    // sale en la ficha completa (\n\n = nuevo párrafo)
  servicios: ["Encargos", "Sin gluten"],           // lista "Qué ofrecemos"
  direccion: "Calle Real, 3 · 45216 Carranque",
  coordenadas: [40.1701, -3.9022],    // latitud, longitud (cómo sacarlas: ver abajo)
  horario: {                          // "HH:MM-HH:MM"; varios tramos separados por coma; "" = cerrado
    lun: "09:00-14:00,17:00-20:00", mar: "...", mie: "...", jue: "...",
    vie: "...", sab: "09:00-14:00", dom: ""
  },
  horarioNota: "Agosto cerrado por vacaciones.",
  telefono: "925 000 000",
  whatsapp: "600000000",              // solo el número (se le añade el +34)
  email: "",
  web: "",                            // dirección completa, con https://
  redes: { instagram: "https://instagram.com/…", facebook: "", tiktok: "", youtube: "", x: "" },
  fotos: ["img/panaderia-1.jpg", "img/panaderia-2.jpg"],   // la primera es la principal
  etiquetas: ["pan", "dulces", "tartas"]   // palabras extra para que el buscador lo encuentre
},
```

**Cómo sacar las coordenadas:** abre Google Maps, haz clic derecho sobre el local y pulsa los números que aparecen arriba (por ejemplo `40.1701, -3.9022`). Así se copian y solo hay que pegarlos entre corchetes.

**Fotos:** súbelas a la carpeta `img/` en formato JPG, apaisadas, de unos 1200 px de ancho como máximo y por debajo de 300 KB. Se aconsejan entre 1 y 4 por ficha. Si no hay fotos, se muestra el icono de la categoría sobre un fondo de color.

**Iconos y categorías nuevas:** añade una línea a `CATEGORIAS` en `js/datos.js` con un `id`, la `seccion`, un `nombre`, un `icono` (emoji) y un `color`.

### Filtros por categoría: ¿se muestran o no?

En `js/config.js`:

```js
mostrarFiltrosCategoria: true,   // false = solo pestañas + buscador
```

Con `false`, el público no ve los botones del tipo «Belleza» o «Alimentación», para no poner a la vista la competencia directa entre comercios del mismo sector. El buscador sigue encontrando todo y cada local conserva su icono en el mapa.

---

## Plantilla de recogida de datos (para entregar a cada comercio o asociación)

```
DESCUBRE CARRANQUE – Ficha de datos

Nombre del comercio / asociación:
Tipo de actividad (ej. panadería, peluquería, club deportivo):
Frase corta de presentación (máx. 15 palabras):
Descripción (quiénes sois, a qué os dedicáis):
Lo que ofrecéis (3–6 puntos):
Dirección:
Horario (de lunes a domingo, con los tramos de mañana y tarde):
Observaciones sobre el horario (vacaciones, festivos…):
Teléfono:
WhatsApp:
Email:
Página web:
Instagram / Facebook / TikTok / YouTube / X (enlaces):
Fotos (1–4, enviadlas aparte):
Palabras con las que os buscaría la gente:

☐ Autorizo la publicación de estos datos y fotos en la web Descubre Carranque.
Firma y fecha:
```

---

## Código QR

1. Abre `qr.html` (también tiene enlace en el pie de la web).
2. Comprueba la dirección y pulsa **Descargar QR (PNG)** o **Imprimir cartel**.
3. El mismo QR sirve para el ayuntamiento, los comercios, las asociaciones y los colegios.

> 🔒 **Importante:** el QR lleva grabada la dirección de la web. Si esa dirección cambia algún día, los QR ya impresos dejarán de funcionar. Si el proyecto va a durar, conviene registrar un dominio propio (por ejemplo `descubrecarranque.es`) **antes** de imprimir los QR definitivos y poner esa dirección en `urlPublica` de `js/config.js`.

## Tecnología

Es una web estática sin servidor ni base de datos, que se publica gratis en GitHub Pages.

- **Mapa:** [MapLibre GL](https://maplibre.org/) con teselas vectoriales de [OpenFreeMap](https://openfreemap.org/) (gratuito y sin clave), con datos de © OpenStreetMap. El estilo es propio y minimalista: sin edificios, calles color hueso con el nombre visible, parques en verde y fondo azul bebé. **Los colores se cambian en `js/estilo-mapa.js`**, al principio del archivo.
- **Tipografías:** Fraunces, una serifa redondeada de estilo «Times», para el título en mayúsculas, y Atkinson Hyperlegible, diseñada para leerse con facilidad, para los textos.
- **QR:** qrcodejs.
- **Zona de gestión:** [Supabase](https://supabase.com), con inicio de sesión, base de datos PostgreSQL con permisos por fila y almacén de fotos. La web pública lee los datos a través de su API.
