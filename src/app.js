const express = require('express');

const app = express();

app.get('/health', (_req, res) => {
  const envReady = Boolean(process.env.APP_ENV);
  if (!envReady) {
    return res.status(500).json({
      status: 'degraded',
      reason: 'APP_ENV is missing'
    });
  }

  return res.status(200).json({
    status: 'ok',
    env: process.env.APP_ENV
  });
});

app.get('/version', (_req, res) => {
  res.status(200).json({
    version: '1.1.0',
    environment: process.env.APP_ENV
  });
});

module.exports = app;
