import type supertest from 'supertest';
import withServer from '../helpers/withServer';
import { login, loginAdmin, loginAuthor } from '../helpers/login';
import testAuthHeader from '../helpers/testAuthHeader';

describe('Books', () => {
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

  const url = '/api/books';

  describe('GET /api/books', () => {
    it('should 200 and return all books', async () => {
      const response = await request.get(url);

      expect(response.status).toBe(200);
      expect(response.body.items.length).toBe(6);
      expect(response.body.items).toMatchObject(
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
          {
            isbn: '9783161484105',
            author: {
              id: 4,
              name: 'Second Author Reader',
            },
            title: 'Test Book 6',
            publicationDate: new Date('2024-12-10').toISOString(),
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

  describe('GET /api/books/:isbn', () => {
    it('should 200 and return a book', async () => {
      const response = await request.get(`${url}/9783161484100`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        isbn: '9783161484100',
        author: {
          id: 3,
          name: 'Author Reader',
        },
        title: 'Test Book 1',
        publicationDate: new Date('2024-12-10').toISOString(),
      });
    });

    it('should 404 with not existing book', async () => {
      const response = await request.get(`${url}/9999999999999`);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No book with this isbn exists',
      });
      expect(response.body.stack).toBeTruthy();
    });

    it('should 400 with invalid book isbn', async () => {
      const response = await request.get(`${url}/123`);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('isbn');
    });
  });

  describe('POST /api/books', () => {
    it('should 403 when not admin', async () => {
      const response = await request
        .post(url)
        .send({
          isbn: '9783161484106',
          title: 'Test Book 7',
          publicationDate: '2024-12-10',
        })
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to use this part of the application',
      });
    });

    it('should 201 and create the book', async () => {
      const response = await request
        .post(url)
        .send({
          isbn: '9783161484106',
          title: 'Test Book 7',
          publicationDate: '2024-12-10',
        })
        .set('Authorization', authorAuthHeader);

      expect(response.statusCode).toBe(201);
      expect(response.body).toEqual({
        isbn: '9783161484106',
        author: {
          id: 3,
          name: 'Author Reader',
        },
        title: 'Test Book 7',
        publicationDate: new Date('2024-12-10').toISOString(),
      });
    });

    it('should 400 with book already exists', async () => {
      const response = await request
        .post(url)
        .send({
          isbn: '9783161484106',
          title: 'Test Book 7',
          publicationDate: '2024-12-10',
        })
        .set('Authorization', authorAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body).toMatchObject({
        code: 'VALIDATION_FAILED',
        message: 'This book already exists',
      });
    });

    it('should 400 with invalid book isbn', async () => {
      const response = await request
        .post(url)
        .send({
          isbn: 9783161484107,
          title: 'Test Book 8',
          publicationDate: '2024-12-10',
        })
        .set('Authorization', authorAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.body).toHaveProperty('isbn');
    });

    it('should 400 with invalid publication date', async () => {
      const response = await request
        .post(url)
        .send({
          isbn: '9783161484107',
          title: 'Test Book 8',
          publicationDate: '3000-12-10',
        })
        .set('Authorization', authorAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.body).toHaveProperty('publicationDate');
    });

    testAuthHeader(() => request.post(url));
  });

  describe('PUT /api/books/:isbn', () => {
    it('should 200 and return the updated book', async () => {
      const response = await request
        .put(`${url}/9783161484100`)
        .send({
          title: 'Changed title',
        })
        .set('Authorization', authorAuthHeader);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        isbn: '9783161484100',
        author: {
          id: 3,
          name: 'Author Reader',
        },
        title: 'Changed title',
        publicationDate: new Date('2024-12-10').toISOString(),
      });
    });

    it('should 403 when not own book', async () => {
      const response = await request
        .put(`${url}/9783161484105`)
        .send({
          title: 'Changed title',
        })
        .set('Authorization', authorAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to create or edit this information',
      });
    });

    it('should 404 with not existing book', async () => {
      const response = await request
        .put(`${url}/9999999999999`)
        .send({
          title: 'Changed title',
        })
        .set('Authorization', authorAuthHeader);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No book with this isbn exists',
      });
      expect(response.body.stack).toBeTruthy();
    });

    it('should 400 with invalid book isbn', async () => {
      const response = await request
        .put(`${url}/123`)
        .send({
          title: 'Changed title',
        })
        .set('Authorization', authorAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('isbn');
    });

    testAuthHeader(() => request.put(`${url}/9783161484100`));
  });

  describe('DEL /api/books/:isbn', () => {
    it('should 204 and return nothing', async () => {
      const response = await request
        .delete(`${url}/9783161484100`)
        .set('Authorization', authorAuthHeader);

      expect(response.statusCode).toBe(204);
      expect(response.body).toEqual({});
    });

    it('should 403 when not an admin and not own reader id', async () => {
      const response = await request
        .delete(`${url}/9783161484105`)
        .set('Authorization', readerAuthHeader);

      expect(response.statusCode).toBe(403);
      expect(response.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'You are not allowed to delete this information',
      });
    });

    it('should 204 and return nothing when an admin', async () => {
      const response = await request
        .delete(`${url}/9783161484101`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(204);
      expect(response.body).toEqual({});
    });

    it('should 404 with not existing book anymore', async () => {
      const response = await request
        .delete(`${url}/9783161484101`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No book with this isbn exists',
      });
    });

    it('should 404 with not existing book', async () => {
      const response = await request
        .delete(`${url}/9999999999999`)
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
        .delete(`${url}/123`)
        .set('Authorization', adminAuthHeader);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('isbn');
    });

    testAuthHeader(() => request.delete(`${url}/9783161484100`));
  });

  describe('GET /api/books/suggest', () => {
    it('should 200 and return a random book', async () => {
      const response = await request.get(`${url}/suggest`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        isbn: expect.any(String),
        author: {
          id: expect.any(Number),
          name: expect.any(String),
        },
        title: expect.any(String),
        publicationDate: expect.any(String),
      });
    });

    it('should 400 when given a query', async () => {
      const response = await request.get(`${url}/suggest?invalid=true`);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.query).toHaveProperty('invalid');
    });
  });
});

