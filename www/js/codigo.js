// Elementos
const MENU = document.querySelector("#menu");
const HOME = document.querySelector("#pantalla-home");
const LOGIN = document.querySelector("#pantalla-login");
const REGISTRO = document.querySelector("#pantalla-registro");
const LISTAR_EVALUACIONES = document.querySelector("#pantalla-listar-evaluaciones");
const AGREGAR_EVALUACIONES = document.querySelector("#pantalla-agregar-evaluaciones");
const MAPA = document.querySelector("#pantalla-mapa");
const LBL_USER = document.querySelector("#lbl-usuario");

// Config
const API = "https://goalify.develotion.com";

// Inicio
Inicio();

function Inicio() {
  VerificarSesion();
  Eventos();
  ArmarMenu();
  const u = localStorage.getItem("username");
  if (LBL_USER) LBL_USER.textContent = u ? u : "—";
  onHashChange(); // primer render
}

// Utilidades
function hoyISO() { return new Date().toISOString().split("T")[0]; }

function setMaxHoyEnFecha() {
  const inp = document.querySelector("#input-fecha");
  if (inp) {
    const hoy = hoyISO();
    inp.max = hoy;
    if (!inp.value) inp.value = hoy;
  }
}

function NavegarA(ruta) {
  const newHash = "#" + ruta;
  if (location.hash !== newHash) location.hash = newHash;
  else onHashChange();
}

function CerrarMenu() { MENU?.close(); }

function OcultarPantallas() {
  HOME.style.display = "none";
  LOGIN.style.display = "none";
  REGISTRO.style.display = "none";
  LISTAR_EVALUACIONES.style.display = "none";
  AGREGAR_EVALUACIONES.style.display = "none";
  MAPA.style.display = "none";
}

function VerificarSesion() {
  const token = localStorage.getItem("token");
  NavegarA(token ? "/" : "/login");
}

function GuardarSesion(data, username) {
  localStorage.setItem("token", data.token);
  localStorage.setItem("userId", String(data.id));
  if (username) localStorage.setItem("username", username);
}

function Logout() {
  localStorage.clear();
  ArmarMenu();
  NavegarA("/login");
}

function getAuthOrThrow() {
  const token = localStorage.getItem("token");
  const iduser = localStorage.getItem("userId");
  if (!token || !iduser) throw new Error("Sesión expirada");
  return { token, iduser };
}

async function fetchJSON(url, opt = {}) {
  const res = await fetch(url, opt);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.mensaje || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// Menú
function ArmarMenu() {
  const cont = document.querySelector("#menu-opciones");
  if (!cont) return;

  const hayToken = !!localStorage.getItem("token");

  if (hayToken) {
    cont.innerHTML = `
      <ion-item lines="none" button onclick="NavegarA('/'); CerrarMenu()">Home</ion-item>
      <ion-item lines="none" button onclick="NavegarA('/listar-evaluaciones'); CerrarMenu()">Ver Evaluaciones</ion-item>
      <ion-item lines="none" button onclick="NavegarA('/agregar-evaluaciones'); CerrarMenu()">Agregar Evaluaciones</ion-item>
      <ion-item lines="none" button onclick="NavegarA('/mapa'); CerrarMenu()">Mapa</ion-item>
      <ion-item lines="none" button onclick="Logout()">Cerrar sesión</ion-item>
    `;
  } else {
    cont.innerHTML = `
      <ion-item lines="none" button onclick="NavegarA('/'); CerrarMenu()">Home</ion-item>
      <ion-item lines="none" button onclick="NavegarA('/registro'); CerrarMenu()">Registro</ion-item>
      <ion-item lines="none" button onclick="NavegarA('/login'); CerrarMenu()">Login</ion-item>
    `;
  }
}

// Eventos
function Eventos() {
  window.addEventListener("hashchange", onHashChange);

  document.querySelector("#btn-registrar")?.addEventListener("click", clickRegistrar);
  document.querySelector("#btn-login")?.addEventListener("click", clickLogin);
  document.querySelector("#btn-agregar-eval")?.addEventListener("click", clickAgregarEvaluacion);
  document.querySelector("#seg-filtro")?.addEventListener("ionChange", () => cargarYRenderEvaluaciones());
  document.querySelector("#refresher-evals")?.addEventListener("ionRefresh", async (ev) => {
    await cargarYRenderEvaluaciones(true);
    ev.detail.complete();
  });
}

function onHashChange() {
  OcultarPantallas();
  const ruta = (location.hash || "#/").slice(1);

  if (ruta === "/") {
    HOME.style.display = "block";
    RenderHome();
  } else if (ruta === "/registro") {
    REGISTRO.style.display = "block";
    CargarPaises();
  } else if (ruta === "/login") {
    LOGIN.style.display = "block";
  } else if (ruta === "/listar-evaluaciones") {
    LISTAR_EVALUACIONES.style.display = "block";
    cargarYRenderEvaluaciones();
  } else if (ruta === "/agregar-evaluaciones") {
    AGREGAR_EVALUACIONES.style.display = "block";
    setMaxHoyEnFecha();
    CargarObjetivos();
  } else if (ruta === "/mapa") {
    MAPA.style.display = "block";
    CargarMapa();
  } else {
    HOME.style.display = "block";
    RenderHome();
  }
}

// Registro / Login
async function clickRegistrar() {
  const user = document.querySelector("#reg-usuario").value.trim();
  const pass = document.querySelector("#reg-pass").value.trim();
  const pais = parseInt(document.querySelector("#reg-pais").value);
  const err = document.querySelector("#reg-error");
  err.textContent = "";

  if (!user || !pass || !pais) { err.textContent = "Campos incompletos."; return; }

  try {
    const data = await fetchJSON(`${API}/usuarios.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario: user, password: pass, idPais: pais })
    });
    GuardarSesion(data, user);
    ArmarMenu();
    NavegarA("/");
  } catch (e) {
    err.textContent = e.message || "Error de registro";
  }
}

async function clickLogin() {
  const user = document.querySelector("#login-usuario").value.trim();
  const pass = document.querySelector("#login-pass").value.trim();
  const err = document.querySelector("#login-error");
  err.textContent = "";

  if (!user || !pass) { err.textContent = "Campos incompletos."; return; }

  try {
    const data = await fetchJSON(`${API}/login.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario: user, password: pass })
    });
    GuardarSesion(data, user);
    ArmarMenu();
    NavegarA("/");
  } catch (e) {
    err.textContent = e.message || "Login incorrecto";
  }
}

