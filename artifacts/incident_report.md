# Incident Report

generated: 2026-04-21T03:07:03.364Z
source: local_analysis

## What happened

Step failed: build
Severity: medium
Confidence: medium

## Root cause

Error en la instalación de dependencias npm. Puede ser un package-lock.json faltante o una versión incompatible.

## How to fix it

Verificar que package-lock.json está commiteado y que las versiones de Node y npm son compatibles.

## Next steps

Correr npm install localmente, commitear el package-lock.json generado y volver a pushear.

rollback required: no
