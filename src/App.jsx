import { useState, useCallback, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ─── Theme — DispatchTrack Brand Design System ─────────────────────────────────
const C = {
  bg:          "#F5F7FA",   // fondo de página
  surface:     "#FFFFFF",   // paneles y sidebar
  card:        "#FFFFFF",   // cards
  border:      "#E2E8F0",
  borderLight: "#F0F4F8",

  // DT Brand colors
  blue:        "#0052CC",   // azul primario DT
  blueHover:   "#003D99",   // hover del azul primario
  blueLight:   "#306EF2",   // azul secundario DT
  blueBg:      "#EBF2FF",   // fondo suave azul

  orange:      "#F27B42",   // naranja DT (accent / CTA secundario)
  orangeHover: "#D9622A",
  orangeBg:    "#FEF0E8",

  navy:        "#132045",   // navy DT — texto principal y header

  red:         "#D93025",
  redBg:       "#FFF0EF",
  green:       "#1A7F4B",
  greenBg:     "#EDFAF3",
  amber:       "#F27B42",   // usar naranja DT como amber/warning
  amberBg:     "#FEF0E8",
  purple:      "#5E35B1",
  purpleBg:    "#EDE7F6",

  text:        "#132045",   // navy DT como color de texto principal
  textSec:     "#4A5568",
  textMuted:   "#A0AEC0",

  sans: "'Inter', 'DM Sans', system-ui, sans-serif",
  mono: "'IBM Plex Mono', 'Fira Code', monospace",

  shadow:    "0 1px 3px rgba(19,32,69,0.08), 0 1px 2px rgba(19,32,69,0.04)",
  shadowMd:  "0 4px 6px rgba(19,32,69,0.07), 0 2px 4px rgba(19,32,69,0.05)",
};

// Formateador de números: separador miles "." y decimales "," (máx 2)
const fmt = (n) => {
  if (n == null || n === "" || isNaN(Number(n))) return n;
  return Number(n).toLocaleString("es-CL", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
};

// Paleta de colores para rutas (como los dots de colores del screenshot)
const ROUTE_COLORS = ["#0052CC","#F27B42","#1A7F4B","#306EF2","#D93025","#5E35B1","#0891B2","#132045"];
const routeColor = (i) => ROUTE_COLORS[i % ROUTE_COLORS.length];

// ─── Log type catalog ──────────────────────────────────────────────────────────
const LOG_TYPES = [
  {
    id: "planning",
    icon: "🗺️",
    available: true,
    titleEs: "Planificación",
    titleEn: "Planning",
    descEs: "Analiza los resultados del algoritmo de asignación de rutas: órdenes asignadas, sin asignar, uso de flota, capabilities y límites de paradas.",
    descEn: "Analyze route assignment algorithm results: assigned orders, unassigned, fleet usage, capabilities and stop limits.",
    badgeEs: "Planificación",
    badgeEn: "Planning",
  },
  {
    id: "routes",
    icon: "🚚",
    available: true,
    titleEs: "Rutas",
    titleEn: "Routes",
    descEs: "Logs de creación y modificación de rutas. Detecta cambios inesperados, replanificaciones y estados de ruta.",
    descEn: "Route creation and modification logs. Detect unexpected changes, replanning events and route states.",
    badgeEs: "Rutas",
    badgeEn: "Routes",
  },
  {
    id: "uber",
    icon: <img src="/uber_direct.jpg" alt="Uber Direct" style={{ height: 40, width: "auto", maxWidth: 220, objectFit: "contain", display: "block" }} />,
    available: true,
    titleEs: "",
    titleEn: "",
    descEs: "Seguimiento de actualizaciones de Uber Direct: estado de la entrega, pickup, dropoff, courier y evidencias fotográficas.",
    descEn: "Track Uber Direct delivery updates: delivery status, pickup, dropoff, courier info and photo evidence.",
    badgeEs: "Uber Direct",
    badgeEn: "Uber Direct",
  },
  {
    id: "waypoints",
    icon: "📍",
    available: true,
    titleEs: "Waypoints Uber",
    titleEn: "Uber Waypoints",
    descEs: "Visualiza el recorrido del courier de Uber Direct en un mapa, con información del viaje y los puntos GPS registrados.",
    descEn: "Visualize the Uber Direct courier route on a map, with trip info and recorded GPS points.",
    badgeEs: "Waypoints",
    badgeEn: "Waypoints",
  },
  {
    id: "metrics",
    icon: "📊",
    available: true,
    titleEs: "Métricas de uso",
    titleEn: "Usage Metrics",
    descEs: "Registro centralizado de búsquedas realizadas en la plataforma. Analiza el uso por tipo, cluster y período de tiempo.",
    descEn: "Centralized record of searches performed on the platform. Analyze usage by type, cluster and time period.",
    badgeEs: "Métricas",
    badgeEn: "Metrics",
  },
  {
    id: "orders",
    icon: "📦",
    available: false,
    titleEs: "Órdenes",
    titleEn: "Orders",
    descEs: "Busca y analiza logs de creación y actualización de órdenes. Filtra por método (POST, PUT) para ver qué cambió y cuándo.",
    descEn: "Search and analyze order creation and update logs. Filter by method (POST, PUT) to see what changed and when.",
    badgeEs: "Órdenes",
    badgeEn: "Orders",
  },
];

// ─── Translations ──────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  es: {
    // Navbar
    navSubtitle: "Diagnóstico de soporte",
    newAnalysis: "← Nuevo análisis",
    confirmDiscard: "¿Descartar el análisis y empezar de nuevo?",

    // Log type selector
    selectorTitle: "¿Qué deseas analizar?",
    selectorSubtitle: "Selecciona el tipo de log para comenzar el diagnóstico",
    selectorComingSoon: "Próximamente",
    selectorAvailable: "Disponible",

    // Input mode toggle
    modeJson: "📋 Pegar JSON",
    modeKibana: "🔍 Buscar en Kibana",

    // Load card
    loadTitle: "Cargar datos de ruteo",
    loadDescJson: "Pega el JSON del request y response del algoritmo DT.",
    loadDescKibana: "Busca el log directamente en Kibana por plan_id.",

    // Kibana form labels
    labelPlanId: "Plan ID",
    labelCluster: "Cluster",
    labelTimeRange: "Rango de tiempo",
    labelRelative: "Relativo",
    labelAbsolute: "Absoluto",
    labelAmount: "Cantidad",
    labelUnit: "Unidad",
    labelHours: "Horas",
    labelDays: "Días",
    labelFrom: "Desde",
    labelTo: "Hasta",
    btnSearch: "Buscar",
    btnSearching: "Buscando...",
    footerIndex: "Índice:",
    footerLast: "Buscando los últimos",
    footerHours: "hora(s)",
    footerDays: "día(s)",

    // Tabs
    tabRoutes: "Rutas asignadas",
    tabUnassigned: "Sin asignar",
    tabAI: "Análisis IA",
    tabPrompt: "Prompt",

    // StatCards
    statRequested: "Solicitados",
    statRequestedSub: "órdenes en el request",
    statAssigned: "Asignados",
    statAssignedSub: "del total",
    statUnassigned: "Sin asignar",
    statUnassignedSub: "sin ruta",
    statEffCap: "Cap. efectiva",
    statEffCapSub0: "sin recargas",
    statEffCapSubN: "viajes/camión",
    statTimeUse: "Uso de tiempo",
    statTimeUseSub: "máx",
    statTimeUseSub2: "min/stop",

    // Alerts
    alertCapTitle: "órdenes sin ruta",
    alertCapEffective: "Cap. efectiva:",
    alertCapRequested: "Solicitados:",
    alertCapDeficit: "Déficit:",
    alertCapReload: "Activar recargas ampliaría la capacidad",
    alertTimeTitle: "Cuello de botella de tiempo:",
    alertTimeBody: "la ruta más cargada usa",
    alertTimeBody2: "% de su límite diario.",
    alertCapsTitle: "órdenes sin vehículo compatible",
    alertCapsMid: "— requieren una capability que ningún camión de la flota tiene:",
    alertMaxStopsTitle: "camión(es) al límite de paradas (max_stops)",
    alertMaxStopsBody: "tienen capacidad y tiempo disponibles pero no pueden recibir más órdenes.",

    // RouteCard
    routeLabel: "Ruta:",
    shiftLabel: "Jornada:",
    stopsLabel: "paradas",
    capLabel: "Cap.",
    timeLabel: "Tiempo",
    barCapacity: "Capacidad",
    barTime: "Tiempo",
    barStops: "Paradas",
    routeTimeWarning: "Ruta al límite de tiempo",
    routeStopsWarning: "Ruta al límite de paradas",

    // UnassignedTable
    colStopId: "Stop ID",
    colLat: "Lat",
    colLng: "Lng",
    colWindowStart: "Ventana inicio",
    colWindowEnd: "Ventana fin",
    colCapacity: "Capacidad",
    colServiceTime: "Tiempo serv.",
    colCapability: "Capability requerida",
    paginationOf: "de",
    paginationOrders: "órdenes",

    // Unassigned tab header
    unassignedTitle: "órdenes sin asignar",
    unassignedDesc: "Estas órdenes no pudieron ser incluidas en ninguna ruta",

    // AI tab
    aiTitle: "Diagnóstico con IA",
    aiDesc: "Análisis en lenguaje comercial para el equipo",
    aiEditPrompt: "✎ Editar prompt",
    aiBtnRun: "Ejecutar análisis IA",
    aiBtnRerun: "↺ Re-analizar",
    aiBtnLoading: "Analizando...",
    aiEmptyTitle: "Análisis IA disponible",
    aiEmptyDesc: "Ejecutá el análisis para obtener un diagnóstico en lenguaje comercial",
    aiLoadingTitle: "Procesando con Claude...",
    aiLoadingDesc: "Analizando",
    aiLoadingDesc2: "órdenes sin asignar",

    // Prompt manager
    promptEditorTitle: "Editor de prompt",
    promptUnsaved: "Sin guardar",
    promptRestore: "↺ Restaurar",
    promptVersions: "Versiones",
    promptNoVersions: "Ninguna versión guardada",
    promptLoad: "Cargar",
    promptHint: "Usa",
    promptHintWhere: "donde se inyectarán los datos del request/response.",
    promptSaveNamePlaceholder: "Nombre de esta versión (ej: v3 foco en tiempo)",
    promptSaveBtn: "Guardar versión",
    promptApplyBtn: "✓ Aplicar",
    promptSaveNameWarn: "⚠ Escribe un nombre para la versión",
    promptSavedAs: "✓ Guardado como",
    promptLoaded: "Cargado:",
    promptApplied: "✓ Aplicado",

    // Analyze button (JSON mode)
    btnAnalyze: "Analizar →",

    // Config section
    configLabel: "Configuración del request",

    // File upload
    uploadFile: "📂 Subir archivo",

    // Routes log analyzer
    routesInputTitle: "Analizar logs de ruta",
    routesInputDesc: "Busca todos los eventos de una ruta: waypoints, mobile data, actualizaciones y pruebas de entrega.",
    labelRouteId: "Route ID",
    routesBtnSearch: "Buscar eventos",
    routesBtnSearching: "Buscando...",
    routesSummaryTitle: "Resumen de la ruta",
    routesSummaryAccount: "Cuenta",
    routesSummaryUser: "Usuario",
    routesSummaryDevice: "Dispositivo",
    routesSummaryApp: "App version",
    routesTimelineTitle: "Timeline de eventos",
    routesGapLabel: "Sin señal",
    routesGapMinutes: "min",
    routesTypeRouteUpdate: "Actualización de ruta",
    routesTypeWaypoint: "Waypoint",
    routesTypeMobile: "Mobile data",
    routesTypeDispatchCreate: "Creación de entrega",
    routesTypeDispatch: "Prueba de entrega",
    routesTypeOther: "Otro",
    routesNoEvents: "Sin eventos de este tipo",
    routesTotal: "eventos encontrados",
    routesExpandBtn: "Ver parámetros",
    routesCollapseBtn: "Ocultar",
    routesStartedAt: "Iniciada",
    routesStartedYes: "Ruta iniciada",
    routesDispatches: "despachos",
    routesStartCoords: "Coordenadas inicio",
  },
  en: {
    // Navbar
    navSubtitle: "Support Diagnostics",
    newAnalysis: "← New analysis",
    confirmDiscard: "Discard the analysis and start over?",

    // Log type selector
    selectorTitle: "What do you want to analyze?",
    selectorSubtitle: "Choose the log type to start the diagnostic",
    selectorComingSoon: "Coming soon",
    selectorAvailable: "Available",

    // Input mode toggle
    modeJson: "📋 Paste JSON",
    modeKibana: "🔍 Search in Kibana",

    // Load card
    loadTitle: "Load routing data",
    loadDescJson: "Paste the request and response JSON from the DT algorithm.",
    loadDescKibana: "Search the log directly in Kibana by plan_id.",

    // Kibana form labels
    labelPlanId: "Plan ID",
    labelCluster: "Cluster",
    labelTimeRange: "Time range",
    labelRelative: "Relative",
    labelAbsolute: "Absolute",
    labelAmount: "Amount",
    labelUnit: "Unit",
    labelHours: "Hours",
    labelDays: "Days",
    labelFrom: "From",
    labelTo: "To",
    btnSearch: "Search",
    btnSearching: "Searching...",
    footerIndex: "Index:",
    footerLast: "Searching the last",
    footerHours: "hour(s)",
    footerDays: "day(s)",

    // Tabs
    tabRoutes: "Assigned routes",
    tabUnassigned: "Unassigned",
    tabAI: "AI Analysis",
    tabPrompt: "Prompt",

    // StatCards
    statRequested: "Requested",
    statRequestedSub: "orders in the request",
    statAssigned: "Assigned",
    statAssignedSub: "of total",
    statUnassigned: "Unassigned",
    statUnassignedSub: "without route",
    statEffCap: "Eff. capacity",
    statEffCapSub0: "no reloads",
    statEffCapSubN: "trips/truck",
    statTimeUse: "Time use",
    statTimeUseSub: "max",
    statTimeUseSub2: "min/stop",

    // Alerts
    alertCapTitle: "orders without route",
    alertCapEffective: "Eff. capacity:",
    alertCapRequested: "Requested:",
    alertCapDeficit: "Deficit:",
    alertCapReload: "Enabling reloads would expand capacity",
    alertTimeTitle: "Time bottleneck:",
    alertTimeBody: "the most loaded route uses",
    alertTimeBody2: "% of its daily limit.",
    alertCapsTitle: "orders without compatible vehicle",
    alertCapsMid: "— they require a capability no truck in the fleet has:",
    alertMaxStopsTitle: "truck(s) at stop limit (max_stops)",
    alertMaxStopsBody: "have available capacity and time but cannot accept more orders.",

    // RouteCard
    routeLabel: "Route:",
    shiftLabel: "Shift:",
    stopsLabel: "stops",
    capLabel: "Cap.",
    timeLabel: "Time",
    barCapacity: "Capacity",
    barTime: "Time",
    barStops: "Stops",
    routeTimeWarning: "Route at time limit",
    routeStopsWarning: "Route at stop limit",

    // UnassignedTable
    colStopId: "Stop ID",
    colLat: "Lat",
    colLng: "Lng",
    colWindowStart: "Window start",
    colWindowEnd: "Window end",
    colCapacity: "Capacity",
    colServiceTime: "Service time",
    colCapability: "Required capability",
    paginationOf: "of",
    paginationOrders: "orders",

    // Unassigned tab header
    unassignedTitle: "unassigned orders",
    unassignedDesc: "These orders could not be included in any route",

    // AI tab
    aiTitle: "AI Diagnostics",
    aiDesc: "Commercial-language analysis for the team",
    aiEditPrompt: "✎ Edit prompt",
    aiBtnRun: "Run AI analysis",
    aiBtnRerun: "↺ Re-analyze",
    aiBtnLoading: "Analyzing...",
    aiEmptyTitle: "AI Analysis available",
    aiEmptyDesc: "Run the analysis to get a commercial-language diagnosis",
    aiLoadingTitle: "Processing with Claude...",
    aiLoadingDesc: "Analyzing",
    aiLoadingDesc2: "unassigned orders",

    // Prompt manager
    promptEditorTitle: "Prompt editor",
    promptUnsaved: "Unsaved",
    promptRestore: "↺ Restore",
    promptVersions: "Versions",
    promptNoVersions: "No saved versions",
    promptLoad: "Load",
    promptHint: "Use",
    promptHintWhere: "where the request/response data will be injected.",
    promptSaveNamePlaceholder: "Version name (e.g. v3 time focus)",
    promptSaveBtn: "Save version",
    promptApplyBtn: "✓ Apply",
    promptSaveNameWarn: "⚠ Enter a name for this version",
    promptSavedAs: "✓ Saved as",
    promptLoaded: "Loaded:",
    promptApplied: "✓ Applied",

    // Analyze button (JSON mode)
    btnAnalyze: "Analyze →",

    // Config section
    configLabel: "Request configuration",

    // File upload
    uploadFile: "📂 Upload file",

    // Routes log analyzer
    routesInputTitle: "Analyze route logs",
    routesInputDesc: "Search all events for a route: waypoints, mobile data, updates and proof of delivery.",
    labelRouteId: "Route ID",
    routesBtnSearch: "Search events",
    routesBtnSearching: "Searching...",
    routesSummaryTitle: "Route summary",
    routesSummaryAccount: "Account",
    routesSummaryUser: "User",
    routesSummaryDevice: "Device",
    routesSummaryApp: "App version",
    routesTimelineTitle: "Event timeline",
    routesGapLabel: "No signal",
    routesGapMinutes: "min",
    routesTypeRouteUpdate: "Route update",
    routesTypeWaypoint: "Waypoint",
    routesTypeMobile: "Mobile data",
    routesTypeDispatchCreate: "Delivery creation",
    routesTypeDispatch: "Proof of delivery",
    routesTypeOther: "Other",
    routesNoEvents: "No events of this type",
    routesTotal: "events found",
    routesExpandBtn: "Show parameters",
    routesCollapseBtn: "Hide",
    routesStartedAt: "Started at",
    routesStartedYes: "Route started",
    routesDispatches: "dispatches",
    routesStartCoords: "Start coordinates",
  },
};

// ─── Default prompt ────────────────────────────────────────────────────────────
function getDefaultPrompt(lang) {
  if (lang === "en") {
    return `You are an expert in last-mile logistics. Analyze the following routing result and explain, in clear language for a commercial team with no technical background, why some orders could not be assigned to any truck.

When you use technical concepts, briefly define them in parentheses the first time they appear.

{{DATA_CONTEXT}}

Reply in English using EXCLUSIVELY bullets (lists with "-"). Do not use running prose. Be direct and concrete.

## Executive summary
- What happened and how many orders could not be delivered
- Main cause in one line
- Key metric (% assigned, capacity deficit, etc.)

## Why were orders left without a route?
- One bullet per identified cause
- Include concrete numbers (how many orders each cause affects)
- If there is a capability mismatch, mention it explicitly

## Recommendations
- Maximum 3 actions ordered by impact
- Format: **Action** — estimated additional orders it would cover

Avoid jargon. If you must use a technical term, briefly explain it in parentheses.`;
  }
  return `Eres un experto en logística de última milla. Analiza el siguiente resultado de ruteo y explica, en lenguaje claro para un equipo comercial sin conocimientos técnicos, por qué hay pedidos que no pudieron ser asignados a ningún camión.

Cuando uses conceptos técnicos, defínelos brevemente entre paréntesis la primera vez que aparezcan.

{{DATA_CONTEXT}}

Responde en español usando EXCLUSIVAMENTE bullets (listas con "-"). No uses párrafos de texto corrido. Sé directo y concreto.

## Resumen ejecutivo
- Qué pasó y cuántos pedidos no se pudieron entregar
- Causa principal en una línea
- Métrica clave (% asignado, déficit de capacidad, etc.)

## ¿Por qué quedaron pedidos sin ruta?
- Una bullet por cada causa identificada
- Incluí números concretos (cuántos pedidos afecta cada causa)
- Si hay mismatch de capabilities, mencionalo explícitamente

## Recomendaciones
- Máximo 3 acciones ordenadas por impacto
- Formato: **Acción** — estimado de pedidos adicionales que cubriría

Evita tecnicismos. Si debes usar un término técnico, explícalo brevemente entre paréntesis.`;
}

