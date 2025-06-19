import type supertest from 'supertest';
import withServer from '../helpers/withServer';
import { login, loginAdmin, loginAuthor } from '../helpers/login';
import testAuthHeader from '../helpers/testAuthHeader';
import { prisma } from '../../src/data';

describe('Readers', () => {
  let request: supertest.Agent;
  let readerAuthHeader: string;
  let adminAuthHeader: string;
  let authorAuthHeader: string;

  withServer((r) => (request = r));

  beforeAll(async () => {
    readerAuthHeader = await login(request);
    adminAuthHeader = await loginAdmin(request);
    authorAuthHeader = await loginAuthor(request);
  });

  const url = '/api/readers';

  describe('GET /api/readers', () => {
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

    it('should 200 and return all readers', async () => {
      const response = await request
        .get(url)
        .set('Authorization', adminAuthHeader);
      expect(response.status).toBe(200);
      expect(response.body.items.length).toBe(4);
      expect(response.body.items).toEqual(
        expect.arrayContaining([
          {
            id: 1,
            name: 'Test Reader',
            email: 'test.reader@hogent.be',
            address: 'Straat 1, 9000 Gent',
          },
          {
            id: 2,
            name: 'Admin Reader',
            email: 'admin.reader@hogent.be',
            address: 'Straat 2, 9000 Gent',
          },
          {
            id: 3,
            name: 'Author Reader',
            email: 'author.reader@hogent.be',
            address: 'Straat 3, 9000 Gent',
          },
          {
            id: 4,
            name: 'Second Author Reader',
            email: 'second.author.reader@hogent.be',
            address: 'Straat 4, 9000 Gent',
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

  describe('GET /api/readers/:id', () => {
    it('should 200 and return the requested reader', async () => {
      const response = await request
        .get(`${url}/1`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        id: 1,
        name: 'Test Reader',
        email: 'test.reader@hogent.be',
        address: 'Straat 1, 9000 Gent',
      });
    });

    it('should 200 and return my reader', async () => {
      const response = await request
        .get(`${url}/me`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        id: 1,
        name: 'Test Reader',
        email: 'test.reader@hogent.be',
        address: 'Straat 1, 9000 Gent',
      });
    });

    it('should 404 with not existing reader', async () => {
      const response = await request
        .get(`${url}/123`)
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
        .get(`${url}/invalid`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('id');
    });

    it('should 403 when not an admin and not own reader id', async () => {
      const response = await request
        .get(`${url}/2`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to view this information',
      });
    });

    testAuthHeader(() => request.get(`${url}/1`));
  });

  describe('POST /api/readers', () => {
    afterAll(async () => {
      await prisma.reader.deleteMany({
        where: {
          email: 'new.reader@hogent.be',
        },
      });
    });

    it('should 201 and return the registered reader', async () => {
      const response = await request.post(url).send({
        name: 'New reader',
        email: 'new.reader@hogent.be',
        address: 'Straat 5, 9000 Gent',
        password: 'password1234',
      });

      expect(response.statusCode).toBe(201);
      expect(response.body.token).toBeDefined();
    });

    it('should 400 with this email is already taken', async () => {
      const response = await request.post(url).send({
        name: 'New reader',
        email: 'new.reader@hogent.be',
        address: 'Straat 5, 9000 Gent',
        password: 'password1234',
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toMatchObject({
        code: 'VALIDATION_FAILED',
        message: 'A reader with this email already exists',
      });
    });
  });

  describe('PUT /api/readers/:id', () => {
    it('should 200 and return the updated reader', async () => {
      const response = await request
        .put(`${url}/1`)
        .send({
          name: 'Changed name',
        })
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        id: 1,
        name: 'Changed name',
        email: 'test.reader@hogent.be',
        address: 'Straat 1, 9000 Gent',
      });
    });

    it('should 200 and return my updated reader', async () => {
      const response = await request
        .put(`${url}/me`)
        .send({
          name: 'Changed name',
        })
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        id: 1,
        name: 'Changed name',
        email: 'test.reader@hogent.be',
        address: 'Straat 1, 9000 Gent',
      });
    });

    it('should 403 when not an admin and not own reader id', async () => {
      const response = await request
        .put(`${url}/2`)
        .send({
          name: 'Changed name',
        })
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to edit this information',
      });
    });

    it('should 200 and return the updated reader when an admin', async () => {
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
        email: 'test.reader@hogent.be',
        address: 'Straat 1, 9000 Gent',
      });
    });

    it('should 404 with not existing reader', async () => {
      const response = await request
        .put(`${url}/123`)
        .send({
          name: 'Changed name',
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

  describe('DELETE /api/readers/:id', () => {
    it('should 204 and return nothing', async () => {
      const response = await request
        .delete(`${url}/1`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(204);
      expect(response.body).toEqual({});
    });

    it('should 204 and return nothing, but delete me', async () => {
      const response = await request
        .delete(`${url}/me`)
        .set('Authorization', authorAuthHeader);

      expect(response.statusCode).toBe(204);
      expect(response.body).toEqual({});
    });

    it('should 403 when not an admin and not own reader id', async () => {
      const response = await request
        .delete(`${url}/2`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to delete this information',
      });
    });

    it('should 204 and return nothing when an admin', async () => {
      const response = await request
        .delete(`${url}/4`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(204);
      expect(response.body).toEqual({});
    });

    it('should 404 with not existing reader anymore', async () => {
      const response = await request
        .delete(`${url}/4`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No reader with this id exists',
      });
    });

    it('should 404 with not existing reader', async () => {
      const response = await request
        .delete(`${url}/123`)
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
        .delete(`${url}/invalid`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('id');
    });

    testAuthHeader(() => request.delete(`${url}/1`));
  });
});

describe('Reader - saved', () => {
  let request: supertest.Agent;
  let readerAuthHeader: string;
  let adminAuthHeader: string;

  withServer((r) => (request = r));

  beforeAll(async () => {
    readerAuthHeader = await login(request);
    adminAuthHeader = await loginAdmin(request);
  });

  const url = '/api/readers';

  describe('GET /api/readers/:id/saved', () => {
    it('should 200 and return the saved books', async () => {
      const response = await request
        .get(`${url}/1/saved`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(200);
      expect(response.body.items.length).toBe(3);
      expect(response.body.items).toEqual(
        expect.arrayContaining([
          {
            reader: {
              id: 1,
              name: 'Test Reader',
            },
            book: {
              isbn: '9783161484100',
              title: 'Test Book 1',
            },
          },
          {
            reader: {
              id: 1,
              name: 'Test Reader',
            },
            book: {
              isbn: '9783161484101',
              title: 'Test Book 2',
            },
          },
          {
            reader: {
              id: 1,
              name: 'Test Reader',
            },
            book: {
              isbn: '9783161484102',
              title: 'Test Book 3',
            },
          },
        ]),
      );
    });

    it('should 200 and return my saved books', async () => {
      const response = await request
        .get(`${url}/me/saved`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(200);
      expect(response.body.items.length).toBe(3);
      expect(response.body.items).toEqual(
        expect.arrayContaining([
          {
            reader: {
              id: 1,
              name: 'Test Reader',
            },
            book: {
              isbn: '9783161484100',
              title: 'Test Book 1',
            },
          },
          {
            reader: {
              id: 1,
              name: 'Test Reader',
            },
            book: {
              isbn: '9783161484101',
              title: 'Test Book 2',
            },
          },
          {
            reader: {
              id: 1,
              name: 'Test Reader',
            },
            book: {
              isbn: '9783161484102',
              title: 'Test Book 3',
            },
          },
        ]),
      );
    });

    it('should 403 when not an admin and not own reader id', async () => {
      const response = await request
        .get(`${url}/2/saved`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to view this information',
      });
    });

    it('should 200 and return the saved books when an admin', async () => {
      const response = await request
        .get(`${url}/1/saved`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(200);
      expect(response.body.items.length).toBe(3);
      expect(response.body.items).toEqual(
        expect.arrayContaining([
          {
            reader: {
              id: 1,
              name: 'Test Reader',
            },
            book: {
              isbn: '9783161484100',
              title: 'Test Book 1',
            },
          },
          {
            reader: {
              id: 1,
              name: 'Test Reader',
            },
            book: {
              isbn: '9783161484101',
              title: 'Test Book 2',
            },
          },
          {
            reader: {
              id: 1,
              name: 'Test Reader',
            },
            book: {
              isbn: '9783161484102',
              title: 'Test Book 3',
            },
          },
        ]),
      );
    });

    it('should 404 with not existing reader', async () => {
      const response = await request
        .get(`${url}/123/saved`)
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
        .get(`${url}/invalid/saved`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('id');
    });

    testAuthHeader(() => request.get(`${url}/1/saved`));
  });

  describe('POST /api/readers/:id/saved', () => {
    it('should 201 and return the saved book', async () => {
      const response = await request
        .post(`${url}/1/saved`)
        .send({ bookIsbn: '9783161484103' })
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(201);
      expect(response.body).toEqual({
        reader: {
          id: 1,
          name: 'Test Reader',
        },
        book: {
          isbn: '9783161484103',
          title: 'Test Book 4',
        },
      });
    });

    it('should 201 and return my saved book', async () => {
      const response = await request
        .post(`${url}/me/saved`)
        .send({ bookIsbn: '9783161484104' })
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(201);
      expect(response.body).toEqual({
        reader: {
          id: 1,
          name: 'Test Reader',
        },
        book: {
          isbn: '9783161484104',
          title: 'Test Book 5',
        },
      });
    });

    it('should 403 when not an admin and not own reader id', async () => {
      const response = await request
        .post(`${url}/2/saved`)
        .send({ bookIsbn: '9783161484103' })
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to create this information',
      });
    });

    it('should 201 and return the saved book when an admin', async () => {
      const response = await request
        .post(`${url}/1/saved`)
        .send({ bookIsbn: '9783161484105' })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(201);
      expect(response.body).toEqual({
        reader: {
          id: 1,
          name: 'Test Reader',
        },
        book: {
          isbn: '9783161484105',
          title: 'Test Book 6',
        },
      });
    });

    it('should 400 with book already saved', async () => {
      const response = await request
        .post(`${url}/1/saved`)
        .send({ bookIsbn: '9783161484105' })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body).toMatchObject({
        code: 'VALIDATION_FAILED',
        message: 'This book is already saved',
      });
    });

    it('should 404 with not existing reader', async () => {
      const response = await request
        .post(`${url}/123/saved`)
        .send({ bookIsbn: '9783161484103' })
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
        .post(`${url}/invalid/saved`)
        .send({ bookIsbn: '9783161484103' })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('id');
    });

    it('should 404 with not existing book', async () => {
      const response = await request
        .post(`${url}/1/saved`)
        .send({ bookIsbn: '9999999999999' })
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
        .post(`${url}/1/saved`)
        .send({ bookIsbn: '123' })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.body).toHaveProperty('bookIsbn');
    });

    testAuthHeader(() => request.post(`${url}/1/saved`));
  });

  describe('DELETE /api/readers/:id/saved/:isbn', () => {
    it('should 204 and return nothing', async () => {
      const response = await request
        .delete(`${url}/1/saved/9783161484100`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(204);
      expect(response.body).toEqual({});
    });

    it('should 204 and return nothing, but delete my saved book', async () => {
      const response = await request
        .delete(`${url}/me/saved/9783161484101`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(204);
      expect(response.body).toEqual({});
    });

    it('should 403 when not an admin and not own reader id', async () => {
      const response = await request
        .delete(`${url}/2/saved/9783161484101`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to delete this information',
      });
    });

    it('should 204 and return nothing when an admin', async () => {
      const response = await request
        .delete(`${url}/1/saved/9783161484102`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(204);
      expect(response.body).toEqual({});
    });

    it('should 404 with not existing saved book anymore', async () => {
      const response = await request
        .delete(`${url}/1/saved/9783161484100`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No saved books with this id exists',
      });
    });

    it('should 404 with not existing reader', async () => {
      const response = await request
        .delete(`${url}/123/saved/9783161484100`)
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
        .delete(`${url}/invalid/saved/9783161484100`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('id');
    });

    it('should 404 with not existing book', async () => {
      const response = await request
        .delete(`${url}/1/saved/9999999999999`)
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
        .delete(`${url}/1/saved/123`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('isbn');
    });

    testAuthHeader(() => request.delete(`${url}/1/saved/9783161484100`));
  });
});

describe('Reader - review', () => {
  let request: supertest.Agent;
  let readerAuthHeader: string;
  let adminAuthHeader: string;

  withServer((r) => (request = r));

  beforeAll(async () => {
    readerAuthHeader = await login(request);
    adminAuthHeader = await loginAdmin(request);
  });

  const url = '/api/readers';

  describe('GET /api/readers/:id/reviews', () => {
    it('should 200 and return the reviews', async () => {
      const response = await request
        .get(`${url}/1/reviews`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(200);
      expect(response.body.items.length).toBe(3);
      expect(response.body.items).toEqual(
        expect.arrayContaining([
          {
            reader: {
              id: 1,
              name: 'Test Reader',
            },
            book: {
              isbn: '9783161484100',
              title: 'Test Book 1',
            },
            rating: 5,
            content: 'Een prachtig boek!',
            date: new Date('2024-12-10').toISOString(),
          },
          {
            reader: {
              id: 1,
              name: 'Test Reader',
            },
            book: {
              isbn: '9783161484101',
              title: 'Test Book 2',
            },
            rating: 3,
            content: 'Een mooi boek.',
            date: new Date('2024-12-10').toISOString(),
          },
          {
            reader: {
              id: 1,
              name: 'Test Reader',
            },
            book: {
              isbn: '9783161484102',
              title: 'Test Book 3',
            },
            rating: 4,
            content: 'Een goed boek.',
            date: new Date('2024-12-10').toISOString(),
          },
        ]),
      );
    });

    it('should 200 and return my reviews', async () => {
      const response = await request
        .get(`${url}/me/reviews`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(200);
      expect(response.body.items.length).toBe(3);
      expect(response.body.items).toEqual(
        expect.arrayContaining([
          {
            reader: {
              id: 1,
              name: 'Test Reader',
            },
            book: {
              isbn: '9783161484100',
              title: 'Test Book 1',
            },
            rating: 5,
            content: 'Een prachtig boek!',
            date: new Date('2024-12-10').toISOString(),
          },
          {
            reader: {
              id: 1,
              name: 'Test Reader',
            },
            book: {
              isbn: '9783161484101',
              title: 'Test Book 2',
            },
            rating: 3,
            content: 'Een mooi boek.',
            date: new Date('2024-12-10').toISOString(),
          },
          {
            reader: {
              id: 1,
              name: 'Test Reader',
            },
            book: {
              isbn: '9783161484102',
              title: 'Test Book 3',
            },
            rating: 4,
            content: 'Een goed boek.',
            date: new Date('2024-12-10').toISOString(),
          },
        ]),
      );
    });

    it('should 403 when not an admin and not own reader id', async () => {
      const response = await request
        .get(`${url}/2/reviews`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to view this information',
      });
    });

    it('should 200 and return the reviews when an admin', async () => {
      const response = await request
        .get(`${url}/1/reviews`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(200);
      expect(response.body.items.length).toBe(3);
      expect(response.body.items).toEqual(
        expect.arrayContaining([
          {
            reader: {
              id: 1,
              name: 'Test Reader',
            },
            book: {
              isbn: '9783161484100',
              title: 'Test Book 1',
            },
            rating: 5,
            content: 'Een prachtig boek!',
            date: new Date('2024-12-10').toISOString(),
          },
          {
            reader: {
              id: 1,
              name: 'Test Reader',
            },
            book: {
              isbn: '9783161484101',
              title: 'Test Book 2',
            },
            rating: 3,
            content: 'Een mooi boek.',
            date: new Date('2024-12-10').toISOString(),
          },
          {
            reader: {
              id: 1,
              name: 'Test Reader',
            },
            book: {
              isbn: '9783161484102',
              title: 'Test Book 3',
            },
            rating: 4,
            content: 'Een goed boek.',
            date: new Date('2024-12-10').toISOString(),
          },
        ]),
      );
    });

    it('should 404 with not existing reader', async () => {
      const response = await request
        .get(`${url}/123/reviews`)
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
        .get(`${url}/invalid/reviews`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('id');
    });

    testAuthHeader(() => request.get(`${url}/1/reviews`));
  });

  describe('POST /api/readers/:id/reviews', () => {
    it('should 201 and return the review', async () => {
      const response = await request
        .post(`${url}/1/reviews`)
        .send({
          bookIsbn: '9783161484103',
          rating: 2,
          content: 'Een stom boek.',
        })
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(201);
      expect(response.body).toEqual({
        reader: {
          id: 1,
          name: 'Test Reader',
        },
        book: {
          isbn: '9783161484103',
          title: 'Test Book 4',
        },
        rating: 2,
        content: 'Een stom boek.',
        date: expect.any(String),
      });
    });

    it('should 201 and return my review', async () => {
      const response = await request
        .post(`${url}/me/reviews`)
        .send({
          bookIsbn: '9783161484104',
          rating: 2,
          content: 'Een stom boek.',
        })
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(201);
      expect(response.body).toEqual({
        reader: {
          id: 1,
          name: 'Test Reader',
        },
        book: {
          isbn: '9783161484104',
          title: 'Test Book 5',
        },
        rating: 2,
        content: 'Een stom boek.',
        date: expect.any(String),
      });
    });

    it('should 403 when not an admin and not own reader id', async () => {
      const response = await request
        .post(`${url}/2/reviews`)
        .send({
          bookIsbn: '9783161484104',
          rating: 2,
          content: 'Een stom boek.',
        })
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to create this information',
      });
    });

    it('should 201 and return the review when an admin', async () => {
      const response = await request
        .post(`${url}/1/reviews`)
        .send({
          bookIsbn: '9783161484105',
          rating: 2,
          content: 'Een stom boek.',
        })
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(201);
      expect(response.body).toEqual({
        reader: {
          id: 1,
          name: 'Test Reader',
        },
        book: {
          isbn: '9783161484105',
          title: 'Test Book 6',
        },
        rating: 2,
        content: 'Een stom boek.',
        date: expect.any(String),
      });
    });

    it('should 400 with review already exists', async () => {
      const response = await request
        .post(`${url}/1/reviews`)
        .send({
          bookIsbn: '9783161484105',
          rating: 2,
          content: 'Een stom boek.',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body).toMatchObject({
        code: 'VALIDATION_FAILED',
        message: 'This review already exists',
      });
    });

    it('should 404 with not existing reader', async () => {
      const response = await request
        .post(`${url}/123/reviews`)
        .send({
          bookIsbn: '9783161484104',
          rating: 2,
          content: 'Een stom boek.',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No reader with this id exists',
      });
      expect(response.body.stack).toBeTruthy();
    });

    it('should 400 with invalid reader id (and admin reader requesting)', async () => {
      const response = await request
        .post(`${url}/invalid/reviews`)
        .send({
          bookIsbn: '9783161484104',
          rating: 2,
          content: 'Een stom boek.',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('id');
    });

    it('should 404 with not existing book', async () => {
      const response = await request
        .post(`${url}/1/reviews`)
        .send({
          bookIsbn: '9999999999999',
          rating: 2,
          content: 'Een stom boek.',
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
        .post(`${url}/1/reviews`)
        .send({ bookIsbn: '123', rating: 2, content: 'Een stom boek.' })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.body).toHaveProperty('bookIsbn');
    });

    testAuthHeader(() => request.post(`${url}/1/reviews`));
  });

  describe('PUT /api/readers/:id/reviews/:isbn', () => {
    it('should 200 and return the updated review', async () => {
      const response = await request
        .put(`${url}/1/reviews/9783161484100`)
        .send({
          content: 'Changed review',
        })
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        reader: {
          id: 1,
          name: 'Test Reader',
        },
        book: {
          isbn: '9783161484100',
          title: 'Test Book 1',
        },
        rating: 5,
        content: 'Changed review',
        date: expect.any(String),
      });
    });

    it('should 200 and return my updated review', async () => {
      const response = await request
        .put(`${url}/me/reviews/9783161484101`)
        .send({
          content: 'Changed review',
        })
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        reader: {
          id: 1,
          name: 'Test Reader',
        },
        book: {
          isbn: '9783161484101',
          title: 'Test Book 2',
        },
        rating: 3,
        content: 'Changed review',
        date: expect.any(String),
      });
    });

    it('should 403 when not an admin and not own reader id', async () => {
      const response = await request
        .put(`${url}/2/reviews/9783161484102`)
        .send({
          content: 'Changed review',
        })
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to edit this information',
      });
    });

    it('should 200 and return the updated review when an admin', async () => {
      const response = await request
        .put(`${url}/1/reviews/9783161484102`)
        .send({
          content: 'Changed review',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        reader: {
          id: 1,
          name: 'Test Reader',
        },
        book: {
          isbn: '9783161484102',
          title: 'Test Book 3',
        },
        rating: 4,
        content: 'Changed review',
        date: expect.any(String),
      });
    });

    it('should 404 with not existing reader', async () => {
      const response = await request
        .put(`${url}/123/reviews/9783161484100`)
        .send({
          content: 'Changed review',
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
        .put(`${url}/invalid/reviews/9783161484100`)
        .send({
          content: 'Changed review',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('id');
    });

    it('should 404 with not existing book', async () => {
      const response = await request
        .put(`${url}/1/reviews/9999999999999`)
        .send({
          content: 'Changed review',
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
        .put(`${url}/1/reviews/123`)
        .send({ content: 'Changed review' })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('isbn');
    });

    testAuthHeader(() => request.put(`${url}/1/reviews/9783161484100`));
  });

  describe('DELETE /api/readers/:id/reviews/:isbn', () => {
    it('should 204 and return nothing', async () => {
      const response = await request
        .delete(`${url}/1/reviews/9783161484100`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(204);
      expect(response.body).toEqual({});
    });

    it('should 204 and return nothing, but delete my review', async () => {
      const response = await request
        .delete(`${url}/me/reviews/9783161484101`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(204);
      expect(response.body).toEqual({});
    });

    it('should 403 when not an admin and not own reader id', async () => {
      const response = await request
        .delete(`${url}/2/reviews/9783161484101`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to delete this information',
      });
    });

    it('should 204 and return nothing when an admin', async () => {
      const response = await request
        .delete(`${url}/1/reviews/9783161484102`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(204);
      expect(response.body).toEqual({});
    });

    it('should 404 with not existing review anymore', async () => {
      const response = await request
        .delete(`${url}/1/reviews/9783161484102`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No review with this reader and book exists',
      });
    });

    it('should 404 with not existing reader', async () => {
      const response = await request
        .delete(`${url}/123/reviews/9783161484100`)
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
        .delete(`${url}/invalid/reviews/9783161484100`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('id');
    });

    it('should 404 with not existing book', async () => {
      const response = await request
        .delete(`${url}/1/reviews/9999999999999`)
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
        .delete(`${url}/1/reviews/123`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('isbn');
    });

    testAuthHeader(() => request.delete(`${url}/1/reviews/9783161484100`));
  });
});

describe('Reader - loan', () => {
  let request: supertest.Agent;
  let readerAuthHeader: string;
  let adminAuthHeader: string;

  withServer((r) => (request = r));

  beforeAll(async () => {
    readerAuthHeader = await login(request);
    adminAuthHeader = await loginAdmin(request);
  });

  const url = '/api/readers';

  describe('GET /api/readers/:id/loans', () => {
    it('should 200 and return the loans', async () => {
      const response = await request
        .get(`${url}/1/loans`)
        .set('Authorization', readerAuthHeader);

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

    it('should 200 and return my loans', async () => {
      const response = await request
        .get(`${url}/me/loans`)
        .set('Authorization', readerAuthHeader);

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

    it('should 403 when not an admin and not own reader id', async () => {
      const response = await request
        .get(`${url}/2/loans`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to view this information',
      });
    });

    it('should 200 and return the loans when an admin', async () => {
      const response = await request
        .get(`${url}/1/loans`)
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

    it('should 404 with not existing reader', async () => {
      const response = await request
        .get(`${url}/123/loans`)
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
        .get(`${url}/invalid/loans`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('id');
    });
  });
});
