const fs = require('fs');
const path = require('path');

const logPath = process.argv[2]
  || path.join(__dirname, '..', 'logs', 'pipeline_failure.log');

const outputDir = path.join(__dirname, '..', 'artifacts');
const outputMd   = path.join(outputDir, 'incident_report.md');
const outputJson = path.join(outputDir, 'incident_report.json');

// ── Análisis local sin IA ──────────────────────────────────────────
function analyzeLocally(logContent) {
  const lower = logContent.toLowerCase();

  if (lower.includes('expected: 200') && lower.includes('received: 500')) {
    return {
      timestamp: new Date().toISOString(),
      step_failed: 'unit_tests',
      probable_cause: 'El endpoint /health retorna 500 cuando APP_ENV no está definida. El entorno de tests no tenía esa variable configurada.',
      confidence: 'high',
      severity: 'medium',
      suggested_fix: 'Definir APP_ENV=test en el beforeAll() del archivo de tests o en las variables de entorno del workflow.',
      rollback_required: false,
      recommended_action: 'Corregir la configuración del entorno de tests y volver a correr el pipeline.',
      source: 'local_analysis'
    };
  }

  if (lower.includes('econnrefused') || lower.includes('connection refused')) {
    return {
      timestamp: new Date().toISOString(),
      step_failed: 'health_check',
      probable_cause: 'El contenedor no está escuchando en el puerto esperado o no llegó a arrancar correctamente.',
      confidence: 'high',
      severity: 'high',
      suggested_fix: 'Verificar que el Dockerfile expone el puerto correcto y que la variable PORT está definida.',
      rollback_required: true,
      recommended_action: 'Revisar logs del contenedor con docker logs app-staging y corregir la configuración de puertos.',
      source: 'local_analysis'
    };
  }

  if (lower.includes('npm err') || lower.includes('npm error')) {
    return {
      timestamp: new Date().toISOString(),
      step_failed: 'build',
      probable_cause: 'Error en la instalación de dependencias npm. Puede ser un package-lock.json faltante o una versión incompatible.',
      confidence: 'medium',
      severity: 'medium',
      suggested_fix: 'Verificar que package-lock.json está commiteado y que las versiones de Node y npm son compatibles.',
      rollback_required: false,
      recommended_action: 'Correr npm install localmente, commitear el package-lock.json generado y volver a pushear.',
      source: 'local_analysis'
    };
  }

  return {
    timestamp: new Date().toISOString(),
    step_failed: 'unknown',
    probable_cause: 'No se pudo determinar la causa raíz con los logs disponibles.',
    confidence: 'low',
    severity: 'medium',
    suggested_fix: 'Revisar los logs completos del pipeline en GitHub Actions.',
    rollback_required: false,
    recommended_action: 'Inspeccionar manualmente los logs de cada job en la pestaña Actions de GitHub.',
    source: 'local_analysis'
  };
}

// ── Análisis con Claude API ────────────────────────────────────────
async function analyzeWithAI(logContent) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.log('ANTHROPIC_API_KEY no configurada, usando análisis local.');
    return analyzeLocally(logContent);
  }

  try {
    console.log('Analizando con Claude API...');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Analizá estos logs de falla de un pipeline CI/CD y devolvé SOLO un objeto JSON sin texto extra ni backticks.

Logs:
${logContent}

Devolvé exactamente esta estructura:
{
  "timestamp": "${new Date().toISOString()}",
  "step_failed": "nombre_del_paso_en_snake_case",
  "probable_cause": "explicación clara en una o dos oraciones",
  "confidence": "high o medium o low",
  "severity": "critical o high o medium o low",
  "suggested_fix": "pasos concretos para resolver el problema",
  "rollback_required": true o false,
  "recommended_action": "qué hacer a continuación",
  "source": "claude_api"
}`
        }]
      })
    });

    const data = await response.json();
    const text = data.content[0].text.trim()
      .replace(/```json\n?|\n?```/g, '').trim();

    return JSON.parse(text);
  } catch (err) {
    console.error('Error con Claude API, usando análisis local:', err.message);
    return analyzeLocally(logContent);
  }
}

// ── Generar markdown legible pero natural ─────────────────────────
function generateMarkdown(r) {
  const severityLabel = { critical: 'critical', high: 'high', medium: 'medium', low: 'low' };
  const rollback = r.rollback_required ? 'yes' : 'no';

  return `# Incident Report

generated: ${r.timestamp}
source: ${r.source}

## What happened

Step failed: ${r.step_failed}
Severity: ${severityLabel[r.severity] || r.severity}
Confidence: ${r.confidence}

## Root cause

${r.probable_cause}

## How to fix it

${r.suggested_fix}

## Next steps

${r.recommended_action}

rollback required: ${rollback}
`;
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  let logContent = '';
  try {
    logContent = fs.readFileSync(logPath, 'utf8');
    console.log(`Reading logs from: ${logPath}`);
  } catch {
    console.log('Log file not found, using generic message.');
    logContent = 'Pipeline failed. No detailed logs available.';
  }

  const result = await analyzeWithAI(logContent);

  fs.mkdirSync(outputDir, { recursive: true });

  // JSON para Grafana / Elastic
  fs.writeFileSync(outputJson, JSON.stringify(result, null, 2));

  // Markdown legible para humanos
  fs.writeFileSync(outputMd, generateMarkdown(result));

  console.log(`\nReport saved to:`);
  console.log(`  ${outputJson}`);
  console.log(`  ${outputMd}`);
  console.log('\n--- JSON output ---');
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);