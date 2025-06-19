import Router from '@koa/router';
import * as bookService from '../service/book';
import * as reviewService from '../service/review';
import * as copyService from '../service/copy';
import type {
  BoekenclubAppState,
  BoekenclubAppContext,
  KoaContext,
  KoaRouter,
} from '../types/koa';
import type {
  CreateBookRequest,
  CreateBookResponse,
  GetAllBooksResponse,
  GetBookByIsbnResponse,
  UpdateBookRequest,
  UpdateBookResponse,
  GetRandomBookResponse,
} from '../types/book';
import type { IsbnParams } from '../types/common';
import type { GetReviewByBookIsbnResponse } from '../types/review';
import type { GetCopiesByIsbnResponse } from '../types/copy';
import Joi from 'joi';
import validate from '../core/validation';
import { makeRequireRole, requireAuthentication } from '../core/auth';
import Role from '../core/roles';
import type { Next } from 'koa';
import { serveFromCache, invalidateCacheKeys } from '../core/caching';

/**
 * @swagger
 * tags:
 *   name: Books
 *   description: Represents a book in the system
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Books:
 *       allOf:
 *         - $ref: "#/components/schemas/Isbn"
 *         - type: object
 *           required:
 *             - title
 *             - publicationDate
 *             - author
 *           properties:
 *             title:
 *               type: "string"
 *             publicationDate:
 *               type: "string"
 *               format: date
 *             author:
 *               type: object
 *               properties:
 *                 id:
 *                   $ref: "#/components/schemas/Id"
 *                 name:
 *                   type: "string"
 *           example:
 *             isbn: "9781234567890"
 *             title: "The Great Gatsby"
 *             publicationDate: "2021-01-01T00:00:00.000Z"
 *             author:
 *               id: 123
 *               name: "John Doe"
 *     BooksList:
 *       required:
 *         - items
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/Books"
 */

const checkPermissions = (ctx: KoaContext<void, IsbnParams>, next: Next) => {
  const { roles } = ctx.state.session;
  const method = ctx.method.toLowerCase();

  if (!roles.includes(Role.AUTHOR) && !roles.includes(Role.ADMIN)) {
    switch (method) {
      case 'get':
        return ctx.throw(403, 'You are not allowed to view this information', {
          code: 'FORBIDDEN',
        });
      case 'post':
        return ctx.throw(
          403,
          'You are not allowed to create this information',
          {
            code: 'FORBIDDEN',
          },
        );
      case 'put':
        return ctx.throw(403, 'You are not allowed to edit this information', {
          code: 'FORBIDDEN',
        });
      case 'delete':
        return ctx.throw(
          403,
          'You are not allowed to delete this information',
          { code: 'FORBIDDEN' },
        );
    }
  }
  return next();
};

/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: Get all books
 *     tags:
 *       - Books
 *     responses:
 *       200:
 *         description: List of books
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/BooksList"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 */
const getAllBooks = async (ctx: KoaContext<GetAllBooksResponse>) => {
  ctx.body = { items: await bookService.getAll() };
  ctx.status = 200;
};

getAllBooks.validateScheme = null;

/**
 * @swagger
 * /api/books/{isbn}:
 *   get:
 *     summary: Get a single book
 *     description: Get a single book by their isbn
 *     tags:
 *      - Books
 *     parameters:
 *       - $ref: "#/components/parameters/isbnParam"
 *     responses:
 *       200:
 *         description: The requested book
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Books"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const getBookByIsbn = async (
  ctx: KoaContext<GetBookByIsbnResponse, IsbnParams>,
) => {
  ctx.body = await bookService.getByIsbn(ctx.params.isbn);
  ctx.status = 200;
};

getBookByIsbn.validateScheme = {
  params: {
    isbn: Joi.string().length(13),
  },
};

/**
 * @swagger
 * /api/books:
 *   post:
 *     summary: Create a new book
 *     tags:
 *      - Books
 *     security:
 *      - bearerAuth: []
 *     requestBody:
 *       description: The book's data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isbn:
 *                 type: string
 *                 minLength: 13
 *                 maxLength: 13
 *               title:
 *                 type: string
 *               publicationDate:
 *                 type: string
 *                 format: date
 *             example:
 *               isbn: "9876543210000"
 *               title: "The Great Gatsby"
 *               publicationDate: "2021-01-01"
 *     responses:
 *       201:
 *         description: The created book
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Books"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 */
const createBook = async (
  ctx: KoaContext<CreateBookResponse, void, CreateBookRequest>,
) => {
  ctx.body = await bookService.create({
    ...ctx.request.body,
    authorId: ctx.state.session.readerId,
  });
  ctx.status = 201;
};

createBook.validateScheme = {
  body: {
    isbn: Joi.string().length(13),
    title: Joi.string().not().empty(),
    publicationDate: Joi.date().iso().less('now'),
  },
};

