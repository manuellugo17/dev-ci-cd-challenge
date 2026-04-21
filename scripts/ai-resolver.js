const fs = require('fs');

async function analyzeWithOpenAI(log) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'Analyze CI/CD pipeline failures and return only valid JSON.'
          },
          {
            role: 'user',
            content: `Return JSON with fields:
timestamp, step_failed, probable_cause, confidence, severity, suggested_fix, rollback_required, recommended_action.

Log:
${log}`
          }
        ],
        temperature: 0.2
      })
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

function fallbackAnalysis(log) {
  let cause = 'unknown';
  let fix = 'review logs';

  if (log.includes('ECONNREFUSED')) {
    cause = 'service not reachable';
    fix = 'check service port and availability';
  }

  if (log.includes('npm ERR')) {
    cause = 'dependency issue';
    fix = 'run npm install or check lock file';
  }

  if (log.includes('500')) {
    cause = 'application error';
    fix = 'verify environment variables';
  }

  return {
    timestamp: new Date().toISOString(),
    step_failed: 'unknown',
    probable_cause: cause,
    confidence: 0.6,
    severity: 'medium',
    suggested_fix: fix,
    rollback_required: false,
    recommended_action: 'review pipeline step',
    source: 'local'
  };
}

function extractJSON(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function main() {
  const log = fs.readFileSync('logs/pipeline_failure.log', 'utf8');

  let result = await analyzeWithOpenAI(log);

  if (result) {
    result = extractJSON(result);
  }

  if (!result) {
    result = fallbackAnalysis(log);
  }

  fs.writeFileSync('artifacts/incident_report.json', JSON.stringify(result, null, 2));

  const md = `
Incident Report

Timestamp: ${result.timestamp}
Step Failed: ${result.step_failed}
Cause: ${result.probable_cause}
Severity: ${result.severity}
Fix: ${result.suggested_fix}
`;

  fs.writeFileSync('artifacts/incident_report.md', md.trim());
}

main();