// ─── localStorage ──────────────────────────────────────────────────────────────
const LS_KEY = "dt-analyzer:prompt-versions";
function loadVersions() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]"); }
  catch { return []; }
}
function saveVersions(v) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(v)); }
  catch { console.warn("localStorage no disponible"); }
}

// ─── Parse helpers ─────────────────────────────────────────────────────────────
function parseData(reqJson, resJson) {
  const reqSrc = reqJson._source?.dt_request?.route ?? reqJson.route ?? reqJson;
  const resSrc = resJson._source?.dt_response ?? resJson.dt_response ?? resJson;

  const trucks = reqSrc.trucks ?? [];
  const stops  = reqSrc.stops  ?? [];
  const config = reqSrc.config ?? {};
  const constraints = reqSrc.constraints ?? {};
  const routes = resSrc.routes ?? [];

  const reqIds = new Set(stops.map((s) => s.id));
  const assignedIds = new Set();
  routes.forEach((r) => (r.stops ?? []).forEach((s) => { if (s.type === "order") assignedIds.add(s.id); }));
  const unassignedIds   = [...reqIds].filter((id) => !assignedIds.has(id));
  const unassignedStops = stops.filter((s) => unassignedIds.includes(s.id));

  const reloadMaxCount    = config.reload_max_count ?? constraints.reload_max_count ?? trucks[0]?.reload_max_count ?? 0;
  const tripsPerTruck     = reloadMaxCount + 1;
  const totalCapacity     = trucks.reduce((a, t) => a + (t.size1 ?? 0), 0);
  const effectiveCapacity = totalCapacity * tripsPerTruck;
  const usedCapacity      = routes.reduce((a, r) => a + (r.total_size1 ?? 0), 0);

  const enrichedRoutes = routes.map((r, i) => {
    const truck     = trucks.find((t) => t.truck_name === r.truck_name);
    const maxTime   = truck?.max_time_limit ?? config.max_time_limit ?? null;
    const maxStops  = truck?.max_stops ?? config.max_stops ?? null;
    const timeUtil  = maxTime ? ((r.total_time / maxTime) * 100) : null;
    const orderStops = (r.stops ?? []).filter((s) => s.type === "order");
    const stopsUtil  = maxStops ? ((orderStops.length / maxStops) * 100) : null;
    return { ...r, orderStops, orderCount: orderStops.length, truck, maxTime, maxStops, timeUtil, stopsUtil, color: routeColor(i) };
  });

  // Rutas que están al límite de max_stops (pueden tener cap/tiempo libre pero no admiten más)
  const maxStopsLimitedRoutes = enrichedRoutes.filter(
    (r) => r.maxStops != null && r.orderCount >= r.maxStops
  );

  const timeUtils      = enrichedRoutes.filter((r) => r.timeUtil !== null).map((r) => r.timeUtil);
  const maxTimeUtil    = timeUtils.length ? Math.max(...timeUtils) : null;
  const avgTimeUtil    = timeUtils.length ? timeUtils.reduce((a, b) => a + b, 0) / timeUtils.length : null;
  const avgServiceTime = stops.length ? stops.reduce((a, s) => a + (s.service_time ?? 0), 0) / stops.length : 0;
  const maxTimeLimitPerTruck = trucks[0]?.max_time_limit ?? null;

  // Capabilities analysis
  const truckCaps = trucks.map((t) => ({
    name: t.truck_name,
    caps: new Set((t.capability ?? t.capabilities ?? "").toString().split(",").map((c) => c.trim()).filter(Boolean)),
  }));
  const allTruckCaps = new Set(truckCaps.flatMap((t) => [...t.caps]));
  const stopsWithCaps = stops.filter((s) => s.required_capability);
  const capMismatchStops = stopsWithCaps.filter((s) => {
    const required = s.required_capability.split(",").map((c) => c.trim()).filter(Boolean);
    return !truckCaps.some((t) => required.every((cap) => t.caps.has(cap)));
  });

  // Per-truck timing overhead
  const truckTimings = trucks.map((t) => ({
    name:        t.truck_name,
    load_time:   t.load_time   ?? config.load_time   ?? 0,
    unload_time: t.unload_time ?? config.unload_time ?? 0,
    reload_time: t.reload_time ?? config.reload_time ?? 0,
    max_time:    t.max_time_limit ?? config.max_time_limit ?? null,
  })).map((t) => ({
    ...t,
    effective_delivery_time: t.max_time != null
      ? t.max_time - t.load_time - t.unload_time - (t.reload_time * (reloadMaxCount))
      : null,
  }));

  const toHHMM = (min) => {
    const h = Math.floor(min / 60), m = min % 60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
  };

  return {
    trucks, stops, config, constraints,
    routes: enrichedRoutes,
    reqIds, assignedIds, unassignedIds, unassignedStops,
    totalCapacity, effectiveCapacity, usedCapacity,
    reloadMaxCount, tripsPerTruck,
    avgServiceTime, maxTimeUtil, avgTimeUtil,
    maxTimeLimitPerTruck, toHHMM,
    truckTimings, capMismatchStops, allTruckCaps, stopsWithCaps, maxStopsLimitedRoutes,
    stats: {
      totalStops: stops.length,
      assignedStops: assignedIds.size,
      unassignedStops: unassignedIds.length,
      assignmentRate: ((assignedIds.size / stops.length) * 100).toFixed(1),
      truckCount: trucks.length,
      totalCapacity, effectiveCapacity,
      capacityUtil: ((usedCapacity / effectiveCapacity) * 100).toFixed(1),
      maxTimeUtil:  maxTimeUtil?.toFixed(0) ?? "N/A",
      avgTimeUtil:  avgTimeUtil?.toFixed(0) ?? "N/A",
      capMismatches: capMismatchStops.length,
    },
  };
}

// ─── Build DATA_CONTEXT ────────────────────────────────────────────────────────
function buildDataContext(parsed) {
  const { stats, trucks, config, constraints, routes, unassignedStops,
          reloadMaxCount, tripsPerTruck, avgServiceTime,
          truckTimings, capMismatchStops, allTruckCaps, stopsWithCaps,
          maxStopsLimitedRoutes } = parsed;

  const sample = unassignedStops.slice(0, 20).map((s) => ({
    id: s.id,
    window: `${s.window1_start}-${s.window1_end}`,
    size1: s.size1,
    service_time: s.service_time,
    required_capability: s.required_capability || null,
  }));

  const timingLines = truckTimings.map((t) =>
    `  ${t.name}: max_time=${t.max_time??'?'}min, load=${t.load_time}min, unload=${t.unload_time}min, reload=${t.reload_time}min → tiempo efectivo para entregas=${t.effective_delivery_time??'?'}min`
  ).join("\n");

  const capLines = trucks.map((t) => {
    const caps = (t.capability ?? t.capabilities ?? "");
    return `  ${t.truck_name}: capabilities="${caps || 'ninguna'}"`;
  }).join("\n");

  return `## CAPACIDAD Y RECARGAS
- reload_max_count = ${reloadMaxCount} → ${tripsPerTruck} viaje(s)/camión/día
- Capacidad física por camión: ${trucks[0]?.size1} · Efectiva con recargas: ${(trucks[0]?.size1??0)*tripsPerTruck}
- Capacidad efectiva total flota: ${stats.effectiveCapacity} (${trucks.length} camiones × ${(trucks[0]?.size1??0)*tripsPerTruck})
- Capacidad utilizada: ${stats.capacityUtil}%

## ANÁLISIS DE TIEMPO POR CAMIÓN
${timingLines}
- Nota: load_time y unload_time son tiempos en depósito que reducen el tiempo disponible para entregas. reload_time se descuenta por cada recarga adicional.
- Tiempo de servicio promedio por stop: ${avgServiceTime.toFixed(1)} min
- Tiempo mínimo si se asignaran todos los stops (solo servicio): ${(parsed.stops.length * avgServiceTime).toFixed(0)} min
- Utilización de tiempo promedio de rutas: ${stats.avgTimeUtil}%
- Utilización de tiempo máxima (ruta más cargada): ${stats.maxTimeUtil}%
- Detalle por ruta: ${routes.map((r) => `${r.truck_name}: ${Math.round(r.total_time)}/${r.maxTime??"?"}min (${r.timeUtil?.toFixed(0)??"?"}%)`).join(", ")}

## CAPABILITIES (restricciones de tipo de vehículo)
- Capacidades disponibles en la flota: ${[...allTruckCaps].join(", ") || "ninguna definida"}
${capLines}
- Stops que requieren capability específica: ${stopsWithCaps.length}
- Stops sin ningún camión compatible (mismatch): ${capMismatchStops.length}
${capMismatchStops.length > 0 ? `- Detalle mismatches: ${capMismatchStops.slice(0,10).map((s)=>`${s.id}(requiere: ${s.required_capability})`).join(", ")}` : ""}

## MAX_STOPS (límite de paradas por camión)
${trucks.some((t) => t.max_stops != null)
  ? trucks.map((t) => `- ${t.truck_name}: max_stops=${t.max_stops ?? "sin límite"} · paradas asignadas=${routes.find((r)=>r.truck_name===t.truck_name)?.orderCount??0}`).join("\n")
  : "- max_stops no definido en ningún camión"}
${maxStopsLimitedRoutes.length > 0
  ? `- IMPORTANTE: ${maxStopsLimitedRoutes.length} camión(es) están al límite de max_stops con capacidad y tiempo aún disponibles: ${maxStopsLimitedRoutes.map((r)=>`${r.truck_name}(${r.orderCount}/${r.maxStops} stops, cap usada=${r.total_size1}/${r.truck?.size1}, tiempo=${Math.round(r.total_time)}/${r.maxTime??'?'}min)`).join(", ")}`
  : "- Ningún camión alcanzó su límite de max_stops"}

## DATOS DEL REQUEST
- Camiones: ${trucks.length} · ${trucks.map((t) => `${t.truck_name}(cap=${t.size1},max_time=${t.max_time_limit}min,max_stops=${t.max_stops??'∞'})`).join(", ")}
- Total stops solicitados: ${stats.totalStops}
- Config: ${Object.entries(config).map(([k,v])=>`${k}=${v}`).join(", ")}
- Constraints: country_code=${constraints.country_code}, route_mode=${constraints.route_mode}

## RESULTADO
- Asignados: ${stats.assignedStops} (${stats.assignmentRate}%) · Sin asignar: ${stats.unassignedStops} (${(100-parseFloat(stats.assignmentRate)).toFixed(1)}%)
- Rutas generadas: ${routes.map((r)=>`${r.truck_name}: ${r.orderCount} stops, cap=${r.total_size1}/${r.truck?.size1??50}, t=${Math.round(r.total_time)}min`).join("; ")}

## MUESTRA STOPS SIN ASIGNAR (${sample.length} de ${unassignedStops.length}):
${JSON.stringify(sample, null, 2)}`;
}

// ─── AI call ──────────────────────────────────────────────────────────────────
async function runAIAnalysis(parsed, promptTemplate, setAnalysis, setLoading) {
  setLoading(true);
  setAnalysis("");
  const fullPrompt = promptTemplate.replace("{{DATA_CONTEXT}}", buildDataContext(parsed));
  try {
    const resp = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: fullPrompt }] }),
    });
    const data = await resp.json();
    if (data.error) throw new Error(data.error);
    setAnalysis(data.content?.map((c) => c.text || "").join("") || "Sin respuesta.");
  } catch (err) {
    setAnalysis(`❌ Error: ${err.message}`);
  } finally {
    setLoading(false);
  }
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const labelStyle = {
  fontSize: 11, fontWeight: 500, color: C.textMuted,
  textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: C.sans,
};

const btnPrimary = {
  background: C.blue, color: "#fff", border: "none",
  borderRadius: 20, padding: "9px 22px",
  fontFamily: C.sans, fontSize: 13, fontWeight: 600,
  cursor: "pointer", letterSpacing: "0.01em",
  boxShadow: `0 1px 2px rgba(0,82,204,0.35)`,
};

const btnGhost = {
  background: "transparent", border: `1px solid ${C.border}`, color: C.textSec,
  borderRadius: 8, padding: "7px 14px",
  fontFamily: C.sans, fontSize: 12, fontWeight: 500, cursor: "pointer",
};

// ─── UI Components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: "16px 20px", minWidth: 130, flex: 1,
      boxShadow: C.shadow, borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ ...labelStyle, marginBottom: 8 }}>{label}</div>
        {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
      </div>
      <div style={{ color, fontSize: 28, fontWeight: 700, fontFamily: C.sans, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: C.textMuted, fontSize: 11, marginTop: 6, fontFamily: C.sans }}>{sub}</div>}
    </div>
  );
}

function Bar({ pct, color }) {
  return (
    <div style={{ background: C.borderLight, borderRadius: 99, height: 4 }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.5s ease" }} />
    </div>
  );
}

function Badge({ children, color, bg }) {
  return (
    <span style={{
      background: bg, color, border: `1px solid ${color}22`,
      borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 600, fontFamily: C.sans,
    }}>{children}</span>
  );
}

function JsonInput({ label, value, onChange, t }) {
  const [drag, setDrag] = useState(false);
  const readFile = (f) => { const r = new FileReader(); r.onload = (e) => onChange(e.target.result); r.readAsText(f); };
  return (
    <div style={{ flex: 1, minWidth: 260 }}>
      <div style={{ ...labelStyle, marginBottom: 8 }}>{label}</div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) readFile(f); }}
        style={{
          border: `1.5px dashed ${drag ? C.blue : C.border}`,
          borderRadius: 10, background: drag ? C.blueBg : C.bg, position: "relative",
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        <textarea value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={`Pegar JSON del ${label}...`}
          style={{
            width: "100%", height: 160, background: "transparent", border: "none",
            outline: "none", color: C.textSec, fontFamily: C.mono, fontSize: 12,
            padding: 14, resize: "vertical", boxSizing: "border-box", lineHeight: 1.5,
          }} />
        <label style={{ position: "absolute", bottom: 8, right: 12, color: C.blue, fontSize: 11, fontFamily: C.sans, cursor: "pointer", fontWeight: 500 }}>
          <input type="file" accept=".json" aria-label={`Subir archivo JSON para ${label}`} style={{ display: "none" }} onChange={(e) => { const f = e.target.files[0]; if (f) readFile(f); }} />
          {t ? t("uploadFile") : "📂 Subir archivo"}
        </label>
      </div>
    </div>
  );
}

