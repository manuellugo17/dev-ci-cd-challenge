const fs = require('fs');
const path = require('path');

const logPath = process.argv[2] || path.join(__dirname, '..', 'logs', 'pipeline_failure.log');
const artifactsDir = path.join(__dirname, '..', 'artifacts');

function detectFromLogs(log) {
  const l = log.toLowerCase();

  if (l.includes('expected: 200') && l.includes('received: 500')) {
    return {
      step_failed: 'unit_tests',
      probable_cause: 'El endpoint /health retorna 500 porque la variable APP_ENV no está definida en el entorno de tests.',
      confidence: 'high',
      severity: 'medium',
      suggested_fix: 'Definir APP_ENV=test en el beforeAll() del archivo de tests o como variable de entorno en el workflow.',
      rollback_required: false,
      recommended_action: 'Corregir la configuración del entorno de tests y volver a ejecutar el pipeline.'
    };
  }

  if (l.includes('econnrefused') || l.includes('connection refused')) {
    return {
      step_failed: 'health_check',
      probable_cause: 'El contenedor no está escuchando en el puerto esperado o no llegó a iniciar correctamente.',
      confidence: 'high',
      severity: 'high',
      suggested_fix: 'Verificar que el EXPOSE del Dockerfile y la variable PORT coinciden con la configuración de la app.',
      rollback_required: true,
      recommended_action: 'Revisar los logs del contenedor con docker logs app-staging y corregir la configuración de puertos.'
    };
  }

  if (l.includes('npm err') || l.includes('npm error')) {
    return {
      step_failed: 'build',
      probable_cause: 'Falló la instalación de dependencias. Probablemente falta el package-lock.json o hay una versión incompatible.',
      confidence: 'medium',
      severity: 'medium',
      suggested_fix: 'Ejecutar npm install localmente, commitear el package-lock.json generado y volver a pushear.',
      rollback_required: false,
      recommended_action: 'Verificar que package-lock.json está commiteado y que la versión de Node es compatible.'
    };
  }

  if (l.includes('docker') && (l.includes('error') || l.includes('failed'))) {
    return {
      step_failed: 'deploy',
      probable_cause: 'Falló una operación de Docker durante el deploy. Puede ser un problema de imagen, red o configuración del compose.',
      confidence: 'medium',
      severity: 'high',
      suggested_fix: 'Revisar los logs de docker compose y verificar que la imagen fue construida y taggeada correctamente.',
      rollback_required: true,
      recommended_action: 'Ejecutar docker compose logs en la VM e inspeccionar el contenedor fallido.'
    };
  }

  return {
    step_failed: 'unknown',
    probable_cause: 'No se pudo determinar la causa raíz con los logs disponibles.',
    confidence: 'low',
    severity: 'medium',
    suggested_fix: 'Revisar los logs completos del pipeline en GitHub Actions.',
    rollback_required: false,
    recommended_action: 'Inspeccionar manualmente cada job en la pestaña Actions de GitHub.'
  };
}

async function analyze(log) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return { ...detectFromLogs(log), source: 'local' };
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Sos un especialista en CI/CD. Analizá estos logs de falla y devolvé únicamente un objeto JSON sin texto adicional ni markdown.

Logs:
${log}

Devolvé exactamente esta estructura con todos los valores en español:
{
  "step_failed": "nombre del paso en snake_case",
  "probable_cause": "una o dos oraciones explicando qué salió mal",
  "confidence": "high|medium|low",
  "severity": "critical|high|medium|low",
  "suggested_fix": "pasos concretos para resolver el problema",
  "rollback_required": true o false,
  "recommended_action": "qué hacer a continuación"
}`
        }]
      })
    });

    const data = await res.json();
    const text = data.content[0].text.trim().replace(/```json|```/g, '').trim();
    return { ...JSON.parse(text), source: 'claude' };
  } catch (err) {
    return { ...detectFromLogs(log), source: 'local' };
  }
}

async function main() {
  let log = '';
  try {
    log = fs.readFileSync(logPath, 'utf8');
  } catch {
    log = 'Pipeline failed. No logs available.';
  }

  const result = await analyze(log);
  const report = {
    timestamp: new Date().toISOString(),
    ...result
  };

  fs.mkdirSync(artifactsDir, { recursive: true });

  fs.writeFileSync(
    path.join(artifactsDir, 'incident_report.json'),
    JSON.stringify(report, null, 2)
  );

  fs.writeFileSync(
    path.join(artifactsDir, 'incident_report.md'),
    `# Incident Report

generated: ${report.timestamp}
source: ${report.source}

## What happened

step: ${report.step_failed}
severity: ${report.severity}
confidence: ${report.confidence}

## Root cause

${report.probable_cause}

## Fix

${report.suggested_fix}

## Next steps

${report.recommended_action}

rollback required: ${report.rollback_required ? 'yes' : 'no'}
`
  );

  console.log(JSON.stringify(report, null, 2));
}

main();