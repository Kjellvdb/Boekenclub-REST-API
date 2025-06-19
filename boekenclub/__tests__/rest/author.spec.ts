import type supertest from 'supertest';
import withServer from '../helpers/withServer';
import { login, loginAdmin, loginAuthor } from '../helpers/login';
import testAuthHeader from '../helpers/testAuthHeader';
import { prisma } from '../../src/data';
import Role from '../../src/core/roles';
import type { JsonValue } from '@prisma/client/runtime/library';

const getRoles = async (id: number): Promise<JsonValue | undefined> => {
  const reader = await prisma.reader.findUnique({
    where: { id },
    select: { roles: true },
  });
  return reader?.roles;
};

describe('Author', () => {
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

  const url = '/api/authors';

  describe('GET /api/authors', () => {
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

    it('should 200 and return all authors', async () => {
      const response = await request
        .get(url)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(200);
      expect(response.body.items.length).toBe(2);
      expect(response.body.items).toEqual(
        expect.arrayContaining([
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

  describe('GET /api/authors/:id', () => {
    it('should 200 and return the requested author', async () => {
      const response = await request
        .get(`${url}/3`)
        .set('Authorization', authorAuthHeader);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        id: 3,
        name: 'Author Reader',
        email: 'author.reader@hogent.be',
        address: 'Straat 3, 9000 Gent',
      });
    });

    it('should 200 and return my author', async () => {
      const response = await request
        .get(`${url}/me`)
        .set('Authorization', authorAuthHeader);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        id: 3,
        name: 'Author Reader',
        email: 'author.reader@hogent.be',
        address: 'Straat 3, 9000 Gent',
      });
    });

    it('should 404 when not existing author', async () => {
      const response = await request
        .get(`${url}/999`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No author with this id exists',
      });
      expect(response.body.stack).toBeTruthy();
    });

    it('should 400 with invalid author id', async () => {
      const response = await request
        .get(`${url}/invalid`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('id');
    });

    it('should 403 when not an admin and not own auhtor id', async () => {
      const response = await request
        .get(`${url}/2`)
        .set('Authorization', authorAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to view this information',
      });
    });

    testAuthHeader(() => request.get(`${url}/1`));
  });

  describe('POST /api/authors', () => {
    it('should 403 when not admin', async () => {
      const response = await request
        .post(url)
        .send({
          readerId: 1,
        })
        .set('Authorization', readerAuthHeader);
      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to use this part of the application',
      });
    });

    it('should 201 and create the author', async () => {
      const response = await request
        .post(url)
        .send({
          readerId: 1,
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(201);
      expect(response.body).toEqual({
        id: 1,
        name: 'Test Reader',
        email: 'test.reader@hogent.be',
        address: 'Straat 1, 9000 Gent',
      });
      expect(await getRoles(1)).toEqual([Role.READER, Role.AUTHOR]);
    });

    it('should 400 with author already exists', async () => {
      const response = await request
        .post(url)
        .send({
          readerId: 1,
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body).toMatchObject({
        code: 'VALIDATION_FAILED',
        message: 'This reader is already an author',
      });
    });

    it('should 404 when not existing reader', async () => {
      const response = await request
        .post(url)
        .send({
          readerId: 999,
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
          readerId: 'invalid',
        })
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.body).toHaveProperty('readerId');
    });

    testAuthHeader(() => request.post(url));
  });

  describe('DELETE /api/authors/:id', () => {
    beforeEach(async () => {
      await prisma.reader.update({
        where: { id: 3 },
        data: { roles: [Role.READER, Role.AUTHOR] },
      });
    });

    it('should 403 when not admin', async () => {
      const response = await request
        .delete(`${url}/3`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to delete this information',
      });
    });

    it('should 204 and return nothing', async () => {
      const response = await request
        .delete(`${url}/3`)
        .set('Authorization', authorAuthHeader);

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

    it('should 403 when not an admin and not own author id', async () => {
      const response = await request
        .delete(`${url}/4`)
        .set('Authorization', authorAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to delete this information',
      });
    });

    it('should 204 and return nothing when an admin', async () => {
      const response = await request
        .delete(`${url}/3`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(204);
      expect(response.body).toEqual({});
    });

    it('should 404 with not existing author', async () => {
      const response = await request
        .delete(`${url}/123`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No author with this id exists',
      });
      expect(response.body.stack).toBeTruthy();
    });

    it('should 400 with invalid author id', async () => {
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

describe('Author - book', () => {
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

  const url = '/api/authors';

  describe('GET /api/authors/:id/books', () => {
    it('should 200 and return all books', async () => {
      const response = await request
        .get(`${url}/3/books`)
        .set('Authorization', authorAuthHeader);

      expect(response.statusCode).toBe(200);
      expect(response.body.items.length).toBe(5);
      expect(response.body.items).toEqual(
        expect.arrayContaining([
          {
            isbn: '9783161484100',
            author: {
              id: 3,
              name: 'Author Reader',
            },
            title: 'Test Book 1',
            publicationDate: new Date('2024-12-10').toISOString(),
          },
          {
            isbn: '9783161484101',
            author: {
              id: 3,
              name: 'Author Reader',
            },
            title: 'Test Book 2',
            publicationDate: new Date('2024-12-10').toISOString(),
          },
          {
            isbn: '9783161484102',
            author: {
              id: 3,
              name: 'Author Reader',
            },
            title: 'Test Book 3',
            publicationDate: new Date('2024-12-10').toISOString(),
          },
          {
            isbn: '9783161484103',
            author: {
              id: 3,
              name: 'Author Reader',
            },
            title: 'Test Book 4',
            publicationDate: new Date('2024-12-10').toISOString(),
          },
          {
            isbn: '9783161484104',
            author: {
              id: 3,
              name: 'Author Reader',
            },
            title: 'Test Book 5',
            publicationDate: new Date('2024-12-10').toISOString(),
          },
        ]),
      );
    });

    it('should 404 with not existing reader', async () => {
      const response = await request
        .get(`${url}/123/books`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No author with this id exists',
      });
      expect(response.body.stack).toBeTruthy();
    });

    it('should 400 with invalid reader id', async () => {
      const response = await request
        .get(`${url}/invalid/books`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('id');
    });

    it('should 403 when not an admin and not own author id', async () => {
      const response = await request
        .get(`${url}/5/books`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to view this information',
      });
    });

    it('should 403 when not author or admin', async () => {
      const response = await request
        .get(`${url}/3/books`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to view this information',
      });
    });

    testAuthHeader(() => request.get(`${url}/3/books`));
  });
});