// Países
async function CargarPaises() {
  const sel = document.querySelector("#reg-pais");
  const err = document.querySelector("#reg-error");
  if (!sel) return;
  sel.innerHTML = "";

  try {
    const data = await fetchJSON(`${API}/paises.php`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    (data.paises || []).forEach(p => {
      const opt = document.createElement("ion-select-option");
      opt.value = p.id;
      opt.textContent = p.name;
      sel.appendChild(opt);
    });
  } catch {
    err.textContent = "Error cargando países.";
  }
}

// Objetivos (cache 15 min)
async function getObjetivos({ force = false } = {}) {
  const cacheKey = "objetivosCache";
  const now = Date.now();
  if (!force) {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (now - parsed.ts < 15 * 60 * 1000) return parsed.data;
      } catch { /* noop */ }
    }
  }

  const { token, iduser } = getAuthOrThrow();
  const data = await fetchJSON(`${API}/objetivos.php`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "token": token,
      "iduser": iduser
    }
  });
  localStorage.setItem(cacheKey, JSON.stringify({ ts: now, data: data.objetivos || [] }));
  return data.objetivos || [];
}

async function CargarObjetivos() {
  const sel = document.querySelector("#select-objetivo");
  const err = document.querySelector("#eval-error");
  if (!sel) return;
  sel.innerHTML = "";
  try {
    const objs = await getObjetivos();
    objs.forEach(o => {
      const opt = document.createElement("ion-select-option");
      opt.value = o.id;
      opt.textContent = o.nombre;
      sel.appendChild(opt);
    });
  } catch {
    if (err) err.textContent = "Error cargando objetivos.";
  }
}

