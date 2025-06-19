import type supertest from 'supertest';
import withServer from '../helpers/withServer';
import { login, loginAdmin } from '../helpers/login';
import testAuthHeader from '../helpers/testAuthHeader';

describe('Loan', () => {
  let request: supertest.Agent;
  let readerAuthHeader: string;
  let adminAuthHeader: string;

  withServer((r) => (request = r));

  beforeAll(async () => {
    readerAuthHeader = await login(request);
    adminAuthHeader = await loginAdmin(request);
  });

  const url = '/api/loans';

  describe('GET /api/loans', () => {
    it('should 403 when not admin', async () => {
      const response = await request
        .get(url)
        .set('Authorization', readerAuthHeader);
      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to use this part of the application',
      });
    });

    it('should 200 and return all loans', async () => {
      const response = await request
        .get(url)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(200);
      expect(response.body.items.length).toBe(2);
      expect(response.body.items).toEqual(
        expect.arrayContaining([
          {
            id: 1,
            library: {
              id: 1,
              name: 'Test library 1',
            },
            copy: {
              sequenceNumber: 1,
              bookIsbn: '9783161484100',
            },
            reader: {
              id: 1,
              name: 'Test Reader',
            },
            startDate: new Date('2024-12-10').toISOString(),
            endDate: new Date('2024-12-11').toISOString(),
          },
          {
            id: 2,
            library: {
              id: 1,
              name: 'Test library 1',
            },
            copy: {
              sequenceNumber: 2,
              bookIsbn: '9783161484100',
            },
            reader: {
              id: 1,
              name: 'Test Reader',
            },
            startDate: new Date('2024-12-10').toISOString(),
            endDate: new Date('2024-12-11').toISOString(),
          },
        ]),
      );
    });

    it('should 400 when given a query', async () => {
      const response = await request
        .get(`${url}?invalid=true`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.query).toHaveProperty('invalid');
    });

    testAuthHeader(() => request.get(url));
  });

  describe('GET /api/loans/:id', () => {
    it('should 403 when not an admin', async () => {
      const response = await request
        .get(`${url}/1`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to use this part of the application',
      });
    });

    it('should 200 when admin', async () => {
      const response = await request
        .get(`${url}/1`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        id: 1,
        library: {
          id: 1,
          name: 'Test library 1',
        },
        copy: {
          sequenceNumber: 1,
          bookIsbn: '9783161484100',
        },
        reader: {
          id: 1,
          name: 'Test Reader',
        },
        startDate: new Date('2024-12-10').toISOString(),
        endDate: new Date('2024-12-11').toISOString(),
      });
    });

    it('should 404 with not existing loan', async () => {
      const response = await request
        .get(`${url}/123`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No loan with this id exists',
      });
      expect(response.body.stack).toBeTruthy();
    });

    it('should 400 with invalid loan id', async () => {
      const response = await request
        .get(`${url}/invalid`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('id');
    });

    testAuthHeader(() => request.get(`${url}/1`));
  });

  describe('POST /api/loans', () => {
    it('should 403 when not an admin or librarian', async () => {
      const response = await request
        .post(url)
        .send({
          copySeqNum: 3,
          copyBookIsbn: '9783161484100',
          readerId: 1,
          startDate: '2024-12-10',
          endDate: '2024-12-11',
        })
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to use this part of the application',
      });
    });

    it('should 201 when admin', async () => {
      const response = await request
        .post(url)
        .send({
          copySeqNum: 1,
          copyBookIsbn: '9783161484105',
          readerId: 1,
          startDate: '2024-12-10',
          endDate: '2024-12-11',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(201);
      expect(response.body).toMatchObject({
        library: {
          id: 2,
          name: 'Test library 2',
        },
        copy: {
          sequenceNumber: 1,
          bookIsbn: '9783161484105',
        },
        reader: {
          id: 1,
          name: 'Test Reader',
        },
        startDate: new Date('2024-12-10').toISOString(),
        endDate: new Date('2024-12-11').toISOString(),
      });
    });

    it('should 404 with not existing reader', async () => {
      const response = await request
        .post(url)
        .send({
          copySeqNum: 1,
          copyBookIsbn: '9783161484105',
          readerId: 123,
          startDate: '2024-12-10',
          endDate: '2024-12-11',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No reader with this id exists',
      });
      expect(response.body.stack).toBeTruthy();
    });

    it('should 400 with invalid reader id', async () => {
      const response = await request
        .post(url)
        .send({
          copySeqNum: 1,
          copyBookIsbn: '9783161484105',
          readerId: 'invalid',
          startDate: '2024-12-10',
          endDate: '2024-12-11',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.body).toHaveProperty('readerId');
    });

    it('should 404 with not existing book', async () => {
      const response = await request
        .post(url)
        .send({
          copySeqNum: 1,
          copyBookIsbn: '9999999999999',
          readerId: 1,
          startDate: '2024-12-10',
          endDate: '2024-12-11',
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
        .post(url)
        .send({
          copySeqNum: 1,
          copyBookIsbn: 'invalid',
          readerId: 1,
          startDate: '2024-12-10',
          endDate: '2024-12-11',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.body).toHaveProperty('copyBookIsbn');
    });

    it('should 404 with not existing copy', async () => {
      const response = await request
        .post(url)
        .send({
          copySeqNum: 123,
          copyBookIsbn: '9783161484105',
          readerId: 1,
          startDate: '2024-12-10',
          endDate: '2024-12-11',
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
        .post(url)
        .send({
          copySeqNum: 'invalid',
          copyBookIsbn: '9783161484105',
          readerId: 1,
          startDate: '2024-12-10',
          endDate: '2024-12-11',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.body).toHaveProperty('copySeqNum');
    });

    it('should 400 with invalid start Date', async () => {
      const response = await request
        .post(url)
        .send({
          copySeqNum: 1,
          copyBookIsbn: '9783161484105',
          readerId: 1,
          startDate: '3000-12-10',
          endDate: '3000-12-11',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.body).toHaveProperty('startDate');
    });

    it('should 400 with invalid start Date', async () => {
      const response = await request
        .post(url)
        .send({
          copySeqNum: 1,
          copyBookIsbn: '9783161484105',
          readerId: 1,
          startDate: '2024-12-10',
          endDate: '2000-12-11',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.body).toHaveProperty('endDate');
    });

    testAuthHeader(() => request.post(url));
  });

  describe('PUT /api/loans/:id', () => {
    it('should 403 when not an admin or librarian', async () => {
      const response = await request
        .put(`${url}/1`)
        .send({
          endDate: '2024-12-12',
        })
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to use this part of the application',
      });
    });

    it('should 200 when admin', async () => {
      const response = await request
        .put(`${url}/1`)
        .send({
          endDate: '2024-12-13',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        id: 1,
        library: {
          id: 1,
          name: 'Test library 1',
        },
        copy: {
          sequenceNumber: 1,
          bookIsbn: '9783161484100',
        },
        reader: {
          id: 1,
          name: 'Test Reader',
        },
        startDate: new Date('2024-12-10').toISOString(),
        endDate: new Date('2024-12-13').toISOString(),
      });
    });

    it('should 404 with not existing loan', async () => {
      const response = await request
        .put(`${url}/123`)
        .send({
          endDate: '2024-12-12',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No loan with this id exists',
      });
      expect(response.body.stack).toBeTruthy();
    });

    it('should 400 with invalid loan id', async () => {
      const response = await request
        .put(`${url}/invalid`)
        .send({
          endDate: '2024-12-12',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('id');
    });

    it('should 404 with not existing reader', async () => {
      const response = await request
        .put(`${url}/1`)
        .send({
          readerId: 123,
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No reader with this id exists',
      });
      expect(response.body.stack).toBeTruthy();
    });

    it('should 400 with invalid reader id', async () => {
      const response = await request
        .put(`${url}/1`)
        .send({
          readerId: 'invalid',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.body).toHaveProperty('readerId');
    });

    it('should 404 with not existing book', async () => {
      const response = await request
        .put(`${url}/1`)
        .send({
          copyBookIsbn: '9999999999999',
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
        .put(`${url}/1`)
        .send({
          copyBookIsbn: 'invalid',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.body).toHaveProperty('copyBookIsbn');
    });

    it('should 404 with not existing copy', async () => {
      const response = await request
        .put(`${url}/1`)
        .send({
          copySeqNum: 123,
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
        .put(`${url}/1`)
        .send({
          copySeqNum: 'invalid',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.body).toHaveProperty('copySeqNum');
    });

    it('should 400 with invalid start Date', async () => {
      const response = await request
        .put(`${url}/1`)
        .send({
          startDate: '3000-12-10',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.body).toHaveProperty('startDate');
    });

    it('should 400 with invalid end Date', async () => {
      const response = await request
        .put(`${url}/1`)
        .send({
          endDate: '2000-12-11',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body).toMatchObject({
        code: 'VALIDATION_FAILED',
        message: 'The end date must be after the start date',
      });
    });

    testAuthHeader(() => request.put(`${url}/1`));
  });

  describe('DELETE /api/loans/:id', () => {
    it('should 403 when not an admin or librarian', async () => {
      const response = await request
        .delete(`${url}/1`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to use this part of the application',
      });
    });

    it('should 204 when admin', async () => {
      const response = await request
        .delete(`${url}/2`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(204);
      expect(response.body).toEqual({});
    });

    it('should 404 with not existing loan', async () => {
      const response = await request
        .delete(`${url}/123`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No loan with this id exists',
      });
      expect(response.body.stack).toBeTruthy();
    });

    it('should 400 with invalid loan id', async () => {
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