function RouteCard({ route, toHHMM, t }) {
  const capPct   = ((route.total_size1 / (route.truck?.size1 || 50)) * 100);
  const timePct  = route.timeUtil ?? 0;
  const stopsPct = route.stopsUtil ?? null;
  const timeColor  = timePct  > 90 ? C.red : timePct  > 70 ? C.amber : C.green;
  const stopsColor = stopsPct != null ? (stopsPct >= 100 ? C.red : stopsPct > 80 ? C.amber : C.green) : null;
  const isWarning     = timePct > 90;
  const isStopsMaxed  = route.maxStops != null && route.orderCount >= route.maxStops;
  const tr = t ?? ((k) => k);
  return (
    <div style={{
      background: C.card, borderRadius: 12,
      border: `1px solid ${isWarning ? C.red+"44" : C.border}`,
      boxShadow: isWarning ? `0 0 0 3px ${C.red}11` : C.shadow,
      padding: "16px 18px", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: route.color, flexShrink: 0 }} />
          <div>
            <div style={{ color: C.text, fontWeight: 700, fontSize: 14, fontFamily: C.sans }}>{route.truck_name}</div>
            <div style={{ color: C.textMuted, fontSize: 11, fontFamily: C.mono, marginTop: 1 }}>
              <span style={{ fontFamily: C.sans, fontSize: 10 }}>{tr("routeLabel")} </span>
              {toHHMM(Math.floor(route.start_time))} – {toHHMM(Math.floor(route.end_time))}
            </div>
            {route.truck?.start_time != null && route.truck?.end_time != null && (
              <div style={{ color: C.textMuted, fontSize: 10, fontFamily: C.sans, marginTop: 2 }}>
                {tr("shiftLabel")} {toHHMM(route.truck.start_time)} – {toHHMM(route.truck.end_time)}
              </div>
            )}
          </div>
        </div>
        <Badge color={C.green} bg={C.greenBg}>{fmt(route.orderCount)} {tr("stopsLabel")}</Badge>
      </div>

      {/* Métricas compactas */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 11, color: C.textSec, fontFamily: C.sans }}>
        <span>{tr("capLabel")} <strong style={{ color: C.text }}>{fmt(route.total_size1)}/{fmt(route.truck?.size1||50)}</strong></span>
        <span style={{ color: C.border }}>·</span>
        <span>{tr("timeLabel")} <strong style={{ color: timeColor }}>{toHHMM(Math.round(route.total_time))}/{route.maxTime != null ? toHHMM(route.maxTime) : "?"}</strong></span>
      </div>

      {/* Barras de progreso */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { label: tr("barCapacity"), pct: capPct,   color: capPct > 95 ? C.red : C.blue },
          { label: tr("barTime"),     pct: timePct,  color: timeColor },
          ...(stopsPct != null ? [{ label: `${tr("barStops")} (${route.orderCount}/${route.maxStops})`, pct: stopsPct, color: stopsColor }] : []),
        ].map(({ label, pct, color }) => (
          <div key={label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: C.textMuted, fontFamily: C.sans }}>{label}</span>
              <span style={{ fontSize: 10, color, fontWeight: 600, fontFamily: C.sans }}>{pct.toFixed(0)}%</span>
            </div>
            <Bar pct={pct} color={color} />
          </div>
        ))}
      </div>
      {(isWarning || isStopsMaxed) && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
          {isWarning && (
            <div style={{ fontSize: 11, color: C.red, fontFamily: C.sans, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
              ⚠ {tr("routeTimeWarning")}
            </div>
          )}
          {isStopsMaxed && (
            <div style={{ fontSize: 11, color: C.amber, fontFamily: C.sans, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
              🛑 {tr("routeStopsWarning")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UnassignedTable({ stops, toHHMM, t }) {
  const [page, setPage] = useState(0);
  const PER = 15, total = stops.length, pages = Math.ceil(total / PER);
  const tr = t ?? ((k) => k);
  const headers = [
    tr("colStopId"), tr("colLat"), tr("colLng"),
    tr("colWindowStart"), tr("colWindowEnd"),
    tr("colCapacity"), tr("colServiceTime"), tr("colCapability"),
  ];
  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table aria-label="Órdenes sin asignar" style={{ width: "100%", borderCollapse: "collapse", fontFamily: C.sans, fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border}` }}>
              {headers.map((h) => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", ...labelStyle, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stops.slice(page*PER,(page+1)*PER).map((s, i) => (
              <tr key={s.id} style={{ borderBottom: `1px solid ${C.borderLight}`, background: i%2 ? C.bg : C.card }}>
                <td style={{ padding: "9px 14px", color: C.blue, fontWeight: 600, whiteSpace: "nowrap", fontFamily: C.mono, fontSize: 12 }}>{s.id}</td>
                <td style={{ padding: "9px 14px", color: C.textSec, fontFamily: C.mono, fontSize: 12 }}>{Number(s.lat).toFixed(5)}</td>
                <td style={{ padding: "9px 14px", color: C.textSec, fontFamily: C.mono, fontSize: 12 }}>{Number(s.lng).toFixed(5)}</td>
                <td style={{ padding: "9px 14px", color: C.text }}>{toHHMM(s.window1_start)}</td>
                <td style={{ padding: "9px 14px", color: C.text }}>{toHHMM(s.window1_end)}</td>
                <td style={{ padding: "9px 14px", color: C.textSec }}>{fmt(s.size1)}</td>
                <td style={{ padding: "9px 14px", color: C.textSec }}>{fmt(s.service_time)}min</td>
                <td style={{ padding: "9px 14px" }}>
                  {s.required_capability
                    ? <Badge color={C.purple} bg={C.purpleBg}>{s.required_capability}</Badge>
                    : <span style={{ color: C.textMuted, fontSize: 11 }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, color: C.textMuted, fontSize: 12, fontFamily: C.sans }}>
          <span>{page*PER+1}–{Math.min((page+1)*PER,total)} {tr("paginationOf")} {total} {tr("paginationOrders")}</span>
          <div style={{ display: "flex", gap: 4 }}>
            {[...Array(pages)].map((_,i) => (
              <button key={i} onClick={() => setPage(i)} aria-label={`Página ${i+1}`} style={{
                width: 30, height: 30, borderRadius: 8,
                border: `1px solid ${i===page ? C.blue : C.border}`,
                background: i===page ? C.blue : C.card,
                color: i===page ? "#fff" : C.textSec,
                cursor: "pointer", fontFamily: C.sans, fontSize: 12, fontWeight: i===page?600:400,
              }}>{i+1}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MdText({ text }) {
  return (
    <div style={{ color: C.text, fontFamily: C.sans, fontSize: 14, lineHeight: 1.8 }}>
      {text.split("\n").map((line, i) => {
        if (line.startsWith("## "))  return <h3 key={i} style={{ color: C.blue, fontSize: 15, fontWeight: 700, margin: "22px 0 8px", borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>{line.slice(3)}</h3>;
        if (line.startsWith("### ")) return <h4 key={i} style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: "14px 0 4px" }}>{line.slice(4)}</h4>;
        if (line.match(/^\d+\.\s/))  return <p key={i} style={{ margin: "6px 0", paddingLeft: 4, color: C.text }}>{line.replace(/\*\*/g,"")}</p>;
        if (line.startsWith("- "))   return <p key={i} style={{ margin: "4px 0", paddingLeft: 14, color: C.textSec, display: "flex", gap: 6 }}><span style={{ color: C.blue }}>·</span>{line.slice(2).replace(/\*\*/g,"")}</p>;
        if (line.trim() === "")      return <div key={i} style={{ height: 8 }} />;
        return <p key={i} style={{ margin: "4px 0", color: C.textSec }}>{line.replace(/\*\*/g,"")}</p>;
      })}
    </div>
  );
}

// ─── Prompt Manager ───────────────────────────────────────────────────────────
function PromptManager({ currentPrompt, onChange, t, lang }) {
  const [versions, setVersions]       = useState(() => loadVersions());
  const [editText, setEditText]       = useState(currentPrompt);
  const [saveName, setSaveName]       = useState("");
  const [msg, setMsg]                 = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const tr = t ?? ((k) => k);

  useEffect(() => { setEditText(currentPrompt); }, [currentPrompt]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const handleSave = () => {
    if (!saveName.trim()) { flash(tr("promptSaveNameWarn")); return; }
    const v = { id: Date.now(), name: saveName.trim(), date: new Date().toLocaleString("es-CL"), prompt: editText };
    const updated = [v, ...versions].slice(0, 20);
    saveVersions(updated);
    setVersions(updated);
    onChange(editText);
    setSaveName("");
    flash(`${tr("promptSavedAs")} "${v.name}"`);
  };

  const handleLoad = (v) => {
    setEditText(v.prompt);
    onChange(v.prompt);
    setShowHistory(false);
    flash(`${tr("promptLoaded")} "${v.name}"`);
  };

  const handleDelete = (id) => {
    const updated = versions.filter((v) => v.id !== id);
    saveVersions(updated);
    setVersions(updated);
  };

  const isDirty = editText !== currentPrompt;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: C.sans }}>{tr("promptEditorTitle")}</span>
          {isDirty && <Badge color={C.amber} bg={C.amberBg}>{tr("promptUnsaved")}</Badge>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { const def = getDefaultPrompt(lang ?? "es"); setEditText(def); onChange(def); }} style={btnGhost}>
            {tr("promptRestore")}
          </button>
          <button onClick={() => setShowHistory(!showHistory)} style={{
            ...btnGhost,
            background: showHistory ? C.purpleBg : "transparent",
            border: `1px solid ${showHistory ? C.purple : C.border}`,
            color: showHistory ? C.purple : C.textSec,
          }}>
            🕓 {tr("promptVersions")} ({versions.length})
          </button>
        </div>
      </div>

      {showHistory && (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 16, maxHeight: 260, overflowY: "auto" }}>
          {versions.length === 0
            ? <div style={{ color: C.textMuted, fontFamily: C.sans, fontSize: 13, textAlign: "center", padding: "16px 0" }}>{tr("promptNoVersions")}</div>
            : versions.map((v) => (
              <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 6 }}>
                <div>
                  <div style={{ color: C.text, fontSize: 13, fontWeight: 600, fontFamily: C.sans }}>{v.name}</div>
                  <div style={{ color: C.textMuted, fontSize: 11, marginTop: 2, fontFamily: C.sans }}>{v.date}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => handleLoad(v)} style={{ ...btnPrimary, padding: "5px 14px", fontSize: 12, borderRadius: 8 }}>
                    {tr("promptLoad")}
                  </button>
                  <button onClick={() => handleDelete(v.id)} aria-label={`Eliminar versión ${v.name}`}
                    style={{ ...btnGhost, color: C.red, border: `1px solid ${C.red}33`, padding: "5px 10px" }}>
                    ✕
                  </button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      <textarea value={editText} onChange={(e) => setEditText(e.target.value)}
        style={{
          width: "100%", height: 320, background: C.bg, color: C.text,
          border: `1.5px solid ${isDirty ? C.blue : C.border}`,
          borderRadius: 10, outline: "none", fontFamily: C.mono, fontSize: 12,
          padding: 16, resize: "vertical", boxSizing: "border-box", lineHeight: 1.6,
          transition: "border-color 0.15s",
        }} />
      <div style={{ fontSize: 11, color: C.textMuted, fontFamily: C.sans, marginTop: 6 }}>
        {tr("promptHint")} <code style={{ background: C.blueBg, color: C.blue, padding: "1px 6px", borderRadius: 4, fontSize: 11 }}>{"{{DATA_CONTEXT}}"}</code> {tr("promptHintWhere")}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input value={saveName} onChange={(e) => setSaveName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder={tr("promptSaveNamePlaceholder")}
          style={{
            flex: 1, minWidth: 200, background: C.card, color: C.text,
            border: `1px solid ${C.border}`, borderRadius: 8, outline: "none",
            fontFamily: C.sans, fontSize: 13, padding: "9px 14px",
          }} />
        <button onClick={handleSave} style={btnPrimary}>
          {tr("promptSaveBtn")}
        </button>
        <button onClick={() => { onChange(editText); flash(tr("promptApplied")); }}
          style={{ ...btnGhost, color: C.green, border: `1px solid ${C.green}44` }}>
          {tr("promptApplyBtn")}
        </button>
      </div>
      {msg && <div style={{ marginTop: 10, color: msg.startsWith("⚠") ? C.amber : C.green, fontSize: 12, fontFamily: C.sans, fontWeight: 500 }}>{msg}</div>}
    </div>
  );
}

// ─── Kibana deep-link builder ──────────────────────────────────────────────────
const KIBANA_BASE = "https://kibana-latam.dispatchtrack.com";

// Kibana index pattern IDs por cluster (UUID de la index pattern en Kibana)
const KIBANA_INDEX_PATTERNS = {
  "3": "7265a6a0-66ba-11f0-91b1-efe3d2b9b56e",
};

function buildKibanaUrl(planId, cluster, timeMode, relativeValue, relativeUnit, kibanaFrom, kibanaTo) {
  let timeParam;
  if (timeMode === "relative") {
    const unit = relativeUnit === "hours" ? "h" : "d";
    timeParam = `from:now-${relativeValue}${unit},to:now`;
  } else {
    const from = kibanaFrom ? `'${new Date(kibanaFrom).toISOString()}'` : "now-1d";
    const to   = kibanaTo   ? `'${new Date(kibanaTo).toISOString()}'`   : "now";
    timeParam = `from:${from},to:${to}`;
  }
  const indexId = KIBANA_INDEX_PATTERNS[cluster];
  const indexParam = indexId ? `index:'${indexId}',` : "";
  const g = encodeURIComponent(`(filters:!(),refreshInterval:(pause:!t,value:0),time:(${timeParam}))`);
  const a = encodeURIComponent(`(columns:!(),filters:!(),${indexParam}interval:auto,query:(language:kuery,query:'${planId}'),sort:!(!(timestamp,desc)))`);
  return `${KIBANA_BASE}/app/discover#/?_g=${g}&_a=${a}`;
}

// ─── Route logs helpers ───────────────────────────────────────────────────────

function classifyRouteEvent(method, path) {
  if (!method || !path) return "other";
  if (method === "POST" && /\/waypoints/.test(path))          return "waypoint";
  if (method === "POST" && /\/mobile_data/.test(path))        return "mobile";
  if (method === "POST" && /\/dispatches(?!_s3)/.test(path))  return "dispatch_create";
  if (method === "PUT"  && /\/dispatches_s3/.test(path))      return "dispatch_s3";
  if (method === "PUT"  && /\/routes\/\d+$/.test(path))       return "route_update";
  return "other";
}

function parseRouteHits(hits) {
  return hits.map((hit) => {
    let log = {};
    try { log = JSON.parse(hit._source?.log ?? "{}"); } catch { /* ignore */ }
    const type = classifyRouteEvent(log.method, log.path);
    return {
      id:         log.request_id ?? hit._id,
      timestamp:  hit._source?.["@timestamp"] ?? log["@timestamp"] ?? "",
      type,
      method:     log.method ?? "",
      path:       log.path ?? "",
      status:     log.status ?? null,
      duration:   log.duration ?? null,
      user:       log.user ?? null,
      account:    log.account ?? null,
      device:     log.headers?.["X-DEVICE-NAME"] ?? null,
      appVersion: log.headers?.["X-APP-VERSION"] ?? null,
      osVersion:  log.headers?.["X-OS-VERSION"] ?? null,
      parameters: log.parameters ?? {},
      ip:         log.ip ?? null,
    };
  });
}

function detectWaypointGaps(events, thresholdMin = 5) {
  // Returns a Set of event IDs after which there is a gap
  const gaps = new Map(); // id → gap minutes
  const waypoints = events.filter((e) => e.type === "waypoint");
  for (let i = 1; i < waypoints.length; i++) {
    const diffMin = (new Date(waypoints[i].timestamp) - new Date(waypoints[i - 1].timestamp)) / 60000;
    if (diffMin >= thresholdMin) {
      gaps.set(waypoints[i - 1].id, Math.round(diffMin));
    }
  }
  return gaps;
}

const ROUTE_EVENT_META = {
  route_update:    { color: "#0052CC", bg: "#EBF2FF", icon: "🔄" },
  waypoint:        { color: "#1A7F4B", bg: "#EDFAF3", icon: "📍" },
  mobile:          { color: "#5E35B1", bg: "#EDE7F6", icon: "📱" },
  dispatch_s3:     { color: "#F27B42", bg: "#FEF0E8", icon: "📷" },
  dispatch_create: { color: "#0891B2", bg: "#E0F7FA", icon: "🏠" },
  other:           { color: "#A0AEC0", bg: "#F5F7FA", icon: "❓" },
};

// ─── Log Type Selector ────────────────────────────────────────────────────────
function LogTypeSelector({ lang, t, onSelect }) {
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 32px 60px" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: C.text, marginBottom: 8, fontFamily: C.sans }}>
          {t("selectorTitle")}
        </div>
        <div style={{ fontSize: 14, color: C.textSec, fontFamily: C.sans }}>
          {t("selectorSubtitle")}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
        {LOG_TYPES.map((type) => {
          const title = lang === "en" ? type.titleEn : type.titleEs;
          const desc  = lang === "en" ? type.descEn  : type.descEs;
          return (
            <button
              key={type.id}
              onClick={() => type.available && onSelect(type.id)}
              disabled={!type.available}
              style={{
                background: C.card,
                border: `1.5px solid ${type.available ? C.border : C.borderLight}`,
                borderRadius: 14,
                padding: "22px 24px",
                textAlign: "left",
                cursor: type.available ? "pointer" : "default",
                boxShadow: type.available ? C.shadowMd : "none",
                opacity: type.available ? 1 : 0.6,
                transition: "border-color 0.15s, box-shadow 0.15s",
                position: "relative",
                fontFamily: C.sans,
              }}
              onMouseEnter={(e) => { if (type.available) { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.boxShadow = `0 0 0 3px ${C.blue}18, ${C.shadowMd}`; } }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = type.available ? C.border : C.borderLight; e.currentTarget.style.boxShadow = type.available ? C.shadowMd : "none"; }}
            >
              {/* Badge disponibilidad */}
              <div style={{ position: "absolute", top: 16, right: 16 }}>
                {type.available
                  ? <span style={{ background: C.greenBg, color: C.green, border: `1px solid ${C.green}33`, borderRadius: 99, padding: "2px 10px", fontSize: 10, fontWeight: 700 }}>{t("selectorAvailable")}</span>
                  : <span style={{ background: C.bg, color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 99, padding: "2px 10px", fontSize: 10, fontWeight: 600 }}>{t("selectorComingSoon")}</span>
                }
              </div>

              {/* Ícono + título */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 28, lineHeight: 1 }}>{type.icon}</span>
                <span style={{ fontSize: 17, fontWeight: 700, color: type.available ? C.text : C.textMuted }}>{title}</span>
              </div>

              {/* Descripción */}
              <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.6 }}>
                {desc}
              </div>

              {/* Flecha solo en disponibles */}
              {type.available && (
                <div style={{ marginTop: 16, fontSize: 12, color: C.blue, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  Comenzar diagnóstico →
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Loading State ────────────────────────────────────────────────────────────
const LOADING_MESSAGES = [
  "Conectando con Kibana...",
  "Recuperando logs del clúster...",
  "Procesando los registros...",
  "Preparando la visualización...",
];

function LoadingState() {
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 2000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ textAlign: "center", padding: "56px 0" }}>
      <style>{`
        @keyframes ls-spin { to { transform: rotate(360deg); } }
        @keyframes ls-slide { 0%{left:-40%;width:40%} 60%{left:60%;width:60%} 100%{left:110%;width:10%} }
        @keyframes ls-fade { 0%,100%{opacity:0;transform:translateY(4px)} 15%,85%{opacity:1;transform:translateY(0)} }
      `}</style>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        border: `3px solid ${C.borderLight}`, borderTopColor: C.blue,
        animation: "ls-spin 0.8s linear infinite",
        margin: "0 auto 20px",
      }} />
      <div key={msgIdx} style={{
        fontSize: 14, fontWeight: 500, color: C.text, fontFamily: C.sans,
        marginBottom: 20, animation: "ls-fade 2s ease",
      }}>
        {LOADING_MESSAGES[msgIdx]}
      </div>
      <div style={{ width: 220, height: 3, background: C.borderLight, borderRadius: 99, margin: "0 auto", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", height: "100%", borderRadius: 99, background: C.blue,
          animation: "ls-slide 1.5s ease-in-out infinite",
        }} />
      </div>
    </div>
  );
}

// ─── Field Chart (one chart per numeric field) ────────────────────────────────
function FieldChart({ field, color, points, onPointClick, stepped = false }) {
  const [hoverInfo, setHoverInfo] = useState(null);
  const svgRef = useRef(null);

  const W = 760, H = 160;
  const PAD = { top: 14, right: 16, bottom: 30, left: 52 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const sorted = [...points].sort((a, b) => a.ts - b.ts);
  if (sorted.length === 0) return null;

  const minTs = sorted[0].ts.getTime();
  const maxTs = sorted[sorted.length - 1].ts.getTime();
  const tsRange = maxTs - minTs || 1;
  const vals = sorted.map((p) => p.val);
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const valRange = maxVal - minVal || 1;

  const xScale = (ts) => ((ts.getTime() - minTs) / tsRange) * innerW;
  const yScale = (v) => innerH - ((v - minVal) / valRange) * innerH;

  const buildPath = (pts) => {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${xScale(pts[0].ts)} ${yScale(pts[0].val)}`;
    const m = pts.map((p) => ({ x: xScale(p.ts), y: yScale(p.val) }));
    if (stepped) {
      let d = `M ${m[0].x} ${m[0].y}`;
      for (let i = 1; i < m.length; i++) d += ` H ${m[i].x} V ${m[i].y}`;
      return d;
    }
    let d = `M ${m[0].x} ${m[0].y}`;
    for (let i = 1; i < m.length; i++) {
      const cpx = (m[i - 1].x + m[i].x) / 2;
      d += ` C ${cpx} ${m[i - 1].y} ${cpx} ${m[i].y} ${m[i].x} ${m[i].y}`;
    }
    return d;
  };

  const buildArea = (pts) => {
    if (pts.length < 2) return "";
    const m = pts.map((p) => ({ x: xScale(p.ts), y: yScale(p.val) }));
    if (stepped) {
      let d = `M ${m[0].x} ${innerH} L ${m[0].x} ${m[0].y}`;
      for (let i = 1; i < m.length; i++) d += ` H ${m[i].x} V ${m[i].y}`;
      d += ` V ${innerH} Z`;
      return d;
    }
    let d = `M ${m[0].x} ${innerH} L ${m[0].x} ${m[0].y}`;
    for (let i = 1; i < m.length; i++) {
      const cpx = (m[i - 1].x + m[i].x) / 2;
      d += ` C ${cpx} ${m[i - 1].y} ${cpx} ${m[i].y} ${m[i].x} ${m[i].y}`;
    }
    d += ` L ${m[m.length - 1].x} ${innerH} Z`;
    return d;
  };

  const xTicks = (() => {
    const count = Math.min(5, sorted.length);
    return Array.from({ length: count }, (_, i) => {
      const frac = count === 1 ? 0 : i / (count - 1);
      return {
        x: frac * innerW,
        label: new Date(minTs + frac * tsRange).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }),
      };
    });
  })();

  const yTicks = Array.from({ length: 3 }, (_, i) => {
    const frac = i / 2;
    const v = minVal + frac * valRange;
    return { y: yScale(v), label: Math.round(v) === v ? String(Math.round(v)) : v.toFixed(1) };
  });

  const gradId = `fg-${field.replace(/[^a-zA-Z0-9]/g, "_")}`;

  const handleMouseMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const renderedX = e.clientX - rect.left;
    const svgInnerX = renderedX * (W / rect.width) - PAD.left;
    if (svgInnerX < 0 || svgInnerX > innerW) { setHoverInfo(null); return; }

    // Find bracketing points for interpolation
    const pxs = sorted.map((p) => xScale(p.ts));
    let li = 0;
    for (let i = 0; i < pxs.length; i++) {
      if (pxs[i] <= svgInnerX) li = i;
    }
    const ri = Math.min(li + 1, sorted.length - 1);

    let interpVal, nearEventId;
    if (li === ri) {
      interpVal = sorted[li].val;
      nearEventId = sorted[li].eventId;
    } else {
      const frac = (svgInnerX - pxs[li]) / (pxs[ri] - pxs[li]);
      interpVal = sorted[li].val + frac * (sorted[ri].val - sorted[li].val);
      nearEventId = frac < 0.5 ? sorted[li].eventId : sorted[ri].eventId;
    }

    const tsAtX = new Date(minTs + (svgInnerX / innerW) * tsRange);
    setHoverInfo({
      svgX: svgInnerX,
      renderedX,
      svgY: yScale(interpVal),
      value: interpVal,
      time: tsAtX.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
      eventId: nearEventId,
    });
  };

  const handleClick = () => {
    if (hoverInfo?.eventId && onPointClick) onPointClick(hoverInfo.eventId);
  };

  const linePath = buildPath(sorted);
  const areaPath = buildArea(sorted);

  const fmtVal = (v) => (Math.round(v) === v ? String(Math.round(v)) : v.toFixed(2));

  return (
    <div style={{ position: "relative", marginBottom: 20 }}>
      {/* Field label */}
      <div style={{ fontSize: 11, fontFamily: C.mono, color, fontWeight: 700, marginBottom: 4, userSelect: "none" }}>
        {field}
        <span style={{ color: C.textMuted, fontWeight: 400, marginLeft: 8 }}>
          {sorted.length} pts · {fmtVal(minVal)}–{fmtVal(maxVal)}
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", display: "block", cursor: hoverInfo && onPointClick ? "pointer" : "crosshair" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverInfo(null)}
        onClick={handleClick}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* Horizontal grid */}
          {yTicks.map((tick, i) => (
            <line key={i} x1={0} y1={tick.y} x2={innerW} y2={tick.y} stroke={C.border} strokeWidth={1} strokeDasharray="3 3" />
          ))}
          {/* Area fill */}
          <path d={areaPath} fill={`url(#${gradId})`} />
          {/* Line */}
          <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {/* Dots */}
          {sorted.length <= 40 && sorted.map((p, pi) => (
            <circle key={pi} cx={xScale(p.ts)} cy={yScale(p.val)} r={2.5} fill={color} stroke={C.card} strokeWidth={1.5} />
          ))}
          {/* Crosshair + hover dot */}
          {hoverInfo && (
            <>
              <line x1={hoverInfo.svgX} y1={0} x2={hoverInfo.svgX} y2={innerH} stroke={color} strokeWidth={1} strokeDasharray="3 3" opacity={0.7} />
              <circle cx={hoverInfo.svgX} cy={hoverInfo.svgY} r={4} fill={color} stroke={C.card} strokeWidth={2} />
            </>
          )}
          {/* Axes */}
          <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke={C.border} strokeWidth={1} />
          <line x1={0} y1={0} x2={0} y2={innerH} stroke={C.border} strokeWidth={1} />
          {/* X tick labels */}
          {xTicks.map((tick, i) => (
            <text key={i} x={tick.x} y={innerH + 14} textAnchor="middle" fontSize={9} fontFamily={C.mono} fill={C.textMuted}>{tick.label}</text>
          ))}
          {/* Y tick labels */}
          {yTicks.map((tick, i) => (
            <text key={i} x={-5} y={tick.y + 3} textAnchor="end" fontSize={9} fontFamily={C.mono} fill={C.textMuted}>{tick.label}</text>
          ))}
        </g>
      </svg>

      {/* Tooltip */}
      {hoverInfo && (() => {
        const svgRect = svgRef.current?.getBoundingClientRect() ?? { width: 400 };
        const left = Math.max(4, Math.min(hoverInfo.renderedX + 12, svgRect.width - 152));
        return (
          <div style={{
            position: "absolute", top: 30, left,
            pointerEvents: "none",
            background: C.card, border: `1px solid ${color}55`,
            borderRadius: 8, padding: "6px 10px", boxShadow: C.shadow,
            fontFamily: C.mono, fontSize: 11, zIndex: 10, minWidth: 140,
          }}>
            <div style={{ color, fontWeight: 700, fontSize: 10, marginBottom: 2 }}>{field}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{fmtVal(hoverInfo.value)}</div>
            <div style={{ color: C.textMuted, fontSize: 10, marginTop: 2 }}>{hoverInfo.time}</div>
            {onPointClick && (
              <div style={{ color: C.blue, fontSize: 10, marginTop: 4, fontFamily: C.sans }}>Click → ir al log</div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ─── Route Map ───────────────────────────────────────────────────────────────

function extractRouteMapData(events) {
  // Each waypoint event contains parameters.waypoints[] — flatten all points
  const trail = (events ?? [])
    .filter((e) => e.type === "waypoint")
    .flatMap((e) => {
      const arr = e.parameters?.waypoints;
      if (!Array.isArray(arr)) return [];
      return arr.map((w) => {
        const lat = parseFloat(w.latitude);
        const lng = parseFloat(w.longitude);
        if (isNaN(lat) || isNaN(lng)) return null;
        return { lat, lng, timestamp: w.sent_at ?? e.timestamp, speed: w.speed, heading: w.heading };
      }).filter(Boolean);
    })
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Start / end from route_update events
  let startCoord = null;
  let endCoord   = null;
  (events ?? [])
    .filter((e) => e.type === "route_update")
    .forEach((e) => {
      const r = e.parameters?.route ?? e.parameters ?? {};
      if (!startCoord && r.start_latitude) {
        const lat = parseFloat(r.start_latitude);
        const lng = parseFloat(r.start_longitude);
        if (!isNaN(lat) && !isNaN(lng)) startCoord = { lat, lng };
      }
      if (r.end_latitude) {
        const lat = parseFloat(r.end_latitude);
        const lng = parseFloat(r.end_longitude);
        if (!isNaN(lat) && !isNaN(lng)) endCoord = { lat, lng };
      }
    });

  // Fallback: use first/last trail point as start/end
  if (!startCoord && trail.length > 0) startCoord = trail[0];
  if (!endCoord   && trail.length > 0) endCoord   = trail[trail.length - 1];

  return { trail, startCoord, endCoord };
}

function RouteMap({ events }) {
  const mapRef      = useRef(null);
  const instanceRef = useRef(null);
  const [open, setOpen] = useState(false);

  const { trail, startCoord, endCoord } = extractRouteMapData(events);
  const hasData = trail.length > 0 || startCoord || endCoord;

  useEffect(() => {
    if (!open || !mapRef.current) return;
    if (!hasData) return;

    if (instanceRef.current) {
      instanceRef.current.remove();
      instanceRef.current = null;
    }

    const map = L.map(mapRef.current, { zoomControl: true });
    instanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
      maxZoom: 19,
    }).addTo(map);

    const allPoints = [];

    // Polyline trail
    if (trail.length > 1) {
      const latlngs = trail.map((p) => [p.lat, p.lng]);
      L.polyline(latlngs, { color: "#0052CC", weight: 3, opacity: 0.8 }).addTo(map);
      latlngs.forEach((ll) => allPoints.push(ll));

      // Intermediate dots (every 3rd)
      trail.forEach((p, i) => {
        if (i === 0 || i === trail.length - 1 || i % 3 !== 0) return;
        const speed = p.speed != null ? `<br/>Velocidad: ${p.speed} km/h` : "";
        const heading = p.heading != null ? `<br/>Rumbo: ${p.heading}°` : "";
        L.circleMarker([p.lat, p.lng], {
          radius: 4, color: "#fff", weight: 1.5, fillColor: "#306EF2", fillOpacity: 1,
        }).bindPopup(`Punto #${i + 1}<br/>${fmtTs(p.timestamp)}${speed}${heading}`).addTo(map);
      });
    } else if (trail.length === 1) {
      allPoints.push([trail[0].lat, trail[0].lng]);
    }

    // Start marker
    if (startCoord) {
      allPoints.push([startCoord.lat, startCoord.lng]);
      L.marker([startCoord.lat, startCoord.lng], { icon: makeIcon("🟢", "#1A7F4B") })
        .bindPopup("<b>Inicio de ruta</b>")
        .addTo(map);
    }

    // End marker
    if (endCoord && (endCoord.lat !== startCoord?.lat || endCoord.lng !== startCoord?.lng)) {
      allPoints.push([endCoord.lat, endCoord.lng]);
      L.marker([endCoord.lat, endCoord.lng], { icon: makeIcon("🔴", "#D93025") })
        .bindPopup("<b>Fin de ruta</b>")
        .addTo(map);
    }

    if (allPoints.length === 1) {
      map.setView(allPoints[0], 14);
    } else if (allPoints.length > 1) {
      map.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40] });
    }

    return () => { map.remove(); instanceRef.current = null; };
  }, [open, events]);

  const buttonStyle = {
    ...btnGhost,
    display: "flex", alignItems: "center", gap: 8,
    fontSize: 13, fontWeight: 600, color: C.blue,
    border: `1px solid ${C.blue}44`,
    background: open ? C.blueBg : "transparent",
    transition: "background 0.15s",
  };

  if (!hasData) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <button onClick={() => setOpen((v) => !v)} style={buttonStyle}>
        <span style={{ fontSize: 16 }}>{open ? "🗺️" : "🗺️"}</span>
        {open ? "Ocultar mapa de recorrido" : `Ver mapa de recorrido ${trail.length > 0 ? `(${trail.length} waypoints)` : ""}`}
        <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.7 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          marginTop: 10, background: C.card,
          border: `1px solid ${C.border}`, borderRadius: 12,
          overflow: "hidden", boxShadow: C.shadow,
        }}>
          {/* Legend */}
          <div style={{
            padding: "10px 16px", borderBottom: `1px solid ${C.borderLight}`,
            display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap",
            fontSize: 12, color: C.textSec, fontFamily: C.sans,
          }}>
            <span>🟢 Inicio de ruta</span>
            <span>🔴 Fin de ruta</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-block", width: 24, height: 3, background: "#0052CC", borderRadius: 2 }} />
              Trail GPS ({trail.length} puntos)
            </span>
          </div>
          <div style={{ position: "relative", isolation: "isolate" }}>
            <div ref={mapRef} style={{ width: "100%", height: 420 }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mobile Data Chart ────────────────────────────────────────────────────────
function MobileDataChart({ events, t, onPointClick }) {
  const [open, setOpen] = useState(false);
  const tr = t ?? ((k) => k);

  const CHART_COLORS = [C.blue, C.green, C.amber, C.purple, C.blueLight, C.red, "#0891B2", C.navy];

  const mobileEvents = (events ?? [])
    .filter((e) => e.type === "mobile" && e.timestamp)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Detect numeric fields across all mobile events
  const EXCLUDED_FIELDS = new Set(["route_id"]);
  const STEPPED_FIELDS  = new Set(["gps", "disk_remaining"]);
  const numericFields = (() => {
    const fieldSet = new Set();
    mobileEvents.forEach((e) => {
      Object.entries(e.parameters ?? {}).forEach(([k, v]) => {
        if (EXCLUDED_FIELDS.has(k)) return;
        if (typeof v === "boolean" || typeof v === "number" || (typeof v === "string" && v !== "" && !isNaN(Number(v)))) {
          fieldSet.add(k);
        }
      });
    });
    return [...fieldSet];
  })();

  // Build series: one per field, points include eventId for click-to-scroll
  const series = numericFields.map((field, fi) => {
    const points = mobileEvents.map((e) => {
      const raw = (e.parameters ?? {})[field];
      const val = raw != null ? (typeof raw === "boolean" ? (raw ? 1 : 0) : Number(raw)) : null;
      return val != null && !isNaN(val) ? { ts: new Date(e.timestamp), val, eventId: e.id } : null;
    }).filter(Boolean);
    return { field, color: CHART_COLORS[fi % CHART_COLORS.length], points, stepped: STEPPED_FIELDS.has(field) };
  }).filter((s) => s.points.length > 0);

  const buttonStyle = {
    ...btnGhost,
    display: "flex", alignItems: "center", gap: 8,
    fontSize: 13, fontWeight: 600, color: C.purple,
    border: `1px solid ${C.purple}44`,
    background: open ? C.purpleBg : "transparent",
    transition: "background 0.15s",
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <button onClick={() => setOpen((v) => !v)} style={buttonStyle}>
        <span>📊</span>
        <span>{tr("lang") === "en" ? "View mobile data charts" : "Ver gráficos mobile data"}</span>
        {series.length > 0 && (
          <span style={{ fontSize: 11, color: C.purple, opacity: 0.7, fontFamily: C.mono }}>
            {series.length} {series.length === 1 ? "campo" : "campos"}
          </span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.7 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          marginTop: 10, background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: "20px 20px 12px", boxShadow: C.shadow,
        }}>
          {mobileEvents.length === 0 || series.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: C.textMuted, fontFamily: C.sans }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📱</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.textSec, marginBottom: 4 }}>Sin datos mobile</div>
              <div style={{ fontSize: 12 }}>No hay eventos "mobile" con campos numéricos en este log.</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, color: C.textMuted, fontFamily: C.sans, marginBottom: 16 }}>
                {mobileEvents.length} eventos · {series.length} campos numéricos
                {onPointClick ? " · hover para valor exacto · click para ir al log" : " · hover para valor exacto"}
              </div>
              {series.map((s) => (
                <FieldChart key={s.field} field={s.field} color={s.color} points={s.points} onPointClick={onPointClick} stepped={s.stepped} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Uber Direct helpers ──────────────────────────────────────────────────────
function parseUberHits(hits) {
  return hits.map((hit) => {
    let log = {};
    try { log = JSON.parse(hit._source?.log ?? "{}"); } catch {}
    const params  = log.parameters ?? {};
    const data    = params.data ?? {};
    const pickup  = data.pickup  ?? {};
    const dropoff = data.dropoff ?? {};
    const courier = data.courier ?? {};
    return {
      id:                  log.request_id ?? hit._id,
      timestamp:           hit._source?.["@timestamp"] ?? "",
      uberCreated:         params.created ?? "",
      status:              data.status ?? params.status ?? "",
      externalId:          data.external_id ?? "",
      trackingUrl:         data.tracking_url ?? "",
      courierName:         courier.name ?? "",
      courierVehicleType:  courier.vehicle_type ?? "",
      courierVehicleMake:  courier.vehicle_make ?? "",
      courierVehicleModel: courier.vehicle_model ?? "",
      pickupAddress:       pickup.address ?? "",
      pickupName:          pickup.name ?? "",
      pickupStatus:        pickup.status ?? "",
      pickupStatusTs:      pickup.status_timestamp ?? "",
      pickupEta:           data.pickup_eta ?? "",
      pickupPicture:       pickup.verification?.picture?.image_url ?? "",
      dropoffAddress:      dropoff.address ?? "",
      dropoffName:         dropoff.name ?? "",
      dropoffPhone:        dropoff.phone_number ?? "",
      dropoffStatus:       dropoff.status ?? "",
      dropoffStatusTs:     dropoff.status_timestamp ?? "",
      dropoffEta:          data.dropoff_eta ?? "",
      dropoffPicture:      dropoff.verification?.picture?.image_url ?? "",
      dropoffSignature:    dropoff.verification?.signature?.image_url ?? "",
      undeliverableReason: data.undeliverable_reason ?? "",
      httpStatus:          log.status,
      duration:            log.duration,
    };
  });
}

const UBER_STATUS_META = {
  pending:         { color: "#A0AEC0", bg: "#F5F7FA",  icon: "⏳", label: "Pendiente" },
  pickup:          { color: "#F27B42", bg: "#FEF0E8",  icon: "🏪", label: "En pickup" },
  pickup_complete: { color: "#0052CC", bg: "#EBF2FF",  icon: "☑️", label: "Pickup completado" },
  dropoff:         { color: "#5E35B1", bg: "#EDE7F6",  icon: "🚗", label: "En entrega" },
  delivered:       { color: "#1A7F4B", bg: "#EDFAF3",  icon: "📦", label: "Entregado" },
  cancelled:       { color: "#D93025", bg: "#FFF0EF",  icon: "❌", label: "Cancelado" },
  returned:        { color: "#D93025", bg: "#FFF0EF",  icon: "↩️", label: "Devuelto" },
  undeliverable:   { color: "#D93025", bg: "#FFF0EF",  icon: "🚫", label: "No entregable" },
};

function uberStatusMeta(status) {
  return UBER_STATUS_META[status] ?? { color: "#A0AEC0", bg: "#F5F7FA", icon: "❓", label: status || "Desconocido" };
}

function fmtTs(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

function fmtTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

// ─── Uber Event Card ──────────────────────────────────────────────────────────
function UberEventCard({ event, index }) {
  const [expanded, setExpanded] = useState(false);
  const [imgErrors, setImgErrors] = useState({});
  const meta = uberStatusMeta(event.status);
  const pkMeta = uberStatusMeta(event.pickupStatus);
  const dkMeta = uberStatusMeta(event.dropoffStatus);

  const hasImg = (url) => url && url.trim() !== "" && !imgErrors[url];

  const ImgThumb = ({ url, label }) => {
    if (!hasImg(url)) return null;
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
        <img
          src={url} alt={label}
          onError={() => setImgErrors((e) => ({ ...e, [url]: true }))}
          style={{
            width: 52, height: 52, objectFit: "cover", borderRadius: 6,
            border: `1px solid ${C.border}`, cursor: "pointer",
          }}
        />
        <div style={{ fontSize: 9, color: C.textMuted, fontFamily: C.sans, textAlign: "center", marginTop: 2 }}>{label}</div>
      </a>
    );
  };

  return (
    <div style={{
      background: C.card, borderRadius: 10, border: `1px solid ${C.border}`,
      borderLeft: `3px solid ${meta.color}`, padding: "12px 16px", boxShadow: C.shadow,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.textMuted, fontFamily: C.mono }}>#{index + 1}</span>
          <span style={{
            background: meta.bg, color: meta.color, border: `1px solid ${meta.color}33`,
            borderRadius: 99, padding: "3px 12px", fontSize: 12, fontWeight: 700, fontFamily: C.sans,
          }}>{meta.icon} {meta.label}</span>
          <span style={{ fontSize: 11, color: C.textMuted, fontFamily: C.mono }}>{fmtTs(event.timestamp)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {event.httpStatus != null && (
            <span style={{ fontSize: 11, fontWeight: 600, fontFamily: C.mono, color: event.httpStatus < 300 ? C.green : C.red }}>
              {event.httpStatus}
            </span>
          )}
          {event.duration != null && (
            <span style={{ fontSize: 11, color: C.textMuted, fontFamily: C.mono }}>{event.duration.toFixed(0)}ms</span>
          )}
          {event.trackingUrl && (
            <a href={event.trackingUrl} target="_blank" rel="noopener noreferrer" style={{
              fontSize: 11, color: C.blue, fontFamily: C.sans, fontWeight: 500,
              textDecoration: "none", border: `1px solid ${C.blue}33`, borderRadius: 6,
              padding: "2px 8px", whiteSpace: "nowrap",
            }}>🔗 Tracking ↗</a>
          )}
        </div>
      </div>

      {/* Pickup / Dropoff columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Pickup */}
        <div style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, fontFamily: C.sans, letterSpacing: "0.06em", marginBottom: 6 }}>PICKUP</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{
              background: pkMeta.bg, color: pkMeta.color, border: `1px solid ${pkMeta.color}33`,
              borderRadius: 99, padding: "1px 8px", fontSize: 11, fontWeight: 600, fontFamily: C.sans,
            }}>{pkMeta.icon} {pkMeta.label}</span>
          </div>
          {event.pickupStatusTs && (
            <div style={{ fontSize: 11, color: C.textSec, fontFamily: C.mono, marginBottom: 3 }}>
              ✅ {fmtTime(event.pickupStatusTs)}
            </div>
          )}
          {event.pickupEta && (
            <div style={{ fontSize: 11, color: C.textSec, fontFamily: C.mono, marginBottom: 3 }}>
              ETA: {fmtTime(event.pickupEta)}
            </div>
          )}
          {hasImg(event.pickupPicture) && (
            <div style={{ marginTop: 6 }}>
              <ImgThumb url={event.pickupPicture} label="Foto pickup" />
            </div>
          )}
        </div>

        {/* Dropoff */}
        <div style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, fontFamily: C.sans, letterSpacing: "0.06em", marginBottom: 6 }}>DROPOFF</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{
              background: dkMeta.bg, color: dkMeta.color, border: `1px solid ${dkMeta.color}33`,
              borderRadius: 99, padding: "1px 8px", fontSize: 11, fontWeight: 600, fontFamily: C.sans,
            }}>{dkMeta.icon} {dkMeta.label}</span>
          </div>
          {event.dropoffStatusTs && (
            <div style={{ fontSize: 11, color: C.textSec, fontFamily: C.mono, marginBottom: 3 }}>
              ✅ {fmtTime(event.dropoffStatusTs)}
            </div>
          )}
          {event.dropoffEta && (
            <div style={{ fontSize: 11, color: C.textSec, fontFamily: C.mono, marginBottom: 3 }}>
              ETA: {fmtTime(event.dropoffEta)}
            </div>
          )}
          {(hasImg(event.dropoffPicture) || hasImg(event.dropoffSignature)) && (
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <ImgThumb url={event.dropoffPicture}   label="Foto" />
              <ImgThumb url={event.dropoffSignature} label="Firma" />
            </div>
          )}
          {event.undeliverableReason && (
            <div style={{ fontSize: 11, color: C.red, fontFamily: C.sans, marginTop: 4 }}>
              Motivo: {event.undeliverableReason}
            </div>
          )}
        </div>
      </div>

      {/* Expand JSON */}
      <button onClick={() => setExpanded(!expanded)} style={{
        marginTop: 10, background: "transparent", border: "none", color: C.blue,
        fontSize: 11, fontFamily: C.sans, cursor: "pointer", padding: 0, fontWeight: 500,
      }}>
        {expanded ? "Ocultar JSON ▴" : "Ver JSON completo ▾"}
      </button>
      {expanded && (
        <pre style={{
          marginTop: 8, background: C.bg, borderRadius: 8, padding: 12,
          fontSize: 10, fontFamily: C.mono, color: C.textSec,
          overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all",
          border: `1px solid ${C.border}`, maxHeight: 300, overflowY: "auto",
        }}>
          {JSON.stringify(event, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ─── Uber Logs View ───────────────────────────────────────────────────────────
function UberLogsView({ uberLogs, uberLoading, error, cluster, setCluster,
  timeMode, setTimeMode, relativeValue, setRelativeValue,
  relativeUnit, setRelativeUnit, kibanaFrom, setKibanaFrom,
  kibanaTo, setKibanaTo, onSearch }) {

  const [orderCode, setOrderCode] = useState("");

  const handleSearch = () => onSearch(orderCode.trim());

  // Order info from first event in array = most recent (sort desc)
  const info = uberLogs ? uberLogs[0] : null;
  const finalStatus = info ? uberStatusMeta(info.status) : null;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 32px 60px" }}>

      {/* Form */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, boxShadow: C.shadow, marginBottom: 24 }}>
        <img src="/uber_direct.jpg" alt="Uber Direct" style={{ height: 32, width: "auto", objectFit: "contain", marginBottom: 8 }} />
        <div style={{ fontSize: 13, color: C.textSec, marginBottom: 20 }}>
          Ingresa el código de la orden para ver el historial de actualizaciones recibidas desde Uber Direct.
        </div>

        {/* Row 1: Order code + Cluster */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
          <div style={{ flex: "0 0 200px" }}>
            <div style={{ ...labelStyle, marginBottom: 8 }}>Código de orden</div>
            <input
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="ej: 39531776"
              style={{
                width: "100%", background: C.bg, color: C.text,
                border: `1px solid ${C.border}`, borderRadius: 8,
                outline: "none", fontFamily: C.mono, fontSize: 14,
                padding: "9px 14px", boxSizing: "border-box",
              }} />
          </div>
          <div style={{ flex: "0 0 160px" }}>
            <div style={{ ...labelStyle, marginBottom: 8 }}>Cluster</div>
            <select value={cluster} onChange={(e) => setCluster(e.target.value)}
              style={{
                width: "100%", background: C.bg, color: C.text,
                border: `1px solid ${C.border}`, borderRadius: 8,
                outline: "none", fontFamily: C.sans, fontSize: 13,
                padding: "9px 12px", boxSizing: "border-box", cursor: "pointer",
              }}>
              <option value="staging">staging</option>
              {[1,2,3,4,5,6,7].map(n => <option key={n} value={String(n)}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Row 2: Time range */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={{ ...labelStyle, marginBottom: 8 }}>Rango de tiempo</div>
            <div style={{ display: "flex", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 3, gap: 2 }}>
              {[{ id: "relative", label: "Relativo" }, { id: "absolute", label: "Absoluto" }].map((m) => (
                <button key={m.id} onClick={() => setTimeMode(m.id)} style={{
                  background: timeMode === m.id ? C.blue : "transparent",
                  color: timeMode === m.id ? "#fff" : C.textSec,
                  border: "none", borderRadius: 6, padding: "5px 12px",
                  fontFamily: C.sans, fontSize: 12, fontWeight: 500, cursor: "pointer",
                }}>{m.label}</button>
              ))}
            </div>
          </div>
          {timeMode === "relative" && (
            <>
              <div style={{ flex: "0 0 90px" }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Cantidad</div>
                <input type="number" min={1} max={90} value={relativeValue}
                  onChange={(e) => setRelativeValue(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: "100%", background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", fontFamily: C.mono, fontSize: 14, padding: "9px 12px", boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: "0 0 120px" }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Unidad</div>
                <select value={relativeUnit} onChange={(e) => setRelativeUnit(e.target.value)}
                  style={{ width: "100%", background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", fontFamily: C.sans, fontSize: 13, padding: "9px 12px", boxSizing: "border-box", cursor: "pointer" }}>
                  <option value="hours">Horas</option>
                  <option value="days">Días</option>
                </select>
              </div>
            </>
          )}
          {timeMode === "absolute" && (
            <>
              <div style={{ flex: "0 0 190px" }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Desde</div>
                <input type="datetime-local" value={kibanaFrom} onChange={(e) => setKibanaFrom(e.target.value)}
                  style={{ width: "100%", background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", fontFamily: C.sans, fontSize: 12, padding: "9px 10px", boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: "0 0 190px" }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Hasta</div>
                <input type="datetime-local" value={kibanaTo} onChange={(e) => setKibanaTo(e.target.value)}
                  style={{ width: "100%", background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", fontFamily: C.sans, fontSize: 12, padding: "9px 10px", boxSizing: "border-box" }} />
              </div>
            </>
          )}
          <button onClick={handleSearch} disabled={uberLoading || !orderCode.trim()}
            style={{
              ...btnPrimary,
              background: uberLoading || !orderCode.trim() ? C.border : C.blue,
              color: uberLoading || !orderCode.trim() ? C.textMuted : "#fff",
              cursor: uberLoading || !orderCode.trim() ? "not-allowed" : "pointer",
              boxShadow: uberLoading || !orderCode.trim() ? "none" : btnPrimary.boxShadow,
              padding: "9px 24px",
            }}>
            {uberLoading ? "Buscando…" : "Buscar"}
          </button>
        </div>

        {error && (
          <div role="alert" style={{
            marginTop: 14, color: C.red, fontFamily: C.mono, fontSize: 12,
            padding: "10px 14px", background: C.redBg, borderRadius: 8, border: `1px solid ${C.red}33`,
          }}>{error}</div>
        )}
      </div>

      {uberLoading && <LoadingState />}

      {/* Results */}
      {uberLogs && info && (
        <>
          {/* Order info panel */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", boxShadow: C.shadow, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: C.mono, marginBottom: 2 }}>
                  {info.externalId || "—"}
                </div>
                <div style={{ fontSize: 12, color: C.textMuted, fontFamily: C.sans }}>
                  {uberLogs.length} actualización{uberLogs.length !== 1 ? "es" : ""} de Uber Direct
                </div>
              </div>
              {finalStatus && (
                <span style={{
                  background: finalStatus.bg, color: finalStatus.color,
                  border: `1px solid ${finalStatus.color}33`,
                  borderRadius: 99, padding: "4px 14px", fontSize: 13, fontWeight: 700, fontFamily: C.sans,
                }}>
                  {finalStatus.icon} Estado final: {finalStatus.label}
                </span>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Courier */}
              {info.courierName && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, fontFamily: C.sans, letterSpacing: "0.06em", marginBottom: 4 }}>COURIER</div>
                  <div style={{ fontSize: 13, color: C.text, fontFamily: C.sans, fontWeight: 600 }}>{info.courierName}</div>
                  {(info.courierVehicleMake || info.courierVehicleModel) && (
                    <div style={{ fontSize: 12, color: C.textSec, fontFamily: C.sans }}>
                      {[info.courierVehicleMake, info.courierVehicleModel, info.courierVehicleType].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
              )}
              {/* Tracking */}
              {info.trackingUrl && (
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <a href={info.trackingUrl} target="_blank" rel="noopener noreferrer" style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: C.blueBg, color: C.blue, border: `1px solid ${C.blue}33`,
                    borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 500,
                    fontFamily: C.sans, textDecoration: "none",
                  }}>🔗 Ver tracking Uber ↗</a>
                </div>
              )}
              {/* Pickup address */}
              {info.pickupAddress && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, fontFamily: C.sans, letterSpacing: "0.06em", marginBottom: 4 }}>PICKUP</div>
                  {info.pickupName && <div style={{ fontSize: 13, color: C.text, fontFamily: C.sans, fontWeight: 600 }}>{info.pickupName}</div>}
                  <div style={{ fontSize: 12, color: C.textSec, fontFamily: C.sans }}>{info.pickupAddress}</div>
                </div>
              )}
              {/* Dropoff address */}
              {info.dropoffAddress && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, fontFamily: C.sans, letterSpacing: "0.06em", marginBottom: 4 }}>DROPOFF</div>
                  <div style={{ fontSize: 13, color: C.text, fontFamily: C.sans, fontWeight: 600 }}>
                    {info.dropoffName}
                    {info.dropoffPhone && <span style={{ fontWeight: 400, color: C.textSec, marginLeft: 8 }}>{info.dropoffPhone}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: C.textSec, fontFamily: C.sans }}>{info.dropoffAddress}</div>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div style={{ ...labelStyle, marginBottom: 12 }}>Timeline de actualizaciones</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {uberLogs.map((event, i) => (
              <UberEventCard key={event.id} event={event} index={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Route Logs View ──────────────────────────────────────────────────────────
function RouteEventCard({ event, gapAfter, t, highlighted }) {
  const [expanded, setExpanded] = useState(false);
  const meta = ROUTE_EVENT_META[event.type] ?? ROUTE_EVENT_META.other;
  const tr   = t ?? ((k) => k);

  const typeLabel = {
    route_update:    tr("routesTypeRouteUpdate"),
    waypoint:        tr("routesTypeWaypoint"),
    mobile:          tr("routesTypeMobile"),
    dispatch_create: tr("routesTypeDispatchCreate"),
    dispatch_s3:     tr("routesTypeDispatch"),
    other:           tr("routesTypeOther"),
  }[event.type] ?? event.type;

  const time = event.timestamp
    ? new Date(event.timestamp).toLocaleString(undefined, {
        year: "numeric", month: "short", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false,
      })
    : "—";

  // Key fields per event type
  const renderBody = () => {
    const p = event.parameters ?? {};
    if (event.type === "route_update") {
      const r = p.route ?? {};
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px", fontSize: 12, color: C.textSec, fontFamily: C.sans }}>
          {r.ended        === true && <span style={{ color: C.red, fontWeight: 700 }}>🔴 Ruta finalizada</span>}
          {r.ended_at              && <span>Fin: <strong style={{ color: C.text }}>{r.ended_at}</strong></span>}
          {r.started      != null && !r.ended && <span>🟢 {tr("routesStartedYes")}</span>}
          {r.started_at   && !r.ended && <span>{tr("routesStartedAt")}: <strong style={{ color: C.text }}>{r.started_at}</strong></span>}
          {r.truck_id              && <span>Truck ID: <strong style={{ color: C.text }}>{r.truck_id}</strong></span>}
          {r.truck_driver_id       && <span>Driver ID: <strong style={{ color: C.text }}>{r.truck_driver_id}</strong></span>}
          {r.dispatches            && <span>{r.dispatches.length} {tr("routesDispatches")}</span>}
          {r.end_latitude          && <span>Coords fin: <strong style={{ color: C.text, fontFamily: C.mono }}>{Number(r.end_latitude).toFixed(5)}, {Number(r.end_longitude).toFixed(5)}</strong></span>}
          {r.start_latitude && !r.ended && <span>{tr("routesStartCoords")}: <strong style={{ color: C.text, fontFamily: C.mono }}>{Number(r.start_latitude).toFixed(5)}, {Number(r.start_longitude).toFixed(5)}</strong></span>}
        </div>
      );
    }
    if (event.type === "dispatch") {
      const d = p.dispatch ?? p;
      return (
        <div style={{ fontSize: 12, color: C.textSec, fontFamily: C.sans, display: "flex", gap: 16 }}>
          {d.id   && <span>Dispatch ID: <strong style={{ color: C.text }}>{d.id}</strong></span>}
          {d.slot != null && <span>Slot: <strong style={{ color: C.text }}>{d.slot}</strong></span>}
        </div>
      );
    }
    // Waypoint & mobile: render parameters as key-value pairs
    const entries = Object.entries(p).filter(([, v]) => v != null && typeof v !== "object");
    if (entries.length === 0) return null;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 12, color: C.textSec, fontFamily: C.mono }}>
        {entries.map(([k, v]) => (
          <span key={k}><span style={{ color: C.textMuted }}>{k}:</span> <strong style={{ color: C.text }}>{String(v)}</strong></span>
        ))}
      </div>
    );
  };

  return (
    <>
      <div id={`event-card-${event.id}`} style={{
        background: C.card, borderRadius: 10,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${meta.color}`,
        padding: "12px 16px",
        boxShadow: highlighted ? `0 0 0 3px ${C.blue}55, ${C.shadow}` : C.shadow,
        transition: "box-shadow 0.4s ease",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>{meta.icon}</span>
            <span style={{
              background: meta.bg, color: meta.color,
              border: `1px solid ${meta.color}33`,
              borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 700, fontFamily: C.sans,
            }}>{typeLabel}</span>
            <span style={{ fontSize: 11, color: C.textMuted, fontFamily: C.mono }}>{time}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {event.status != null && (
              <span style={{
                fontSize: 11, fontWeight: 600, fontFamily: C.mono,
                color: event.status < 300 ? C.green : event.status < 500 ? C.amber : C.red,
              }}>{event.status}</span>
            )}
            {event.duration != null && (
              <span style={{ fontSize: 11, color: C.textMuted, fontFamily: C.mono }}>{event.duration.toFixed(0)}ms</span>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ marginBottom: Object.keys(event.parameters ?? {}).length ? 8 : 0 }}>
          {renderBody()}
        </div>

        {/* Expandir parámetros crudos */}
        {Object.keys(event.parameters ?? {}).length > 0 && (
          <button onClick={() => setExpanded(!expanded)} style={{
            background: "transparent", border: "none", color: C.blue, fontSize: 11,
            fontFamily: C.sans, cursor: "pointer", padding: 0, fontWeight: 500,
          }}>
            {expanded ? tr("routesCollapseBtn") : tr("routesExpandBtn")} ▾
          </button>
        )}
        {expanded && (
          <pre style={{
            marginTop: 8, background: C.bg, borderRadius: 8, padding: 12,
            fontSize: 11, fontFamily: C.mono, color: C.textSec,
            overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all",
            border: `1px solid ${C.border}`, maxHeight: 300, overflowY: "auto",
          }}>
            {JSON.stringify(event.parameters, null, 2)}
          </pre>
        )}
      </div>

      {/* Gap indicator */}
      {gapAfter != null && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "4px 8px",
          color: gapAfter >= 10 ? C.red : C.amber,
          fontSize: 12, fontFamily: C.sans, fontWeight: 600,
        }}>
          <div style={{ flex: 1, height: 1, background: gapAfter >= 10 ? C.red+"44" : C.amber+"44" }} />
          <span>{gapAfter >= 10 ? "🔴" : "🟡"} {tr("routesGapLabel")}: {gapAfter} {tr("routesGapMinutes")}</span>
          <div style={{ flex: 1, height: 1, background: gapAfter >= 10 ? C.red+"44" : C.amber+"44" }} />
        </div>
      )}
    </>
  );
}

// ─── Waypoints Uber helpers ───────────────────────────────────────────────────
function parseWaypointHits(hits) {
  return hits.map((hit) => {
    let log = {};
    try { log = JSON.parse(hit._source?.log ?? "{}"); } catch {}
    const params  = log.parameters ?? {};
    const data    = params.data ?? {};
    const courier = data.courier ?? {};
    const pickup  = data.pickup  ?? {};
    const dropoff = data.dropoff ?? {};
    const loc = params.location ?? courier.location ?? {};
    return {
      id:                  log.request_id ?? hit._id,
      timestamp:           hit._source?.["@timestamp"] ?? "",
      lat:                 typeof loc.lat === "number" ? loc.lat : parseFloat(loc.lat),
      lng:                 typeof loc.lng === "number" ? loc.lng : parseFloat(loc.lng),
      status:              data.status ?? "",
      externalId:          data.external_id ?? "",
      trackingUrl:         data.tracking_url ?? "",
      courierName:         courier.name ?? "",
      courierVehicleType:  courier.vehicle_type ?? "",
      courierVehicleMake:  courier.vehicle_make ?? "",
      courierVehicleModel: courier.vehicle_model ?? "",
      courierVehicleColor: courier.vehicle_color ?? "",
      courierPlate:        courier.vehicle_license_plate ?? "",
      courierRating:       courier.rating ?? "",
      courierImgHref:      courier.img_href ?? "",
      pickupAddress:       pickup.address ?? "",
      pickupName:          pickup.name ?? "",
      pickupLat:           pickup.location?.lat,
      pickupLng:           pickup.location?.lng,
      pickupEta:           data.pickup_eta ?? "",
      dropoffAddress:      dropoff.address ?? "",
      dropoffName:         dropoff.name ?? "",
      dropoffPhone:        dropoff.phone_number ?? "",
      dropoffLat:          dropoff.location?.lat,
      dropoffLng:          dropoff.location?.lng,
      dropoffEta:          data.dropoff_eta ?? "",
      httpStatus:          log.status,
    };
  }).filter((w) => !isNaN(w.lat) && !isNaN(w.lng) && w.lat != null && w.lng != null);
}


// ─── Map helpers ──────────────────────────────────────────────────────────────
function makeIcon(emoji, bg) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${bg};color:#fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:15px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35)">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function WaypointMap({ waypoints }) {
  const mapRef      = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || waypoints.length === 0) return;

    // Destroy previous instance before re-creating
    if (instanceRef.current) {
      instanceRef.current.remove();
      instanceRef.current = null;
    }

    const map = L.map(mapRef.current, { zoomControl: true });
    instanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
      maxZoom: 19,
    }).addTo(map);

    const latlngs = waypoints.map((w) => [w.lat, w.lng]);

    // Polyline trail
    L.polyline(latlngs, { color: "#0052CC", weight: 4, opacity: 0.85 }).addTo(map);

    // Waypoint dots
    waypoints.forEach((w, i) => {
      const isFirst = i === 0;
      const isLast  = i === waypoints.length - 1;
      if (!isFirst && !isLast && i % 3 !== 0) return; // thin out intermediate dots
      const color  = isFirst ? "#1A7F4B" : isLast ? "#0052CC" : "#306EF2";
      const radius = isFirst || isLast ? 9 : 5;
      L.circleMarker([w.lat, w.lng], {
        radius, color: "#fff", weight: 2, fillColor: color, fillOpacity: 1,
      }).bindPopup(
        `<b>${isFirst ? "Inicio" : isLast ? "Fin" : `#${i + 1}`}</b><br/>${fmtTs(w.timestamp)}<br/>Estado: ${w.status || "—"}`
      ).addTo(map);
    });

    // Pickup marker
    const first = waypoints[0];
    if (first?.pickupLat && first?.pickupLng) {
      L.marker([first.pickupLat, first.pickupLng], { icon: makeIcon("🏪", "#F27B42") })
        .bindPopup(`<b>Pickup</b><br/>${first.pickupAddress || "—"}`)
        .addTo(map);
    }

    // Dropoff marker
    if (first?.dropoffLat && first?.dropoffLng) {
      L.marker([first.dropoffLat, first.dropoffLng], { icon: makeIcon("📦", "#1A7F4B") })
        .bindPopup(`<b>Dropoff</b><br/>${first.dropoffAddress || "—"}`)
        .addTo(map);
    }

    // Fit all points
    const allPoints = [...latlngs];
    if (first?.pickupLat)  allPoints.push([first.pickupLat,  first.pickupLng]);
    if (first?.dropoffLat) allPoints.push([first.dropoffLat, first.dropoffLng]);
    map.fitBounds(L.latLngBounds(allPoints), { padding: [36, 36] });

    return () => { map.remove(); instanceRef.current = null; };
  }, [waypoints]);

  return (
    <div style={{ position: "relative", isolation: "isolate", borderRadius: 12, overflow: "hidden" }}>
      <div ref={mapRef} style={{ width: "100%", height: 440 }} />
    </div>
  );
}

// ─── Waypoints Uber View ──────────────────────────────────────────────────────
function WaypointsUberView({ waypointLogs, waypointLoading, error, cluster, setCluster,
  timeMode, setTimeMode, relativeValue, setRelativeValue,
  relativeUnit, setRelativeUnit, kibanaFrom, setKibanaFrom,
  kibanaTo, setKibanaTo, onSearch }) {

  const [orderCode, setOrderCode] = useState("");
  const handleSearch = () => onSearch(orderCode.trim());

  // Summary from first waypoint (all share the same trip metadata)
  const info = waypointLogs?.[0] ?? null;
  const last = waypointLogs ? waypointLogs[waypointLogs.length - 1] : null;
  const finalStatus = last ? uberStatusMeta(last.status) : null;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 32px 60px" }}>

      {/* Form */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, boxShadow: C.shadow, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 20 }}>📍</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: C.sans }}>Waypoints Uber Direct</span>
        </div>
        <div style={{ fontSize: 13, color: C.textSec, marginBottom: 20 }}>
          Ingresa el código de la orden para visualizar el recorrido GPS del courier en el mapa.
        </div>

        {/* Row 1: Order code + Cluster */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
          <div style={{ flex: "0 0 200px" }}>
            <div style={{ ...labelStyle, marginBottom: 8 }}>Código de orden</div>
            <input
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="ej: 52561809843164"
              style={{
                width: "100%", background: C.bg, color: C.text,
                border: `1px solid ${C.border}`, borderRadius: 8,
                outline: "none", fontFamily: C.mono, fontSize: 14,
                padding: "9px 14px", boxSizing: "border-box",
              }} />
          </div>
          <div style={{ flex: "0 0 160px" }}>
            <div style={{ ...labelStyle, marginBottom: 8 }}>Cluster</div>
            <select value={cluster} onChange={(e) => setCluster(e.target.value)}
              style={{
                width: "100%", background: C.bg, color: C.text,
                border: `1px solid ${C.border}`, borderRadius: 8,
                outline: "none", fontFamily: C.sans, fontSize: 13,
                padding: "9px 12px", boxSizing: "border-box", cursor: "pointer",
              }}>
              <option value="staging">staging</option>
              {[1,2,3,4,5,6,7].map(n => <option key={n} value={String(n)}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Row 2: Time range */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={{ ...labelStyle, marginBottom: 8 }}>Rango de tiempo</div>
            <div style={{ display: "flex", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 3, gap: 2 }}>
              {[{ id: "relative", label: "Relativo" }, { id: "absolute", label: "Absoluto" }].map((m) => (
                <button key={m.id} onClick={() => setTimeMode(m.id)} style={{
                  background: timeMode === m.id ? C.blue : "transparent",
                  color: timeMode === m.id ? "#fff" : C.textSec,
                  border: "none", borderRadius: 6, padding: "5px 12px",
                  fontFamily: C.sans, fontSize: 12, fontWeight: 500, cursor: "pointer",
                }}>{m.label}</button>
              ))}
            </div>
          </div>
          {timeMode === "relative" && (
            <>
              <div style={{ flex: "0 0 90px" }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Cantidad</div>
                <input type="number" min={1} max={90} value={relativeValue}
                  onChange={(e) => setRelativeValue(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: "100%", background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", fontFamily: C.mono, fontSize: 14, padding: "9px 12px", boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: "0 0 120px" }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Unidad</div>
                <select value={relativeUnit} onChange={(e) => setRelativeUnit(e.target.value)}
                  style={{ width: "100%", background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", fontFamily: C.sans, fontSize: 13, padding: "9px 12px", boxSizing: "border-box", cursor: "pointer" }}>
                  <option value="hours">Horas</option>
                  <option value="days">Días</option>
                </select>
              </div>
            </>
          )}
          {timeMode === "absolute" && (
            <>
              <div style={{ flex: "0 0 190px" }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Desde</div>
                <input type="datetime-local" value={kibanaFrom} onChange={(e) => setKibanaFrom(e.target.value)}
                  style={{ width: "100%", background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", fontFamily: C.sans, fontSize: 12, padding: "9px 10px", boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: "0 0 190px" }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Hasta</div>
                <input type="datetime-local" value={kibanaTo} onChange={(e) => setKibanaTo(e.target.value)}
                  style={{ width: "100%", background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", fontFamily: C.sans, fontSize: 12, padding: "9px 10px", boxSizing: "border-box" }} />
              </div>
            </>
          )}
          <button onClick={handleSearch} disabled={waypointLoading || !orderCode.trim()}
            style={{
              ...btnPrimary,
              background: waypointLoading || !orderCode.trim() ? C.border : C.blue,
              color: waypointLoading || !orderCode.trim() ? C.textMuted : "#fff",
              cursor: waypointLoading || !orderCode.trim() ? "not-allowed" : "pointer",
              boxShadow: waypointLoading || !orderCode.trim() ? "none" : btnPrimary.boxShadow,
              padding: "9px 24px",
            }}>
            {waypointLoading ? "Buscando…" : "Buscar"}
          </button>
        </div>

        {error && (
          <div role="alert" style={{
            marginTop: 14, color: C.red, fontFamily: C.mono, fontSize: 12,
            padding: "10px 14px", background: C.redBg, borderRadius: 8, border: `1px solid ${C.red}33`,
          }}>{error}</div>
        )}
      </div>

      {/* Loading */}
      {waypointLoading && <LoadingState />}

      {/* Results */}
      {waypointLogs && info && (
        <>
          {/* Trip summary panel */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, boxShadow: C.shadow, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, color: C.textMuted, fontFamily: C.sans, marginBottom: 4 }}>Orden Uber Direct</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: C.mono }}>{info.externalId || orderCode}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {finalStatus && (
                  <span style={{
                    background: finalStatus.bg, color: finalStatus.color,
                    border: `1px solid ${finalStatus.color}33`,
                    borderRadius: 20, padding: "4px 14px",
                    fontSize: 12, fontWeight: 600, fontFamily: C.sans,
                  }}>{finalStatus.icon} {finalStatus.label}</span>
                )}
                <span style={{ fontSize: 12, color: C.textMuted, fontFamily: C.sans }}>
                  {waypointLogs.length} waypoint{waypointLogs.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              {/* Courier */}
              <div style={{ background: C.bg, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Courier</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: C.sans }}>{info.courierName || "—"}</div>
                {info.courierVehicleType && (
                  <div style={{ fontSize: 12, color: C.textSec, marginTop: 4 }}>
                    {info.courierVehicleType === "motorcycle" ? "🏍️" : "🚗"} {[info.courierVehicleMake, info.courierVehicleModel].filter(Boolean).join(" ") || info.courierVehicleType}
                    {info.courierVehicleColor && ` · ${info.courierVehicleColor}`}
                  </div>
                )}
                {info.courierPlate && (
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, fontFamily: C.mono }}>{info.courierPlate}</div>
                )}
                {info.courierRating && (
                  <div style={{ fontSize: 12, color: C.amber, marginTop: 4 }}>★ {info.courierRating}</div>
                )}
              </div>

              {/* Trip times */}
              <div style={{ background: C.bg, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Tiempo del viaje</div>
                {(() => {
                  const startTs = waypointLogs[0]?.timestamp;
                  const endTs   = waypointLogs[waypointLogs.length - 1]?.timestamp;
                  const diffMs  = startTs && endTs ? new Date(endTs) - new Date(startTs) : null;
                  const durStr  = diffMs != null ? (() => {
                    const totalSec = Math.round(diffMs / 1000);
                    const h = Math.floor(totalSec / 3600);
                    const m = Math.floor((totalSec % 3600) / 60);
                    const s = totalSec % 60;
                    return h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
                  })() : null;
                  return (
                    <>
                      <div style={{ fontSize: 12, color: C.textSec, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: C.text }}>Inicio:</span> {fmtTs(startTs)}
                      </div>
                      <div style={{ fontSize: 12, color: C.textSec, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: C.text }}>Fin:</span> {fmtTs(endTs)}
                      </div>
                      {durStr && (
                        <div style={{ fontSize: 12, color: C.textSec, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${C.border}` }}>
                          <span style={{ fontWeight: 600, color: C.text }}>Duración total:</span>{" "}
                          <span style={{ fontFamily: C.mono, color: C.blue }}>{durStr}</span>
                        </div>
                      )}
                      {info.trackingUrl && (
                        <a href={info.trackingUrl} target="_blank" rel="noreferrer"
                          style={{ fontSize: 12, color: C.blue, textDecoration: "none", display: "inline-block", marginTop: 6 }}>
                          🔗 Tracking URL
                        </a>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Pickup / Dropoff */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: C.orangeBg, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.orange}33` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.orange, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>🏪 Pickup</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{info.pickupName || "—"}</div>
                <div style={{ fontSize: 12, color: C.textSec, marginTop: 4 }}>{info.pickupAddress || "—"}</div>
                {info.pickupEta && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>ETA: {fmtTs(info.pickupEta)}</div>}
              </div>
              <div style={{ background: C.greenBg, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.green}33` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.green, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>📦 Dropoff</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{info.dropoffName || "—"}</div>
                <div style={{ fontSize: 12, color: C.textSec, marginTop: 4 }}>{info.dropoffAddress || "—"}</div>
                {info.dropoffPhone && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>📞 {info.dropoffPhone}</div>}
                {info.dropoffEta && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>ETA: {fmtTs(info.dropoffEta)}</div>}
              </div>
            </div>
          </div>

          {/* Map */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, boxShadow: C.shadow }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 14 }}>
              Recorrido GPS del courier
              <span style={{ fontWeight: 400, color: C.textMuted, marginLeft: 8 }}>
                · <span style={{ color: "#1A7F4B" }}>● inicio</span>
                <span style={{ margin: "0 6px", color: "#0052CC" }}>● fin</span>
                <span style={{ color: "#F27B42" }}>🏪 pickup</span>
                <span style={{ marginLeft: 6, color: "#1A7F4B" }}>📦 dropoff</span>
              </span>
            </div>
            <WaypointMap waypoints={waypointLogs} />
          </div>
        </>
      )}
    </div>
  );
}

function RouteLogsView({ routeLogs, routeLoading, error, cluster, setCluster,
  timeMode, setTimeMode, relativeValue, setRelativeValue,
  relativeUnit, setRelativeUnit, kibanaFrom, setKibanaFrom,
  kibanaTo, setKibanaTo, onSearch, t }) {

  const [routeId, setRouteId] = useState("");
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [highlightedEventId, setHighlightedEventId] = useState(null);
  const tr = t ?? ((k) => k);

  const handleSearch = () => {
    setActiveFilters(new Set());
    setHighlightedEventId(null);
    onSearch(routeId.trim());
  };

  const toggleFilter = (key) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handlePointClick = useCallback((eventId) => {
    const el = document.getElementById(`event-card-${eventId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedEventId(eventId);
    setTimeout(() => setHighlightedEventId(null), 1500);
  }, []);

  // Summary from events
  const summary = routeLogs ? (() => {
    const first = routeLogs.find((e) => e.account) ?? routeLogs[0];
    const firstUpdate = routeLogs.find((e) => e.type === "route_update");
    const counts = {};
    routeLogs.forEach((e) => { counts[e.type] = (counts[e.type] ?? 0) + 1; });
    const gaps = detectWaypointGaps(routeLogs);
    const maxGap = gaps.size ? Math.max(...gaps.values()) : 0;
    return { account: first?.account, user: firstUpdate?.user ?? first?.user,
             device: first?.device, appVersion: first?.appVersion, counts, maxGap, gaps };
  })() : null;

  const countBadges = summary ? [
    { key: "route_update",    label: tr("routesTypeRouteUpdate"),    ...ROUTE_EVENT_META.route_update },
    { key: "waypoint",        label: tr("routesTypeWaypoint"),       ...ROUTE_EVENT_META.waypoint },
    { key: "mobile",          label: tr("routesTypeMobile"),         ...ROUTE_EVENT_META.mobile },
    { key: "dispatch_create", label: tr("routesTypeDispatchCreate"), ...ROUTE_EVENT_META.dispatch_create },
    { key: "dispatch_s3",     label: tr("routesTypeDispatch"),       ...ROUTE_EVENT_META.dispatch_s3 },
  ].filter((b) => (summary.counts[b.key] ?? 0) > 0) : [];

  const filteredLogs = routeLogs
    ? (activeFilters.size === 0 ? routeLogs : routeLogs.filter((e) => activeFilters.has(e.type)))
    : [];

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 32px 60px" }}>

      {/* Formulario */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, boxShadow: C.shadow, marginBottom: 24 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 4 }}>{tr("routesInputTitle")}</div>
        <div style={{ fontSize: 13, color: C.textSec, marginBottom: 20 }}>{tr("routesInputDesc")}</div>

        {/* Fila 1: Route ID + Cluster */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
          <div style={{ flex: "0 0 200px" }}>
            <div style={{ ...labelStyle, marginBottom: 8 }}>{tr("labelRouteId")}</div>
            <input value={routeId} onChange={(e) => setRouteId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="ej: 46548661"
              style={{
                width: "100%", background: C.bg, color: C.text,
                border: `1px solid ${C.border}`, borderRadius: 8,
                outline: "none", fontFamily: C.mono, fontSize: 14,
                padding: "9px 14px", boxSizing: "border-box",
              }} />
          </div>
          <div style={{ flex: "0 0 160px" }}>
            <div style={{ ...labelStyle, marginBottom: 8 }}>{tr("labelCluster")}</div>
            <select value={cluster} onChange={(e) => setCluster(e.target.value)}
              style={{
                width: "100%", background: C.bg, color: C.text,
                border: `1px solid ${C.border}`, borderRadius: 8,
                outline: "none", fontFamily: C.sans, fontSize: 13,
                padding: "9px 12px", boxSizing: "border-box", cursor: "pointer",
              }}>
              <option value="staging">staging</option>
              {[1,2,3,4,5,6,7].map(n => <option key={n} value={String(n)}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Fila 2: Rango de tiempo (reutiliza la misma lógica que planificación) */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={{ ...labelStyle, marginBottom: 8 }}>{tr("labelTimeRange")}</div>
            <div style={{ display: "flex", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 3, gap: 2 }}>
              {[{ id: "relative", labelKey: "labelRelative" }, { id: "absolute", labelKey: "labelAbsolute" }].map((m) => (
                <button key={m.id} onClick={() => setTimeMode(m.id)} style={{
                  background: timeMode === m.id ? C.blue : "transparent",
                  color: timeMode === m.id ? "#fff" : C.textSec,
                  border: "none", borderRadius: 6, padding: "5px 12px",
                  fontFamily: C.sans, fontSize: 12, fontWeight: 500, cursor: "pointer",
                }}>{tr(m.labelKey)}</button>
              ))}
            </div>
          </div>
          {timeMode === "relative" && (
            <>
              <div style={{ flex: "0 0 90px" }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>{tr("labelAmount")}</div>
                <input type="number" min={1} max={90} value={relativeValue}
                  onChange={(e) => setRelativeValue(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    width: "100%", background: C.bg, color: C.text,
                    border: `1px solid ${C.border}`, borderRadius: 8,
                    outline: "none", fontFamily: C.mono, fontSize: 14,
                    padding: "9px 12px", boxSizing: "border-box",
                  }} />
              </div>
              <div style={{ flex: "0 0 120px" }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>{tr("labelUnit")}</div>
                <select value={relativeUnit} onChange={(e) => setRelativeUnit(e.target.value)}
                  style={{
                    width: "100%", background: C.bg, color: C.text,
                    border: `1px solid ${C.border}`, borderRadius: 8,
                    outline: "none", fontFamily: C.sans, fontSize: 13,
                    padding: "9px 12px", boxSizing: "border-box", cursor: "pointer",
                  }}>
                  <option value="hours">{tr("labelHours")}</option>
                  <option value="days">{tr("labelDays")}</option>
                </select>
              </div>
            </>
          )}
          {timeMode === "absolute" && (
            <>
              <div style={{ flex: "0 0 190px" }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>{tr("labelFrom")}</div>
                <input type="datetime-local" value={kibanaFrom} onChange={(e) => setKibanaFrom(e.target.value)}
                  style={{ width: "100%", background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", fontFamily: C.sans, fontSize: 12, padding: "9px 10px", boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: "0 0 190px" }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>{tr("labelTo")}</div>
                <input type="datetime-local" value={kibanaTo} onChange={(e) => setKibanaTo(e.target.value)}
                  style={{ width: "100%", background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", fontFamily: C.sans, fontSize: 12, padding: "9px 10px", boxSizing: "border-box" }} />
              </div>
            </>
          )}
          <button onClick={handleSearch} disabled={routeLoading || !routeId.trim()}
            style={{
              ...btnPrimary,
              background: routeLoading || !routeId.trim() ? C.border : C.blue,
              color: routeLoading || !routeId.trim() ? C.textMuted : "#fff",
              cursor: routeLoading || !routeId.trim() ? "not-allowed" : "pointer",
              boxShadow: routeLoading || !routeId.trim() ? "none" : btnPrimary.boxShadow,
              padding: "9px 24px",
            }}>
            {routeLoading ? tr("routesBtnSearching") : tr("routesBtnSearch")}
          </button>
        </div>

        {error && (
          <div role="alert" style={{
            marginTop: 14, color: C.red, fontFamily: C.mono, fontSize: 12,
            padding: "10px 14px", background: C.redBg, borderRadius: 8, border: `1px solid ${C.red}33`,
          }}>{error}</div>
        )}
      </div>

      {routeLoading && <LoadingState />}

      {/* Resultados */}
      {routeLogs && summary && (
        <>
          {/* Panel resumen */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", boxShadow: C.shadow, marginBottom: 20 }}>
            <div style={{ ...labelStyle, marginBottom: 12 }}>{tr("routesSummaryTitle")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 32px", marginBottom: 14 }}>
              {summary.account   && <span style={{ fontSize: 13, fontFamily: C.sans }}><span style={{ color: C.textMuted }}>{tr("routesSummaryAccount")}: </span><strong style={{ color: C.text }}>{summary.account}</strong></span>}
              {summary.user      && <span style={{ fontSize: 13, fontFamily: C.sans }}><span style={{ color: C.textMuted }}>{tr("routesSummaryUser")}: </span><strong style={{ color: C.text }}>{summary.user}</strong></span>}
              {summary.device    && <span style={{ fontSize: 13, fontFamily: C.sans }}><span style={{ color: C.textMuted }}>{tr("routesSummaryDevice")}: </span><strong style={{ color: C.text }}>{summary.device}</strong></span>}
              {summary.appVersion && <span style={{ fontSize: 13, fontFamily: C.sans }}><span style={{ color: C.textMuted }}>{tr("routesSummaryApp")}: </span><strong style={{ color: C.text }}>{summary.appVersion}</strong></span>}
            </div>
            {/* Contadores por tipo — clickables para filtrar */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: summary.maxGap >= 5 ? 12 : 0 }}>
              <span style={{ fontSize: 12, color: C.textMuted, fontFamily: C.sans }}>
                {activeFilters.size > 0
                  ? `${filteredLogs.length} / ${routeLogs.length} ${tr("routesTotal")}`
                  : `${routeLogs.length} ${tr("routesTotal")}`} ·
              </span>
              {countBadges.map((b) => {
                const active = activeFilters.has(b.key);
                return (
                  <button key={b.key} onClick={() => toggleFilter(b.key)} style={{
                    background: active ? b.color : b.bg,
                    color: active ? "#fff" : b.color,
                    border: `1px solid ${b.color}${active ? "99" : "33"}`,
                    borderRadius: 99, padding: "3px 12px", fontSize: 12, fontWeight: 600,
                    fontFamily: C.sans, cursor: "pointer",
                    boxShadow: active ? `0 0 0 2px ${b.color}33` : "none",
                    transition: "all 0.15s",
                  }}>
                    {b.icon} {summary.counts[b.key]} {b.label}
                  </button>
                );
              })}
              {activeFilters.size > 0 && (
                <button onClick={() => setActiveFilters(new Set())} style={{
                  background: "transparent", border: "none", color: C.textMuted,
                  fontSize: 11, fontFamily: C.sans, cursor: "pointer", padding: "2px 6px",
                  textDecoration: "underline",
                }}>
                  limpiar
                </button>
              )}
            </div>
            {/* Alerta gap máximo */}
            {summary.maxGap >= 5 && (
              <div style={{
                marginTop: 4, padding: "8px 14px", borderRadius: 8, fontSize: 12, fontFamily: C.sans, fontWeight: 500,
                background: summary.maxGap >= 10 ? C.redBg : C.amberBg,
                color: summary.maxGap >= 10 ? C.red : C.amber,
                border: `1px solid ${summary.maxGap >= 10 ? C.red : C.amber}44`,
              }}>
                {summary.maxGap >= 10 ? "🔴" : "🟡"} {tr("routesGapLabel")} máximo: <strong>{summary.maxGap} {tr("routesGapMinutes")}</strong>
              </div>
            )}
          </div>

          {/* Route Map */}
          <RouteMap events={routeLogs} />

          {/* Mobile Data Chart */}
          <MobileDataChart events={routeLogs} t={t} onPointClick={handlePointClick} />

          {/* Timeline */}
          <div style={{ ...labelStyle, marginBottom: 12 }}>{tr("routesTimelineTitle")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredLogs.map((event) => (
              <RouteEventCard
                key={event.id}
                event={event}
                gapAfter={summary.gaps.get(event.id) ?? null}
                t={t}
                highlighted={event.id === highlightedEventId}
              />
            ))}
            {filteredLogs.length === 0 && (
              <div style={{ textAlign: "center", padding: "32px 0", color: C.textMuted, fontFamily: C.sans, fontSize: 13 }}>
                Ningún evento coincide con los filtros activos.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Usage Tracking ───────────────────────────────────────────────────────────
function trackEvent(type, cluster, query, status, duration_ms) {
  fetch("/api/track-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, cluster, query: String(query || "").slice(0, 100), status, duration_ms }),
  }).catch(() => {});
}

// ─── Metrics Components ────────────────────────────────────────────────────────
const TYPE_META = {
  "kibana":         { label: "Planificación", color: "#0052CC", bg: "#EBF2FF" },
  "route-logs":     { label: "Rutas",         color: "#F27B42", bg: "#FEF0E8" },
  "uber-logs":      { label: "Uber Direct",   color: "#1A7F4B", bg: "#EDFAF3" },
  "waypoints-uber": { label: "Waypoints",     color: "#5E35B1", bg: "#EDE7F6" },
  "claude":         { label: "AI",            color: "#0891B2", bg: "#E0F7FA" },
};
const STATUS_META = {
  "success":   { label: "Éxito",     color: "#1A7F4B", bg: "#EDFAF3" },
  "not_found": { label: "Sin datos", color: "#F27B42", bg: "#FEF0E8" },
  "error":     { label: "Error",     color: "#D93025", bg: "#FFF0EF" },
};

function UsageBarChart({ data, labelKey, valueKey }) {
  const W = 760, H = 160;
  const PAD = { top: 14, right: 16, bottom: 34, left: 44 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const maxVal = Math.max(...data.map((d) => d[valueKey]), 1);
  const slotW  = innerW / data.length;
  const barW   = Math.max(slotW - 3, 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <rect x={PAD.left} y={PAD.top} width={innerW} height={innerH} fill="#F5F7FA" rx={4} />
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f}
          x1={PAD.left} y1={PAD.top + innerH * (1 - f)}
          x2={PAD.left + innerW} y2={PAD.top + innerH * (1 - f)}
          stroke="#E2E8F0" strokeWidth={1} />
      ))}
      {data.map((d, i) => {
        const h = (d[valueKey] / maxVal) * innerH;
        const x = PAD.left + i * slotW + (slotW - barW) / 2;
        const y = PAD.top + innerH - h;
        return <rect key={i} x={x} y={y} width={barW} height={Math.max(h, 1)} fill="#0052CC" rx={2} opacity={0.8} />;
      })}
      {data.map((d, i) => {
        const show = data.length <= 12 ? true : data.length <= 24 ? i % 3 === 0 : i % 5 === 0;
        if (!show) return null;
        const x = PAD.left + i * slotW + slotW / 2;
        return (
          <text key={i} x={x} y={H - 4} textAnchor="middle"
            fontSize={10} fill="#A0AEC0" fontFamily="Inter, system-ui, sans-serif">
            {d[labelKey]}
          </text>
        );
      })}
      {[0, 0.5, 1].map((f) => (
        <text key={f} x={PAD.left - 6} y={PAD.top + innerH * (1 - f) + 4}
          textAnchor="end" fontSize={10} fill="#A0AEC0" fontFamily="Inter, system-ui, sans-serif">
          {Math.round(maxVal * f)}
        </text>
      ))}
    </svg>
  );
}

function MetricsView() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");
  const [chartMode, setChartMode] = useState("hour");

  const fetchMetrics = async () => {
    setLoading(true); setErr("");
    try {
      const resp = await fetch("/api/get-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setMetrics(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMetrics(); }, []);

  const hourData = (metrics?.by_hour ?? []).map((d) => ({
    ...d,
    label: String(d.hour).padStart(2, "0"),
  }));
  const dayData = (metrics?.by_day ?? []).map((d) => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }));

  const statCards = [
    { label: "Total (30 días)", value: metrics?.totals?.all ?? 0,              color: "#132045" },
    { label: "Planificación",   value: metrics?.totals?.["kibana"] ?? 0,        color: "#0052CC" },
    { label: "Rutas",           value: metrics?.totals?.["route-logs"] ?? 0,    color: "#F27B42" },
    { label: "Uber Direct",     value: metrics?.totals?.["uber-logs"] ?? 0,     color: "#1A7F4B" },
    { label: "Waypoints",       value: metrics?.totals?.["waypoints-uber"] ?? 0,color: "#5E35B1" },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#132045", margin: 0 }}>📊 Métricas de uso</h2>
        <button onClick={fetchMetrics} disabled={loading}
          style={{ background: "transparent", border: "1px solid #E2E8F0", borderRadius: 8,
            padding: "7px 14px", fontSize: 12, fontWeight: 500, color: "#4A5568", cursor: "pointer" }}>
          {loading ? "Cargando…" : "↻ Actualizar"}
        </button>
      </div>

      {err && (
        <div style={{ background: "#FFF0EF", border: "1px solid #D93025", borderLeft: "4px solid #D93025",
          borderRadius: 10, padding: "12px 18px", color: "#D93025", fontSize: 13, marginBottom: 20 }}>
          {err}
        </div>
      )}

      {/* StatCards */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        {statCards.map((c) => (
          <div key={c.label} style={{ background: "#fff", border: "1px solid #E2E8F0",
            borderLeft: `3px solid ${c.color}`, borderRadius: 12, padding: "14px 20px",
            minWidth: 130, flex: "1 1 130px",
            boxShadow: "0 1px 3px rgba(19,32,69,0.08)" }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#A0AEC0",
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              {c.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: c.color, lineHeight: 1 }}>
              {loading ? "—" : c.value}
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12,
        padding: "18px 20px", marginBottom: 24, boxShadow: "0 1px 3px rgba(19,32,69,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#132045" }}>
            {chartMode === "hour" ? "Búsquedas por hora (hoy)" : "Búsquedas por día (últimos 30 días)"}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            {["hour", "day"].map((m) => (
              <button key={m} onClick={() => setChartMode(m)}
                style={{ padding: "5px 12px", fontSize: 12, fontWeight: chartMode === m ? 600 : 400,
                  borderRadius: 6, border: "1px solid #E2E8F0", cursor: "pointer",
                  background: chartMode === m ? "#0052CC" : "transparent",
                  color: chartMode === m ? "#fff" : "#4A5568" }}>
                {m === "hour" ? "Por hora" : "Por día"}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center",
            color: "#A0AEC0", fontSize: 13 }}>Cargando…</div>
        ) : (
          <UsageBarChart
            data={chartMode === "hour" ? hourData : dayData}
            labelKey="label"
            valueKey="count"
          />
        )}
      </div>

      {/* Table */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12,
        padding: "18px 20px", boxShadow: "0 1px 3px rgba(19,32,69,0.08)" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#132045", marginBottom: 14 }}>
          Últimas 100 búsquedas
        </div>
        {loading ? (
          <div style={{ color: "#A0AEC0", fontSize: 13, padding: "20px 0" }}>Cargando…</div>
        ) : !metrics?.events?.length ? (
          <div style={{ color: "#A0AEC0", fontSize: 13, padding: "20px 0" }}>
            Sin registros aún. Las búsquedas aparecerán aquí.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #E2E8F0" }}>
                  {["Timestamp", "Tipo", "Cluster", "Query", "Estado", "Duración"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11,
                      fontWeight: 600, color: "#A0AEC0", textTransform: "uppercase",
                      letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.events.map((e, i) => {
                  const tm = TYPE_META[e.type]   || { label: e.type,   color: "#4A5568", bg: "#F5F7FA" };
                  const sm = STATUS_META[e.status] || { label: e.status, color: "#4A5568", bg: "#F5F7FA" };
                  const ts = new Date(e.timestamp);
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #F0F4F8",
                      background: i % 2 ? "#F5F7FA" : "#fff" }}>
                      <td style={{ padding: "9px 12px", color: "#4A5568", whiteSpace: "nowrap",
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                        {ts.toLocaleDateString()} {ts.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                      </td>
                      <td style={{ padding: "9px 12px" }}>
                        <span style={{ background: tm.bg, color: tm.color, border: `1px solid ${tm.color}22`,
                          borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>
                          {tm.label}
                        </span>
                      </td>
                      <td style={{ padding: "9px 12px", color: "#4A5568" }}>{e.cluster ?? "—"}</td>
                      <td style={{ padding: "9px 12px", color: "#0052CC", fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 12, fontWeight: 600, maxWidth: 200, overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.query ?? "—"}
                      </td>
                      <td style={{ padding: "9px 12px" }}>
                        <span style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.color}22`,
                          borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>
                          {sm.label}
                        </span>
                      </td>
                      <td style={{ padding: "9px 12px", color: "#4A5568", whiteSpace: "nowrap" }}>
                        {e.duration_ms != null ? `${e.duration_ms} ms` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [logType, setLogType]     = useState(null);   // null = selector visible

  // ── Planning state ──
  const [reqText, setReqText]     = useState("");
  const [resText, setResText]     = useState("");
  const [parsed, setParsed]       = useState(null);
  const [analysis, setAnalysis]   = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("rutas");
  const [promptTpl, setPromptTpl] = useState(() => getDefaultPrompt("es"));

  // ── Routes state ──
  const [routeLogs, setRouteLogs]       = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);

  // ── Uber Direct state ──
  const [uberLogs, setUberLogs]         = useState(null);
  const [uberLoading, setUberLoading]   = useState(false);

  // ── Waypoints Uber state ──
  const [waypointLogs, setWaypointLogs]       = useState(null);
  const [waypointLoading, setWaypointLoading] = useState(false);

  // ── Shared ──
  const [error, setError]         = useState("");
  const [lang, setLang]           = useState("es");

  const t = (key) => TRANSLATIONS[lang][key] ?? key;

  // Kibana mode
  const [inputMode, setInputMode]       = useState("kibana"); // "json" | "kibana"
  const [planId, setPlanId]             = useState("");
  const [cluster, setCluster]           = useState("3");
  const [timeMode, setTimeMode]         = useState("relative"); // "relative" | "absolute"
  const [relativeValue, setRelativeValue] = useState(1);
  const [relativeUnit, setRelativeUnit] = useState("days");    // "hours" | "days"
  const [kibanaFrom, setKibanaFrom]     = useState("");
  const [kibanaTo, setKibanaTo]         = useState("");
  const [kibanaLoading, setKibanaLoading] = useState(false);

  const handleLangChange = (newLang) => {
    if (newLang === lang) return;
    // Auto-update prompt only if user hasn't customised it
    if (promptTpl === getDefaultPrompt(lang)) {
      setPromptTpl(getDefaultPrompt(newLang));
    }
    setLang(newLang);
  };

  const handleAnalyze = useCallback(() => {
    setError(""); setParsed(null); setAnalysis("");
    try { setParsed(parseData(JSON.parse(reqText), JSON.parse(resText))); }
    catch (e) { setError("Error al parsear JSON: " + e.message); }
  }, [reqText, resText]);

  const handleKibanaSearch = useCallback(async () => {
    if (!planId.trim()) { setError("Ingresa el plan_id"); return; }
    setError(""); setParsed(null); setAnalysis("");
    setKibanaLoading(true);
    const t0 = Date.now();
    try {
      let fromIso, toIso;
      if (timeMode === "relative") {
        const ms = relativeValue * (relativeUnit === "hours" ? 3_600_000 : 86_400_000);
        fromIso = new Date(Date.now() - ms).toISOString();
        toIso   = new Date().toISOString();
      } else {
        fromIso = kibanaFrom ? new Date(kibanaFrom).toISOString() : undefined;
        toIso   = kibanaTo   ? new Date(kibanaTo).toISOString()   : undefined;
      }
      const resp = await fetch("/api/kibana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: planId.trim(),
          cluster,
          from: fromIso,
          to:   toIso,
        }),
      });
      const data = await resp.json();
      trackEvent("kibana", cluster, planId.trim(), data.error ? (resp.status === 404 ? "not_found" : "error") : "success", Date.now() - t0);
      if (data.error) throw new Error(data.error);
      setParsed(parseData(data.request, data.response));
    } catch (e) {
      setError(e.message);
    } finally {
      setKibanaLoading(false);
    }
  }, [planId, cluster, timeMode, relativeValue, relativeUnit, kibanaFrom, kibanaTo]);

  const handleUberSearch = useCallback(async (orderCode) => {
    if (!orderCode) { setError("Ingresa el código de orden"); return; }
    setError(""); setUberLogs(null);
    setUberLoading(true);
    const t0 = Date.now();
    try {
      let fromIso, toIso;
      if (timeMode === "relative") {
        const ms = relativeValue * (relativeUnit === "hours" ? 3_600_000 : 86_400_000);
        fromIso = new Date(Date.now() - ms).toISOString();
        toIso   = new Date().toISOString();
      } else {
        fromIso = kibanaFrom ? new Date(kibanaFrom).toISOString() : undefined;
        toIso   = kibanaTo   ? new Date(kibanaTo).toISOString()   : undefined;
      }
      const resp = await fetch("/api/uber-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_code: orderCode, cluster, from: fromIso, to: toIso }),
      });
      const data = await resp.json();
      trackEvent("uber-logs", cluster, orderCode, data.error ? (resp.status === 404 ? "not_found" : "error") : "success", Date.now() - t0);
      if (data.error) throw new Error(data.error);
      setUberLogs(parseUberHits(data.hits));
    } catch (e) {
      setError(e.message);
    } finally {
      setUberLoading(false);
    }
  }, [cluster, timeMode, relativeValue, relativeUnit, kibanaFrom, kibanaTo]);

  const handleWaypointSearch = useCallback(async (orderCode) => {
    if (!orderCode) { setError("Ingresa el código de orden"); return; }
    setError(""); setWaypointLogs(null);
    setWaypointLoading(true);
    const t0 = Date.now();
    try {
      let fromIso, toIso;
      if (timeMode === "relative") {
        const ms = relativeValue * (relativeUnit === "hours" ? 3_600_000 : 86_400_000);
        fromIso = new Date(Date.now() - ms).toISOString();
        toIso   = new Date().toISOString();
      } else {
        fromIso = kibanaFrom ? new Date(kibanaFrom).toISOString() : undefined;
        toIso   = kibanaTo   ? new Date(kibanaTo).toISOString()   : undefined;
      }
      const resp = await fetch("/api/waypoints-uber", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_code: orderCode, cluster, from: fromIso, to: toIso }),
      });
      const data = await resp.json();
      trackEvent("waypoints-uber", cluster, orderCode, data.error ? (resp.status === 404 ? "not_found" : "error") : "success", Date.now() - t0);
      if (data.error) throw new Error(data.error);
      setWaypointLogs(parseWaypointHits(data.hits));
    } catch (e) {
      setError(e.message);
    } finally {
      setWaypointLoading(false);
    }
  }, [cluster, timeMode, relativeValue, relativeUnit, kibanaFrom, kibanaTo]);

  const handleRouteSearch = useCallback(async (routeId) => {
    if (!routeId) { setError("Ingresa el Route ID"); return; }
    setError(""); setRouteLogs(null);
    setRouteLoading(true);
    const t0 = Date.now();
    try {
      let fromIso, toIso;
      if (timeMode === "relative") {
        const ms = relativeValue * (relativeUnit === "hours" ? 3_600_000 : 86_400_000);
        fromIso = new Date(Date.now() - ms).toISOString();
        toIso   = new Date().toISOString();
      } else {
        fromIso = kibanaFrom ? new Date(kibanaFrom).toISOString() : undefined;
        toIso   = kibanaTo   ? new Date(kibanaTo).toISOString()   : undefined;
      }
      const resp = await fetch("/api/route-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ route_id: routeId, cluster, from: fromIso, to: toIso }),
      });
      const data = await resp.json();
      trackEvent("route-logs", cluster, routeId, data.error ? (resp.status === 404 ? "not_found" : "error") : "success", Date.now() - t0);
      if (data.error) throw new Error(data.error);
      setRouteLogs(parseRouteHits(data.hits));
    } catch (e) {
      setError(e.message);
    } finally {
      setRouteLoading(false);
    }
  }, [cluster, timeMode, relativeValue, relativeUnit, kibanaFrom, kibanaTo]);

  const tabs = [
    { id: "rutas",      label: t("tabRoutes") },
    { id: "unassigned", label: `${t("tabUnassigned")} (${parsed?.stats?.unassignedStops ?? 0})` },
    { id: "ai",         label: t("tabAI") },
    { id: "prompt",     label: t("tabPrompt") },
  ];

  // Lang toggle buttons — defined once, reused in navbar
  const LangToggle = () => (
    <div style={{
      display: "flex", background: "rgba(255,255,255,0.1)",
      border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: 2, gap: 2,
    }}>
      {["es", "en"].map((l) => (
        <button key={l} onClick={() => handleLangChange(l)} style={{
          background: lang === l ? "#fff" : "transparent",
          color: lang === l ? C.navy : "rgba(255,255,255,0.6)",
          border: "none", borderRadius: 6, padding: "4px 10px",
          fontFamily: C.sans, fontSize: 11, fontWeight: 700, cursor: "pointer",
          letterSpacing: "0.04em", transition: "all 0.15s",
        }}>{l.toUpperCase()}</button>
      ))}
    </div>
  );

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: C.sans }}>

      {/* Header */}
      <div style={{
        background: C.navy, borderBottom: `1px solid rgba(255,255,255,0.08)`,
        padding: "0 32px", display: "flex", alignItems: "center",
        justifyContent: "space-between", height: 56,
        boxShadow: "0 2px 8px rgba(19,32,69,0.32)",
        position: "sticky", top: 0, zIndex: 1000,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img
            src="/logo.png" alt="DispatchTrack"
            onClick={() => setLogType(null)}
            style={{ height: 28, width: "auto", display: "block", cursor: "pointer" }}
          />
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.2)" }} />
          <span
            onClick={() => setLogType(null)}
            style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 500, cursor: logType ? "pointer" : "default" }}
          >Support Analyzer</span>
          {logType && (() => {
            const type = LOG_TYPES.find((l) => l.id === logType);
            const title = type ? (lang === "en" ? type.titleEn : type.titleEs) : logType;
            return (
              <>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>›</span>
                {type?.id === "uber"
                  ? <img src="/uber_direct.jpg" alt="Uber Direct" style={{ height: 18, width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
                  : <span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>{title}</span>
                }
              </>
            );
          })()}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LangToggle />
          {(logType || parsed) && (
            <button
              onClick={() => {
                if ((parsed || routeLogs || uberLogs || waypointLogs) && !window.confirm(t("confirmDiscard"))) return;
                setParsed(null); setAnalysis(""); setReqText(""); setResText("");
                setRouteLogs(null); setUberLogs(null); setWaypointLogs(null); setError("");
                setLogType(null);
              }}
              style={{
                ...btnGhost,
                border: "1px solid rgba(255,255,255,0.25)",
                color: "rgba(255,255,255,0.85)",
              }}>
              {t("newAnalysis")}
            </button>
          )}
        </div>
      </div>

      {/* Paso 0: Selector de tipo de log */}
      {!logType && (
        <LogTypeSelector lang={lang} t={t} onSelect={(id) => setLogType(id)} />
      )}

      {/* Flujo: Planificación */}
      {logType === "planning" && (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px 60px" }}>

        {/* Paso 1: Cargar datos */}
        {!parsed && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, boxShadow: C.shadow }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>{t("loadTitle")}</div>
                <div style={{ fontSize: 13, color: C.textSec }}>
                  {inputMode === "json" ? t("loadDescJson") : t("loadDescKibana")}
                </div>
              </div>
              {/* Toggle modo */}
              <div style={{ display: "flex", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 3, gap: 2 }}>
                {[{ id: "json", labelKey: "modeJson" }, { id: "kibana", labelKey: "modeKibana" }].map((m) => (
                  <button key={m.id} onClick={() => { setInputMode(m.id); setError(""); }}
                    style={{
                      background: inputMode === m.id ? C.blue : "transparent",
                      color: inputMode === m.id ? "#fff" : C.textSec,
                      border: "none", borderRadius: 8, padding: "6px 14px",
                      fontFamily: C.sans, fontSize: 12, fontWeight: 500, cursor: "pointer",
                      transition: "all 0.15s",
                    }}>{t(m.labelKey)}</button>
                ))}
              </div>
            </div>

            <div style={{ height: 1, background: C.border, margin: "20px 0" }} />

            {/* Modo JSON */}
            {inputMode === "json" && (
              <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
                <JsonInput label="dt_request"  value={reqText} onChange={setReqText} t={t} />
                <JsonInput label="dt_response" value={resText} onChange={setResText} t={t} />
              </div>
            )}

            {/* Modo Kibana */}
            {inputMode === "kibana" && (
              <div style={{ marginBottom: 20 }}>
                {/* Fila 1: Plan ID + Cluster */}
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
                  <div style={{ flex: "0 0 200px" }}>
                    <div style={{ ...labelStyle, marginBottom: 8 }}>{t("labelPlanId")}</div>
                    <input
                      value={planId}
                      onChange={(e) => setPlanId(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleKibanaSearch()}
                      placeholder="ej: 225677"
                      style={{
                        width: "100%", background: C.bg, color: C.text,
                        border: `1px solid ${C.border}`, borderRadius: 8,
                        outline: "none", fontFamily: C.mono, fontSize: 14,
                        padding: "9px 14px", boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div style={{ flex: "0 0 160px" }}>
                    <div style={{ ...labelStyle, marginBottom: 8 }}>{t("labelCluster")}</div>
                    <select
                      value={cluster}
                      onChange={(e) => setCluster(e.target.value)}
                      style={{
                        width: "100%", background: C.bg, color: C.text,
                        border: `1px solid ${C.border}`, borderRadius: 8,
                        outline: "none", fontFamily: C.sans, fontSize: 13,
                        padding: "9px 12px", boxSizing: "border-box", cursor: "pointer",
                      }}
                    >
                      <option value="staging">staging</option>
                      {[1,2,3,4,5,6,7].map(n => <option key={n} value={String(n)}>{n}</option>)}
                    </select>
                  </div>
                </div>

                {/* Fila 2: Rango de tiempo */}
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
                  {/* Toggle relativo / absoluto */}
                  <div>
                    <div style={{ ...labelStyle, marginBottom: 8 }}>{t("labelTimeRange")}</div>
                    <div style={{ display: "flex", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 3, gap: 2 }}>
                      {[{ id: "relative", labelKey: "labelRelative" }, { id: "absolute", labelKey: "labelAbsolute" }].map((m) => (
                        <button key={m.id} onClick={() => setTimeMode(m.id)}
                          style={{
                            background: timeMode === m.id ? C.blue : "transparent",
                            color: timeMode === m.id ? "#fff" : C.textSec,
                            border: "none", borderRadius: 6, padding: "5px 12px",
                            fontFamily: C.sans, fontSize: 12, fontWeight: 500, cursor: "pointer",
                          }}>{t(m.labelKey)}</button>
                      ))}
                    </div>
                  </div>

                  {/* Relativo */}
                  {timeMode === "relative" && (
                    <>
                      <div style={{ flex: "0 0 90px" }}>
                        <div style={{ ...labelStyle, marginBottom: 8 }}>{t("labelAmount")}</div>
                        <input
                          type="number" min={1} max={90}
                          value={relativeValue}
                          onChange={(e) => setRelativeValue(Math.max(1, parseInt(e.target.value) || 1))}
                          style={{
                            width: "100%", background: C.bg, color: C.text,
                            border: `1px solid ${C.border}`, borderRadius: 8,
                            outline: "none", fontFamily: C.mono, fontSize: 14,
                            padding: "9px 12px", boxSizing: "border-box",
                          }}
                        />
                      </div>
                      <div style={{ flex: "0 0 120px" }}>
                        <div style={{ ...labelStyle, marginBottom: 8 }}>{t("labelUnit")}</div>
                        <select
                          value={relativeUnit}
                          onChange={(e) => setRelativeUnit(e.target.value)}
                          style={{
                            width: "100%", background: C.bg, color: C.text,
                            border: `1px solid ${C.border}`, borderRadius: 8,
                            outline: "none", fontFamily: C.sans, fontSize: 13,
                            padding: "9px 12px", boxSizing: "border-box", cursor: "pointer",
                          }}
                        >
                          <option value="hours">{t("labelHours")}</option>
                          <option value="days">{t("labelDays")}</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* Absoluto */}
                  {timeMode === "absolute" && (
                    <>
                      <div style={{ flex: "0 0 190px" }}>
                        <div style={{ ...labelStyle, marginBottom: 8 }}>{t("labelFrom")}</div>
                        <input type="datetime-local" value={kibanaFrom} onChange={(e) => setKibanaFrom(e.target.value)}
                          style={{
                            width: "100%", background: C.bg, color: C.text,
                            border: `1px solid ${C.border}`, borderRadius: 8,
                            outline: "none", fontFamily: C.sans, fontSize: 12,
                            padding: "9px 10px", boxSizing: "border-box",
                          }}
                        />
                      </div>
                      <div style={{ flex: "0 0 190px" }}>
                        <div style={{ ...labelStyle, marginBottom: 8 }}>{t("labelTo")}</div>
                        <input type="datetime-local" value={kibanaTo} onChange={(e) => setKibanaTo(e.target.value)}
                          style={{
                            width: "100%", background: C.bg, color: C.text,
                            border: `1px solid ${C.border}`, borderRadius: 8,
                            outline: "none", fontFamily: C.sans, fontSize: 12,
                            padding: "9px 10px", boxSizing: "border-box",
                          }}
                        />
                      </div>
                    </>
                  )}

                  <button
                    onClick={handleKibanaSearch}
                    disabled={kibanaLoading || !planId.trim()}
                    style={{
                      ...btnPrimary,
                      background: kibanaLoading || !planId.trim() ? C.border : C.blue,
                      color: kibanaLoading || !planId.trim() ? C.textMuted : "#fff",
                      cursor: kibanaLoading || !planId.trim() ? "not-allowed" : "pointer",
                      boxShadow: kibanaLoading || !planId.trim() ? "none" : btnPrimary.boxShadow,
                      padding: "9px 24px",
                    }}>
                    {kibanaLoading ? t("btnSearching") : t("btnSearch")}
                  </button>
                </div>

                <div style={{ marginTop: 10, fontSize: 11, color: C.textMuted }}>
                  {t("footerIndex")} <code style={{ fontFamily: C.mono }}>cluster-{cluster}.planner.custom.dt*</code>
                  {timeMode === "relative" && <> · {t("footerLast")} <strong>{relativeValue} {relativeUnit === "hours" ? t("footerHours") : t("footerDays")}</strong></>}
                </div>
              </div>
            )}

            {error && (
              <div role="alert" style={{
                color: C.red, fontFamily: C.mono, fontSize: 12, marginBottom: 16,
                padding: "10px 14px", background: C.redBg, borderRadius: 8, border: `1px solid ${C.red}33`,
              }}>{error}</div>
            )}

            {inputMode === "json" && <button
              onClick={handleAnalyze}
              disabled={!reqText || !resText}
              style={{
                ...btnPrimary,
                background: reqText && resText ? C.blue : C.border,
                color: reqText && resText ? "#fff" : C.textMuted,
                cursor: reqText && resText ? "pointer" : "not-allowed",
                boxShadow: reqText && resText ? btnPrimary.boxShadow : "none",
                padding: "10px 28px", fontSize: 14,
              }}>
              {t("btnAnalyze")}
            </button>}
          </div>
        )}

        {kibanaLoading && <LoadingState />}

        {/* Paso 2: Resultados */}
        {parsed && (() => {
          const { stats, routes, unassignedStops, toHHMM, config } = parsed;
          return (
            <>
              {inputMode === "kibana" && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                  <a
                    href={buildKibanaUrl(planId, cluster, timeMode, relativeValue, relativeUnit, kibanaFrom, kibanaTo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      background: "#306EF214", color: C.blueLight,
                      border: `1px solid ${C.blueLight}`, borderRadius: 8,
                      padding: "7px 16px", fontSize: 13, fontWeight: 500,
                      fontFamily: C.sans, textDecoration: "none",
                    }}>
                    Ver en Kibana ↗
                  </a>
                </div>
              )}
              {/* KPIs */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                <StatCard label={t("statRequested")}  value={fmt(stats.totalStops)}        sub={t("statRequestedSub")}                                                color={C.blue}  icon="📦" />
                <StatCard label={t("statAssigned")}   value={fmt(stats.assignedStops)}     sub={`${fmt(parseFloat(stats.assignmentRate))}% ${t("statAssignedSub")}`}  color={C.green} icon="✅" />
                <StatCard label={t("statUnassigned")} value={fmt(stats.unassignedStops)}   sub={`${fmt(100-parseFloat(stats.assignmentRate))}% ${t("statUnassignedSub")}`} color={C.red} icon="⚠️" />
                <StatCard label={t("statEffCap")}     value={fmt(stats.effectiveCapacity)}
                  sub={parsed.reloadMaxCount===0 ? t("statEffCapSub0") : `${fmt(parsed.tripsPerTruck)} ${t("statEffCapSubN")}`}
                  color={stats.effectiveCapacity >= stats.totalStops ? C.green : C.amber} icon="🚚" />
                <StatCard label={t("statTimeUse")}    value={`${fmt(parseFloat(stats.avgTimeUtil))}%`}
                  sub={`${t("statTimeUseSub")} ${fmt(parseFloat(stats.maxTimeUtil))}% · ${fmt(parsed.avgServiceTime)}${t("statTimeUseSub2")}`}
                  color={parseInt(stats.maxTimeUtil)>90 ? C.red : parseInt(stats.avgTimeUtil)>70 ? C.amber : C.blue} icon="🕐" />
              </div>

              {/* Alertas */}
              {stats.unassignedStops > 0 && (
                <div role="alert" style={{
                  background: C.redBg, border: `1px solid ${C.red}33`,
                  borderLeft: `4px solid ${C.red}`,
                  borderRadius: 10, padding: "12px 18px", marginBottom: 10,
                  display: "flex", gap: 12, alignItems: "flex-start",
                }}>
                  <span style={{ fontSize: 16, marginTop: 1 }}>⚠️</span>
                  <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                    <strong style={{ color: C.red }}>{fmt(stats.unassignedStops)} {t("alertCapTitle")}</strong>
                    <span style={{ color: C.textSec }}> · {t("alertCapEffective")} </span><strong style={{ color: C.text }}>{fmt(stats.effectiveCapacity)}</strong>
                    <span style={{ color: C.textSec }}> · {t("alertCapRequested")} </span><strong style={{ color: C.text }}>{fmt(stats.totalStops)}</strong>
                    <span style={{ color: C.textSec }}> · {t("alertCapDeficit")} </span><strong style={{ color: C.red }}>{fmt(Math.max(0, stats.totalStops - stats.effectiveCapacity))}</strong>
                    {parsed.reloadMaxCount===0 && <span style={{ color: C.amber }}> · {t("alertCapReload")}</span>}
                  </div>
                </div>
              )}
              {parseInt(stats.maxTimeUtil) > 85 && (
                <div role="status" style={{
                  background: C.amberBg, border: `1px solid ${C.amber}44`,
                  borderLeft: `4px solid ${C.amber}`,
                  borderRadius: 10, padding: "12px 18px", marginBottom: 10,
                  display: "flex", gap: 12, alignItems: "center",
                }}>
                  <span style={{ fontSize: 16 }}>🕐</span>
                  <div style={{ fontSize: 13, color: C.textSec }}>
                    <strong style={{ color: C.amber }}>{t("alertTimeTitle")}</strong> {t("alertTimeBody")} {stats.maxTimeUtil}{t("alertTimeBody2")}
                  </div>
                </div>
              )}
              {parsed.capMismatchStops.length > 0 && (
                <div role="alert" style={{
                  background: C.purpleBg, border: `1px solid ${C.purple}33`,
                  borderLeft: `4px solid ${C.purple}`,
                  borderRadius: 10, padding: "12px 18px", marginBottom: 10,
                  display: "flex", gap: 12, alignItems: "flex-start",
                }}>
                  <span style={{ fontSize: 16, marginTop: 1 }}>🚫</span>
                  <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.6 }}>
                    <strong style={{ color: C.purple }}>{fmt(parsed.capMismatchStops.length)} {t("alertCapsTitle")}</strong>
                    <span> {t("alertCapsMid")} </span>
                    <strong style={{ color: C.text }}>
                      {[...new Set(parsed.capMismatchStops.map((s) => s.required_capability))].join(", ")}
                    </strong>
                  </div>
                </div>
              )}
              {parsed.maxStopsLimitedRoutes.length > 0 && (
                <div role="alert" style={{
                  background: C.amberBg, border: `1px solid ${C.amber}44`,
                  borderLeft: `4px solid ${C.amber}`,
                  borderRadius: 10, padding: "12px 18px", marginBottom: 14,
                  display: "flex", gap: 12, alignItems: "flex-start",
                }}>
                  <span style={{ fontSize: 16, marginTop: 1 }}>🛑</span>
                  <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.6 }}>
                    <strong style={{ color: C.amber }}>{fmt(parsed.maxStopsLimitedRoutes.length)} {t("alertMaxStopsTitle")}</strong>
                    <span> {t("alertMaxStopsBody")}</span>
                    <div style={{ marginTop: 4, fontFamily: C.mono, fontSize: 11, color: C.textMuted }}>
                      {parsed.maxStopsLimitedRoutes.map((r) => (
                        <span key={r.truck_name} style={{ marginRight: 12 }}>
                          {r.truck_name}: {r.orderCount}/{r.maxStops} stops
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div role="tablist" style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: 24, gap: 0 }}>
                {tabs.map((tab) => (
                  <button key={tab.id} role="tab" aria-selected={activeTab===tab.id} onClick={() => setActiveTab(tab.id)} style={{
                    background: "transparent", border: "none",
                    borderBottom: `2px solid ${activeTab===tab.id ? C.blue : "transparent"}`,
                    color: activeTab===tab.id ? C.blue : C.textSec,
                    padding: "10px 20px", fontFamily: C.sans, fontSize: 13,
                    fontWeight: activeTab===tab.id ? 600 : 400,
                    cursor: "pointer", transition: "all 0.15s",
                  }}>{tab.label}</button>
                ))}
              </div>

              {/* Tab: Rutas asignadas */}
              {activeTab === "rutas" && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 14, marginBottom: 20 }}>
                    {routes.map((r) => <RouteCard key={r.truck_name} route={r} toHHMM={toHHMM} t={t} />)}
                  </div>
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", boxShadow: C.shadow }}>
                    <div style={{ ...labelStyle, marginBottom: 10 }}>{t("configLabel")}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                      {Object.entries(config).map(([k,v]) => (
                        <span key={k} style={{ fontFamily: C.mono, fontSize: 12 }}>
                          <span style={{ color: C.textSec }}>{k}:</span>{" "}
                          <span style={{ color: C.blue, fontWeight: 600 }}>{String(v)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Sin asignar */}
              {activeTab === "unassigned" && (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, boxShadow: C.shadow }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{unassignedStops.length} {t("unassignedTitle")}</div>
                      <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>{t("unassignedDesc")}</div>
                    </div>
                    <Badge color={C.red} bg={C.redBg}>{fmt(100-parseFloat(stats.assignmentRate))}% del total</Badge>
                  </div>
                  <UnassignedTable stops={unassignedStops} toHHMM={toHHMM} t={t} />
                </div>
              )}

              {/* Tab: Análisis IA */}
              {activeTab === "ai" && (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, boxShadow: C.shadow }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{t("aiTitle")}</div>
                      <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>{t("aiDesc")}</div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      {analysis && (
                        <button onClick={() => setActiveTab("prompt")} style={btnGhost}>
                          {t("aiEditPrompt")}
                        </button>
                      )}
                      <button
                        onClick={() => runAIAnalysis(parsed, promptTpl, setAnalysis, setAiLoading)}
                        disabled={aiLoading}
                        style={{
                          ...btnPrimary,
                          background: aiLoading ? C.border : C.blue,
                          color: aiLoading ? C.textMuted : "#fff",
                          cursor: aiLoading ? "not-allowed" : "pointer",
                          boxShadow: aiLoading ? "none" : btnPrimary.boxShadow,
                        }}>
                        {aiLoading ? t("aiBtnLoading") : analysis ? t("aiBtnRerun") : t("aiBtnRun")}
                      </button>
                    </div>
                  </div>

                  {aiLoading && (
                    <div style={{ textAlign: "center", padding: "48px 0", color: C.textSec }}>
                      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{t("aiLoadingTitle")}</div>
                      <div style={{ fontSize: 12, marginTop: 6 }}>{t("aiLoadingDesc")} {stats.unassignedStops} {t("aiLoadingDesc2")}</div>
                    </div>
                  )}
                  {!aiLoading && !analysis && (
                    <div style={{ textAlign: "center", padding: "48px 0", color: C.textSec }}>
                      <div style={{ fontSize: 40, marginBottom: 14 }}>🤖</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>{t("aiEmptyTitle")}</div>
                      <div style={{ fontSize: 13 }}>{t("aiEmptyDesc")}</div>
                    </div>
                  )}
                  {analysis && !aiLoading && (
                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
                      <MdText text={analysis} />
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Prompt */}
              {activeTab === "prompt" && (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, boxShadow: C.shadow }}>
                  <PromptManager currentPrompt={promptTpl} onChange={setPromptTpl} t={t} lang={lang} />
                </div>
              )}
            </>
          );
        })()}
      </div>
      )}

      {/* Flujo: Waypoints Uber */}
      {logType === "waypoints" && (
        <WaypointsUberView
          waypointLogs={waypointLogs}
          waypointLoading={waypointLoading}
          error={error}
          cluster={cluster} setCluster={setCluster}
          timeMode={timeMode} setTimeMode={setTimeMode}
          relativeValue={relativeValue} setRelativeValue={setRelativeValue}
          relativeUnit={relativeUnit} setRelativeUnit={setRelativeUnit}
          kibanaFrom={kibanaFrom} setKibanaFrom={setKibanaFrom}
          kibanaTo={kibanaTo} setKibanaTo={setKibanaTo}
          onSearch={handleWaypointSearch}
        />
      )}

      {/* Flujo: Uber Direct */}
      {logType === "uber" && (
        <UberLogsView
          uberLogs={uberLogs}
          uberLoading={uberLoading}
          error={error}
          cluster={cluster} setCluster={setCluster}
          timeMode={timeMode} setTimeMode={setTimeMode}
          relativeValue={relativeValue} setRelativeValue={setRelativeValue}
          relativeUnit={relativeUnit} setRelativeUnit={setRelativeUnit}
          kibanaFrom={kibanaFrom} setKibanaFrom={setKibanaFrom}
          kibanaTo={kibanaTo} setKibanaTo={setKibanaTo}
          onSearch={handleUberSearch}
        />
      )}

      {/* Flujo: Métricas */}
      {logType === "metrics" && <MetricsView />}

      {/* Flujo: Rutas */}
      {logType === "routes" && (
        <RouteLogsView
          routeLogs={routeLogs}
          routeLoading={routeLoading}
          error={error}
          cluster={cluster} setCluster={setCluster}
          timeMode={timeMode} setTimeMode={setTimeMode}
          relativeValue={relativeValue} setRelativeValue={setRelativeValue}
          relativeUnit={relativeUnit} setRelativeUnit={setRelativeUnit}
          kibanaFrom={kibanaFrom} setKibanaFrom={setKibanaFrom}
          kibanaTo={kibanaTo} setKibanaTo={setKibanaTo}
          onSearch={handleRouteSearch}
          t={t}
        />
      )}

    </div>
  );
}
