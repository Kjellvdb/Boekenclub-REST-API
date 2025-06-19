import type supertest from 'supertest';
import withServer from '../helpers/withServer';
import { login, loginAdmin } from '../helpers/login';
import testAuthHeader from '../helpers/testAuthHeader';

describe('Copy', () => {
  let request: supertest.Agent;
  let readerAuthHeader: string;
  let adminAuthHeader: string;

  withServer((r) => (request = r));

  beforeAll(async () => {
    readerAuthHeader = await login(request);
    adminAuthHeader = await loginAdmin(request);
  });

  const url = '/api/copies';

  describe('POST /api/copies/:isbn', () => {
    it('should 403 when not admin', async () => {
      const response = await request
        .post(`${url}/9783161484100`)
        .send({
          libraryId: 1,
          condition: 'good',
        })
        .set('Authorization', readerAuthHeader);
      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to use this part of the application',
      });
    });

    it('should 201 and create the copy when admin', async () => {
      const response = await request
        .post(`${url}/9783161484100`)
        .send({
          libraryId: 1,
          condition: 'good',
        })
        .set('Authorization', adminAuthHeader);
      expect(response.statusCode).toBe(201);
      expect(response.body).toEqual({
        sequenceNumber: 4,
        book: {
          isbn: '9783161484100',
          title: 'Test Book 1',
        },
        library: {
          id: 1,
          name: 'Test library 1',
        },
        condition: 'good',
        isAvailable: true,
      });
    });

    it('should 400 with not existing book', async () => {
      const response = await request
        .post(`${url}/9999999999999`)
        .send({
          libraryId: 1,
          condition: 'good',
        })
        .set('Authorization', adminAuthHeader);
      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No book with this isbn exists',
      });
      expect(response.body.stack).toBeTruthy();
    });

    it('should 400 with invalid book isbn', async () => {
      const response = await request
        .post(`${url}/123`)
        .send({
          libraryId: 1,
          condition: 'good',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('isbn');
    });

    testAuthHeader(() => request.post(`${url}/9783161484100`));
  });

  describe('PUT /api/copies/:isbn/:id', () => {
    it('should 403 when not admin', async () => {
      const response = await request
        .put(`${url}/9783161484100/1`)
        .send({
          condition: 'Changed condition',
        })
        .set('Authorization', readerAuthHeader);
      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to use this part of the application',
      });
    });

    it('should 200 and create the updated copy when admin', async () => {
      const response = await request
        .put(`${url}/9783161484100/2`)
        .send({
          condition: 'Changed condition',
        })
        .set('Authorization', adminAuthHeader);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        sequenceNumber: 2,
        book: {
          isbn: '9783161484100',
          title: 'Test Book 1',
        },
        library: {
          id: 1,
          name: 'Test library 1',
        },
        condition: 'Changed condition',
        isAvailable: false,
      });
    });

    it('should 404 with not existing book', async () => {
      const response = await request
        .put(`${url}/9999999999999/1`)
        .send({
          condition: 'Changed condition',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No book with this isbn exists',
      });
      expect(response.body.stack).toBeTruthy();
    });

    it('should 400 with invalid book isbn', async () => {
      const response = await request
        .put(`${url}/123/1`)
        .send({
          condition: 'Changed condition',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('isbn');
    });

    it('should 404 with not existing copy', async () => {
      const response = await request
        .put(`${url}/9783161484100/123`)
        .send({
          condition: 'Changed condition',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No copy with this isbn and sequence number exists',
      });
      expect(response.body.stack).toBeTruthy();
    });

    it('should 400 with invalid copy number', async () => {
      const response = await request
        .put(`${url}/9783161484100/invalid`)
        .send({
          condition: 'Changed condition',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('id');
    });

    testAuthHeader(() => request.put(`${url}/9783161484100/1`));
  });

  describe('DELETE /api/copies/:isbn/:id', () => {
    it('should 403 when not admin', async () => {
      const response = await request
        .delete(`${url}/9783161484100/1`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to use this part of the application',
      });
    });

    it('should 204 and return nothing when admin', async () => {
      const response = await request
        .delete(`${url}/9783161484100/2`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(204);
      expect(response.body).toEqual({});
    });

    it('should 404 with not existing book', async () => {
      const response = await request
        .delete(`${url}/9999999999999/1`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No book with this isbn exists',
      });
      expect(response.body.stack).toBeTruthy();
    });

    it('should 400 with invalid book isbn', async () => {
      const response = await request
        .delete(`${url}/123/1`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('isbn');
    });

    it('should 404 with not existing copy', async () => {
      const response = await request
        .delete(`${url}/9783161484100/123`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No copy with this isbn and sequence number exists',
      });
      expect(response.body.stack).toBeTruthy();
    });

    it('should 400 with invalid copy number', async () => {
      const response = await request
        .delete(`${url}/9783161484100/invalid`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('id');
    });

    testAuthHeader(() => request.delete(`${url}/9783161484100/1`));
  });
});