/**
 * @swagger
 * /api/books/{isbn}:
 *   put:
 *     summary: Update an existing book
 *     tags:
 *      - Books
 *     security:
 *      - bearerAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/isbnParam"
 *     requestBody:
 *       description: The book's data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               buplicationDate:
 *                 type: string
 *                 format: date
 *             example:
 *               title: "The Great Gatsby"
 *               publicationDate: "2021-01-01"
 *     responses:
 *       200:
 *         description: The updated book
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Books"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const updateBook = async (
  ctx: KoaContext<UpdateBookResponse, IsbnParams, UpdateBookRequest>,
) => {
  ctx.body = await bookService.updateByIsbn(ctx.params.isbn, {
    ...ctx.request.body,
    authorId: ctx.state.session.readerId,
  });
  ctx.status = 200;
};

updateBook.validateScheme = {
  params: {
    isbn: Joi.string().length(13),
  },
  body: {
    title: Joi.string().not().empty().optional(),
    publicationDate: Joi.date().iso().less('now').optional(),
  },
};

/**
 * @swagger
 * /api/books/{isbn}:
 *   delete:
 *     summary: Delete a book
 *     tags:
 *      - Books
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: "#/components/parameters/isbnParam"
 *     responses:
 *       204:
 *         description: No response, the delete was successful
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const deleteBook = async (ctx: KoaContext<void, IsbnParams>) => {
  await bookService.deleteByIsbn(ctx.params.isbn, ctx.state.session.readerId);
  ctx.status = 204;
};

deleteBook.validateScheme = {
  params: {
    isbn: Joi.string().length(13),
  },
};

/**
 * @swagger
 * /api/books/suggest:
 *   get:
 *     summary: Get a random book
 *     description: Get a random book
 *     tags:
 *      - Books
 *     responses:
 *       200:
 *         description: The random requested book
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Books"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 */
const getRandomBook = async (ctx: KoaContext<GetRandomBookResponse>) => {
  ctx.body = await bookService.getRandom();
  ctx.status = 200;
};

getRandomBook.validateScheme = null;

/**
 * @swagger
 * /api/books/{isbn}/reviews:
 *   get:
 *     summary: Get all reviews from a book
 *     description: Get all reviews from a book by their isbn
 *     tags:
 *      - Books
 *     parameters:
 *      - $ref: "#/components/parameters/isbnParam"
 *     responses:
 *       200:
 *         description: The requested reviews
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ReviewsList"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const getReviewsByIsbn = async (
  ctx: KoaContext<GetReviewByBookIsbnResponse, IsbnParams>,
) => {
  ctx.body = {
    items: await reviewService.getByIsbn(ctx.params.isbn),
  };
  ctx.status = 200;
};

getReviewsByIsbn.validateScheme = {
  params: {
    isbn: Joi.string().length(13),
  },
};

/**
 * @swagger
 * /api/books/{isbn}/copies:
 *   get:
 *     summary: Get all copies of a book
 *     description: Get all copies of a book by their isbn
 *     tags:
 *      - Books
 *     parameters:
 *      - $ref: "#/components/parameters/isbnParam"
 *     responses:
 *       200:
 *         description: The requested copies
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CopiesList"
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
const getCopiesByIsbn = async (
  ctx: KoaContext<GetCopiesByIsbnResponse, IsbnParams>,
) => {
  ctx.body = {
    items: await copyService.getCopiesByIsbn(ctx.params.isbn),
  };
  ctx.status = 200;
};

getCopiesByIsbn.validateScheme = {
  params: {
    isbn: Joi.string().length(13),
  },
};

export default (parent: KoaRouter) => {
  const router = new Router<BoekenclubAppState, BoekenclubAppContext>({
    prefix: '/books',
  });

  const requireAuthor = makeRequireRole(Role.AUTHOR);

  router.get(
    '/',
    validate(getAllBooks.validateScheme),
    serveFromCache,
    getAllBooks,
  );
  router.get('/suggest', validate(getRandomBook.validateScheme), getRandomBook);
  router.get(
    '/:isbn',
    validate(getBookByIsbn.validateScheme),
    serveFromCache,
    getBookByIsbn,
  );
  router.post(
    '/',
    requireAuthentication,
    requireAuthor,
    validate(createBook.validateScheme),
    invalidateCacheKeys,
    createBook,
  );
  router.put(
    '/:isbn',
    requireAuthentication,
    requireAuthor,
    validate(updateBook.validateScheme),
    invalidateCacheKeys,
    updateBook,
  );
  router.delete(
    '/:isbn',
    requireAuthentication,
    validate(deleteBook.validateScheme),
    checkPermissions,
    invalidateCacheKeys,
    deleteBook,
  );

  router.get(
    '/:isbn/reviews',
    validate(getReviewsByIsbn.validateScheme),
    serveFromCache,
    getReviewsByIsbn,
  );
  router.get(
    '/:isbn/copies',
    validate(getCopiesByIsbn.validateScheme),
    serveFromCache,
    getCopiesByIsbn,
  );

  parent.use(router.routes()).use(router.allowedMethods());
};