// Evaluaciones
async function clickAgregarEvaluacion() {
  const ok = document.querySelector("#eval-ok");
  const err = document.querySelector("#eval-error");
  ok.textContent = ""; err.textContent = "";

  try {
    const { token, iduser } = getAuthOrThrow();
    const idObjetivo = parseInt(document.querySelector("#select-objetivo")?.value);
    const califStr = document.querySelector("#input-calificacion")?.value;
    let fechaVal = document.querySelector("#input-fecha")?.value;

    if (fechaVal && fechaVal.includes("T")) fechaVal = fechaVal.split("T")[0];

    if (!idObjetivo || Number.isNaN(idObjetivo)) throw new Error("Seleccioná un objetivo.");
    const calificacion = parseInt(califStr);
    if (Number.isNaN(calificacion) || calificacion < -5 || calificacion > 5)
      throw new Error("La calificación debe ser un entero entre -5 y 5.");
    if (!fechaVal) throw new Error("Seleccioná una fecha.");
    if (fechaVal > hoyISO()) throw new Error("La fecha no puede ser futura.");

    const body = { idObjetivo, idUsuario: parseInt(iduser), calificacion, fecha: fechaVal };
    await fetchJSON(`${API}/evaluaciones.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": token,
        "iduser": iduser
      },
      body: JSON.stringify(body)
    });

    ok.textContent = "Evaluación guardada.";
    document.querySelector("#input-calificacion").value = "";
    setMaxHoyEnFecha();
  } catch (e) {
    err.textContent = e.message || "No se pudo guardar la evaluación.";
  }
}

// Home
function RenderHome() {
  const cont = document.querySelector("#home-auth");
  const stats = document.querySelector("#home-stats");
  const lblUser = document.querySelector("#lbl-usuario");

  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  lblUser.textContent = username || "—";
  cont.innerHTML = "";
  stats.style.display = "none";

  if (token && username) {
    cont.innerHTML = `
      <p class="muted">Usá el menú para navegar. Podés agregar evaluaciones y ver estadísticas.</p>
      <ion-button expand="block" onclick="NavegarA('/agregar-evaluaciones')">Agregar Evaluación</ion-button>
      <ion-button expand="block" fill="outline" onclick="NavegarA('/listar-evaluaciones')">Ver Mis Evaluaciones</ion-button>
      <ion-button expand="block" fill="clear" onclick="NavegarA('/mapa')">Ver Mapa de Usuarios</ion-button>
    `;
    stats.style.display = "block";
    cargarPuntajesHome();
  } else {
    cont.innerHTML = `
      <p class="muted">Iniciá sesión o registrate para comenzar.</p>
      <ion-button expand="block" onclick="NavegarA('/login')">Iniciar Sesión</ion-button>
      <ion-button expand="block" fill="outline" onclick="NavegarA('/registro')">Registrarse</ion-button>
    `;
  }
}

async function cargarPuntajesHome() {
  try {
    const { token, iduser } = getAuthOrThrow();
    const data = await fetchJSON(`${API}/evaluaciones.php?idUsuario=${iduser}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "token": token,
        "iduser": iduser
      }
    });
    const evals = data.evaluaciones || [];
    renderPuntajes(evals, "#lbl-prom-global-home", "#lbl-prom-hoy-home");
  } catch {
    renderPuntajes([], "#lbl-prom-global-home", "#lbl-prom-hoy-home");
  }
}

// Listado + métricas
async function cargarYRenderEvaluaciones(forceObjetivos = false) {
  const txtErr = document.querySelector("#listar-error");
  const lista = document.querySelector("#lista-evals");
  const seg = document.querySelector("#seg-filtro");
  if (!lista) return;

  txtErr.textContent = "";
  lista.innerHTML = `
    <ion-item lines="none">
      <ion-spinner name="crescent" slot="start"></ion-spinner>
      <ion-label>Cargando...</ion-label>
    </ion-item>
  `;

  try {
    const { token, iduser } = getAuthOrThrow();

    const objetivos = await getObjetivos({ force: forceObjetivos });
    const mapObjetivo = new Map();
    objetivos.forEach(o => mapObjetivo.set(o.id, { nombre: o.nombre, emoji: o.emoji }));

    const data = await fetchJSON(`${API}/evaluaciones.php?idUsuario=${iduser}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "token": token,
        "iduser": iduser
      }
    });
    const evals = (data.evaluaciones || [])
      .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));

    const filtro = seg?.value || "todo";
    const evalsFiltradas = aplicarFiltroFecha(evals, filtro);

    renderEvaluaciones(lista, evalsFiltradas, mapObjetivo);
    renderPuntajes(evalsFiltradas, "#lbl-prom-global-list", "#lbl-prom-hoy-list");

  } catch (e) {
    lista.innerHTML = "";
    txtErr.textContent = e.message || "Error al cargar evaluaciones.";
    renderPuntajes([], "#lbl-prom-global-list", "#lbl-prom-hoy-list");
  }
}

function aplicarFiltroFecha(evals, filtro) {
  if (filtro === "todo") return evals;
  const hoy = new Date(hoyISO());
  let desde;
  if (filtro === "semana") {
    desde = new Date(hoy); desde.setDate(hoy.getDate() - 6);
  } else if (filtro === "mes") {
    desde = new Date(hoy); desde.setMonth(hoy.getMonth() - 1);
  }
  const isoDesde = desde.toISOString().split("T")[0];
  return evals.filter(e => e.fecha >= isoDesde && e.fecha <= hoyISO());
}

function renderEvaluaciones(lista, evals, mapObjetivo) {
  if (!evals.length) {
    lista.innerHTML = `<ion-item lines="none"><ion-label>No hay evaluaciones.</ion-label></ion-item>`;
    return;
  }

  const frag = document.createDocumentFragment();

  evals.forEach(e => {
    const obj = mapObjetivo.get(e.idObjetivo) || { nombre: `Obj ${e.idObjetivo}`, emoji: "🎯" };
    const item = document.createElement("ion-item");
    item.innerHTML = `
      <ion-label>
        <div class="mono" style="font-size:1.1rem">${obj.emoji || "🎯"} ${obj.nombre}</div>
        <div class="muted">Fecha: ${e.fecha}</div>
        <div>Calificación: <b class="mono">${e.calificacion}</b></div>
      </ion-label>
      <ion-button size="small" color="danger" slot="end" data-id="${e.id}" class="btn-del-eval">Eliminar</ion-button>
    `;
    frag.appendChild(item);
  });

  lista.innerHTML = "";
  lista.appendChild(frag);

  // eliminar
  lista.querySelectorAll(".btn-del-eval").forEach(btn => {
    btn.addEventListener("click", async (ev) => {
      const id = ev.currentTarget.getAttribute("data-id");
      await eliminarEvaluacion(id);
      await cargarYRenderEvaluaciones();
    });
  });
}

async function eliminarEvaluacion(idEvaluacion) {
  const { token, iduser } = getAuthOrThrow();
  await fetchJSON(`${API}/evaluaciones.php?idEvaluacion=${encodeURIComponent(idEvaluacion)}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "token": token,
      "iduser": iduser
    }
  });
}

