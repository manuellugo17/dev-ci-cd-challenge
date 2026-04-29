const request = require('supertest');
const app = require('../src/app');

beforeAll(() => {
  process.env.APP_ENV = 'wrong_value';
});

afterAll(() => {
  delete process.env.APP_ENV;
});

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('includes env in response', async () => {
    const res = await request(app).get('/health');
    expect(res.body.env).toBe('test');
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown');
    expect(res.statusCode).toBe(404);
  });
});