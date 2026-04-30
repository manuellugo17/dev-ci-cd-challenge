
# Dev CI/CD + AI Incident Resolution Challenge

Pipeline CI/CD completo con deploy automatizado, rollback automático y resolución de incidentes asistida por IA sobre una API Node.js.

---

## Decisiones técnicas

### Stack utilizado

- **App:** Node.js + Express
- **Tests:** Jest + Supertest
- **CI/CD:** GitHub Actions con Self-Hosted Runner
- **Infraestructura:** Docker + Docker Compose en VM Ubuntu (red privada)
- **AI Resolver:** Claude API (Anthropic) con fallback local por patrones

### Por qué Self-Hosted Runner

La VM donde se despliega la aplicación está en una red privada empresarial sin IP pública. GitHub Actions no puede conectarse a ella por SSH desde internet. En lugar de exponer la VM con herramientas como ngrok (lo cual no es aceptable en infraestructura corporativa), instalé un Self-Hosted Runner directamente en la VM. El runner establece la conexión hacia GitHub desde adentro de la red, sin necesidad de abrir ningún puerto entrante.

### Por qué Trunk Based Development con tags

Adopté este modelo en lugar de Gitflow porque es más simple de mantener y refleja mejor cómo trabajan los equipos modernos. La lógica es:

- cualquier push a `main` corre los tests y el build siempre
- un push a `main` también dispara el deploy automático a staging
- si staging pasa, el deploy a producción se ejecuta automáticamente a continuación
- los tags `v*-p` están disponibles para el modelo alternativo donde producción requiere decisión manual

---

## Problemas encontrados y soluciones

### Test fallando por dependencia de entorno

El endpoint /health retorna HTTP 500 cuando APP_ENV no está definida.
El test original no configuraba esa variable, por lo que siempre fallaba
con "Expected: 200, Received: 500".

La solución fue configurar process.env.APP_ENV = 'test' en el beforeAll()
del archivo de tests, sin modificar la lógica de la aplicación. De esta
forma el endpoint recibe la variable que necesita y responde correctamente
con HTTP 200.

También se agregaron dos tests adicionales:
- Verificación de que el campo env esté presente en la respuesta
- Validación de que rutas inexistentes retornen HTTP 404

### Dockerfile incompleto

El Dockerfile original usaba un único stage y el puerto expuesto no coincidía con el que usa la aplicación.

Solución: implementé un multi-stage build separando la instalación de dependencias de la imagen final, lo que reduce el tamaño considerablemente. Corregí el puerto a 3001 y agregué las variables de entorno necesarias.

---

## Arquitectura del pipeline

```
	1. Test
		Instalación de dependencias con npm ci
		Ejecución de tests en un entorno aislado (APP_ENV=test)
		Validación básica de que la aplicación funciona correctamente antes de continuar
	2. Build
		Construcción de la imagen Docker de la aplicación
		Ejecución de un smoke test levantando un contenedor temporal
		Verificación de que la app inicia correctamente
	3. Deploy a Staging
		Despliegue en una VM mediante docker compose
		La aplicación queda disponible en el puerto 3001
		Se realiza un health check sobre el endpoint /health
		El pipeline continúa solo si la respuesta es satisfactoria (HTTP 200)
	4. Deploy a Producción
		Despliegue en el entorno productivo (misma VM, puerto 3002)
		Validación nuevamente del endpoint /health
		En caso de fallo, se ejecuta un rollback automático a la versión anterior
	5. Incident Report (en caso de error)
		Se recolectan logs del job que falló
		Se analizan automáticamente (IA o análisis local)
		Se genera un reporte para facilitar el diagnóstico del problema
```

En pull requests solo corren `test` y `build`, sin deploy.

---

## Ambientes

Ambiente	Puerto	Imagen Docker
Staging		3001	`dev-cicd-challenge:staging`
Production	3002	`dev-cicd-challenge:production`

Los contenedores incluyen el SHA del commit en el nombre para identificar fácilmente qué versión está activa.

---

## Rollback automático

Si el health check de producción falla, el pipeline ejecuta automáticamente:

```bash
docker tag dev-cicd-challenge:rollback dev-cicd-challenge:production
docker compose stop production
docker compose up -d production
```

Antes de cada deploy a producción se guarda la imagen activa como `:rollback`, de modo que la restauración no depende de conectividad externa ni acceso al registry. El proceso tarda menos de 30 segundos.

---

## Nota sobre puertos

El contenedor Docker expone por defecto el puerto 3001. Los servicios de staging y production se levantan mediante `docker compose` en la VM, donde cada servicio redefine los puertos mapeados (staging → 3001, production → 3002). La imagen es la misma; el mapeo lo controla el compose file en la VM.

## AI Incident Resolver

Cuando cualquier job del pipeline falla, el resolver:

1. Descarga los logs guardados durante la ejecución
2. Si hay `ANTHROPIC_API_KEY` configurada, los envía a Claude para análisis
3. Si no hay key, aplica detección local por patrones de texto
4. Genera dos archivos en `artifacts/`:

```
incident_report.md   → legible para humanos
incident_report.json → estructurado para ingestión en sistemas de observabilidad
```

El JSON incluye los campos `step_failed`, `probable_cause`, `confidence`, `severity`, `suggested_fix`, `rollback_required` y `recommended_action`.

Patrones que detecta el análisis local:

- HTTP 500 en tests → variable de entorno faltante en el entorno de tests
- Connection refused → problema de puertos en el contenedor
- npm error → package-lock.json faltante o versión incompatible
- Docker error → falla en el deploy o configuración del compose

### Bonus implementados

- Comentario automático en Pull Requests con el reporte del incidente
- Clasificación de severidad (`critical`, `high`, `medium`, `low`)
- Detección automática de si se requiere rollback
- Detección de errores comunes: puertos, variables de entorno, dependencias
- Envío por mail del reporte cuando el pipeline falla (via Gmail SMTP)

---

## Notificación por mail

Cuando el pipeline falla, el AI Resolver genera el reporte y lo envía automáticamente por correo con:

- commit, branch y autor que disparó la falla
- link directo al run de Actions
- contenido completo del reporte de incidente

Requiere configurar tres secrets en el repositorio: `MAIL_USERNAME`, `MAIL_PASSWORD` (contraseña de aplicación de Gmail) y `MAIL_TO`.

---

## Cómo correr localmente

```bash
npm install
npm test
APP_ENV=development node server.js
curl http://localhost:3001/health
```

## Cómo correr con Docker

```bash
docker build -t dev-cicd-challenge .
docker run -p 3001:3001 -e APP_ENV=production dev-cicd-challenge
curl http://localhost:3001/health
```

## Cómo deployar

El deploy a staging es automático con cada push a `main`. 
---

## Mejoras posibles

- Integración con Grafana Loki para centralizar los logs del pipeline y los reportes de incidentes en un dashboard
- Caché de imágenes Docker entre runs para acelerar los builds