describe('Book - review', () => {
  let request: supertest.Agent;

  withServer((r) => (request = r));

  const url = '/api/books';

  describe('GET /api/books/:isbn/reviews', () => {
    it('should 200 and return all reviews', async () => {
      const response = await request.get(`${url}/9783161484102/reviews`);

      expect(response.status).toBe(200);
      expect(response.body.items.length).toBe(2);
      expect(response.body.items).toMatchObject([
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
        {
          reader: {
            id: 2,
            name: 'Admin Reader',
          },
          book: {
            isbn: '9783161484102',
            title: 'Test Book 3',
          },
          rating: 3,
          content: 'Een prima boek.',
          date: new Date('2024-12-10').toISOString(),
        },
      ]);
    });

    it('should 404 with not existing book', async () => {
      const response = await request.get(`${url}/9999999999999/reviews`);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No book with this isbn exists',
      });
      expect(response.body.stack).toBeTruthy();
    });

    it('should 400 with invalid book isbn', async () => {
      const response = await request.get(`${url}/123/reviews`);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('isbn');
    });
  });
});

describe('Book - copy', () => {
  let request: supertest.Agent;

  withServer((r) => (request = r));

  const url = '/api/books';

  describe('GET /api/books/:isbn/copies', () => {
    it('should 200 and return all copies', async () => {
      const response = await request.get(`${url}/9783161484100/copies`);

      expect(response.status).toBe(200);
      expect(response.body.items.length).toBe(3);
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

    it('should 404 with not existing book', async () => {
      const response = await request.get(`${url}/9999999999999/copies`);

      expect(response.statusCode).toBe(404);
      expect(response.body).toMatchObject({
        code: 'NOT_FOUND',
        message: 'No book with this isbn exists',
      });
      expect(response.body.stack).toBeTruthy();
    });

    it('should 400 with invalid book isbn', async () => {
      const response = await request.get(`${url}/123/copies`);

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.details.params).toHaveProperty('isbn');
    });
  });
});
