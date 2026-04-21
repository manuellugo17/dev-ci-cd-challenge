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

  return res.status(500).json({
    status: 'ok',
    env: process.env.APP_ENV
  });
});

module.exports = app;
