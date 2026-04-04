#!/usr/bin/env node
/**
 * orquestador.js — Sistema multi-agente para Dispenser La Tienda
 * 
 * Cómo usar:
 *   node orquestador.js "mejorá el diseño de VentaManager"
 *   node orquestador.js --rol ux "revisá todos los componentes"
 *   node orquestador.js --rol dev "creá el hook useVentaForm"
 * 
 * El orquestador:
 * 1. Analiza tu pedido
 * 2. Elige el/los agentes adecuados
 * 3. Les da el contexto necesario
 * 4. Ejecuta via Claude Code CLI
 * 5. Guarda un log de decisiones
 */

const { execSync } = require('child_process');
const fs           = require('fs');
const path         = require('path');

// ── Configuración ────────────────────────────────────────────────────────────
const AGENTS_DIR  = path.join(__dirname, '.agents');
const LOG_FILE    = path.join(__dirname, '.agents', 'log.json');
const CLAUDE_MD   = path.join(__dirname, 'CLAUDE.md');

// ── Mapa de palabras clave → agente ─────────────────────────────────────────
const ROUTING = {
  ux:       ['diseño', 'color', 'estilo', 'visual', 'layout', 'ux', 'ui', 'mobile', 'responsive', 'dark', 'light'],
  dev:      ['componente', 'hook', 'estado', 'bug', 'error', 'feature', 'función', 'refactor', 'venta', 'servicio'],
  backend:  ['endpoint', 'api', 'backend', 'spring', 'postgres', 'dto', 'deploy', 'cloud', 'railway'],
  qa:       ['test', 'testing', 'validar', 'verificar', 'bug', 'caso de error', 'edge case'],
  docs:     ['documentar', 'comentar', 'jsdoc', 'readme', 'explicar'],
};

// ── Función principal ────────────────────────────────────────────────────────
function elegirAgente(pedido) {
  const pedidoLower = pedido.toLowerCase();
  let scores = {};

  // Puntuar cada agente según palabras clave
  for (const [agente, keywords] of Object.entries(ROUTING)) {
    scores[agente] = keywords.filter(k => pedidoLower.includes(k)).length;
  }

  // Elegir el de mayor puntaje
  const ganador = Object.entries(scores)
    .sort(([,a], [,b]) => b - a)
    .find(([, score]) => score > 0);

  return ganador ? ganador[0] : 'dev'; // dev como fallback
}

function leerAgente(nombre) {
  const archivo = path.join(AGENTS_DIR, `${nombre}.md`);
  if (!fs.existsSync(archivo)) {
    console.error(`❌ Agente "${nombre}" no encontrado en .agents/`);
    process.exit(1);
  }
  return fs.readFileSync(archivo, 'utf-8');
}

function leerContexto() {
  return fs.existsSync(CLAUDE_MD) ? fs.readFileSync(CLAUDE_MD, 'utf-8') : '';
}

function guardarLog(entrada) {
  let log = [];
  if (fs.existsSync(LOG_FILE)) {
    log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
  }
  log.push({ fecha: new Date().toISOString(), ...entrada });
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

function buildPrompt(agenteNombre, agenteRol, contexto, pedido) {
  return `
# Contexto del proyecto
${contexto}

# Tu rol en esta sesión
${agenteRol}

# Pedido
${pedido}

# Instrucciones
- Leé los archivos relevantes antes de hacer cambios
- Comentá en español
- Avisá si necesitás que otro agente tome parte del trabajo
- Al terminar, indicá qué archivos modificaste y por qué
`.trim();
}

// ── Main ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
🤖 Orquestador de agentes — Dispenser La Tienda

Uso:
  node orquestador.js "tu pedido"
  node orquestador.js --rol ux "revisá VentaManager"
  node orquestador.js --listar

Agentes disponibles: ux, dev, backend, qa, docs
  `);
  process.exit(0);
}

if (args[0] === '--listar') {
  console.log('\n🤖 Agentes disponibles:\n');
  for (const [key, keywords] of Object.entries(ROUTING)) {
    console.log(`  ${key.padEnd(10)} → ${keywords.slice(0, 4).join(', ')}...`);
  }
  process.exit(0);
}

let rolForzado = null;
let pedido = args.join(' ');

if (args[0] === '--rol') {
  rolForzado = args[1];
  pedido = args.slice(2).join(' ');
}

const agenteElegido = rolForzado || elegirAgente(pedido);
const agenteRol     = leerAgente(agenteElegido);
const contexto      = leerContexto();
const prompt        = buildPrompt(agenteElegido, agenteRol, contexto, pedido);

console.log(`\n🎯 Agente elegido: ${agenteElegido.toUpperCase()}`);
console.log(`📋 Pedido: "${pedido}"\n`);

guardarLog({ agente: agenteElegido, pedido, rolForzado: !!rolForzado });

// Guardar el prompt en un archivo temp y pasárselo a Claude Code
const tempFile = path.join(__dirname, '.agents', '_prompt_temp.md');
fs.writeFileSync(tempFile, prompt);

console.log(`🚀 Iniciando Claude Code con el agente ${agenteElegido}...\n`);
console.log('─'.repeat(50));

try {
  // Claude Code lee el prompt del archivo y actúa
  execSync(`claude --print "${prompt.replace(/"/g, '\\"')}"`, { 
    stdio: 'inherit',
    cwd: __dirname 
  });
} catch (e) {
  // Claude Code interactivo como fallback
  console.log('\n💡 Tip: Pegá este prompt en Claude Code:\n');
  console.log(prompt);
}

fs.unlinkSync(tempFile);