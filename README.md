# Dev CI/CD + AI Incident Resolution Challenge

Este challenge busca evaluar habilidades de **CI/CD, automatización, observabilidad y pensamiento operativo moderno**, incorporando un componente de **resolución de incidentes asistida por IA**.

El objetivo no es solo construir un pipeline que funcione, sino demostrar cómo la **IA puede ayudar a diagnosticar y acelerar la resolución de fallas en pipelines o despliegues**.

---

## Contexto

Este repositorio contiene una **API Node.js simple** que expone un endpoint:

```http
GET /health
```

El proyecto incluye:

- una aplicación básica
- un test que falla intencionalmente
- una configuración mínima de CI/CD
- un placeholder para un AI resolver
- logs de ejemplo para análisis

Tu tarea es:

1. Construir un pipeline CI/CD completo
2. Resolver los problemas actuales del proyecto
3. Desplegar la aplicación
4. Implementar un **mecanismo de diagnóstico automático asistido por IA cuando algo falla**

---

## Objetivos del challenge

Queremos ver cómo diseñás sistemas que:

- automaticen el ciclo de desarrollo
- detecten fallas rápidamente
- ayuden a resolver incidentes
- minimicen impacto en producción
- utilicen **IA para acelerar el diagnóstico**

---

## Requerimientos

### 1. CI Pipeline

Implementar un pipeline que ejecute al hacer **push o pull request**.

El pipeline debe incluir:

- instalación de dependencias
- ejecución de tests
- build del proyecto
- generación de artefactos

Herramienta sugerida:

- GitHub Actions (preferido)

Pero podés usar cualquier enfoque razonable.

---

### 2. Tests

El repositorio contiene un test que actualmente **falla**.

Esperamos que:

- identifiques el problema
- lo soluciones
- agregues al menos **un test adicional**

---

### 3. Dockerización

Crear o corregir un `Dockerfile` que permita ejecutar la aplicación.

El contenedor debe:

- iniciar correctamente
- exponer el puerto correcto
- permitir correr el healthcheck

Opcional pero valorado:

- imagen liviana
- multi-stage build

---

### 4. Deploy a Staging

Implementar un deploy automático a **staging** cuando el pipeline pasa.

Puede ser en:

- Railway
- Render
- Fly.io
- Kubernetes
- ECS
- Docker Compose
- cualquier alternativa razonable

Debe existir un **health check automático**:

```http
GET /health
```

---

### 5. End-to-End / Smoke Test

Luego del deploy a staging se debe ejecutar al menos un test de smoke.

Ejemplo:

```bash
curl /health
```

Si falla, el pipeline debe marcar error.

---

### 6. Deploy a Producción

Si staging pasa correctamente:

- desplegar a producción

Podés simular producción con otro environment.

---

### 7. Rollback automático

Si el deploy de producción falla el health check:

- ejecutar rollback automático
- restaurar la versión anterior

---

### 8. AI Incident Resolver

Además del pipeline CI/CD, queremos que implementes un **componente que utilice IA para analizar fallas del pipeline o del deploy**.

Este componente debe:

1. Leer logs de fallas del pipeline
2. Analizar posibles causas
3. Generar un diagnóstico automático

El objetivo es simular un **AI-assisted incident response system**.

---

## Qué debería hacer el AI Resolver

Cuando el pipeline falla:

- recolectar logs
- enviarlos a un modelo de IA
- generar un resumen estructurado del incidente

### Output esperado

El sistema debe generar un archivo como:

```text
artifacts/incident_report.md
```

o

```text
artifacts/incident_report.json
```

Ejemplo:

```text
Incident Summary

Step failed:
Unit Tests

Probable root cause:
The test expects the Express app to be exported but the server file starts the listener directly.

Confidence:
Medium

Suggested fix:
Export the Express app instance and move the listen() call to a separate file.

Recommended action:
Fix test setup and rerun pipeline.

Rollback required:
No
```

---

## Archivos incluidos

Este kit ya trae:

- `src/app.js`
- `server.js`
- `__tests__/app.test.js`
- `logs/pipeline_failure.log`
- `scripts/ai-resolver.js`
- `.github/workflows/ci.yml`
- `Dockerfile`

**Importante:** algunos archivos están intencionalmente incompletos o mal configurados para que el candidato los resuelva.

---

## Evaluación

Vamos a evaluar:

### CI/CD
- calidad del pipeline
- claridad de la automatización
- manejo de errores

### Infraestructura
- dockerización
- deploy strategy
- rollback

### Observabilidad
- logs
- health checks
- diagnóstico

### Uso de IA
- cómo usaste IA para analizar incidentes
- claridad del reporte generado
- utilidad real del diagnóstico

### Calidad general
- estructura del repo
- claridad del código
- documentación

---

## Bonus

Suma puntos si implementás:

- comentario automático en PR con el diagnóstico del incidente
- clasificación de severidad
- detección automática de rollback necesario
- análisis de logs de Docker
- análisis de logs del deploy
- detección de errores comunes como puertos, env vars o tests

---

## Entrega

1. Forkear este repositorio
2. Implementar la solución
3. Enviar el link del repo

---

## Tiempo estimado

Entre **2 y 4 horas**.

No es necesario completar todo si el tiempo no alcanza.

Valoramos mucho **explicar decisiones técnicas** en el README.
# prueba automatizada 20260429_210043
# prueba automatizada 20260429_210513
# prueba automatizada 20260429_210950
