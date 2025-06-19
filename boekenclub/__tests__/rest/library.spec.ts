import type supertest from 'supertest';
import withServer from '../helpers/withServer';
import { login, loginAdmin } from '../helpers/login';
import testAuthHeader from '../helpers/testAuthHeader';

describe('Library', () => {
  let request: supertest.Agent;
  let readerAuthHeader: string;
  let adminAuthHeader: string;

  withServer((r) => (request = r));

  beforeAll(async () => {
    readerAuthHeader = await login(request);
    adminAuthHeader = await loginAdmin(request);
  });

  const url = '/api/libraries';

  describe('GET /api/libraries', () => {
    it('should 200 and return all libraries', async () => {
      const response = await request.get(url);

      expect(response.statusCode).toBe(200);
      expect(response.body.items.length).toBe(2);
      expect(response.body.items).toEqual(
        expect.arrayContaining([
          {
            id: 1,
            name: 'Test library 1',
            website: 'https://www.test.library.1.be',
            email: 'Test.library.1@email.com',
            address: 'Test Address 1',
          },
          {
            id: 2,
            name: 'Test library 2',
            website: 'https://www.test.library.2.be',
            email: 'Test.library.2@email.com',
            address: 'Test Address 2',
          },
        ]),
      );
    });

    it('should 400 when given a query', async () => {
      const response = await request.get(`${url}?invalid=true`);
      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.query).toHaveProperty('invalid');
    });
  });

  describe('GET /api/libraries/:id', () => {
    it('should 200 and return the requested library', async () => {
      const response = await request.get(`${url}/1`);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        id: 1,
        name: 'Test library 1',
        website: 'https://www.test.library.1.be',
        email: 'Test.library.1@email.com',
        address: 'Test Address 1',
      });
    });

    it('should 404 with not existing library', async () => {
      const response = await request.get(`${url}/123`);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No library with this id exists',
      });
    });

    it('should 400 with invalid library id', async () => {
      const response = await request.get(`${url}/invalid`);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('id');
    });
  });

  describe('POST /api/libraries', () => {
    it('should 403 when not admin', async () => {
      const response = await request
        .post(url)
        .send({
          name: 'Test library 3',
          website: 'https://www.test.library.3.be',
          email: 'Test.library.3@email.com',
          address: 'Test Address 3',
        })
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to use this part of the application',
      });
    });

    it('should 201 and return the library', async () => {
      const response = await request
        .post(url)
        .send({
          name: 'Test library 3',
          website: 'https://www.test.library.3.be',
          email: 'Test.library.3@email.com',
          address: 'Test Address 3',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(201);
      expect(response.body).toMatchObject({
        name: 'Test library 3',
        website: 'https://www.test.library.3.be',
        email: 'Test.library.3@email.com',
        address: 'Test Address 3',
      });
    });

    it('should 400 with library already exists', async () => {
      const response = await request
        .post(url)
        .send({
          name: 'Test library 3',
          website: 'https://www.test.library.3.be',
          email: 'Test.library.3@email.com',
          address: 'Test Address 3',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body).toMatchObject({
        code: 'VALIDATION_FAILED',
        message: 'A library with this website already exists',
      });
    });

    testAuthHeader(() => request.post(url));
  });

  describe('PUT /api/libraries/:id', () => {
    it('should 403 when not admin', async () => {
      const response = await request
        .put(`${url}/1`)
        .send({
          name: 'Changed name',
        })
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to use this part of the application',
      });
    });

    it('should 200 and return the updated library', async () => {
      const response = await request
        .put(`${url}/1`)
        .send({
          name: 'Changed name',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        id: 1,
        name: 'Changed name',
        website: 'https://www.test.library.1.be',
        email: 'Test.library.1@email.com',
        address: 'Test Address 1',
      });
    });

    it('should 404 with not existing library', async () => {
      const response = await request
        .put(`${url}/999`)
        .send({
          name: 'Changed name',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No library with this id exists',
      });
    });

    it('should 400 with invalid library id', async () => {
      const response = await request
        .put(`${url}/invalid`)
        .send({
          name: 'Changed name',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('id');
    });

    testAuthHeader(() => request.put(`${url}/1`));
  });

  describe('DELETE /api/libraries/:id', () => {
    it('should 403 when not admin', async () => {
      const response = await request
        .delete(`${url}/1`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to use this part of the application',
      });
    });

    it('should 204 and delete the library', async () => {
      const response = await request
        .delete(`${url}/1`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(204);
      expect(response.body).toEqual({});
    });

    it('should 404 with not existing library anymore', async () => {
      const response = await request
        .delete(`${url}/1`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No library with this id exists',
      });
    });

    it('should 404 with not existing library', async () => {
      const response = await request
        .delete(`${url}/666`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No library with this id exists',
      });
    });

    it('should 400 with invalid library id', async () => {
      const response = await request
        .delete(`${url}/invalid`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('id');
    });

    testAuthHeader(() => request.delete(`${url}/1`));
  });
});

