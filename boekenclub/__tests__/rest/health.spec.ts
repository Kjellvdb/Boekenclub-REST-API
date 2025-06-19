import type supertest from 'supertest';
import withServer from '../helpers/withServer';

describe('Health', () => {
  let request: supertest.Agent;

  withServer((r) => (request = r));

  const url = '/api/health';

  describe('GET /api/health/ping', () => {
    it('should 200 and return pong', async () => {
      const response = await request.get(`${url}/ping`);

      expect(response.status).toBe(200);
      expect(response.body.pong).toBeTruthy();
    });
  });

  describe('GET /api/health/ping', () => {
    it('should 200 and return the version', async () => {
      const response = await request.get(`${url}/version`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        env: 'testing',
        version: expect.any(String),
        name: 'webservices-boekenclub',
      });
    });
  });
});