// Puntajes
function renderPuntajes(evals, selGlobal, selHoy) {
  const lblG = document.querySelector(selGlobal);
  const lblH = document.querySelector(selHoy);

  if (!evals || !evals.length) {
    if (lblG) lblG.textContent = "—";
    if (lblH) lblH.textContent = "—";
    return;
  }

  const sum = evals.reduce((acc, e) => acc + Number(e.calificacion || 0), 0);
  const promGlobal = sum / evals.length;

  const hoy = hoyISO();
  const deHoy = evals.filter(e => e.fecha === hoy);
  const promHoy = deHoy.length
    ? (deHoy.reduce((a, e) => a + Number(e.calificacion || 0), 0) / deHoy.length)
    : null;

  if (lblG) lblG.textContent = promGlobal.toFixed(2);
  if (lblH) lblH.textContent = promHoy === null ? "—" : promHoy.toFixed(2);
}

// Mapa
function CargarMapa() { setTimeout(() => CrearMapa(), 300); }

let map = null;
function CrearMapa() {
  if (map) { map.remove(); map = null; }
  map = L.map("map").setView([-34.906127585745836, -56.182843297356044], 5);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  cargarUsuariosPorPaisEnMapa();
}

// Países soportados para el mapa
const COORDS_POR_PAIS = {
  "Uruguay": { lat: -32.5228, lng: -55.7658 },
  "Argentina": { lat: -38.4161, lng: -63.6167 },
  "Bolivia": { lat: -16.2902, lng: -63.5887 },
  "Brazil": { lat: -14.2350, lng: -51.9253 },
  "Chile": { lat: -35.6751, lng: -71.5430 },
  "Colombia": { lat: 4.5709, lng: -74.2973 },
  "Ecuador": { lat: -1.8312, lng: -78.1834 },
  "Paraguay": { lat: -23.4425, lng: -58.4438 },
  "Peru": { lat: -9.1900, lng: -75.0152 },
  "Venezuela": { lat: 6.4238, lng: -66.5897 }
};

function coordsDePais(nombre) {
  if (COORDS_POR_PAIS[nombre]) return COORDS_POR_PAIS[nombre];
  return null;
}

function normalizarUsuariosPorPais(data) {
  const arr = Array.isArray(data?.paises) ? data.paises : [];
  return arr.map(x => ({
    idPais: Number(x.id),
    nombrePais: String(x.nombre),
    cantidad: Number(x.cantidadDeUsuarios) || 0
  }));
}

async function getUsuariosPorPais() {
  const { token, iduser } = getAuthOrThrow();
  const data = await fetchJSON(`${API}/usuariosPorPais.php`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "token": token,
      "iduser": String(iduser)
    }
  });
  return normalizarUsuariosPorPais(data);
}

let markersLayer = null;
async function cargarUsuariosPorPaisEnMapa() {
  if (!map) return;
  try {
    const lista = await getUsuariosPorPais();
    const top10 = lista.sort((a, b) => b.cantidad - a.cantidad).slice(0, 10);

    if (markersLayer) { markersLayer.remove(); markersLayer = null; }
    markersLayer = L.layerGroup().addTo(map);

    top10.forEach(({ nombrePais, cantidad }) => {
      const coord = coordsDePais(nombrePais);
      if (!coord) return;
      L.marker([coord.lat, coord.lng])
        .addTo(markersLayer)
        .bindTooltip(`${nombrePais}: ${cantidad}`, { permanent: false, direction: "top" });
    });
  } catch (e) {
    console.error("Usuarios por país:", e);
  }
}