describe('Library - Copy', () => {
  let request: supertest.Agent;

  withServer((r) => (request = r));

  const url = '/api/libraries';

  describe('GET /api/libraries/:id/copies', () => {
    it('should 200 and return all copies of the library', async () => {
      const response = await request.get(`${url}/1/copies`);

      expect(response.statusCode).toBe(200);
      expect(response.body.items.length).toBe(2);
      expect(response.body.items).toEqual(
        expect.arrayContaining([
          {
            sequenceNumber: 1,
            book: {
              isbn: '9783161484100',
              title: 'Test Book 1',
            },
            library: {
              id: 1,
              name: 'Test library 1',
            },
            condition: 'good',
            isAvailable: false,
          },
          {
            sequenceNumber: 2,
            book: {
              isbn: '9783161484100',
              title: 'Test Book 1',
            },
            library: {
              id: 1,
              name: 'Test library 1',
            },
            condition: 'bad',
            isAvailable: false,
          },
        ]),
      );
    });

    it('should 404 with not existing library', async () => {
      const response = await request.get(`${url}/123/copies`);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No library with this id exists',
      });
      expect(response.body.stack).toBeTruthy();
    });

    it('should 400 with invalid library id', async () => {
      const response = await request.get(`${url}/invalid/copies`);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('id');
    });
  });

  describe('GET /api/libraries/available/:isbn', () => {
    it('should 200 and return all library with available copies', async () => {
      const response = await request.get(`${url}/available/9783161484100`);

      expect(response.statusCode).toBe(200);
      expect(response.body.items.length).toBe(1);
      expect(response.body.items).toEqual(
        expect.arrayContaining([
          {
            id: 2,
            name: 'Test library 2',
            website: 'https://www.test.library.2.be',
            email: 'Test.library.2@email.com',
            address: 'Test Address 2',
          },
        ]),
      );
    });

    it('should 404 with not existing book', async () => {
      const response = await request.get(`${url}/available/9999999999999`);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No book with this isbn exists',
      });
      expect(response.body.stack).toBeTruthy();
    });

    it('should 400 with invalid book isbn', async () => {
      const response = await request.get(`${url}/available/123`);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('isbn');
    });
  });

  describe('GET /api/libraries/:id/available/:isbn', () => {
    it('should 200 and return all available copies of a book in a library', async () => {
      const response = await request.get(`${url}/2/available/9783161484100`);

      expect(response.statusCode).toBe(200);
      expect(response.body.items.length).toBe(1);
      expect(response.body.items).toEqual(
        expect.arrayContaining([
          {
            sequenceNumber: 3,
            book: {
              isbn: '9783161484100',
              title: 'Test Book 1',
            },
            library: {
              id: 2,
              name: 'Test library 2',
            },
            condition: 'good',
            isAvailable: true,
          },
        ]),
      );
    });

    it('should 404 with not existing library', async () => {
      const response = await request.get(`${url}/123/available/9783161484100`);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No library with this id exists',
      });
      expect(response.body.stack).toBeTruthy();
    });

    it('should 400 with invalid library id', async () => {
      const response = await request.get(
        `${url}/invalid/available/9783161484100`,
      );

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('id');
    });

    it('should 404 with not existing book', async () => {
      const response = await request.get(`${url}/2/available/9999999999999`);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No book with this isbn exists',
      });
      expect(response.body.stack).toBeTruthy();
    });

    it('should 400 with invalid book isbn', async () => {
      const response = await request.get(`${url}/2/available/123`);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('isbn');
    });
  });
});
